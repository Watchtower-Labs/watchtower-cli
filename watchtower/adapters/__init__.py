"""
Framework adapters for Watchtower observability.

Each adapter provides observability for a specific AI agent framework
by implementing the common AgentObserver interface.
"""

from watchtower.adapters.google_adk import (
    GoogleADKObserver,
    create_plugin as create_google_adk_plugin,
)

# Backward compatibility export
AgentTracePlugin = GoogleADKObserver

# These will be added as they are implemented
__all__ = ["GoogleADKObserver", "AgentTracePlugin", "create_google_adk_plugin"]

try:
    from watchtower.adapters.anthropic import AnthropicObserver  # noqa: F401
    __all__.append("AnthropicObserver")
except ImportError:
    pass

try:
    from watchtower.adapters.openai import OpenAIObserver  # noqa: F401
    __all__.append("OpenAIObserver")
except ImportError:
    pass
