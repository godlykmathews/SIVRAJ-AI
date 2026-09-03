import pytest
from pydantic import ValidationError

from sivraj.intelligence.schemas import AssistantDecision, ToolCall


def test_valid_decision() -> None:
    decision = AssistantDecision.model_validate(
        {"message": "", "tool": {"name": "get_system_status", "arguments": {}}}
    )
    assert decision.tool.name == "get_system_status"


def test_unregistered_tool_is_rejected() -> None:
    with pytest.raises(ValidationError):
        ToolCall.model_validate({"name": "delete_files", "arguments": {}})


def test_extra_fields_are_rejected() -> None:
    with pytest.raises(ValidationError):
        AssistantDecision.model_validate(
            {"message": "no", "tool": {"name": "none", "arguments": {}}, "command": "rm"}
        )
