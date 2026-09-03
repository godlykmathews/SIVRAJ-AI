from __future__ import annotations

import argparse
import asyncio

from sivraj.config import Config
from sivraj.runtime.assistant import AssistantRuntime
from sivraj.runtime.events import StateChanged
from sivraj.runtime.states import RuntimeState


def _state_changed(event: StateChanged) -> None:
    print(f"\n[{event.current.value}]")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="SIVRAJ local voice assistant")
    parser.add_argument(
        "--text-only", action="store_true",
        help="Skip microphone and Whisper initialization",
    )
    parser.add_argument("--no-speech", action="store_true", help="Do not speak replies")
    return parser


async def _handle_debug_command(runtime: AssistantRuntime, command: str) -> bool:
    normalized = command.strip()
    if normalized == "/memory":
        memories = await runtime.memory.repository.list_memories(limit=20)
        print("\n[MEMORY]")
        if not memories:
            print("No active memories.")
        for memory in memories:
            print(f"#{memory.id} {memory.category.value} ({memory.importance}/10): {memory.content}")
        return True
    if normalized == "/profile":
        profile = await runtime.memory.repository.get_profile()
        print("\n[PROFILE]")
        if not profile:
            print("No profile facts.")
        for key, value in profile.items():
            print(f"{key}={value}")
        return True
    if normalized == "/emotions":
        print("\n[EMOTIONS]")
        for name, value in runtime.memory.emotions.as_dict().items():
            print(f"{name}={value}")
        return True
    if normalized == "/history":
        print("\n[HISTORY]")
        if not runtime.conversation.messages:
            print("No messages in this session.")
        for item in runtime.conversation.messages:
            print(f"{item['role'].upper()}: {item['content']}")
        return True
    if normalized.startswith("/forget "):
        raw_id = normalized.removeprefix("/forget ").strip()
        if not raw_id.isdigit():
            print("\n[MEMORY]\nUsage: /forget <id>")
        else:
            removed = await runtime.memory.repository.deactivate_memory(int(raw_id))
            print("\n[MEMORY]\n" + ("Forgot it." if removed else "No active memory with that ID."))
        return True
    if normalized == "/reset-emotions":
        state = await runtime.memory.reset_emotions()
        print("\n[EMOTIONS]\nReset: " + " ".join(
            f"{name}={value}" for name, value in state.as_dict().items()
        ))
        return True
    return False


async def run(text_only: bool = False, no_speech: bool = False) -> int:
    config = Config.from_env()
    runtime = AssistantRuntime(config, state_listener=_state_changed)
    print("=" * 33)
    print("             SIVRAJ")
    print("=" * 33)
    health = await runtime.start(initialize_voice=False)
    if not health.online:
        print("\n[SIVRAJ ERROR]\nOllama is not running.\n\nStart it using:\nollama serve")
        return 1
    if not health.model_available:
        print(f"\n[SIVRAJ ERROR]\nModel '{config.ollama_model}' is missing.\n\nRun:\nollama pull {config.ollama_model}")
        return 1

    print(f"Ollama     : ONLINE\nModel      : {config.ollama_model}")
    if text_only:
        print("Whisper    : SKIPPED\nMicrophone : SKIPPED")
        try:
            await runtime.tts.start()
            runtime.tts_ready = config.tts_backend != "off"
            print(f"TTS         : {'READY' if runtime.tts_ready else 'OFF'}")
        except Exception as exc:
            print(f"TTS         : UNAVAILABLE ({exc})")
    else:
        service_status = await runtime.start_voice()
        print(f"Whisper/Mic: {service_status['voice']}\nTTS         : {service_status['tts']}")

    print(
        "\nPress ENTER to talk\nType /text <message> for text input\n"
        "Debug: /memory /profile /emotions /history /forget <id> /reset-emotions\n"
        "Type /quit to exit"
    )
    try:
        while True:
            command = await asyncio.to_thread(input, "\n> ")
            if command.strip().lower() in {"/quit", "/exit"}:
                break
            try:
                if await _handle_debug_command(runtime, command):
                    continue
                if command.startswith("/text "):
                    message = command[6:].strip()
                    print(f"\nYOU:\n{message}")
                    reply = await runtime.process_text(message, speak=not no_speech)
                elif command.strip():
                    print(f"\nYOU:\n{command.strip()}")
                    reply = await runtime.process_text(command, speak=not no_speech)
                else:
                    transcript, reply = await runtime.process_voice(speak=not no_speech)
                    print(f"\nYOU:\n{transcript}")
                print(f"\nSIVRAJ:\n{reply}")
            except Exception as exc:
                print(f"\n[SIVRAJ ERROR]\n{exc}")
                runtime._set_state(RuntimeState.IDLE)
    except (KeyboardInterrupt, EOFError):
        print()
    finally:
        await runtime.stop()
    return 0


def main() -> None:
    args = _parser().parse_args()
    raise SystemExit(asyncio.run(run(args.text_only, args.no_speech)))
