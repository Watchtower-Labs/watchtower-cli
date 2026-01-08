"""Watchtower - Terminal-based observability for Google ADK agents.

A plug-and-use SDK for tracing agent activity, tool calls, LLM interactions,
and execution history through your terminal.

Example:
    >>> from watchtower import AgentTracePlugin
    >>> from google.adk.agents import Agent
    >>> from google.adk.runners import InMemoryRunner
    >>>
    >>> agent = Agent(name="my_agent", ...)
    >>> runner = InMemoryRunner(
    ...     agent=agent,
    ...     plugins=[AgentTracePlugin()]
    ... )

Logging:
    Watchtower uses Python's logging module. Configure it as needed:
    >>> import logging
    >>> logging.getLogger("watchtower").setLevel(logging.DEBUG)

    By default, watchtower logs warnings and errors to stderr.
"""

import logging

__version__ = "0.1.0"

# Configure watchtower logger
logger = logging.getLogger("watchtower")

# Set up a handler if none exists (prevents "No handler found" warnings)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(name)s: %(levelname)s: %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.WARNING)  # Default to WARNING level

from watchtower.plugin import AgentTracePlugin
from watchtower.config import WatchtowerConfig
from watchtower.models.events import (
    EventType,
    BaseEvent,
    RunStartEvent,
    RunEndEvent,
    LLMRequestEvent,
    LLMResponseEvent,
    ToolStartEvent,
    ToolEndEvent,
    ToolErrorEvent,
    StateChangeEvent,
    AgentTransferEvent,
    RunSummary,
)
from watchtower.exceptions import (
    WatchtowerError,
    WatchtowerWriteError,
    WatchtowerSerializationError,
    WatchtowerExtractionError,
    WatchtowerConfigError,
)

__all__ = [
    "AgentTracePlugin",
    "WatchtowerConfig",
    # Event types
    "EventType",
    "BaseEvent",
    "RunStartEvent",
    "RunEndEvent",
    "LLMRequestEvent",
    "LLMResponseEvent",
    "ToolStartEvent",
    "ToolEndEvent",
    "ToolErrorEvent",
    "StateChangeEvent",
    "AgentTransferEvent",
    "RunSummary",
    # Exceptions
    "WatchtowerError",
    "WatchtowerWriteError",
    "WatchtowerSerializationError",
    "WatchtowerExtractionError",
    "WatchtowerConfigError",
]
