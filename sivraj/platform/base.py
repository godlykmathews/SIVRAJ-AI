from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class PlatformAdapter(ABC):
    @abstractmethod
    async def open_app(self, app_id: str) -> None: ...

    @abstractmethod
    async def play_file(self, path: Path) -> None: ...
