"""Simple example agent demonstrating watchtower integration.

This example shows how to add observability to a Google ADK agent
with minimal configuration.

Prerequisites:
    pip install google-adk watchtower

Usage:
    python examples/simple_agent.py

    # For live tailing:
    watchtower tail python examples/simple_agent.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path to import watchtower
sys.path.insert(0, str(Path(__file__).parent.parent))

# Mock Google ADK for testing without actual installation
# In production, remove this mock and install google-adk
try:
    from google.adk.agents import Agent
    from google.adk.runners import InMemoryRunner
    from google.adk.tools.base_tool import BaseTool
except ImportError:
    print("Note: Running in mock mode (google-adk not installed)")

    # Simple mocks for demonstration
    class Agent:
        def __init__(self, **kwargs):
            self.name = kwargs.get("name", "agent")
            self.model = kwargs.get("model", "gemini-2.0-flash")
            self.instruction = kwargs.get("instruction", "")
            self.tools = kwargs.get("tools", [])

    class InMemoryRunner:
        def __init__(self, **kwargs):
            self.agent = kwargs.get("agent")
            self.app_name = kwargs.get("app_name", "app")
            self.plugins = kwargs.get("plugins", [])

        async def run_async(self, user_id=None, session_id=None, message=None, **kwargs):
            # Simulate agent run
            print(f"Running agent with message: {message}")

            # Simulate plugin calls
            for plugin in self.plugins:
                # Simulate run start
                if hasattr(plugin, "before_run_callback"):
                    from types import SimpleNamespace
                    ctx = SimpleNamespace(
                        invocation_id="inv_001",
                        agent=self.agent
                    )
                    await plugin.before_run_callback(invocation_context=ctx)

                # Simulate LLM call
                if hasattr(plugin, "before_model_callback"):
                    from types import SimpleNamespace
                    callback_ctx = SimpleNamespace(state={})
                    llm_request = SimpleNamespace(
                        model="gemini-2.0-flash",
                        contents=["message1", "message2"],
                        tools=self.agent.tools
                    )
                    await plugin.before_model_callback(
                        callback_context=callback_ctx,
                        llm_request=llm_request
                    )

                    # Simulate response
                    await asyncio.sleep(0.5)
                    llm_response = SimpleNamespace(
                        usage=SimpleNamespace(
                            input_tokens=100,
                            output_tokens=50,
                            total_tokens=150
                        ),
                        finish_reason="stop",
                        tool_calls=None
                    )
                    await plugin.after_model_callback(
                        callback_context=callback_ctx,
                        llm_response=llm_response
                    )

                # Simulate tool call
                if hasattr(plugin, "before_tool_callback") and self.agent.tools:
                    from types import SimpleNamespace
                    tool_ctx = SimpleNamespace(
                        state={},
                        agent_name=self.agent.name,
                        function_call_id="call_001"
                    )
                    tool = self.agent.tools[0]
                    tool_args = {"query": "test query"}

                    await plugin.before_tool_callback(
                        tool=tool,
                        tool_args=tool_args,
                        tool_context=tool_ctx
                    )

                    await asyncio.sleep(0.3)

                    tool_response = {"results": ["result1", "result2"]}
                    await plugin.after_tool_callback(
                        tool=tool,
                        tool_args=tool_args,
                        tool_context=tool_ctx,
                        tool_response=tool_response
                    )

                # Simulate run end
                if hasattr(plugin, "after_run_callback"):
                    from types import SimpleNamespace
                    ctx = SimpleNamespace(
                        invocation_id="inv_001",
                        agent=self.agent
                    )
                    await plugin.after_run_callback(invocation_context=ctx)

            # Yield response
            from types import SimpleNamespace
            event = SimpleNamespace(
                content=f"Response to: {message}\n\nThis is a simulated agent response."
            )
            yield event

    class BaseTool:
        def __init__(self, name: str, description: str = ""):
            self.name = name
            self.description = description


# Import watchtower
from watchtower import AgentTracePlugin


# Define a simple tool
class SearchTool(BaseTool):
    """A simple web search tool."""

    def __init__(self):
        super().__init__(
            name="search_web",
            description="Search the web for information"
        )

    def __call__(self, query: str) -> dict:
        """Search the web for information.

        Args:
            query: Search query

        Returns:
            Dictionary with search results
        """
        # Simulated search results
        return {
            "query": query,
            "results": [
                {"title": "Result 1", "url": "https://example.com/1"},
                {"title": "Result 2", "url": "https://example.com/2"},
            ],
        }


class WriteTool(BaseTool):
    """A simple file writing tool."""

    def __init__(self):
        super().__init__(
            name="write_file",
            description="Write content to a file"
        )

    def __call__(self, path: str, content: str) -> dict:
        """Write content to a file.

        Args:
            path: File path
            content: Content to write

        Returns:
            Dictionary with write status
        """
        # Simulated file write
        return {
            "path": path,
            "bytes_written": len(content),
            "success": True,
        }


async def main():
    """Run the example agent with watchtower observability."""
    print("=" * 60)
    print("Watchtower Example Agent")
    print("=" * 60)
    print()

    # Create tools
    search_tool = SearchTool()
    write_tool = WriteTool()

    # Create agent
    agent = Agent(
        name="research_assistant",
        model="gemini-2.0-flash",
        instruction="You are a helpful research assistant that can search the web and write files.",
        tools=[search_tool, write_tool],
    )

    # Create watchtower plugin
    # When run via `watchtower tail`, stdout streaming is auto-enabled via env vars
    plugin = AgentTracePlugin(
        enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
        run_id=os.environ.get("AGENTTRACE_RUN_ID"),
    )

    # Create runner with plugin
    runner = InMemoryRunner(
        agent=agent,
        app_name="research_app",
        plugins=[plugin],
    )

    # Run the agent
    print("Running agent...")
    print()

    message = "Find information about AI agents and write a summary to summary.txt"

    async for event in runner.run_async(
        user_id="user_001",
        session_id="session_001",
        message=message,
    ):
        print(event.content)

    print()
    print("=" * 60)
    print("Agent run complete!")
    print()

    # Show trace file location
    if plugin.file_writer:
        trace_path = plugin.file_writer.get_trace_path()
        if trace_path:
            print(f"Trace saved to: {trace_path}")
            print()
            print("View the trace with:")
            print(f"  watchtower show {plugin.run_id}")
            print()
            print("Or view the latest trace:")
            print("  watchtower show last")

    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
