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
    camera_index: int = 0
    camera_preview: bool = True
    camera_frame_width: int = 640
    presence_confirm_frames: int = 2
    presence_absence_threshold: float = 5.0
    presence_target_fps: float = 12.0
    face_scale_factor: float = 1.1
    face_min_neighbors: int = 5
    face_min_size: int = 60

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
            camera_index=int(os.getenv("CAMERA_INDEX", "0")),
            camera_preview=_bool(os.getenv("CAMERA_PREVIEW"), True),
            camera_frame_width=max(160, int(os.getenv("CAMERA_FRAME_WIDTH", "640"))),
            presence_confirm_frames=max(1, int(os.getenv("PRESENCE_CONFIRM_FRAMES", "2"))),
            presence_absence_threshold=max(
                0.1, float(os.getenv("PRESENCE_ABSENCE_THRESHOLD", "5.0"))
            ),
            presence_target_fps=max(1.0, float(os.getenv("PRESENCE_TARGET_FPS", "12"))),
            face_scale_factor=max(1.01, float(os.getenv("FACE_SCALE_FACTOR", "1.1"))),
            face_min_neighbors=max(0, int(os.getenv("FACE_MIN_NEIGHBORS", "5"))),
            face_min_size=max(10, int(os.getenv("FACE_MIN_SIZE", "60"))),
        )

    @property
    def is_macos(self) -> bool:
        return platform.system() == "Darwin"
