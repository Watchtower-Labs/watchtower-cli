# Testing Guide

This guide covers how to test the Watchtower CLI and Python SDK.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Python SDK Tests](#python-sdk-tests)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
- [CLI Tests](#cli-tests)
- [End-to-End Testing](#end-to-end-testing)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js** 18+ (for CLI)
- **Python** 3.9+ (for SDK)
- **pnpm** (for monorepo management)

### Optional

- **Google API Key** (for integration tests with real Gemini API calls)

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Watchtower-Labs/watchtower-cli
cd watchtower-cli

# Install Node.js dependencies
pnpm install

# Create Python virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python SDK with dev dependencies
pip install -e ".[dev]"

# Run all tests
pnpm build:cli              # Build CLI
pytest tests/ -v            # Run Python unit tests
```

---

## Python SDK Tests

### Unit Tests

Unit tests verify the SDK components work correctly **without** requiring a Google API key.

```bash
# Activate virtual environment
source .venv/bin/activate

# Run all unit tests
pytest tests/test_basic.py -v

# Run specific test
pytest tests/test_basic.py::test_event_creation -v

# Run with coverage
pytest tests/test_basic.py -v --cov=watchtower --cov-report=term-missing
```

#### What's Tested

| Test | Description |
|------|-------------|
| `test_event_creation` | Event dataclass creation and serialization |
| `test_file_writer` | JSONL file writing with buffering |
| `test_stdout_writer` | JSON-RPC 2.0 stdout streaming |
| `test_event_collector` | Statistics tracking (LLM calls, tokens, errors) |
| `test_sanitize_args` | Sensitive data redaction (api_key, password, etc.) |
| `test_create_event` | Event creation via EventCollector |

#### Expected Output

```
tests/test_basic.py::test_event_creation PASSED
tests/test_basic.py::test_file_writer PASSED
tests/test_basic.py::test_stdout_writer PASSED
tests/test_basic.py::test_event_collector PASSED
tests/test_basic.py::test_sanitize_args PASSED
tests/test_basic.py::test_create_event PASSED

========================= 6 passed in 1.20s =========================
```

### Integration Tests

Integration tests run a real ADK agent and require a **Google API key**.

#### Setup

1. Get a Google API key from [Google AI Studio](https://aistudio.google.com/apikey)

2. Set the environment variable:
   ```bash
   export GOOGLE_API_KEY="your-api-key-here"
   ```

3. Run the test agent:
   ```bash
   python test_agent_simple.py
   ```

#### What It Tests

The integration test (`test_agent_simple.py`):

1. Creates an ADK agent with calculator and time tools
2. Attaches the `AgentTracePlugin`
3. Runs 3 test queries that exercise:
   - LLM requests/responses
   - Tool calls (calculator, time)
   - Run start/end events
4. Generates a trace file in `~/.watchtower/traces/`

#### Expected Output

```
======================================================================
Watchtower SDK + CLI Integration Test (Simple)
======================================================================

Live mode: False
Run ID: auto-generated

Starting agent with 3 test queries...

[Query 1/3] What is 15 multiplied by 7?
----------------------------------------------------------------------
  [Tool] Calculated: 15.0 multiply 7.0 = 105.0
  [Agent] 15 multiplied by 7 is 105.

[Query 2/3] What time is it right now?
----------------------------------------------------------------------
  [Tool] Current time (UTC): 2024-01-15T10:30:00+00:00
  [Agent] The current time is 10:30 AM UTC.

[Query 3/3] Calculate 100 divided by 4
----------------------------------------------------------------------
  [Tool] Calculated: 100.0 divide 4.0 = 25.0
  [Agent] 100 divided by 4 is 25.

======================================================================
Test completed!
======================================================================
Trace saved to: /Users/you/.watchtower/traces/2024-01-15_abc12345.jsonl
```

### Smoke Test (No API Key)

Quick verification that SDK imports and basic functions work:

```bash
python3 -c "
from watchtower.models.events import RunStartEvent, EventType
from watchtower.collector import EventCollector
from watchtower.utils.sanitization import sanitize_args

# Test event creation
event = RunStartEvent(run_id='test', invocation_id='inv1', agent_name='TestAgent')
assert event.type == EventType.RUN_START.value
print('✓ Event creation works')

# Test collector
collector = EventCollector()
collector.track_llm_call(100)
collector.track_tool_call('search')
summary = collector.get_summary()
assert summary['llm_calls'] == 1
print('✓ Event collector works')

# Test sanitization
args = {'api_key': 'secret123', 'query': 'hello'}
sanitized = sanitize_args(args)
assert sanitized['api_key'] == '[REDACTED]'
assert sanitized['query'] == 'hello'
print('✓ Sanitization works')

print()
print('All smoke tests passed!')
"
```

---

## CLI Tests

### Build the CLI

```bash
pnpm build:cli
```

### Verify CLI Commands

```bash
# Check help output
node packages/cli/dist/index.js --help

# Expected output:
# watchtower <command> [options]
#
# Commands:
#   watchtower show [trace]                   View a saved trace file
#   watchtower tail <script..>                Run a script and stream events live
#   watchtower list                           List recent traces
#   watchtower config [action] [key] [value]  Manage CLI configuration
```

### Test Individual Commands

**Note:** Commands like `show`, `list`, and `tail` require a TTY (real terminal) for interactive features. They won't work in non-interactive environments like CI pipelines without modification.

#### In a Real Terminal

```bash
# View the most recent trace
watchtower show last

# List all traces
watchtower list

# Show config
watchtower config

# Live tail (requires GOOGLE_API_KEY)
watchtower tail python test_agent_simple.py
```

#### Programmatic Testing

```bash
# Test that CLI parses arguments correctly
node packages/cli/dist/index.js --version
node packages/cli/dist/index.js --help
node packages/cli/dist/index.js config --help
```

---

## End-to-End Testing

The full E2E test verifies the complete pipeline:

```
Agent → SDK → Trace File → CLI Display
```

### Manual E2E Test

```bash
# 1. Set API key
export GOOGLE_API_KEY="your-key"

# 2. Run agent to generate trace
python test_agent_simple.py

# 3. View trace with CLI (in a real terminal)
watchtower show last

# 4. Verify trace file exists
ls -la ~/.watchtower/traces/

# 5. Check trace content
cat ~/.watchtower/traces/*.jsonl | head -5
```

### Live Streaming E2E Test

```bash
# Run agent with live streaming
watchtower tail python test_agent_simple.py
```

This tests:
- CLI spawns Python process
- Sets `WATCHTOWER_LIVE=1` environment variable
- SDK emits JSON-RPC 2.0 events to stdout
- CLI parses and displays events in real-time

---

## CI/CD

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  python-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"

      - name: Run unit tests
        run: pytest tests/test_basic.py -v

  cli-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build CLI
        run: pnpm build:cli

      - name: Verify CLI
        run: node packages/cli/dist/index.js --help
```

### Running Tests Locally for CI

```bash
# Simulate CI environment
CI=true pytest tests/test_basic.py -v
CI=true pnpm build:cli
```

---

## Troubleshooting

### Common Issues

#### "No module named 'google'"

```bash
# Install google-adk
pip install google-adk
```

#### "No module named 'watchtower'"

```bash
# Install SDK in editable mode
pip install -e ".[dev]"
```

#### "Missing key inputs argument"

The integration test requires a Google API key:

```bash
export GOOGLE_API_KEY="your-api-key"
```

#### "Raw mode is not supported"

CLI commands like `list` and `show` require a real terminal (TTY). This error occurs when running in:
- Non-interactive shells
- CI/CD pipelines
- IDE terminal emulators (sometimes)

**Solution:** Run in a real terminal or skip interactive CLI tests in CI.

#### "No traces found"

Generate a trace first:

```bash
# Run the test agent (requires API key)
python test_agent_simple.py

# Or create a mock trace file
mkdir -p ~/.watchtower/traces
echo '{"type":"run.start","run_id":"test123","timestamp":1234567890}' > ~/.watchtower/traces/2024-01-01_test123.jsonl
```

### Viewing Test Traces

```bash
# List trace files
ls -la ~/.watchtower/traces/

# View trace content (raw)
cat ~/.watchtower/traces/*.jsonl

# Pretty print a trace event
cat ~/.watchtower/traces/*.jsonl | head -1 | python -m json.tool
```

### Debug Mode

```bash
# Run tests with verbose output
pytest tests/ -v -s

# Enable Python warnings
python -W all test_agent_simple.py
```

---

## Test Coverage

To generate a coverage report:

```bash
# Install coverage
pip install pytest-cov

# Run with coverage
pytest tests/test_basic.py -v --cov=watchtower --cov-report=html

# View report
open htmlcov/index.html
```

---

## Writing New Tests

### Adding a Unit Test

```python
# tests/test_basic.py

def test_new_feature():
    """Test description."""
    from watchtower.some_module import some_function

    result = some_function(input_data)

    assert result == expected_output
```

### Adding an Integration Test

```python
# tests/test_integration.py

import pytest
import os

@pytest.mark.skipif(
    not os.environ.get("GOOGLE_API_KEY"),
    reason="Requires GOOGLE_API_KEY"
)
async def test_full_agent_run():
    """Test full agent execution with tracing."""
    # Test implementation
    pass
```

---

## Summary

| Test Type | Command | API Key Required |
|-----------|---------|------------------|
| Unit tests | `pytest tests/test_basic.py -v` | No |
| Smoke test | `python3 -c "from watchtower import ..."` | No |
| Integration test | `python test_agent_simple.py` | Yes |
| CLI build | `pnpm build:cli` | No |
| CLI verify | `node packages/cli/dist/index.js --help` | No |
| E2E (interactive) | `watchtower show last` | No (needs trace) |
| E2E (live) | `watchtower tail python agent.py` | Yes |
