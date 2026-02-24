"""
Unified Watchtower SDK for multi-framework observability.

Auto-detects framework and creates appropriate observer.
"""

import importlib.util
import logging
from typing import Optional, Any, TYPE_CHECKING

from watchtower.adapters.anthropic import AnthropicObserver
from watchtower.adapters.openai import OpenAIObserver
from watchtower.core.interface import AgentFramework, AgentObserver

if TYPE_CHECKING:
    from watchtower.adapters.google_adk import GoogleADKObserver

logger = logging.getLogger("watchtower")

class Watchtower:
    """Unified observability SDK for AI agent frameworks.

    This SDK provides a single entry point for all supported frameworks,
    auto-detecting which framework is being used.

    Supported Frameworks:
    - Google ADK: Full multi-agent orchestration support
    - Anthropic Claude: Single-agent focus
    - OpenAI GPT: Single-agent focus

    Future Frameworks (Planned):
    - LangChain: Q2 2026
    - AutoGen: Q3 2026
    """

    @staticmethod
    def detect_framework() -> Optional[AgentFramework]:
        """Auto-detect which framework is being used.

        Checks for installed packages and returns the first match.
        Priority: Google ADK > Anthropic > OpenAI

        Returns:
            Detected AgentFramework or None if none found
        """
        if importlib.util.find_spec("google.adk") is not None:
            return AgentFramework.GOOGLE_ADK

        if importlib.util.find_spec("anthropic") is not None:
            return AgentFramework.ANTHROPIC

        if importlib.util.find_spec("openai") is not None:
            return AgentFramework.OPENAI

        logger.debug("No supported AI framework detected")
        return None

    @staticmethod
    def create_observer(
        framework: Optional[AgentFramework] = None,
        **kwargs: Any,
    ) -> AgentObserver:
        """Create observer for specified or auto-detected framework.

        Args:
            framework: Specific framework to use, or None to auto-detect
            **kwargs: Framework-specific configuration options

        Returns:
            AgentObserver instance for the detected/specified framework

        Raises:
            ValueError: If framework is unsupported
            ImportError: If required dependencies are missing
        """
        # Auto-detect framework if not specified
        detected_framework = framework or Watchtower.detect_framework()

        # Normalize string to enum member if needed
        if isinstance(detected_framework, str):
            try:
                detected_framework = AgentFramework(detected_framework)
            except ValueError:
                supported_frameworks = [
                    AgentFramework.GOOGLE_ADK,
                    AgentFramework.ANTHROPIC,
                    AgentFramework.OPENAI,
                ]
                raise ValueError(
                    f"Unsupported framework: {framework!r}. "
                    f"Supported frameworks: {[f.value for f in supported_frameworks]}"
                )

        # Validate framework is supported
        supported_frameworks = [
            AgentFramework.GOOGLE_ADK,
            AgentFramework.ANTHROPIC,
            AgentFramework.OPENAI,
        ]

        if detected_framework not in supported_frameworks:
            raise ValueError(
                f"Unsupported framework: {framework}. "
                f"Supported frameworks: {[f.value for f in supported_frameworks]}"
            )

        # Create appropriate observer
        try:
            if detected_framework == AgentFramework.GOOGLE_ADK:
                from watchtower.adapters.google_adk import GoogleADKObserver
                return GoogleADKObserver(**kwargs)
            elif detected_framework == AgentFramework.ANTHROPIC:
                return AnthropicObserver(**kwargs)
            elif detected_framework == AgentFramework.OPENAI:
                return OpenAIObserver(**kwargs)
            else:
                raise ValueError(f"Unsupported framework: {detected_framework}")
        except ImportError as e:
            raise ImportError(
                f"Failed to create observer for {detected_framework.value}. "
                f"Ensure the appropriate package is installed. "
                f"Error: {e}"
            ) from e

def create_for_anthropic(
    api_key: Optional[str] = None,
    model: str = "claude-sonnet-4-20250514",
    **kwargs: Any,
) -> AnthropicObserver:
    """Convenience function to create Anthropic observer.

    Args:
        api_key: Anthropic API key
        model: Model to use
        **kwargs: Additional observer options

    Returns:
        AnthropicObserver instance

    Example:
        >>> observer = create_for_anthropic(api_key="your-key")
        >>> response = observer.observe_llm_call([{"role": "user", "content": "Hello!"}])
    """
    return AnthropicObserver(api_key=api_key, model=model, **kwargs)

def create_for_openai(
    api_key: Optional[str] = None,
    model: str = "gpt-4o",
    **kwargs: Any,
) -> OpenAIObserver:
    """Convenience function to create OpenAI observer.

    Args:
        api_key: OpenAI API key
        model: Model to use
        **kwargs: Additional observer options

    Returns:
        OpenAIObserver instance

    Example:
        >>> observer = create_for_openai(api_key="your-key")
        >>> response = observer.observe_llm_call([
        ...     {"role": "user", "content": "Hello!"}
        ... ])
    """
    return OpenAIObserver(api_key=api_key, model=model, **kwargs)

def create_for_google_adk(
    trace_dir: str = "~/.watchtower/traces",
    enable_file: bool = True,
    enable_stdout: bool = False,
    **kwargs: Any,
) -> "GoogleADKObserver":
    """Convenience function to create Google ADK observer.

    Args:
        trace_dir: Directory to store traces
        enable_file: Write traces to files
        enable_stdout: Emit traces to stdout
        **kwargs: Additional observer options

    Returns:
        GoogleADKObserver instance

    Example:
        >>> from watchtower.sdk import create_for_google_adk
        >>> from google.adk.agents import Agent
        >>> from google.adk.runners import InMemoryRunner
        >>>
        >>> plugin = create_for_google_adk(enable_stdout=True)
        >>> runner = InMemoryRunner(agent=agent, plugins=[plugin])
    """
    from watchtower.adapters.google_adk import create_plugin
    return create_plugin(
        trace_dir=trace_dir,
        enable_file=enable_file,
        enable_stdout=enable_stdout,
        **kwargs,
    )
