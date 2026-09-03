from __future__ import annotations

import re
from typing import Protocol

from .models import MemoryCandidate, MemoryCategory, MemoryExtraction


class ExtractionClient(Protocol):
    async def extract_memories(
        self, user_message: str, assistant_response: str, recent_context: list[dict[str, str]]
    ) -> MemoryExtraction: ...


FILLER = re.compile(r"^(okay|ok|yes|no|haha+|fine|what|seri|ശരി|ആ)$", re.IGNORECASE)
TRANSIENT_COMMAND = re.compile(
    r"^(?:eda\s+)?(?:(?:spotify|vscode|vs code|calculator)\s+)?"
    r"(?:open|close|launch|start|തുറക്ക്|അടയ്ക്ക)[\s\W]",
    re.IGNORECASE,
)
EXPLICIT = re.compile(
    r"\b(remember (this|that)?|orma vecho|ith orma vecho|ഓർമ്മ വെച്ചോ|ഓർമ്മിക്കണം)\b",
    re.IGNORECASE,
)
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
DAY = "|".join(DAYS)


class MemoryExtractor:
    def __init__(self, client: ExtractionClient | None = None) -> None:
        self.client = client

    async def extract(
        self,
        user_message: str,
        assistant_response: str,
        recent_context: list[dict[str, str]],
    ) -> MemoryExtraction:
        message = user_message.strip()
        if not message or FILLER.fullmatch(message.rstrip(".!? ")):
            return MemoryExtraction(should_store=False)

        candidates = self._rule_based(message, recent_context)
        if candidates:
            return MemoryExtraction(should_store=True, memories=candidates)
        # Questions and one-off desktop commands are retrieval/action input, not facts.
        if message.rstrip().endswith("?") or TRANSIENT_COMMAND.search(message + " "):
            return MemoryExtraction(should_store=False)
        if self.client is None:
            return MemoryExtraction(should_store=False)
        try:
            result = await self.client.extract_memories(
                message, assistant_response, recent_context[-8:]
            )
            if not result.should_store:
                return MemoryExtraction(should_store=False)
            admitted = [
                candidate for candidate in result.memories
                if candidate.importance >= 5 and len(candidate.content.split()) >= 4
            ]
            return MemoryExtraction(should_store=bool(admitted), memories=admitted)
        except Exception:
            return MemoryExtraction(should_store=False)

    def _rule_based(
        self, message: str, recent_context: list[dict[str, str]]
    ) -> list[MemoryCandidate]:
        name = re.search(r"\bmy name is\s+([\w'-]+)", message, re.IGNORECASE)
        if name:
            value = name.group(1).strip(" .!?")
            return [MemoryCandidate(
                category=MemoryCategory.USER_FACT,
                content=f"The user's name is {value}.", importance=10,
                metadata={"subject": "user_name", "profile_key": "name", "profile_value": value},
            )]

        presentation = re.search(
            rf"\b(?:my\s+)?(?:project\s+)?presentation\b.*?\b({DAY})\b",
            message, re.IGNORECASE,
        )
        if presentation:
            day = presentation.group(1).title()
            return [MemoryCandidate(
                category=MemoryCategory.PLAN,
                content=f"The user's presentation is on {day}.", importance=9,
                metadata={"subject": "presentation_date"},
            )]

        project = re.search(
            r"\b(?:i(?:'m| am)\s+building|my project(?: is| is called)?|project called)\s+(?:an?\s+)?(?:AI\s+)?(?:project\s+)?(?:called\s+)?([\w'-]+)",
            message, re.IGNORECASE,
        )
        if project:
            value = project.group(1).strip(" .!?")
            return [MemoryCandidate(
                category=MemoryCategory.PROJECT,
                content=f"The user is building a project called {value}.", importance=9,
                metadata={"subject": f"project_{value.lower()}"},
            )]

        preference = re.search(r"\bi prefer\s+(.+?)[.!?]*$", message, re.IGNORECASE)
        if preference:
            value = preference.group(1).strip(" .!?")
            metadata = {"subject": "general_preference"}
            if "malayalam" in value.lower():
                metadata.update({"subject": "preferred_language", "profile_key": "preferred_language",
                                 "profile_value": "Malayalam"})
            return [MemoryCandidate(
                category=MemoryCategory.PREFERENCE,
                content=f"The user prefers {value}.", importance=8, metadata=metadata,
            )]

        if EXPLICIT.search(message):
            content = EXPLICIT.sub("", message).strip(" ,.!?")
            if len(content) < 3:
                prior = [
                    item["content"] for item in recent_context
                    if item["role"] == "user" and item["content"].strip() != message
                ]
                content = prior[-1] if prior else ""
            if content:
                return [MemoryCandidate(
                    category=self._category_for(content), content=content, importance=9,
                    metadata=self._subject_for(content),
                )]
        return []

    @staticmethod
    def _category_for(content: str) -> MemoryCategory:
        lowered = content.lower()
        if "project" in lowered:
            return MemoryCategory.PROJECT
        if any(day.lower() in lowered for day in DAYS) or "tomorrow" in lowered:
            return MemoryCategory.PLAN
        if "prefer" in lowered or "usually" in lowered:
            return MemoryCategory.PREFERENCE
        return MemoryCategory.USER_FACT

    @staticmethod
    def _subject_for(content: str) -> dict[str, str]:
        lowered = content.lower()
        if "presentation" in lowered:
            return {"subject": "presentation_date"}
        return {}
