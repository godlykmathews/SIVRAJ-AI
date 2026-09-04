from __future__ import annotations

from typing import Any


class CameraError(RuntimeError):
    pass


class CameraService:
    """Small explicit-lifecycle wrapper around OpenCV VideoCapture."""

    def __init__(self, camera_index: int = 0, frame_width: int = 640) -> None:
        self.camera_index = camera_index
        self.frame_width = frame_width
        self._capture: Any | None = None

    def start(self) -> None:
        try:
            import cv2
        except ImportError as exc:
            raise CameraError("OpenCV is not installed. Install requirements.txt.") from exc

        capture = cv2.VideoCapture(self.camera_index)
        if not capture.isOpened():
            capture.release()
            raise CameraError(
                f"Could not access camera {self.camera_index}. Check the camera index "
                "and operating-system camera permission."
            )
        if self.frame_width > 0:
            capture.set(cv2.CAP_PROP_FRAME_WIDTH, self.frame_width)
        self._capture = capture

    def read(self) -> Any:
        if self._capture is None:
            raise CameraError("CameraService.start() must be called first")
        ok, frame = self._capture.read()
        if not ok or frame is None:
            raise CameraError(f"Camera {self.camera_index} stopped returning frames")
        return frame

    def stop(self) -> None:
        if self._capture is not None:
            self._capture.release()
            self._capture = None

    @property
    def is_open(self) -> bool:
        return self._capture is not None and bool(self._capture.isOpened())
