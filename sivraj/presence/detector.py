from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class DetectionResult:
    boxes: tuple[tuple[int, int, int, int], ...]
    scores: tuple[float, ...] = ()

    @property
    def face_count(self) -> int:
        return len(self.boxes)

    @property
    def detected(self) -> bool:
        return self.face_count >= 1


class Detector(Protocol):
    def detect(self, frame: Any) -> DetectionResult: ...


class FaceDetector:
    """OpenCV Haar frontal-face detector; it never retains input frames."""

    def __init__(
        self,
        target_width: int = 640,
        scale_factor: float = 1.1,
        min_neighbors: int = 5,
        min_size: int = 60,
    ) -> None:
        if target_width <= 0:
            raise ValueError("target_width must be positive")
        if scale_factor <= 1.0:
            raise ValueError("scale_factor must be greater than 1")
        if min_neighbors < 0 or min_size <= 0:
            raise ValueError("invalid face detector settings")
        self.target_width = target_width
        self.scale_factor = scale_factor
        self.min_neighbors = min_neighbors
        self.min_size = min_size
        self._cascade: Any | None = None

    def start(self) -> None:
        try:
            import cv2
        except ImportError as exc:
            raise RuntimeError("OpenCV is not installed. Install requirements.txt.") from exc
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        cascade = cv2.CascadeClassifier(cascade_path)
        if cascade.empty():
            raise RuntimeError(f"OpenCV face detector resource is unavailable: {cascade_path}")
        self._cascade = cascade

    def detect(self, frame: Any) -> DetectionResult:
        if self._cascade is None:
            raise RuntimeError("FaceDetector.start() must be called first")
        import cv2

        original_height, original_width = frame.shape[:2]
        scale = min(1.0, self.target_width / float(original_width))
        if scale < 1.0:
            resized = cv2.resize(
                frame,
                (self.target_width, max(1, round(original_height * scale))),
                interpolation=cv2.INTER_AREA,
            )
        else:
            resized = frame
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        common = {
            "scaleFactor": self.scale_factor,
            "minNeighbors": self.min_neighbors,
            "minSize": (self.min_size, self.min_size),
        }
        try:
            detected, _reject_levels, level_weights = self._cascade.detectMultiScale3(
                gray, outputRejectLevels=True, **common
            )
            scores = tuple(float(score) for score in level_weights)
        except (AttributeError, TypeError):
            detected = self._cascade.detectMultiScale(gray, **common)
            scores = ()
        inverse = 1.0 / scale
        boxes = tuple(
            (
                round(int(x) * inverse),
                round(int(y) * inverse),
                round(int(width) * inverse),
                round(int(height) * inverse),
            )
            for x, y, width, height in detected
        )
        return DetectionResult(boxes=boxes, scores=scores)
