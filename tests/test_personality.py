from sivraj.personality.behavior import BehaviorChooser, CommandDisposition
from sivraj.personality.emotions import EmotionalState
from sivraj.personality.relationship import RelationshipEngine


class RefusingRandom:
    def choices(self, population, weights, k):
        if CommandDisposition.REFUSE in population:
            return [CommandDisposition.REFUSE]
        return [population[0]]


def test_optional_command_can_be_refused_when_annoyed() -> None:
    state = EmotionalState(annoyance=100)
    decision = BehaviorChooser(RefusingRandom()).choose(state, "Open Spotify")
    assert decision.disposition == CommandDisposition.REFUSE


def test_serious_request_is_never_comedically_refused() -> None:
    state = EmotionalState(annoyance=100)
    decision = BehaviorChooser(RefusingRandom()).choose(state, "Emergency, help me")
    assert decision.disposition == CommandDisposition.OBEY


def test_repeated_optional_command_eventually_obeys() -> None:
    state = EmotionalState(annoyance=100)
    decision = BehaviorChooser(RefusingRandom()).choose(
        state, "eda open cheyy", ["Open Spotify"]
    )
    assert decision.disposition != CommandDisposition.REFUSE


def test_relationship_updates_are_python_owned() -> None:
    state = EmotionalState()
    RelationshipEngine().apply(state, "Thanks, good job", [])
    assert state.trust == 57
    assert state.annoyance == 18
