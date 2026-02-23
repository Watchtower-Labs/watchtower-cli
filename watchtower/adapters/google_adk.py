"""
Google ADK adapter for Watchtower observability.

Migrates the existing AgentTracePlugin to implement the new
AgentObserver interface, ensuring backward compatibility.
"""

import os
import time
from typing import Optional, List, Dict, Any

from watchtower.core.interface import (
    AgentObserver,
    AgentFramework,
    LLMEvent,
    ToolEvent,
    RunStartEvent,
    RunEndEvent,
)
from watchtower.writers.file_writer import FileWriter
from watchtower.writers.stdout_writer import StdoutWriter
from watchtower.utils.sanitization import Sanitizer
from watchtower.utils.validation import (
    validate_run_id,
    sanitize_run_id,
    validate_environment_variables,
)

logger = __import__("logging").getLogger("watchtower")


class GoogleADKObserver(AgentObserver):
    """Observer for Google ADK agents.

    This is the original AgentTracePlugin migrated to implement the
    AgentObserver interface. It maintains full backward compatibility
    with existing Google ADK setups.
    """

    def __init__(
        self,
        trace_dir: str = "~/.watchtower/traces",
        enable_file: bool = True,
        enable_stdout: bool = False,
        run_id: Optional[str] = None,
        sanitize: bool = True,
        debug: bool = False,
    ) -> None:
        """Initialize the Google ADK observer.

        Args:
            trace_dir: Directory to store trace files
            enable_file: Whether to write traces to files
            enable_stdout: Whether to emit events to stdout
            run_id: Custom run ID (auto-generated if None)
            sanitize: Whether to sanitize sensitive data
            debug: Whether to raise exceptions instead of catching
        """
        # Initialize base
        super().__init__(
            run_id=run_id,
            trace_dir=trace_dir,
            enable_file=enable_file,
            enable_stdout=enable_stdout,
        )

        self.sanitize = sanitize
        self.debug = debug or os.environ.get("WATCHTOWER_DEBUG", "").lower() in (
            "1",
            "true",
            "yes",
        )

        # Validate environment variables
        errors, is_valid = validate_environment_variables()
        if not is_valid:
            logger.warning(
                f"Watchtower environment validation warnings: {errors}. "
                "Proceeding with safe defaults or sanitization."
            )

        # Sanitizer for sensitive data
        self.sanitizer = Sanitizer() if sanitize else None

    def _init_writers(self, **kwargs: Any) -> None:
        """Initialize file and stdout writers."""
        self.file_writer = FileWriter(self.trace_dir) if self.enable_file else None
        self.stdout_writer = StdoutWriter() if self.enable_stdout else None

    @staticmethod
    def _context_get(context: Any, key: str, default: Any = None) -> Any:
        """Get a value from either mapping or object contexts."""
        if isinstance(context, dict):
            return context.get(key, default)
        return getattr(context, key, default)

    def _generate_run_id(self) -> str:
        """Generate or validate a run ID."""
        env_run_id = os.environ.get("WATCHTOWER_RUN_ID")
        if env_run_id:
            if validate_run_id(env_run_id):
                return env_run_id

            logger.warning(
                f"Invalid WATCHTOWER_RUN_ID: {env_run_id}. "
                "Sanitizing to prevent injection attacks."
            )
            sanitized = sanitize_run_id(env_run_id)
            if sanitized:
                return sanitized

            logger.warning("Sanitization failed, generating new run ID")

        # Generate new run ID
        import uuid
        return str(uuid.uuid4())[:8]

    def get_framework(self) -> AgentFramework:
        """Return Google ADK as the framework."""
        return AgentFramework.GOOGLE_ADK

    def observe_run_start(
        self,
        context: Any,
    ) -> Optional[RunStartEvent]:
        """Observe agent run start (Google ADK before_run_callback)."""
        try:
            # Extract agent name and invocation ID from context
            agent_name = self._context_get(context, "agent_name", "")
            if not agent_name:
                agent = self._context_get(context, "agent", None)
                agent_name = getattr(agent, "name", "unknown") if agent else "unknown"
            invocation_id = self._context_get(context, "invocation_id", "")

            event = RunStartEvent(
                framework=self.get_framework(),
                timestamp=time.time(),
                run_id=self.run_id,
                invocation_id=invocation_id,
                agent_name=agent_name,
            )

            self._write_event(event)
            return event

        except Exception as e:
            if self.debug:
                raise
            logger.debug(f"Error observing run start: {e}")
            return None

    def observe_llm_call(
        self,
        request: Any,
        response: Optional[Any] = None,
        **kwargs: Any,
    ) -> Optional[LLMEvent]:
        """Observe LLM request/response (Google ADK before_model_callback)."""
        try:
            if response is None:
                return None

            request_id = getattr(request, "id", "")
            model = self._extract_model(request)
            tools = self._extract_tool_names(request)

            # Extract token counts
            total_tokens = self._safe_token_count(response, "total")
            input_tokens = self._safe_token_count(response, "input")
            output_tokens = self._safe_token_count(response, "output")

            # Calculate duration if timestamps available
            duration_ms = None
            if hasattr(request, "request_timestamp") and hasattr(
                response, "response_timestamp"
            ):
                duration_ms = (
                    response.response_timestamp - request.request_timestamp
                ) * 1000

            # Check for tool calls
            has_tool_calls = self._has_tool_calls(response)
            tool_calls = self._extract_tool_calls(response) if has_tool_calls else []

            event = LLMEvent(
                framework=self.get_framework(),
                timestamp=time.time(),
                request_id=request_id,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                tools_available=tools,
                has_tool_calls=has_tool_calls,
                tool_calls=tool_calls,
                finish_reason=self._extract_finish_reason(response),
                duration_ms=duration_ms,
                raw_request=request,
                raw_response=response,
            )

            self._write_event(event)
            return event

        except Exception as e:
            if self.debug:
                raise
            logger.debug(f"Error observing LLM call: {e}")
            return None

    def observe_tool_call(
        self,
        tool_name: str,
        tool_args: Dict[str, Any],
        result: Optional[Any] = None,
        duration_ms: Optional[float] = None,
        error: Optional[Exception] = None,
        **kwargs: Any,
    ) -> Optional[ToolEvent]:
        """Observe tool execution (Google ADK tool callbacks)."""
        try:
            tool_call_id = kwargs.get("tool_call_id", "")
            agent_name = kwargs.get("agent_name", None)

            # Sanitize tool arguments if enabled
            args_to_write = tool_args
            if self.sanitizer:
                args_to_write = self.sanitizer.sanitize_dict(tool_args)

            # Sanitize result if present
            response_preview = None
            if result is not None and self.sanitizer:
                response_preview = self.sanitizer.sanitize_value(str(result))[:200]

            success = error is None
            error_type = None
            error_message = None

            if error:
                success = False
                error_type = type(error).__name__
                error_message = str(error)

            event = ToolEvent(
                framework=self.get_framework(),
                timestamp=time.time(),
                tool_call_id=tool_call_id,
                tool_name=tool_name,
                tool_args=args_to_write,
                agent_name=agent_name,
                duration_ms=duration_ms,
                response_preview=response_preview,
                response=result,
                success=success,
                error_type=error_type,
                error_message=error_message,
            )

            self._write_event(event)
            return event

        except Exception as e:
            if self.debug:
                raise
            logger.debug(f"Error observing tool call: {e}")
            return None

    def observe_run_end(
        self,
        context: Any,
        summary: Optional[Dict[str, Any]] = None,
    ) -> Optional[RunEndEvent]:
        """Observe agent run end (Google ADK after_run_callback)."""
        try:
            invocation_id = self._context_get(context, "invocation_id", "")

            # Calculate duration from summary or timestamps
            duration_ms = 0
            if summary and "elapsed_time_ms" in summary:
                duration_ms = summary["elapsed_time_ms"]

            event = RunEndEvent(
                framework=self.get_framework(),
                timestamp=time.time(),
                run_id=self.run_id,
                invocation_id=invocation_id,
                duration_ms=duration_ms,
                summary=summary or {},
            )

            self._write_event(event)
            return event

        except Exception as e:
            if self.debug:
                raise
            logger.debug(f"Error observing run end: {e}")
            return None

    # Helper methods for extracting Google ADK specific data
    def _extract_model(self, llm_request: Any) -> str:
        """Extract model name from LLM request."""
        model = getattr(llm_request, "model", "")
        return str(model) if model else "unknown"

    def _extract_tool_names(self, llm_request: Any) -> List[str]:
        """Extract available tool names from LLM request."""
        tools = getattr(llm_request, "tools", [])
        return [getattr(tool, "name", "") for tool in tools]

    def _safe_token_count(self, llm_response: Any, token_type: str) -> int:
        """Safely extract token count from LLM response."""
        try:
            usage = getattr(llm_response, "usage", None)
            if usage is None:
                return 0
            if isinstance(usage, dict):
                val = usage.get(f"{token_type}_token_count", 0)
            else:
                val = getattr(usage, f"{token_type}_token_count", 0)
            if val is None:
                return 0
            return int(val)
        except (AttributeError, KeyError, TypeError, ValueError):
            return 0

    def _has_tool_calls(self, llm_response: Any) -> bool:
        """Check if response has tool calls."""
        return bool(getattr(llm_response, "tool_calls", []))

    def _extract_tool_calls(self, llm_response: Any) -> List[Dict[str, Any]]:
        """Extract tool calls from LLM response."""
        tool_calls_list = getattr(llm_response, "tool_calls", [])
        return [
            {
                "tool_id": getattr(tc, "id", ""),
                "tool_name": getattr(tc, "name", ""),
                "tool_args": getattr(tc, "args", {}),
            }
            for tc in tool_calls_list
        ]

    def _extract_finish_reason(self, llm_response: Any) -> str:
        """Extract finish reason from LLM response."""
        finish_reason = getattr(llm_response, "finish_reason", None)
        return str(finish_reason) if finish_reason else "unknown"


# For backward compatibility, export the plugin function
def create_plugin(**kwargs: Any) -> GoogleADKObserver:
    """Create a Google ADK observer plugin instance."""
    return GoogleADKObserver(**kwargs)


# Export for legacy usage
AgentTracePlugin = GoogleADKObserver
