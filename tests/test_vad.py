from sivraj.audio.vad import VoiceActivityDetector


def test_silence_is_not_speech() -> None:
    vad = VoiceActivityDetector(sample_rate=16_000)
    assert vad.is_speech(bytes(16_000 * 30 // 1000 * 2)) is False
