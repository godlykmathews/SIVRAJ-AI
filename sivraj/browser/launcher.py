from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


class ElectronBrowserLauncher:
    """Launch at most one autonomous browser process at a time."""

    def __init__(self, app_directory: Path | None = None) -> None:
        project_root = Path(__file__).resolve().parents[2]
        self.app_directory = app_directory or project_root / "browser"
        self.process: subprocess.Popen[bytes] | None = None
        self.last_error: str | None = None

    @property
    def is_running(self) -> bool:
        return self.process is not None and self.process.poll() is None

    def launch(self) -> bool:
        if self.is_running:
            return False
        command = self._resolve_command()
        if command is None:
            self.last_error = "Electron is not installed. Run: cd browser && npm install"
            return False
        try:
            child_environment = os.environ.copy()
            # Some development hosts set this to force Electron into plain Node mode.
            child_environment.pop("ELECTRON_RUN_AS_NODE", None)
            self.process = subprocess.Popen(
                command,
                cwd=self.app_directory,
                env=child_environment,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        except OSError as exc:
            self.last_error = f"Could not launch autonomous browser: {exc}"
            return False
        self.last_error = None
        return True

    def _resolve_command(self) -> list[str] | None:
        configured = os.getenv("SIVRAJ_BROWSER_COMMAND", "").strip()
        if configured:
            return [configured, str(self.app_directory)]

        executable_name = "electron.cmd" if os.name == "nt" else "electron"
        local_electron = self.app_directory / "node_modules" / ".bin" / executable_name
        if local_electron.is_file():
            return [str(local_electron), str(self.app_directory)]

        global_electron = shutil.which("electron")
        if global_electron:
            return [global_electron, str(self.app_directory)]
        return None
