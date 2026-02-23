"""JSON serialization utilities for Watchtower.

Provides a custom JSON encoder with explicit type handling to avoid
silent string conversion of unknown types.
"""

import json
import logging
from datetime import datetime, date
from pathlib import Path
from uuid import UUID
from typing import Any

logger = logging.getLogger("watchtower")


class WatchtowerJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder with explicit type handling.

    Instead of silently converting unknown types to strings, this encoder:
    1. Explicitly handles common types (datetime, Path, UUID, etc.)
    2. Logs a warning for unknown types before converting to string
    3. Can be configured to raise an error for unknown types

    Example:
        >>> import json
        >>> from datetime import datetime
        >>> data = {"time": datetime.now(), "path": Path("/tmp")}
        >>> json.dumps(data, cls=WatchtowerJSONEncoder)
        '{"time": "2024-01-15T10:30:00", "path": "/tmp"}'
    """

    def __init__(self, *args: Any, strict: bool = False, **kwargs: Any) -> None:
        """Initialize encoder.

        Args:
            strict: If True, raise TypeError for unknown types instead of
                   converting to string. Default False for backwards compat.
            *args: Passed to json.JSONEncoder
            **kwargs: Passed to json.JSONEncoder
        """
        super().__init__(*args, **kwargs)
        self.strict = strict
        self._warned_types: set[str] = set()

    def default(self, obj: Any) -> Any:
        """Convert non-standard types to JSON-serializable values.

        Args:
            obj: Object to serialize

        Returns:
            JSON-serializable representation

        Raises:
            TypeError: In strict mode, for unknown types
        """
        # Datetime types
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()

        # Path objects
        if isinstance(obj, Path):
            return str(obj)

        # UUID objects
        if isinstance(obj, UUID):
            return str(obj)

        # Bytes - decode with replacement for invalid chars
        if isinstance(obj, bytes):
            return obj.decode("utf-8", errors="replace")

        # Sets/frozensets - convert to list
        if isinstance(obj, (set, frozenset)):
            return list(obj)

        # Objects with custom __dict__
        if hasattr(obj, "__dict__"):
            type_name = type(obj).__name__
            self._warn_unknown_type(type_name)
            return {"__type__": type_name, **obj.__dict__}

        # Unknown type - warn and convert to string
        type_name = type(obj).__name__
        self._warn_unknown_type(type_name)

        if self.strict:
            raise TypeError(
                f"Object of type {type_name} is not JSON serializable. "
                "Use default=str or add explicit handling for this type."
            )

        return str(obj)

    def _warn_unknown_type(self, type_name: str) -> None:
        """Log a warning for unknown type (once per type).

        Args:
            type_name: Name of the type that couldn't be serialized
        """
        if type_name not in self._warned_types:
            self._warned_types.add(type_name)
            logger.warning(
                "Serializing unknown type '%s' as string. Consider adding explicit handling.",
                type_name,
            )


def json_dumps(obj: Any, **kwargs: Any) -> str:
    """Serialize object to JSON using WatchtowerJSONEncoder.

    Convenience function that uses the custom encoder by default.

    Args:
        obj: Object to serialize
        **kwargs: Passed to json.dumps (except 'cls' and 'default')

    Returns:
        JSON string
    """
    # Remove 'default' if provided - we use our encoder instead
    kwargs.pop("default", None)
    kwargs.pop("cls", None)
    return json.dumps(obj, cls=WatchtowerJSONEncoder, **kwargs)


def json_dumps_compact(obj: Any) -> str:
    """Serialize object to compact JSON (no whitespace).

    Args:
        obj: Object to serialize

    Returns:
        Compact JSON string
    """
    return json.dumps(obj, cls=WatchtowerJSONEncoder, separators=(",", ":"))
