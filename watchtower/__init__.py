"""Watchtower - Terminal-based observability for AI agents.

A plug-and-play SDK for tracing agent activity, tool calls, LLM interactions,
and execution history through your terminal.

Now supports multiple AI agent frameworks:
- Google ADK
- Anthropic Claude
- OpenAI GPT
- LangChain (coming soon)
- AutoGen (coming soon)

Example (Google ADK):
    >>> from watchtower import AgentTracePlugin
    >>> from google.adk.agents import Agent
    >>> from google.adk.runners import InMemoryRunner
    >>>
    >>> agent = Agent(name="my_agent", ...)
    >>> runner = InMemoryRunner(
    ...     agent=agent,
    ...     plugins=[AgentTracePlugin()]
    ... )

Example (Anthropic):
    >>> from watchtower.sdk import create_for_anthropic
    >>>
    >>> observer = create_for_anthropic(api_key="your-key")
    >>> response = observer.observe_llm_call([
    ...     {"role": "user", "content": "Hello!"}
    ... ])

Example (OpenAI):
    >>> from watchtower.sdk import create_for_openai
    >>>
    >>> observer = create_for_openai(api_key="your-key")
    >>> response = observer.observe_llm_call([
    ...     {"role": "user", "content": "Hello!"}
    ... ])

Example (Auto-detect framework):
    >>> from watchtower.sdk import Watchtower
    >>>
    >>> observer = Watchtower.create_observer()
    >>> # Automatically detects and uses the appropriate framework

Logging:
    Watchtower uses Python's logging module. Configure it as needed:
    >>> import logging
    >>> logging.getLogger("watchtower").setLevel(logging.DEBUG)

By default, watchtower logs warnings and errors to stderr.
"""

import logging

# Original exports (for backward compatibility)
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
    WatchtowerValidationError,
    WatchtowerTimeoutError,
)

# New unified SDK exports
from watchtower.sdk import (
    Watchtower,
    create_for_anthropic,
    create_for_openai,
    create_for_google_adk,
)
from watchtower.core.interface import AgentFramework, AgentObserver

__version__ = "0.1.0"

# Configure watchtower logger
logger = logging.getLogger("watchtower")

# Set up a handler if none exists (prevents "No handler found" warnings)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(name)s: %(levelname)s: %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.WARNING)  # Default to WARNING level

__all__ = [
    # Unified SDK
    "Watchtower",
    "create_for_anthropic",
    "create_for_openai",
    "create_for_google_adk",
    "AgentFramework",
    "AgentObserver",
    # Backward compatibility
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
    "WatchtowerValidationError",
    "WatchtowerTimeoutError",
]
