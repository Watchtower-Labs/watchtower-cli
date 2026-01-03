"""Stdout writer for streaming trace events in real-time."""

import sys
import json
from typing import TextIO, Dict, Any


class StdoutWriter:
    """Emits events as NDJSON (newline-delimited JSON) to stdout.

    Used for live tailing when CLI spawns the Python process.
    Format follows JSON-RPC 2.0 notification structure for extensibility.

    Output format:
    {"jsonrpc":"2.0","method":"<event.type>","params":{...event}}
    """

    def __init__(self, stream: TextIO = None):
        """Initialize stdout writer.

        Args:
            stream: Output stream (defaults to sys.stdout)
        """
        self._stream = stream or sys.stdout
        self._ensure_unbuffered()

    def _ensure_unbuffered(self) -> None:
        """Ensure stdout is unbuffered for real-time streaming."""
        # Set PYTHONUNBUFFERED environment variable or reconfigure stream
        if hasattr(self._stream, "reconfigure"):
            try:
                self._stream.reconfigure(line_buffering=True)
            except Exception:
                # Some streams don't support reconfigure
                pass

    def write(self, event: Dict[str, Any]) -> None:
        """Write event as JSON-RPC 2.0 notification.

        Args:
            event: Event dictionary to write

        Output format:
        {"jsonrpc":"2.0","method":"<event.type>","params":{...event}}
        """
        try:
            message = {
                "jsonrpc": "2.0",
                "method": event.get("type", "unknown"),
                "params": event,
            }

            line = json.dumps(message, separators=(",", ":"), default=str)
            self._stream.write(line + "\n")
            self._stream.flush()

        except Exception as e:
            # Don't crash on write errors - observability shouldn't break the agent
            # Write to stderr instead
            print(f"Warning: Failed to write event to stdout: {e}", file=sys.stderr, flush=True)

    def flush(self) -> None:
        """Explicit flush (usually no-op due to line buffering)."""
        try:
            self._stream.flush()
        except Exception:
            pass
