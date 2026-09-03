from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class MemoryCategory(str, Enum):
    USER_FACT = "USER_FACT"
    PREFERENCE = "PREFERENCE"
    PROJECT = "PROJECT"
    PERSON = "PERSON"
    PLAN = "PLAN"
    IMPORTANT_EVENT = "IMPORTANT_EVENT"
    OBSERVATION = "OBSERVATION"
    RELATIONSHIP = "RELATIONSHIP"
    CONVERSATION_SUMMARY = "CONVERSATION_SUMMARY"


class MemoryCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: MemoryCategory
    content: str = Field(min_length=3, max_length=500)
    importance: int = Field(ge=1, le=10)
    metadata: dict[str, Any] = Field(default_factory=dict)


class MemoryExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    should_store: bool
    memories: list[MemoryCandidate] = Field(default_factory=list, max_length=5)


class MemoryRecord(BaseModel):
    id: int
    category: MemoryCategory
    content: str
    importance: int
    created_at: datetime
    updated_at: datetime
    last_accessed_at: datetime | None
    metadata: dict[str, Any] = Field(default_factory=dict)
    active: bool = True


class SessionSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(min_length=3, max_length=1200)
