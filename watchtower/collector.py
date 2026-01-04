"""Event collector for aggregating and normalizing trace events."""

from typing import Dict, Any, List, Set
from watchtower.models.events import RunSummary


class EventCollector:
    """Aggregates event statistics and normalizes event data.

    Maintains running statistics for the current agent invocation
    and provides helper methods for creating normalized events.
    """

    def __init__(self):
        """Initialize event collector with fresh statistics."""
        self._llm_calls = 0
        self._tool_calls = 0
        self._total_tokens = 0
        self._errors = 0
        self._tools_used: Set[str] = set()
        self._run_start_time: float = 0

    def create_event(self, type: str, **kwargs) -> Dict[str, Any]:
        """Create a normalized event dictionary.

        Args:
            type: Event type (e.g., "run.start", "llm.request")
            **kwargs: Event-specific fields

        Returns:
            Normalized event dictionary
        """
        event = {"type": type}
        event.update(kwargs)
        return event

    def track_llm_call(self, tokens: int = 0) -> None:
        """Track an LLM call for statistics.

        Args:
            tokens: Number of tokens used in this call
        """
        self._llm_calls += 1
        self._total_tokens += tokens

    def track_tool_call(self, tool_name: str) -> None:
        """Track a tool call for statistics.

        Args:
            tool_name: Name of the tool that was called
        """
        self._tool_calls += 1
        self._tools_used.add(tool_name)

    def track_error(self) -> None:
        """Track an error occurrence."""
        self._errors += 1

    def get_summary(self) -> Dict[str, Any]:
        """Get current run summary statistics.

        Returns:
            Dictionary with aggregated statistics
        """
        return {
            "llm_calls": self._llm_calls,
            "tool_calls": self._tool_calls,
            "total_tokens": self._total_tokens,
            "errors": self._errors,
            "tools_used": sorted(list(self._tools_used)),
        }

    def reset(self) -> None:
        """Reset all statistics for a new run."""
        self._llm_calls = 0
        self._tool_calls = 0
        self._total_tokens = 0
        self._errors = 0
        self._tools_used.clear()
        self._run_start_time = 0
