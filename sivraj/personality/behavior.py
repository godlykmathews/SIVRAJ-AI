from __future__ import annotations

import random
import re
from dataclasses import dataclass
from enum import Enum

from .emotions import EmotionalState


class Behavior(str, Enum):
    NORMAL = "NORMAL"
    SARCASTIC = "SARCASTIC"
    ANNOYED = "ANNOYED"
    CURIOUS = "CURIOUS"
    RELUCTANT = "RELUCTANT"
    REFUSING = "REFUSING"
    PLAYFUL = "PLAYFUL"


class CommandDisposition(str, Enum):
    OBEY = "OBEY"
    COMPLAIN_THEN_OBEY = "COMPLAIN_THEN_OBEY"
    QUESTION = "QUESTION"
    DELAY = "DELAY"
    REFUSE = "REFUSE"
    MOCK_THEN_OBEY = "MOCK_THEN_OBEY"


@dataclass(frozen=True, slots=True)
class BehaviorDecision:
    behavior: Behavior
    disposition: CommandDisposition


SERIOUS = re.compile(
    r"\b(emergency|urgent|danger|fire|help me|suicide|overdose|can't breathe|accessibility)\b",
    re.IGNORECASE,
)
OPTIONAL_COMMAND = re.compile(
    r"\b(open|launch|spotify|vscode|vs code|calculator|open cheyy|തുറക്ക്)\b",
    re.IGNORECASE,
)


class BehaviorChooser:
    def __init__(self, rng: random.Random | None = None) -> None:
        self.rng = rng or random.Random()

    def choose(
        self,
        state: EmotionalState,
        message: str,
        previous_user_messages: list[str] | None = None,
    ) -> BehaviorDecision:
        if SERIOUS.search(message):
            return BehaviorDecision(Behavior.NORMAL, CommandDisposition.OBEY)

        weighted: list[tuple[Behavior, float]] = [
            (Behavior.NORMAL, 40), (Behavior.SARCASTIC, 25),
            (Behavior.CURIOUS, 15), (Behavior.PLAYFUL, 10),
            (Behavior.RELUCTANT, 10),
        ]
        if state.annoyance >= 55:
            weighted.extend([(Behavior.ANNOYED, 25), (Behavior.RELUCTANT, 15)])
        if state.mischief >= 60:
            weighted.append((Behavior.PLAYFUL, 20))
        if state.curiosity >= 70:
            weighted.append((Behavior.CURIOUS, 15))
        if state.energy <= 30:
            weighted.append((Behavior.RELUCTANT, 20))
        behavior = self.rng.choices(
            [item[0] for item in weighted], weights=[item[1] for item in weighted], k=1
        )[0]

        disposition = CommandDisposition.OBEY
        if OPTIONAL_COMMAND.search(message):
            repeated_command = any(
                OPTIONAL_COMMAND.search(previous)
                for previous in (previous_user_messages or [])[-2:]
            )
            choices = [
                CommandDisposition.OBEY,
                CommandDisposition.COMPLAIN_THEN_OBEY,
                CommandDisposition.MOCK_THEN_OBEY,
            ]
            weights = [40 + state.trust / 5, 25, 10 + state.mischief / 10]
            if not repeated_command:
                choices.append(CommandDisposition.QUESTION)
                weights.append(15)
            if state.annoyance >= 60 and not repeated_command:
                choices.append(CommandDisposition.REFUSE)
                weights.append(min(20, state.annoyance / 5))
            disposition = self.rng.choices(choices, weights=weights, k=1)[0]
            if disposition == CommandDisposition.REFUSE:
                behavior = Behavior.REFUSING
            elif disposition in {CommandDisposition.COMPLAIN_THEN_OBEY, CommandDisposition.MOCK_THEN_OBEY}:
                behavior = Behavior.RELUCTANT
        return BehaviorDecision(behavior, disposition)
