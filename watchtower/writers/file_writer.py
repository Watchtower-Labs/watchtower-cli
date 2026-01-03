"""File writer for persisting trace events to disk."""

import json
import os
import sys
import time
import traceback
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
        self._dead_letter_dir = self.trace_dir / "dead_letter"
        self._dead_letter_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        self._current_file: Optional[Path] = None
        self._buffer: List[Dict[str, Any]] = []
        self._buffer_size = buffer_size
        self._is_windows = platform.system() == "Windows"
        self._consecutive_lock_failures: int = 0

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

    def _write_to_dead_letter(self, events: List[Dict[str, Any]], error: Exception) -> None:
        """Write failed events to dead-letter file.

        Args:
            events: Events that failed to write
            error: Exception that caused the failure
        """
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            dead_letter_file = self._dead_letter_dir / f"dead_letter_{timestamp}.jsonl"
            
            with open(dead_letter_file, "a", encoding="utf-8") as f:
                # Write error metadata
                error_metadata = {
                    "error_type": type(error).__name__,
                    "error_message": str(error),
                    "error_traceback": traceback.format_exc(),
                    "event_count": len(events),
                    "timestamp": datetime.now().isoformat(),
                }
                f.write(json.dumps(error_metadata, separators=(",", ":"), default=str) + "\n")
                
                # Write failed events
                for event in events:
                    line = json.dumps(event, separators=(",", ":"), default=str)
                    f.write(line + "\n")
        except Exception as e:
            # If we can't write to dead-letter, log to stderr as last resort
            print(
                f"Critical: Failed to write to dead-letter file: {e}",
                file=sys.stderr,
                flush=True,
            )

    def write(self, event: Dict[str, Any]) -> None:
        """Buffer and write event to trace file.

        Args:
            event: Event dictionary to write
        """
        self._buffer.append(event)

        if len(self._buffer) >= self._buffer_size:
            self._flush_buffer(event.get("run_id", "unknown"))

    def _flush_buffer(self, run_id: str) -> None:
        """Write buffered events to file with retry logic.

        Args:
            run_id: Run identifier for file naming
        """
        if not self._buffer:
            return

        trace_file = self._get_trace_file(run_id)
        events_to_write = self._buffer.copy()
        max_retries = 3
        retry_delays = [0.1, 0.5, 2.0]  # Exponential backoff: 100ms, 500ms, 2s

        for retry_attempt in range(max_retries):
            try:
                with open(trace_file, "a", encoding="utf-8") as f:
                    # File locking for concurrent access safety (Unix only)
                    lock_acquired = False
                    if HAS_FCNTL and not self._is_windows:
                        backoff_delays = [0.05, 0.1, 0.2]  # 50ms, 100ms, 200ms
                        
                        for attempt, delay in enumerate(backoff_delays):
                            try:
                                fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                                lock_acquired = True
                                break
                            except (BlockingIOError, OSError) as e:
                                if attempt < len(backoff_delays) - 1:
                                    # Wait before retry
                                    time.sleep(delay)
                                else:
                                    # All retries failed
                                    self._consecutive_lock_failures += 1
                                    print(
                                        f"Warning: Failed to acquire file lock after {len(backoff_delays)} attempts "
                                        f"for {trace_file}: {e}",
                                        flush=True,
                                    )
                                    
                                    # Escalate if threshold exceeded
                                    if self._consecutive_lock_failures >= 5:
                                        print(
                                            f"Error: File lock acquisition has failed {self._consecutive_lock_failures} "
                                            f"consecutive times for {trace_file}. "
                                            f"Buffer contains {len(events_to_write)} unwritten events.",
                                            file=sys.stderr,
                                            flush=True,
                                        )
                                    raise
                        
                        if not lock_acquired:
                            raise RuntimeError("Failed to acquire file lock")

                    # Write all buffered events with lock release guarantee
                    try:
                        for event in events_to_write:
                            line = json.dumps(event, separators=(",", ":"), default=str)
                            f.write(line + "\n")
                    finally:
                        # Always release lock if it was acquired (Unix only)
                        if lock_acquired:
                            try:
                                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                            except OSError:
                                pass

                # Success: clear all events that were written
                # Remove events from start of buffer (events_to_write is a snapshot of buffer at start)
                if len(self._buffer) >= len(events_to_write):
                    self._buffer = self._buffer[len(events_to_write):]
                else:
                    # Buffer was modified during retry, clear it entirely
                    self._buffer.clear()
                self._consecutive_lock_failures = 0
                return

            except Exception as e:
                # Log full exception details and buffered events
                error_details = {
                    "exception_type": type(e).__name__,
                    "exception_message": str(e),
                    "traceback": traceback.format_exc(),
                    "trace_file": str(trace_file),
                    "event_count": len(events_to_write),
                    "retry_attempt": retry_attempt + 1,
                    "max_retries": max_retries,
                }
                
                print(
                    f"Error: Failed to write trace events (attempt {retry_attempt + 1}/{max_retries}):\n"
                    f"{json.dumps(error_details, indent=2, default=str)}\n"
                    f"Buffered events: {json.dumps(events_to_write, indent=2, default=str)}",
                    file=sys.stderr,
                    flush=True,
                )

                # If this was the last retry, move to dead-letter and clear attempted events
                if retry_attempt == max_retries - 1:
                    print(
                        f"Critical: All retries exhausted. Moving {len(events_to_write)} events to dead-letter file.",
                        file=sys.stderr,
                        flush=True,
                    )
                    self._write_to_dead_letter(events_to_write, e)
                    # Remove only the events that were attempted (from start of buffer)
                    if len(self._buffer) >= len(events_to_write):
                        self._buffer = self._buffer[len(events_to_write):]
                    else:
                        # Buffer was modified during retry, clear it entirely
                        self._buffer.clear()
                    return
                
                # Wait before retry with exponential backoff
                if retry_attempt < len(retry_delays):
                    time.sleep(retry_delays[retry_attempt])

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
