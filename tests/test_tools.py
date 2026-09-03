import asyncio

import pytest

from sivraj.intelligence.schemas import ToolCall
from sivraj.tools.executor import ToolExecutionError, ToolExecutor
from sivraj.tools.system import get_current_time, get_system_status


def test_current_time_is_real_and_structured() -> None:
    result = get_current_time()
    assert set(result) == {"time", "date", "timezone"}
    assert len(result["date"]) == 10


def test_system_status_shape() -> None:
    result = get_system_status()
    assert 0 <= result["cpu_percent"] <= 100
    assert 0 <= result["memory_percent"] <= 100


def test_open_app_arguments_are_allowlisted() -> None:
    executor = ToolExecutor()
    call = ToolCall(name="open_app", arguments={"app_name": "Terminal"})
    with pytest.raises(ToolExecutionError):
        asyncio.run(executor.execute(call))


def test_no_argument_tool_rejects_arguments() -> None:
    executor = ToolExecutor()
    call = ToolCall(name="get_current_time", arguments={"extra": "bad"})
    with pytest.raises(ToolExecutionError):
        asyncio.run(executor.execute(call))
