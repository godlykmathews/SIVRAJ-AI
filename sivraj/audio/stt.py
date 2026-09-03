from __future__ import annotations

import asyncio

import numpy as np


class SpeechToText:
    def __init__(self, model_name: str, device: str = "auto", compute_type: str = "auto") -> None:
        self.model_name = model_name
        self.device = device
        self.compute_type = compute_type
        self._model: object | None = None

    async def start(self) -> None:
        try:
            from faster_whisper import WhisperModel
            self._model = await asyncio.to_thread(
                WhisperModel, self.model_name, device=self.device, compute_type=self.compute_type
            )
        except Exception as exc:
            raise RuntimeError(f"Whisper model failed to load: {exc}") from exc

    async def transcribe(self, audio: np.ndarray) -> str:
        if self._model is None:
            raise RuntimeError("SpeechToText.start() must be called first")

        def run() -> str:
            segments, _ = self._model.transcribe(  # type: ignore[attr-defined]
                audio, beam_size=5, vad_filter=False, task="transcribe"
            )
            return " ".join(segment.text.strip() for segment in segments).strip()

        return await asyncio.to_thread(run)

    async def stop(self) -> None:
        self._model = None
