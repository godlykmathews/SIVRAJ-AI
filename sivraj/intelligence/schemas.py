from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ToolName = Literal["none", "get_current_time", "get_system_status", "open_app"]


class ToolCall(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: ToolName = "none"
    arguments: dict[str, str] = Field(default_factory=dict)


class AssistantDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str
    tool: ToolCall = Field(default_factory=ToolCall)
