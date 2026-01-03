# Watchtower - ADK Observability SDK
## System Design Document

**Project Name:** `watchtower`
**Version:** 0.1.0 (MVP)
**Date:** December 2024
**Stack:** Python SDK + TypeScript/Ink CLI

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Component Design](#3-component-design)
   - [3.1 Python SDK (`watchtower-sdk`)](#31-python-sdk-watchtower-sdk)
   - [3.2 TypeScript CLI (`watchtower`)](#32-typescript-cli-watchtower)
4. [Data Formats](#4-data-formats)
   - [4.1 Trace File Format (JSONL)](#41-trace-file-format-jsonl)
   - [4.2 Live Stream Format (JSON-RPC 2.0 Notifications)](#42-live-stream-format-json-rpc-20-notifications)
   - [4.3 Event Type Reference](#43-event-type-reference)
5. [Configuration](#5-configuration)
   - [5.1 SDK Configuration](#51-sdk-configuration)
   - [5.2 CLI Configuration](#52-cli-configuration)
6. [Error Handling](#6-error-handling)
   - [6.1 SDK Error Handling](#61-sdk-error-handling)
   - [6.2 CLI Error Handling](#62-cli-error-handling)
7. [Security Considerations](#7-security-considerations)
   - [7.1 Argument Sanitization](#71-argument-sanitization)
   - [7.2 File Permissions](#72-file-permissions)
   - [7.3 No Remote Transmission](#73-no-remote-transmission)
8. [Future Considerations (Post-MVP)](#8-future-considerations-post-mvp)
   - [8.1 Near-term Additions](#81-near-term-additions)
   - [8.2 Medium-term Additions](#82-medium-term-additions)
   - [8.3 Long-term Vision](#83-long-term-vision)
9. [Cloud Deployment & Production Environments](#9-cloud-deployment--production-environments)
   - [9.1 Deployment Architecture](#91-deployment-architecture)
   - [9.2 Cloud Storage Backends](#92-cloud-storage-backends)
   - [9.3 Remote Access Patterns](#93-remote-access-patterns)
   - [9.4 Authentication & Authorization](#94-authentication--authorization)
   - [9.5 Multi-Instance Coordination](#95-multi-instance-coordination)
   - [9.6 Environment-Specific Configuration](#96-environment-specific-configuration)
   - [9.7 Performance & Cost Optimization](#97-performance--cost-optimization)
   - [9.8 Cloud Deployment Examples](#98-cloud-deployment-examples)
10. [Implementation Plan](#10-implementation-plan)
11. [Success Metrics](#11-success-metrics)
12. [Appendices](#12-appendices)
    - [Appendix A: Dependencies](#appendix-a-dependencies)
    - [Appendix B: Directory Structure](#appendix-b-directory-structure)
    - [Appendix C: Example Usage](#appendix-c-example-usage)

---

## 1. Executive Summary

`watchtower` is a plug-and-use observability SDK for Google ADK that lets developers view agent activity, tool calls, LLM interactions, and execution history through their terminal. The MVP focuses on two core experiences:

1. **Passive Viewing** (`watchtower show`) - View past traces from files
2. **Live Tailing** (`watchtower tail`) - Stream events in real-time

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

---

## 3. Component Design

### 3.1 Python SDK (`watchtower-sdk`)

#### 3.1.1 Package Structure

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
        trace_dir: str = "~/.watchtower/traces",
        enable_file: bool = True,
        enable_stdout: bool = False,  # True when CLI spawns with --tail
        run_id: Optional[str] = None,
    ):
        super().__init__(name="watchtower")
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
    Writes trace events to JSONL files in ~/.watchtower/traces/
    
    File naming: {date}_{run_id}.jsonl
    Example: 2024-01-15_abc123.jsonl
    """
    
    def __init__(self, trace_dir: str = "~/.watchtower/traces"):
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
from watchtower import AgentTracePlugin

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

# Run as normal - traces automatically saved to ~/.watchtower/traces/
async for event in runner.run_async(user_id, session_id, message):
    print(event.content)
```

**CLI-Spawned Mode (For Live Tailing)**

```python
import os
from watchtower import AgentTracePlugin

# When spawned by CLI, enable stdout streaming
plugin = AgentTracePlugin(
    enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
    run_id=os.environ.get("AGENTTRACE_RUN_ID"),
)
```

---

### 3.2 TypeScript CLI (`watchtower`)

#### 3.2.1 Package Structure

```
cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.tsx              # Entry point, command routing
│   ├── commands/
│   │   ├── show.tsx           # watchtower show [trace]
│   │   ├── tail.tsx           # watchtower tail <script>
│   │   └── list.tsx           # watchtower list
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
    └── watchtower             # Executable entry point
```

#### 3.2.2 Command Design

**`watchtower show [trace]`** - Passive Viewing

```
$ watchtower show last
$ watchtower show 2024-01-15_abc123
$ watchtower show ./path/to/trace.jsonl

┌─────────────────────────────────────────────────────────────┐
│ watchtower • Run: abc123 • 2024-01-15 14:32:01             │
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

**`watchtower tail <script>`** - Live Tailing

```
$ watchtower tail python my_agent.py
$ watchtower tail -- python my_agent.py --arg1 value1

┌─────────────────────────────────────────────────────────────┐
│ watchtower • LIVE • Run: xyz789                     ● REC  │
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

**`watchtower list`** - List Recent Traces

```
$ watchtower list
$ watchtower list --limit 20
$ watchtower list --since 2024-01-10

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

Each line is a self-contained JSON event. Files stored in `~/.watchtower/traces/{date}_{run_id}.jsonl`.

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
3. `~/.watchtower/config.yaml`
4. Defaults

```yaml
# ~/.watchtower/config.yaml
trace_dir: ~/.watchtower/traces
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
# ~/.watchtower/cli.yaml
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
- File not found errors suggest `watchtower list`
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
- **Filtering** - `watchtower show last --tool search_web --errors-only`
- **Search** - `watchtower search "query" --since 7d`
- **Export** - `watchtower export last --format csv`

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

## 9. Cloud Deployment & Production Environments

While the MVP focuses on local development, Watchtower is designed to support production deployments on Cloud Run, Kubernetes, AWS Lambda, and other cloud platforms. This section outlines the architecture and considerations for cloud deployments.

### 9.1 Deployment Architecture

#### 9.1.1 Current State: MVP Local-Only

The MVP design assumes:
- Traces saved to `~/.watchtower/traces/` on local filesystem
- CLI reads from local directory
- No network transmission of trace data

**This doesn't work in cloud environments because:**
- Cloud Run/Lambda containers have ephemeral storage
- Multiple instances can't share a local filesystem
- No way to access traces after container restarts
- Can't tail live from deployed agents

#### 9.1.2 Cloud Deployment Models

**Model 1: Direct Cloud Storage** (Recommended for simplicity)

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud Run / GKE / Lambda                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Agent Container                                    │     │
│  │  ┌──────────────┐        ┌──────────────┐          │     │
│  │  │ ADK Agent    │───────▶│ AgentTrace   │          │     │
│  │  │              │        │ Plugin       │          │     │
│  │  └──────────────┘        └──────┬───────┘          │     │
│  │                                 │ Writes events    │     │
│  └─────────────────────────────────┼──────────────────┘     │
└────────────────────────────────────┼────────────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │   Cloud Storage Backend        │
                    │  • Google Cloud Storage (GCS)  │
                    │  • AWS S3                      │
                    │  • PostgreSQL + TimescaleDB    │
                    └────────────────┬───────────────┘
                                     │ Reads via API
                                     ▼
                    ┌────────────────────────────────┐
                    │   Developer Machine            │
                    │   watchtower CLI               │
                    │   • show --remote gs://...     │
                    │   • list --remote gs://...     │
                    └────────────────────────────────┘
```

**Pros:**
- Simple architecture
- No additional services needed
- Low cost (just storage)
- Works with existing CLI (add `--remote` flag)

**Cons:**
- No real-time tailing (need polling)
- Higher latency for reads
- Eventual consistency issues

**Model 2: HTTP Streaming Gateway** (For real-time access)

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud Run Service                        │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Agent Container                                    │     │
│  │  ┌──────────────┐        ┌──────────────┐          │     │
│  │  │ ADK Agent    │───────▶│ AgentTrace   │          │     │
│  │  │              │        │ Plugin       │          │     │
│  │  └──────────────┘        └──────┬───────┘          │     │
│  │                                 │ Emits events     │     │
│  │                         ┌───────▼────────┐         │     │
│  │                         │ HTTP Gateway   │◀────────┼─────┤ :8080/traces/stream
│  │                         │ (FastAPI/SSE)  │         │     │
│  │                         └────────┬───────┘         │     │
│  │                                 │ Also persists    │     │
│  │                                 ▼                  │     │
│  │                         ┌────────────────┐         │     │
│  │                         │  GCS / Postgres │         │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                                     ▲
                                     │ SSE/WebSocket
                                     │
                    ┌────────────────────────────────┐
                    │   Developer Machine            │
                    │   watchtower tail --remote     │
                    │   https://my-agent.run.app     │
                    └────────────────────────────────┘
```

**Pros:**
- Real-time streaming
- Low latency
- Better developer experience

**Cons:**
- More complex (need gateway service)
- Higher cost (compute + storage)
- Requires authentication

**Model 3: Hybrid** (Cloud storage + Optional HTTP)

Agents always write to cloud storage (durable), optionally also emit to HTTP gateway for real-time access.

#### 9.1.3 Architecture Decision Matrix

| Requirement | Model 1 (Storage) | Model 2 (HTTP) | Model 3 (Hybrid) |
|-------------|-------------------|----------------|------------------|
| Real-time tailing | ❌ No (polling) | ✅ Yes | ✅ Yes |
| Historical queries | ✅ Yes | ⚠️ Needs DB | ✅ Yes |
| Multi-instance support | ✅ Yes | ✅ Yes | ✅ Yes |
| Implementation complexity | Low | High | Medium |
| Cost (100k events/day) | ~$2/mo | ~$50/mo | ~$25/mo |
| Latency | High (5-10s) | Low (<100ms) | Low |
| **MVP+1 Recommendation** | **✅ Start here** | Phase 2 | Phase 3 |

### 9.2 Cloud Storage Backends

#### 9.2.1 Google Cloud Storage Writer

```python
# watchtower/writers/gcs_writer.py
from google.cloud import storage
from watchtower.writers.base import TraceWriter
import json
from datetime import datetime
from typing import Optional
import os

class GCSWriter(TraceWriter):
    """
    Writes trace events to Google Cloud Storage.

    File structure: gs://{bucket}/traces/{date}/{run_id}.jsonl
    Example: gs://my-bucket/traces/2024-01-15/abc123.jsonl
    """

    def __init__(
        self,
        bucket_name: str,
        project: Optional[str] = None,
        prefix: str = "traces",
        buffer_size: int = 50,  # Buffer more for network efficiency
    ):
        self.client = storage.Client(project=project)
        self.bucket = self.client.bucket(bucket_name)
        self.prefix = prefix
        self._buffer: list = []
        self._buffer_size = buffer_size
        self._current_run_id: Optional[str] = None

    def _get_blob_path(self, run_id: str) -> str:
        """Generate GCS blob path for this run."""
        date_str = datetime.now().strftime("%Y-%m-%d")
        return f"{self.prefix}/{date_str}/{run_id}.jsonl"

    def write(self, event: dict) -> None:
        """Buffer event for batch upload."""
        self._buffer.append(event)
        self._current_run_id = event.get("run_id", "unknown")

        if len(self._buffer) >= self._buffer_size:
            self._flush_buffer()

    def _flush_buffer(self) -> None:
        """Upload buffered events to GCS."""
        if not self._buffer or not self._current_run_id:
            return

        blob_path = self._get_blob_path(self._current_run_id)
        blob = self.bucket.blob(blob_path)

        # Read existing content if file exists
        existing_content = ""
        if blob.exists():
            existing_content = blob.download_as_text()

        # Append new events
        new_lines = "\n".join(
            json.dumps(event, separators=(',', ':'), default=str)
            for event in self._buffer
        )

        updated_content = existing_content + new_lines + "\n" if existing_content else new_lines + "\n"

        # Upload with retries
        blob.upload_from_string(
            updated_content,
            content_type="application/x-ndjson",
            retry=storage.retry.DEFAULT_RETRY
        )

        self._buffer.clear()

    def flush(self) -> None:
        """Force flush remaining events."""
        self._flush_buffer()
```

**Usage in agent:**

```python
import os
from watchtower import AgentTracePlugin
from watchtower.writers.gcs_writer import GCSWriter

# Detect environment and choose writer
if os.getenv("K_SERVICE"):  # Cloud Run
    writer = GCSWriter(
        bucket_name=os.getenv("GCS_TRACES_BUCKET", "my-project-traces"),
        project=os.getenv("GOOGLE_CLOUD_PROJECT")
    )
    plugin = AgentTracePlugin(writers=[writer])
else:  # Local development
    plugin = AgentTracePlugin()  # Uses FileWriter by default

runner = InMemoryRunner(agent=agent, plugins=[plugin])
```

#### 9.2.2 AWS S3 Writer

```python
# watchtower/writers/s3_writer.py
import boto3
from watchtower.writers.base import TraceWriter
import json
from datetime import datetime
from typing import Optional

class S3Writer(TraceWriter):
    """
    Writes trace events to AWS S3.

    File structure: s3://{bucket}/traces/{date}/{run_id}.jsonl
    """

    def __init__(
        self,
        bucket_name: str,
        region: str = "us-east-1",
        prefix: str = "traces",
        buffer_size: int = 50,
    ):
        self.s3 = boto3.client('s3', region_name=region)
        self.bucket_name = bucket_name
        self.prefix = prefix
        self._buffer: list = []
        self._buffer_size = buffer_size
        self._current_run_id: Optional[str] = None

    def _get_s3_key(self, run_id: str) -> str:
        date_str = datetime.now().strftime("%Y-%m-%d")
        return f"{self.prefix}/{date_str}/{run_id}.jsonl"

    def write(self, event: dict) -> None:
        self._buffer.append(event)
        self._current_run_id = event.get("run_id", "unknown")

        if len(self._buffer) >= self._buffer_size:
            self._flush_buffer()

    def _flush_buffer(self) -> None:
        if not self._buffer or not self._current_run_id:
            return

        s3_key = self._get_s3_key(self._current_run_id)

        # Download existing content
        existing_content = ""
        try:
            response = self.s3.get_object(Bucket=self.bucket_name, Key=s3_key)
            existing_content = response['Body'].read().decode('utf-8')
        except self.s3.exceptions.NoSuchKey:
            pass

        # Append new events
        new_lines = "\n".join(
            json.dumps(event, separators=(',', ':'), default=str)
            for event in self._buffer
        )

        updated_content = existing_content + new_lines + "\n" if existing_content else new_lines + "\n"

        # Upload
        self.s3.put_object(
            Bucket=self.bucket_name,
            Key=s3_key,
            Body=updated_content.encode('utf-8'),
            ContentType='application/x-ndjson'
        )

        self._buffer.clear()

    def flush(self) -> None:
        self._flush_buffer()
```

#### 9.2.3 PostgreSQL Writer (with TimescaleDB)

For high-query scenarios (analytics, searching across runs):

```python
# watchtower/writers/postgres_writer.py
import asyncpg
from watchtower.writers.base import TraceWriter
import json
from typing import Optional

class PostgresWriter(TraceWriter):
    """
    Writes trace events to PostgreSQL with TimescaleDB for time-series optimization.

    Schema:
    CREATE TABLE traces (
        id BIGSERIAL,
        run_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        data JSONB NOT NULL,
        PRIMARY KEY (timestamp, id)
    );

    -- Convert to hypertable for time-series optimization
    SELECT create_hypertable('traces', 'timestamp');

    -- Indexes
    CREATE INDEX idx_traces_run_id ON traces(run_id);
    CREATE INDEX idx_traces_type ON traces(event_type);
    CREATE INDEX idx_traces_data_gin ON traces USING GIN(data);
    """

    def __init__(
        self,
        dsn: str,
        buffer_size: int = 20,
    ):
        self.dsn = dsn
        self.pool: Optional[asyncpg.Pool] = None
        self._buffer: list = []
        self._buffer_size = buffer_size

    async def initialize(self):
        """Initialize connection pool."""
        self.pool = await asyncpg.create_pool(self.dsn, min_size=1, max_size=10)

    def write(self, event: dict) -> None:
        """Buffer event for batch insert."""
        self._buffer.append(event)

        if len(self._buffer) >= self._buffer_size:
            # Schedule async flush
            import asyncio
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._flush_buffer())
            except RuntimeError:
                # No running loop, skip flush (will flush on next write)
                pass

    async def _flush_buffer(self) -> None:
        """Batch insert buffered events."""
        if not self._buffer or not self.pool:
            return

        events = self._buffer.copy()
        self._buffer.clear()

        async with self.pool.acquire() as conn:
            await conn.executemany(
                """
                INSERT INTO traces (run_id, event_type, timestamp, data)
                VALUES ($1, $2, to_timestamp($3), $4)
                """,
                [
                    (
                        event.get("run_id"),
                        event.get("type"),
                        event.get("timestamp"),
                        json.dumps(event),
                    )
                    for event in events
                ]
            )

    async def flush(self) -> None:
        """Force flush remaining events."""
        await self._flush_buffer()
```

### 9.3 Remote Access Patterns

#### 9.3.1 CLI Remote Mode

**Enhanced CLI commands:**

```bash
# View traces from cloud storage
watchtower show --remote gs://my-bucket/traces last
watchtower show --remote s3://my-bucket/traces 2024-01-15_abc123

# List remote traces
watchtower list --remote gs://my-bucket/traces --limit 50

# Live tail from HTTP gateway (future)
watchtower tail --remote https://my-agent.run.app --auth-token $TOKEN
```

**Implementation:**

```typescript
// cli/src/lib/remote.ts
import {Storage} from '@google-cloud/storage';
import {S3} from '@aws-sdk/client-s3';
import * as readline from 'readline';
import {TraceEvent} from './types.js';

export interface RemoteConfig {
  type: 'gcs' | 's3' | 'postgres';
  uri: string;
}

export class RemoteTraceReader {
  constructor(private config: RemoteConfig) {}

  async *readTrace(runId: string): AsyncGenerator<TraceEvent> {
    switch (this.config.type) {
      case 'gcs':
        yield* this.readFromGCS(runId);
        break;
      case 's3':
        yield* this.readFromS3(runId);
        break;
      default:
        throw new Error(`Unsupported remote type: ${this.config.type}`);
    }
  }

  private async *readFromGCS(runId: string): AsyncGenerator<TraceEvent> {
    const storage = new Storage();
    const match = this.config.uri.match(/gs:\/\/([^\/]+)\/(.*)/);
    if (!match) throw new Error('Invalid GCS URI');

    const [, bucket, prefix] = match;

    // List files matching run_id pattern (handles multi-instance)
    const [files] = await storage.bucket(bucket).getFiles({
      prefix: `${prefix}/`,
      matchGlob: `**/*${runId}*.jsonl`
    });

    for (const file of files) {
      const stream = file.createReadStream();
      const rl = readline.createInterface({input: stream});

      for await (const line of rl) {
        try {
          yield JSON.parse(line) as TraceEvent;
        } catch {
          // Skip malformed lines
        }
      }
    }
  }

  private async *readFromS3(runId: string): AsyncGenerator<TraceEvent> {
    // Similar implementation for S3
    // ...
  }
}
```

**Update show command:**

```typescript
// cli/src/commands/show.tsx
export const ShowCommand: React.FC<ShowCommandProps> = ({trace, remote}) => {
  const {events, summary, loading, error} = remote
    ? useRemoteTrace(trace, remote)
    : useTraceFile(trace);

  // Rest of component unchanged
  // ...
};
```

### 9.4 Authentication & Authorization

#### 9.4.1 Service Account for GCS (Cloud Run)

```yaml
# cloudrun-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-agent
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/service-account: agent-traces@project.iam.gserviceaccount.com
    spec:
      containers:
      - image: gcr.io/project/my-agent
        env:
        - name: GCS_TRACES_BUCKET
          value: my-project-traces
```

**Grant permissions:**

```bash
# Give service account write access to bucket
gcloud storage buckets add-iam-policy-binding gs://my-project-traces \
  --member=serviceAccount:agent-traces@project.iam.gserviceaccount.com \
  --role=roles/storage.objectCreator

# Give developers read access
gcloud storage buckets add-iam-policy-binding gs://my-project-traces \
  --member=group:developers@company.com \
  --role=roles/storage.objectViewer
```

#### 9.4.2 IAM for AWS Lambda

```yaml
# lambda-execution-role.yaml
Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: TracesS3Access
          PolicyDocument:
            Statement:
              - Effect: Allow
                Action:
                  - s3:PutObject
                  - s3:GetObject
                Resource: arn:aws:s3:::lambda-traces-bucket/traces/*
```

### 9.5 Multi-Instance Coordination

#### 9.5.1 Run ID Generation for Cloud

```python
import uuid
import os
import socket

def generate_cloud_run_id() -> str:
    """
    Generate unique run ID for cloud environments.
    Format: {instance_id}_{invocation_id}

    Examples:
    - Cloud Run: kr8s-abc_def123
    - Lambda: lambda-xyz_ghi456
    - K8s: pod-name_jkl789
    """
    # Get instance identifier from environment
    instance_id = (
        os.getenv("K_REVISION", "")[:8] or  # Cloud Run
        os.getenv("AWS_LAMBDA_LOG_STREAM_NAME", "")[:8] or  # Lambda
        os.getenv("HOSTNAME", socket.gethostname())[:8]  # K8s/Docker
    ).replace("-", "")

    # Unique invocation ID
    invocation_id = str(uuid.uuid4())[:8]

    return f"{instance_id}_{invocation_id}"
```

#### 9.5.2 Trace Aggregation (CLI)

When reading from cloud storage, handle multiple files for same run:

```typescript
// Handle pattern: gs://bucket/traces/2024-01-15/*_abc123.jsonl
async function readAggregatedTrace(runId: string, bucket: string): Promise<TraceEvent[]> {
  const storage = new Storage();

  // Find all files matching run_id suffix
  const [files] = await storage.bucket(bucket).getFiles({
    prefix: 'traces/',
    matchGlob: `**/*_${runId}.jsonl`
  });

  const allEvents: TraceEvent[] = [];

  for (const file of files) {
    const events = await readJSONLFile(file);
    allEvents.push(...events);
  }

  // Sort by timestamp for coherent timeline
  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  return allEvents;
}
```

### 9.6 Environment-Specific Configuration

#### 9.6.1 Auto-Detection

```python
# watchtower/config.py
import os
from dataclasses import dataclass
from typing import Optional, List
from watchtower.writers.base import TraceWriter

@dataclass
class WatchtowerConfig:
    """Auto-configured based on deployment environment."""

    writers: List[TraceWriter]
    run_id_generator: callable

    @classmethod
    def from_environment(cls) -> "WatchtowerConfig":
        """Auto-detect configuration from environment."""

        # Cloud Run
        if os.getenv("K_SERVICE"):
            from watchtower.writers.gcs_writer import GCSWriter
            return cls(
                writers=[GCSWriter(
                    bucket_name=os.getenv("GCS_TRACES_BUCKET",
                                         f"{os.getenv('GOOGLE_CLOUD_PROJECT')}-traces")
                )],
                run_id_generator=generate_cloud_run_id
            )

        # AWS Lambda
        elif os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
            from watchtower.writers.s3_writer import S3Writer
            return cls(
                writers=[S3Writer(
                    bucket_name=os.getenv("S3_TRACES_BUCKET",
                                         f"lambda-traces-{os.getenv('AWS_REGION')}")
                )],
                run_id_generator=generate_cloud_run_id
            )

        # Kubernetes
        elif os.getenv("KUBERNETES_SERVICE_HOST"):
            # Could use GCS, S3, or Postgres depending on cloud provider
            storage_url = os.getenv("WATCHTOWER_STORAGE")
            if storage_url.startswith("gs://"):
                from watchtower.writers.gcs_writer import GCSWriter
                bucket = storage_url.replace("gs://", "").split("/")[0]
                return cls(
                    writers=[GCSWriter(bucket_name=bucket)],
                    run_id_generator=generate_cloud_run_id
                )
            # ... handle other storage types

        # Local development (default)
        else:
            from watchtower.writers.file_writer import FileWriter
            return cls(
                writers=[FileWriter("~/.watchtower/traces")],
                run_id_generator=lambda: str(uuid.uuid4())[:8]
            )

# Simple usage in agent
from watchtower import AgentTracePlugin
from watchtower.config import WatchtowerConfig

config = WatchtowerConfig.from_environment()
plugin = AgentTracePlugin(
    writers=config.writers,
    run_id=config.run_id_generator()
)
```

### 9.7 Performance & Cost Optimization

#### 9.7.1 Cost Comparison

**Storage Costs** (per month, 1M events @ 20KB each = 20GB):

| Backend | Storage Cost | Operations Cost | Total/Month | Notes |
|---------|--------------|-----------------|-------------|-------|
| GCS Standard | $0.40 | $0.05 (writes) | **$0.45** | Best for cold storage |
| GCS Nearline | $0.20 | $0.10 (writes) | $0.30 | 30-day min |
| S3 Standard | $0.46 | $0.05 (writes) | **$0.51** | Similar to GCS |
| S3 Intelligent-Tier | $0.30 | $0.05 | $0.35 | Auto-archives |
| PostgreSQL (Cloud SQL) | $122/mo (instance) | N/A | **$122** | Best for queries |
| TimescaleDB (self-hosted) | $20-50 | N/A | $20-50 | Cost-effective at scale |

**Recommendations:**
- **Low volume (<10k events/day):** GCS/S3 Standard
- **Medium volume (<100k/day):** GCS Nearline + Postgres for recent data
- **High volume (>100k/day):** TimescaleDB with auto-archival to GCS

#### 9.7.2 Retention & Cleanup

```python
# watchtower/cleanup.py
from google.cloud import storage
from datetime import datetime, timedelta

def cleanup_old_traces(bucket_name: str, retention_days: int = 30):
    """Delete traces older than retention period."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    cutoff_date = datetime.now() - timedelta(days=retention_days)

    # List and delete old files
    for blob in bucket.list_blobs(prefix="traces/"):
        # Extract date from path: traces/2024-01-15/run.jsonl
        try:
            date_str = blob.name.split("/")[1]
            file_date = datetime.strptime(date_str, "%Y-%m-%d")

            if file_date < cutoff_date:
                blob.delete()
                print(f"Deleted: {blob.name}")
        except (IndexError, ValueError):
            continue

# Run as scheduled Cloud Function or Cloud Scheduler job
# gcloud scheduler jobs create http cleanup-traces \
#   --schedule="0 2 * * *" \
#   --uri="https://cleanup-function.run.app/cleanup"
```

#### 9.7.3 Adaptive Buffering

```python
class AdaptiveBufferWriter:
    """Adjust buffer size based on write latency."""

    def __init__(self, base_writer: TraceWriter):
        self.writer = base_writer
        self.buffer_size = 10
        self.max_buffer_size = 100
        self._latencies: List[float] = []

    def write(self, event: dict):
        start = time.perf_counter()
        self.writer.write(event)
        latency = time.perf_counter() - start

        self._latencies.append(latency)

        # Adjust every 10 writes
        if len(self._latencies) >= 10:
            avg_latency = sum(self._latencies) / len(self._latencies)

            # High latency (>100ms) = buffer more to reduce writes
            if avg_latency > 0.1:
                self.buffer_size = min(self.buffer_size + 10, self.max_buffer_size)

            # Low latency (<10ms) = buffer less for real-time
            elif avg_latency < 0.01:
                self.buffer_size = max(self.buffer_size - 5, 10)

            self._latencies.clear()
```

### 9.8 Cloud Deployment Examples

#### 9.8.1 Complete Cloud Run Example

**main.py:**

```python
import os
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import AgentTracePlugin
from watchtower.config import WatchtowerConfig
from fastapi import FastAPI

# Auto-configure based on environment
config = WatchtowerConfig.from_environment()

agent = Agent(
    name="production_agent",
    model="gemini-2.0-flash",
    instruction="Production agent with cloud observability",
    tools=[...],
)

runner = InMemoryRunner(
    agent=agent,
    app_name="prod_app",
    plugins=[AgentTracePlugin(
        writers=config.writers,
        run_id=config.run_id_generator()
    )],
)

app = FastAPI()

@app.post("/chat")
async def chat(message: str):
    result = []
    async for event in runner.run_async("user", "session", message):
        result.append(event.content)
    return {"response": "".join(result)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

**Dockerfile:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
```

**Deploy:**

```bash
# Create GCS bucket for traces
gsutil mb gs://my-project-traces

# Deploy to Cloud Run
gcloud run deploy my-agent \
  --source . \
  --region us-central1 \
  --set-env-vars GCS_TRACES_BUCKET=my-project-traces \
  --service-account agent-traces@my-project.iam.gserviceaccount.com \
  --allow-unauthenticated
```

**Access traces:**

```bash
# View latest trace
watchtower show --remote gs://my-project-traces/traces last

# List all traces
watchtower list --remote gs://my-project-traces/traces --limit 20
```

#### 9.8.2 Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent
  template:
    metadata:
      labels:
        app: agent
    spec:
      serviceAccountName: agent-sa
      containers:
      - name: agent
        image: my-agent:latest
        env:
        - name: WATCHTOWER_STORAGE
          value: gs://k8s-cluster-traces/watchtower
        - name: GOOGLE_CLOUD_PROJECT
          value: my-project
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
```

```yaml
# k8s/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: agent-sa
  annotations:
    iam.gke.io/gcp-service-account: agent-traces@my-project.iam.gserviceaccount.com
```

#### 9.8.3 AWS Lambda Example

```python
# lambda_function.py
import os
from watchtower import AgentTracePlugin
from watchtower.writers.s3_writer import S3Writer

# Lambda handler
def lambda_handler(event, context):
    # Configure watchtower for Lambda
    plugin = AgentTracePlugin(
        writers=[S3Writer(
            bucket_name=os.getenv("S3_TRACES_BUCKET"),
            region=os.getenv("AWS_REGION")
        )],
        run_id=f"lambda_{context.request_id[:8]}"
    )

    # Setup agent with plugin
    runner = InMemoryRunner(agent=agent, plugins=[plugin])

    # Run agent
    # ...
```

**Terraform:**

```hcl
resource "aws_s3_bucket" "traces" {
  bucket = "lambda-traces-bucket"
}

resource "aws_iam_role_policy" "lambda_s3" {
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject"
      ]
      Resource = "${aws_s3_bucket.traces.arn}/traces/*"
    }]
  })
}
```

---

## 10. Implementation Plan

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

- [ ] Implement `watchtower show` command
- [ ] Build `Summary` component
- [ ] Build `EventDetail` component
- [ ] Add keyboard navigation
- [ ] Handle edge cases (empty traces, large traces)

### Phase 4: Tail Command (Week 4-5)

- [ ] Implement `watchtower tail` command
- [ ] Implement live event streaming with `<Static>`
- [ ] Add real-time stats updates
- [ ] Handle process lifecycle (start, stop, error)
- [ ] Add pause/resume functionality

### Phase 5: Polish & Release (Week 5-6)

- [ ] Implement `watchtower list` command
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
name = "watchtower"
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
  "name": "watchtower",
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
~/.watchtower/
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
from watchtower import AgentTracePlugin

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
watchtower show last

# View a specific trace
watchtower show 2024-01-15_abc123

# List recent traces
watchtower list --limit 20

# Run an agent with live tailing
watchtower tail python my_agent.py

# Run with arguments
watchtower tail -- python my_agent.py --verbose --config prod.yaml
```
