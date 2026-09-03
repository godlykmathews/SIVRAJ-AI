from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from .database import MemoryDatabase
from .models import MemoryCandidate, MemoryCategory, MemoryRecord


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _record(row: sqlite3.Row) -> MemoryRecord:
    return MemoryRecord(
        id=row["id"], category=row["category"], content=row["content"],
        importance=row["importance"], created_at=row["created_at"],
        updated_at=row["updated_at"], last_accessed_at=row["last_accessed_at"],
        metadata=json.loads(row["metadata_json"] or "{}"), active=bool(row["active"]),
    )


class MemoryRepository:
    def __init__(self, database: MemoryDatabase) -> None:
        self.database = database

    async def start_session(self) -> str:
        session_id = str(uuid4())
        await self.database.run(
            lambda db: db.execute(
                "INSERT INTO sessions(id, started_at) VALUES (?, ?)", (session_id, _now())
            )
        )
        return session_id

    async def end_session(self, session_id: str, summary: str | None) -> None:
        await self.database.run(
            lambda db: db.execute(
                "UPDATE sessions SET ended_at=?, summary=? WHERE id=?",
                (_now(), summary, session_id),
            )
        )

    async def recent_session_summary(self) -> str | None:
        def query(db: sqlite3.Connection) -> str | None:
            row = db.execute(
                "SELECT summary FROM sessions WHERE ended_at IS NOT NULL AND summary IS NOT NULL "
                "ORDER BY ended_at DESC LIMIT 1"
            ).fetchone()
            return str(row[0]) if row else None
        return await self.database.run(query)

    async def add_conversation(self, session_id: str, role: str, content: str, language: str) -> None:
        await self.database.run(
            lambda db: db.execute(
                "INSERT INTO conversations(session_id, role, content, language, created_at) "
                "VALUES (?, ?, ?, ?, ?)", (session_id, role, content, language, _now())
            )
        )

    async def add_memory(self, candidate: MemoryCandidate) -> MemoryRecord:
        def insert(db: sqlite3.Connection) -> MemoryRecord:
            now = _now()
            duplicate = db.execute(
                "SELECT * FROM memories WHERE active=1 AND lower(content)=lower(?) LIMIT 1",
                (candidate.content,),
            ).fetchone()
            if duplicate:
                db.execute(
                    "UPDATE memories SET importance=max(importance, ?), updated_at=? WHERE id=?",
                    (candidate.importance, now, duplicate["id"]),
                )
                refreshed = db.execute(
                    "SELECT * FROM memories WHERE id=?", (duplicate["id"],)
                ).fetchone()
                return _record(refreshed)
            subject = str(candidate.metadata.get("subject", "")).strip()
            supersedes: list[int] = []
            if subject:
                for row in db.execute(
                    "SELECT id, metadata_json FROM memories WHERE active=1 AND category=?",
                    (candidate.category.value,),
                ).fetchall():
                    metadata = json.loads(row["metadata_json"] or "{}")
                    if metadata.get("subject") == subject:
                        supersedes.append(int(row["id"]))
                if supersedes:
                    placeholders = ",".join("?" for _ in supersedes)
                    db.execute(
                        f"UPDATE memories SET active=0, updated_at=? WHERE id IN ({placeholders})",
                        (now, *supersedes),
                    )
            metadata = dict(candidate.metadata)
            if supersedes:
                metadata["supersedes"] = supersedes
            cursor = db.execute(
                "INSERT INTO memories(category, content, importance, created_at, updated_at, metadata_json) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (candidate.category.value, candidate.content, candidate.importance, now, now,
                 json.dumps(metadata, ensure_ascii=False)),
            )
            row = db.execute("SELECT * FROM memories WHERE id=?", (cursor.lastrowid,)).fetchone()
            return _record(row)
        return await self.database.run(insert)

    async def deactivate_memory(self, memory_id: int) -> bool:
        def deactivate(db: sqlite3.Connection) -> bool:
            cursor = db.execute(
                "UPDATE memories SET active=0, updated_at=? WHERE id=? AND active=1",
                (_now(), memory_id),
            )
            return cursor.rowcount > 0
        return await self.database.run(deactivate)

    async def list_memories(self, limit: int = 20, active_only: bool = True) -> list[MemoryRecord]:
        def query(db: sqlite3.Connection) -> list[MemoryRecord]:
            where = "WHERE active=1" if active_only else ""
            rows = db.execute(
                f"SELECT * FROM memories {where} ORDER BY updated_at DESC LIMIT ?", (limit,)
            ).fetchall()
            return [_record(row) for row in rows]
        return await self.database.run(query)

    async def search_memories(self, query: str, limit: int = 5) -> list[MemoryRecord]:
        tokens = [token for token in re.findall(r"[^\W_]+", query.lower(), re.UNICODE) if len(token) > 1]

        def search(db: sqlite3.Connection) -> list[MemoryRecord]:
            scored: dict[int, tuple[float, sqlite3.Row]] = {}
            if tokens:
                expression = " OR ".join(f'"{token}"' for token in tokens[:12])
                try:
                    rows = db.execute(
                        "SELECT m.*, bm25(memories_fts) AS rank FROM memories_fts "
                        "JOIN memories m ON m.id=memories_fts.rowid "
                        "WHERE memories_fts MATCH ? AND m.active=1 LIMIT 30", (expression,),
                    ).fetchall()
                    for row in rows:
                        scored[row["id"]] = (20.0 - float(row["rank"]), row)
                except sqlite3.OperationalError:
                    pass
            recent = db.execute(
                "SELECT * FROM memories WHERE active=1 ORDER BY importance DESC, updated_at DESC LIMIT 30"
            ).fetchall()
            lowered = set(tokens)
            for row in recent:
                overlap = len(lowered.intersection(re.findall(r"[^\W_]+", row["content"].lower(), re.UNICODE)))
                if overlap == 0 and row["id"] not in scored:
                    continue
                relevance = overlap * 4.0
                updated = datetime.fromisoformat(row["updated_at"])
                age_days = max(0.0, (datetime.now(timezone.utc) - updated).total_seconds() / 86_400)
                recency = max(0.0, 3.0 - age_days / 7.0)
                score = relevance + float(row["importance"]) * 0.7 + recency
                previous = scored.get(row["id"])
                if previous:
                    score += previous[0]
                scored[row["id"]] = (score, row)
            selected = sorted(scored.values(), key=lambda item: item[0], reverse=True)[:limit]
            accessed = _now()
            if selected:
                db.executemany(
                    "UPDATE memories SET last_accessed_at=? WHERE id=?",
                    [(accessed, row["id"]) for _, row in selected],
                )
            return [_record(row) for _, row in selected]
        return await self.database.run(search)

    async def set_profile(self, key: str, value: str) -> None:
        await self.database.run(
            lambda db: db.execute(
                "INSERT INTO user_profile(key, value, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
                (key, value, _now()),
            )
        )

    async def get_profile(self) -> dict[str, str]:
        def query(db: sqlite3.Connection) -> dict[str, str]:
            return {row["key"]: row["value"] for row in db.execute(
                "SELECT key, value FROM user_profile ORDER BY key"
            ).fetchall()}
        return await self.database.run(query)

    async def initialize_emotions(self, defaults: dict[str, int]) -> bool:
        def initialize(db: sqlite3.Connection) -> bool:
            count = db.execute("SELECT COUNT(*) FROM emotional_state").fetchone()[0]
            if count:
                return False
            now = _now()
            db.executemany(
                "INSERT INTO emotional_state(name, value, updated_at) VALUES (?, ?, ?)",
                [(name, value, now) for name, value in defaults.items()],
            )
            return True
        return await self.database.run(initialize)

    async def get_emotions(self) -> dict[str, int]:
        def query(db: sqlite3.Connection) -> dict[str, int]:
            return {row["name"]: int(row["value"]) for row in db.execute(
                "SELECT name, value FROM emotional_state"
            ).fetchall()}
        return await self.database.run(query)

    async def save_emotions(self, values: dict[str, int]) -> None:
        now = _now()
        await self.database.run(
            lambda db: db.executemany(
                "INSERT INTO emotional_state(name, value, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(name) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
                [(name, max(0, min(100, value)), now) for name, value in values.items()],
            )
        )
