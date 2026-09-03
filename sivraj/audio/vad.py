from __future__ import annotations


class VoiceActivityDetector:
    """WebRTC VAD wrapper for 16-bit mono PCM frames."""

    def __init__(self, sample_rate: int = 16_000, aggressiveness: int = 2) -> None:
        try:
            import webrtcvad
        except ImportError as exc:
            raise RuntimeError("VAD unavailable. Install requirements.txt") from exc
        self.sample_rate = sample_rate
        self._vad = webrtcvad.Vad(aggressiveness)

    def is_speech(self, pcm_frame: bytes) -> bool:
        return self._vad.is_speech(pcm_frame, self.sample_rate)
