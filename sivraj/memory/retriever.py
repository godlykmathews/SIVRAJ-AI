from __future__ import annotations

from .models import MemoryRecord
from .repository import MemoryRepository


class MemoryRetriever:
    def __init__(self, repository: MemoryRepository) -> None:
        self.repository = repository

    async def retrieve(self, query: str, limit: int = 5) -> list[MemoryRecord]:
        return await self.repository.search_memories(query, limit)
