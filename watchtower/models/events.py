"""Event models for watchtower tracing.

This module defines all event types that can be captured from Google ADK agents.
Each event is a dataclass with type-safe fields and serialization support.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Any, List, Dict
from enum import Enum
import time


class EventType(str, Enum):
    """Enumeration of all event types captured by watchtower."""

    RUN_START = "run.start"
    RUN_END = "run.end"
    LLM_REQUEST = "llm.request"
    LLM_RESPONSE = "llm.response"
    TOOL_START = "tool.start"
    TOOL_END = "tool.end"
    TOOL_ERROR = "tool.error"
    STATE_CHANGE = "state.change"
    AGENT_TRANSFER = "agent.transfer"


@dataclass
class BaseEvent:
    """Base event class with common fields."""

    type: str = ""
    run_id: str = ""
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization."""
        return asdict(self)


@dataclass
class RunStartEvent(BaseEvent):
    """Event emitted when agent invocation begins."""

    type: str = field(default=EventType.RUN_START.value)
    invocation_id: str = ""
    agent_name: str = ""


@dataclass
class RunEndEvent(BaseEvent):
    """Event emitted when agent invocation completes."""

    type: str = field(default=EventType.RUN_END.value)
    duration_ms: float = 0
    summary: Optional[Dict[str, Any]] = None


@dataclass
class LLMRequestEvent(BaseEvent):
    """Event emitted when an LLM call is initiated."""

    type: str = field(default=EventType.LLM_REQUEST.value)
    request_id: str = ""
    model: str = ""
    message_count: int = 0
    tools_available: List[str] = field(default_factory=list)


@dataclass
class LLMResponseEvent(BaseEvent):
    """Event emitted when an LLM response is received."""

    type: str = field(default=EventType.LLM_RESPONSE.value)
    request_id: str = ""
    duration_ms: float = 0
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    has_tool_calls: bool = False
    finish_reason: str = ""


@dataclass
class ToolStartEvent(BaseEvent):
    """Event emitted when tool execution begins."""

    type: str = field(default=EventType.TOOL_START.value)
    tool_call_id: str = ""
    tool_name: str = ""
    tool_args: Dict[str, Any] = field(default_factory=dict)
    agent_name: str = ""


@dataclass
class ToolEndEvent(BaseEvent):
    """Event emitted when tool execution completes successfully."""

    type: str = field(default=EventType.TOOL_END.value)
    tool_call_id: str = ""
    tool_name: str = ""
    duration_ms: float = 0
    response_preview: str = ""
    success: bool = True


@dataclass
class ToolErrorEvent(BaseEvent):
    """Event emitted when tool execution fails."""

    type: str = field(default=EventType.TOOL_ERROR.value)
    tool_call_id: str = ""
    tool_name: str = ""
    error_type: str = ""
    error_message: str = ""


@dataclass
class StateChangeEvent(BaseEvent):
    """Event emitted when session state is modified."""

    type: str = field(default=EventType.STATE_CHANGE.value)
    author: str = ""
    state_delta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentTransferEvent(BaseEvent):
    """Event emitted during multi-agent handoffs."""

    type: str = field(default=EventType.AGENT_TRANSFER.value)
    from_agent: str = ""
    to_agent: str = ""
    reason: str = ""


@dataclass
class RunSummary:
    """Summary statistics for a complete agent run."""

    total_duration_ms: float = 0
    llm_calls: int = 0
    tool_calls: int = 0
    total_tokens: int = 0
    errors: int = 0
    tools_used: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert summary to dictionary."""
        return asdict(self)
