import asyncio

from sivraj.assistant.context import ContextBuilder
from sivraj.memory.models import MemoryCandidate, MemoryCategory
from sivraj.memory.extractor import MemoryExtractor
from sivraj.memory.service import MemoryService
from sivraj.personality.behavior import Behavior, BehaviorDecision, CommandDisposition
from sivraj.personality.emotions import EmotionalState


def test_memory_survives_restart(tmp_path) -> None:
    async def scenario() -> None:
        path = tmp_path / "sivraj.db"
        first = MemoryService(path)
        await first.start()
        stored = await first.extract_and_store("My name is Godly.", "Fine.", [])
        assert stored[0].content == "The user's name is Godly."
        await first.stop("The user introduced himself.")

        second = MemoryService(path)
        await second.start()
        results = await second.retrieve("What is my name?")
        assert [item.content for item in results] == ["The user's name is Godly."]
        assert (await second.repository.get_profile())["name"] == "Godly"
        await second.stop()
    asyncio.run(scenario())


def test_memory_correction_supersedes_old_fact(tmp_path) -> None:
    async def scenario() -> None:
        service = MemoryService(tmp_path / "sivraj.db")
        await service.start()
        await service.extract_and_store("My presentation is Monday.", "Okay.", [])
        await service.extract_and_store(
            "No, my presentation is Tuesday, not Monday.", "Right.", []
        )
        active = await service.repository.list_memories()
        assert [item.content for item in active] == ["The user's presentation is on Tuesday."]
        all_items = await service.repository.list_memories(active_only=False)
        assert len(all_items) == 2
        assert sum(item.active for item in all_items) == 1
        await service.stop()
    asyncio.run(scenario())


def test_emotions_are_bounded_and_persistent(tmp_path) -> None:
    async def scenario() -> None:
        path = tmp_path / "sivraj.db"
        first = MemoryService(path)
        await first.start()
        first.emotions.change(trust=500, annoyance=-500)
        assert first.emotions.trust == 100
        assert first.emotions.annoyance == 0
        await first.repository.save_emotions(first.emotions.as_dict())
        await first.stop()

        second = MemoryService(path)
        await second.start()
        assert second.emotions.trust == 100
        assert second.emotions.annoyance == 0
        await second.stop()
    asyncio.run(scenario())


def test_explicit_remember_and_filler(tmp_path) -> None:
    async def scenario() -> None:
        service = MemoryService(tmp_path / "sivraj.db")
        await service.start()
        stored = await service.extract_and_store(
            "remember my demo is Friday", "Fine.", []
        )
        assert stored and stored[0].category == MemoryCategory.PLAN
        ignored = await service.extract_and_store("okay", "Okay.", [])
        assert ignored == []
        await service.stop()
    asyncio.run(scenario())


def test_remember_this_uses_previous_user_message() -> None:
    async def scenario() -> None:
        extractor = MemoryExtractor()
        context = [
            {"role": "user", "content": "My demo is Friday"},
            {"role": "assistant", "content": "Okay."},
            {"role": "user", "content": "remember this"},
            {"role": "assistant", "content": "Fine."},
        ]
        result = await extractor.extract("remember this", "Fine.", context)
        assert result.memories[0].content == "My demo is Friday"
    asyncio.run(scenario())


def test_retrieval_returns_relevant_project_only(tmp_path) -> None:
    async def scenario() -> None:
        service = MemoryService(tmp_path / "sivraj.db")
        await service.start()
        await service.add_memory(MemoryCandidate(
            category=MemoryCategory.PROJECT,
            content="The user is building a project called SIVRAJ.", importance=9,
        ))
        await service.add_memory(MemoryCandidate(
            category=MemoryCategory.PREFERENCE,
            content="The user prefers tea.", importance=8,
        ))
        results = await service.retrieve("Which project am I building?")
        assert [item.category for item in results] == [MemoryCategory.PROJECT]
        await service.stop()
    asyncio.run(scenario())


def test_empty_memory_context_prevents_fabrication() -> None:
    context = ContextBuilder().build(
        {}, [], None, EmotionalState(),
        BehaviorDecision(Behavior.NORMAL, CommandDisposition.OBEY), [],
    )
    assert "None found" in context
    assert "Do not invent a remembered fact" in context


def test_recall_question_is_never_extracted_by_model() -> None:
    class EagerClient:
        called = False

        async def extract_memories(self, user_message, assistant_response, recent_context):
            self.called = True
            raise AssertionError("question should not reach model extraction")

    async def scenario() -> None:
        client = EagerClient()
        result = await MemoryExtractor(client).extract(
            "njan build cheyyunna project etha?", "SIVRAJ.", []
        )
        assert result.should_store is False
        assert client.called is False
    asyncio.run(scenario())
