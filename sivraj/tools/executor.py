from __future__ import annotations

import asyncio
from typing import Any

from pydantic import ValidationError

from sivraj.intelligence.schemas import ToolCall

from .applications import open_app
from .registry import TOOLS
from .system import get_current_time, get_system_status


class ToolExecutionError(RuntimeError):
    pass


class ToolExecutor:
    async def execute(self, call: ToolCall) -> dict[str, Any]:
        definition = TOOLS.get(call.name)
        if definition is None:
            raise ToolExecutionError(f"Tool is not registered: {call.name}")
        try:
            arguments = definition.input_schema.model_validate(call.arguments)
        except ValidationError as exc:
            raise ToolExecutionError(f"Invalid arguments for {call.name}") from exc

        async def invoke() -> dict[str, Any]:
            if call.name == "get_current_time":
                return await asyncio.to_thread(get_current_time)
            if call.name == "get_system_status":
                return await asyncio.to_thread(get_system_status)
            if call.name == "open_app":
                return await open_app(arguments.app_name)  # type: ignore[attr-defined]
            raise ToolExecutionError("Tool dispatch failed")

        try:
            return await asyncio.wait_for(invoke(), timeout=definition.timeout)
        except ToolExecutionError:
            raise
        except Exception as exc:
            raise ToolExecutionError(str(exc)) from exc
