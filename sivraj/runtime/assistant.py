from __future__ import annotations

import asyncio
from collections.abc import Callable
from pathlib import Path
from typing import Any

from sivraj.audio.player import AudioPlayer
from sivraj.audio.recorder import MicrophoneRecorder
from sivraj.audio.stt import SpeechToText
from sivraj.audio.tts import PiperTTS
from sivraj.config import Config
from sivraj.assistant.context import ContextBuilder
from sivraj.intelligence.conversation import Conversation
from sivraj.intelligence.ollama_client import HealthStatus, OllamaClient
from sivraj.memory.service import MemoryService
from sivraj.personality.behavior import BehaviorChooser, CommandDisposition
from sivraj.tools.executor import ToolExecutionError, ToolExecutor

from .events import StateChanged
from .states import RuntimeState


class AssistantRuntime:
    def __init__(
        self,
        config: Config,
        *,
        ollama: OllamaClient | None = None,
        executor: ToolExecutor | None = None,
        state_listener: Callable[[StateChanged], None] | None = None,
    ) -> None:
        self.config = config
        self.ollama = ollama or OllamaClient(
            config.ollama_host, config.ollama_model,
            conversation_temperature=config.conversation_temperature,
            extraction_temperature=config.extraction_temperature,
        )
        self.executor = executor or ToolExecutor()
        # HISTORY_TURNS counts user/assistant pairs; storage is message-based.
        self.conversation = Conversation(config.history_turns * 2)
        self.recorder = MicrophoneRecorder(config.sample_rate, config.mic_device)
        self.stt = SpeechToText(
            config.whisper_model, config.whisper_device, config.whisper_compute_type
        )
        self.tts = PiperTTS(
            config.piper_executable, config.piper_model_path,
            config.tts_backend, config.macos_voice,
        )
        self.player = AudioPlayer(config.speaker_device)
        self.state = RuntimeState.STOPPED
        self.state_listener = state_listener
        self.voice_ready = False
        self.tts_ready = False
        self.memory = MemoryService(config.database_path, self.ollama)
        self.context_builder = ContextBuilder()
        self.behavior_chooser = BehaviorChooser()
        self._memory_started = False
        self._background_tasks: set[asyncio.Task[object]] = set()

    def _set_state(self, state: RuntimeState) -> None:
        from datetime import datetime

        previous = self.state
        self.state = state
        event = StateChanged(previous, state, datetime.now().astimezone())
        if self.state_listener:
            self.state_listener(event)

    async def start(self, initialize_voice: bool = True) -> HealthStatus:
        health = await self.ollama.health_check()
        if not health.online or not health.model_available:
            self._set_state(RuntimeState.ERROR)
            return health
        await self.memory.start()
        self._memory_started = True
        self._set_state(RuntimeState.IDLE)
        if initialize_voice:
            await self.start_voice()
        return health

    async def start_voice(self) -> dict[str, str]:
        status: dict[str, str] = {}
        try:
            await self.recorder.start()
            await self.stt.start()
            self.voice_ready = True
            status["voice"] = "READY"
        except Exception as exc:
            self.voice_ready = False
            status["voice"] = f"UNAVAILABLE ({exc})"
        try:
            await self.tts.start()
            self.tts_ready = self.config.tts_backend != "off"
            status["tts"] = "READY" if self.tts_ready else "OFF"
        except Exception as exc:
            self.tts_ready = False
            status["tts"] = f"UNAVAILABLE ({exc})"
        return status

    async def process_text(self, text: str, *, speak: bool = True) -> str:
        clean_text = text.strip()
        if not clean_text:
            return ""
        self._set_state(RuntimeState.THINKING)
        try:
            previous_user_messages = [
                item["content"] for item in self.conversation.messages if item["role"] == "user"
            ]
            await self.memory.update_relationship(clean_text, previous_user_messages)
            behavior = self.behavior_chooser.choose(
                self.memory.emotions, clean_text, previous_user_messages
            )
            memories, profile, summary = await asyncio.gather(
                self.memory.retrieve(clean_text, limit=5),
                self.memory.repository.get_profile(),
                self.memory.repository.recent_session_summary(),
            )
            recent_assistant = [
                item["content"] for item in self.conversation.messages
                if item["role"] == "assistant"
            ][-4:]
            personality_context = self.context_builder.build(
                profile, memories, summary, self.memory.emotions, behavior, recent_assistant
            )
            decision = await self.ollama.structured_decision(
                self.conversation.messages, clean_text, context=personality_context
            )
            if decision.tool.name == "none":
                reply = decision.message
            elif (
                decision.tool.name == "open_app"
                and behavior.disposition == CommandDisposition.REFUSE
            ):
                reply = decision.message or "No. Not doing that one."
            else:
                self._set_state(RuntimeState.EXECUTING)
                print(f"\nTOOL:\n{decision.tool.name}({decision.tool.arguments})")
                try:
                    result: dict[str, Any] = {
                        "ok": True,
                        "tool": decision.tool.name,
                        "result": await self.executor.execute(decision.tool),
                    }
                except ToolExecutionError as exc:
                    result = {"ok": False, "tool": decision.tool.name, "error": str(exc)}
                self._set_state(RuntimeState.THINKING)
                final = await self.ollama.structured_decision(
                    self.conversation.messages, clean_text, result,
                    context=personality_context,
                )
                reply = final.message
            if not reply.strip():
                reply = "I don't have a useful answer for that."
            self.conversation.add("user", clean_text)
            self.conversation.add("assistant", reply)
            await self.memory.record_turn("user", clean_text)
            await self.memory.record_turn("assistant", reply)
            task = asyncio.create_task(
                self.memory.extract_and_store(
                    clean_text, reply, self.conversation.messages
                )
            )
            self._background_tasks.add(task)
            task.add_done_callback(self._background_tasks.discard)
            if speak and self.tts_ready:
                await self._speak(reply)
            self._set_state(RuntimeState.IDLE)
            return reply
        except Exception:
            self._set_state(RuntimeState.ERROR)
            raise

    async def process_voice(self, *, speak: bool = True) -> tuple[str, str]:
        if not self.voice_ready:
            raise RuntimeError("Voice input is unavailable; use /text")
        self._set_state(RuntimeState.LISTENING)
        audio = await self.recorder.record_utterance()
        self._set_state(RuntimeState.TRANSCRIBING)
        transcript = await self.stt.transcribe(audio)
        if not transcript:
            self._set_state(RuntimeState.IDLE)
            raise RuntimeError("Whisper did not detect any speech")
        reply = await self.process_text(transcript, speak=speak)
        return transcript, reply

    async def _speak(self, text: str) -> None:
        self._set_state(RuntimeState.SPEAKING)
        path: Path | None = await self.tts.synthesize(text)
        if path is not None:
            await self.player.play(path)

    async def stop(self) -> None:
        await self.player.stop()
        await self.recorder.stop()
        await self.stt.stop()
        if self._background_tasks:
            await asyncio.gather(*self._background_tasks, return_exceptions=True)
        if self._memory_started:
            messages = self.conversation.messages
            summary: str | None = None
            if messages:
                try:
                    summary = await asyncio.wait_for(
                        self.ollama.summarize_session(messages), timeout=20
                    )
                except Exception:
                    user_messages = [item["content"] for item in messages if item["role"] == "user"]
                    if user_messages:
                        summary = "User discussed: " + " | ".join(user_messages[-6:])[:1000]
            await self.memory.stop(summary)
            self._memory_started = False
        self._set_state(RuntimeState.STOPPED)
