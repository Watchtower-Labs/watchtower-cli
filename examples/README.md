# Watchtower Examples

This directory contains example code demonstrating Watchtower's features.

## Quick Start

1. Install dependencies:
   ```bash
   pip install watchtower-adk anthropic openai google-adk
   ```

2. Set API keys:
   ```bash
   export ANTHROPIC_API_KEY=your-key
   export OPENAI_API_KEY=your-key
   ```

3. Run example:
   ```bash
   python examples/anthropic_basic.py
   ```

## Single-Agent Examples

### Anthropic Claude
- `anthropic_basic.py` - Basic Anthropic API usage with observability

**Features demonstrated**:
- Observer initialization
- LLM call observation
- Token usage tracking
- Response handling

**Usage**:
```bash
python examples/anthropic_basic.py
```

### OpenAI GPT
- `openai_basic.py` - Basic OpenAI API usage with observability

**Features demonstrated**:
- Observer initialization
- LLM call observation
- Token usage tracking
- Response handling

**Usage**:
```bash
python examples/openai_basic.py
```

## Multi-Agent Examples (Google ADK)

Watchtower provides comprehensive multi-agent observability through Google ADK.

### Basic Multi-Agent (Parent-Child Hierarchy)
- `multi_agent_basic.py` - Orchestrator delegates to specialist agents

**Pattern**: Parent-Child
**Features demonstrated**:
- Orchestrator agent coordination
- Specialist agent delegation
- Agent transfer events
- Shared state management

**Usage**:
```bash
python examples/multi_agent_basic.py
```

### Sequential Multi-Agent Workflow
- `multi_agent_sequential.py` - Step-by-step pipeline with multiple agents

**Pattern**: Sequential
**Features demonstrated**:
- Sequential agent execution
- Data passing between agents
- Pipeline workflow orchestration

**Usage**:
```bash
python examples/multi_agent_sequential.py
```

### Parallel Multi-Agent Execution
- `multi_agent_parallel.py` - Multiple agents working concurrently

**Pattern**: Parallel
**Features demonstrated**:
- Concurrent agent execution
- Result aggregation
- Parallel workflow coordination

**Usage**:
```bash
python examples/multi_agent_parallel.py
```

### Loop-Based Multi-Agent
- `multi_agent_loop.py` - Iterative optimization with feedback

**Pattern**: Loop
**Features demonstrated**:
- Iterative agent execution
- Convergence criteria
- Quality improvement loop

**Usage**:
```bash
python examples/multi_agent_loop.py
```

## Viewing Traces

### View Saved Traces

After running examples, view traces with the CLI:

```bash
# View most recent trace
watchtower show last

# View by run ID
watchtower show abc123

# View by date and run ID
watchtower show 2024-01-15_abc123

# View a specific file
watchtower show ~/.watchtower/traces/2024-01-15_abc123.jsonl
```

### Live Tailing

Stream events in real-time as your agent runs:

```bash
# Tail any Python script
watchtower tail python examples/anthropic_basic.py

# Tail with custom settings
watchtower tail --max-events-per-second 200 -- python examples/multi_agent_parallel.py
```

### Multi-Agent Viewing

For multi-agent examples, use agent-specific views:

```bash
# View all agents in timeline
watchtower show last

# Filter by specific agent
watchtower show last --agent writer

# View agent comparison
watchtower show last --view agents
```

## Multi-Agent Patterns

### When to Use Each Pattern

| Pattern | Best For | Example |
|----------|-----------|---------|
| **Sequential** | Tasks must be done in order | Development pipeline, document processing |
| **Parallel** | Independent tasks | Multi-source research, batch processing |
| **Loop** | Iterative improvement | Code optimization, content refinement |
| **Parent-Child** | Task delegation | Content creation, specialized workflows |

### Google ADK Multi-Agent Components

- **SequentialAgent** - Execute agents in defined order
- **ParallelAgent** - Run agents concurrently
- **LoopAgent** - Iterate with convergence criteria
- **Agent** - Base agent for parent-child hierarchies

## Troubleshooting

### Traces Not Appearing

1. Verify plugin is added to runner:
   ```python
   runner = InMemoryRunner(agent=agent, plugins=[plugin])
   ```

2. Check trace directory:
   ```bash
   ls ~/.watchtower/traces
   ```

3. Verify environment variables:
   ```bash
   echo $WATCHTOWER_TRACE_DIR
   ```

### Multi-Agent Specific Issues

**Agent transfers not appearing in traces**:
- Verify using Google ADK framework (full multi-agent support)
- Check that agents are properly configured in Sequential/Parallel/Loop

**Cannot distinguish between agents in timeline**:
- Use descriptive agent names
- Enable multi-agent timeline view: `watchtower show last --view multi-agent`
- Filter by agent: `watchtower show last --agent agent_name`

## More Resources

- [Multi-Agent Guide](../docs/MULTI_AGENT.md) - Comprehensive multi-agent documentation
- [Framework Support](../docs/MULTI_FRAMEWORK_SUPPORT.md) - Framework-specific guides
- [SDK Documentation](../docs/SDK.md) - Python SDK API reference
- [CLI Guide](../docs/CLI.md) - CLI usage and configuration

## Contributing

Have an improvement or new example? Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Add your example
4. Update this README with your example
5. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.
