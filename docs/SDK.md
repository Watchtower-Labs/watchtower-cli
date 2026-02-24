# Watchtower Python SDK Guide

The Watchtower Python SDK provides observability for multiple AI agent frameworks, enabling you to debug and analyze agent behavior through structured trace files.

## Overview

**Supported Frameworks:**

| Framework | Status | Documentation |
|-----------|--------|--------------|
| Google ADK | ✅ Production | [Quick Start](#for-google-adk) |
| Anthropic | ✅ Production | [Quick Start](#for-anthropic) |
| OpenAI | ✅ Production | [Quick Start](#for-openai) |
| LangChain | 🚧 Coming Soon | - |

All frameworks use a unified `AgentObserver` interface, providing consistent observability across different AI agent SDKs.

## Architecture

### Key Components

- **Core Abstractions** (`watchtower/core/interface.py`)
  - `AgentObserver` - Abstract base class for framework observers
  - Unified event types across all frameworks
  - Framework-specific data structures

- **Framework Adapters** (`watchtower/adapters/`)
  - `google_adk.py` - Google ADK adapter (original plugin)
  - `anthropic.py` - Anthropic Claude adapter
  - `openai.py` - OpenAI GPT adapter

- **Unified SDK** (`watchtower/sdk.py`)
  - `Watchtower.create_observer()` - Auto-detect framework
  - Framework-specific creators: `create_for_anthropic()`, `create_for_openai()`
  - Backward compatible `AgentTracePlugin` export

- **Writers** (`watchtower/writers/`)
  - File writer - JSONL output to files
  - Stdout writer - JSON-RPC streaming

- **Utilities** (`watchtower/utils/`)
  - Sanitization - Sensitive data redaction
  - Validation - Input validation and security

---

## Installation

### Python SDK

```bash
pip install watchtower-adk
```

The `watchtower-adk` package includes all SDK components needed for Google ADK.

### Framework-Specific Dependencies

For Anthropic:
```bash
pip install anthropic
```

For OpenAI:
```bash
pip install openai
```

---

## Quick Start

### Option 1: Google ADK

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin

agent = Agent(name="my_agent", model="gemini-2.0-flash")
plugin = AgentTracePlugin()
runner = InMemoryRunner(agent=agent, plugins=[plugin])
result = runner.run(user_message="Hello, how are you today?")
```

### Option 2: Anthropic Claude

```python
from watchtower.sdk import create_for_anthropic
import os

observer = create_for_anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
    model="claude-sonnet-4-20250514",
)

# Single call
response = observer.observe_llm_call([
    {"role": "user", "content": "What is 42?"}
])

print(response.content[0].text)

# Streaming conversation
messages = []
while True:
    user_input = input("You: ")
    if user_input.lower() == 'exit':
        break
    messages.append({"role": "user", "content": user_input})
    response = observer.observe_llm_call(messages)
    print(f"Claude: {response.content[0].text}")
    messages.append({
        "role": "assistant",
        "content": response.content[0].text
    })
```

### Option 3: OpenAI GPT

```python
from watchtower.sdk import create_for_openai
import os

observer = create_for_openai(
    api_key=os.environ.get("OPENAI_API_KEY"),
    model="gpt-4o",
)

# With tools
response = observer.observe_llm_call(
    messages=[{"role": "user", "content": "Calculate 2 + 2"}],
    tools=[{"type": "function", "function": {"name": "calculator", "description": "Performs calculations"}}],
)

print(response.choices[0].message.content)
```

### Option 4: Auto-Detection (Framework-Agnostic)

```python
from watchtower.sdk import Watchtower

# Automatically detects framework
observer = Watchtower.create_observer(
    trace_dir="./traces",
    enable_stdout=True,
)

# Use same API regardless of which framework is installed
# Works with Google ADK, Anthropic, or OpenAI
```

---

## Configuration

### SDK Options

All observers accept these common options:

| Option | Type | Default | Description |
|---------|------|---------|-------------|
| `trace_dir` | string | `"~/.watchtower/traces"` | Trace directory |
| `enable_file` | boolean | `true` | Write traces to files |
| `enable_stdout` | boolean | `false` | Emit traces to stdout |
| `run_id` | string | `None` | Custom run ID (auto-generated) |
| `sanitize` | boolean | `true` | Sanitize sensitive data |
| `dead_letter_retention_days` | number | `7` | Retention for dead-letter files |
| `cleanup_dead_letter_on_start` | boolean | `true` | Auto-clean old dead-letter files on startup |

### Framework-Specific Options

#### Anthropic

| Option | Type | Default |
|--------|------|---------|
| `api_key` | string | `None` | Anthropic API key (reads `ANTHROPIC_API_KEY`) |
| `model` | string | `"claude-sonnet-4-20250514"` | Model to use |

#### OpenAI

| Option | Type | Default |
|--------|------|---------|
| `api_key` | string | `None` | OpenAI API key (reads `OPENAI_API_KEY`) |
| `model` | string | `"gpt-4o"` | Model to use |

---

## Environment Variables

| Variable | Applies To | Description |
|----------|------------|-------------|
| `WATCHTOWER_TRACE_DIR` | All | Override trace directory location |
| `WATCHTOWER_LIVE` | All | Enable stdout streaming (for CLI `watchtower tail`) |
| `WATCHTOWER_RUN_ID` | All | Override auto-generated run ID |
| `WATCHTOWER_DEFAULT_PYTHON` | All | Default Python executable validation target |
| `ANTHROPIC_API_KEY` | Anthropic | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI | OpenAI API key |
| `WATCHTOWER_DEBUG` | All | Enable debug logging |

---

## API Reference

### Google ADK (AgentTracePlugin)

The original Watchtower plugin for Google ADK. See [plugin.py](../watchtower/plugin.py) for implementation details.

### Anthropic (AnthropicObserver)

```python
from watchtower.sdk import create_for_anthropic

observer = create_for_anthropic(api_key="your-key")

# Methods
response = observer.observe_llm_call(messages)
```

### OpenAI (OpenAIObserver)

```python
from watchtower.sdk import create_for_openai

observer = create_for_openai(api_key="your-key", model="gpt-4o")

# Methods
response = observer.observe_llm_call(messages, tools=[...])
```

---

## Security

### Data Sanitization

All observers automatically sanitize sensitive data from:

- API keys
- Passwords
- Tokens
- Secrets
- And more patterns defined in [sanitization.py](../watchtower/utils/sanitization.py)

### Input Validation

All observers validate inputs to prevent:

- Injection attacks
- Directory traversal
- Invalid characters in run IDs
- Malformed API keys

See [validation.py](../watchtower/utils/validation.py) for details.

### File Permissions

- Trace files are created with `0o700` (read/write only by owner)
- Dead-letter files use same permissions

---

## Testing

Run tests for the framework you're using:

```bash
pytest tests/ -q
```

---

## Troubleshooting

### Common Issues

**Trace files not appearing:**
1. Verify plugin is added to your runner
2. Check trace directory exists
3. Verify trace directory path

**Events not captured:**
1. Check observer is wrapping your API calls
2. Enable debug mode to see what's happening

**Framework not detected:**
1. Ensure framework SDK is installed
2. Check imports are correct

---

## Contributing

For guidelines on contributing to Watchtower, see [CONTRIBUTING.md](../CONTRIBUTING.md).

For issues and questions, see the [GitHub Issues](https://github.com/Watchtower-Labs/watchtower-cli/issues).
