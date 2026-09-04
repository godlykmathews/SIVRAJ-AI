from __future__ import annotations

import asyncio
import math
import textwrap
import time
from pathlib import Path
from typing import Any

import numpy as np

from sivraj.config import Config
from sivraj.browser import ElectronBrowserLauncher
from sivraj.presence.camera import CameraError, CameraService
from sivraj.presence.detector import DetectionResult, FaceDetector
from sivraj.presence.manager import PresenceManager
from sivraj.presence.state import PresenceObservation
from sivraj.runtime.assistant import AssistantRuntime
from sivraj.runtime.events import StateChanged
from sivraj.runtime.states import RuntimeState


class JarvisHUD:
    """OpenCV-powered local HUD, voice trigger, and presence monitor."""

    WIDTH = 1280
    HEIGHT = 720
    WINDOW_NAME = "SIVRAJ // LOCAL INTELLIGENCE"

    def __init__(self, runtime: AssistantRuntime, config: Config, *, speak: bool = True) -> None:
        self.runtime = runtime
        self.config = config
        self.speak = speak
        self.camera = CameraService(config.camera_index, config.camera_frame_width)
        self.detector = FaceDetector(
            target_width=config.camera_frame_width,
            scale_factor=config.face_scale_factor,
            min_neighbors=config.face_min_neighbors,
            min_size=config.face_min_size,
        )
        self.presence = PresenceManager(
            confirm_frames=config.presence_confirm_frames,
            absence_threshold=config.presence_absence_threshold,
        )
        self.browser = ElectronBrowserLauncher()
        self._absence_browser_armed = False
        self.presence.on_present(self._arm_autonomous_browser)
        self.presence.on_returned(self._arm_autonomous_browser)
        self.presence.on_absent(self._on_user_absent)
        self.runtime_state = RuntimeState.STOPPED
        self.activated = False
        self.pending_activation = False
        self.camera_error: str | None = None
        self.voice_error: str | None = None
        self.last_result = DetectionResult(boxes=())
        self.last_frame: Any | None = None
        self.avatar = self._load_avatar()
        self.transcript = ""
        self.reply = ""
        self.browser_status: str | None = None
        self.started_at = time.monotonic()
        self._next_detection_at = 0.0
        self._voice_task: asyncio.Task[None] | None = None
        self._startup_task: asyncio.Task[Any] | None = None
        self._startup_checked = False
        self._voice_initialized = False
        self._running = True

    def on_state_changed(self, event: StateChanged) -> None:
        self.runtime_state = event.current

    async def run(self) -> int:
        try:
            import cv2
        except ImportError:
            print("[SIVRAJ ERROR]\nOpenCV is not installed. Install requirements.txt.")
            return 1

        self.runtime.state_listener = self.on_state_changed
        cv2.namedWindow(self.WINDOW_NAME, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.WINDOW_NAME, self.WIDTH, self.HEIGHT)
        self._startup_task = asyncio.create_task(self.runtime.start(initialize_voice=False))
        try:
            while self._running:
                now = time.monotonic()
                self._poll_startup()
                self._read_camera(now)
                cv2.imshow(self.WINDOW_NAME, self.render(now))
                key = cv2.waitKey(1) & 0xFF
                if key in {10, 13}:
                    self._handle_enter()
                elif key in {27, ord("q"), ord("Q")}:
                    self._running = False
                try:
                    if cv2.getWindowProperty(self.WINDOW_NAME, cv2.WND_PROP_VISIBLE) < 1:
                        self._running = False
                except cv2.error:
                    self._running = False
                await asyncio.sleep(1 / 60)
        finally:
            if self._voice_task and not self._voice_task.done():
                self._voice_task.cancel()
                await asyncio.gather(self._voice_task, return_exceptions=True)
            if self._startup_task and not self._startup_task.done():
                await asyncio.gather(self._startup_task, return_exceptions=True)
            self.camera.stop()
            cv2.destroyAllWindows()
            await self.runtime.stop()
        return 0

    def _poll_startup(self) -> None:
        if self._startup_task is None or not self._startup_task.done() or self._startup_checked:
            return
        self._startup_checked = True
        try:
            health = self._startup_task.result()
        except Exception as exc:
            self.voice_error = f"CORE START FAILED: {exc}"
            return
        if not health.online:
            self.voice_error = "OLLAMA OFFLINE - RUN: ollama serve"
        elif not health.model_available:
            self.voice_error = f"MODEL MISSING - RUN: ollama pull {self.config.ollama_model}"
        elif self.pending_activation:
            self._activate()

    def _handle_enter(self) -> None:
        if self._startup_task is None or not self._startup_task.done():
            self.pending_activation = True
            return
        if self.voice_error and not self.activated:
            return
        if not self.activated:
            self._activate()
        elif self._voice_task is None or self._voice_task.done():
            self._voice_task = asyncio.create_task(self._listen_once())

    def _activate(self) -> None:
        self.pending_activation = False
        self.activated = True
        try:
            self.detector.start()
            self.camera.start()
        except Exception as exc:
            self.camera_error = str(exc)
            self.camera.stop()
        self._voice_task = asyncio.create_task(self._initialize_voice_and_listen())

    async def _initialize_voice_and_listen(self) -> None:
        status = await self.runtime.start_voice()
        if status["voice"] != "READY":
            self.voice_error = status["voice"]
            return
        self._voice_initialized = True
        await self._listen_once()

    async def _listen_once(self) -> None:
        if not self._voice_initialized:
            return
        self.voice_error = None
        self.transcript = ""
        try:
            transcript, reply = await self.runtime.process_voice(speak=self.speak)
            self.transcript = transcript
            self.reply = reply
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            self.voice_error = str(exc)
            self.runtime._set_state(RuntimeState.IDLE)

    def _read_camera(self, now: float) -> None:
        if not self.camera.is_open:
            return
        try:
            import cv2

            self.last_frame = cv2.flip(self.camera.read(), 1)
            if now >= self._next_detection_at:
                self.last_result = self.detector.detect(self.last_frame)
                self.presence.update(PresenceObservation(
                    face_count=self.last_result.face_count,
                    detected=self.last_result.detected,
                    timestamp=now,
                ))
                self._next_detection_at = now + (1.0 / self.config.presence_target_fps)
        except CameraError as exc:
            self.camera_error = str(exc)
            self.camera.stop()
        except Exception as exc:
            self.camera_error = f"Camera processing failed: {exc}"
            self.camera.stop()

    def _arm_autonomous_browser(self, _event: object) -> None:
        """Only a confirmed human may arm the subsequent departure action."""
        self._absence_browser_armed = True

    def _on_user_absent(self, _event: object) -> None:
        if not self._absence_browser_armed:
            return
        self._absence_browser_armed = False
        if self.browser.launch():
            self.browser_status = "AUTONOMOUS BROWSER LAUNCHED"
        elif self.browser.last_error:
            self.browser_status = self.browser.last_error

    def render(self, now: float | None = None) -> np.ndarray:
        import cv2

        now = time.monotonic() if now is None else now
        t = now - self.started_at
        canvas = np.zeros((self.HEIGHT, self.WIDTH, 3), dtype=np.uint8)
        canvas[:] = (12, 10, 6)
        self._draw_grid(canvas, t)
        self._draw_header(canvas)
        if self.activated:
            self._draw_character(canvas, (640, 310), 168, t)
        else:
            self._draw_character(canvas, (640, 325), 168, t)
        self._draw_presence_tag(canvas)
        self._draw_footer(canvas)
        self._draw_corner_marks(canvas)
        cv2.line(canvas, (42, 76), (1238, 76), (71, 52, 20), 1, cv2.LINE_AA)
        return canvas

    @staticmethod
    def _draw_grid(canvas: np.ndarray, t: float) -> None:
        import cv2

        offset = int(t * 12) % 48
        for x in range(-48 + offset, canvas.shape[1], 48):
            cv2.line(canvas, (x, 80), (x, canvas.shape[0] - 64), (24, 18, 8), 1)
        for y in range(88, canvas.shape[0] - 64, 48):
            cv2.line(canvas, (36, y), (canvas.shape[1] - 36, y), (24, 18, 8), 1)

    def _draw_header(self, canvas: np.ndarray) -> None:
        import cv2

        cv2.putText(canvas, "S I V R A J", (44, 48), cv2.FONT_HERSHEY_DUPLEX, 1.02, (255, 214, 65), 1, cv2.LINE_AA)
        cv2.putText(canvas, "LOCAL INTELLIGENCE // VISUAL CORE", (246, 47), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (137, 112, 46), 1, cv2.LINE_AA)
        cv2.putText(canvas, "PRIVATE  |  ON-DEVICE", (1035, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (130, 112, 63), 1, cv2.LINE_AA)

    @staticmethod
    def _draw_corner_marks(canvas: np.ndarray) -> None:
        import cv2

        color = (144, 101, 22)
        for x, y, sx, sy in ((28, 92, 1, 1), (1252, 92, -1, 1), (28, 656, 1, -1), (1252, 656, -1, -1)):
            cv2.line(canvas, (x, y), (x + sx * 34, y), color, 2)
            cv2.line(canvas, (x, y), (x, y + sy * 34), color, 2)

    def _draw_character(self, canvas: np.ndarray, center: tuple[int, int], radius: int, t: float) -> None:
        import cv2

        cx, cy = center
        glow, bright, dim = (210, 142, 26), (255, 224, 102), (95, 67, 21)
        pulse = 1.0 + 0.035 * math.sin(t * 2.4)
        for ring, thickness in ((int(radius * 1.25), 1), (int(radius * 1.05), 2), (int(radius * 0.82 * pulse), 1)):
            cv2.circle(canvas, center, ring, dim, thickness, cv2.LINE_AA)
        angle = (t * 52) % 360
        cv2.ellipse(canvas, center, (int(radius * 1.25), int(radius * 1.25)), 0, angle, angle + 82, glow, 3, cv2.LINE_AA)
        cv2.ellipse(canvas, center, (int(radius * 1.05), int(radius * 1.05)), 0, -angle, -angle + 112, bright, 2, cv2.LINE_AA)
        self._draw_avatar_image(canvas, center, int(radius * 1.92 * pulse))
        label = self.runtime_state.value if self.activated else "STANDBY"
        size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
        cv2.putText(canvas, label, (cx - size[0] // 2, cy + int(radius * 1.48)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, glow, 1, cv2.LINE_AA)

    @staticmethod
    def _load_avatar() -> np.ndarray | None:
        import cv2

        avatar_path = Path(__file__).resolve().parents[2] / "avatar.png"
        image = cv2.imread(str(avatar_path), cv2.IMREAD_COLOR)
        if image is None:
            return None
        height, width = image.shape[:2]
        side = int(min(height, width) * 0.82)
        left = (width - side) // 2
        top = (height - side) // 2
        return image[top:top + side, left:left + side]

    def _draw_avatar_image(
        self, canvas: np.ndarray, center: tuple[int, int], size: int
    ) -> None:
        import cv2

        if self.avatar is None:
            cv2.circle(canvas, center, size // 3, (255, 224, 102), 2, cv2.LINE_AA)
            return
        avatar = cv2.resize(self.avatar, (size, size), interpolation=cv2.INTER_AREA)
        half = size // 2
        x1, y1 = center[0] - half, center[1] - half
        x2, y2 = x1 + size, y1 + size
        roi = canvas[y1:y2, x1:x2]
        yy, xx = np.ogrid[-1:1:complex(size), -1:1:complex(size)]
        distance = np.sqrt(xx * xx + yy * yy)
        alpha = np.clip((1.0 - distance) / 0.12, 0.0, 1.0)[..., None]
        blended = roi.astype(np.float32) * (1.0 - alpha) + avatar.astype(np.float32) * alpha
        roi[:] = blended.astype(np.uint8)

    def _draw_presence_tag(self, canvas: np.ndarray) -> None:
        import cv2

        if not self.activated:
            return
        detected = self.presence.is_present()
        label = "HUMAN DETECTED" if detected else "SCANNING FOR HUMAN"
        color = (74, 230, 132) if detected else (62, 166, 225)
        x, y, width, height = 1040, 94, 192, 34
        cv2.rectangle(canvas, (x, y), (x + width, y + height), (22, 28, 20), -1)
        cv2.rectangle(canvas, (x, y), (x + width, y + height), color, 1)
        cv2.circle(canvas, (x + 17, y + 17), 5, color, -1, cv2.LINE_AA)
        cv2.putText(canvas, label, (x + 31, y + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.39, color, 1, cv2.LINE_AA)

    def _draw_footer(self, canvas: np.ndarray) -> None:
        import cv2

        if not self.activated:
            if self.voice_error:
                prompt, color = self.voice_error, (72, 92, 235)
            elif self.pending_activation:
                prompt, color = "CONNECTING LOCAL CORE...", (255, 207, 75)
            else:
                prompt, color = "PRESS  ENTER  TO  INITIALIZE", (255, 224, 102)
            size = cv2.getTextSize(prompt, cv2.FONT_HERSHEY_SIMPLEX, 0.64, 1)[0]
            cv2.putText(canvas, prompt, ((self.WIDTH - size[0]) // 2, 638), cv2.FONT_HERSHEY_SIMPLEX, 0.64, color, 1, cv2.LINE_AA)
            cv2.putText(canvas, "Q / ESC  EXIT", (585, 681), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (102, 84, 38), 1, cv2.LINE_AA)
            return
        x = 390
        if self.camera_error:
            self._put_wrapped(canvas, "CAMERA: " + self.camera_error, x, 545, 60, (77, 105, 239))
        elif self.voice_error:
            self._put_wrapped(canvas, self.voice_error, x, 545, 60, (77, 105, 239))
        elif self.reply:
            self._put_wrapped(canvas, "SIVRAJ: " + self.reply, x, 525, 60, (221, 207, 148))
        elif self.transcript:
            self._put_wrapped(canvas, "YOU: " + self.transcript, x, 525, 60, (221, 207, 148))
        elif self.browser_status:
            self._put_wrapped(canvas, self.browser_status, x, 545, 60, (221, 207, 148))
        busy = self._voice_task is not None and not self._voice_task.done()
        hint = "VOICE CHANNEL ACTIVE" if busy else "PRESS ENTER TO SPEAK"
        hint_size = cv2.getTextSize(hint, cv2.FONT_HERSHEY_SIMPLEX, 0.54, 1)[0]
        cv2.putText(canvas, hint, ((self.WIDTH - hint_size[0]) // 2, 628), cv2.FONT_HERSHEY_SIMPLEX, 0.54, (255, 211, 84), 1, cv2.LINE_AA)
        privacy = "Q / ESC  EXIT   |   CAMERA ACTIVE FOR PRESENCE ONLY"
        privacy_size = cv2.getTextSize(privacy, cv2.FONT_HERSHEY_SIMPLEX, 0.35, 1)[0]
        cv2.putText(canvas, privacy, ((self.WIDTH - privacy_size[0]) // 2, 662), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (118, 96, 44), 1, cv2.LINE_AA)

    @staticmethod
    def _put_wrapped(canvas: np.ndarray, text: str, x: int, y: int, width: int, color: tuple[int, int, int]) -> None:
        import cv2

        for index, line in enumerate(textwrap.wrap(text, width=width)[:4]):
            cv2.putText(canvas, line, (x, y + index * 22), cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1, cv2.LINE_AA)
