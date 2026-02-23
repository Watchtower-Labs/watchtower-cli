"""
Core abstractions for framework-agnostic agent observability.

This module defines the base interfaces and types that all framework adapters
must implement, enabling Watchtower to support multiple AI agent frameworks.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass, field
import time


class AgentFramework(Enum):
    """Supported AI agent frameworks."""

    GOOGLE_ADK = "google_adk"
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def from_string(cls, value: str) -> "AgentFramework":
        """Parse framework from string value."""
        for framework in cls:
            if framework.value == value:
                return framework
        return cls.UNKNOWN


@dataclass
class LLMEvent:
    """Unified LLM event across all frameworks.

    Represents an LLM API call, capturing request and response details.
    Framework-specific differences are normalized into this common structure.
    """

    framework: AgentFramework
    timestamp: float
    model: str
    request_id: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    tools_available: List[str] = field(default_factory=list)
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    finish_reason: Optional[str] = None
    has_tool_calls: bool = False
    duration_ms: Optional[float] = None
    raw_request: Optional[Any] = None
    raw_response: Optional[Any] = None


@dataclass
class ToolEvent:
    """Unified tool execution event across all frameworks.

    Represents a tool/function call, including arguments, result, and timing.
    """

    framework: AgentFramework
    timestamp: float
    tool_call_id: str
    tool_name: str
    tool_args: Dict[str, Any]
    agent_name: Optional[str] = None
    duration_ms: Optional[float] = None
    response_preview: Optional[str] = None
    response: Optional[Any] = None
    success: bool = True
    error_type: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class StateEvent:
    """Unified agent state change event.

    Represents when the agent's internal state changes.
    """

    framework: AgentFramework
    timestamp: float
    author: str
    state_delta: Dict[str, Any]


@dataclass
class TransferEvent:
    """Unified agent transfer event.

    Represents when control is transferred between agents (in multi-agent systems).
    """

    framework: AgentFramework
    timestamp: float
    from_agent: str
    to_agent: str
    reason: str


@dataclass
class RunStartEvent:
    """Agent run start event."""

    framework: AgentFramework
    timestamp: float
    run_id: str
    invocation_id: str
    agent_name: str


@dataclass
class RunEndEvent:
    """Agent run end event."""

    framework: AgentFramework
    timestamp: float
    run_id: str
    invocation_id: str
    duration_ms: float
    summary: Dict[str, Any]


# Union type for all event types
TraceEventType = Union[
    RunStartEvent,
    RunEndEvent,
    LLMEvent,
    ToolEvent,
    StateEvent,
    TransferEvent,
]


class AgentObserver(ABC):
    """Abstract base class for framework-specific observers.

    Each framework adapter must implement this interface to provide observability
    for that framework's agents.
    """

    def __init__(
        self,
        run_id: Optional[str] = None,
        trace_dir: str = "~/.watchtower/traces",
        enable_file: bool = True,
        enable_stdout: bool = False,
        **kwargs: Any,
    ) -> None:
        """Initialize the observer.

        Args:
            run_id: Custom run ID (auto-generated if None)
            trace_dir: Directory to store trace files
            enable_file: Whether to write traces to files
            enable_stdout: Whether to emit events to stdout
            **kwargs: Framework-specific options
        """
        self.run_id = run_id or self._generate_run_id()
        self.trace_dir = trace_dir
        self.enable_file = enable_file
        self.enable_stdout = enable_stdout
        self.file_writer: Optional[Any] = None
        self.stdout_writer: Optional[Any] = None
        self._init_writers(**kwargs)

    def _generate_run_id(self) -> str:
        """Generate a unique run ID (alphanumeric)."""
        import uuid
        return uuid.uuid4().hex[:8]

    @abstractmethod
    def get_framework(self) -> AgentFramework:
        """Return the framework this observer supports.

        Returns:
            AgentFramework enum value
        """
        pass

    @abstractmethod
    def observe_run_start(
        self,
        context: Any,
    ) -> Optional[RunStartEvent]:
        """Observe agent run start.

        Args:
            context: Framework-specific context object

        Returns:
            RunStartEvent if start observed, None otherwise
        """
        pass

    @abstractmethod
    def observe_llm_call(
        self,
        request: Any,
        response: Optional[Any] = None,
        **kwargs: Any,
    ) -> Any:
        """Observe LLM request/response.

        Args:
            request: Framework-specific LLM request object
            response: Optional framework-specific LLM response object
            **kwargs: Additional framework-specific parameters

        Returns:
            Framework-specific response or event object
        """
        pass

    @abstractmethod
    def observe_tool_call(
        self,
        tool_name: str,
        tool_args: Dict[str, Any],
        result: Optional[Any] = None,
        duration_ms: Optional[float] = None,
        error: Optional[Exception] = None,
        **kwargs: Any,
    ) -> Optional[ToolEvent]:
        """Observe tool execution.

        Args:
            tool_name: Name of the tool called
            tool_args: Arguments passed to the tool
            result: Tool result (if available)
            duration_ms: Execution duration in milliseconds
            error: Error if tool execution failed
            **kwargs: Additional framework-specific parameters

        Returns:
            ToolEvent if tool call observed, None otherwise
        """
        pass

    @abstractmethod
    def observe_run_end(
        self,
        context: Any,
        summary: Optional[Dict[str, Any]] = None,
    ) -> Optional[RunEndEvent]:
        """Observe agent run end.

        Args:
            context: Framework-specific context object
            summary: Optional summary of the run

        Returns:
            RunEndEvent if end observed, None otherwise
        """
        pass

    def _init_writers(self, **kwargs: Any) -> None:
        """Initialize file and stdout writers.

        Subclasses can override this for framework-specific initialization.
        """
        # Import writers here to avoid circular imports
        from watchtower.writers.file_writer import FileWriter
        from watchtower.writers.stdout_writer import StdoutWriter

        self.file_writer = FileWriter(self.trace_dir) if self.enable_file else None
        self.stdout_writer = StdoutWriter() if self.enable_stdout else None

    def _write_event(self, event: TraceEventType) -> None:
        """Write event to file and/or stdout.

        Args:
            event: The event to write
        """
        # Convert to dict for JSON serialization
        event_dict = self._event_to_dict(event)

        # Add framework field
        if hasattr(event, "framework"):
            event_dict["framework"] = event.framework.value
        else:
            event_dict["framework"] = self.get_framework().value

        # Add run_id and timestamp if not present
        if "run_id" not in event_dict:
            event_dict["run_id"] = self.run_id
        if "timestamp" not in event_dict:
            event_dict["timestamp"] = time.time()

        # Write to file
        if self.file_writer:
            self._write_with_compat(self.file_writer, event_dict)

        # Write to stdout
        if self.stdout_writer:
            self._write_with_compat(self.stdout_writer, event_dict)

    def _write_with_compat(self, writer: Any, event: Dict[str, Any]) -> None:
        """Write using canonical writer API, falling back to legacy aliases."""
        write_fn = getattr(writer, "write", None)
        if callable(write_fn):
            write_fn(event)
            return

        legacy_fn = getattr(writer, "write_event", None)
        if callable(legacy_fn):
            legacy_fn(event)
            return

        logger.warning(
            "Writer %r has neither 'write' nor 'write_event' method; event dropped.",
            type(writer).__name__,
        )

    def _event_to_dict(self, event: TraceEventType) -> Dict[str, Any]:
        """Convert event dataclass to dict.

        Args:
            event: Event dataclass

        Returns:
            Dictionary representation of event
        """
        if isinstance(event, RunStartEvent):
            return {
                "type": "run.start",
                "run_id": event.run_id,
                "invocation_id": event.invocation_id,
                "agent_name": event.agent_name,
                "timestamp": event.timestamp,
                "schema_version": "1.0.0",
            }
        elif isinstance(event, RunEndEvent):
            return {
                "type": "run.end",
                "run_id": event.run_id,
                "invocation_id": event.invocation_id,
                "duration_ms": event.duration_ms,
                "summary": event.summary,
                "timestamp": event.timestamp,
            }
        elif isinstance(event, LLMEvent):
            return {
                "type": "llm.response",
                "request_id": event.request_id,
                "model": event.model,
                "input_tokens": event.input_tokens,
                "output_tokens": event.output_tokens,
                "total_tokens": event.total_tokens,
                "tools_available": event.tools_available,
                "has_tool_calls": event.has_tool_calls,
                "finish_reason": event.finish_reason,
                "timestamp": event.timestamp,
            }
        elif isinstance(event, ToolEvent):
            event_type = "tool.start" if event.duration_ms is None else "tool.end"
            if not event.success or event.error_type:
                event_type = "tool.error"
            return {
                "type": event_type,
                "tool_call_id": event.tool_call_id,
                "tool_name": event.tool_name,
                "tool_args": event.tool_args,
                "agent_name": event.agent_name,
                "response_preview": event.response_preview,
                "success": event.success,
                "error_type": event.error_type,
                "error_message": event.error_message,
                "timestamp": event.timestamp,
            }
        elif isinstance(event, StateEvent):
            return {
                "type": "state.change",
                "author": event.author,
                "state_delta": event.state_delta,
                "timestamp": event.timestamp,
            }
        elif isinstance(event, TransferEvent):
            return {
                "type": "agent.transfer",
                "from_agent": event.from_agent,
                "to_agent": event.to_agent,
                "reason": event.reason,
                "timestamp": event.timestamp,
            }
        else:
            return {}
