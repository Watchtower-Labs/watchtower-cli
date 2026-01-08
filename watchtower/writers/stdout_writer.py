"""Stdout writer for streaming trace events in real-time."""

import logging
import sys
import json
from typing import TextIO, Dict, Any, Optional

logger = logging.getLogger("watchtower")


class StdoutWriter:
    """Emits events as NDJSON (newline-delimited JSON) to stdout.

    Used for live tailing when CLI spawns the Python process.
    Format follows JSON-RPC 2.0 notification structure for extensibility.

    Output format:
    {"jsonrpc":"2.0","method":"<event.type>","params":{...event}}
    """

    def __init__(self, stream: Optional[TextIO] = None):
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
            except (AttributeError, OSError) as e:
                # Some streams don't support reconfigure (e.g., pipes, StringIO)
                # This is expected behavior, not an error
                logger.debug("Could not enable line buffering on stream: %s", e)

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
            logger.warning("Failed to write event to stdout: %s", e)

    def flush(self) -> None:
        """Explicit flush (usually no-op due to line buffering)."""
        try:
            self._stream.flush()
        except OSError as e:
            # Log flush failures (stream may be closed or broken pipe)
            logger.warning("Failed to flush stdout stream: %s", e)
