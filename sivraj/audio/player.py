from __future__ import annotations

import asyncio
import wave
from pathlib import Path

import numpy as np

from sivraj.platform import current_platform


class AudioPlayer:
    def __init__(self, device: str | int | None = None) -> None:
        self.device = device

    async def play(self, path: Path) -> None:
        try:
            if path.suffix.lower() != ".wav":
                await current_platform().play_file(path)
                return
            await asyncio.to_thread(self._play_wav, path)
        finally:
            path.unlink(missing_ok=True)

    def _play_wav(self, path: Path) -> None:
        import sounddevice as sd

        with wave.open(str(path), "rb") as source:
            if source.getsampwidth() != 2:
                raise RuntimeError("Only 16-bit PCM WAV playback is supported")
            channels = source.getnchannels()
            rate = source.getframerate()
            audio = np.frombuffer(source.readframes(source.getnframes()), dtype=np.int16)
            if channels > 1:
                audio = audio.reshape(-1, channels)
        sd.play(audio, rate, device=self.device)
        sd.wait()

    async def stop(self) -> None:
        try:
            import sounddevice as sd
            sd.stop()
        except ImportError:
            pass
