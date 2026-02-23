# Watchtower Python SDK Documentation

## Overview

The Watchtower SDK provides observability for Google ADK agents through a simple plugin system. It captures agent lifecycle events, LLM interactions, and tool executions automatically.

## Installation

```bash
pip install watchtower-adk
```

Or for development:

```bash
pip install -e .
```

## Quick Start

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin

# Create your agent
agent = Agent(
    name="my_agent",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant.",
    tools=[my_tool],
)

# Add watchtower plugin
runner = InMemoryRunner(
    agent=agent,
    app_name="my_app",
    plugins=[AgentTracePlugin()],  # Just add this line
)

# Run as normal - traces are automatic
async for event in runner.run_async(user_id, session_id, message):
    print(event.content)
```

## Package Structure

```
watchtower/
├── __init__.py              # Public API exports
├── plugin.py                # Main AgentTracePlugin implementation
├── collector.py             # Event aggregation and statistics
├── config.py                # Configuration management
├── models/
│   ├── __init__.py
│   └── events.py            # Event dataclasses
├── writers/
│   ├── __init__.py
│   ├── base.py              # Base writer interface
│   ├── file_writer.py       # JSONL file writer
│   └── stdout_writer.py     # JSON-RPC stdout writer
└── utils/
    ├── __init__.py
    └── sanitization.py      # Argument sanitization
```

## API Reference

### AgentTracePlugin

Main plugin class that hooks into ADK lifecycle events.

**Constructor:**

```python
AgentTracePlugin(
    trace_dir: str = "~/.watchtower/traces",
    enable_file: bool = True,
    enable_stdout: bool = False,
    run_id: Optional[str] = None,
    sanitize: bool = True,
)
```

**Parameters:**

- `trace_dir`: Directory to store trace files (default: `~/.watchtower/traces`)
- `enable_file`: Write traces to files (default: `True`)
- `enable_stdout`: Emit events to stdout for live tailing (default: `False`)
- `run_id`: Custom run ID (auto-generated if `None`)
- `sanitize`: Redact sensitive data from arguments (default: `True`)

**Example:**

```python
# Basic usage
plugin = AgentTracePlugin()

# Custom configuration
plugin = AgentTracePlugin(
    trace_dir="/var/log/agent-traces",
    enable_stdout=True,
    run_id="custom-run-123",
)

# For CLI live tailing (auto-configured via environment)
plugin = AgentTracePlugin(
    enable_stdout=os.environ.get("WATCHTOWER_LIVE") == "1",
    run_id=os.environ.get("WATCHTOWER_RUN_ID"),
)
```

### Event Types

All events captured by the SDK:

| Event Type | Description | Key Fields |
|------------|-------------|------------|
| `run.start` | Agent invocation begins | `invocation_id`, `agent_name` |
| `run.end` | Agent invocation completes | `duration_ms`, `summary` |
| `llm.request` | LLM call initiated | `model`, `message_count`, `tools_available` |
| `llm.response` | LLM response received | `duration_ms`, `total_tokens`, `finish_reason` |
| `tool.start` | Tool execution begins | `tool_name`, `tool_args` |
| `tool.end` | Tool execution completes | `duration_ms`, `response_preview` |
| `tool.error` | Tool execution failed | `error_type`, `error_message` |
| `state.change` | Session state modified | `author`, `state_delta` |

### Writers

#### FileWriter

Writes events to JSONL files.

```python
from watchtower.writers import FileWriter

writer = FileWriter(
    trace_dir="~/.watchtower/traces",
    buffer_size=10,  # Events to buffer before writing
)

# Write events
writer.write(event_dict)
writer.flush()

# Get current trace file path
trace_path = writer.get_trace_path()
```

#### StdoutWriter

Emits events as JSON-RPC 2.0 notifications to stdout.

```python
from watchtower.writers import StdoutWriter

writer = StdoutWriter()

# Events are written in JSON-RPC format:
# {"jsonrpc":"2.0","method":"event.type","params":{...}}
writer.write(event_dict)
```

### EventCollector

Aggregates statistics during agent execution.

```python
from watchtower.collector import EventCollector

collector = EventCollector()

# Track events
collector.track_llm_call(tokens=150)
collector.track_tool_call("search_web")
collector.track_error()

# Get summary
summary = collector.get_summary()
# Returns: {
#     "llm_calls": 1,
#     "tool_calls": 1,
#     "total_tokens": 150,
#     "errors": 1,
#     "tools_used": ["search_web"]
# }

# Reset for new run
collector.reset()
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WATCHTOWER_TRACE_DIR` | Override trace directory | `~/.watchtower/traces` |
| `WATCHTOWER_LIVE` | Enable stdout streaming | `0` (disabled) |
| `WATCHTOWER_RUN_ID` | Custom run ID | Auto-generated |
| `WATCHTOWER_DISABLE` | Disable all tracing | `0` (enabled) |

### Config File

Create `~/.watchtower/config.yaml`:

```yaml
trace_dir: ~/.watchtower/traces
retention_days: 30
buffer_size: 10
sanitize_args: true
max_response_preview: 500
```

## Security

### Argument Sanitization

By default, sensitive data is redacted from tool arguments:

```python
# Original arguments
{"api_key": "sk-1234", "query": "search term"}

# Stored in trace
{"api_key": "[REDACTED]", "query": "search term"}
```

Patterns matched: `password`, `secret`, `token`, `api_key`, `auth`, `credential`

Disable sanitization:

```python
plugin = AgentTracePlugin(sanitize=False)
```

### File Permissions

Trace directory is created with mode `0700` (user read/write/execute only).

### Local-Only

All data stays on your machine by default. No external services, no telemetry.

## Advanced Usage

### Custom Writers

Implement the `TraceWriter` interface:

```python
from watchtower.writers.base import TraceWriter

class CustomWriter(TraceWriter):
    def write(self, event: dict) -> None:
        # Your custom logic
        pass

    def flush(self) -> None:
        # Ensure all events are persisted
        pass

# Use custom writer
plugin = AgentTracePlugin()
plugin.file_writer = CustomWriter()
```

### Multiple Writers

```python
from watchtower.writers import FileWriter, StdoutWriter

file_writer = FileWriter()
stdout_writer = StdoutWriter()

plugin = AgentTracePlugin(enable_file=False, enable_stdout=False)
plugin.file_writer = file_writer
plugin.stdout_writer = stdout_writer
```

### Disable Tracing

```bash
export WATCHTOWER_DISABLE=1
python my_agent.py  # No traces generated
```

Or programmatically:

```python
plugin = AgentTracePlugin(enable_file=False, enable_stdout=False)
```

## Trace File Format

Traces are stored as JSONL (newline-delimited JSON).

**File naming:** `{date}_{run_id}.jsonl`

**Example:** `2024-01-15_abc123.jsonl`

```jsonl
{"type":"run.start","run_id":"abc123","timestamp":1705329121.0,"agent_name":"my_agent"}
{"type":"llm.request","run_id":"abc123","timestamp":1705329121.012,"model":"gemini-2.0-flash"}
{"type":"llm.response","run_id":"abc123","timestamp":1705329121.847,"total_tokens":1203}
{"type":"tool.start","run_id":"abc123","timestamp":1705329121.850,"tool_name":"search_web"}
{"type":"tool.end","run_id":"abc123","timestamp":1705329122.341,"duration_ms":491}
{"type":"run.end","run_id":"abc123","timestamp":1705329123.415,"duration_ms":2415}
```

## Testing

Run unit tests:

```bash
pytest tests/
```

With coverage:

```bash
pytest tests/ --cov=watchtower --cov-report=html
```

## Examples

See `examples/` directory for complete examples:

- `simple_agent.py` - Basic agent with watchtower integration
- `examples/README.md` - Detailed usage guide

## Troubleshooting

### Traces not appearing

1. Check the trace directory exists: `ls ~/.watchtower/traces/`
2. Verify plugin is added: `plugins=[AgentTracePlugin()]`
3. Check environment: `echo $WATCHTOWER_DISABLE`

### Permission errors

Ensure trace directory is writable:

```bash
chmod 700 ~/.watchtower/traces/
```

### Import errors

Install the SDK:

```bash
pip install watchtower-adk
# or
pip install -e .  # for development
```

## Performance

- **Overhead**: < 5% runtime impact
- **Buffer size**: Configurable (default: 10 events)
- **File locking**: Concurrent-safe on Unix systems
- **Memory**: Minimal - events are buffered and flushed

## License

MIT

## Contributing

See main [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
