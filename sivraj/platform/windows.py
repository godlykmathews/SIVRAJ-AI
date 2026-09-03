from __future__ import annotations

from pathlib import Path

from .base import PlatformAdapter


class WindowsAdapter(PlatformAdapter):
    async def open_app(self, app_id: str) -> None:
        raise RuntimeError(f"Opening {app_id} is not implemented on Windows yet")

    async def play_file(self, path: Path) -> None:
        raise RuntimeError("Non-WAV platform playback is not configured on Windows")
