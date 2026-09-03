from __future__ import annotations

import asyncio
import sqlite3
import threading
from pathlib import Path
from typing import Callable, TypeVar


T = TypeVar("T")


SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    summary TEXT
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    language TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    importance INTEGER NOT NULL CHECK(importance BETWEEN 1 AND 10),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_accessed_at TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS user_profile (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS emotional_state (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL CHECK(value BETWEEN 0 AND 100),
    updated_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    content,
    content='memories',
    content_rowid='id',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, content)
    VALUES ('delete', old.id, old.content);
END;
CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE OF content ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, content)
    VALUES ('delete', old.id, old.content);
    INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
END;
"""


class MemoryDatabase:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._connection: sqlite3.Connection | None = None
        self._lock = threading.RLock()

    async def start(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)

        def connect() -> None:
            connection = sqlite3.connect(self.path, check_same_thread=False)
            connection.row_factory = sqlite3.Row
            connection.executescript(SCHEMA)
            connection.commit()
            self._connection = connection

        await asyncio.to_thread(connect)

    async def stop(self) -> None:
        def close() -> None:
            with self._lock:
                if self._connection is not None:
                    self._connection.close()
                    self._connection = None

        await asyncio.to_thread(close)

    async def run(self, operation: Callable[[sqlite3.Connection], T]) -> T:
        def invoke() -> T:
            with self._lock:
                if self._connection is None:
                    raise RuntimeError("MemoryDatabase.start() must be called first")
                try:
                    result = operation(self._connection)
                    self._connection.commit()
                    return result
                except Exception:
                    self._connection.rollback()
                    raise

        return await asyncio.to_thread(invoke)
