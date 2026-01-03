# Watchtower Python SDK Guide

The Watchtower Python SDK instruments [Google ADK](https://google.github.io/adk-docs/) agents to capture traces for debugging and observability.

> **Source Code:** The SDK is implemented on the [`feature/phase1-sdk-core`](https://github.com/Watchtower-Labs/watchtower-cli/tree/feature/phase1-sdk-core) branch.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Event Types](#event-types)
- [Trace File Format](#trace-file-format)
- [Live Streaming](#live-streaming)
- [Security](#security)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Installation

```bash
# Install from PyPI (when published)
pip install watchtower-adk

# Or install from source
pip install git+https://github.com/Watchtower-Labs/watchtower-cli.git@feature/phase1-sdk-core
```

**Requirements:**
- Python 3.9+
- google-adk >= 0.1.0

**Optional dependencies:**
```bash
# For cloud storage backends (post-MVP)
pip install "watchtower-adk[cloud]"
```

## Quick Start

Add the `AgentTracePlugin` to your ADK runner:

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin

# Define your agent
agent = Agent(
    name="my_agent",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant.",
    tools=[my_tool],
)

# Create runner with tracing enabled
runner = InMemoryRunner(
    agent=agent,
    app_name="my_app",
    plugins=[AgentTracePlugin()],  # Add this line
)

# Run your agent - traces are automatically captured
async for event in runner.run_async(user_id, session_id, message):
    print(event.content)
```

Traces are saved to `~/.watchtower/traces/`.

## Configuration

### Constructor Options

```python
from watchtower import AgentTracePlugin

plugin = AgentTracePlugin(
    trace_dir="~/.watchtower/traces",  # Directory for trace files
    enable_file=True,                   # Write to files (default: True)
    enable_stdout=False,                # Stream to stdout (default: False)
    run_id=None,                        # Custom run ID (default: auto-generated)
    sanitize=True,                      # Sanitize sensitive args (default: True)
)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `trace_dir` | `str` | `~/.watchtower/traces` | Directory for trace files |
| `enable_file` | `bool` | `True` | Write traces to JSONL files |
| `enable_stdout` | `bool` | `False` | Emit events to stdout (for CLI tailing) |
| `run_id` | `str \| None` | Auto-generated | Unique identifier for this run |
| `sanitize` | `bool` | `True` | Redact sensitive data from tool arguments |

### Config File

`~/.watchtower/config.yaml`

```yaml
# Trace directory
trace_dir: ~/.watchtower/traces

# Days to retain traces (for cleanup scripts)
retention_days: 30

# Events to buffer before writing
buffer_size: 10

# Redact sensitive tool arguments
sanitize_args: true

# Max characters for tool response previews
max_response_preview: 500
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AGENTTRACE_DIR` | Override trace directory | `/var/log/traces` |
| `AGENTTRACE_LIVE` | Enable stdout streaming | `1` |
| `AGENTTRACE_RUN_ID` | Override run ID | `abc123` |
| `AGENTTRACE_DISABLE` | Disable all tracing | `1` |

### Using Environment Variables

```python
import os
from watchtower import AgentTracePlugin

# Check if tracing should be disabled
if os.environ.get("AGENTTRACE_DISABLE") != "1":
    plugin = AgentTracePlugin(
        trace_dir=os.environ.get("AGENTTRACE_DIR", "~/.watchtower/traces"),
        enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
        run_id=os.environ.get("AGENTTRACE_RUN_ID"),
    )
    runner = InMemoryRunner(agent=agent, plugins=[plugin])
else:
    runner = InMemoryRunner(agent=agent)
```

## Event Types

The SDK captures these events from your agent:

### Run Lifecycle

#### `run.start`

Emitted when an agent invocation begins.

```json
{
  "type": "run.start",
  "run_id": "abc123",
  "timestamp": 1705329121.000,
  "invocation_id": "inv_001",
  "agent_name": "my_agent"
}
```

#### `run.end`

Emitted when an agent invocation completes.

```json
{
  "type": "run.end",
  "run_id": "abc123",
  "timestamp": 1705329123.415,
  "duration_ms": 2415,
  "summary": {
    "llm_calls": 2,
    "tool_calls": 3,
    "total_tokens": 2095,
    "errors": 0
  }
}
```

### LLM Interactions

#### `llm.request`

Emitted before an LLM call.

```json
{
  "type": "llm.request",
  "run_id": "abc123",
  "timestamp": 1705329121.012,
  "request_id": "req_001",
  "model": "gemini-2.0-flash",
  "message_count": 2,
  "tools_available": ["search_web", "write_file"]
}
```

#### `llm.response`

Emitted after receiving an LLM response.

```json
{
  "type": "llm.response",
  "run_id": "abc123",
  "timestamp": 1705329121.847,
  "request_id": "req_001",
  "duration_ms": 835,
  "input_tokens": 523,
  "output_tokens": 680,
  "total_tokens": 1203,
  "has_tool_calls": true,
  "finish_reason": "tool_calls"
}
```

### Tool Execution

#### `tool.start`

Emitted when a tool begins execution.

```json
{
  "type": "tool.start",
  "run_id": "abc123",
  "timestamp": 1705329121.850,
  "tool_call_id": "tc_001",
  "tool_name": "search_web",
  "tool_args": {"query": "latest AI news"},
  "agent_name": "my_agent"
}
```

#### `tool.end`

Emitted when a tool completes successfully.

```json
{
  "type": "tool.end",
  "run_id": "abc123",
  "timestamp": 1705329122.341,
  "tool_call_id": "tc_001",
  "tool_name": "search_web",
  "duration_ms": 491,
  "response_preview": "Found 10 results...",
  "success": true
}
```

#### `tool.error`

Emitted when a tool fails.

```json
{
  "type": "tool.error",
  "run_id": "abc123",
  "timestamp": 1705329122.341,
  "tool_call_id": "tc_001",
  "tool_name": "search_web",
  "error_type": "ConnectionError",
  "error_message": "Failed to connect to search API"
}
```

### State Management

#### `state.change`

Emitted when session state is modified.

```json
{
  "type": "state.change",
  "run_id": "abc123",
  "timestamp": 1705329122.500,
  "author": "search_web",
  "state_delta": {
    "search_results": ["Result 1", "Result 2"]
  }
}
```

### Multi-Agent

#### `agent.transfer`

Emitted during multi-agent handoffs.

```json
{
  "type": "agent.transfer",
  "run_id": "abc123",
  "timestamp": 1705329122.600,
  "from_agent": "router_agent",
  "to_agent": "specialist_agent",
  "reason": "User query requires specialized knowledge"
}
```

## Trace File Format

### File Naming

```
{date}_{run_id}.jsonl
```

Example: `2024-01-15_abc123.jsonl`

### File Location

```
~/.watchtower/traces/
├── 2024-01-15_abc123.jsonl
├── 2024-01-15_def456.jsonl
└── 2024-01-14_ghi789.jsonl
```

### JSONL Format

Each line is a self-contained JSON object (newline-delimited JSON):

```jsonl
{"type":"run.start","run_id":"abc123","timestamp":1705329121.000,"agent_name":"my_agent"}
{"type":"llm.request","run_id":"abc123","timestamp":1705329121.012,"model":"gemini-2.0-flash"}
{"type":"llm.response","run_id":"abc123","timestamp":1705329121.847,"duration_ms":835,"total_tokens":1203}
{"type":"run.end","run_id":"abc123","timestamp":1705329123.415,"duration_ms":2415}
```

## Live Streaming

For real-time event streaming (used by `watchtower tail`), enable stdout output:

```python
import os
from watchtower import AgentTracePlugin

# Detect CLI-spawned mode
is_live = os.environ.get("AGENTTRACE_LIVE") == "1"

plugin = AgentTracePlugin(
    enable_stdout=is_live,
    run_id=os.environ.get("AGENTTRACE_RUN_ID"),
)
```

### Live Stream Format

When `enable_stdout=True`, events are emitted as JSON-RPC 2.0 notifications:

```json
{"jsonrpc":"2.0","method":"run.start","params":{"type":"run.start","run_id":"abc123","timestamp":1705329121.000}}
{"jsonrpc":"2.0","method":"tool.start","params":{"type":"tool.start","run_id":"abc123","tool_name":"search_web"}}
```

### Automatic Detection

The recommended pattern for supporting both file and live modes:

```python
import os
from watchtower import AgentTracePlugin

def create_plugin():
    """Create plugin configured for current environment."""
    return AgentTracePlugin(
        # Always write to files
        enable_file=True,
        # Enable stdout only when CLI is tailing
        enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
        # Use CLI-provided run ID if available
        run_id=os.environ.get("AGENTTRACE_RUN_ID"),
    )
```

## Security

### Argument Sanitization

By default, sensitive tool arguments are redacted:

```python
# Original tool call
tool_args = {
    "api_key": "sk-1234567890abcdef",
    "query": "search term"
}

# Stored in trace
tool_args = {
    "api_key": "[REDACTED]",
    "query": "search term"
}
```

**Patterns matched:**
- `password`
- `secret`
- `token`
- `api_key` / `api-key` / `apikey`
- `auth`
- `credential`

**Disable sanitization:**

```yaml
# ~/.watchtower/config.yaml
sanitize_args: false
```

### File Permissions

The trace directory is created with restricted permissions:

- Directory: `0700` (owner read/write/execute only)
- Files: `0600` (owner read/write only)

### Local-Only

The SDK operates entirely locally:
- No network transmission of traces
- No external service dependencies
- No telemetry or analytics

## Advanced Usage

### Custom Run IDs

```python
import uuid

plugin = AgentTracePlugin(
    run_id=f"prod_{uuid.uuid4().hex[:8]}"
)
```

### Multiple Writers

```python
# Write to both file and stdout
plugin = AgentTracePlugin(
    enable_file=True,
    enable_stdout=True,
)
```

### Custom Trace Directory

```python
plugin = AgentTracePlugin(
    trace_dir="/var/log/agent-traces"
)
```

### Conditional Tracing

```python
import os

# Only trace in development
if os.environ.get("ENVIRONMENT") == "development":
    plugins = [AgentTracePlugin()]
else:
    plugins = []

runner = InMemoryRunner(agent=agent, plugins=plugins)
```

### Accessing Trace Path

```python
plugin = AgentTracePlugin()
# ... run agent ...

# Get the path to the trace file
trace_path = plugin.get_trace_path()
print(f"Trace saved to: {trace_path}")
```

## Troubleshooting

### Traces Not Being Created

1. **Plugin not added:**
   ```python
   # Ensure plugin is in the list
   plugins=[AgentTracePlugin()]
   ```

2. **Tracing disabled:**
   ```bash
   # Check environment variable
   echo $AGENTTRACE_DISABLE
   ```

3. **Permission denied:**
   ```bash
   # Check directory permissions
   ls -la ~/.watchtower/
   ```

### Incomplete Traces

1. **Agent crashed:** Traces are buffered. If the agent crashes before flush, some events may be lost.

2. **Force flush:** Call `plugin.flush()` if needed:
   ```python
   try:
       async for event in runner.run_async(...):
           ...
   finally:
       plugin.flush()
   ```

### Large Trace Files

1. **Reduce preview size:**
   ```yaml
   max_response_preview: 100
   ```

2. **Increase buffer:**
   ```yaml
   buffer_size: 50
   ```

3. **Set up retention:**
   ```bash
   # Delete traces older than 7 days
   find ~/.watchtower/traces -name "*.jsonl" -mtime +7 -delete
   ```

### Live Streaming Not Working

1. **Environment variable not set:**
   ```python
   # Verify AGENTTRACE_LIVE is set
   print(os.environ.get("AGENTTRACE_LIVE"))
   ```

2. **Python buffering:**
   ```bash
   # Run with unbuffered output
   PYTHONUNBUFFERED=1 python my_agent.py
   ```

3. **enable_stdout not set:**
   ```python
   enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1"
   ```

---

## See Also

- [CLI Guide](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/CLI.md) - Terminal interface
- [Architecture](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/ARCHITECTURE.md) - System design
- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [GitHub Repository](https://github.com/Watchtower-Labs/watchtower-cli)
