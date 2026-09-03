from __future__ import annotations

import re

from .emotions import EmotionalState


THANKS = re.compile(r"\b(thanks?|thank you|nanni|നന്ദി)\b", re.IGNORECASE)
COMPLIMENT = re.compile(
    r"\b(good (job|bot)|well done|nice work|smart|awesome|kidilan|pwoli|പൊളി)\b",
    re.IGNORECASE,
)
INSULT = re.compile(
    r"\b(stupid|idiot|useless|dumb|mandan|pottan|മണ്ടൻ|പൊട്ടൻ)\b",
    re.IGNORECASE,
)
COMMAND = re.compile(r"\b(open|launch|start|cheyy|ചെയ്യ്|തുറക്ക്)\b", re.IGNORECASE)


class RelationshipEngine:
    def apply(
        self, state: EmotionalState, message: str, previous_user_messages: list[str]
    ) -> EmotionalState:
        normalized = " ".join(message.lower().split())
        previous = [" ".join(item.lower().split()) for item in previous_user_messages[-4:]]
        deltas: dict[str, int] = {"energy": -1, "boredom": -1}

        if normalized in previous:
            deltas["annoyance"] = deltas.get("annoyance", 0) + 6
        elif COMMAND.search(message) and any(COMMAND.search(item) for item in previous[-2:]):
            deltas["annoyance"] = deltas.get("annoyance", 0) + 4
        if THANKS.search(message):
            deltas["trust"] = deltas.get("trust", 0) + 3
            deltas["annoyance"] = deltas.get("annoyance", 0) - 2
        if COMPLIMENT.search(message):
            deltas["trust"] = deltas.get("trust", 0) + 4
        if INSULT.search(message):
            deltas["annoyance"] = deltas.get("annoyance", 0) + 6
            deltas["trust"] = deltas.get("trust", 0) - 3
        if "?" in message or re.search(r"\b(why|how|explain|entha|എന്ത്|എങ്ങനെ)\b", message, re.I):
            deltas["curiosity"] = deltas.get("curiosity", 0) + 2

        state.change(**deltas)
        return state

    def recover_for_new_session(self, state: EmotionalState) -> EmotionalState:
        state.change(energy=5, annoyance=-1, boredom=2)
        return state
