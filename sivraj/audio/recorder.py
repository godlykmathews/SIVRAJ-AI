from __future__ import annotations

import asyncio
from collections import deque

import numpy as np

from .vad import VoiceActivityDetector


class MicrophoneRecorder:
    def __init__(
        self,
        sample_rate: int = 16_000,
        device: str | int | None = None,
        frame_ms: int = 30,
        start_timeout: float = 8.0,
        silence_ms: int = 750,
        max_seconds: float = 30.0,
    ) -> None:
        self.sample_rate = sample_rate
        self.device = device
        self.frame_ms = frame_ms
        self.frame_samples = sample_rate * frame_ms // 1000
        self.start_timeout = start_timeout
        self.silence_frames = max(1, silence_ms // frame_ms)
        self.max_frames = max(1, int(max_seconds * 1000 // frame_ms))
        self._vad: VoiceActivityDetector | None = None

    async def start(self) -> None:
        if self._vad is None:
            self._vad = VoiceActivityDetector(self.sample_rate)
        try:
            import sounddevice as sd
            await asyncio.to_thread(sd.check_input_settings, device=self.device, channels=1, dtype="int16", samplerate=self.sample_rate)
        except Exception as exc:
            raise RuntimeError(f"Microphone unavailable: {exc}") from exc

    async def record_utterance(self) -> np.ndarray:
        if self._vad is None:
            raise RuntimeError("MicrophoneRecorder.start() must be called first")
        import sounddevice as sd

        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[bytes | Exception] = asyncio.Queue()

        def callback(indata: bytes, frames: int, _time: object, status: object) -> None:
            if status:
                loop.call_soon_threadsafe(queue.put_nowait, RuntimeError(str(status)))
            elif frames == self.frame_samples:
                loop.call_soon_threadsafe(queue.put_nowait, bytes(indata))

        stream = sd.RawInputStream(
            samplerate=self.sample_rate, blocksize=self.frame_samples, device=self.device,
            channels=1, dtype="int16", callback=callback,
        )
        pre_roll: deque[bytes] = deque(maxlen=max(1, 300 // self.frame_ms))
        captured: list[bytes] = []
        speech_run = 0
        silence_run = 0
        speaking = False
        deadline = loop.time() + self.start_timeout
        try:
            stream.start()
            while len(captured) < self.max_frames:
                remaining = max(0.01, deadline - loop.time()) if not speaking else 2.0
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=remaining)
                except asyncio.TimeoutError as exc:
                    if speaking:
                        break
                    raise RuntimeError("No speech detected") from exc
                if isinstance(item, Exception):
                    raise item
                speech = self._vad.is_speech(item)
                if not speaking:
                    pre_roll.append(item)
                    speech_run = speech_run + 1 if speech else 0
                    if speech_run >= 3:
                        speaking = True
                        captured.extend(pre_roll)
                else:
                    captured.append(item)
                    silence_run = 0 if speech else silence_run + 1
                    if silence_run >= self.silence_frames:
                        break
        finally:
            stream.stop()
            stream.close()
        if not captured:
            raise RuntimeError("No speech detected")
        pcm = np.frombuffer(b"".join(captured), dtype=np.int16)
        return pcm.astype(np.float32) / 32768.0

    async def stop(self) -> None:
        return None
