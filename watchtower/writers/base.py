"""Base writer interface for trace event output."""

from abc import ABC, abstractmethod
from typing import Dict, Any


class TraceWriter(ABC):
    """Abstract base class for trace event writers.

    Writers are responsible for outputting trace events to different destinations
    (files, stdout, cloud storage, databases, etc.).
    """

    @abstractmethod
    def write(self, event: Dict[str, Any]) -> None:
        """Write a single event.

        Args:
            event: Event dictionary to write
        """
        pass

    @abstractmethod
    def flush(self) -> None:
        """Flush any buffered events to ensure they are persisted."""
        pass
