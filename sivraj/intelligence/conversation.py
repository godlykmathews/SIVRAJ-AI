from __future__ import annotations


class Conversation:
    def __init__(self, max_messages: int = 16) -> None:
        self.max_messages = max_messages
        self._messages: list[dict[str, str]] = []

    @property
    def messages(self) -> list[dict[str, str]]:
        return list(self._messages)

    def add(self, role: str, content: str) -> None:
        self._messages.append({"role": role, "content": content})
        if len(self._messages) > self.max_messages:
            self._messages = self._messages[-self.max_messages :]

    def clear(self) -> None:
        self._messages.clear()
