# Watchtower

[![CI](https://img.shields.io/github/actions/workflow/status/Watchtower-Labs/watchtower-cli/test.yml?branch=main&label=CI&logo=github)](https://github.com/Watchtower-Labs/watchtower-cli/actions)
[![npm](https://img.shields.io/npm/v/@watchtower/cli?logo=npm&label=CLI)](https://www.npmjs.com/package/@watchtower/cli)
[![PyPI](https://img.shields.io/pypi/v/watchtower-adk?logo=pypi&label=SDK)](https://pypi.org/project/watchtower-adk/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org/)

Terminal-based observability for AI agent frameworks. View traces, tail live events, and debug agent behavior without leaving your terminal.

**Now supports multiple frameworks:**
- ✅ [Google ADK](https://google.github.io/adk-docs/)
- ✅ [Anthropic Claude](https://www.anthropic.com/)
- ✅ [OpenAI GPT](https://openai.com/)

````
┌─────────────────────────────────────────────┐
│ watchtower • Run: abc123 • 2024-01-15 14:32:01             │
├─────────────────────────────────────────────────────┤
│ Duration:4.2s  LLM Calls: 3  Tool Calls: 5  Tokens: 2,847 │
├─────────────────────────────────────────────────────┤
│ 14:32:01.000  ▶ run.start                                  │
│ 14:32:01.012  → llm.request     gemini-2.0-flash           │
│ 14:32:01.847  ← llm.response    1,203 tokens 835ms        │
│ 14:32:01.850  ⚙ tool.start      search_web                 │
│ 14:32:02.341  ✓ tool.end        search_web     491ms       │
│ 14:32:02.345  → llm.request     gemini-2.0-flash           │
│ 14:32:03.201  ← llm.response    892 tokens    856ms        │
│ 14:32:03.205  ■ run.end                                    │
├─────────────────────────────────────────────────────┤
│ [↑↓] Navigate  [Enter] Expand  [q] Quit                    │
└─────────────────────────────────────────────────────┘
```

## Features

- **Zero-config setup** — Add one line to your agent, traces start flowing
- **Live tailing** — Stream events in real-time as your agent runs
- **Passive viewing** — Analyze past traces with full timeline navigation
- **Local-first** — All data stays on your machine, no external services
- **Minimal overhead** — <5% runtime impact on agent execution
- **Multi-framework support** — Google ADK, Anthropic, OpenAI, and more

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

### Using Google ADK

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin

agent = Agent(name="my_agent", model="gemini-2.0-flash", instruction="You are a helpful assistant.")
plugin = AgentTracePlugin()
runner = InMemoryRunner(agent=agent, plugins=[plugin])
result = runner.run(user_message="Hello, how are you today?")
```

### Using Anthropic Claude ⭐ NEW

```python
from watchtower.sdk import create_for_anthropic

# Set API key
observer = create_for_anthropic(api_key="your-api-key")

# Call Claude API with observability
response = observer.observe_llm_call([
    {"role": "user", "content": "Hello!"}
])

print(response.content[0].text)
```

See [examples/anthropic_basic.py](examples/anthropic_basic.py) for a complete interactive example.

### Using OpenAI GPT ⭐ NEW

```python
from watchtower.sdk import create_for_openai

observer = create_for_openai(api_key="your-api-key", model="gpt-4o")

# Call GPT API with observability
response = observer.observe_llm_call([
    {"role": "user", "content": "Hello!"}
])

print(response.choices[0].message.content)
```

See [examples/openai_basic.py](examples/openai_basic.py) for a complete interactive example.

### Auto-Detection

```python
from watchtower.sdk import Watchtower

# Automatically detects framework from installed packages
observer = Watchtower.create_observer(
    trace_dir="./traces",
    enable_stdout=True,
)
```

## CLI Commands

### `watchtower show [trace]`

View a saved trace file with interactive navigation.

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

### `watchtower list`

List recent trace files.

```bash
watchtower list

# List last 10 traces
watchtower list --limit 10

# Filter by date
watchtower list --since 2024-01-15

```

### `watchtower tail <script>`

Run a Python script and stream events in real-time.

```bash
watchtower tail my_agent.py

# Override live stream rate limiting
watchtower tail --max-events-per-second 200 --burst-size 50 -- python my_agent.py
```

**Keyboard shortcuts:**
| Key | Action |
|-----|--------|
| `↑` / `k` | Navigate up |
| `↓` / `j` | Navigate down |
| `Enter` | Expand event details |
| `Esc` | Back to list |
| `q` | Quit |
| `PageUp` | Previous page |
| `PageDown` | Next page |
| `Home` | Jump to start |
| `End` | Jump to end |
| `/` | Search |
| `*` | Bookmark |

### `watchtower config`

Manage CLI configuration.

```bash
# Show current configuration
watchtower config

# Initialize default config file
watchtower config init

# Set a configuration value
watchtower config set theme light
watchtower config set timestampFormat absolute
watchtower config set liveMaxEventsPerSecond 120
watchtower config set liveBurstSize 30
watchtower config set showPageSize 200
```

## CLI Output Examples

### Live Streaming
```
┌─────────────────────────────────────────────────────┐
│ watchtower • Run: abc123 • 2024-01-15 14:32:01             │
├─────────────────────────────────────────────────────┤
│ Duration:4.2s  LLM Calls: 3  Tool Calls: 5  Tokens: 2,847 │
├─────────────────────────────────────────────────────┤
│ 14:32:01.000  ▶ run.start                                  │
│ 14:32:01.012  → llm.request     gemini-2.0-flash           │
│ 14:32:01.847  ← llm.response    1,203 tokens 835ms        │
│ 14:32:01.850  ⚙ tool.start      search_web                 │
│ 14:32:02.341  ✓ tool.end        search_web     491ms       │
│ 14:32:02.345  → llm.request     gemini-2.0-flash           │
│ 14:32:03.201  ← llm.response    892 tokens    856ms        │
│ 14:32:03.205  ■ run.end                                    │
├─────────────────────────────────────────────────────┤
│ [↑↓] Navigate  [Enter] Expand  [q] Quit                    │
└─────────────────────────────────────────────────────┘
```

## Framework Support

Watchtower now supports multiple AI agent frameworks. All frameworks use the same unified trace format and can be viewed with the same CLI.

| Framework | Status | Getting Started | Documentation |
|-----------|--------|---------------|--------------|
| Google ADK | ✅ Production | [Quick Start - For Google ADK](#using-google-adk) | [docs/MULTI_FRAMEWORK_SUPPORT.md](docs/MULTI_FRAMEWORK_SUPPORT.md) |
| Anthropic | ✅ Production | [Quick Start - For Anthropic Claude](#using-anthropic-claude) | [docs/MULTI_FRAMEWORK_SUPPORT.md](docs/MULTI_FRAMEWORK_SUPPORT.md) |
| OpenAI | ✅ Production | [Quick Start - For OpenAI GPT](#using-openai-gpt) | [docs/MULTI_FRAMEWORK_SUPPORT.md](docs/MULTI_FRAMEWORK_SUPPORT.md) |

See [docs/MULTI_FRAMEWORK_SUPPORT.md](docs/MULTI_FRAMEWORK_SUPPORT.md) for detailed framework-specific documentation.

## Multi-Agent Support

Watchtower provides comprehensive observability for multi-agent systems through Google ADK.

### Google ADK (Full Multi-Agent Support)

- ✅ **Sequential agents** - Step-by-step workflows
  - Use case: Development pipeline (Requirements → Architecture → Implementation → Testing)
  - Example: `examples/multi_agent_sequential.py`

- ✅ **Parallel agents** - Concurrent task execution
  - Use case: Parallel research across multiple sources
  - Example: `examples/multi_agent_parallel.py`

- ✅ **Loop agents** - Iterative optimization
  - Use case: Code refinement with quality feedback
  - Example: `examples/multi_agent_loop.py`

- ✅ **Parent-child hierarchies** - Orchestrator + specialist agents
  - Use case: Task delegation and coordination
  - Example: `examples/multi_agent_basic.py`

- ✅ **Agent-to-Agent (A2A) communication tracing**
  - Automatic `agent.transfer` event capture
  - Visual timeline with agent transitions
  - Per-agent metrics and filtering

### Anthropic & OpenAI (Limited Multi-Agent Support)

- ⚠️ **Single-agent focus** - Trace individual agent runs
- ⚠️ **Manual multi-agent** - Build orchestration yourself
- ⚠️ **No automatic transfer events** - Track agents separately

### Viewing Multi-Agent Traces

```bash
# View all agents in timeline
watchtower show last

# Filter by specific agent
watchtower show last --agent writer

# View agent comparison
watchtower show last --view agents

# Live multi-agent monitoring
watchtower tail python examples/multi_agent_parallel.py
```

### Multi-Agent Documentation

- **[docs/MULTI_AGENT.md](docs/MULTI_AGENT.md)** - Comprehensive multi-agent guide
  - Google ADK orchestration patterns
  - Agent-to-Agent communication
  - Tracing multi-agent workflows
  - Best practices and troubleshooting

See [docs/MULTI_AGENT.md](docs/MULTI_AGENT.md) for complete multi-agent documentation.

## Documentation

- [Multi-Framework Support](docs/MULTI_FRAMEWORK_SUPPORT.md) - Complete guide for all frameworks
- [SDK Guide](docs/SDK.md) - Python SDK documentation
- [CLI Guide](docs/CLI.md) - CLI usage and configuration
- [Architecture](docs/ARCHITECTURE.md) - System design and internals
- [Contributing](CONTRIBUTING.md) - How to contribute

## SDK API

### Basic Usage (Google ADK)

```python
from watchtower import AgentTracePlugin
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner

# Default configuration - writes to ~/.watchtower/traces/
plugin = AgentTracePlugin()

# Add to your runner
runner = InMemoryRunner(
    agent=agent,
    app_name="my_app",
    plugins=[plugin],
)
```

### Advanced Usage (Anthropic / OpenAI)

```python
from watchtower.sdk import create_for_anthropic, create_for_openai

# Anthropic Claude
anthropic_observer = create_for_anthropic(api_key="your-key")

response = anthropic_observer.observe_llm_call([...])

# OpenAI GPT
openai_observer = create_for_openai(api_key="your-key")

response = openai_observer.observe_llm_call([...])
```

## Configuration Options

### SDK Configuration

```python
plugin = AgentTracePlugin(
    trace_dir="~/.watchtower/traces",  # Where to save traces
    enable_file=True,                   # Write traces to files
    enable_stdout=False,                # Stream to stdout (for CLI tail)
    run_id=None,                        # Custom run ID (auto-generated if None)
    sanitize=True,                       # Sanitize sensitive data
    dead_letter_retention_days=7,       # Dead-letter retention period
    cleanup_dead_letter_on_start=True,  # Clean old dead-letter files at startup
)
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WATCHTOWER_TRACE_DIR` | Override trace directory | `~/.watchtower/traces` |
| `WATCHTOWER_LIVE` | Enable stdout streaming (set by CLI) | `0` |
| `WATCHTOWER_RUN_ID` | Override run ID | Auto-generated |
| `WATCHTOWER_CONFIG_DIR` | Override config directory | `~/.watchtower` |
| `WATCHTOWER_DEBUG` | Enable debug mode | `0` |

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
| `state.change` | Agent state modified |
| `agent.transfer` | Multi-agent handoff |

## Troubleshooting

### Traces not appearing

1. Verify plugin is added to your runner
   ```python
   plugins=[AgentTracePlugin()]
   ```

2. Check trace directory exists:
   ```bash
   ls ~/.watchtower/traces
   ```

3. Verify environment variables:
   ```bash
   echo $WATCHTOWER_TRACE_DIR
   echo $WATCHTOWER_LIVE
   ```

### Live tail not streaming events

1. Ensure `PYTHONUNBUFFERED=1` is set (done automatically by CLI)
2. Check script imports and uses observer methods

### CLI not rendering properly

1. Check terminal supports ANSI colors
2. Try different theme: `theme: minimal`

## Development

[Contributing Guidelines](CONTRIBUTING.md) - How to contribute

### Quick Start

```bash
# Clone repository
git clone https://github.com/Watchtower-Labs/watchtower-cli.git
cd watchtower-cli

# Use correct Node version
nvm use
node --version  # Should be 20+
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
```

### CLI Development

```bash
# Install dependencies
pnpm install

# Watch mode (rebuild on changes)
pnpm dev:cli
```

## Links

- [GitHub Repository](https://github.com/Watchtower-Labs/watchtower-cli)
- [Issue Tracker](https://github.com/Watchtower-Labs/watchtower-cli/issues)
- [Google ADK Documentation](https://google.github.io/adk-docs/)

## License

[MIT](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/LICENSE)
