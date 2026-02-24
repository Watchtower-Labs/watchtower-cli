"""
Loop-based multi-agent workflow using Google ADK.

Agent runs iteratively with feedback until convergence.
"""

from google.adk.agents import Agent, LoopAgent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin


def evaluate_code(code: str) -> str:
    """Evaluate code quality."""
    # Simulated evaluation metrics
    quality_score = min(10, len(code.split('\n')) // 10)  # 10 max score
    issues = []
    if 'TODO' in code:
        issues.append('contains TODO')
    if len(code.split('\n')) < 20:
        issues.append('too short')

    return f"Code quality: {quality_score}/10. " \
           f"Lines: {len(code.split('\n'))}. " \
           f"Issues: {', '.join(issues) if issues else 'None'}."


def improve_code(code: str, feedback: str) -> str:
    """Improve code based on feedback."""
    # Simulated improvement
    improved = code
    if 'TODO' in feedback:
        improved = code.replace('TODO', '# TODO - Implemented')
    if 'too short' in feedback:
        improved = code + '\n# Added documentation'
    if 'quality' in feedback:
        improved = code + '\n# Improved structure'

    return improved


# Code reviewer agent
reviewer = Agent(
    name="code_reviewer",
    model="gemini-2.0-flash",
    instruction=(
        "Review the code and provide specific improvement feedback. "
        "Use the evaluate_code tool. Assess quality, completeness, and best practices. "
        "Be specific and actionable."
    ),
    tools=[evaluate_code],
)

# Code improver agent
improver = Agent(
    name="code_improver",
    model="gemini-2.0-flash",
    instruction=(
        "Improve the code based on the reviewer's feedback. "
        "Use the improve_code tool. Make targeted improvements to address the feedback. "
        "Return the improved code."
    ),
    tools=[improve_code],
)

# Loop workflow - iteratively improve up to max_iterations
code_refinement_loop = LoopAgent(
    name="refinement_loop",
    sub_agents=[reviewer, improver],
    max_iterations=3,
)

# Watchtower traces each iteration of the loop
plugin = AgentTracePlugin()

# Run loop-based multi-agent workflow
runner = InMemoryRunner(agent=code_refinement_loop, plugins=[plugin])
result = runner.run(
    user_message="Implement and refine a function to calculate fibonacci numbers"
)

print("=== Multi-Agent Workflow: Code Refinement Loop ===")
print("Pattern: Iterative Loop")
print()
print("Loop Agents:")
print("  🔍 Code Reviewer (evaluates)")
print("  ✏️  Code Improver (refines)")
print()
print("Execution Flow:")
print("  Reviewer → Improver → Reviewer → Improver → Reviewer → ...")
print("  Continue until convergence criteria met or max iterations reached")
print()
print("Loop configuration:")
print("  • Maximum iterations: 3")
print()
print("Benefits of Loop Execution:")
print("  • Iterative improvement")
print("  • Quality feedback loop")
print("  • Automatic convergence detection")
print("  • Prevents over-optimization")
print()
print("=== Agent Response ===")
print(result)
print()
print("=== Trace Information ===")
print(f"Run ID: {plugin.run_id}")
print(f"Trace includes:")
print("  • Multiple loop iterations with agent transfers")
print("  • Quality feedback from reviewer")
print("  • Code improvements from improver")
print("  • Convergence tracking")
print("  • Individual agent runs per iteration")
print()
print("=== View Trace ===")
print(f"To view the loop-based multi-agent trace, run:")
print(f"  watchtower show {plugin.run_id}")
print()
print("Use / search in the trace viewer to filter by agent name.")
