"""
Parallel multi-agent workflow using Google ADK.

Multiple agents work simultaneously on independent tasks.
"""

from google.adk.agents import Agent
from google.adk.agents.parallel import ParallelAgent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def search_news(query: str) -> str:
    """Search news articles."""
    return f"News results for {query}: " \
           "Latest AI observability developments from major tech news sources"


def search_papers(query: str) -> str:
    """Search academic papers."""
    return f"Papers for {query}: " \
           "Recent research on AI tracing, observability, and debugging from arXiv, " \
           "IEEE, and ACM digital libraries"


def search_social(query: str) -> str:
    """Search social media discussions."""
    return f"Social posts for {query}: " \
           "Trending discussions on Twitter, Reddit, and Hacker News about AI tools"


def search_blogs(query: str) -> str:
    """Search technical blogs."""
    return f"Blog posts for {query}: " \
           "In-depth articles from Medium, Dev.to, and engineering blogs about " \
           "agent frameworks and observability"


# Create parallel research agents
news_researcher = Agent(
    name="news_researcher",
    model="gemini-2.0-flash",
    instruction=(
        "Search for recent news articles on the given topic. "
        "Use the search_news tool. Focus on recent developments and announcements."
    ),
    tools=[search_news],
)

academic_researcher = Agent(
    name="academic_researcher",
    model="gemini-2.0-flash",
    instruction=(
        "Search for academic papers and research on the topic. "
        "Use the search_papers tool. Find peer-reviewed studies and research papers."
    ),
    tools=[search_papers],
)

social_researcher = Agent(
    name="social_researcher",
    model="gemini-2.0-flash",
    instruction=(
        "Search social media for discussions and opinions. "
        "Use the search_social tool. Find real-world usage and feedback."
    ),
    tools=[search_social],
)

blog_researcher = Agent(
    name="blog_researcher",
    model="gemini-2.0-flash",
    instruction=(
        "Search technical blogs for in-depth articles. "
        "Use the search_blogs tool. Find practical guides and tutorials."
    ),
    tools=[search_blogs],
)

# Create aggregator that combines results
aggregator = Agent(
    name="aggregator",
    model="gemini-2.0-flash",
    instruction=(
        "Synthesize findings from all research sources. "
        "Combine news, academic research, social discussions, and blog posts. "
        "Provide a comprehensive summary with key insights, trends, and recommendations."
    ),
)

# Parallel workflow - all agents run simultaneously
parallel_research = ParallelAgent(
    name="research_team",
    sub_agents=[news_researcher, academic_researcher, social_researcher, blog_researcher],
    aggregator=aggregator,
)

# Watchtower traces all parallel agent activity
plugin = AgentTracePlugin()

# Run parallel multi-agent workflow
runner = InMemoryRunner(agent=parallel_research, plugins=[plugin])
result = runner.run(user_message="Research the latest developments in AI observability")

print("=== Multi-Agent Workflow: Parallel Research ===")
print("Pattern: Parallel Execution")
print()
print("Research Team (running concurrently):")
print("  📰 News Researcher")
print("  🎓 Academic Researcher")
print("  💬 Social Media Researcher")
print("  📝 Blog Researcher")
print()
print("Execution Flow:")
print("  All four researchers run simultaneously")
print("  Results gathered by aggregator")
print("  Comprehensive summary provided")
print()
print("Benefits of Parallel Execution:")
print("  • Faster total execution time")
print("  • Independent tasks run concurrently")
print("  • Comprehensive coverage from multiple sources")
print()
print("=== Agent Response ===")
print(result)
print()
print("=== Trace Information ===")
print(f"Run ID: {plugin.run_id}")
print(f"Trace includes:")
print("  • Parallel agent runs with timestamp overlaps")
print("  • Individual research from each source")
print("  • Aggregated summary combining all findings")
print("  • Tool calls from each researcher")
print()
print("=== View Trace ===")
print(f"To view the parallel multi-agent trace, run:")
print(f"  watchtower show {plugin.run_id}")
print()
print("Filter by researcher:")
print(f"  watchtower show {plugin.run_id} --agent news_researcher")
print(f"  watchtower show {plugin.run_id} --agent academic_researcher")
print(f"  watchtower show {plugin.run_id} --agent social_researcher")
print(f"  watchtower show {plugin.run_id} --agent blog_researcher")
