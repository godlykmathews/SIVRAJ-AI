from __future__ import annotations

import asyncio
from pathlib import Path

from .base import PlatformAdapter


MACOS_APPS = {
    "spotify": "Spotify",
    "vscode": "Visual Studio Code",
    "calculator": "Calculator",
}


async def _run(*args: str) -> None:
    process = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE
    )
    _, error = await process.communicate()
    if process.returncode:
        raise RuntimeError(error.decode(errors="replace").strip() or f"{args[0]} failed")


class MacOSAdapter(PlatformAdapter):
    async def open_app(self, app_id: str) -> None:
        await _run("open", "-a", MACOS_APPS[app_id])

    async def play_file(self, path: Path) -> None:
        await _run("afplay", str(path))
