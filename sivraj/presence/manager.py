from __future__ import annotations

import time
from collections.abc import Callable

from .state import PresenceEvent, PresenceEventRecord, PresenceObservation, PresenceState


EventCallback = Callable[[PresenceEventRecord], None]


class PresenceManager:
    """Hardware-independent debounced presence state machine."""

    def __init__(self, confirm_frames: int = 2, absence_threshold: float = 5.0) -> None:
        if confirm_frames < 1:
            raise ValueError("confirm_frames must be at least 1")
        if absence_threshold <= 0:
            raise ValueError("absence_threshold must be positive")
        self.confirm_frames = confirm_frames
        self.absence_threshold = absence_threshold
        self.state = PresenceState.UNKNOWN
        self.last_seen_at: float | None = None
        self.returned_at: float | None = None
        self._absence_started_at: float | None = None
        self._consecutive_detections = 0
        self._raw_detected = False
        self._callbacks: dict[PresenceEvent, list[EventCallback]] = {
            event: [] for event in PresenceEvent
        }
        self._all_callbacks: list[EventCallback] = []

    def update(self, observation: PresenceObservation) -> PresenceState:
        if observation.detected:
            self._handle_detection(observation.timestamp)
        else:
            self._handle_miss(observation.timestamp)
        return self.state

    def _handle_detection(self, timestamp: float) -> None:
        prior_state = self.state
        self.last_seen_at = timestamp
        self._absence_started_at = None
        self._consecutive_detections += 1
        if not self._raw_detected:
            self._raw_detected = True
            self._emit(PresenceEvent.PRESENCE_DETECTED, timestamp)

        if prior_state == PresenceState.POSSIBLY_ABSENT:
            # The user was still presumed present during the grace period, so this
            # is not a new USER_PRESENT or USER_RETURNED event.
            self.state = PresenceState.PRESENT
        elif (
            prior_state in {PresenceState.UNKNOWN, PresenceState.ABSENT}
            and self._consecutive_detections >= self.confirm_frames
        ):
            self._transition_present(
                timestamp, returned=prior_state == PresenceState.ABSENT
            )

    def _handle_miss(self, timestamp: float) -> None:
        self._consecutive_detections = 0
        if self._raw_detected:
            self._raw_detected = False
            self._emit(PresenceEvent.PRESENCE_LOST, timestamp)
        if self._absence_started_at is None:
            self._absence_started_at = timestamp
        if self.state == PresenceState.PRESENT:
            self.state = PresenceState.POSSIBLY_ABSENT
        if (
            self.state in {PresenceState.UNKNOWN, PresenceState.POSSIBLY_ABSENT}
            and timestamp - self._absence_started_at >= self.absence_threshold
        ):
            self.state = PresenceState.ABSENT
            self._emit(PresenceEvent.USER_ABSENT, timestamp)

    def _transition_present(self, timestamp: float, returned: bool) -> None:
        self.state = PresenceState.PRESENT
        if returned:
            self.returned_at = timestamp
            self._emit(PresenceEvent.USER_RETURNED, timestamp)
        else:
            self._emit(PresenceEvent.USER_PRESENT, timestamp)

    def _emit(self, event: PresenceEvent, timestamp: float) -> None:
        record = PresenceEventRecord(event=event, state=self.state, timestamp=timestamp)
        for callback in (*self._callbacks[event], *self._all_callbacks):
            callback(record)

    def on_event(self, callback: EventCallback) -> None:
        self._all_callbacks.append(callback)

    def on_present(self, callback: EventCallback) -> None:
        self._callbacks[PresenceEvent.USER_PRESENT].append(callback)

    def on_absent(self, callback: EventCallback) -> None:
        self._callbacks[PresenceEvent.USER_ABSENT].append(callback)

    def on_returned(self, callback: EventCallback) -> None:
        self._callbacks[PresenceEvent.USER_RETURNED].append(callback)

    def is_present(self) -> bool:
        return self.state in {PresenceState.PRESENT, PresenceState.POSSIBLY_ABSENT}

    def get_state(self) -> PresenceState:
        return self.state

    def absent_for_seconds(self, now: float | None = None) -> float:
        if self._absence_started_at is None:
            return 0.0
        return max(0.0, (time.monotonic() if now is None else now) - self._absence_started_at)

    def seconds_until_absent(self, now: float | None = None) -> float | None:
        if self.state not in {PresenceState.UNKNOWN, PresenceState.POSSIBLY_ABSENT}:
            return None
        return max(0.0, self.absence_threshold - self.absent_for_seconds(now))
