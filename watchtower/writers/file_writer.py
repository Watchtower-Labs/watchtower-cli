"""File writer for persisting trace events to disk."""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import platform

# Import fcntl only on Unix systems
try:
    import fcntl
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False

from watchtower.writers.base import TraceWriter


class FileWriter(TraceWriter):
    """Writes trace events to JSONL files in ~/.watchtower/traces/

    File naming: {date}_{run_id}.jsonl
    Example: 2024-01-15_abc123.jsonl

    Events are buffered and written in batches for performance.
    File locking ensures safe concurrent access.
    """

    def __init__(
        self,
        trace_dir: str = "~/.watchtower/traces",
        buffer_size: int = 10,
    ):
        """Initialize file writer.

        Args:
            trace_dir: Directory to store trace files (will be expanded)
            buffer_size: Number of events to buffer before flushing
        """
        self.trace_dir = Path(trace_dir).expanduser()
        self.trace_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        self._current_file: Optional[Path] = None
        self._buffer: List[Dict[str, Any]] = []
        self._buffer_size = buffer_size
        self._is_windows = platform.system() == "Windows"

    def _get_trace_file(self, run_id: str) -> Path:
        """Get or create trace file path for this run.

        Args:
            run_id: Unique run identifier

        Returns:
            Path to trace file
        """
        if self._current_file is None:
            date_str = datetime.now().strftime("%Y-%m-%d")
            filename = f"{date_str}_{run_id}.jsonl"
            self._current_file = self.trace_dir / filename
        return self._current_file

    def write(self, event: Dict[str, Any]) -> None:
        """Buffer and write event to trace file.

        Args:
            event: Event dictionary to write
        """
        self._buffer.append(event)

        if len(self._buffer) >= self._buffer_size:
            self._flush_buffer(event.get("run_id", "unknown"))

    def _flush_buffer(self, run_id: str) -> None:
        """Write buffered events to file.

        Args:
            run_id: Run identifier for file naming
        """
        if not self._buffer:
            return

        trace_file = self._get_trace_file(run_id)

        try:
            with open(trace_file, "a", encoding="utf-8") as f:
                # File locking for concurrent access safety (Unix only)
                if HAS_FCNTL and not self._is_windows:
                    try:
                        fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    except (BlockingIOError, OSError):
                        # Another process has the lock, skip this flush
                        return

                # Write all buffered events
                for event in self._buffer:
                    line = json.dumps(event, separators=(",", ":"), default=str)
                    f.write(line + "\n")

                # Release lock (Unix only)
                if HAS_FCNTL and not self._is_windows:
                    try:
                        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                    except OSError:
                        pass

            self._buffer.clear()

        except Exception as e:
            # Log error but don't crash - observability shouldn't break the agent
            print(f"Warning: Failed to write trace events: {e}", flush=True)
            self._buffer.clear()

    def flush(self) -> None:
        """Force flush any remaining buffered events."""
        if self._buffer:
            run_id = self._buffer[0].get("run_id", "unknown")
            self._flush_buffer(run_id)

    def get_trace_path(self) -> Optional[Path]:
        """Return the current trace file path.

        Returns:
            Path to current trace file, or None if not yet created
        """
        return self._current_file
