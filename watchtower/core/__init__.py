"""
Core abstractions for Watchtower observability.

This module provides the base interfaces and types that enable
Watchtower to support multiple AI agent frameworks.
"""

from watchtower.core.interface import (
    AgentFramework,
    AgentObserver,
    LLMEvent,
    ToolEvent,
    StateEvent,
    TransferEvent,
    RunStartEvent,
    RunEndEvent,
    TraceEventType,
)

__all__ = [
    "AgentFramework",
    "AgentObserver",
    "LLMEvent",
    "ToolEvent",
    "StateEvent",
    "TransferEvent",
    "RunStartEvent",
    "RunEndEvent",
    "TraceEventType",
]
