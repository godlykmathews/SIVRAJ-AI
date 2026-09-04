from sivraj.presence.manager import PresenceManager
from sivraj.presence.state import PresenceEvent, PresenceObservation, PresenceState


def observation(timestamp: float, faces: int) -> PresenceObservation:
    return PresenceObservation(face_count=faces, detected=faces >= 1, timestamp=timestamp)


def test_two_detections_confirm_presence() -> None:
    manager = PresenceManager(confirm_frames=2, absence_threshold=5.0)
    manager.update(observation(0.0, 1))
    assert manager.get_state() == PresenceState.UNKNOWN
    manager.update(observation(0.1, 1))
    assert manager.get_state() == PresenceState.PRESENT
    assert manager.is_present() is True
    assert manager.last_seen_at == 0.1


def test_any_positive_face_count_means_present() -> None:
    manager = PresenceManager(confirm_frames=1, absence_threshold=5.0)
    manager.update(observation(0.0, 3))
    assert manager.get_state() == PresenceState.PRESENT


def test_short_face_loss_does_not_become_absent() -> None:
    manager = PresenceManager(confirm_frames=2, absence_threshold=5.0)
    present_events = []
    manager.on_present(present_events.append)
    manager.update(observation(0.0, 1))
    manager.update(observation(0.1, 1))
    manager.update(observation(1.0, 0))
    assert manager.get_state() == PresenceState.POSSIBLY_ABSENT
    assert manager.is_present() is True
    assert manager.seconds_until_absent(3.0) == 3.0
    manager.update(observation(3.0, 1))
    assert manager.get_state() == PresenceState.PRESENT
    assert len(present_events) == 1


def test_continuous_loss_becomes_absent_after_threshold() -> None:
    manager = PresenceManager(confirm_frames=2, absence_threshold=5.0)
    manager.update(observation(0.0, 1))
    manager.update(observation(0.1, 1))
    manager.update(observation(1.0, 0))
    manager.update(observation(5.9, 0))
    assert manager.get_state() == PresenceState.POSSIBLY_ABSENT
    manager.update(observation(6.0, 0))
    assert manager.get_state() == PresenceState.ABSENT
    assert manager.is_present() is False
    assert manager.absent_for_seconds(7.0) == 6.0


def test_empty_room_transitions_unknown_to_absent() -> None:
    manager = PresenceManager(confirm_frames=2, absence_threshold=5.0)
    manager.update(observation(10.0, 0))
    assert manager.get_state() == PresenceState.UNKNOWN
    manager.update(observation(15.0, 0))
    assert manager.get_state() == PresenceState.ABSENT


def test_return_requires_confirmation_and_emits_returned() -> None:
    manager = PresenceManager(confirm_frames=2, absence_threshold=5.0)
    events = []
    manager.on_event(lambda record: events.append(record.event))
    manager.update(observation(0.0, 0))
    manager.update(observation(5.0, 0))
    manager.update(observation(6.0, 2))
    assert manager.get_state() == PresenceState.ABSENT
    manager.update(observation(6.1, 1))
    assert manager.get_state() == PresenceState.PRESENT
    assert manager.returned_at == 6.1
    assert PresenceEvent.USER_ABSENT in events
    assert PresenceEvent.USER_RETURNED in events


def test_invalid_observation_is_rejected() -> None:
    try:
        PresenceObservation(face_count=0, detected=True, timestamp=0.0)
    except ValueError as exc:
        assert "detected must match" in str(exc)
    else:
        raise AssertionError("inconsistent observation was accepted")


def test_callbacks_are_scoped() -> None:
    manager = PresenceManager(confirm_frames=1, absence_threshold=1.0)
    present = []
    absent = []
    returned = []
    manager.on_present(present.append)
    manager.on_absent(absent.append)
    manager.on_returned(returned.append)
    manager.update(observation(0.0, 1))
    manager.update(observation(1.0, 0))
    manager.update(observation(2.0, 0))
    manager.update(observation(3.0, 1))
    assert len(present) == 1
    assert len(absent) == 1
    # confirm_frames=1 means return is immediate.
    assert len(returned) == 1
