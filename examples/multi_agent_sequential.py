"""
Sequential multi-agent workflow using Google ADK.

Agents execute in a defined order, passing results to the next.
"""

from google.adk.agents import Agent
from google.adk.agents.sequential import SequentialAgent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def gather_requirements(project: str) -> str:
    """Gather project requirements."""
    return f"Requirements for {project}: " \
           "User authentication, data storage, API endpoints, UI/UX, analytics"


def design_architecture(reqs: str) -> str:
    """Design system architecture based on requirements."""
    return f"Architecture based on: {reqs[:50]}... " \
           "Components: API Gateway, Auth Service, Data Layer, Business Logic, Frontend"


def implement_code(arch: str) -> str:
    """Implement code based on architecture."""
    return f"Code for: {arch[:30]}... " \
           "Endpoints: /auth, /data, /api/*, /ui/*, /analytics/*"


def test_code(code: str) -> str:
    """Test implementation and report results."""
    return f"Test results for: {code[:30]}... " \
           "Passed: 15/16 tests. Coverage: 92%. Issues: 1 minor"


def deploy(service: str) -> str:
    """Deploy the service."""
    return f"Deployed: {service[:30]}... " \
           "Environment: production. Status: healthy. URL: https://api.example.com"


# Create agents for each stage
requirements_agent = Agent(
    name="requirements_gatherer",
    model="gemini-2.0-flash",
    instruction=(
        "Gather comprehensive requirements for the given project. "
        "Use the gather_requirements tool. Be thorough and specific."
    ),
    tools=[gather_requirements],
)

architecture_agent = Agent(
    name="architect",
    model="gemini-2.0-flash",
    instruction=(
        "Design a scalable system architecture based on the requirements. "
        "Use the design_architecture tool. Consider security, performance, and maintainability."
    ),
    tools=[design_architecture],
)

implementation_agent = Agent(
    name="implementer",
    model="gemini-2.0-flash",
    instruction=(
        "Implement the code based on the architecture. "
        "Use the implement_code tool. Write clean, documented code."
    ),
    tools=[implement_code],
)

testing_agent = Agent(
    name="tester",
    model="gemini-2.0-flash",
    instruction=(
        "Test the implementation thoroughly. "
        "Use the test_code tool. Report all findings clearly."
    ),
    tools=[test_code],
)

deployment_agent = Agent(
    name="deployer",
    model="gemini-2.0-flash",
    instruction=(
        "Deploy the tested service. "
        "Use the deploy tool. Ensure production readiness."
    ),
    tools=[deploy],
)

# Sequential workflow - all agents run in order
development_pipeline = SequentialAgent(
    name="dev_pipeline",
    sub_agents=[
        requirements_agent,
        architecture_agent,
        implementation_agent,
        testing_agent,
        deployment_agent,
    ],
)

# Watchtower traces agent transfers automatically
plugin = AgentTracePlugin()

# Run sequential multi-agent workflow
runner = InMemoryRunner(agent=development_pipeline, plugins=[plugin])
result = runner.run(user_message="Build a REST API for task management")

print("=== Multi-Agent Workflow: Development Pipeline ===")
print("Pattern: Sequential")
print()
print("Workflow Stages:")
print("  1. 📋 Requirements Gatherer")
print("  2. 🏗️  Architect")
print("  3. 💻  Implementer")
print("  4. 🧪  Tester")
print("  5. 🚀  Deployer")
print()
print("Execution Flow:")
print("  Requirements → Architecture → Implementation → Testing → Deployment")
print("  Each agent passes results to the next stage")
print()
print("=== Agent Response ===")
print(result)
print()
print("=== Trace Information ===")
print(f"Run ID: {plugin.run_id}")
print(f"Trace includes:")
print("  • Sequential agent transfer events between each stage")
print("  • Individual agent runs with context passing")
print("  • Tool calls from each specialist")
print("  • Progress tracking through the pipeline")
print()
print("=== View Trace ===")
print(f"To view the sequential multi-agent trace, run:")
print(f"  watchtower show {plugin.run_id}")
print()
print("Filter by stage:")
print(f"  watchtower show {plugin.run_id} --agent requirements_gatherer")
print(f"  watchtower show {plugin.run_id} --agent architect")
print(f"  watchtower show {plugin.run_id} --agent implementer")
print(f"  watchtower show {plugin.run_id} --agent tester")
print(f"  watchtower show {plugin.run_id} --agent deployer")
