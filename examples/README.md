# Watchtower Examples

This directory contains example agents demonstrating how to use watchtower for observability.

## Examples

### simple_agent.py

A basic example showing minimal watchtower integration with a Google ADK agent.

**Features demonstrated:**
- Adding the `AgentTracePlugin` to a runner
- Automatic trace file generation
- Tool call tracking
- LLM interaction monitoring

**Run the example:**

```bash
# Basic run (traces saved to ~/.watchtower/traces/)
python examples/simple_agent.py

# View the trace
watchtower show last

# Live tail mode
watchtower tail python examples/simple_agent.py
```

## Mock Mode

The examples include mock implementations of Google ADK classes for testing
without requiring the actual `google-adk` package. This allows you to:

1. Test the watchtower SDK structure
2. Verify event emission
3. Check trace file generation
4. Validate CLI integration

In production, remove the mock classes and install the real `google-adk` package:

```bash
pip install google-adk watchtower
```

## Creating Your Own Agent

Here's the minimal code to add watchtower to your agent:

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin

# Your agent
agent = Agent(
    name="my_agent",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant.",
    tools=[my_tool],
)

# Add watchtower with one line
runner = InMemoryRunner(
    agent=agent,
    app_name="my_app",
    plugins=[AgentTracePlugin()],  # <-- Add this
)

# Run normally - traces are automatic
async for event in runner.run_async(user_id, session_id, message):
    print(event.content)
```

## Configuration

### Environment Variables

- `AGENTTRACE_LIVE=1` - Enable stdout streaming (set automatically by `watchtower tail`)
- `AGENTTRACE_RUN_ID=xyz` - Custom run ID (set automatically by `watchtower tail`)
- `AGENTTRACE_DISABLE=1` - Disable all tracing
- `AGENTTRACE_DIR=/path` - Custom trace directory

### Plugin Options

```python
plugin = AgentTracePlugin(
    trace_dir="~/.watchtower/traces",  # Where to save traces
    enable_file=True,                   # Write to files
    enable_stdout=False,                # Stream to stdout
    run_id=None,                        # Custom run ID (auto-generated if None)
    sanitize=True,                      # Redact sensitive data
)
```

## Viewing Traces

After running an agent:

```bash
# View the most recent trace
watchtower show last

# View a specific run
watchtower show abc123

# List all traces
watchtower list

# View from a specific file
watchtower show ./path/to/trace.jsonl
```

## Next Steps

1. Try the example: `python examples/simple_agent.py`
2. View the trace: `watchtower show last`
3. Try live tailing: `watchtower tail python examples/simple_agent.py`
4. Integrate into your own agent
