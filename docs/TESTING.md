# Testing Watchtower SDK with TypeScript CLI

This guide walks you through testing the integration between the Watchtower Python SDK and the TypeScript CLI.

## Prerequisites

- **Python 3.9+** with pip
- **Node.js 18+** with npm
- **pnpm** package manager
- **Google ADK** (`pip install google-adk`)

## Setup

### 1. Install pnpm

```bash
npm install -g pnpm
```

### 2. Build the CLI

```bash
# From the repository root (cli branch)
pnpm install
pnpm --filter @watchtower/cli build

# Link the CLI globally for testing
cd packages/cli
pnpm link --global
```

Verify the CLI is available:

```bash
watchtower --version
```

### 3. Install the Python SDK

The SDK is on the `feature/phase1-sdk-core` branch. You can install it:

**Option A: From source (recommended for testing)**

```bash
# Clone the SDK branch separately or switch branches
git fetch
git checkout feature/phase1-sdk-core
pip install -e .
```

**Option B: From GitHub directly**

```bash
pip install git+https://github.com/Watchtower-Labs/watchtower-cli.git@feature/phase1-sdk-core
```

Verify the SDK is installed:

```bash
python -c "from watchtower import AgentTracePlugin; print('SDK installed successfully')"
```

## Test Workflows

### Workflow 1: Basic Trace Generation & Viewing

**Step 1:** Run an agent with tracing enabled

```bash
python test_agent.py
```

Expected output:
```
Running agent with query: 'What is 15 multiplied by 7?'
Agent: [agent response]

Trace saved to: ~/.watchtower/traces/2024-01-04_abc123.jsonl
```

**Step 2:** View the trace in the CLI

```bash
watchtower show last
```

Expected: Interactive TUI with event timeline, summary statistics, and keyboard navigation.

### Workflow 2: Live Event Streaming

Run the CLI in tail mode to stream events in real-time:

```bash
watchtower tail python test_agent.py
```

This automatically:
- Sets `AGENTTRACE_LIVE=1` environment variable
- Generates a unique `AGENTTRACE_RUN_ID`
- Spawns the Python script
- Streams events to the terminal as they occur

**Keyboard shortcuts during tail:**
- `p` - Pause/resume stream
- `Ctrl+C` - Stop agent and exit
- `q` - Quit

### Workflow 3: Browse Historical Traces

List all traces:

```bash
watchtower list
```

View a specific trace:

```bash
# By run ID
watchtower show abc123

# By date and run ID
watchtower show 2024-01-04_abc123

# By file path
watchtower show ~/.watchtower/traces/2024-01-04_abc123.jsonl
```

### Workflow 4: Configuration Management

```bash
# Show current configuration
watchtower config

# Initialize default config file
watchtower config --init

# Set configuration values
watchtower config --set theme=light
watchtower config --set timestampFormat=absolute
```

## Testing Checklist

### ✅ Basic Integration Tests

- [ ] SDK generates trace files in `~/.watchtower/traces/`
- [ ] CLI can read and parse trace files
- [ ] `watchtower show last` displays most recent trace
- [ ] `watchtower list` shows all traces
- [ ] Keyboard navigation works in TUI (↑↓, Enter, q)

### ✅ Live Streaming Tests

- [ ] `watchtower tail` spawns Python script successfully
- [ ] Events stream in real-time during agent execution
- [ ] Pause/resume (p key) works correctly
- [ ] Clean exit with Ctrl+C and q
- [ ] `AGENTTRACE_LIVE` environment variable is detected by SDK

### ✅ Event Type Tests

Verify all event types are captured and displayed:

- [ ] `run.start` - Agent invocation begins
- [ ] `run.end` - Agent invocation completes
- [ ] `llm.request` - LLM call initiated
- [ ] `llm.response` - LLM response received (with token counts)
- [ ] `tool.start` - Tool execution begins
- [ ] `tool.end` - Tool execution completes (with duration)
- [ ] `tool.error` - Tool execution failed (test with broken tool)

### ✅ Feature Tests

- [ ] Summary statistics display correctly (LLM calls, tool calls, tokens, duration)
- [ ] Timestamps display in configured format (relative/absolute/unix)
- [ ] Event details expand when pressing Enter
- [ ] Argument sanitization redacts sensitive data (password, api_key, etc.)
- [ ] Long event lists scroll correctly
- [ ] Different themes work (dark/light/minimal)

### ✅ Edge Cases

- [ ] Empty trace files (agent crashes before events)
- [ ] Very large trace files (1000+ events)
- [ ] Invalid JSONL files (corrupted data)
- [ ] Missing trace directory (should auto-create)
- [ ] Concurrent agents (multiple runs at same time)
- [ ] Custom trace directories (`AGENTTRACE_DIR`)

## Verification Commands

### Check trace files exist

```bash
ls -la ~/.watchtower/traces/
```

Expected: Multiple `.jsonl` files with naming pattern `YYYY-MM-DD_<run_id>.jsonl`

### Inspect trace file contents

```bash
head -n 5 ~/.watchtower/traces/2024-01-04_abc123.jsonl
```

Expected: JSONL format (one JSON object per line)

```jsonl
{"type":"run.start","run_id":"abc123","timestamp":1704376800.000,"agent_name":"test_calculator_agent"}
{"type":"llm.request","run_id":"abc123","timestamp":1704376800.012,"model":"gemini-2.0-flash"}
{"type":"llm.response","run_id":"abc123","timestamp":1704376800.847,"duration_ms":835,"total_tokens":1203}
```

### Check environment variables during tail

Add debug output to your test agent:

```python
import os
print(f"AGENTTRACE_LIVE: {os.environ.get('AGENTTRACE_LIVE')}")
print(f"AGENTTRACE_RUN_ID: {os.environ.get('AGENTTRACE_RUN_ID')}")
```

When run via `watchtower tail`, should output:
```
AGENTTRACE_LIVE: 1
AGENTTRACE_RUN_ID: <uuid>
```

## Troubleshooting

### SDK not found

```bash
pip show watchtower-adk
```

If not installed, ensure you're on the correct branch and run:
```bash
git checkout feature/phase1-sdk-core
pip install -e .
```

### CLI not found

```bash
which watchtower
```

If not found:
```bash
cd packages/cli
pnpm link --global
```

### No traces appearing

1. Check if tracing is disabled:
   ```bash
   echo $AGENTTRACE_DISABLE  # Should be empty or unset
   ```

2. Check trace directory permissions:
   ```bash
   ls -la ~/.watchtower/
   ```

3. Verify plugin is added to runner in your agent code:
   ```python
   plugins=[AgentTracePlugin()]
   ```

### Live tail not streaming

1. Ensure `enable_stdout` responds to environment variable:
   ```python
   enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1"
   ```

2. Check Python buffering (CLI sets `PYTHONUNBUFFERED=1` automatically)

3. Verify stdout format is JSON-RPC 2.0:
   ```json
   {"jsonrpc":"2.0","method":"run.start","params":{...}}
   ```

### CLI rendering issues

1. Check terminal supports ANSI colors
2. Try minimal theme: `watchtower config --set theme=minimal`
3. Ensure terminal width ≥ 60 columns
4. Update terminal emulator to latest version

## Advanced Testing

### Test with Multiple Agents

```bash
# Terminal 1
watchtower tail python agent1.py

# Terminal 2 (simultaneously)
watchtower tail python agent2.py
```

Both should generate separate trace files with unique run IDs.

### Test Custom Trace Directory

```bash
export AGENTTRACE_DIR=/tmp/custom-traces
python test_agent.py
watchtower show last  # Should look in custom directory
```

### Test Argument Sanitization

Create an agent with sensitive tool arguments:

```python
def send_email(api_key: str, to: str, message: str):
    """Send an email."""
    pass
```

Run the agent and verify `api_key` is `[REDACTED]` in the trace file.

### Performance Testing

Test with high-volume traces:

```python
# Run agent with many iterations
for i in range(100):
    async for event in runner.run_async(user_id, f"session_{i}", f"Query {i}"):
        pass
```

Verify:
- File I/O performance remains acceptable
- CLI can handle large trace files
- Memory usage stays reasonable

## Integration with CI/CD

### Automated Testing Script

```bash
#!/bin/bash
set -e

echo "Building CLI..."
pnpm --filter @watchtower/cli build

echo "Installing SDK..."
pip install -e .

echo "Running test agent..."
python test_agent.py

echo "Verifying trace exists..."
TRACE_FILE=$(ls -t ~/.watchtower/traces/*.jsonl | head -n 1)
if [ ! -f "$TRACE_FILE" ]; then
    echo "ERROR: Trace file not created"
    exit 1
fi

echo "Verifying trace contents..."
if ! grep -q '"type":"run.start"' "$TRACE_FILE"; then
    echo "ERROR: Invalid trace format"
    exit 1
fi

echo "All tests passed!"
```

## See Also

- [CLI Guide](./CLI.md) - Detailed CLI usage and configuration
- [SDK Guide](./SDK.md) - Python SDK integration guide
- [Architecture](./ARCHITECTURE.md) - System design and internals
