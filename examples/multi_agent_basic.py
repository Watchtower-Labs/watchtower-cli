"""
Basic multi-agent scenario using Google ADK.

Demonstrates parent-child agent hierarchy with Watchtower tracing.
"""

from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def search_web(query: str) -> str:
    """Mock web search tool."""
    return f"Search results for: {query}"


def summarize(text: str) -> str:
    """Mock summarization tool."""
    return f"Summary: {text[:100]}..."


def edit_content(content: str) -> str:
    """Mock content editing tool."""
    return f"Edited: {content}"


def proofread(text: str) -> str:
    """Mock proofreading tool."""
    return f"Proofread: {text}"


# Create specialized agents
researcher = Agent(
    name="researcher",
    model="gemini-2.0-flash",
    instruction=(
        "You are a research specialist. Gather information on the given topic. "
        "Use the search_web tool to find relevant information."
    ),
    tools=[search_web],
)

writer = Agent(
    name="writer",
    model="gemini-2.0-flash",
    instruction=(
        "You are a content writer. Create engaging content based on research findings. "
        "Use the summarize tool to create concise summaries."
    ),
    tools=[summarize],
)

editor = Agent(
    name="editor",
    model="gemini-2.0-flash",
    instruction=(
        "You are an editor. Review and improve content for clarity and flow. "
        "Use the edit_content tool to make revisions."
    ),
    tools=[edit_content],
)

reviewer = Agent(
    name="reviewer",
    model="gemini-2.0-flash",
    instruction=(
        "You are a final reviewer. Check content for grammar, spelling, and style. "
        "Use the proofread tool to identify any issues."
    ),
    tools=[proofread],
)

# Create orchestrator that delegates to specialists
orchestrator = Agent(
    name="orchestrator",
    model="gemini-2.0-flash",
    instruction=(
        "You are a content creation orchestrator. Coordinate the content creation process: "
        "1. Delegate research to the researcher\n"
        "2. Delegate writing to the writer\n"
        "3. Delegate editing to the editor\n"
        "4. Delegate final review to the reviewer\n"
        "5. Provide final content and summary to the user"
    ),
    sub_agents=[researcher, writer, editor, reviewer],
)

# Add Watchtower plugin
plugin = AgentTracePlugin()

# Run parent-child multi-agent workflow
runner = InMemoryRunner(agent=orchestrator, plugins=[plugin])
result = runner.run(user_message="Create a blog post about AI observability")

print("=== Multi-Agent Workflow: Content Creation ===")
print("Pattern: Parent-Child Hierarchy")
print()
print("Agents:")
print("  📋 Orchestrator (parent)")
print("  🔍 Researcher (child)")
print("  ✍️  Writer (child)")
print("  📝  Editor (child)")
print("  👀  Reviewer (child)")
print()
print("Workflow:")
print("  Orchestrator → Researcher → Writer → Editor → Reviewer → Orchestrator → User")
print()
print("=== Agent Response ===")
print(result)
print()
print("=== Trace Information ===")
print(f"Run ID: {plugin.run_id}")
print(f"Trace includes:")
print("  • Agent transfer events (orchestrator → specialist → orchestrator)")
print("  • Individual agent runs (researcher, writer, editor, reviewer)")
print("  • Tool calls from each specialist")
print()
print("=== View Trace ===")
print(f"To view the multi-agent trace, run:")
print(f"  watchtower show {plugin.run_id}")
print()
print("Use / search in the trace viewer to filter by agent name.")
