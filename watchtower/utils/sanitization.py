"""Utilities for sanitizing sensitive data in trace events."""

import re
from typing import Dict, Any, List

# Patterns to match sensitive argument names
SENSITIVE_PATTERNS = [
    r"password",
    r"passwd",
    r"pwd",
    r"secret",
    r"token",
    r"api[_-]?key",
    r"apikey",
    r"auth",
    r"credential",
    r"private[_-]?key",
    r"access[_-]?key",
    r"session",
]


def sanitize_args(args: Dict[str, Any]) -> Dict[str, Any]:
    """Replace sensitive values with [REDACTED].

    Args:
        args: Dictionary of arguments to sanitize

    Returns:
        New dictionary with sensitive values redacted
    """
    if not isinstance(args, dict):
        return args

    sanitized = {}

    for key, value in args.items():
        if _is_sensitive_key(key):
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_args(value)
        elif isinstance(value, list):
            sanitized[key] = [sanitize_args(item) if isinstance(item, dict) else item for item in value]
        else:
            sanitized[key] = value

    return sanitized


def _is_sensitive_key(key: str) -> bool:
    """Check if a key name matches sensitive patterns.

    Args:
        key: Key name to check

    Returns:
        True if key appears to contain sensitive data
    """
    key_lower = key.lower()
    return any(re.search(pattern, key_lower) for pattern in SENSITIVE_PATTERNS)


def truncate_response(response: Any, max_length: int = 500) -> str:
    """Truncate a response to a preview string.

    Args:
        response: Response object to truncate
        max_length: Maximum length of preview string

    Returns:
        Truncated string representation
    """
    response_str = str(response)

    if len(response_str) <= max_length:
        return response_str

    return response_str[:max_length] + "..."
