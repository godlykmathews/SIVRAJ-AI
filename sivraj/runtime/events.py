from dataclasses import dataclass
from datetime import datetime

from .states import RuntimeState


@dataclass(frozen=True, slots=True)
class StateChanged:
    previous: RuntimeState
    current: RuntimeState
    at: datetime
