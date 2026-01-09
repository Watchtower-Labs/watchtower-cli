# Watchtower

[![CI](https://img.shields.io/github/actions/workflow/status/Watchtower-Labs/watchtower-cli/test.yml?branch=main&label=CI&logo=github)](https://github.com/Watchtower-Labs/watchtower-cli/actions)
[![npm](https://img.shields.io/npm/v/@watchtower/cli?logo=npm&label=CLI)](https://www.npmjs.com/package/@watchtower/cli)
[![PyPI](https://img.shields.io/pypi/v/watchtower-adk?logo=pypi&label=SDK)](https://pypi.org/project/watchtower-adk/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org/)

Terminal-based observability for [Google ADK](https://google.github.io/adk-docs/) agents. View traces, tail live events, and debug agent behavior without leaving your terminal.

```
┌─────────────────────────────────────────────────────────────┐
│ watchtower • Run: abc123 • 2024-01-15 14:32:01             │
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
pip install watchtower-adk
```

### CLI

```bash
npm install -g @watchtower/cli
```

Or with your preferred package manager:

```bash
# yarn
yarn global add @watchtower/cli

# pnpm
pnpm add -g @watchtower/cli
```

Or install from source:

```bash
git clone https://github.com/Watchtower-Labs/watchtower-cli.git
cd watchtower-cli
pnpm install && pnpm build:cli
cd packages/cli && pnpm link --global
```

## Quick Start

### 1. Add the plugin to your agent

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

async for event in runner.run_async(user_id, session_id, message):
    print(event.content)
```

### 2. Run your agent

```bash
python my_agent.py
```

Traces are automatically saved to `~/.watchtower/traces/`.

### 3. View the trace

```bash
watchtower show last
```

## CLI Commands

### `watchtower show [trace]`

View a saved trace file with interactive navigation.

```bash
# View the most recent trace
watchtower show last

# View by run ID
watchtower show abc123

# View by date and run ID
watchtower show 2024-01-15_abc123

# View a specific file
watchtower show ./path/to/trace.jsonl
```

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `↑` / `k` | Navigate up |
| `↓` / `j` | Navigate down |
| `Enter` | Expand event details |
| `b` / `Esc` | Back to list |
| `g` / `G` | Jump to start/end |
| `u` / `d` | Page up/down |
| `q` | Quit |

### `watchtower tail <script>`

Run a Python script and stream events live.

```bash
# Basic usage
watchtower tail python my_agent.py

# With script arguments (use -- to separate)
watchtower tail -- python my_agent.py --verbose --config prod.yaml
```

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `p` | Pause/resume stream |
| `Ctrl+C` | Stop agent and exit |
| `q` | Quit |

### `watchtower list`

List recent traces.

```bash
# List last 10 traces (default)
watchtower list

# List more traces
watchtower list --limit 50

# Filter by date
watchtower list --since 2024-01-10
```

### `watchtower config`

Manage CLI configuration.

```bash
# Show current configuration
watchtower config

# Initialize default config file
watchtower config --init

# Set a configuration value
watchtower config --set theme=light
watchtower config --set timestampFormat=absolute
```

## Documentation

| Document | Description |
|----------|-------------|
| [CLI Guide](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/CLI.md) | Detailed CLI usage and configuration |
| [SDK Guide](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/SDK.md) | Python SDK integration guide |
| [Architecture](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/ARCHITECTURE.md) | System design and internals |
| [Contributing](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/CONTRIBUTING.md) | How to contribute |

## SDK API

### Basic Usage

```python
from watchtower import AgentTracePlugin

# Default configuration - writes to ~/.watchtower/traces/
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
    trace_dir="~/.watchtower/traces",  # Where to save traces
    enable_file=True,                   # Write traces to files
    enable_stdout=False,                # Stream to stdout (for CLI tail)
    run_id=None,                        # Custom run ID (auto-generated if None)
)
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `WATCHTOWER_TRACE_DIR` | Override trace directory |
| `WATCHTOWER_LIVE` | Enable stdout streaming (set by CLI) |
| `WATCHTOWER_RUN_ID` | Override run ID (set by CLI) |
| `WATCHTOWER_CONFIG_DIR` | Override config directory |

### CLI-Spawned Mode

When using `watchtower tail`, enable stdout streaming:

```python
import os
from watchtower import AgentTracePlugin

plugin = AgentTracePlugin(
    enable_stdout=os.environ.get("WATCHTOWER_LIVE") == "1",
    run_id=os.environ.get("WATCHTOWER_RUN_ID"),
)
```

## Event Types

Watchtower captures these events from your agent:

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

`~/.watchtower/config.yaml`

```yaml
trace_dir: ~/.watchtower/traces
retention_days: 30
buffer_size: 10
sanitize_args: true
max_response_preview: 500
```

### CLI Configuration

`~/.watchtower/cli.yaml`

```yaml
theme: dark              # dark | light | minimal
max_events: 1000         # Max events to display
timestampFormat: relative  # relative | absolute | unix
default_python: python3  # Python executable for tail
```

## Trace File Format

Traces are stored as JSONL (newline-delimited JSON) in `~/.watchtower/traces/`.

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

By default, watchtower redacts sensitive data from tool arguments:

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
   ls ~/.watchtower/traces/
   ```

3. Check the plugin is writing to the expected directory:
   ```bash
   echo $WATCHTOWER_TRACE_DIR  # Override location, or empty for default
   ```

### Live tail not streaming events

1. Ensure `PYTHONUNBUFFERED=1` is set (done automatically by CLI)

2. Verify stdout streaming is enabled in your script:
   ```python
   enable_stdout=os.environ.get("WATCHTOWER_LIVE") == "1"
   ```

### CLI not rendering properly

1. Ensure your terminal supports ANSI colors
2. Try a different theme: `theme: minimal` in `~/.watchtower/cli.yaml`
3. Check terminal width (minimum 60 columns recommended)

## Testing

### Unit Tests

Run the comprehensive unit test suite:

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run all unit tests
pytest tests/test_basic.py -v

# Run with coverage
pytest tests/ --cov=watchtower --cov-report=html
```

**Tests cover:**
- Event creation and serialization
- File writer (JSONL output)
- Stdout writer (JSON-RPC format)
- Event collector (statistics)
- Argument sanitization
- Event normalization

### Integration Test

Test with real web searches:

```bash
python tests/test_real_search.py
```

This performs actual DuckDuckGo web searches and generates complete trace files with real data.

---

## Requirements

### Python SDK

- Python 3.10+
- google-adk >= 0.1.0

### CLI

- Node.js 20+
- Terminal with ANSI color support

## Development

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Watchtower-Labs/watchtower-cli.git
cd watchtower-cli

# Use correct Node version
nvm use

# Install dependencies
pnpm install

# Build CLI
pnpm build:cli

# Run tests
pnpm test
```

### CLI Development

```bash
# Watch mode (rebuild on changes)
pnpm dev:cli

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
```

### SDK Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Enable debug mode
WATCHTOWER_DEBUG=1 python your_script.py
```

See [CONTRIBUTING.md](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/CONTRIBUTING.md) for development guidelines.

## License

[MIT](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/LICENSE)

## Links

- [GitHub Repository](https://github.com/Watchtower-Labs/watchtower-cli)
- [Issue Tracker](https://github.com/Watchtower-Labs/watchtower-cli/issues)
- [Google ADK Documentation](https://google.github.io/adk-docs/)

---

Built for developers who live in the terminal.
