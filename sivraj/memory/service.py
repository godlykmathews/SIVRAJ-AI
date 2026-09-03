from __future__ import annotations

import re
from pathlib import Path

from sivraj.personality.emotions import DEFAULT_EMOTIONS, EmotionalState
from sivraj.personality.relationship import RelationshipEngine

from .database import MemoryDatabase
from .extractor import ExtractionClient, MemoryExtractor
from .models import MemoryCandidate, MemoryRecord
from .repository import MemoryRepository
from .retriever import MemoryRetriever


class MemoryService:
    def __init__(self, database_path: Path, extraction_client: ExtractionClient | None = None) -> None:
        self.database = MemoryDatabase(database_path)
        self.repository = MemoryRepository(self.database)
        self.retriever = MemoryRetriever(self.repository)
        self.extractor = MemoryExtractor(extraction_client)
        self.relationship = RelationshipEngine()
        self.session_id: str | None = None
        self.emotions = EmotionalState()

    async def start(self) -> None:
        await self.database.start()
        created = await self.repository.initialize_emotions(DEFAULT_EMOTIONS)
        self.emotions = EmotionalState.from_dict(await self.repository.get_emotions())
        if not created:
            self.relationship.recover_for_new_session(self.emotions)
            await self.repository.save_emotions(self.emotions.as_dict())
        self.session_id = await self.repository.start_session()

    async def stop(self, summary: str | None = None) -> None:
        if self.session_id:
            await self.repository.end_session(self.session_id, summary)
            self.session_id = None
        await self.database.stop()

    async def update_relationship(self, message: str, previous_user_messages: list[str]) -> EmotionalState:
        self.relationship.apply(self.emotions, message, previous_user_messages)
        await self.repository.save_emotions(self.emotions.as_dict())
        return self.emotions

    async def reset_emotions(self) -> EmotionalState:
        self.emotions = EmotionalState.from_dict(DEFAULT_EMOTIONS)
        await self.repository.save_emotions(self.emotions.as_dict())
        return self.emotions

    async def record_turn(self, role: str, content: str) -> None:
        if self.session_id is None:
            raise RuntimeError("MemoryService.start() must be called first")
        await self.repository.add_conversation(
            self.session_id, role, content, self.detect_language(content)
        )

    async def extract_and_store(
        self, user_message: str, assistant_response: str, recent_context: list[dict[str, str]]
    ) -> list[MemoryRecord]:
        extraction = await self.extractor.extract(user_message, assistant_response, recent_context)
        stored: list[MemoryRecord] = []
        if not extraction.should_store:
            return stored
        for candidate in extraction.memories:
            record = await self.repository.add_memory(candidate)
            stored.append(record)
            profile_key = candidate.metadata.get("profile_key")
            profile_value = candidate.metadata.get("profile_value")
            if isinstance(profile_key, str) and isinstance(profile_value, str):
                await self.repository.set_profile(profile_key, profile_value)
        return stored

    async def add_memory(self, candidate: MemoryCandidate) -> MemoryRecord:
        return await self.repository.add_memory(candidate)

    async def retrieve(self, query: str, limit: int = 5) -> list[MemoryRecord]:
        return await self.retriever.retrieve(query, limit)

    @staticmethod
    def detect_language(text: str) -> str:
        if re.search(r"[\u0D00-\u0D7F]", text):
            return "malayalam"
        if re.search(r"\b(eda|entha|evideya|cheyy|kazhicho|orma|ippo|venda|venam|seri|aanu|alle)\b", text, re.I):
            return "manglish"
        return "english"
