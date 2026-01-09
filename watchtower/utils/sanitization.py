"""Utilities for sanitizing sensitive data in trace events."""

import re
from typing import Dict, Any, List

# Patterns to match sensitive argument names
SENSITIVE_KEY_PATTERNS = [
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

# Patterns to match sensitive values (e.g., API keys, tokens in string values)
SENSITIVE_VALUE_PATTERNS = [
    r"^sk-[a-zA-Z0-9]{20,}$",  # OpenAI API keys
    r"^AIza[a-zA-Z0-9_-]{35}$",  # Google API keys
    r"^ghp_[a-zA-Z0-9]{36}$",  # GitHub personal access tokens
    r"^gho_[a-zA-Z0-9]{36}$",  # GitHub OAuth tokens
    r"^xox[baprs]-[a-zA-Z0-9-]+$",  # Slack tokens
    r"^Bearer\s+[a-zA-Z0-9._-]+$",  # Bearer tokens
    r"^Basic\s+[a-zA-Z0-9+/=]+$",  # Basic auth
]

# Pre-compiled regex patterns for performance (50-100x faster)
# Key patterns use case-insensitive matching
SENSITIVE_KEY_PATTERNS_COMPILED = [
    re.compile(pattern, re.IGNORECASE) for pattern in SENSITIVE_KEY_PATTERNS
]
# Value patterns are case-sensitive (exact format matching)
SENSITIVE_VALUE_PATTERNS_COMPILED = [re.compile(pattern) for pattern in SENSITIVE_VALUE_PATTERNS]

# Backward compatibility alias
SENSITIVE_PATTERNS = SENSITIVE_KEY_PATTERNS


def sanitize_args(args: Dict[str, Any]) -> Dict[str, Any]:
    """Replace sensitive values with [REDACTED].

    Checks both keys (by name pattern) and values (by content pattern)
    to catch credentials that may be stored under non-standard key names.

    Args:
        args: Dictionary of arguments to sanitize

    Returns:
        New dictionary with sensitive values redacted
    """
    if not isinstance(args, dict):
        return args

    sanitized: Dict[str, Any] = {}

    for key, value in args.items():
        if _is_sensitive_key(key):
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, str) and _is_sensitive_value(value):
            # Check string values for known credential patterns
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_args(value)
        elif isinstance(value, list):
            sanitized[key] = _sanitize_list(value)
        else:
            sanitized[key] = value

    return sanitized


def _sanitize_list(items: List[Any]) -> List[Any]:
    """Sanitize items in a list.

    Args:
        items: List of items to sanitize

    Returns:
        New list with sensitive values redacted
    """
    result: List[Any] = []
    for item in items:
        if isinstance(item, dict):
            result.append(sanitize_args(item))
        elif isinstance(item, str) and _is_sensitive_value(item):
            result.append("[REDACTED]")
        elif isinstance(item, list):
            result.append(_sanitize_list(item))
        else:
            result.append(item)
    return result


def _is_sensitive_key(key: str) -> bool:
    """Check if a key name matches sensitive patterns.

    Uses pre-compiled regex patterns for performance.

    Args:
        key: Key name to check

    Returns:
        True if key appears to contain sensitive data
    """
    # Pre-compiled patterns already have IGNORECASE flag
    return any(pattern.search(key) for pattern in SENSITIVE_KEY_PATTERNS_COMPILED)


def _is_sensitive_value(value: str) -> bool:
    """Check if a string value matches known sensitive value patterns.

    Uses pre-compiled regex patterns for performance.

    Args:
        value: String value to check

    Returns:
        True if value appears to be a sensitive credential or token
    """
    if not isinstance(value, str) or len(value) < 10:
        return False
    return any(pattern.match(value) for pattern in SENSITIVE_VALUE_PATTERNS_COMPILED)


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
