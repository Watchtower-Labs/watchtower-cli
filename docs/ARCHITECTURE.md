# Watchtower Architecture

This document describes the internal architecture of Watchtower, an observability platform for [Google ADK](https://google.github.io/adk-docs/) agents.

## Table of Contents

- [System Overview](#system-overview)
- [Repository Structure](#repository-structure)
- [Architecture Diagram](#architecture-diagram)
- [Components](#components)
  - [Python SDK](#python-sdk)
  - [TypeScript CLI](#typescript-cli)
- [Data Flow](#data-flow)
- [File Formats](#file-formats)
- [Security Model](#security-model)
- [Future Considerations](#future-considerations)

## System Overview

Watchtower consists of two main components:

1. **Python SDK** (`watchtower-adk`) - Instruments ADK agents via a plugin system
2. **TypeScript CLI** (`@watchtower/cli`) - Renders traces in the terminal

The components communicate through:
- **File System**: JSONL trace files in `~/.watchtower/traces/`
- **Stdio Streams**: JSON-RPC notifications for live tailing

## Repository Structure

The project is organized as a monorepo with components on different branches:

| Branch | Package | Description |
|--------|---------|-------------|
| [`main`](https://github.com/Watchtower-Labs/watchtower-cli/tree/main) | - | Landing page (Next.js) and monorepo setup |
| [`cli`](https://github.com/Watchtower-Labs/watchtower-cli/tree/cli) | `@watchtower/cli` | TypeScript CLI (Ink/React) |
| [`feature/phase1-sdk-core`](https://github.com/Watchtower-Labs/watchtower-cli/tree/feature/phase1-sdk-core) | `watchtower-adk` | Python SDK (ADK plugin) |

```
watchtower-cli/
├── packages/
│   ├── cli/              # TypeScript CLI (cli branch)
│   └── web/              # Next.js landing page (main branch)
├── watchtower/           # Python SDK (feature/phase1-sdk-core branch)
├── examples/             # SDK usage examples
└── tests/                # SDK tests
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        TypeScript CLI (Ink)                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │   Commands  │  │   Process   │  │    Event    │  │     UI     │  │   │
│  │  │   (yargs)   │  │   Manager   │  │   Parser    │  │  Renderer  │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │   │
│  └─────────┼────────────────┼────────────────┼───────────────┼──────────┘   │
│            │                │                │               │              │
│            │         spawn/attach      parse NDJSON     React/Ink          │
│            │                │                │               │              │
│  ┌─────────┼────────────────┼────────────────┼───────────────┼──────────┐   │
│  │         ▼                ▼                ▼               ▼          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │                     Communication Layer                      │    │   │
│  │  │                                                              │    │   │
│  │  │   LIVE TAIL: stdio (NDJSON stream)                          │    │   │
│  │  │   PASSIVE:   File read (~/.watchtower/traces/*.jsonl)       │    │   │
│  │  │                                                              │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                              Python SDK                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Python SDK Package                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐   │   │
│  │  │  ADK Plugin │  │   Event     │  │    Trace    │  │   Stdout   │   │   │
│  │  │  (hooks)    │  │  Collector  │  │   Writer    │  │   Emitter  │   │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘   │   │
│  │         │                │                │               │          │   │
│  │         └────────────────┴────────────────┴───────────────┘          │   │
│  │                                   │                                   │   │
│  │                                   ▼                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │                      Google ADK Runtime                      │     │   │
│  │  │   Runner → Agent → Tools → LLM → Events                     │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

### Python SDK

**Repository:** [Watchtower-Labs/watchtower-cli](https://github.com/Watchtower-Labs/watchtower-cli) ([`feature/phase1-sdk-core`](https://github.com/Watchtower-Labs/watchtower-cli/tree/feature/phase1-sdk-core) branch)

#### Structure

```
watchtower/
├── __init__.py              # Public API exports
├── plugin.py                # ADK BasePlugin implementation
├── collector.py             # Event aggregation and normalization
├── writers/
│   ├── __init__.py
│   ├── file_writer.py       # Write traces to ~/.watchtower/traces/
│   └── stdout_writer.py     # Emit NDJSON to stdout for live tail
├── models/
│   ├── __init__.py
│   ├── events.py            # Event dataclasses
│   └── trace.py             # Trace container and metadata
├── config.py                # Configuration management
└── utils/
    ├── __init__.py
    ├── timing.py            # High-resolution timing utilities
    └── serialization.py     # JSON serialization helpers
```

#### Plugin Architecture

The SDK implements Google ADK's `BasePlugin` interface:

```python
class AgentTracePlugin(BasePlugin):
    """Hooks into ADK agent lifecycle events."""

    # Lifecycle hooks
    async def before_run_callback(self, *, invocation_context): ...
    async def after_run_callback(self, *, invocation_context): ...

    # LLM hooks
    async def before_model_callback(self, *, callback_context, llm_request): ...
    async def after_model_callback(self, *, callback_context, llm_response): ...

    # Tool hooks
    async def before_tool_callback(self, *, tool, tool_args, tool_context): ...
    async def after_tool_callback(self, *, tool, tool_args, tool_context, tool_response): ...
    async def on_tool_error_callback(self, *, tool, tool_args, tool_context, error): ...

    # Event hooks
    async def on_event_callback(self, *, invocation_context, event): ...
```

#### Writers

**FileWriter:**
- Writes to `~/.watchtower/traces/{date}_{run_id}.jsonl`
- Buffers events (configurable buffer size)
- Uses file locking for concurrent access safety
- Creates directories with `0700` permissions

**StdoutWriter:**
- Emits JSON-RPC 2.0 notifications to stdout
- Line-buffered for real-time streaming
- Used when `AGENTTRACE_LIVE=1`

---

### TypeScript CLI

**Repository:** [Watchtower-Labs/watchtower-cli](https://github.com/Watchtower-Labs/watchtower-cli) ([`cli`](https://github.com/Watchtower-Labs/watchtower-cli/tree/cli) branch, `packages/cli`)

#### Structure

```
packages/cli/
├── src/
│   ├── index.tsx              # Entry point, yargs command routing
│   ├── commands/
│   │   ├── show.tsx           # watchtower show [trace]
│   │   ├── tail.tsx           # watchtower tail <script>
│   │   ├── list.tsx           # watchtower list
│   │   └── config.tsx         # watchtower config
│   ├── components/
│   │   ├── Header.tsx         # Title bar with run info
│   │   ├── Summary.tsx        # Statistics display
│   │   ├── EventList.tsx      # Scrollable event list
│   │   ├── EventLine.tsx      # Single event row
│   │   ├── EventDetail.tsx    # Expanded event view
│   │   └── StatusBar.tsx      # Keyboard shortcuts
│   ├── hooks/
│   │   ├── useKeyboard.ts     # Keyboard navigation
│   │   ├── useProcessStream.ts # Python process management
│   │   └── useTraceFile.ts    # Trace file loading
│   └── lib/
│       ├── types.ts           # TypeScript interfaces
│       ├── parser.ts          # NDJSON/JSON-RPC parsing
│       ├── theme.ts           # Colors, icons, formatters
│       ├── paths.ts           # File system utilities
│       └── config.ts          # CLI configuration
└── dist/                      # Compiled JavaScript
```

#### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI Framework | [Ink](https://github.com/vadimdemedes/ink) | React renderer for terminals |
| State | React hooks | Component state management |
| CLI Parsing | [yargs](https://yargs.js.org/) | Command-line argument parsing |
| Type System | TypeScript (strict) | Static type checking |
| Build | tsc | TypeScript compilation |

#### Component Hierarchy

```
App
├── Header
│   └── Status indicator (LIVE, PAUSED, etc.)
├── Summary
│   └── Statistics (duration, tokens, calls)
├── EventList
│   └── EventLine (×N visible)
│       └── Icon, Timestamp, Type, Detail
├── EventDetail (expanded view)
│   └── Type-specific fields + Raw JSON
└── StatusBar
    └── Keyboard shortcuts
```

#### Hooks

**useProcessStream:**
```typescript
function useProcessStream(
  script: string[],
  onEvent: (event: TraceEvent) => void
): {
  status: 'starting' | 'running' | 'stopped' | 'error';
  runId: string;
  error: string | null;
  stats: LiveStats;
  stop: () => void;
}
```

- Spawns Python process with `child_process.spawn()`
- Sets environment variables (`AGENTTRACE_LIVE`, etc.)
- Parses stdout via readline interface
- Handles process lifecycle events

**useTraceFile:**
```typescript
function useTraceFile(traceRef: string): {
  events: TraceEvent[];
  summary: TraceSummary;
  loading: boolean;
  error: string | null;
}
```

- Resolves trace reference (last, run ID, path)
- Stream-parses JSONL files
- Computes summary statistics

**useKeyboard:**
```typescript
function useKeyboard(handlers: {
  onUp?: () => void;
  onDown?: () => void;
  onEnter?: () => void;
  onQuit?: () => void;
  // ... more handlers
}): void
```

- Wraps Ink's `useInput` hook
- Supports arrow keys + vim bindings
- Handles quit/exit actions

---

## Data Flow

### Passive Viewing (show command)

```
┌─────────────────┐
│ watchtower show │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ resolveTracePath │ ─── "last" / "abc123" / "./path.jsonl"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ~/.watchtower/  │
│ traces/*.jsonl  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ parseTraceFile  │ ─── Stream read + JSON parse
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌─────────┐
│events │ │ summary │
└───┬───┘ └────┬────┘
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────┐
│  React/Ink UI   │ ─── Interactive display
└─────────────────┘
```

### Live Tailing (tail command)

```
┌─────────────────────┐
│ watchtower tail     │
│ python agent.py     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ useProcessStream    │
│ spawn(python, args) │
│                     │
│ env:                │
│   PYTHONUNBUFFERED=1│
│   AGENTTRACE_LIVE=1 │
│   AGENTTRACE_RUN_ID │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Python Process    │
│   (agent running)   │
└──────────┬──────────┘
           │
           │ stdout (JSON-RPC)
           │ {"jsonrpc":"2.0","method":"tool.start",...}
           ▼
┌─────────────────────┐
│ readline interface  │
│ parseJsonRpc(line)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ handleEvent(event)  │
│ setStats(...)       │
│ setCurrentEvent(...) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   React/Ink UI      │
│   <Static> for done │
│   current for live  │
└─────────────────────┘
```

---

## File Formats

### Trace Files (JSONL)

**Location:** `~/.watchtower/traces/{date}_{run_id}.jsonl`

**Format:** Newline-delimited JSON (one event per line)

```jsonl
{"type":"run.start","run_id":"abc123","timestamp":1705329121.000,"agent_name":"my_agent"}
{"type":"llm.request","run_id":"abc123","timestamp":1705329121.012,"model":"gemini-2.0-flash"}
{"type":"llm.response","run_id":"abc123","timestamp":1705329121.847,"total_tokens":1203}
{"type":"tool.start","run_id":"abc123","timestamp":1705329121.850,"tool_name":"search"}
{"type":"tool.end","run_id":"abc123","timestamp":1705329122.341,"tool_name":"search"}
{"type":"run.end","run_id":"abc123","timestamp":1705329123.415,"duration_ms":2415}
```

### Live Stream (JSON-RPC 2.0)

**Format:** JSON-RPC 2.0 notifications (no `id` field)

```json
{"jsonrpc":"2.0","method":"run.start","params":{"type":"run.start","run_id":"abc123",...}}
{"jsonrpc":"2.0","method":"tool.start","params":{"type":"tool.start","tool_name":"search",...}}
```

### Event Schema

All events share these base fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Event type (e.g., `run.start`, `tool.end`) |
| `run_id` | string | Unique run identifier |
| `timestamp` | number | Unix timestamp in seconds |

Additional fields vary by event type. See [SDK Guide](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/docs/SDK.md#event-types) for full schema.

### Configuration Files

**CLI:** `~/.watchtower/cli.yaml`
```yaml
theme: dark
maxEvents: 1000
timestampFormat: relative
defaultPython: python3
```

**SDK:** `~/.watchtower/config.yaml`
```yaml
trace_dir: ~/.watchtower/traces
retention_days: 30
buffer_size: 10
sanitize_args: true
max_response_preview: 500
```

---

## Security Model

### Threat Model

Watchtower operates in a **local-only, single-user** context:

- Traces contain potentially sensitive data (tool arguments, LLM prompts)
- No network transmission in MVP
- Files accessible only to the current user

### Controls

| Control | Implementation |
|---------|----------------|
| File Permissions | Directories: `0700`, Files: `0600` |
| Argument Sanitization | Redacts patterns: password, secret, token, api_key, auth, credential |
| No Remote Transmission | SDK operates entirely locally |
| No Shell Injection | CLI uses `spawn()` with argument arrays, not shell strings |

### Data Sensitivity

| Data Type | Sensitivity | Handling |
|-----------|-------------|----------|
| Tool arguments | High | Sanitized by default |
| LLM prompts | High | Not captured (SDK design choice) |
| Tool responses | Medium | Truncated to `max_response_preview` |
| Timestamps/metadata | Low | Stored as-is |

---

## Future Considerations

### Cloud Storage (Post-MVP)

Support for remote trace storage:

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud Run / GKE / Lambda                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Agent Container                                    │     │
│  │  ┌──────────────┐        ┌──────────────┐          │     │
│  │  │ ADK Agent    │───────▶│ AgentTrace   │          │     │
│  │  │              │        │ Plugin       │          │     │
│  │  └──────────────┘        └──────┬───────┘          │     │
│  └─────────────────────────────────┼──────────────────┘     │
└────────────────────────────────────┼────────────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │   Cloud Storage Backend        │
                    │  • Google Cloud Storage (GCS)  │
                    │  • AWS S3                      │
                    │  • PostgreSQL + TimescaleDB    │
                    └────────────────────────────────┘
```

### HTTP Streaming Gateway

Real-time remote access:

```bash
# Future CLI usage
watchtower tail --remote https://my-agent.run.app --auth-token $TOKEN
```

### Additional Features

| Feature | Description | Complexity |
|---------|-------------|------------|
| Filtering | `--tool search_web --errors-only` | Low |
| Export | `--format csv/json` | Low |
| Search | Full-text search across traces | Medium |
| Web Dashboard | Browser-based UI | High |
| Multi-framework | LangChain, CrewAI adapters | High |

---

## References

- [System Design Document](https://github.com/Watchtower-Labs/watchtower-cli/blob/main/adk-observability-system-design.md) - Full specification
- [Google ADK Documentation](https://google.github.io/adk-docs/) - Agent framework
- [Ink Documentation](https://github.com/vadimdemedes/ink) - Terminal UI framework
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification) - Live stream format
