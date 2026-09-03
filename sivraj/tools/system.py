from __future__ import annotations

from datetime import datetime

import psutil


def get_current_time() -> dict[str, str]:
    now = datetime.now().astimezone()
    return {
        "time": now.strftime("%H:%M:%S"),
        "date": now.date().isoformat(),
        "timezone": str(now.tzinfo),
    }


def get_system_status() -> dict[str, float | None]:
    battery = psutil.sensors_battery()
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory_percent": psutil.virtual_memory().percent,
        "battery_percent": battery.percent if battery else None,
    }
