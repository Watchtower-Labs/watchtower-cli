"""Main plugin implementation for Google ADK observability."""

import logging
import os
import time
import uuid
from typing import Optional, List, Any, Dict

logger = logging.getLogger("watchtower")

try:
    from google.adk.plugins.base_plugin import BasePlugin
    from google.adk.agents.invocation_context import InvocationContext
    from google.adk.agents.callback_context import CallbackContext
    from google.adk.models import LlmRequest, LlmResponse
    from google.adk.tools.base_tool import BaseTool
    from google.adk.tools.tool_context import ToolContext
    from google.adk.events import Event

    HAS_ADK = True
except ImportError:
    # Allow import without ADK for development/testing
    HAS_ADK = False

    class BasePlugin:  # type: ignore[no-redef]
        """Mock BasePlugin for development without ADK."""

        def __init__(self, name: str = "") -> None:
            self.name = name

    InvocationContext = Any  # type: ignore[misc,assignment]
    CallbackContext = Any  # type: ignore[misc,assignment]
    LlmRequest = Any  # type: ignore[misc,assignment]
    LlmResponse = Any  # type: ignore[misc,assignment]
    BaseTool = Any  # type: ignore[misc,assignment]
    ToolContext = Any  # type: ignore[misc,assignment]
    Event = Any  # type: ignore[misc,assignment]

from watchtower.collector import EventCollector
from watchtower.writers.file_writer import FileWriter
from watchtower.writers.stdout_writer import StdoutWriter
from watchtower.utils.sanitization import sanitize_args, truncate_response
from watchtower.exceptions import (
    WatchtowerError,
    WatchtowerWriteError,
    WatchtowerExtractionError,
)


class AgentTracePlugin(BasePlugin):
    """Observability plugin for Google ADK that captures all agent activity.

    This plugin hooks into all ADK lifecycle events and emits structured
    trace events to file and/or stdout for real-time monitoring and debugging.

    Example:
        >>> from watchtower import AgentTracePlugin
        >>> plugin = AgentTracePlugin()
        >>> runner = InMemoryRunner(agent=agent, plugins=[plugin])
    """

    def __init__(
        self,
        trace_dir: str = "~/.watchtower/traces",
        enable_file: bool = True,
        enable_stdout: bool = False,
        run_id: Optional[str] = None,
        sanitize: bool = True,
        debug: bool = False,
    ):
        """Initialize the trace plugin.

        Args:
            trace_dir: Directory to store trace files
            enable_file: Whether to write traces to files
            enable_stdout: Whether to emit events to stdout (for live tailing)
            run_id: Custom run ID (auto-generated if None)
            sanitize: Whether to sanitize sensitive data from arguments
            debug: Whether to raise exceptions instead of catching them.
                   Can also be enabled via WATCHTOWER_DEBUG=1 environment variable.
        """
        super().__init__(name="watchtower")

        self.collector = EventCollector()
        self.sanitize = sanitize

        # Debug mode: re-raise exceptions instead of silently catching
        self.debug = debug or os.environ.get("WATCHTOWER_DEBUG", "").lower() in (
            "1",
            "true",
            "yes",
        )

        # Initialize writers
        self.file_writer = FileWriter(trace_dir) if enable_file else None
        self.stdout_writer = StdoutWriter() if enable_stdout else None

        # Generate or use provided run ID
        self.run_id = run_id or self._generate_run_id()

        # Track timing
        self._invocation_start: float = 0

    def _generate_run_id(self) -> str:
        """Generate a unique run ID.

        Returns:
            8-character unique identifier
        """
        # Check if CLI provided a run ID via environment
        if os.environ.get("WATCHTOWER_RUN_ID"):
            return os.environ["WATCHTOWER_RUN_ID"]

        return str(uuid.uuid4())[:8]

    # === Lifecycle Hooks ===

    async def before_run_callback(
        self,
        *,
        invocation_context: InvocationContext,
    ) -> Optional[Event]:
        """Hook called before agent run begins.

        Args:
            invocation_context: ADK invocation context

        Returns:
            Optional event (None for this plugin)
        """
        try:
            self._invocation_start = time.perf_counter()

            event = self.collector.create_event(
                type="run.start",
                run_id=self.run_id,
                invocation_id=getattr(invocation_context, "invocation_id", "unknown"),
                agent_name=getattr(invocation_context.agent, "name", "unknown"),
                timestamp=time.time(),
            )

            self._emit(event)
        except Exception as e:
            self._log_internal_error("before_run_callback", e)

        return None

    async def after_run_callback(
        self,
        *,
        invocation_context: InvocationContext,
    ) -> None:
        """Hook called after agent run completes.

        Args:
            invocation_context: ADK invocation context
        """
        try:
            duration = time.perf_counter() - self._invocation_start

            event = self.collector.create_event(
                type="run.end",
                run_id=self.run_id,
                invocation_id=getattr(invocation_context, "invocation_id", "unknown"),
                duration_ms=duration * 1000,
                summary=self.collector.get_summary(),
                timestamp=time.time(),
            )

            self._emit(event)
            self._flush()

            # Reset collector for next run
            self.collector.reset()
        except Exception as e:
            self._log_internal_error("after_run_callback", e)

    # === LLM Hooks ===

    async def before_model_callback(
        self,
        *,
        callback_context: CallbackContext,
        llm_request: LlmRequest,
    ) -> Optional[LlmResponse]:
        """Hook called before LLM call.

        Args:
            callback_context: ADK callback context
            llm_request: LLM request object

        Returns:
            Optional LLM response (None for this plugin)
        """
        try:
            callback_context.state["_llm_start"] = time.perf_counter()
            callback_context.state["_llm_request_id"] = str(uuid.uuid4())[:8]

            event = self.collector.create_event(
                type="llm.request",
                run_id=self.run_id,
                request_id=callback_context.state["_llm_request_id"],
                model=self._extract_model(llm_request),
                message_count=(
                    len(llm_request.contents)
                    if hasattr(llm_request, "contents") and llm_request.contents
                    else 0
                ),
                tools_available=self._extract_tool_names(llm_request),
                timestamp=time.time(),
            )

            self._emit(event)
        except Exception as e:
            self._log_internal_error("before_model_callback", e)

        return None

    async def after_model_callback(
        self,
        *,
        callback_context: CallbackContext,
        llm_response: LlmResponse,
    ) -> Optional[LlmResponse]:
        """Hook called after LLM response received.

        Args:
            callback_context: ADK callback context
            llm_response: LLM response object

        Returns:
            Optional LLM response (None for this plugin)
        """
        try:
            duration = time.perf_counter() - callback_context.state.get("_llm_start", 0)

            input_tokens = self._safe_token_count(llm_response, "input")
            output_tokens = self._safe_token_count(llm_response, "output")
            total_tokens = self._safe_token_count(llm_response, "total")

            # Track for summary statistics
            self.collector.track_llm_call(total_tokens)

            event = self.collector.create_event(
                type="llm.response",
                run_id=self.run_id,
                request_id=callback_context.state.get("_llm_request_id", "unknown"),
                duration_ms=duration * 1000,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                has_tool_calls=self._has_tool_calls(llm_response),
                finish_reason=self._extract_finish_reason(llm_response),
                timestamp=time.time(),
            )

            self._emit(event)
        except Exception as e:
            self._log_internal_error("after_model_callback", e)

        return None

    # === Tool Hooks ===

    async def before_tool_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict,
        tool_context: ToolContext,
    ) -> Optional[dict]:
        """Hook called before tool execution.

        Args:
            tool: Tool being executed
            tool_args: Tool arguments
            tool_context: Tool context

        Returns:
            Optional modified arguments (None for this plugin)
        """
        try:
            tool_context.state["_tool_start"] = time.perf_counter()
            tool_context.state["_tool_call_id"] = (
                getattr(tool_context, "function_call_id", None) or str(uuid.uuid4())[:8]
            )

            # Track for summary
            tool_name = getattr(tool, "name", "unknown")
            self.collector.track_tool_call(tool_name)

            event = self.collector.create_event(
                type="tool.start",
                run_id=self.run_id,
                tool_call_id=tool_context.state["_tool_call_id"],
                tool_name=tool_name,
                tool_args=sanitize_args(tool_args) if self.sanitize else tool_args,
                agent_name=getattr(tool_context, "agent_name", "unknown"),
                timestamp=time.time(),
            )

            self._emit(event)
        except Exception as e:
            self._log_internal_error("before_tool_callback", e)

        return None

    async def after_tool_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict,
        tool_context: ToolContext,
        result: dict,
    ) -> Optional[dict]:
        """Hook called after tool execution completes.

        Args:
            tool: Tool that was executed
            tool_args: Tool arguments
            tool_context: Tool context
            result: Tool result (renamed from tool_response in ADK API)

        Returns:
            Optional modified response (None for this plugin)
        """
        try:
            duration = time.perf_counter() - tool_context.state.get("_tool_start", 0)

            event = self.collector.create_event(
                type="tool.end",
                run_id=self.run_id,
                tool_call_id=tool_context.state.get("_tool_call_id", "unknown"),
                tool_name=getattr(tool, "name", "unknown"),
                duration_ms=duration * 1000,
                response_preview=truncate_response(result),
                success=True,
                timestamp=time.time(),
            )

            self._emit(event)
        except Exception as e:
            self._log_internal_error("after_tool_callback", e)

        return None

    async def on_tool_error_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict,
        tool_context: ToolContext,
        error: Exception,
    ) -> Optional[dict]:
        """Hook called when tool execution fails.

        Args:
            tool: Tool that failed
            tool_args: Tool arguments
            tool_context: Tool context
            error: Exception that occurred

        Returns:
            Optional error recovery response (None for this plugin)
        """
        try:
            # Track error
            self.collector.track_error()

            event = self.collector.create_event(
                type="tool.error",
                run_id=self.run_id,
                tool_call_id=tool_context.state.get("_tool_call_id", "unknown"),
                tool_name=getattr(tool, "name", "unknown"),
                error_type=type(error).__name__,
                error_message=str(error),
                timestamp=time.time(),
            )

            self._emit(event)
        except Exception as e:
            self._log_internal_error("on_tool_error_callback", e)

        return None

    # === Event Hooks ===

    async def on_event_callback(
        self,
        *,
        invocation_context: InvocationContext,
        event: Event,
    ) -> Optional[Event]:
        """Hook called when ADK events occur.

        Args:
            invocation_context: ADK invocation context
            event: ADK event

        Returns:
            Optional modified event (None for this plugin)
        """
        try:
            # Capture state changes from ADK events
            if (
                hasattr(event, "actions")
                and event.actions
                and hasattr(event.actions, "state_delta")
                and event.actions.state_delta
            ):
                trace_event = self.collector.create_event(
                    type="state.change",
                    run_id=self.run_id,
                    author=getattr(event, "author", "unknown"),
                    state_delta=dict(event.actions.state_delta),
                    timestamp=time.time(),
                )
                self._emit(trace_event)
        except Exception as e:
            self._log_internal_error("on_event_callback", e)

        return None

    # === Internal Helper Methods ===

    def _emit(self, event: Dict[str, Any]) -> None:
        """Emit event to all enabled writers.

        Args:
            event: Event dictionary to emit
        """
        if self.file_writer:
            try:
                self.file_writer.write(event)
            except Exception as e:
                self._log_internal_error(
                    "_emit",
                    WatchtowerWriteError(str(e), writer_type="file"),
                )

        if self.stdout_writer:
            try:
                self.stdout_writer.write(event)
            except Exception as e:
                self._log_internal_error(
                    "_emit",
                    WatchtowerWriteError(str(e), writer_type="stdout"),
                )

    def _flush(self) -> None:
        """Flush all writers at end of run."""
        if self.file_writer:
            try:
                self.file_writer.flush()
            except Exception as e:
                self._log_internal_error(
                    "_flush",
                    WatchtowerWriteError(str(e), writer_type="file"),
                )

        if self.stdout_writer:
            try:
                self.stdout_writer.flush()
            except Exception as e:
                self._log_internal_error(
                    "_flush",
                    WatchtowerWriteError(str(e), writer_type="stdout"),
                )

    def _extract_model(self, llm_request: LlmRequest) -> str:
        """Extract model name from LLM request.

        Args:
            llm_request: LLM request object

        Returns:
            Model name or "unknown"
        """
        try:
            if hasattr(llm_request, "model"):
                return str(llm_request.model)
            return "unknown"
        except Exception:
            return "unknown"

    def _extract_tool_names(self, llm_request: LlmRequest) -> List[str]:
        """Extract available tool names from LLM request.

        Args:
            llm_request: LLM request object

        Returns:
            List of tool names
        """
        try:
            if hasattr(llm_request, "tools") and llm_request.tools:
                return [getattr(tool, "name", "unknown") for tool in llm_request.tools]
            return []
        except Exception:
            return []

    def _safe_token_count(self, llm_response: LlmResponse, token_type: str) -> int:
        """Safely extract token count from LLM response.

        Args:
            llm_response: LLM response object
            token_type: Type of tokens ("input", "output", or "total")

        Returns:
            Token count or 0
        """
        try:
            if hasattr(llm_response, "usage"):
                usage = llm_response.usage
                if token_type == "input":
                    return getattr(usage, "input_tokens", 0) or getattr(usage, "prompt_tokens", 0)
                elif token_type == "output":
                    return getattr(usage, "output_tokens", 0) or getattr(
                        usage, "completion_tokens", 0
                    )
                elif token_type == "total":
                    return getattr(usage, "total_tokens", 0)
            return 0
        except Exception:
            return 0

    def _has_tool_calls(self, llm_response: LlmResponse) -> bool:
        """Check if LLM response contains tool calls.

        Args:
            llm_response: LLM response object

        Returns:
            True if response has tool calls
        """
        try:
            if hasattr(llm_response, "tool_calls"):
                return bool(llm_response.tool_calls)
            if hasattr(llm_response, "function_call"):
                return llm_response.function_call is not None
            return False
        except Exception:
            return False

    def _extract_finish_reason(self, llm_response: LlmResponse) -> str:
        """Extract finish reason from LLM response.

        Args:
            llm_response: LLM response object

        Returns:
            Finish reason or "unknown"
        """
        try:
            if hasattr(llm_response, "finish_reason"):
                return str(llm_response.finish_reason)
            return "unknown"
        except Exception:
            return "unknown"

    def _log_internal_error(self, context: str, error: Exception) -> None:
        """Log internal plugin errors without crashing the agent.

        In normal mode, errors are logged and swallowed.
        In debug mode (WATCHTOWER_DEBUG=1), errors are re-raised after logging.

        Args:
            context: Context where error occurred
            error: Exception that occurred

        Raises:
            WatchtowerError: In debug mode, wraps and re-raises the original error.
        """
        logger.warning("Plugin error in %s: %s", context, error)

        # In debug mode, re-raise the error for debugging
        if self.debug:
            if isinstance(error, WatchtowerError):
                raise error
            raise WatchtowerError(f"Error in {context}: {error}") from error
