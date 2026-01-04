"""Real search agent that actually searches the web and returns results.

This example shows a functional agent with real web search capabilities.

Prerequisites:
    pip install requests beautifulsoup4

Usage:
    python examples/real_search_agent.py "your search query"
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path to import watchtower
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import for web scraping
try:
    import requests
    from bs4 import BeautifulSoup
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("Warning: requests/beautifulsoup4 not installed. Install with:")
    print("  pip install requests beautifulsoup4")

# Mock Google ADK for testing without actual installation
try:
    from google.adk.agents import Agent
    from google.adk.runners import InMemoryRunner
    from google.adk.tools.base_tool import BaseTool
except ImportError:
    print("Note: Running in mock mode (google-adk not installed)")

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
            print(f"\n🤖 Agent processing: {message}\n")

            # Simulate plugin calls
            for plugin in self.plugins:
                # Run start
                if hasattr(plugin, "before_run_callback"):
                    from types import SimpleNamespace
                    ctx = SimpleNamespace(invocation_id="inv_001", agent=self.agent)
                    await plugin.before_run_callback(invocation_context=ctx)

                # LLM request
                if hasattr(plugin, "before_model_callback"):
                    from types import SimpleNamespace
                    callback_ctx = SimpleNamespace(state={})
                    llm_request = SimpleNamespace(
                        model="gemini-2.0-flash",
                        contents=[message],
                        tools=self.agent.tools
                    )
                    await plugin.before_model_callback(
                        callback_context=callback_ctx,
                        llm_request=llm_request
                    )

                    # Simulate thinking
                    await asyncio.sleep(0.3)

                    llm_response = SimpleNamespace(
                        usage=SimpleNamespace(
                            input_tokens=len(message.split()) * 2,
                            output_tokens=20,
                            total_tokens=len(message.split()) * 2 + 20
                        ),
                        finish_reason="tool_calls",
                        tool_calls=["search"]  # Agent wants to use search tool
                    )
                    await plugin.after_model_callback(
                        callback_context=callback_ctx,
                        llm_response=llm_response
                    )

                # Execute the search tool
                if hasattr(plugin, "before_tool_callback") and self.agent.tools:
                    from types import SimpleNamespace
                    tool_ctx = SimpleNamespace(
                        state={},
                        agent_name=self.agent.name,
                        function_call_id="call_001"
                    )

                    # Get the search tool
                    search_tool = self.agent.tools[0]
                    tool_args = {"query": message}

                    await plugin.before_tool_callback(
                        tool=search_tool,
                        tool_args=tool_args,
                        tool_context=tool_ctx
                    )

                    # Actually call the tool!
                    print("🔍 Searching the web...\n")
                    tool_response = search_tool(message)

                    await plugin.after_tool_callback(
                        tool=search_tool,
                        tool_args=tool_args,
                        tool_context=tool_ctx,
                        tool_response=tool_response
                    )

                    # LLM processes the results
                    if hasattr(plugin, "before_model_callback"):
                        callback_ctx = SimpleNamespace(state={})
                        llm_request = SimpleNamespace(
                            model="gemini-2.0-flash",
                            contents=[f"Search results for '{message}'", str(tool_response)],
                            tools=[]
                        )
                        await plugin.before_model_callback(
                            callback_context=callback_ctx,
                            llm_request=llm_request
                        )

                        await asyncio.sleep(0.5)

                        result_tokens = len(str(tool_response).split())
                        llm_response = SimpleNamespace(
                            usage=SimpleNamespace(
                                input_tokens=result_tokens,
                                output_tokens=result_tokens // 2,
                                total_tokens=result_tokens + result_tokens // 2
                            ),
                            finish_reason="stop",
                            tool_calls=None
                        )
                        await plugin.after_model_callback(
                            callback_context=callback_ctx,
                            llm_response=llm_response
                        )

                # Run end
                if hasattr(plugin, "after_run_callback"):
                    from types import SimpleNamespace
                    ctx = SimpleNamespace(invocation_id="inv_001", agent=self.agent)
                    await plugin.after_run_callback(invocation_context=ctx)

                    # Generate response based on search results
                    if tool_response.get("success"):
                        results = tool_response.get("results", [])
                        response = f"I found {len(results)} results for '{message}':\n\n"
                        for i, result in enumerate(results[:5], 1):
                            response += f"{i}. {result.get('title', 'No title')}\n"
                            response += f"   {result.get('snippet', 'No description')}\n"
                            response += f"   🔗 {result.get('url', '')}\n\n"
                    else:
                        response = f"Search failed: {tool_response.get('error', 'Unknown error')}"

                    from types import SimpleNamespace
                    event = SimpleNamespace(content=response)
                    yield event

    class BaseTool:
        def __init__(self, name: str, description: str = ""):
            self.name = name
            self.description = description


# Import watchtower
from watchtower import AgentTracePlugin


class RealSearchTool(BaseTool):
    """A real web search tool using DuckDuckGo HTML search."""

    def __init__(self):
        super().__init__(
            name="web_search",
            description="Search the web for information using DuckDuckGo"
        )

    def __call__(self, query: str) -> dict:
        """Search the web for real results.

        Args:
            query: Search query

        Returns:
            Dictionary with search results
        """
        if not HAS_REQUESTS:
            return {
                "success": False,
                "error": "requests library not installed",
                "results": []
            }

        try:
            # Use DuckDuckGo HTML search (no API key needed)
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }

            # DuckDuckGo HTML search
            url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            # Parse results
            soup = BeautifulSoup(response.text, 'html.parser')
            results = []

            # Find search result links
            for result in soup.select('.result'):
                title_elem = result.select_one('.result__a')
                snippet_elem = result.select_one('.result__snippet')

                if title_elem:
                    title = title_elem.get_text(strip=True)
                    url = title_elem.get('href', '')
                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ''

                    results.append({
                        'title': title,
                        'url': url,
                        'snippet': snippet
                    })

            print(f"✅ Found {len(results)} results\n")

            return {
                "success": True,
                "query": query,
                "results": results[:10],  # Return top 10
                "total": len(results)
            }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Search request timed out",
                "results": []
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}",
                "results": []
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "results": []
            }


async def main(search_query: str):
    """Run the real search agent."""
    print("=" * 70)
    print("🔍 Watchtower Real Search Agent")
    print("=" * 70)
    print()

    # Create search tool
    search_tool = RealSearchTool()

    # Create agent
    agent = Agent(
        name="search_assistant",
        model="gemini-2.0-flash",
        instruction="You are a helpful search assistant that finds information on the web.",
        tools=[search_tool],
    )

    # Create watchtower plugin
    plugin = AgentTracePlugin(
        enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
        run_id=os.environ.get("AGENTTRACE_RUN_ID"),
    )

    # Create runner with plugin
    runner = InMemoryRunner(
        agent=agent,
        app_name="search_app",
        plugins=[plugin],
    )

    # Run the agent
    async for event in runner.run_async(
        user_id="user_001",
        session_id="session_001",
        message=search_query,
    ):
        print(event.content)

    print("=" * 70)
    print("✅ Search complete!")
    print()

    # Show trace file location
    if plugin.file_writer:
        trace_path = plugin.file_writer.get_trace_path()
        if trace_path:
            print(f"📊 Trace saved to: {trace_path}")
            print()
            print("View the trace with:")
            print(f"  watchtower show {plugin.run_id}")
            print()

    print("=" * 70)


if __name__ == "__main__":
    # Get search query from command line or use default
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = "latest news about AI agents"
        print(f"No query provided, using default: '{query}'")
        print("Usage: python examples/real_search_agent.py \"your search query\"")
        print()

    asyncio.run(main(query))
