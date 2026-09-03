import platform

from .base import PlatformAdapter
from .linux import LinuxAdapter
from .macos import MacOSAdapter
from .windows import WindowsAdapter


def current_platform() -> PlatformAdapter:
    adapters = {"Darwin": MacOSAdapter, "Linux": LinuxAdapter, "Windows": WindowsAdapter}
    try:
        return adapters[platform.system()]()
    except KeyError as exc:
        raise RuntimeError(f"Unsupported platform: {platform.system()}") from exc
