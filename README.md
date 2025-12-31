# agenttrace

Terminal-based observability for Google ADK agents. View traces, tail live events, and debug agent behavior without leaving your terminal.

```
┌─────────────────────────────────────────────────────────────┐
│ agenttrace • Run: abc123 • 2024-01-15 14:32:01             │
├─────────────────────────────────────────────────────────────┤
│ Duration: 4.2s  LLM Calls: 3  Tool Calls: 5  Tokens: 2,847 │
├─────────────────────────────────────────────────────────────┤
│ 14:32:01.000  ▶ run.start                                  │
│ 14:32:01.012  → llm.request     gemini-2.0-flash           │
│ 14:32:01.847  ← llm.response    1,203 tokens  835ms        │
│ 14:32:01.850  ⚙ tool.start      search_web                 │
│ 14:32:02.341  ✓ tool.end        search_web     491ms       │
│ 14:32:02.345  → llm.request     gemini-2.0-flash           │
│ 14:32:03.201  ← llm.response    892 tokens    856ms        │
│ 14:32:03.205  ■ run.end                                    │
├─────────────────────────────────────────────────────────────┤
│ [↑↓] Navigate  [Enter] Expand  [q] Quit                    │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Zero-config setup** — Add one line to your agent, traces start flowing
- **Live tailing** — Stream events in real-time as your agent runs
- **Passive viewing** — Analyze past traces with full timeline navigation
- **Local-first** — All data stays on your machine, no external services
- **Minimal overhead** — <5% runtime impact on agent execution

## Installation

### Python SDK

```bash
pip install agenttrace
```

### CLI

```bash
npm install -g agenttrace
```

Or with your preferred package manager:

```bash
# yarn
yarn global add agenttrace

# pnpm
pnpm add -g agenttrace
```

## Quick Start

### 1. Add the plugin to your agent

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from agenttrace import AgentTracePlugin

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

async for event in runner.run_async(user_id, session_id, message):
    print(event.content)
```

### 2. Run your agent

```bash
python my_agent.py
```

Traces are automatically saved to `~/.agenttrace/traces/`.

### 3. View the trace

```bash
agenttrace show last
```

## CLI Commands

### `agenttrace show [trace]`

View a saved trace file with interactive navigation.

```bash
# View the most recent trace
agenttrace show last

# View by run ID
agenttrace show abc123

# View by date and run ID
agenttrace show 2024-01-15_abc123

# View a specific file
agenttrace show ./path/to/trace.jsonl
```

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate events |
| `Enter` | Expand event details |
| `b` / `Esc` | Back to list |
| `q` | Quit |

### `agenttrace tail <script>`

Run a Python script and stream events live.

```bash
# Basic usage
agenttrace tail python my_agent.py

# With script arguments (use -- to separate)
agenttrace tail -- python my_agent.py --verbose --config prod.yaml
```

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `p` | Pause/resume stream |
| `Ctrl+C` | Stop agent and exit |
| `q` | Quit |

### `agenttrace list`

List recent traces.

```bash
# List last 10 traces (default)
agenttrace list

# List more traces
agenttrace list --limit 50

# Filter by date
agenttrace list --since 2024-01-10
```

## SDK API

### Basic Usage

```python
from agenttrace import AgentTracePlugin

# Default configuration - writes to ~/.agenttrace/traces/
plugin = AgentTracePlugin()

# Add to your runner
runner = InMemoryRunner(
    agent=agent,
    app_name="my_app",
    plugins=[plugin],
)
```

### Configuration Options

```python
plugin = AgentTracePlugin(
    trace_dir="~/.agenttrace/traces",  # Where to save traces
    enable_file=True,                   # Write traces to files
    enable_stdout=False,                # Stream to stdout (for CLI tail)
    run_id=None,                        # Custom run ID (auto-generated if None)
)
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENTTRACE_DIR` | Override trace directory |
| `AGENTTRACE_LIVE` | Enable stdout streaming (set by CLI) |
| `AGENTTRACE_RUN_ID` | Override run ID (set by CLI) |
| `AGENTTRACE_DISABLE` | Disable all tracing |

### CLI-Spawned Mode

When using `agenttrace tail`, enable stdout streaming:

```python
import os
from agenttrace import AgentTracePlugin

plugin = AgentTracePlugin(
    enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
    run_id=os.environ.get("AGENTTRACE_RUN_ID"),
)
```

## Event Types

agenttrace captures these events from your agent:

| Event | Description |
|-------|-------------|
| `run.start` | Agent invocation begins |
| `run.end` | Agent invocation completes |
| `llm.request` | LLM call initiated |
| `llm.response` | LLM response received |
| `tool.start` | Tool execution begins |
| `tool.end` | Tool execution completes |
| `tool.error` | Tool execution failed |
| `state.change` | Session state modified |
| `agent.transfer` | Multi-agent handoff |

## Configuration Files

### SDK Configuration

`~/.agenttrace/config.yaml`

```yaml
trace_dir: ~/.agenttrace/traces
retention_days: 30
buffer_size: 10
sanitize_args: true
max_response_preview: 500
```

### CLI Configuration

`~/.agenttrace/cli.yaml`

```yaml
theme: dark              # dark | light | minimal
max_events: 1000         # Max events to display
timestamp_format: relative  # relative | absolute | unix
default_python: python3  # Python executable for tail
```

## Trace File Format

Traces are stored as JSONL (newline-delimited JSON) in `~/.agenttrace/traces/`.

**File naming:** `{date}_{run_id}.jsonl`

**Example:** `2024-01-15_abc123.jsonl`

```jsonl
{"type":"run.start","run_id":"abc123","timestamp":1705329121.000,"agent_name":"my_agent"}
{"type":"llm.request","run_id":"abc123","timestamp":1705329121.012,"model":"gemini-2.0-flash"}
{"type":"llm.response","run_id":"abc123","timestamp":1705329121.847,"duration_ms":835,"total_tokens":1203}
{"type":"tool.start","run_id":"abc123","timestamp":1705329121.850,"tool_name":"search_web"}
{"type":"tool.end","run_id":"abc123","timestamp":1705329122.341,"tool_name":"search_web","duration_ms":491}
{"type":"run.end","run_id":"abc123","timestamp":1705329123.415,"duration_ms":2415}
```

## Security

### Argument Sanitization

By default, agenttrace redacts sensitive data from tool arguments:

```python
# Input
{"api_key": "sk-1234", "query": "search term"}

# Stored
{"api_key": "[REDACTED]", "query": "search term"}
```

Patterns matched: `password`, `secret`, `token`, `api_key`, `auth`, `credential`

### File Permissions

The trace directory is created with restricted permissions (`0700`), readable only by the owner.

### Local-Only

All data stays on your machine. No external services, no telemetry, no network calls.

## Troubleshooting

### Traces not appearing

1. Verify the plugin is added to your runner:
   ```python
   plugins=[AgentTracePlugin()]
   ```

2. Check the trace directory exists:
   ```bash
   ls ~/.agenttrace/traces/
   ```

3. Ensure tracing isn't disabled:
   ```bash
   echo $AGENTTRACE_DISABLE  # Should be empty or unset
   ```

### Live tail not streaming events

1. Ensure `PYTHONUNBUFFERED=1` is set (done automatically by CLI)

2. Verify stdout streaming is enabled in your script:
   ```python
   enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1"
   ```

### CLI not rendering properly

1. Ensure your terminal supports ANSI colors
2. Try a different theme: `theme: minimal` in `~/.agenttrace/cli.yaml`
3. Check terminal width (minimum 60 columns recommended)

## Requirements

### Python SDK

- Python 3.9+
- google-adk >= 0.1.0

### CLI

- Node.js 18+
- Terminal with ANSI color support

## License

MIT

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

Built for developers who live in the terminal.
