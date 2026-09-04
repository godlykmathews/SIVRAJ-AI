from __future__ import annotations

import time

from sivraj.config import Config

from .camera import CameraError, CameraService
from .detector import DetectionResult, FaceDetector
from .manager import PresenceManager
from .state import PresenceEvent, PresenceEventRecord, PresenceObservation, PresenceState


EVENT_MESSAGES = {
    PresenceEvent.PRESENCE_DETECTED: "Face detected.",
    PresenceEvent.PRESENCE_LOST: "Face temporarily lost...",
    PresenceEvent.USER_PRESENT: "USER PRESENT",
    PresenceEvent.USER_ABSENT: "USER ABSENT",
    PresenceEvent.USER_RETURNED: "USER RETURNED",
}


def _log_event(record: PresenceEventRecord) -> None:
    print(f"\n[PRESENCE]\n{EVENT_MESSAGES[record.event]}")


def _draw_preview(
    frame: object,
    result: DetectionResult,
    manager: PresenceManager,
    fps: float,
    latency_ms: float,
    now: float,
) -> None:
    import cv2

    state = manager.get_state()
    color = {
        PresenceState.PRESENT: (0, 220, 0),
        PresenceState.POSSIBLY_ABSENT: (0, 190, 255),
        PresenceState.ABSENT: (0, 0, 230),
        PresenceState.UNKNOWN: (180, 180, 180),
    }[state]
    for x, y, width, height in result.boxes:
        cv2.rectangle(frame, (x, y), (x + width, y + height), (0, 220, 0), 2)

    stable_label = "USER PRESENT" if manager.is_present() else "NO USER DETECTED"
    lines = [
        f"CAMERA ACTIVE - {stable_label}",
        f"STATE: {state.value.upper()}",
        f"FACES: {result.face_count}",
        "FACE SCORE: " + (f"{max(result.scores):.2f}" if result.scores else "N/A"),
        f"FPS: {fps:.1f}  DETECTION: {latency_ms:.1f} ms",
    ]
    remaining = manager.seconds_until_absent(now)
    if remaining is not None:
        lines.append(f"ABSENT IN: {remaining:.1f}s")
    for index, line in enumerate(lines):
        y = 30 + index * 28
        cv2.putText(frame, line, (15, y), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)
    cv2.putText(
        frame, "Q / ESC to quit - frames are not saved", (15, frame.shape[0] - 18),
        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 220, 220), 1,
    )


def run_camera_test(config: Config) -> int:
    try:
        import cv2
    except ImportError:
        print("[PRESENCE ERROR]\nOpenCV is not installed. Install requirements.txt.")
        return 1

    camera = CameraService(config.camera_index, config.camera_frame_width)
    detector = FaceDetector(
        target_width=config.camera_frame_width,
        scale_factor=config.face_scale_factor,
        min_neighbors=config.face_min_neighbors,
        min_size=config.face_min_size,
    )
    manager = PresenceManager(
        confirm_frames=config.presence_confirm_frames,
        absence_threshold=config.presence_absence_threshold,
    )
    manager.on_event(_log_event)
    detection_interval = 1.0 / config.presence_target_fps
    next_detection_at = 0.0
    last_result = DetectionResult(boxes=())
    latency_ms = 0.0
    smoothed_fps = 0.0
    previous_frame_at: float | None = None

    print(
        "[PRESENCE]\nCamera detection is active. Frames are processed in memory "
        "and are never saved."
    )
    try:
        detector.start()
        camera.start()
        while True:
            frame = camera.read()
            frame = cv2.flip(frame, 1)
            now = time.monotonic()
            if previous_frame_at is not None and now > previous_frame_at:
                instant_fps = 1.0 / (now - previous_frame_at)
                smoothed_fps = instant_fps if smoothed_fps == 0 else (0.9 * smoothed_fps + 0.1 * instant_fps)
            previous_frame_at = now

            if now >= next_detection_at:
                started = time.perf_counter()
                last_result = detector.detect(frame)
                latency_ms = (time.perf_counter() - started) * 1000
                manager.update(PresenceObservation(
                    face_count=last_result.face_count,
                    detected=last_result.detected,
                    timestamp=now,
                ))
                next_detection_at = now + detection_interval

            if config.camera_preview:
                _draw_preview(frame, last_result, manager, smoothed_fps, latency_ms, now)
                cv2.imshow("SIVRAJ Presence Test - Camera Active", frame)
                key = cv2.waitKey(1) & 0xFF
                if key in {ord("q"), ord("Q"), 27}:
                    break
            else:
                time.sleep(min(0.02, detection_interval / 2))
    except CameraError as exc:
        print(f"\n[PRESENCE ERROR]\n{exc}")
        return 1
    except KeyboardInterrupt:
        print("\n[PRESENCE]\nStopping camera test.")
    except Exception as exc:
        print(f"\n[PRESENCE ERROR]\n{exc}")
        return 1
    finally:
        camera.stop()
        cv2.destroyAllWindows()
        print("\n[PRESENCE]\nCamera released.")
    return 0


def main() -> None:
    raise SystemExit(run_camera_test(Config.from_env()))


if __name__ == "__main__":
    main()
