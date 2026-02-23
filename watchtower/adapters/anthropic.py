"""
Anthropic adapter for Watchtower observability.

Provides observability for Anthropic Claude agents and direct API usage.
"""

import functools
import time
from typing import Optional, Dict, Any, List, Callable

from watchtower.utils.sanitization import sanitize_args
from watchtower.core.interface import (
    AgentObserver,
    AgentFramework,
    LLMEvent,
    ToolEvent,
    RunStartEvent,
    RunEndEvent,
)

logger = __import__("logging").getLogger("watchtower")


def _sanitize_response(response: Any) -> Dict[str, Any]:
    """Convert and sanitize a provider response object for safe storage."""
    try:
        raw = response.model_dump() if hasattr(response, "model_dump") else {}
        return sanitize_args(raw)
    except Exception:
        return {}


class AnthropicObserver(AgentObserver):
    """Observer for Anthropic Claude agents.

    Wraps Anthropic API calls to capture request/response details,
    token usage, and tool calls.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-sonnet-4-20250514",
        **kwargs: Any,
    ) -> None:
        """Initialize the Anthropic observer.

        Args:
            api_key: Anthropic API key (reads ANTHROPIC_API_KEY env var if not provided)
            model: Model to use for API calls
            **kwargs: Additional arguments passed to AgentObserver
        """
        super().__init__(**kwargs)

        self.model = model
        self.api_key = api_key

        # Lazy load Anthropic client
        self._client = None


    @property
    def client(self) -> Any:
        """Lazy-load Anthropic client."""
        if self._client is None:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self.api_key)
            except ImportError as e:
                raise ImportError(
                    "anthropic package is required for AnthropicObserver. "
                    "Install with: pip install anthropic"
                ) from e
        return self._client

    @staticmethod
    def _context_get(context: Any, key: str, default: Any = None) -> Any:
        if isinstance(context, dict):
            return context.get(key, default)
        return getattr(context, key, default)

    def get_framework(self) -> AgentFramework:
        """Return Anthropic as the framework."""
        return AgentFramework.ANTHROPIC

    def observe_run_start(
        self,
        context: Any,
    ) -> Optional[RunStartEvent]:
        """Observe agent run start."""
        try:
            agent_name = self._context_get(context, "agent_name", "anthropic-agent")

            event = RunStartEvent(
                framework=self.get_framework(),
                timestamp=time.time(),
                run_id=self.run_id,
                invocation_id=self.run_id,  # Use run_id as invocation_id
                agent_name=agent_name,
            )

            self._write_event(event)
            return event

        except Exception as e:
            logger.debug(f"Error observing run start: {e}")
            return None

    def observe_llm_call(
        self,
        request: Any,
        response: Optional[Any] = None,
        **kwargs: Any,
    ) -> Any:
        """Wrap Anthropic API call with observability.

        This is the main method for capturing Anthropic API usage.
        Use it like:

            observer = AnthropicObserver(model="claude-sonnet-4-20250514")
            response = observer.observe_llm_call([
                {"role": "user", "content": "Hello!"}
            ])

        Args:
            request: List of message dicts (Anthropic format)
            **kwargs: Additional arguments passed to client.messages.create()

        Returns:
            Anthropic Message object
        """
        try:
            start_time = time.time()

            if response is None:
                return None

            messages: List[Dict[str, Any]] = request
            provider_response = self.client.messages.create(
                model=self.model,
                messages=messages,
                **kwargs
            )

            duration_ms = (time.time() - start_time) * 1000

            # Create request ID (Anthropic uses response.id)
            request_id = provider_response.id if provider_response.id else "unknown"

            # Extract usage information
            input_tokens = provider_response.usage.input_tokens
            output_tokens = provider_response.usage.output_tokens
            total_tokens = input_tokens + output_tokens

            # Check for tool calls
            tool_calls = self._extract_tool_calls(provider_response)
            has_tool_calls = len(tool_calls) > 0

            # Extract available tools from kwargs
            tools_available = []
            if "tools" in kwargs:
                for tool in kwargs["tools"]:
                    tool_name = tool.get("name", "")
                    if tool_name:
                        tools_available.append(tool_name)

            event = LLMEvent(
                framework=self.get_framework(),
                timestamp=start_time,
                request_id=request_id,
                model=self.model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                tools_available=tools_available,
                has_tool_calls=has_tool_calls,
                tool_calls=tool_calls,
                finish_reason=provider_response.stop_reason,
                duration_ms=duration_ms,
                raw_response=_sanitize_response(provider_response),
            )

            self._write_event(event)
            return provider_response

        except Exception as e:
            logger.error("Error in Anthropic API call: %s", e, exc_info=True)
            raise

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

        For Anthropic, tool calls are part of LLM responses.
        This method is provided for consistency but may not be called directly.
        """
        # Not typically used for Anthropic as tools are in LLM response
        return None

    def observe_run_end(
        self,
        context: Any,
        summary: Optional[Dict[str, Any]] = None,
    ) -> Optional[RunEndEvent]:
        """Observe agent run end."""
        try:
            invocation_id = self._context_get(context, "invocation_id", self.run_id)

            # Calculate duration from summary or context
            duration_ms = 0
            if summary and "elapsed_time_ms" in summary:
                duration_ms = summary["elapsed_time_ms"]
            else:
                start_time = self._context_get(context, "start_time", None)
                if start_time is not None:
                    duration_ms = (time.time() - start_time) * 1000

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
            logger.debug(f"Error observing run end: {e}")
            return None

    def _extract_tool_calls(self, response: Any) -> List[Dict[str, Any]]:
        """Extract tool use blocks from Anthropic response.

        Args:
            response: Anthropic Message object

        Returns:
            List of tool call dictionaries
        """
        tool_calls: List[Dict[str, Any]] = []

        if not hasattr(response, "content"):
            return tool_calls

        for block in response.content:
            if block.type == "tool_use":
                tool_calls.append({
                    "tool_id": block.id,
                    "tool_name": block.name,
                    "tool_args": block.input,
                })

        return tool_calls

    def create_agent_wrapper(self, agent_function: Callable[..., Any]) -> Callable[..., Any]:
        """Wrap an agent function with observability.

        Use this to add observability to your Anthropic-based agent:

            observer = AnthropicObserver(model="claude-sonnet-4-20250514")
            wrapped_agent = observer.create_agent_wrapper(my_agent_function)

            result = wrapped_agent(input_data)
        """

        @functools.wraps(agent_function)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Record run start
            start_time = time.time()
            self.observe_run_start(
                {"agent_name": kwargs.get("agent_name", "anthropic-agent")},
            )

            try:
                # Call the original function
                result = agent_function(*args, **kwargs)

                # Record run end
                self.observe_run_end(
                    {
                        "invocation_id": self.run_id,
                        "start_time": start_time,
                    },
                    summary={"success": True},
                )

                return result

            except Exception as e:
                # Record error
                self.observe_run_end(
                    {
                        "invocation_id": self.run_id,
                        "start_time": start_time,
                    },
                    summary={"success": False, "error": str(e)},
                )
                raise

        return wrapper
