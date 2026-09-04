from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class PresenceState(str, Enum):
    UNKNOWN = "unknown"
    PRESENT = "present"
    POSSIBLY_ABSENT = "possibly_absent"
    ABSENT = "absent"


class PresenceEvent(str, Enum):
    PRESENCE_DETECTED = "PRESENCE_DETECTED"
    PRESENCE_LOST = "PRESENCE_LOST"
    USER_PRESENT = "USER_PRESENT"
    USER_ABSENT = "USER_ABSENT"
    USER_RETURNED = "USER_RETURNED"


@dataclass(frozen=True, slots=True)
class PresenceObservation:
    face_count: int
    detected: bool
    timestamp: float

    def __post_init__(self) -> None:
        if self.face_count < 0:
            raise ValueError("face_count cannot be negative")
        if self.detected != (self.face_count >= 1):
            raise ValueError("detected must match face_count >= 1")


@dataclass(frozen=True, slots=True)
class PresenceEventRecord:
    event: PresenceEvent
    state: PresenceState
    timestamp: float
