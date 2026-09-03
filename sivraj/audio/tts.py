from __future__ import annotations

import asyncio
import shutil
import sys
import tempfile
from pathlib import Path


class PiperTTS:
    def __init__(
        self,
        executable: str,
        model_path: Path | None,
        backend: str = "piper",
        macos_voice: str | None = None,
    ) -> None:
        self.executable = executable
        self.model_path = model_path
        self.backend = backend
        self.macos_voice = macos_voice
        self._command = executable

    async def start(self) -> None:
        if self.backend == "off":
            return
        if self.backend == "say":
            if shutil.which("say") is None:
                raise RuntimeError("macOS 'say' command is unavailable")
            return
        if self.backend != "piper":
            raise RuntimeError(f"Unknown TTS backend: {self.backend}")
        found = shutil.which(self.executable)
        sibling = Path(sys.executable).with_name(self.executable)
        if found:
            self._command = found
        elif sibling.is_file():
            self._command = str(sibling)
        else:
            raise RuntimeError("Piper is not installed or PIPER_EXECUTABLE is incorrect")
        if self.model_path is None or not self.model_path.is_file():
            raise RuntimeError("PIPER_MODEL_PATH does not point to a Piper .onnx model")

    async def synthesize(self, text: str) -> Path | None:
        if self.backend == "off":
            return None
        suffix = ".aiff" if self.backend == "say" else ".wav"
        handle = tempfile.NamedTemporaryFile(prefix="sivraj-", suffix=suffix, delete=False)
        output = Path(handle.name)
        handle.close()
        if self.backend == "say":
            args = ["say", "-o", str(output)]
            if self.macos_voice:
                args.extend(["-v", self.macos_voice])
            args.append(text)
            process = await asyncio.create_subprocess_exec(
                *args, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE
            )
            _, error = await process.communicate()
        else:
            process = await asyncio.create_subprocess_exec(
                self._command, "--model", str(self.model_path), "--output-file", str(output),
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
            )
            _, error = await process.communicate(text.encode("utf-8"))
        if process.returncode:
            output.unlink(missing_ok=True)
            raise RuntimeError(error.decode(errors="replace").strip() or "TTS synthesis failed")
        return output
