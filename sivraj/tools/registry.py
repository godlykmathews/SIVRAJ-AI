from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class NoArguments(BaseModel):
    model_config = ConfigDict(extra="forbid")


class OpenAppArguments(BaseModel):
    model_config = ConfigDict(extra="forbid")
    app_name: Literal["spotify", "vscode", "calculator"]


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    name: str
    description: str
    input_schema: type[BaseModel]
    risk_level: Literal["read_only", "low"]
    timeout: float


TOOLS: dict[str, ToolDefinition] = {
    "get_current_time": ToolDefinition(
        "get_current_time", "Read the actual local date and time", NoArguments, "read_only", 2,
    ),
    "get_system_status": ToolDefinition(
        "get_system_status", "Read CPU, memory, and battery percentages", NoArguments, "read_only", 3,
    ),
    "open_app": ToolDefinition(
        "open_app", "Open one explicitly allowlisted application", OpenAppArguments, "low", 10,
    ),
}


def public_tool_descriptions() -> list[dict[str, Any]]:
    return [
        {
            "name": item.name,
            "description": item.description,
            "input_schema": item.input_schema.model_json_schema(),
            "risk_level": item.risk_level,
        }
        for item in TOOLS.values()
    ]
