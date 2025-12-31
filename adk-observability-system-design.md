# ADK Observability SDK - System Design Document

**Project Name:** `agenttrace`  
**Version:** 0.1.0 (MVP)  
**Date:** December 2024  
**Stack:** Python SDK + TypeScript/Ink CLI  

---

## 1. Executive Summary

`agenttrace` is a plug-and-use observability SDK for Google ADK that lets developers view agent activity, tool calls, LLM interactions, and execution history through their terminal. The MVP focuses on two core experiences:

1. **Passive Viewing** (`agenttrace show`) - View past traces from files
2. **Live Tailing** (`agenttrace tail`) - Stream events in real-time

The system consists of a Python SDK (wraps Google ADK via plugin) and a TypeScript CLI (renders UI via Ink).

---

## 2. Architecture Overview

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
│  │  │   PASSIVE:   File read (~/.agenttrace/traces/*.jsonl)       │    │   │
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

---

## 3. Component Design

### 3.1 Python SDK (`agenttrace-sdk`)

#### 3.1.1 Package Structure

```
agenttrace/
├── __init__.py              # Public API exports
├── plugin.py                # ADK BasePlugin implementation
├── collector.py             # Event aggregation and normalization
├── writers/
│   ├── __init__.py
│   ├── file_writer.py       # Write traces to ~/.agenttrace/traces/
│   └── stdout_writer.py     # Emit NDJSON to stdout for live tail
├── models/
│   ├── __init__.py
│   ├── events.py            # Event dataclasses (ToolCall, LLMRequest, etc.)
│   └── trace.py             # Trace container and metadata
├── config.py                # Configuration management
└── utils/
    ├── __init__.py
    ├── timing.py            # High-resolution timing utilities
    └── serialization.py     # JSON serialization helpers
```

#### 3.1.2 Core Classes

**AgentTracePlugin (plugin.py)**

The main entry point - implements Google ADK's `BasePlugin` interface to hook into all agent lifecycle events.

```python
from google.adk.plugins.base_plugin import BasePlugin
from google.adk.agents.invocation_context import InvocationContext
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest, LlmResponse
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from google.adk.events import Event
from typing import Optional
import time
import uuid

class AgentTracePlugin(BasePlugin):
    """
    Observability plugin for Google ADK that captures all agent activity
    and emits it to file and/or stdout.
    """
    
    def __init__(
        self,
        trace_dir: str = "~/.agenttrace/traces",
        enable_file: bool = True,
        enable_stdout: bool = False,  # True when CLI spawns with --tail
        run_id: Optional[str] = None,
    ):
        super().__init__(name="agenttrace")
        self.collector = EventCollector()
        self.file_writer = FileWriter(trace_dir) if enable_file else None
        self.stdout_writer = StdoutWriter() if enable_stdout else None
        self.run_id = run_id or str(uuid.uuid4())[:8]
        self._invocation_start: float = 0
    
    # === Lifecycle Hooks ===
    
    async def before_run_callback(
        self, 
        *, 
        invocation_context: InvocationContext
    ) -> Optional[Event]:
        self._invocation_start = time.perf_counter()
        event = self.collector.create_event(
            type="run.start",
            run_id=self.run_id,
            invocation_id=invocation_context.invocation_id,
            agent_name=invocation_context.agent.name,
            timestamp=time.time(),
        )
        self._emit(event)
        return None
    
    async def after_run_callback(
        self,
        *,
        invocation_context: InvocationContext,
    ) -> None:
        duration = time.perf_counter() - self._invocation_start
        event = self.collector.create_event(
            type="run.end",
            run_id=self.run_id,
            invocation_id=invocation_context.invocation_id,
            duration_ms=duration * 1000,
            summary=self.collector.get_summary(),
        )
        self._emit(event)
        self._flush()
    
    # === LLM Hooks ===
    
    async def before_model_callback(
        self,
        *,
        callback_context: CallbackContext,
        llm_request: LlmRequest,
    ) -> Optional[LlmResponse]:
        callback_context.state["_llm_start"] = time.perf_counter()
        callback_context.state["_llm_request_id"] = str(uuid.uuid4())[:8]
        
        event = self.collector.create_event(
            type="llm.request",
            run_id=self.run_id,
            request_id=callback_context.state["_llm_request_id"],
            model=self._extract_model(llm_request),
            message_count=len(llm_request.contents) if llm_request.contents else 0,
            tools_available=self._extract_tool_names(llm_request),
        )
        self._emit(event)
        return None
    
    async def after_model_callback(
        self,
        *,
        callback_context: CallbackContext,
        llm_response: LlmResponse,
    ) -> Optional[LlmResponse]:
        duration = time.perf_counter() - callback_context.state.get("_llm_start", 0)
        
        event = self.collector.create_event(
            type="llm.response",
            run_id=self.run_id,
            request_id=callback_context.state.get("_llm_request_id"),
            duration_ms=duration * 1000,
            input_tokens=self._safe_token_count(llm_response, "input"),
            output_tokens=self._safe_token_count(llm_response, "output"),
            total_tokens=self._safe_token_count(llm_response, "total"),
            has_tool_calls=self._has_tool_calls(llm_response),
            finish_reason=self._extract_finish_reason(llm_response),
        )
        self._emit(event)
        return None
    
    # === Tool Hooks ===
    
    async def before_tool_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict,
        tool_context: ToolContext,
    ) -> Optional[dict]:
        tool_context.state["_tool_start"] = time.perf_counter()
        tool_context.state["_tool_call_id"] = tool_context.function_call_id or str(uuid.uuid4())[:8]
        
        event = self.collector.create_event(
            type="tool.start",
            run_id=self.run_id,
            tool_call_id=tool_context.state["_tool_call_id"],
            tool_name=tool.name,
            tool_args=self._sanitize_args(tool_args),
            agent_name=tool_context.agent_name,
        )
        self._emit(event)
        return None
    
    async def after_tool_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict,
        tool_context: ToolContext,
        tool_response: dict,
    ) -> Optional[dict]:
        duration = time.perf_counter() - tool_context.state.get("_tool_start", 0)
        
        event = self.collector.create_event(
            type="tool.end",
            run_id=self.run_id,
            tool_call_id=tool_context.state.get("_tool_call_id"),
            tool_name=tool.name,
            duration_ms=duration * 1000,
            response_preview=self._truncate_response(tool_response),
            success=self._infer_success(tool_response),
        )
        self._emit(event)
        return None
    
    async def on_tool_error_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict,
        tool_context: ToolContext,
        error: Exception,
    ) -> Optional[dict]:
        event = self.collector.create_event(
            type="tool.error",
            run_id=self.run_id,
            tool_call_id=tool_context.state.get("_tool_call_id"),
            tool_name=tool.name,
            error_type=type(error).__name__,
            error_message=str(error),
        )
        self._emit(event)
        return None
    
    # === Event Hooks ===
    
    async def on_event_callback(
        self,
        *,
        invocation_context: InvocationContext,
        event: Event,
    ) -> Optional[Event]:
        # Capture state changes from ADK events
        if event.actions and event.actions.state_delta:
            trace_event = self.collector.create_event(
                type="state.change",
                run_id=self.run_id,
                author=event.author,
                state_delta=dict(event.actions.state_delta),
            )
            self._emit(trace_event)
        return None
    
    # === Internal Methods ===
    
    def _emit(self, event: dict) -> None:
        """Emit event to all enabled writers."""
        if self.file_writer:
            self.file_writer.write(event)
        if self.stdout_writer:
            self.stdout_writer.write(event)
    
    def _flush(self) -> None:
        """Flush all writers at end of run."""
        if self.file_writer:
            self.file_writer.flush()
        if self.stdout_writer:
            self.stdout_writer.flush()
    
    # ... helper methods for extraction and sanitization
```

**Event Models (models/events.py)**

```python
from dataclasses import dataclass, field, asdict
from typing import Optional, Any, List
from enum import Enum
import time


class EventType(str, Enum):
    RUN_START = "run.start"
    RUN_END = "run.end"
    LLM_REQUEST = "llm.request"
    LLM_RESPONSE = "llm.response"
    TOOL_START = "tool.start"
    TOOL_END = "tool.end"
    TOOL_ERROR = "tool.error"
    STATE_CHANGE = "state.change"
    AGENT_TRANSFER = "agent.transfer"


@dataclass
class BaseEvent:
    type: EventType
    run_id: str
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class LLMRequestEvent(BaseEvent):
    type: EventType = EventType.LLM_REQUEST
    request_id: str = ""
    model: str = ""
    message_count: int = 0
    tools_available: List[str] = field(default_factory=list)


@dataclass
class LLMResponseEvent(BaseEvent):
    type: EventType = EventType.LLM_RESPONSE
    request_id: str = ""
    duration_ms: float = 0
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    has_tool_calls: bool = False
    finish_reason: str = ""


@dataclass
class ToolStartEvent(BaseEvent):
    type: EventType = EventType.TOOL_START
    tool_call_id: str = ""
    tool_name: str = ""
    tool_args: dict = field(default_factory=dict)
    agent_name: str = ""


@dataclass
class ToolEndEvent(BaseEvent):
    type: EventType = EventType.TOOL_END
    tool_call_id: str = ""
    tool_name: str = ""
    duration_ms: float = 0
    response_preview: str = ""
    success: bool = True


@dataclass
class ToolErrorEvent(BaseEvent):
    type: EventType = EventType.TOOL_ERROR
    tool_call_id: str = ""
    tool_name: str = ""
    error_type: str = ""
    error_message: str = ""


@dataclass
class RunSummary:
    total_duration_ms: float = 0
    llm_calls: int = 0
    tool_calls: int = 0
    total_tokens: int = 0
    errors: int = 0
    tools_used: List[str] = field(default_factory=list)
```

**File Writer (writers/file_writer.py)**

```python
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional
import fcntl  # For file locking on Unix


class FileWriter:
    """
    Writes trace events to JSONL files in ~/.agenttrace/traces/
    
    File naming: {date}_{run_id}.jsonl
    Example: 2024-01-15_abc123.jsonl
    """
    
    def __init__(self, trace_dir: str = "~/.agenttrace/traces"):
        self.trace_dir = Path(trace_dir).expanduser()
        self.trace_dir.mkdir(parents=True, exist_ok=True)
        self._current_file: Optional[Path] = None
        self._file_handle = None
        self._buffer: list = []
        self._buffer_size = 10  # Flush every N events
    
    def _get_trace_file(self, run_id: str) -> Path:
        """Get or create trace file for this run."""
        if self._current_file is None:
            date_str = datetime.now().strftime("%Y-%m-%d")
            filename = f"{date_str}_{run_id}.jsonl"
            self._current_file = self.trace_dir / filename
        return self._current_file
    
    def write(self, event: dict) -> None:
        """Buffer and write event to trace file."""
        self._buffer.append(event)
        
        if len(self._buffer) >= self._buffer_size:
            self._flush_buffer(event.get("run_id", "unknown"))
    
    def _flush_buffer(self, run_id: str) -> None:
        """Write buffered events to file."""
        if not self._buffer:
            return
        
        trace_file = self._get_trace_file(run_id)
        
        with open(trace_file, "a") as f:
            # File locking for concurrent access safety
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                for event in self._buffer:
                    f.write(json.dumps(event, separators=(',', ':'), default=str) + "\n")
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            except BlockingIOError:
                # Another process has the lock, skip this flush
                pass
        
        self._buffer.clear()
    
    def flush(self) -> None:
        """Force flush any remaining buffered events."""
        if self._buffer:
            self._flush_buffer(self._buffer[0].get("run_id", "unknown"))
    
    def get_trace_path(self) -> Optional[Path]:
        """Return the current trace file path."""
        return self._current_file
```

**Stdout Writer (writers/stdout_writer.py)**

```python
import sys
import json
from typing import TextIO


class StdoutWriter:
    """
    Emits events as NDJSON (newline-delimited JSON) to stdout.
    Used for live tailing when CLI spawns the Python process.
    
    Format follows JSON-RPC 2.0 notification structure for extensibility.
    """
    
    def __init__(self, stream: TextIO = None):
        self._stream = stream or sys.stdout
        self._ensure_unbuffered()
    
    def _ensure_unbuffered(self) -> None:
        """Ensure stdout is unbuffered for real-time streaming."""
        if hasattr(self._stream, 'reconfigure'):
            self._stream.reconfigure(line_buffering=True)
    
    def write(self, event: dict) -> None:
        """
        Write event as JSON-RPC 2.0 notification.
        
        Output format:
        {"jsonrpc":"2.0","method":"<event.type>","params":{...event}}
        """
        message = {
            "jsonrpc": "2.0",
            "method": event.get("type", "unknown"),
            "params": event
        }
        
        line = json.dumps(message, separators=(',', ':'), default=str)
        self._stream.write(line + "\n")
        self._stream.flush()
    
    def flush(self) -> None:
        """Explicit flush (usually no-op due to line buffering)."""
        self._stream.flush()
```

#### 3.1.3 SDK Usage API

**Simple Integration (Recommended)**

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from agenttrace import AgentTracePlugin

# Define your agent as normal
agent = Agent(
    name="my_agent",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant.",
    tools=[my_tool_1, my_tool_2],
)

# Add observability with one line
runner = InMemoryRunner(
    agent=agent,
    app_name="my_app",
    plugins=[AgentTracePlugin()]  # <-- Just add this
)

# Run as normal - traces automatically saved to ~/.agenttrace/traces/
async for event in runner.run_async(user_id, session_id, message):
    print(event.content)
```

**CLI-Spawned Mode (For Live Tailing)**

```python
import os
from agenttrace import AgentTracePlugin

# When spawned by CLI, enable stdout streaming
plugin = AgentTracePlugin(
    enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
    run_id=os.environ.get("AGENTTRACE_RUN_ID"),
)
```

---

### 3.2 TypeScript CLI (`agenttrace`)

#### 3.2.1 Package Structure

```
cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.tsx              # Entry point, command routing
│   ├── commands/
│   │   ├── show.tsx           # agenttrace show [trace]
│   │   ├── tail.tsx           # agenttrace tail <script>
│   │   └── list.tsx           # agenttrace list
│   ├── components/
│   │   ├── App.tsx            # Root component
│   │   ├── TraceView.tsx      # Passive trace display
│   │   ├── LiveView.tsx       # Real-time event stream
│   │   ├── EventList.tsx      # Scrollable event list
│   │   ├── EventDetail.tsx    # Expanded event view
│   │   ├── Summary.tsx        # Run summary stats
│   │   ├── Header.tsx         # Title bar with stats
│   │   └── StatusBar.tsx      # Bottom status/help bar
│   ├── hooks/
│   │   ├── useTraceFile.ts    # Load trace from file
│   │   ├── useProcessStream.ts # Spawn & stream from Python
│   │   └── useKeyboard.ts     # Keyboard navigation
│   ├── lib/
│   │   ├── parser.ts          # NDJSON/JSON-RPC parser
│   │   ├── process.ts         # Python process management
│   │   ├── paths.ts           # Trace directory utilities
│   │   └── types.ts           # Shared TypeScript types
│   └── styles/
│       └── theme.ts           # Color scheme and styling
└── bin/
    └── agenttrace             # Executable entry point
```

#### 3.2.2 Command Design

**`agenttrace show [trace]`** - Passive Viewing

```
$ agenttrace show last
$ agenttrace show 2024-01-15_abc123
$ agenttrace show ./path/to/trace.jsonl

┌─────────────────────────────────────────────────────────────┐
│ agenttrace • Run: abc123 • 2024-01-15 14:32:01             │
├─────────────────────────────────────────────────────────────┤
│ Summary                                                     │
│ Duration: 4.2s  LLM Calls: 3  Tool Calls: 5  Tokens: 2,847 │
├─────────────────────────────────────────────────────────────┤
│ Timeline                                                    │
│                                                             │
│ 14:32:01.000  ▶ run.start                                  │
│ 14:32:01.012  → llm.request     gemini-2.0-flash           │
│ 14:32:01.847  ← llm.response    1,203 tokens  835ms        │
│ 14:32:01.850  ⚙ tool.start      search_web                 │
│ 14:32:02.341  ✓ tool.end        search_web     491ms       │
│ 14:32:02.345  → llm.request     gemini-2.0-flash           │
│ 14:32:03.201  ← llm.response    892 tokens    856ms        │
│ 14:32:03.205  ⚙ tool.start      write_file                 │
│ 14:32:03.412  ✓ tool.end        write_file    207ms        │
│ 14:32:03.415  ■ run.end                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [↑↓] Navigate  [Enter] Expand  [q] Quit                    │
└─────────────────────────────────────────────────────────────┘
```

**`agenttrace tail <script>`** - Live Tailing

```
$ agenttrace tail python my_agent.py
$ agenttrace tail -- python my_agent.py --arg1 value1

┌─────────────────────────────────────────────────────────────┐
│ agenttrace • LIVE • Run: xyz789                     ● REC  │
├─────────────────────────────────────────────────────────────┤
│ Stats     Duration: 1.2s  Tokens: 847  Tools: 2            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 14:35:01.000  ▶ run.start                                  │
│ 14:35:01.012  → llm.request     gemini-2.0-flash           │
│ 14:35:01.847  ← llm.response    1,203 tokens               │
│ 14:35:01.850  ⚙ tool.start      search_web                 │
│                                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Running...             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Ctrl+C] Stop  [p] Pause  [f] Follow                       │
└─────────────────────────────────────────────────────────────┘
```

**`agenttrace list`** - List Recent Traces

```
$ agenttrace list
$ agenttrace list --limit 20
$ agenttrace list --since 2024-01-10

┌──────────────────────────────────────────────────────────────┐
│ Recent Traces                                                │
├──────────────────────────────────────────────────────────────┤
│ RUN ID    DATE        TIME      DURATION  TOOLS  TOKENS     │
│ abc123    2024-01-15  14:32:01  4.2s      5      2,847      │
│ def456    2024-01-15  13:15:22  2.1s      3      1,523      │
│ ghi789    2024-01-14  18:45:33  8.7s      12     5,291      │
│ jkl012    2024-01-14  16:22:11  1.3s      2      892        │
│ mno345    2024-01-14  14:08:45  3.5s      4      2,104      │
├──────────────────────────────────────────────────────────────┤
│ [Enter] View  [d] Delete  [q] Quit                          │
└──────────────────────────────────────────────────────────────┘
```

#### 3.2.3 Core Components

**Entry Point (src/index.tsx)**

```typescript
#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {ShowCommand} from './commands/show.js';
import {TailCommand} from './commands/tail.js';
import {ListCommand} from './commands/list.js';

yargs(hideBin(process.argv))
  .command(
    'show [trace]',
    'View a trace file',
    (yargs) => {
      return yargs.positional('trace', {
        describe: 'Trace ID, path, or "last"',
        default: 'last',
      });
    },
    (argv) => {
      render(<ShowCommand trace={argv.trace as string} />);
    }
  )
  .command(
    'tail <script..>',
    'Run a script and tail events live',
    (yargs) => {
      return yargs.positional('script', {
        describe: 'Python script and arguments',
        array: true,
      });
    },
    (argv) => {
      render(<TailCommand script={argv.script as string[]} />);
    }
  )
  .command(
    'list',
    'List recent traces',
    (yargs) => {
      return yargs
        .option('limit', {alias: 'n', type: 'number', default: 10})
        .option('since', {type: 'string'});
    },
    (argv) => {
      render(<ListCommand limit={argv.limit} since={argv.since} />);
    }
  )
  .demandCommand(1)
  .help()
  .parse();
```

**Show Command Component (src/commands/show.tsx)**

```typescript
import React, {useState, useEffect} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import {useTraceFile} from '../hooks/useTraceFile.js';
import {Header} from '../components/Header.js';
import {Summary} from '../components/Summary.js';
import {EventList} from '../components/EventList.js';
import {EventDetail} from '../components/EventDetail.js';
import {StatusBar} from '../components/StatusBar.js';
import {TraceEvent} from '../lib/types.js';

interface ShowCommandProps {
  trace: string;
}

export const ShowCommand: React.FC<ShowCommandProps> = ({trace}) => {
  const {exit} = useApp();
  const {events, summary, loading, error} = useTraceFile(trace);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedEvent, setExpandedEvent] = useState<TraceEvent | null>(null);

  useInput((input, key) => {
    if (input === 'q') exit();
    if (key.upArrow) setSelectedIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIndex((i) => Math.min(events.length - 1, i + 1));
    if (key.return) setExpandedEvent(events[selectedIndex] || null);
    if (input === 'b' || key.escape) setExpandedEvent(null);
  });

  if (loading) {
    return (
      <Box>
        <Text>Loading trace...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (expandedEvent) {
    return (
      <Box flexDirection="column">
        <Header runId={summary.runId} timestamp={summary.startTime} />
        <EventDetail event={expandedEvent} />
        <StatusBar keys={['b: Back', 'q: Quit']} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header runId={summary.runId} timestamp={summary.startTime} />
      <Summary {...summary} />
      <EventList
        events={events}
        selectedIndex={selectedIndex}
      />
      <StatusBar keys={['↑↓: Navigate', 'Enter: Expand', 'q: Quit']} />
    </Box>
  );
};
```

**Tail Command Component (src/commands/tail.tsx)**

```typescript
import React, {useState, useEffect, useCallback} from 'react';
import {Box, Text, Static, useApp, useInput} from 'ink';
import {useProcessStream} from '../hooks/useProcessStream.js';
import {Header} from '../components/Header.js';
import {StatusBar} from '../components/StatusBar.js';
import {TraceEvent, RunStats} from '../lib/types.js';

interface TailCommandProps {
  script: string[];
}

export const TailCommand: React.FC<TailCommandProps> = ({script}) => {
  const {exit} = useApp();
  const [paused, setPaused] = useState(false);
  const [completedEvents, setCompletedEvents] = useState<TraceEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<TraceEvent | null>(null);
  const [stats, setStats] = useState<RunStats>({
    duration: 0,
    tokens: 0,
    toolCalls: 0,
    llmCalls: 0,
  });

  const handleEvent = useCallback((event: TraceEvent) => {
    if (paused) return;
    
    // Update stats
    setStats((prev) => ({
      ...prev,
      duration: event.timestamp - (prev.startTime || event.timestamp),
      tokens: prev.tokens + (event.params?.total_tokens || 0),
      toolCalls: prev.toolCalls + (event.type.startsWith('tool.') ? 1 : 0),
      llmCalls: prev.llmCalls + (event.type === 'llm.response' ? 1 : 0),
    }));

    // Move current to completed, set new current
    if (currentEvent) {
      setCompletedEvents((prev) => [...prev, currentEvent]);
    }
    setCurrentEvent(event);
  }, [paused, currentEvent]);

  const {status, runId, error} = useProcessStream(script, handleEvent);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit();
    if (input === 'p') setPaused((p) => !p);
  });

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <StatusBar keys={['q: Quit']} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header 
        runId={runId} 
        live={true} 
        status={status}
        paused={paused}
      />
      
      <Box borderStyle="single" paddingX={1}>
        <Text>
          Duration: <Text bold>{(stats.duration / 1000).toFixed(1)}s</Text>
          {'  '}Tokens: <Text bold>{stats.tokens.toLocaleString()}</Text>
          {'  '}Tools: <Text bold>{stats.toolCalls}</Text>
        </Text>
      </Box>

      {/* Completed events - rendered once via Static */}
      <Static items={completedEvents}>
        {(event, index) => (
          <EventLine key={index} event={event} />
        )}
      </Static>

      {/* Current event - dynamically updated */}
      {currentEvent && (
        <Box>
          <EventLine event={currentEvent} current={true} />
        </Box>
      )}

      {status === 'running' && (
        <Box marginTop={1}>
          <Text color="yellow">░░░░░ Running...</Text>
        </Box>
      )}

      <StatusBar 
        keys={[
          'Ctrl+C: Stop',
          `p: ${paused ? 'Resume' : 'Pause'}`,
        ]} 
      />
    </Box>
  );
};

const EventLine: React.FC<{event: TraceEvent; current?: boolean}> = ({event, current}) => {
  const icon = getEventIcon(event.type);
  const color = getEventColor(event.type);
  
  return (
    <Box>
      <Text dimColor>{formatTime(event.timestamp)}</Text>
      <Text> </Text>
      <Text color={color}>{icon}</Text>
      <Text> </Text>
      <Text bold={current}>{event.type.padEnd(15)}</Text>
      <Text> </Text>
      <Text dimColor>{formatEventDetail(event)}</Text>
    </Box>
  );
};

function getEventIcon(type: string): string {
  const icons: Record<string, string> = {
    'run.start': '▶',
    'run.end': '■',
    'llm.request': '→',
    'llm.response': '←',
    'tool.start': '⚙',
    'tool.end': '✓',
    'tool.error': '✗',
    'state.change': '◊',
  };
  return icons[type] || '•';
}

function getEventColor(type: string): string {
  if (type.includes('error')) return 'red';
  if (type.includes('llm')) return 'cyan';
  if (type.includes('tool')) return 'yellow';
  if (type === 'run.start') return 'green';
  if (type === 'run.end') return 'blue';
  return 'white';
}
```

**Process Stream Hook (src/hooks/useProcessStream.ts)**

```typescript
import {useState, useEffect, useRef} from 'react';
import {spawn, ChildProcess} from 'child_process';
import * as readline from 'readline';
import {TraceEvent} from '../lib/types.js';
import {v4 as uuidv4} from 'uuid';

type ProcessStatus = 'starting' | 'running' | 'stopped' | 'error';

interface UseProcessStreamResult {
  status: ProcessStatus;
  runId: string;
  error: string | null;
}

export function useProcessStream(
  script: string[],
  onEvent: (event: TraceEvent) => void
): UseProcessStreamResult {
  const [status, setStatus] = useState<ProcessStatus>('starting');
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(uuidv4().slice(0, 8));
  const processRef = useRef<ChildProcess | null>(null);

  useEffect(() => {
    const [command, ...args] = script;
    
    // Spawn Python process with environment variables for live mode
    const proc = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'inherit'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        AGENTTRACE_LIVE: '1',
        AGENTTRACE_RUN_ID: runId.current,
      },
    });
    
    processRef.current = proc;

    // Parse stdout as NDJSON
    const rl = readline.createInterface({input: proc.stdout!});
    
    rl.on('line', (line) => {
      try {
        const message = JSON.parse(line);
        if (message.jsonrpc === '2.0' && message.params) {
          onEvent({
            type: message.method,
            timestamp: message.params.timestamp * 1000, // Convert to ms
            params: message.params,
          });
        }
      } catch (err) {
        // Non-JSON output (regular print statements) - ignore or log
      }
    });

    proc.on('spawn', () => setStatus('running'));
    
    proc.on('error', (err) => {
      setError(err.message);
      setStatus('error');
    });

    proc.on('exit', (code) => {
      setStatus(code === 0 ? 'stopped' : 'error');
      if (code !== 0) {
        setError(`Process exited with code ${code}`);
      }
    });

    // Cleanup on unmount
    return () => {
      if (processRef.current && !processRef.current.killed) {
        processRef.current.kill('SIGTERM');
      }
    };
  }, [script, onEvent]);

  return {status, runId: runId.current, error};
}
```

**Trace File Hook (src/hooks/useTraceFile.ts)**

```typescript
import {useState, useEffect} from 'react';
import * as fs from 'fs';
import * as readline from 'readline';
import {TraceEvent, TraceSummary} from '../lib/types.js';
import {resolveTracePath} from '../lib/paths.js';

interface UseTraceFileResult {
  events: TraceEvent[];
  summary: TraceSummary;
  loading: boolean;
  error: string | null;
}

export function useTraceFile(traceRef: string): UseTraceFileResult {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [summary, setSummary] = useState<TraceSummary>({
    runId: '',
    startTime: 0,
    duration: 0,
    llmCalls: 0,
    toolCalls: 0,
    totalTokens: 0,
    errors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrace() {
      try {
        const tracePath = await resolveTracePath(traceRef);
        
        if (!fs.existsSync(tracePath)) {
          throw new Error(`Trace file not found: ${tracePath}`);
        }

        const fileStream = fs.createReadStream(tracePath);
        const rl = readline.createInterface({input: fileStream});
        
        const loadedEvents: TraceEvent[] = [];
        let runId = '';
        let startTime = 0;
        let endTime = 0;
        let llmCalls = 0;
        let toolCalls = 0;
        let totalTokens = 0;
        let errors = 0;

        for await (const line of rl) {
          try {
            const event = JSON.parse(line) as TraceEvent;
            loadedEvents.push(event);
            
            // Aggregate summary stats
            if (event.type === 'run.start') {
              runId = event.run_id || '';
              startTime = event.timestamp;
            }
            if (event.type === 'run.end') {
              endTime = event.timestamp;
            }
            if (event.type === 'llm.response') {
              llmCalls++;
              totalTokens += event.total_tokens || 0;
            }
            if (event.type === 'tool.start') {
              toolCalls++;
            }
            if (event.type === 'tool.error') {
              errors++;
            }
          } catch {
            // Skip malformed lines
          }
        }

        setEvents(loadedEvents);
        setSummary({
          runId,
          startTime,
          duration: endTime - startTime,
          llmCalls,
          toolCalls,
          totalTokens,
          errors,
        });
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    loadTrace();
  }, [traceRef]);

  return {events, summary, loading, error};
}
```

---

## 4. Data Formats

### 4.1 Trace File Format (JSONL)

Each line is a self-contained JSON event. Files stored in `~/.agenttrace/traces/{date}_{run_id}.jsonl`.

```jsonl
{"type":"run.start","run_id":"abc123","timestamp":1705329121.000,"invocation_id":"inv_001","agent_name":"my_agent"}
{"type":"llm.request","run_id":"abc123","timestamp":1705329121.012,"request_id":"req_001","model":"gemini-2.0-flash","message_count":2,"tools_available":["search_web","write_file"]}
{"type":"llm.response","run_id":"abc123","timestamp":1705329121.847,"request_id":"req_001","duration_ms":835,"input_tokens":523,"output_tokens":680,"total_tokens":1203,"has_tool_calls":true,"finish_reason":"tool_calls"}
{"type":"tool.start","run_id":"abc123","timestamp":1705329121.850,"tool_call_id":"tc_001","tool_name":"search_web","tool_args":{"query":"latest AI news"},"agent_name":"my_agent"}
{"type":"tool.end","run_id":"abc123","timestamp":1705329122.341,"tool_call_id":"tc_001","tool_name":"search_web","duration_ms":491,"response_preview":"Found 10 results...","success":true}
{"type":"run.end","run_id":"abc123","timestamp":1705329123.415,"duration_ms":2415,"summary":{"llm_calls":2,"tool_calls":2,"total_tokens":2095,"errors":0}}
```

### 4.2 Live Stream Format (JSON-RPC 2.0 Notifications)

Same event structure wrapped in JSON-RPC 2.0 notification format:

```json
{"jsonrpc":"2.0","method":"run.start","params":{"type":"run.start","run_id":"abc123","timestamp":1705329121.000}}
{"jsonrpc":"2.0","method":"tool.start","params":{"type":"tool.start","run_id":"abc123","tool_name":"search_web"}}
```

### 4.3 Event Type Reference

| Event Type | Fields | Description |
|------------|--------|-------------|
| `run.start` | run_id, invocation_id, agent_name, timestamp | Agent invocation begins |
| `run.end` | run_id, duration_ms, summary | Agent invocation completes |
| `llm.request` | request_id, model, message_count, tools_available | LLM call initiated |
| `llm.response` | request_id, duration_ms, input_tokens, output_tokens, total_tokens, has_tool_calls, finish_reason | LLM response received |
| `tool.start` | tool_call_id, tool_name, tool_args, agent_name | Tool execution begins |
| `tool.end` | tool_call_id, tool_name, duration_ms, response_preview, success | Tool execution completes |
| `tool.error` | tool_call_id, tool_name, error_type, error_message | Tool execution failed |
| `state.change` | author, state_delta | Session state modified |
| `agent.transfer` | from_agent, to_agent, reason | Multi-agent handoff |

---

## 5. Configuration

### 5.1 SDK Configuration

Configuration loaded from (in priority order):
1. Constructor arguments
2. Environment variables
3. `~/.agenttrace/config.yaml`
4. Defaults

```yaml
# ~/.agenttrace/config.yaml
trace_dir: ~/.agenttrace/traces
retention_days: 30
buffer_size: 10
sanitize_args: true  # Remove sensitive data from tool args
max_response_preview: 500  # Characters to store in response_preview
```

Environment variables:
- `AGENTTRACE_DIR` - Override trace directory
- `AGENTTRACE_LIVE` - Enable stdout streaming (set by CLI)
- `AGENTTRACE_RUN_ID` - Override run ID (set by CLI)
- `AGENTTRACE_DISABLE` - Disable all tracing

### 5.2 CLI Configuration

```yaml
# ~/.agenttrace/cli.yaml
theme: dark  # dark | light | minimal
max_events: 1000  # Max events to display
timestamp_format: relative  # relative | absolute | unix
default_python: python3  # Python executable for tail
```

---

## 6. Error Handling

### 6.1 SDK Error Handling

- Plugin errors should never crash the agent - all callbacks wrapped in try/except
- Failed file writes logged but don't block execution
- Malformed events skipped with warning

```python
async def before_tool_callback(self, **kwargs):
    try:
        event = self._create_tool_event(kwargs)
        self._emit(event)
    except Exception as e:
        # Log but don't propagate - observability shouldn't break the agent
        self._log_internal_error("before_tool_callback", e)
    return None  # Always return None to not interfere with agent
```

### 6.2 CLI Error Handling

- Process spawn failures shown with actionable message
- File not found errors suggest `agenttrace list`
- Parse errors in trace files skip malformed lines, show warning
- Graceful shutdown on SIGINT/SIGTERM

---

## 7. Security Considerations

### 7.1 Argument Sanitization

Tool arguments may contain sensitive data. Default sanitization:

```python
SENSITIVE_PATTERNS = [
    r'password',
    r'secret',
    r'token',
    r'api[_-]?key',
    r'auth',
    r'credential',
]

def _sanitize_args(self, args: dict) -> dict:
    """Replace sensitive values with [REDACTED]."""
    sanitized = {}
    for key, value in args.items():
        if any(re.search(pattern, key, re.I) for pattern in SENSITIVE_PATTERNS):
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = self._sanitize_args(value)
        else:
            sanitized[key] = value
    return sanitized
```

### 7.2 File Permissions

Trace directory created with restricted permissions:

```python
self.trace_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
```

### 7.3 No Remote Transmission

MVP is local-only. No data leaves the machine unless explicitly configured in future versions.

---

## 8. Future Considerations (Post-MVP)

### 8.1 Near-term Additions

- **Interactive mode** - Keyboard navigation, drill-down into events
- **Filtering** - `agenttrace show last --tool search_web --errors-only`
- **Search** - `agenttrace search "query" --since 7d`
- **Export** - `agenttrace export last --format csv`

### 8.2 Medium-term Additions

- **HTTP daemon mode** - Long-running server for multiple clients
- **Browser UI** - Web dashboard alongside CLI
- **Multi-framework support** - LangChain, CrewAI, AutoGen adapters
- **Multi-model support** - OpenAI, Anthropic, local models

### 8.3 Long-term Vision

- **Replay** - Deterministic replay of traces with different models
- **Diffing** - Compare traces side-by-side
- **Regression testing** - CI integration for agent behavior tests
- **Safety rules** - Pre-execution checks, guardrails
- **Team features** - Shared trace storage, collaboration

---

## 9. Implementation Plan

### Phase 1: SDK Core (Week 1-2)

- [ ] Set up Python package structure
- [ ] Implement `AgentTracePlugin` with all ADK hooks
- [ ] Implement `FileWriter` with JSONL output
- [ ] Implement `StdoutWriter` with JSON-RPC format
- [ ] Add event models and serialization
- [ ] Write unit tests for plugin hooks
- [ ] Test with sample ADK agent

### Phase 2: CLI Foundation (Week 2-3)

- [ ] Set up TypeScript/Ink project structure
- [ ] Implement command routing with yargs
- [ ] Implement `useTraceFile` hook
- [ ] Implement `useProcessStream` hook
- [ ] Build basic `EventList` component
- [ ] Build `Header` and `StatusBar` components

### Phase 3: Show Command (Week 3-4)

- [ ] Implement `agenttrace show` command
- [ ] Build `Summary` component
- [ ] Build `EventDetail` component
- [ ] Add keyboard navigation
- [ ] Handle edge cases (empty traces, large traces)

### Phase 4: Tail Command (Week 4-5)

- [ ] Implement `agenttrace tail` command
- [ ] Implement live event streaming with `<Static>`
- [ ] Add real-time stats updates
- [ ] Handle process lifecycle (start, stop, error)
- [ ] Add pause/resume functionality

### Phase 5: Polish & Release (Week 5-6)

- [ ] Implement `agenttrace list` command
- [ ] Add configuration file support
- [ ] Write documentation and README
- [ ] Create example agents for testing
- [ ] Package and publish to PyPI and npm

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| SDK integration time | < 5 minutes | Time to add plugin to existing agent |
| Trace file overhead | < 5% runtime | Benchmark with/without plugin |
| CLI startup time | < 500ms | Time to first render |
| Event stream latency | < 100ms | Time from SDK emit to CLI display |
| Package size (SDK) | < 50KB | Published package size |
| Package size (CLI) | < 5MB | Published package size |

---

## Appendix A: Dependencies

### Python SDK

```toml
[project]
name = "agenttrace"
version = "0.1.0"
dependencies = [
    "google-adk>=0.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-asyncio>=0.21",
]
```

### TypeScript CLI

```json
{
  "name": "agenttrace",
  "version": "0.1.0",
  "dependencies": {
    "ink": "^4.4.1",
    "react": "^18.2.0",
    "yargs": "^17.7.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/yargs": "^17.0.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Appendix B: Directory Structure

```
~/.agenttrace/
├── config.yaml           # SDK configuration
├── cli.yaml              # CLI configuration
└── traces/               # Trace files
    ├── 2024-01-15_abc123.jsonl
    ├── 2024-01-15_def456.jsonl
    └── 2024-01-14_ghi789.jsonl
```

---

## Appendix C: Example Usage

### Basic SDK Integration

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from agenttrace import AgentTracePlugin

def search_web(query: str) -> dict:
    """Search the web for information."""
    return {"results": ["Result 1", "Result 2"]}

agent = Agent(
    name="research_agent",
    model="gemini-2.0-flash",
    instruction="You are a research assistant.",
    tools=[search_web],
)

runner = InMemoryRunner(
    agent=agent,
    app_name="research_app",
    plugins=[AgentTracePlugin()],
)

# Run agent - traces automatically saved
async for event in runner.run_async("user1", "session1", "Find info about AI"):
    print(event.content)
```

### CLI Usage

```bash
# View the most recent trace
agenttrace show last

# View a specific trace
agenttrace show 2024-01-15_abc123

# List recent traces
agenttrace list --limit 20

# Run an agent with live tailing
agenttrace tail python my_agent.py

# Run with arguments
agenttrace tail -- python my_agent.py --verbose --config prod.yaml
```
