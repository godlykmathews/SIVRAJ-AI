from __future__ import annotations

import os
import platform
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def _optional_device(value: str | None) -> str | int | None:
    if not value:
        return None
    return int(value) if value.isdigit() else value


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class Config:
    ollama_host: str
    ollama_model: str
    whisper_model: str
    whisper_device: str
    whisper_compute_type: str
    piper_executable: str
    piper_model_path: Path | None
    tts_backend: str
    macos_voice: str | None
    mic_device: str | int | None
    speaker_device: str | int | None
    history_turns: int
    debug: bool
    sample_rate: int = 16_000
    database_path: Path = Path("data/sivraj.db")
    conversation_temperature: float = 0.8
    extraction_temperature: float = 0.2

    @classmethod
    def from_env(cls) -> "Config":
        load_dotenv()
        model_path = os.getenv("PIPER_MODEL_PATH", "").strip()
        return cls(
            ollama_host=os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/"),
            ollama_model=os.getenv("OLLAMA_MODEL", "qwen3:8b"),
            whisper_model=os.getenv("WHISPER_MODEL", "small"),
            whisper_device=os.getenv("WHISPER_DEVICE", "auto"),
            whisper_compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "auto"),
            piper_executable=os.getenv("PIPER_EXECUTABLE", "piper"),
            piper_model_path=Path(model_path).expanduser() if model_path else None,
            tts_backend=os.getenv("TTS_BACKEND", "piper").lower(),
            macos_voice=os.getenv("MACOS_VOICE") or None,
            mic_device=_optional_device(os.getenv("MIC_DEVICE")),
            speaker_device=_optional_device(os.getenv("SPEAKER_DEVICE")),
            history_turns=max(1, int(os.getenv("HISTORY_TURNS", "16"))),
            debug=_bool(os.getenv("DEBUG"), True),
            database_path=Path(os.getenv("DATABASE_PATH", "data/sivraj.db")).expanduser(),
            conversation_temperature=float(os.getenv("CONVERSATION_TEMPERATURE", "0.8")),
            extraction_temperature=float(os.getenv("EXTRACTION_TEMPERATURE", "0.2")),
        )

    @property
    def is_macos(self) -> bool:
        return platform.system() == "Darwin"
