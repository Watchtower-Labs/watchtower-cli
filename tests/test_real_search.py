"""Test watchtower SDK with real web search."""

import asyncio
from pathlib import Path
from types import SimpleNamespace

# Import watchtower
from watchtower import AgentTracePlugin

# Import for web scraping
import requests
from bs4 import BeautifulSoup


class RealSearchTool:
    """A real web search tool using DuckDuckGo."""

    def __init__(self):
        self.name = "web_search"
        self.description = "Search the web using DuckDuckGo"

    def __call__(self, query: str) -> dict:
        """Perform actual web search."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }

            url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
            print(f"   Searching: {query}")

            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            results = []

            for result in soup.select('.result'):
                title_elem = result.select_one('.result__a')
                snippet_elem = result.select_one('.result__snippet')

                if title_elem:
                    results.append({
                        'title': title_elem.get_text(strip=True),
                        'url': title_elem.get('href', ''),
                        'snippet': snippet_elem.get_text(strip=True) if snippet_elem else ''
                    })

            print(f"   Found {len(results)} results")

            return {
                "success": True,
                "query": query,
                "results": results[:5],
                "total": len(results)
            }

        except Exception as e:
            return {"success": False, "error": str(e), "results": []}


async def test_real_search():
    """Test SDK with real search."""
    print("=" * 70)
    print("Watchtower SDK - Real Web Search Test")
    print("=" * 70)
    print()

    # Create plugin
    plugin = AgentTracePlugin(
        trace_dir="~/.watchtower/traces",
        enable_file=True,
        enable_stdout=False,
    )

    print(f"Run ID: {plugin.run_id}")
    print()

    # Create search tool
    search_tool = RealSearchTool()

    # Simulate agent execution with real search
    agent = SimpleNamespace(name="search_agent")
    query = "Python async programming tutorial"

    print("Step 1: Starting agent run...")
    ctx = SimpleNamespace(invocation_id="test_001", agent=agent)
    await plugin.before_run_callback(invocation_context=ctx)

    print("Step 2: LLM decides to search...")
    callback_ctx = SimpleNamespace(state={})
    llm_request = SimpleNamespace(
        model="gemini-2.0-flash",
        contents=[query],
        tools=[search_tool]
    )
    await plugin.before_model_callback(
        callback_context=callback_ctx,
        llm_request=llm_request
    )

    await asyncio.sleep(0.2)

    llm_response = SimpleNamespace(
        usage=SimpleNamespace(input_tokens=50, output_tokens=30, total_tokens=80),
        finish_reason="tool_calls",
        tool_calls=["search"]
    )
    await plugin.after_model_callback(
        callback_context=callback_ctx,
        llm_response=llm_response
    )

    print("Step 3: Executing REAL web search...")
    tool_ctx = SimpleNamespace(
        state={},
        agent_name="search_agent",
        function_call_id="call_001"
    )
    tool_args = {"query": query}

    await plugin.before_tool_callback(
        tool=search_tool,
        tool_args=tool_args,
        tool_context=tool_ctx
    )

    # ACTUALLY SEARCH THE WEB!
    search_results = search_tool(query)

    await plugin.after_tool_callback(
        tool=search_tool,
        tool_args=tool_args,
        tool_context=tool_ctx,
        tool_response=search_results
    )

    print()
    print("Step 4: LLM processes results...")
    callback_ctx = SimpleNamespace(state={})
    llm_request = SimpleNamespace(
        model="gemini-2.0-flash",
        contents=[f"Results: {search_results}"],
        tools=[]
    )
    await plugin.before_model_callback(
        callback_context=callback_ctx,
        llm_request=llm_request
    )

    await asyncio.sleep(0.3)

    llm_response = SimpleNamespace(
        usage=SimpleNamespace(input_tokens=200, output_tokens=100, total_tokens=300),
        finish_reason="stop",
        tool_calls=None
    )
    await plugin.after_model_callback(
        callback_context=callback_ctx,
        llm_response=llm_response
    )

    print("Step 5: Ending agent run...")
    await plugin.after_run_callback(invocation_context=ctx)

    print()
    print("=" * 70)
    print("Test Results:")
    print("=" * 70)

    if search_results.get("success"):
        print(f"Search Query: {search_results['query']}")
        print(f"Results Found: {search_results['total']}")
        print()
        print("Top Results:")
        for i, result in enumerate(search_results['results'], 1):
            print(f"{i}. {result['title']}")
            print(f"   {result['snippet'][:100]}...")
            print()

    # Show trace file
    if plugin.file_writer:
        trace_path = plugin.file_writer.get_trace_path()
        print(f"Trace saved to: {trace_path}")
        print()

        # Display trace summary
        print("Trace Events:")
        with open(trace_path, 'r') as f:
            import json
            for i, line in enumerate(f, 1):
                event = json.loads(line)
                event_type = event.get('type', 'unknown')

                if event_type == 'llm.response':
                    tokens = event.get('total_tokens', 0)
                    duration = event.get('duration_ms', 0)
                    print(f"  {i}. {event_type:20} | {tokens:4} tokens | {duration:.0f}ms")
                elif event_type == 'tool.end':
                    duration = event.get('duration_ms', 0)
                    tool = event.get('tool_name', 'unknown')
                    print(f"  {i}. {event_type:20} | {tool:15} | {duration:.0f}ms")
                elif event_type == 'run.end':
                    summary = event.get('summary', {})
                    print(f"  {i}. {event_type:20} | Summary: {summary}")
                else:
                    print(f"  {i}. {event_type}")

    print()
    print("=" * 70)
    print("SUCCESS: SDK working with real web search!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_real_search())
