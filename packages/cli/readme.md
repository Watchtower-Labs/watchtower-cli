# @watchtower/cli

Terminal UI for viewing Google ADK agent traces. Part of the [Watchtower](https://github.com/anthropics/watchtower-cli) observability toolkit.

## Installation

```bash
npm install -g @watchtower/cli
# or
pnpm add -g @watchtower/cli
```

## Usage

### View Saved Traces

```bash
# View the most recent trace
watchtower show last

# View a specific trace by run ID
watchtower show abc123

# View a trace file directly
watchtower show ./path/to/trace.jsonl
```

**Keyboard shortcuts:**
- `↑`/`↓` or `j`/`k` - Navigate events
- `Enter` - Expand event details
- `b` or `Esc` - Go back
- `u`/`d` - Page up/down
- `g`/`G` - Jump to start/end
- `q` - Quit

### Live Tail

Stream events in real-time from a running agent:

```bash
# Run a Python agent with live streaming
watchtower tail python my_agent.py

# With arguments
watchtower tail -- python my_agent.py --config prod.yaml
```

**Keyboard shortcuts:**
- `p` - Pause/Resume streaming
- `Ctrl+C` - Stop the process
- `q` - Quit

### List Traces

Browse recent traces:

```bash
# List 10 most recent traces
watchtower list

# List more traces
watchtower list -n 50

# Filter by date
watchtower list --since 2024-01-15
```

### Configuration

```bash
# Show current configuration
watchtower config

# Create default config file
watchtower config init

# Update settings
watchtower config set theme dark
watchtower config set maxEvents 500
watchtower config set timestampFormat absolute
```

Configuration is stored in `~/.watchtower/cli.yaml`.

**Available settings:**

| Setting | Values | Default | Description |
|---------|--------|---------|-------------|
| `theme` | `dark`, `light`, `minimal` | `dark` | Color theme |
| `maxEvents` | number | `1000` | Maximum events to display |
| `timestampFormat` | `relative`, `absolute`, `unix` | `absolute` | Timestamp display format |
| `defaultPython` | string | `python3` | Python executable for tail command |

## Trace File Format

Traces are stored as JSONL (newline-delimited JSON) files in `~/.watchtower/traces/`.

Filename format: `{date}_{run_id}.jsonl`

Example: `2024-01-15_abc123.jsonl`

### Event Types

| Event | Description |
|-------|-------------|
| `run.start` | Agent invocation begins |
| `run.end` | Agent invocation completes |
| `llm.request` | LLM API call initiated |
| `llm.response` | LLM API response received |
| `tool.start` | Tool execution begins |
| `tool.end` | Tool execution completes |
| `tool.error` | Tool execution failed |
| `state.change` | Session state modified |
| `agent.transfer` | Multi-agent handoff |

## Python SDK Integration

To generate traces, use the Watchtower Python SDK with your Google ADK agent:

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin

agent = Agent(
    name="my_agent",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant.",
    tools=[my_tool],
)

runner = InMemoryRunner(
    agent=agent,
    app_name="my_app",
    plugins=[AgentTracePlugin()],  # Add this line
)

# Run as normal - traces are automatically saved
async for event in runner.run_async(user_id, session_id, message):
    print(event.content)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `WATCHTOWER_TRACE_DIR` | Override trace directory (default: `~/.watchtower/traces`) |
| `WATCHTOWER_CONFIG_DIR` | Override config directory (default: `~/.watchtower`) |

## Development

```bash
# Clone the repo
git clone https://github.com/anthropics/watchtower-cli
cd watchtower-cli

# Install dependencies
pnpm install

# Build CLI
pnpm build:cli

# Run in development mode
pnpm dev:cli
```

## License

MIT
