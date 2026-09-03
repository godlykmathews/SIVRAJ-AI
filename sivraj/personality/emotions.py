from __future__ import annotations

from dataclasses import asdict, dataclass


DEFAULT_EMOTIONS = {
    "trust": 50,
    "annoyance": 20,
    "boredom": 25,
    "curiosity": 65,
    "mischief": 45,
    "energy": 70,
}


@dataclass(slots=True)
class EmotionalState:
    trust: int = 50
    annoyance: int = 20
    boredom: int = 25
    curiosity: int = 65
    mischief: int = 45
    energy: int = 70

    @classmethod
    def from_dict(cls, values: dict[str, int]) -> "EmotionalState":
        return cls(**{name: max(0, min(100, int(values.get(name, default))))
                      for name, default in DEFAULT_EMOTIONS.items()})

    def as_dict(self) -> dict[str, int]:
        return asdict(self)

    def change(self, **deltas: int) -> None:
        for name, delta in deltas.items():
            if name not in DEFAULT_EMOTIONS:
                continue
            setattr(self, name, max(0, min(100, getattr(self, name) + delta)))
