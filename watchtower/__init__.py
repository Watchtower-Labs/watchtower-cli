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
"""

__version__ = "0.1.0"

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
]
