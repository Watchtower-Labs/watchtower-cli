"""
Validation utilities for watchtower configuration.

Provides validation for environment variables, run IDs, and trace directories
to prevent injection attacks and ensure system security.
"""

import re
import os
from typing import Optional

# Run ID validation pattern: alphanumeric, hyphens, underscores, max 32 chars
RUN_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{1,32}$')


def validate_run_id(run_id: str) -> bool:
    """
    Validate a run ID to prevent injection attacks.

    Run IDs must be:
    - Alphanumeric characters, hyphens, and underscores only
    - 1 to 32 characters in length
    - No special characters or spaces

    Args:
        run_id: The run ID to validate

    Returns:
        True if valid, False otherwise

    Examples:
        >>> validate_run_id('abc123')
        True
        >>> validate_run_id('test-run_42')
        True
        >>> validate_run_id('run; rm -rf /')
        False
        >>> validate_run_id('../../etc/passwd')
        False
    """
    return bool(RUN_ID_PATTERN.match(run_id))


def sanitize_run_id(run_id: str) -> Optional[str]:
    """
    Sanitize a run ID by removing invalid characters.

    If the sanitized ID is empty, returns None.

    Args:
        run_id: The run ID to sanitize

    Returns:
        Sanitized run ID or None if empty after sanitization

    Examples:
        >>> sanitize_run_id('test;run')
        'testrun'
        >>> sanitize_run_id('valid_123')
        'valid_123'
        >>> sanitize_run_id(';')
        None
    """
    # Remove any characters that don't match the valid pattern
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', run_id)

    # Truncate to max length
    sanitized = sanitized[:32]

    return sanitized if sanitized else None


def validate_trace_dir(trace_dir: str, base_dir: str) -> bool:
    """
    Validate a trace directory path to prevent directory traversal attacks.

    Ensures that the trace directory is within the allowed base directory
    and doesn't attempt to escape the sandbox.

    Args:
        trace_dir: The trace directory path to validate
        base_dir: The base directory that traces must be within

    Returns:
        True if valid, False otherwise

    Examples:
        >>> validate_trace_dir('/tmp/watchtower', '/tmp')
        True
        >>> validate_trace_dir('/tmp/watchtower/traces', '/tmp')
        True
        >>> validate_trace_dir('/tmp/watchtower/../../etc', '/tmp')
        False
        >>> validate_trace_dir('~/watchtower', '/tmp')
        False
    """
    try:
        # Resolve to absolute path to prevent symlinks
        abs_trace_dir = os.path.realpath(trace_dir)
        abs_base_dir = os.path.realpath(base_dir)

        # Check that trace dir is within base dir
        # Normalize paths to ensure consistent comparison
        abs_trace_dir = os.path.normpath(abs_trace_dir)
        abs_base_dir = os.path.normpath(abs_base_dir)

        # Check for directory traversal using path prefix
        # Note: This is a simple check; a production system might use
        # additional security measures like chroot or containerization
        if not abs_trace_dir.startswith(abs_base_dir):
            return False

        return True
    except (OSError, ValueError):
        return False


def validate_python_version(python_version: str) -> bool:
    """
    Validate a Python version string.

    Accepts formats like:
    - python3
    - python3.9
    - python3.11
    - python3.12

    Args:
        python_version: The Python version string to validate

    Returns:
        True if valid, False otherwise

    Examples:
        >>> validate_python_version('python3')
        True
        >>> validate_python_version('python3.11')
        True
        >>> validate_python_version('python2.7')
        False
        >>> validate_python_version('/bin/sh')
        False
    """
    pattern = re.compile(r'^python3(?:\.\d+)?$')
    return bool(pattern.match(python_version))


def validate_environment_variables() -> tuple[list[str], bool]:
    """
    Validate all watchtower environment variables.

    Returns:
        A tuple of (errors, is_valid) where errors is a list of
        validation error messages and is_valid is True if all validations pass

    Examples:
        >>> errors, is_valid = validate_environment_variables()
        >>> if not is_valid:
        ...     for error in errors:
        ...         print(f"Error: {error}")
    """
    errors: list[str] = []

    # Validate WATCHTOWER_RUN_ID if present
    run_id = os.environ.get('WATCHTOWER_RUN_ID')
    if run_id and not validate_run_id(run_id):
        errors.append(
            f'Invalid WATCHTOWER_RUN_ID: {run_id}. '
            f'Must be alphanumeric, hyphens, underscores only, max 32 chars.'
        )

    # Validate WATCHTOWER_TRACE_DIR if present — must be within home directory
    trace_dir = os.environ.get('WATCHTOWER_TRACE_DIR')
    if trace_dir:
        base_dir = os.path.expanduser('~')
        if not validate_trace_dir(trace_dir, base_dir):
            errors.append(
                f'Invalid WATCHTOWER_TRACE_DIR: {trace_dir}. '
                f'Must be within the home directory: {base_dir}'
            )

    # Validate WATCHTOWER_DEFAULT_PYTHON if present
    default_python = os.environ.get('WATCHTOWER_DEFAULT_PYTHON')
    if default_python and not validate_python_version(default_python):
        errors.append(
            f'Invalid WATCHTOWER_DEFAULT_PYTHON: {default_python}. '
            f'Must be python3 or python3.x (e.g. python3.11).'
        )

    return errors, len(errors) == 0
