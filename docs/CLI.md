# Watchtower CLI Guide

The Watchtower CLI is a terminal-based tool for viewing and debugging [Google ADK](https://google.github.io/adk-docs/) agent traces.

> **Source Code:** The CLI is implemented on the [`cli`](https://github.com/Watchtower-Labs/watchtower-cli/tree/cli) branch.

## Table of Contents

- [Installation](#installation)
- [Commands](#commands)
  - [show](#watchtower-show)
  - [tail](#watchtower-tail)
  - [list](#watchtower-list)
  - [config](#watchtower-config)
- [Configuration](#configuration)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Themes](#themes)
- [Trace Resolution](#trace-resolution)
- [Troubleshooting](#troubleshooting)

## Installation

### npm

```bash
npm install -g @watchtower/cli
```

### yarn

```bash
yarn global add @watchtower/cli
```

### pnpm

```bash
pnpm add -g @watchtower/cli
```

### Verify Installation

```bash
watchtower --version
watchtower --help
```

## Commands

### `watchtower show`

View a saved trace file with interactive navigation.

```bash
watchtower show [trace]
```

**Arguments:**

| Argument | Description | Default |
|----------|-------------|---------|
| `trace` | Trace identifier (see [Trace Resolution](#trace-resolution)) | `last` |

**Examples:**

```bash
# View the most recent trace
watchtower show last

# View by run ID
watchtower show abc123

# View by full filename
watchtower show 2024-01-15_abc123

# View a specific file path
watchtower show ./my-traces/trace.jsonl
watchtower show /absolute/path/to/trace.jsonl
```

**Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│ watchtower • Run: abc123 • my_agent • 2024-01-15 14:32:01  │
├─────────────────────────────────────────────────────────────┤
│ Summary                                                     │
│ Duration: 4.2s  LLM: 3  Tools: 5  Tokens: 2,847  Errors: 0 │
├─────────────────────────────────────────────────────────────┤
│ Events                                              15 total│
│ ↑ 2 more above                                             │
│   +0ms      ▶ run.start         my_agent                   │
│ > +12ms     → llm.request       gemini-2.0-flash           │
│   +847ms    ← llm.response      1,203 tokens  835ms        │
│   +850ms    ⚙ tool.start        search_web                 │
│ ↓ 8 more below                                             │
├─────────────────────────────────────────────────────────────┤
│ ↑↓/jk Navigate  Enter Expand  g/G Start/End  q Quit       │
└─────────────────────────────────────────────────────────────┘
```

**Event Detail View:**

Press `Enter` on any event to expand it:

```
┌─────────────────────────────────────────────────────────────┐
│ watchtower • Run: abc123 • my_agent • 2024-01-15 14:32:01  │
├─────────────────────────────────────────────────────────────┤
│ Event Details                                               │
│                                                             │
│ Type:       llm.response                                   │
│ Timestamp:  2024-01-15 14:32:01.847                        │
│                                                             │
│ Request ID:    req_001                                     │
│ Duration:      835ms                                       │
│ Input Tokens:  523                                         │
│ Output Tokens: 680                                         │
│ Total Tokens:  1,203                                       │
│ Tool Calls:    Yes                                         │
│ Finish Reason: tool_calls                                  │
│                                                             │
│ Raw Event:                                                 │
│ {                                                          │
│   "type": "llm.response",                                  │
│   "run_id": "abc123",                                      │
│   ...                                                      │
│ }                                                          │
├─────────────────────────────────────────────────────────────┤
│ b/Esc Back  q Quit                                         │
└─────────────────────────────────────────────────────────────┘
```

---

### `watchtower tail`

Run a Python script and stream events in real-time.

```bash
watchtower tail <script...>
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `script` | Command and arguments to run |

**Environment Variables Set:**

The CLI automatically sets these environment variables for the spawned process:

| Variable | Value | Purpose |
|----------|-------|---------|
| `PYTHONUNBUFFERED` | `1` | Disable Python output buffering |
| `AGENTTRACE_LIVE` | `1` | Signal SDK to enable stdout streaming |
| `AGENTTRACE_RUN_ID` | `<uuid>` | Unique run identifier |

**Examples:**

```bash
# Basic usage
watchtower tail python my_agent.py

# With script arguments (use -- to separate CLI args from script args)
watchtower tail -- python my_agent.py --verbose

# With multiple arguments
watchtower tail -- python my_agent.py --config prod.yaml --user alice
```

**Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│ watchtower • LIVE • Run: xyz789                    ● REC   │
├─────────────────────────────────────────────────────────────┤
│ Stats                                                       │
│ Duration: 1.2s  LLM: 1  Tools: 2  Tokens: 847  Errors: 0   │
├─────────────────────────────────────────────────────────────┤
│ Events                                              4 events│
│ +0ms      ▶ run.start         research_agent               │
│ +12ms     → llm.request       gemini-2.0-flash             │
│ +847ms    ← llm.response      847 tokens  835ms            │
│ +850ms    ⚙ tool.start        search_web                   │
│                                                             │
│ Waiting for events...                                       │
├─────────────────────────────────────────────────────────────┤
│ Ctrl+C Stop  p Pause  q Quit                               │
└─────────────────────────────────────────────────────────────┘
```

**SDK Integration:**

Your Python script must enable stdout streaming:

```python
import os
from watchtower import AgentTracePlugin

plugin = AgentTracePlugin(
    enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
    run_id=os.environ.get("AGENTTRACE_RUN_ID"),
)
```

---

### `watchtower list`

List recent trace files.

```bash
watchtower list [options]
```

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--limit` | `-n` | Number of traces to show | `10` |
| `--since` | | Filter by date (YYYY-MM-DD) | - |

**Examples:**

```bash
# List last 10 traces
watchtower list

# List last 50 traces
watchtower list --limit 50
watchtower list -n 50

# Filter by date
watchtower list --since 2024-01-10
```

**Interface:**

```
┌──────────────────────────────────────────────────────────────┐
│ Recent Traces                                    10 traces   │
├──────────────────────────────────────────────────────────────┤
│ RUN ID    DATE        SIZE      AGE                         │
│ abc123    2024-01-15  12.3 KB   2 hours ago                 │
│ def456    2024-01-15   8.7 KB   5 hours ago                 │
│ ghi789    2024-01-14  24.1 KB   1 day ago                   │
│ jkl012    2024-01-14   3.2 KB   1 day ago                   │
│ mno345    2024-01-13  15.8 KB   2 days ago                  │
├──────────────────────────────────────────────────────────────┤
│ ↑↓/jk Navigate  Enter View  q Quit                          │
└──────────────────────────────────────────────────────────────┘
```

**Keyboard Actions:**

| Key | Action |
|-----|--------|
| `Enter` | Open selected trace in `show` view |
| `↑` / `k` | Move selection up |
| `↓` / `j` | Move selection down |
| `q` | Quit |

---

### `watchtower config`

View and manage CLI configuration.

```bash
watchtower config [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--init` | Create default config file if it doesn't exist |
| `--set <key=value>` | Set a configuration value |

**Examples:**

```bash
# Show current configuration
watchtower config

# Initialize default config
watchtower config --init

# Set configuration values
watchtower config --set theme=light
watchtower config --set timestampFormat=absolute
watchtower config --set maxEvents=500
watchtower config --set defaultPython=/usr/bin/python3
```

**Configuration Keys:**

| Key | Type | Values | Default | Description |
|-----|------|--------|---------|-------------|
| `theme` | string | `dark`, `light`, `minimal` | `dark` | Color theme |
| `maxEvents` | number | Any positive integer | `1000` | Max events to load |
| `timestampFormat` | string | `relative`, `absolute`, `unix` | `relative` | Time display format |
| `defaultPython` | string | Path to Python | `python3` | Python executable for `tail` |

---

## Configuration

### Config File Location

```
~/.watchtower/cli.yaml
```

### Config File Format

```yaml
# Theme: dark, light, or minimal
theme: dark

# Maximum events to display in show command
maxEvents: 1000

# Timestamp format: relative (+123ms), absolute (14:32:01.000), or unix (1705329121.000)
timestampFormat: relative

# Python executable for tail command
defaultPython: python3
```

### Trace Directory

Traces are stored in:

```
~/.watchtower/traces/
```

This can be overridden by setting `AGENTTRACE_DIR` environment variable.

---

## Keyboard Shortcuts

### Global

| Key | Action |
|-----|--------|
| `q` | Quit the application |
| `Ctrl+C` | Quit / Stop process |

### Navigation (show, list)

| Key | Action |
|-----|--------|
| `↑` / `k` | Move up |
| `↓` / `j` | Move down |
| `Page Up` / `u` | Page up |
| `Page Down` / `d` | Page down |
| `g` | Jump to first item |
| `G` | Jump to last item |
| `Enter` | Select / Expand |
| `b` / `Esc` | Go back |

### Live Tail (tail)

| Key | Action |
|-----|--------|
| `p` | Pause / Resume streaming |
| `Ctrl+C` | Stop the running process |

---

## Themes

### Dark (Default)

Optimized for dark terminal backgrounds. Uses bright colors for visibility.

### Light

Optimized for light terminal backgrounds. Uses darker colors for contrast.

### Minimal

Reduced color palette. Useful for terminals with limited color support or accessibility needs.

---

## Trace Resolution

The `show` command accepts several formats for identifying traces:

### 1. Special Keywords

| Keyword | Description |
|---------|-------------|
| `last` | Most recently modified trace file |

### 2. Run ID

Just the run ID portion (last part after underscore):

```bash
watchtower show abc123
```

Searches for files matching `*_abc123.jsonl`

### 3. Full Filename

Date and run ID without extension:

```bash
watchtower show 2024-01-15_abc123
```

### 4. File Path

Absolute or relative path to a `.jsonl` file:

```bash
watchtower show ./traces/my-trace.jsonl
watchtower show /home/user/.watchtower/traces/2024-01-15_abc123.jsonl
```

### Resolution Order

1. If contains `/` or `\` → treated as file path
2. If ends with `.jsonl` → treated as filename in trace directory
3. If equals `last` → most recent file
4. Otherwise → search for matching run ID

---

## Troubleshooting

### "No traces found"

**Check the trace directory exists:**

```bash
ls ~/.watchtower/traces/
```

**Verify the SDK is writing traces:**

```python
# Ensure the plugin is added
plugins=[AgentTracePlugin()]
```

### "Command not found: watchtower"

**Verify installation:**

```bash
npm list -g @watchtower/cli
```

**Check PATH includes npm global bin:**

```bash
# For npm
export PATH="$PATH:$(npm config get prefix)/bin"

# For pnpm
export PATH="$PATH:$(pnpm config get global-bin-dir)"
```

### "Process exited with code 1"

The Python script failed. Check:

1. Script path is correct
2. Python executable exists
3. Script runs successfully standalone:
   ```bash
   python my_agent.py
   ```

### Events not appearing in tail

1. **SDK not configured for stdout:**
   ```python
   enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1"
   ```

2. **Python buffering output:** CLI sets `PYTHONUNBUFFERED=1`, but verify your script doesn't override.

3. **Events being filtered:** Ensure events have valid `type`, `run_id`, and `timestamp` fields.

### Display issues

1. **Garbled characters:** Ensure terminal supports Unicode
2. **Missing colors:** Ensure terminal supports ANSI colors
3. **Layout broken:** Ensure terminal is at least 60 columns wide

### Getting Help

- [GitHub Issues](https://github.com/Watchtower-Labs/watchtower-cli/issues)
- [GitHub Discussions](https://github.com/Watchtower-Labs/watchtower-cli/discussions)

---

## See Also

- [SDK Guide](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/SDK.md) - Python SDK integration
- [Architecture](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/ARCHITECTURE.md) - System internals
- [Google ADK Documentation](https://google.github.io/adk-docs/)
