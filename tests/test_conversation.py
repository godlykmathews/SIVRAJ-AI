from sivraj.intelligence.conversation import Conversation


def test_history_is_bounded() -> None:
    conversation = Conversation(max_messages=2)
    conversation.add("user", "My name is Godly")
    conversation.add("assistant", "Got it")
    conversation.add("user", "What is my name?")
    assert conversation.messages == [
        {"role": "assistant", "content": "Got it"},
        {"role": "user", "content": "What is my name?"},
    ]
