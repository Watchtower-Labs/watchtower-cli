"""
Simple Google ADK agent with Watchtower observability.

This example demonstrates basic Watchtower integration with a single Google ADK agent.
"""

from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def search_web(query: str) -> str:
    """Mock web search tool.

    In a real application, this would call a search API.
    """
    return f"Search results for: {query}"


def get_weather(location: str) -> str:
    """Mock weather lookup tool.

    In a real application, this would call a weather API.
    """
    return f"Weather in {location}: Sunny, 72°F"


# Create agent
agent = Agent(
    name="simple_agent",
    model="gemini-2.0-flash",
    instruction=(
        "You are a helpful assistant. You can search the web "
        "and check the weather. Be concise and helpful."
    ),
    tools=[search_web, get_weather],
)

# Add Watchtower plugin
plugin = AgentTracePlugin()

# Run agent
runner = InMemoryRunner(agent=agent, plugins=[plugin])
result = runner.run(user_message="What's the weather like in San Francisco today?")

print("=== Agent Response ===")
print(result)
print("\n=== Trace Information ===")
print(f"Run ID: {plugin.run_id}")
print(f"Trace saved to: ~/.watchtower/traces/*_{plugin.run_id}.jsonl")
print("\n=== View Trace ===")
print("To view the trace, run:")
print(f"  watchtower show {plugin.run_id}")
