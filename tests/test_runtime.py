import asyncio
from sivraj.config import Config
from sivraj.intelligence.ollama_client import HealthStatus
from sivraj.intelligence.schemas import AssistantDecision, ToolCall
from sivraj.runtime.assistant import AssistantRuntime


def config(database_path) -> Config:
    return Config(
        ollama_host="http://localhost:11434", ollama_model="llama3",
        whisper_model="small", whisper_device="cpu", whisper_compute_type="int8",
        piper_executable="piper", piper_model_path=None, tts_backend="off",
        macos_voice=None, mic_device=None, speaker_device=None, history_turns=16,
        debug=False,
        database_path=database_path,
    )


class FakeOllama:
    def __init__(self) -> None:
        self.calls = []

    async def health_check(self) -> HealthStatus:
        return HealthStatus(True, True)

    async def structured_decision(self, history, user_text, tool_result=None, context=None):
        self.calls.append((history, user_text, tool_result, context))
        if tool_result is None and "CPU" in user_text:
            return AssistantDecision(message="", tool=ToolCall(name="get_system_status"))
        if tool_result is not None:
            return AssistantDecision(message="CPU is 12%.")
        return AssistantDecision(message="Hello.")


class FakeExecutor:
    async def execute(self, call):
        return {"cpu_percent": 12, "memory_percent": 40, "battery_percent": None}


def test_plain_reply_enters_history(tmp_path) -> None:
    async def scenario() -> None:
        model = FakeOllama()
        runtime = AssistantRuntime(config(tmp_path / "memory.db"), ollama=model, executor=FakeExecutor())
        await runtime.start(initialize_voice=False)
        reply = await runtime.process_text("Hello", speak=False)
        assert reply == "Hello."
        assert runtime.conversation.messages[-1]["content"] == "Hello."
        await runtime.stop()
    asyncio.run(scenario())


def test_tool_result_returns_to_model(tmp_path) -> None:
    async def scenario() -> None:
        model = FakeOllama()
        runtime = AssistantRuntime(config(tmp_path / "memory.db"), ollama=model, executor=FakeExecutor())
        await runtime.start(initialize_voice=False)
        reply = await runtime.process_text("CPU usage?", speak=False)
        assert reply == "CPU is 12%."
        assert model.calls[1][2]["result"]["cpu_percent"] == 12
        await runtime.stop()
    asyncio.run(scenario())
