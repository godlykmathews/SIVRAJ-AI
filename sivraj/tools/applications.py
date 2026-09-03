from __future__ import annotations

from sivraj.platform import current_platform


ALLOWED_APPS = frozenset({"spotify", "vscode", "calculator"})
ALIASES = {
    "spotify": "spotify",
    "visual studio code": "vscode",
    "vs code": "vscode",
    "vscode": "vscode",
    "code": "vscode",
    "calculator": "calculator",
    "calc": "calculator",
}


async def open_app(app_name: str) -> dict[str, str]:
    app_id = ALIASES.get(app_name.strip().lower())
    if app_id not in ALLOWED_APPS:
        raise ValueError(f"Unsupported application: {app_name}")
    await current_platform().open_app(app_id)
    return {"opened": app_id}
