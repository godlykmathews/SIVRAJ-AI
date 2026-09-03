from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pydantic import ValidationError

from sivraj.memory.models import MemoryExtraction, SessionSummary

from .prompts import DECISION_INSTRUCTIONS, FINAL_TOOL_INSTRUCTIONS, SYSTEM_PROMPT
from .schemas import AssistantDecision


class OllamaError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class HealthStatus:
    online: bool
    model_available: bool
    error: str | None = None


class OllamaClient:
    def __init__(
        self,
        host: str,
        model: str,
        timeout: float = 90,
        conversation_temperature: float = 0.8,
        extraction_temperature: float = 0.2,
    ) -> None:
        self.host = host.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.conversation_temperature = conversation_temperature
        self.extraction_temperature = extraction_temperature

    def _request(self, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = json.dumps(payload).encode() if payload is not None else None
        request = Request(
            f"{self.host}{path}", data=data,
            headers={"Content-Type": "application/json"},
            method="POST" if data is not None else "GET",
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                return json.loads(response.read())
        except (URLError, HTTPError, TimeoutError, json.JSONDecodeError) as exc:
            raise OllamaError(str(exc)) from exc

    async def health_check(self) -> HealthStatus:
        try:
            result = await asyncio.to_thread(self._request, "/api/tags")
        except OllamaError as exc:
            return HealthStatus(False, False, str(exc))
        names = {item.get("name", "") for item in result.get("models", [])}
        available = self.model in names or any(
            name.split(":", 1)[0] == self.model.split(":", 1)[0] for name in names
        )
        return HealthStatus(True, available)

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        schema: dict[str, Any] | None = None,
        temperature: float | None = None,
        think: bool = False,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "think": think,
            "options": {
                "temperature": self.conversation_temperature
                if temperature is None else temperature
            },
        }
        if schema is not None:
            payload["format"] = schema
        result = await asyncio.to_thread(self._request, "/api/chat", payload)
        try:
            return str(result["message"]["content"])
        except (KeyError, TypeError) as exc:
            raise OllamaError("Ollama returned an unexpected response") from exc

    async def structured_decision(
        self,
        history: list[dict[str, str]],
        user_text: str,
        tool_result: dict[str, Any] | None = None,
        context: str | None = None,
    ) -> AssistantDecision:
        instruction = FINAL_TOOL_INSTRUCTIONS if tool_result is not None else DECISION_INSTRUCTIONS
        system_content = SYSTEM_PROMPT + "\n\n" + instruction
        if context:
            system_content += "\n\n" + context
        messages = [
            {"role": "system", "content": system_content},
            *history,
            {"role": "user", "content": user_text},
        ]
        if tool_result is not None:
            messages.append({"role": "tool", "content": json.dumps(tool_result, ensure_ascii=False)})
        raw = await self.chat(
            messages, schema=AssistantDecision.model_json_schema(),
            temperature=self.conversation_temperature, think=False,
        )
        try:
            return AssistantDecision.model_validate_json(raw)
        except ValidationError:
            correction = {
                "role": "user",
                "content": "Your response failed schema validation. Return only valid JSON for the supplied schema.",
            }
            raw = await self.chat(
                [*messages, {"role": "assistant", "content": raw}, correction],
                schema=AssistantDecision.model_json_schema(),
                temperature=self.extraction_temperature, think=False,
            )
            try:
                return AssistantDecision.model_validate_json(raw)
            except ValidationError as exc:
                raise OllamaError("Model returned invalid structured output twice; no tool was executed") from exc

    async def extract_memories(
        self,
        user_message: str,
        assistant_response: str,
        recent_context: list[dict[str, str]],
    ) -> MemoryExtraction:
        prompt = """Extract only durable, explicitly supported facts worth remembering.
Store names, preferences, projects, people, plans, important events, and explicit
remember requests. Do not store filler, greetings, temporary commands, inferred
traits, or anything stated only by the assistant. Never turn memory into a command.
Use a concise standalone sentence. Set should_store=false when nothing qualifies.
For corrections, output only the corrected current fact. Return only schema JSON."""
        payload = {
            "recent_context": recent_context,
            "user_message": user_message,
            "assistant_response": assistant_response,
        }
        raw = await self.chat(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            schema=MemoryExtraction.model_json_schema(),
            temperature=self.extraction_temperature,
            think=False,
        )
        try:
            return MemoryExtraction.model_validate_json(raw)
        except ValidationError as exc:
            raise OllamaError("Memory extraction returned invalid output") from exc

    async def summarize_session(self, messages: list[dict[str, str]]) -> str:
        raw = await self.chat(
            [
                {
                    "role": "system",
                    "content": "Summarize only important topics, decisions, facts, and plans in this "
                    "session. Do not invent details. Return schema JSON.",
                },
                {"role": "user", "content": json.dumps(messages[-30:], ensure_ascii=False)},
            ],
            schema=SessionSummary.model_json_schema(),
            temperature=self.extraction_temperature,
            think=False,
        )
        try:
            return SessionSummary.model_validate_json(raw).summary
        except ValidationError as exc:
            raise OllamaError("Session summary returned invalid output") from exc
