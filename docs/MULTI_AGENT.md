# Multi-Agent Systems with Watchtower

## Overview

Watchtower provides comprehensive observability for multi-agent systems built with Google ADK. This guide explains how to trace, visualize, and debug multi-agent workflows.

## Why Multi-Agent Systems?

Multi-agent systems solve complex problems by:
- **Specialization**: Different agents excel at specific tasks
- **Parallelism**: Independent tasks run concurrently
- **Collaboration**: Agents work together toward a goal
- **Scalability**: Distribute work across multiple processes

## Google ADK Multi-Agent Patterns

### 1. Sequential Agents

**Purpose**: Execute agents in a defined order, passing results to the next.

**Use Case**: Step-by-step workflows where each stage depends on the previous.

**When to Use**:
- Tasks must be completed in specific order
- Each task requires output from the previous task
- Clear pipeline stages (e.g., Requirements → Design → Build → Test)

**Example**: Software Development Pipeline

```python
from google.adk.agents import Agent
from google.adk.agents.sequential import SequentialAgent

# Create stage agents
requirements = Agent(name="requirements_gatherer", ...)
architecture = Agent(name="architect", ...)
implementation = Agent(name="implementer", ...)
testing = Agent(name="tester", ...)

# Sequential workflow
pipeline = SequentialAgent(
    name="dev_pipeline",
    sub_agents=[requirements, architecture, implementation, testing],
)

# Watchtower traces each stage transition
runner = InMemoryRunner(agent=pipeline, plugins=[plugin])
```

**Watchtower Events**:
- `run.start` / `run.end` for each agent
- `agent.transfer` events between stages
- Tool calls from each specialist

**Viewing**: `watchtower show last` shows timeline with stage transitions

---

### 2. Parallel Agents

**Purpose**: Multiple agents work simultaneously on independent tasks.

**Use Case**: Tasks that don't depend on each other and can run concurrently.

**When to Use**:
- Independent data gathering from multiple sources
- Parallel processing of similar data
- Batch processing tasks

**Example**: Multi-Source Research

```python
from google.adk.agents import Agent
from google.adk.agents.parallel import ParallelAgent

# Create parallel researchers
news_researcher = Agent(name="news_researcher", ...)
academic_researcher = Agent(name="academic_researcher", ...)
social_researcher = Agent(name="social_researcher", ...)

# Create aggregator
aggregator = Agent(name="aggregator", ...)

# Parallel workflow
research_team = ParallelAgent(
    name="research_team",
    sub_agents=[news_researcher, academic_researcher, social_researcher],
    aggregator=aggregator,
)

# Watchtower traces all parallel agent activity
runner = InMemoryRunner(agent=research_team, plugins=[plugin])
```

**Watchtower Events**:
- Parallel `run.start` events with timestamp overlaps
- Concurrent tool execution across agents
- Aggregated summary from aggregator agent
- `agent.transfer` to aggregator (if used)

**Viewing**: Timeline shows concurrent activity with agent swimlanes

---

### 3. Loop Agents

**Purpose**: Agent runs iteratively with feedback until convergence criteria is met.

**Use Case**: Tasks that improve through iterations.

**When to Use**:
- Quality improvement loops
- Optimization problems
- Iterative refinement

**Example**: Code Refinement Loop

```python
from google.adk.agents import Agent
from google.adk.agents.loop import LoopAgent

# Create agents
reviewer = Agent(name="code_reviewer", tools=[evaluate_code])
improver = Agent(name="code_improver", tools=[improve_code])

# Loop workflow with convergence
refinement_loop = LoopAgent(
    name="refinement_loop",
    sub_agents=[reviewer, improver],
    max_iterations=3,
    convergence_criteria="code_quality >= 8",
    initial_state={"code": "", "quality": 0, "feedback": []},
)

# Watchtower traces each iteration
runner = InMemoryRunner(agent=refinement_loop, plugins=[plugin])
```

**Watchtower Events**:
- Multiple loop iterations with same agents
- Quality score progression across iterations
- `state.change` events tracking improvement
- Convergence detection

**Viewing**: Timeline shows loop iterations with quality metrics

---

### 4. Parent-Child Agents

**Purpose**: Hierarchical agent relationships with orchestrator pattern.

**Use Case**: Complex tasks requiring coordination and delegation.

**When to Use**:
- Task requires central oversight
- Clear separation between orchestration and execution
- Specialist agents for different domains

**Example**: Content Creation Workflow

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner

# Create specialists
researcher = Agent(name="researcher", ...)
writer = Agent(name="writer", ...)
editor = Agent(name="editor", ...)

# Create orchestrator
orchestrator = Agent(
    name="orchestrator",
    instruction="Coordinate content creation: delegate to specialists, gather results, provide summary"
)

# Watchtower captures agent delegation
runner = InMemoryRunner(agent=orchestrator, plugins=[plugin])
```

**Watchtower Events**:
- Orchestrator `run.start` / `run.end`
- Specialist agent `run.start` / `run.end` when delegated
- `agent.transfer` events showing delegation
- Tool calls from each specialist

**Viewing**: Timeline shows orchestrator managing specialists

---

## Tracing Multi-Agent Workflows

### Event Types for Multi-Agent Systems

| Event | Multi-Agent Specifics |
|--------|---------------------|
| `run.start` | Each agent has its own run lifecycle |
| `run.end` | Individual agent completion |
| `agent.transfer` | **Multi-agent specific** - Agent handoff |
| `state.change` | Cross-agent state sharing |
| `llm.request` | Per-agent LLM interactions |
| `llm.response` | Per-agent token usage |
| `tool.start` | Per-agent tool calls |
| `tool.end` | Per-agent tool results |

### Agent Transfer Event

```json
{
  "type": "agent.transfer",
  "run_id": "abc123",
  "timestamp": 1705329121.847,
  "from_agent": "orchestrator",
  "to_agent": "writer",
  "reason": "delegated content drafting task",
  "framework": "google_adk"
}
```

**Transfer Patterns**:
- **Sequential**: stage_n → stage_n+1
- **Parallel**: specialist → aggregator
- **Loop**: reviewer → improver → reviewer
- **Parent-Child**: orchestrator → specialist

## Viewing Multi-Agent Traces

### Timeline View

Default view shows all events chronologically:

```
┌─────────────────────────────────────────────┐
│ watchtower • Multi-Agent Run: abc123   │
├─────────────────────────────────────────────┤
│ 14:32:01.000  ▶ run.start (orchestrator)         │
│ 14:32:01.012  → llm.request                   │
│ 14:32:01.850  ⚙ tool.start (delegate to researcher)│
│ 14:32:02.100  🔄 agent.transfer orchestrator→researcher│
│ 14:32:02.110  ▶ run.start (researcher)            │
│ 14:32:02.250  → llm.request                   │
│ 14:32:03.500  ⚙ tool.start (search)              │
│ 14:32:04.200  ✓ tool.end (search)               │
│ 14:32:04.250  ■ run.end (researcher)             │
│ 14:32:04.300  🔄 agent.transfer researcher→orchestrator│
│ ...                                       │
└─────────────────────────────────────────────┘
```

### Agent Panel

View per-agent metrics:

```
┌─────────────────────────────────────────────┐
│ Agent Metrics                           │
├─────────────────────────────────────────────┤
│ Agent          │ Runs │ Tokens │ Tools │ Time  │
│────────────────┼──────┼────────┼───────┼───────┤
│ orchestrator  │   1  │   150  │   2   │  4.2s  │
│ researcher     │   1  │   230  │   1   │  1.5s  │
│ writer        │   1  │   340  │   2   │  2.1s  │
│ editor        │   1  │   180  │   1   │  0.4s  │
└─────────────────────────────────────────────┘
```

### Filtering Multi-Agent Traces

All agents are shown in the timeline view. Use search (`/`) within the viewer to filter by agent name or event type:

```bash
watchtower show last
```

## Best Practices

### 1. Agent Naming

Use descriptive, consistent names:

```python
# ✅ Good
"requirements_gatherer"
"code_reviewer"
"content_orchestrator"

# ❌ Bad
"agent1"
"agent2"
"helper"
```

### 2. State Management

Share state explicitly:

```python
# ✅ Good - Explicit state sharing
initial_state = {
    "topic": "",
    "requirements": [],
    "architecture": "",
}

# ❌ Bad - Implicit state
# Relying on agent to pass context implicitly
```

### 3. Transfer Reasons

Provide clear transfer reasons:

```python
# ✅ Good - Clear reasons
"delegated content drafting to writer"
"passed research results to architect"
"assigned code review task to reviewer"

# ❌ Bad - Vague reasons
"next step"
"continue"
"process"
```

### 4. Convergence Criteria

Define clear convergence for loops:

```python
# ✅ Good - Measurable criteria
convergence_criteria="code_quality >= 8"
convergence_criteria="error_count == 0"
convergence_criteria="max_iterations"

# ❌ Bad - No convergence
# Loop runs indefinitely
```

### 5. Error Handling

Handle failures gracefully:

```python
# ✅ Good - Handle agent failures
try:
    result = specialist_agent.execute(task)
except Exception as e:
    logger.error(f"Specialist failed: {e}")
    # Continue with next step or alternative
```

### 6. Token Budgeting

Monitor per-agent token usage:

```python
# Track tokens per agent
agent_metrics = {
    "orchestrator": {"tokens": 150, "runs": 1},
    "researcher": {"tokens": 230, "runs": 1},
    "writer": {"tokens": 340, "runs": 1},
}

# Identify expensive agents
most_expensive = max(agent_metrics, key=lambda x: agent_metrics[x]["tokens"])
```

## Troubleshooting

### Agent Transfers Not Appearing

**Symptom**: `agent.transfer` events not in traces

**Solutions**:
1. Verify using Google ADK framework (full multi-agent support)
2. Check agents are properly configured in Sequential/Parallel/Loop
3. Ensure `AgentTracePlugin()` is added to runner
4. Check that agent names are unique

### Cannot Distinguish Between Agents

**Symptom**: Multiple agent runs look the same

**Solutions**:
1. Use descriptive agent names
2. Use search (`/`) in the trace viewer to filter by agent name
3. Check agent IDs in trace events

### Parallel Execution Timing Issues

**Symptom**: Agents not running truly in parallel

**Solutions**:
1. Verify `ParallelAgent` configuration
2. Check for unintended sequential dependencies
3. Review aggregator configuration
4. Monitor timeline for concurrent activity

### Loop Not Converging

**Symptom**: Loop runs maximum iterations without convergence

**Solutions**:
1. Check convergence criteria is achievable
2. Review quality scoring logic
3. Adjust max_iterations if needed
4. Verify state changes between iterations

### Performance Issues

**Symptom**: Multi-agent workflow is slow

**Solutions**:
1. Profile each agent's execution time
2. Identify bottlenecks
3. Consider parallel optimization for sequential workflows
4. Add timeout to individual agents

## Examples

- `examples/multi_agent_basic.py` - Parent-child hierarchy
- `examples/multi_agent_sequential.py` - Sequential workflow
- `examples/multi_agent_parallel.py` - Parallel execution
- `examples/multi_agent_loop.py` - Iterative optimization

## Advanced Topics

### Cross-Agent Communication

Google ADK supports Agent-to-Agent (A2A) communication:

```python
# Direct agent communication
agent_a.send_message_to("agent_b", "Here's the data you requested")

# Watchtower captures A2A events
# agent.transfer events include communication details
```

### Shared State

Manage shared state across agents:

```python
# Define shared state schema
shared_state = {
    "user_request": "",
    "research_findings": {},
    "draft_content": "",
    "final_content": "",
}

# Agents read/write to shared state
# Watchtower traces state.change events
```

### Multi-Agent Debugging

Debug multi-agent workflows:

```bash
# Live monitor all agents
watchtower tail python my_agent.py

# View trace with all agent events
watchtower show last
```

## Future Enhancements

Watchtower will add advanced multi-agent features in future releases:

### v0.2.0 (Planned)
- Dedicated multi-agent timeline view with swimlanes
- Agent graph visualization showing relationships
- Enhanced agent panel with comparison metrics
- Multi-agent filtering options
- Agent performance heat maps

### v0.3.0 (Considered)
- Real-time multi-agent orchestration
- Dynamic agent routing
- Agent pool management
- Multi-agent collaboration features

## Resources

- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [Google Cloud Codelabs](https://codelabs.developers.google.com/codelabs/adk)
- [Watchtower SDK Guide](../docs/SDK.md)
- [Watchtower CLI Guide](../docs/CLI.md)
- [Examples](../examples/)

## Contributing

Have multi-agent examples or improvements? Contributions welcome!

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
