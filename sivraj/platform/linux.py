from __future__ import annotations

import asyncio
from pathlib import Path

from .base import PlatformAdapter


LINUX_APPS = {
    "spotify": ["spotify"],
    "vscode": ["code"],
    "calculator": ["gnome-calculator"],
}


class LinuxAdapter(PlatformAdapter):
    async def open_app(self, app_id: str) -> None:
        await asyncio.create_subprocess_exec(
            *LINUX_APPS[app_id], stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )

    async def play_file(self, path: Path) -> None:
        raise RuntimeError("Non-WAV platform playback is not configured on Linux")
