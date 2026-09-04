from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from sivraj.browser.launcher import ElectronBrowserLauncher
from sivraj.config import Config
from sivraj.ui.hud import JarvisHUD


class FakeProcess:
    def poll(self) -> None:
        return None


class FakeBrowser:
    def __init__(self) -> None:
        self.launch_count = 0
        self.last_error = None

    def launch(self) -> bool:
        self.launch_count += 1
        return True


def config(tmp_path: Path) -> Config:
    return Config(
        ollama_host="http://localhost:11434",
        ollama_model="test",
        whisper_model="tiny",
        whisper_device="cpu",
        whisper_compute_type="int8",
        piper_executable="piper",
        piper_model_path=None,
        tts_backend="off",
        macos_voice=None,
        mic_device=None,
        speaker_device=None,
        history_turns=1,
        debug=False,
        database_path=tmp_path / "test.db",
    )


def make_electron(app_directory: Path) -> Path:
    executable = app_directory / "node_modules" / ".bin" / "electron"
    executable.parent.mkdir(parents=True)
    executable.touch()
    return executable


def test_local_electron_is_preferred(tmp_path: Path) -> None:
    app_directory = tmp_path / "browser"
    executable = make_electron(app_directory)
    launcher = ElectronBrowserLauncher(app_directory)

    assert launcher._resolve_command() == [str(executable), str(app_directory)]


def test_launch_is_single_instance_and_clears_node_mode(
    tmp_path: Path, monkeypatch
) -> None:
    app_directory = tmp_path / "browser"
    executable = make_electron(app_directory)
    captured: dict[str, object] = {}

    def fake_popen(command, **kwargs):
        captured["command"] = command
        captured.update(kwargs)
        return FakeProcess()

    monkeypatch.setenv("ELECTRON_RUN_AS_NODE", "1")
    monkeypatch.setattr("sivraj.browser.launcher.subprocess.Popen", fake_popen)
    launcher = ElectronBrowserLauncher(app_directory)

    assert launcher.launch() is True
    assert launcher.launch() is False
    assert captured["command"] == [str(executable), str(app_directory)]
    assert "ELECTRON_RUN_AS_NODE" not in captured["env"]


def test_browser_requires_confirmed_presence_before_absence(tmp_path: Path) -> None:
    hud = JarvisHUD(SimpleNamespace(), config(tmp_path))
    browser = FakeBrowser()
    hud.browser = browser

    # Initial UNKNOWN -> ABSENT must not be treated as a person leaving.
    hud._on_user_absent(object())
    assert browser.launch_count == 0

    hud._arm_autonomous_browser(object())
    hud._on_user_absent(object())
    assert browser.launch_count == 1

    # A repeated absence cannot launch again until presence is reconfirmed.
    hud._on_user_absent(object())
    assert browser.launch_count == 1
