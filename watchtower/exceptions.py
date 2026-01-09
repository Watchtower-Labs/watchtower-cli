"""Exception hierarchy for Watchtower.

This module defines custom exceptions that provide more context
about errors during trace capture. When debug mode is enabled,
these exceptions are raised instead of being silently caught.
"""


class WatchtowerError(Exception):
    """Base exception for all Watchtower errors.

    All Watchtower-specific exceptions inherit from this class,
    making it easy to catch any Watchtower error with a single except clause.
    """

    pass


class WatchtowerWriteError(WatchtowerError):
    """Raised when writing trace events fails.

    This can occur due to:
    - File system permission issues
    - Disk full conditions
    - Invalid file paths
    - Stdout write failures
    """

    def __init__(self, message: str, writer_type: str = "unknown"):
        self.writer_type = writer_type
        super().__init__(f"{writer_type} writer error: {message}")


class WatchtowerSerializationError(WatchtowerError):
    """Raised when event serialization fails.

    This typically occurs when:
    - Event contains non-serializable objects
    - Circular references in event data
    - Encoding issues with string data
    """

    def __init__(self, message: str, event_type: str = "unknown"):
        self.event_type = event_type
        super().__init__(f"Failed to serialize {event_type} event: {message}")


class WatchtowerExtractionError(WatchtowerError):
    """Raised when extracting data from ADK objects fails.

    This can occur when:
    - ADK API changes unexpectedly
    - Objects are missing expected attributes
    - Type mismatches in ADK responses
    """

    def __init__(self, message: str, source: str = "unknown"):
        self.source = source
        super().__init__(f"Failed to extract from {source}: {message}")


class WatchtowerConfigError(WatchtowerError):
    """Raised when plugin configuration is invalid.

    This can occur when:
    - Invalid trace directory path
    - Conflicting configuration options
    - Missing required configuration
    """

    pass
