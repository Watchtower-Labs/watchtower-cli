# AgentTrace Python SDK - Complete Implementation Guide

> **Project:** Tracing plugin for Google ADK agents
> **Package Name:** `agenttrace`
> **Target:** PyPI distribution
> **Stack:** Python 3.9+ / Google ADK / asyncio

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Project Setup](#phase-1-project-setup)
4. [Phase 2: Core Plugin](#phase-2-core-plugin)
5. [Phase 3: Event Emitters](#phase-3-event-emitters)
6. [Phase 4: Output Writers](#phase-4-output-writers)
7. [Phase 5: Configuration](#phase-5-configuration)
8. [Phase 6: Sanitization](#phase-6-sanitization)
9. [Phase 7: Testing](#phase-7-testing)
10. [Phase 8: Packaging](#phase-8-packaging)
11. [File Reference](#file-reference)
12. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

### What We're Building

The `agenttrace` Python SDK is a **plugin for Google ADK** that:

1. **Hooks into agent lifecycle** - Intercepts callbacks at key moments
2. **Captures trace events** - LLM calls, tool executions, state changes
3. **Writes to files** - JSONL format in `~/.agenttrace/traces/`
4. **Streams to stdout** - JSON-RPC format for live CLI tailing

### How ADK Plugins Work

Google ADK's `InMemoryRunner` accepts a `plugins` list. Each plugin can implement callback methods that fire at specific lifecycle points:

```python
runner = InMemoryRunner(
    agent=agent,
    app_name="my_app",
    plugins=[AgentTracePlugin()]  # Our plugin hooks in here
)
```

### Plugin Callback Flow

```
User Message
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  before_agent_callback()         → emit run.start          │
│     │                                                       │
│     ▼                                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  before_model_callback()      → emit llm.request    │   │
│  │     │                                               │   │
│  │     ▼                                               │   │
│  │  [LLM API Call]                                     │   │
│  │     │                                               │   │
│  │     ▼                                               │   │
│  │  after_model_callback()       → emit llm.response   │   │
│  └─────────────────────────────────────────────────────┘   │
│     │                                                       │
│     ▼ (if tool calls)                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  before_tool_callback()       → emit tool.start     │   │
│  │     │                                               │   │
│  │     ▼                                               │   │
│  │  [Tool Execution]                                   │   │
│  │     │                                               │   │
│  │     ▼                                               │   │
│  │  after_tool_callback()        → emit tool.end       │   │
│  └─────────────────────────────────────────────────────┘   │
│     │                                                       │
│     ▼ (loop until done)                                     │
│  after_agent_callback()          → emit run.end            │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
Agent Response
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SDK ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      AgentTracePlugin                               │ │
│  │                                                                     │ │
│  │   Implements ADK callback interface:                               │ │
│  │   • before_agent_callback / after_agent_callback                   │ │
│  │   • before_model_callback / after_model_callback                   │ │
│  │   • before_tool_callback / after_tool_callback                     │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        EventEmitter                                 │ │
│  │                                                                     │ │
│  │   Creates structured events:                                        │ │
│  │   • run.start / run.end                                            │ │
│  │   • llm.request / llm.response                                     │ │
│  │   • tool.start / tool.end / tool.error                             │ │
│  │   • state.change / agent.transfer                                  │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         Writers                                     │ │
│  │                                                                     │ │
│  │   FileWriter              StdoutWriter            BufferedWriter   │ │
│  │   └─ JSONL files          └─ JSON-RPC             └─ Batching      │ │
│  │      ~/.agenttrace/          to stdout               for perf      │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                       Utilities                                     │ │
│  │                                                                     │ │
│  │   Sanitizer           Config              Paths                    │ │
│  │   └─ Redact           └─ YAML             └─ ~/.agenttrace/        │ │
│  │      secrets             loader              directory mgmt        │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Project Setup

### 1.1 Directory Structure

Create the following structure:

```
watchtower-cli/
├── sdk/                              # NEW: Python SDK package
│   ├── pyproject.toml                # Modern Python packaging
│   ├── setup.py                      # Legacy compatibility
│   ├── README.md                     # PyPI description
│   ├── LICENSE                       # MIT license
│   ├── src/
│   │   └── agenttrace/
│   │       ├── __init__.py           # Public exports
│   │       ├── plugin.py             # Main AgentTracePlugin
│   │       ├── emitter.py            # Event creation
│   │       ├── writers/
│   │       │   ├── __init__.py
│   │       │   ├── base.py           # Abstract writer
│   │       │   ├── file.py           # JSONL file writer
│   │       │   ├── stdout.py         # JSON-RPC stdout writer
│   │       │   └── buffered.py       # Buffered writer wrapper
│   │       ├── sanitizer.py          # Argument sanitization
│   │       ├── config.py             # Configuration loader
│   │       ├── paths.py              # Path utilities
│   │       └── types.py              # Type definitions
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py               # Pytest fixtures
│   │   ├── test_plugin.py
│   │   ├── test_emitter.py
│   │   ├── test_writers.py
│   │   └── test_sanitizer.py
│   └── examples/
│       ├── basic_usage.py
│       └── live_streaming.py
│
├── cli/                              # TypeScript CLI (existing guide)
└── README.md
```

**Commands to create structure:**

```bash
cd <project-root>  # Navigate to watchtower-cli root
mkdir -p sdk/src/agenttrace/writers
mkdir -p sdk/tests
mkdir -p sdk/examples
touch sdk/src/agenttrace/__init__.py
touch sdk/src/agenttrace/writers/__init__.py
touch sdk/tests/__init__.py
```

### 1.2 pyproject.toml

Create `sdk/pyproject.toml`:

```toml
[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "agenttrace"
version = "0.1.0"
description = "Tracing plugin for Google ADK agents"
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.9"
authors = [
    {name = "Watchtower Labs", email = "hello@watchtower.dev"}
]
keywords = [
    "adk",
    "google-adk",
    "tracing",
    "observability",
    "ai-agents",
    "debugging",
    "llm",
]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: Software Development :: Debuggers",
    "Topic :: System :: Monitoring",
    "Typing :: Typed",
]

dependencies = [
    "google-adk>=0.1.0",
    "pyyaml>=6.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-asyncio>=0.21",
    "pytest-cov>=4.0",
    "mypy>=1.0",
    "ruff>=0.1.0",
    "black>=23.0",
]

[project.urls]
Homepage = "https://watchtower.dev"
Documentation = "https://github.com/your-org/watchtower-cli#readme"
Repository = "https://github.com/your-org/watchtower-cli"
Issues = "https://github.com/your-org/watchtower-cli/issues"

[tool.setuptools.packages.find]
where = ["src"]

[tool.setuptools.package-data]
agenttrace = ["py.typed"]

# ─────────────────────────────────────────────────────────────
# TOOL CONFIGURATION
# ─────────────────────────────────────────────────────────────

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = "-v --tb=short"

[tool.mypy]
python_version = "3.9"
strict = true
warn_return_any = true
warn_unused_ignores = true
disallow_untyped_defs = true
ignore_missing_imports = true

[tool.ruff]
line-length = 100
target-version = "py39"
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
]
ignore = [
    "E501",  # line too long (handled by black)
]

[tool.black]
line-length = 100
target-version = ["py39"]
```

### 1.3 Setup.py (Legacy Compatibility)

Create `sdk/setup.py`:

```python
#!/usr/bin/env python
from setuptools import setup

# This file is needed for editable installs with older pip versions
# All configuration is in pyproject.toml
setup()
```

---

## Phase 2: Core Plugin

### 2.1 Type Definitions

Create `sdk/src/agenttrace/types.py`:

```python
"""
AgentTrace SDK - Type Definitions

Type hints and dataclasses for the tracing system.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
import time


class EventType(str, Enum):
    """All possible trace event types."""

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
class TraceEvent:
    """Base class for all trace events."""

    type: EventType
    run_id: str
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "type": self.type.value,
            "run_id": self.run_id,
            "timestamp": self.timestamp,
        }


@dataclass
class RunStartEvent(TraceEvent):
    """Emitted when an agent invocation begins."""

    type: EventType = field(default=EventType.RUN_START, init=False)
    invocation_id: str = ""
    agent_name: str = ""
    user_id: Optional[str] = None
    session_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = super().to_dict()
        d.update({
            "invocation_id": self.invocation_id,
            "agent_name": self.agent_name,
        })
        if self.user_id:
            d["user_id"] = self.user_id
        if self.session_id:
            d["session_id"] = self.session_id
        return d


@dataclass
class RunEndEvent(TraceEvent):
    """Emitted when an agent invocation completes."""

    type: EventType = field(default=EventType.RUN_END, init=False)
    duration_ms: float = 0
    summary: Optional[Dict[str, int]] = None

    def to_dict(self) -> Dict[str, Any]:
        d = super().to_dict()
        d["duration_ms"] = self.duration_ms
        if self.summary:
            d["summary"] = self.summary
        return d


@dataclass
class LLMRequestEvent(TraceEvent):
    """Emitted when an LLM API call is initiated."""

    type: EventType = field(default=EventType.LLM_REQUEST, init=False)
    request_id: str = ""
    model: str = ""
    message_count: int = 0
    tools_available: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = super().to_dict()
        d.update({
            "request_id": self.request_id,
            "model": self.model,
            "message_count": self.message_count,
            "tools_available": self.tools_available,
        })
        return d


@dataclass
class LLMResponseEvent(TraceEvent):
    """Emitted when an LLM API response is received."""

    type: EventType = field(default=EventType.LLM_RESPONSE, init=False)
    request_id: str = ""
    duration_ms: float = 0
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    has_tool_calls: bool = False
    finish_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = super().to_dict()
        d.update({
            "request_id": self.request_id,
            "duration_ms": self.duration_ms,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
            "has_tool_calls": self.has_tool_calls,
            "finish_reason": self.finish_reason,
        })
        return d


@dataclass
class ToolStartEvent(TraceEvent):
    """Emitted when a tool execution begins."""

    type: EventType = field(default=EventType.TOOL_START, init=False)
    tool_call_id: str = ""
    tool_name: str = ""
    tool_args: Dict[str, Any] = field(default_factory=dict)
    agent_name: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = super().to_dict()
        d.update({
            "tool_call_id": self.tool_call_id,
            "tool_name": self.tool_name,
            "tool_args": self.tool_args,
            "agent_name": self.agent_name,
        })
        return d


@dataclass
class ToolEndEvent(TraceEvent):
    """Emitted when a tool execution completes successfully."""

    type: EventType = field(default=EventType.TOOL_END, init=False)
    tool_call_id: str = ""
    tool_name: str = ""
    duration_ms: float = 0
    response_preview: str = ""
    success: bool = True

    def to_dict(self) -> Dict[str, Any]:
        d = super().to_dict()
        d.update({
            "tool_call_id": self.tool_call_id,
            "tool_name": self.tool_name,
            "duration_ms": self.duration_ms,
            "response_preview": self.response_preview,
            "success": self.success,
        })
        return d


@dataclass
class ToolErrorEvent(TraceEvent):
    """Emitted when a tool execution fails."""

    type: EventType = field(default=EventType.TOOL_ERROR, init=False)
    tool_call_id: str = ""
    tool_name: str = ""
    error_type: str = ""
    error_message: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = super().to_dict()
        d.update({
            "tool_call_id": self.tool_call_id,
            "tool_name": self.tool_name,
            "error_type": self.error_type,
            "error_message": self.error_message,
        })
        return d


@dataclass
class StateChangeEvent(TraceEvent):
    """Emitted when session state is modified."""

    type: EventType = field(default=EventType.STATE_CHANGE, init=False)
    author: str = ""
    state_delta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = super().to_dict()
        d.update({
            "author": self.author,
            "state_delta": self.state_delta,
        })
        return d


@dataclass
class AgentTransferEvent(TraceEvent):
    """Emitted during multi-agent handoffs."""

    type: EventType = field(default=EventType.AGENT_TRANSFER, init=False)
    from_agent: str = ""
    to_agent: str = ""
    reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = super().to_dict()
        d.update({
            "from_agent": self.from_agent,
            "to_agent": self.to_agent,
            "reason": self.reason,
        })
        return d


@dataclass
class PluginConfig:
    """Configuration options for AgentTracePlugin."""

    trace_dir: str = "~/.agenttrace/traces"
    enable_file: bool = True
    enable_stdout: bool = False
    run_id: Optional[str] = None
    buffer_size: int = 10
    sanitize_args: bool = True
    max_response_preview: int = 500
    retention_days: int = 30
```

### 2.2 Path Utilities

Create `sdk/src/agenttrace/paths.py`:

```python
"""
AgentTrace SDK - Path Utilities

Handles trace directory management and file paths.
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Optional


# Default directories
DEFAULT_BASE_DIR = Path.home() / ".agenttrace"
DEFAULT_TRACE_DIR = DEFAULT_BASE_DIR / "traces"
DEFAULT_CONFIG_PATH = DEFAULT_BASE_DIR / "config.yaml"


def get_base_dir() -> Path:
    """Get the base agenttrace directory."""
    env_dir = os.environ.get("AGENTTRACE_DIR")
    if env_dir:
        return Path(env_dir).expanduser()
    return DEFAULT_BASE_DIR


def get_trace_dir() -> Path:
    """Get the trace storage directory."""
    return get_base_dir() / "traces"


def get_config_path() -> Path:
    """Get the SDK configuration file path."""
    return get_base_dir() / "config.yaml"


def ensure_trace_dir() -> Path:
    """
    Ensure the trace directory exists with proper permissions.

    Returns:
        Path to the trace directory
    """
    trace_dir = get_trace_dir()

    if not trace_dir.exists():
        # Create with restricted permissions (owner only)
        trace_dir.mkdir(parents=True, mode=0o700)

    return trace_dir


def get_trace_path(run_id: str, date: Optional[datetime] = None) -> Path:
    """
    Generate the path for a trace file.

    Args:
        run_id: Unique run identifier
        date: Date for the trace (defaults to now)

    Returns:
        Path to the trace file

    Example:
        >>> get_trace_path("abc123")
        PosixPath('~/.agenttrace/traces/2024-01-15_abc123.jsonl')
    """
    if date is None:
        date = datetime.now()

    date_str = date.strftime("%Y-%m-%d")
    filename = f"{date_str}_{run_id}.jsonl"

    return get_trace_dir() / filename


def is_tracing_disabled() -> bool:
    """Check if tracing is disabled via environment variable."""
    return os.environ.get("AGENTTRACE_DISABLE", "").lower() in ("1", "true", "yes")


def is_live_mode() -> bool:
    """Check if live streaming mode is enabled (set by CLI)."""
    return os.environ.get("AGENTTRACE_LIVE", "").lower() in ("1", "true", "yes")


def get_env_run_id() -> Optional[str]:
    """Get run ID from environment (set by CLI for correlation)."""
    return os.environ.get("AGENTTRACE_RUN_ID")
```

### 2.3 Main Plugin

Create `sdk/src/agenttrace/plugin.py`:

```python
"""
AgentTrace SDK - Main Plugin

The core plugin that hooks into Google ADK's callback system.
"""

from __future__ import annotations

import os
import time
import uuid
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from .types import (
    PluginConfig,
    RunStartEvent,
    RunEndEvent,
    LLMRequestEvent,
    LLMResponseEvent,
    ToolStartEvent,
    ToolEndEvent,
    ToolErrorEvent,
    StateChangeEvent,
    TraceEvent,
)
from .paths import (
    ensure_trace_dir,
    get_trace_path,
    is_tracing_disabled,
    is_live_mode,
    get_env_run_id,
)
from .writers.file import FileWriter
from .writers.stdout import StdoutWriter
from .writers.buffered import BufferedWriter
from .writers.base import BaseWriter
from .sanitizer import Sanitizer

if TYPE_CHECKING:
    from google.adk.agents.callback_context import CallbackContext
    from google.adk.models import LlmRequest, LlmResponse
    from google.genai.types import Content


class AgentTracePlugin:
    """
    Tracing plugin for Google ADK agents.

    Intercepts agent lifecycle callbacks and emits structured trace events
    to files and/or stdout for observation and debugging.

    Usage:
        from agenttrace import AgentTracePlugin
        from google.adk.runners import InMemoryRunner

        runner = InMemoryRunner(
            agent=agent,
            app_name="my_app",
            plugins=[AgentTracePlugin()]
        )

    Configuration:
        # Default: writes to ~/.agenttrace/traces/
        plugin = AgentTracePlugin()

        # Custom configuration
        plugin = AgentTracePlugin(
            trace_dir="./traces",
            enable_stdout=True,  # For live CLI tailing
            sanitize_args=True,  # Redact sensitive data
        )

        # Auto-detect CLI mode
        plugin = AgentTracePlugin(
            enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1"
        )
    """

    def __init__(
        self,
        trace_dir: str = "~/.agenttrace/traces",
        enable_file: bool = True,
        enable_stdout: bool = False,
        run_id: Optional[str] = None,
        buffer_size: int = 10,
        sanitize_args: bool = True,
        max_response_preview: int = 500,
    ):
        """
        Initialize the tracing plugin.

        Args:
            trace_dir: Directory to store trace files
            enable_file: Write traces to JSONL files
            enable_stdout: Stream traces to stdout (JSON-RPC format)
            run_id: Custom run ID (auto-generated if None)
            buffer_size: Number of events to buffer before flushing
            sanitize_args: Redact sensitive data from tool arguments
            max_response_preview: Max characters for response previews
        """
        # Check if tracing is disabled globally
        if is_tracing_disabled():
            self._disabled = True
            return

        self._disabled = False

        # Configuration
        self.config = PluginConfig(
            trace_dir=trace_dir,
            enable_file=enable_file,
            enable_stdout=enable_stdout or is_live_mode(),
            run_id=run_id or get_env_run_id() or uuid.uuid4().hex[:8],
            buffer_size=buffer_size,
            sanitize_args=sanitize_args,
            max_response_preview=max_response_preview,
        )

        # Initialize components
        self._sanitizer = Sanitizer() if sanitize_args else None
        self._writers: List[BaseWriter] = []
        self._setup_writers()

        # Runtime state
        self._run_start_time: float = 0
        self._llm_request_times: Dict[str, float] = {}
        self._tool_start_times: Dict[str, float] = {}
        self._stats = {
            "llm_calls": 0,
            "tool_calls": 0,
            "total_tokens": 0,
            "errors": 0,
        }

    # ═══════════════════════════════════════════════════════════════════════════
    # SETUP
    # ═══════════════════════════════════════════════════════════════════════════

    def _setup_writers(self) -> None:
        """Initialize output writers based on configuration."""
        if self.config.enable_file:
            ensure_trace_dir()
            trace_path = get_trace_path(self.config.run_id)
            file_writer = FileWriter(trace_path)

            # Wrap with buffering for performance
            if self.config.buffer_size > 1:
                file_writer = BufferedWriter(file_writer, self.config.buffer_size)

            self._writers.append(file_writer)

        if self.config.enable_stdout:
            self._writers.append(StdoutWriter())

    # ═══════════════════════════════════════════════════════════════════════════
    # EVENT EMISSION
    # ═══════════════════════════════════════════════════════════════════════════

    def _emit(self, event: TraceEvent) -> None:
        """Emit an event to all configured writers."""
        if self._disabled:
            return

        event_dict = event.to_dict()

        for writer in self._writers:
            try:
                writer.write(event_dict)
            except Exception as e:
                # Don't let tracing errors break the agent
                print(f"[agenttrace] Warning: Failed to write event: {e}")

    # ═══════════════════════════════════════════════════════════════════════════
    # ADK CALLBACKS - AGENT LIFECYCLE
    # ═══════════════════════════════════════════════════════════════════════════

    async def before_agent_callback(
        self,
        callback_context: "CallbackContext",
        input_message: "Content",
    ) -> Optional["Content"]:
        """
        Called when an agent invocation begins.

        Emits: run.start
        """
        if self._disabled:
            return None

        self._run_start_time = time.time()
        self._stats = {"llm_calls": 0, "tool_calls": 0, "total_tokens": 0, "errors": 0}

        self._emit(RunStartEvent(
            run_id=self.config.run_id,
            invocation_id=getattr(callback_context, "invocation_id", ""),
            agent_name=getattr(callback_context, "agent_name", ""),
            user_id=getattr(callback_context, "user_id", None),
            session_id=getattr(callback_context, "session_id", None),
        ))

        return None  # Don't modify input

    async def after_agent_callback(
        self,
        callback_context: "CallbackContext",
        output_message: "Content",
    ) -> Optional["Content"]:
        """
        Called when an agent invocation completes.

        Emits: run.end
        """
        if self._disabled:
            return None

        duration_ms = (time.time() - self._run_start_time) * 1000

        self._emit(RunEndEvent(
            run_id=self.config.run_id,
            duration_ms=duration_ms,
            summary=self._stats.copy(),
        ))

        # Flush any buffered events
        self._flush()

        return None

    # ═══════════════════════════════════════════════════════════════════════════
    # ADK CALLBACKS - LLM CALLS
    # ═══════════════════════════════════════════════════════════════════════════

    async def before_model_callback(
        self,
        callback_context: "CallbackContext",
        llm_request: "LlmRequest",
    ) -> Optional["LlmRequest"]:
        """
        Called before each LLM API call.

        Emits: llm.request
        """
        if self._disabled:
            return None

        request_id = uuid.uuid4().hex[:8]
        self._llm_request_times[request_id] = time.time()

        # Store request_id for correlation with response
        if not hasattr(callback_context, "_agenttrace_request_id"):
            callback_context._agenttrace_request_id = request_id

        # Extract tool names
        tools_available = []
        if hasattr(llm_request, "tools") and llm_request.tools:
            tools_available = [
                getattr(t, "name", str(t)) for t in llm_request.tools
            ]

        self._emit(LLMRequestEvent(
            run_id=self.config.run_id,
            request_id=request_id,
            model=getattr(llm_request, "model", "unknown"),
            message_count=len(getattr(llm_request, "contents", [])),
            tools_available=tools_available,
        ))

        return None

    async def after_model_callback(
        self,
        callback_context: "CallbackContext",
        llm_response: "LlmResponse",
    ) -> Optional["LlmResponse"]:
        """
        Called after each LLM API response.

        Emits: llm.response
        """
        if self._disabled:
            return None

        request_id = getattr(callback_context, "_agenttrace_request_id", "")
        start_time = self._llm_request_times.pop(request_id, time.time())
        duration_ms = (time.time() - start_time) * 1000

        # Extract usage info
        usage = getattr(llm_response, "usage_metadata", None)
        input_tokens = getattr(usage, "prompt_token_count", 0) if usage else 0
        output_tokens = getattr(usage, "candidates_token_count", 0) if usage else 0
        total_tokens = input_tokens + output_tokens

        # Check for tool calls
        has_tool_calls = False
        candidates = getattr(llm_response, "candidates", [])
        if candidates:
            content = getattr(candidates[0], "content", None)
            if content:
                parts = getattr(content, "parts", [])
                has_tool_calls = any(
                    hasattr(p, "function_call") for p in parts
                )

        # Update stats
        self._stats["llm_calls"] += 1
        self._stats["total_tokens"] += total_tokens

        self._emit(LLMResponseEvent(
            run_id=self.config.run_id,
            request_id=request_id,
            duration_ms=duration_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            has_tool_calls=has_tool_calls,
            finish_reason=getattr(
                candidates[0] if candidates else None,
                "finish_reason",
                ""
            ),
        ))

        return None

    # ═══════════════════════════════════════════════════════════════════════════
    # ADK CALLBACKS - TOOL EXECUTION
    # ═══════════════════════════════════════════════════════════════════════════

    async def before_tool_callback(
        self,
        tool: Any,
        args: Dict[str, Any],
        tool_context: Any,
    ) -> Optional[Dict[str, Any]]:
        """
        Called before each tool execution.

        Emits: tool.start
        """
        if self._disabled:
            return None

        tool_call_id = uuid.uuid4().hex[:8]
        self._tool_start_times[tool_call_id] = time.time()

        # Store for correlation
        if hasattr(tool_context, "__dict__"):
            tool_context._agenttrace_tool_call_id = tool_call_id

        # Get tool name
        tool_name = getattr(tool, "name", None) or getattr(tool, "__name__", str(tool))

        # Sanitize arguments if enabled
        sanitized_args = args
        if self._sanitizer:
            sanitized_args = self._sanitizer.sanitize_dict(args)

        self._emit(ToolStartEvent(
            run_id=self.config.run_id,
            tool_call_id=tool_call_id,
            tool_name=tool_name,
            tool_args=sanitized_args,
            agent_name=getattr(tool_context, "agent_name", ""),
        ))

        self._stats["tool_calls"] += 1

        return None

    async def after_tool_callback(
        self,
        tool: Any,
        args: Dict[str, Any],
        tool_context: Any,
        tool_response: Any,
    ) -> Optional[Any]:
        """
        Called after each tool execution.

        Emits: tool.end or tool.error
        """
        if self._disabled:
            return None

        tool_call_id = getattr(tool_context, "_agenttrace_tool_call_id", "")
        start_time = self._tool_start_times.pop(tool_call_id, time.time())
        duration_ms = (time.time() - start_time) * 1000

        tool_name = getattr(tool, "name", None) or getattr(tool, "__name__", str(tool))

        # Check if response is an error
        if isinstance(tool_response, Exception):
            self._stats["errors"] += 1
            self._emit(ToolErrorEvent(
                run_id=self.config.run_id,
                tool_call_id=tool_call_id,
                tool_name=tool_name,
                error_type=type(tool_response).__name__,
                error_message=str(tool_response),
            ))
        else:
            # Create response preview
            response_str = str(tool_response)
            preview = response_str[:self.config.max_response_preview]
            if len(response_str) > self.config.max_response_preview:
                preview += "..."

            self._emit(ToolEndEvent(
                run_id=self.config.run_id,
                tool_call_id=tool_call_id,
                tool_name=tool_name,
                duration_ms=duration_ms,
                response_preview=preview,
                success=True,
            ))

        return None

    # ═══════════════════════════════════════════════════════════════════════════
    # UTILITIES
    # ═══════════════════════════════════════════════════════════════════════════

    def _flush(self) -> None:
        """Flush all writers."""
        for writer in self._writers:
            try:
                writer.flush()
            except Exception:
                pass

    def close(self) -> None:
        """Close all writers and release resources."""
        for writer in self._writers:
            try:
                writer.close()
            except Exception:
                pass
        self._writers.clear()

    @property
    def run_id(self) -> str:
        """Get the current run ID."""
        return self.config.run_id

    def __enter__(self) -> "AgentTracePlugin":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
```

---

## Phase 3: Event Emitters

### 3.1 Event Emitter Module

Create `sdk/src/agenttrace/emitter.py`:

```python
"""
AgentTrace SDK - Event Emitter

Factory functions for creating trace events with proper timestamps.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from .types import (
    RunStartEvent,
    RunEndEvent,
    LLMRequestEvent,
    LLMResponseEvent,
    ToolStartEvent,
    ToolEndEvent,
    ToolErrorEvent,
    StateChangeEvent,
    AgentTransferEvent,
)


def emit_run_start(
    run_id: str,
    invocation_id: str,
    agent_name: str,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> RunStartEvent:
    """Create a run.start event."""
    return RunStartEvent(
        run_id=run_id,
        timestamp=time.time(),
        invocation_id=invocation_id,
        agent_name=agent_name,
        user_id=user_id,
        session_id=session_id,
    )


def emit_run_end(
    run_id: str,
    duration_ms: float,
    summary: Optional[Dict[str, int]] = None,
) -> RunEndEvent:
    """Create a run.end event."""
    return RunEndEvent(
        run_id=run_id,
        timestamp=time.time(),
        duration_ms=duration_ms,
        summary=summary,
    )


def emit_llm_request(
    run_id: str,
    request_id: str,
    model: str,
    message_count: int,
    tools_available: Optional[List[str]] = None,
) -> LLMRequestEvent:
    """Create an llm.request event."""
    return LLMRequestEvent(
        run_id=run_id,
        timestamp=time.time(),
        request_id=request_id,
        model=model,
        message_count=message_count,
        tools_available=tools_available or [],
    )


def emit_llm_response(
    run_id: str,
    request_id: str,
    duration_ms: float,
    input_tokens: int,
    output_tokens: int,
    has_tool_calls: bool = False,
    finish_reason: str = "",
) -> LLMResponseEvent:
    """Create an llm.response event."""
    return LLMResponseEvent(
        run_id=run_id,
        timestamp=time.time(),
        request_id=request_id,
        duration_ms=duration_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
        has_tool_calls=has_tool_calls,
        finish_reason=finish_reason,
    )


def emit_tool_start(
    run_id: str,
    tool_call_id: str,
    tool_name: str,
    tool_args: Dict[str, Any],
    agent_name: str = "",
) -> ToolStartEvent:
    """Create a tool.start event."""
    return ToolStartEvent(
        run_id=run_id,
        timestamp=time.time(),
        tool_call_id=tool_call_id,
        tool_name=tool_name,
        tool_args=tool_args,
        agent_name=agent_name,
    )


def emit_tool_end(
    run_id: str,
    tool_call_id: str,
    tool_name: str,
    duration_ms: float,
    response_preview: str = "",
) -> ToolEndEvent:
    """Create a tool.end event."""
    return ToolEndEvent(
        run_id=run_id,
        timestamp=time.time(),
        tool_call_id=tool_call_id,
        tool_name=tool_name,
        duration_ms=duration_ms,
        response_preview=response_preview,
        success=True,
    )


def emit_tool_error(
    run_id: str,
    tool_call_id: str,
    tool_name: str,
    error: Exception,
) -> ToolErrorEvent:
    """Create a tool.error event."""
    return ToolErrorEvent(
        run_id=run_id,
        timestamp=time.time(),
        tool_call_id=tool_call_id,
        tool_name=tool_name,
        error_type=type(error).__name__,
        error_message=str(error),
    )


def emit_state_change(
    run_id: str,
    author: str,
    state_delta: Dict[str, Any],
) -> StateChangeEvent:
    """Create a state.change event."""
    return StateChangeEvent(
        run_id=run_id,
        timestamp=time.time(),
        author=author,
        state_delta=state_delta,
    )


def emit_agent_transfer(
    run_id: str,
    from_agent: str,
    to_agent: str,
    reason: str = "",
) -> AgentTransferEvent:
    """Create an agent.transfer event."""
    return AgentTransferEvent(
        run_id=run_id,
        timestamp=time.time(),
        from_agent=from_agent,
        to_agent=to_agent,
        reason=reason,
    )
```

---

## Phase 4: Output Writers

### 4.1 Base Writer

Create `sdk/src/agenttrace/writers/base.py`:

```python
"""
AgentTrace SDK - Base Writer

Abstract base class for event writers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseWriter(ABC):
    """Abstract base class for trace event writers."""

    @abstractmethod
    def write(self, event: Dict[str, Any]) -> None:
        """
        Write a single event.

        Args:
            event: Event dictionary to write
        """
        pass

    def flush(self) -> None:
        """Flush any buffered data. Override if needed."""
        pass

    def close(self) -> None:
        """Close the writer and release resources. Override if needed."""
        pass

    def __enter__(self) -> "BaseWriter":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
```

### 4.2 File Writer

Create `sdk/src/agenttrace/writers/file.py`:

```python
"""
AgentTrace SDK - File Writer

Writes trace events to JSONL files.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional, TextIO

from .base import BaseWriter


class FileWriter(BaseWriter):
    """
    Writes trace events to a JSONL file.

    Each event is written as a single JSON line, making the file
    easy to parse and stream.

    Example output:
        {"type":"run.start","run_id":"abc123","timestamp":1705329121,...}
        {"type":"llm.request","run_id":"abc123","timestamp":1705329121.5,...}
        {"type":"llm.response","run_id":"abc123","timestamp":1705329122,...}
    """

    def __init__(self, path: Path | str):
        """
        Initialize the file writer.

        Args:
            path: Path to the output JSONL file
        """
        self.path = Path(path)
        self._file: Optional[TextIO] = None
        self._open()

    def _open(self) -> None:
        """Open the file for writing."""
        # Ensure parent directory exists
        self.path.parent.mkdir(parents=True, exist_ok=True)

        # Open with restricted permissions (owner read/write only)
        self._file = open(self.path, "a", encoding="utf-8")

        # Set file permissions (Unix only)
        try:
            self.path.chmod(0o600)
        except (OSError, AttributeError):
            pass  # Windows or permission error

    def write(self, event: Dict[str, Any]) -> None:
        """Write an event as a JSON line."""
        if self._file is None:
            return

        line = json.dumps(event, separators=(",", ":"), default=str)
        self._file.write(line + "\n")

    def flush(self) -> None:
        """Flush the file buffer to disk."""
        if self._file:
            self._file.flush()

    def close(self) -> None:
        """Close the file."""
        if self._file:
            self._file.close()
            self._file = None
```

### 4.3 Stdout Writer

Create `sdk/src/agenttrace/writers/stdout.py`:

```python
"""
AgentTrace SDK - Stdout Writer

Writes trace events to stdout in JSON-RPC format for CLI consumption.
"""

from __future__ import annotations

import json
import sys
from typing import Any, Dict

from .base import BaseWriter


class StdoutWriter(BaseWriter):
    """
    Writes trace events to stdout in JSON-RPC 2.0 format.

    This format allows the CLI to distinguish trace events from
    regular print statements in the agent's output.

    Example output:
        {"jsonrpc":"2.0","method":"run.start","params":{...}}
        {"jsonrpc":"2.0","method":"llm.request","params":{...}}
    """

    def write(self, event: Dict[str, Any]) -> None:
        """
        Write an event as a JSON-RPC notification.

        Args:
            event: Event dictionary to write
        """
        # Wrap in JSON-RPC 2.0 notification format
        rpc_message = {
            "jsonrpc": "2.0",
            "method": event.get("type", "unknown"),
            "params": event,
        }

        # Write to stdout with immediate flush
        line = json.dumps(rpc_message, separators=(",", ":"), default=str)
        print(line, flush=True)

    def flush(self) -> None:
        """Flush stdout."""
        sys.stdout.flush()
```

### 4.4 Buffered Writer

Create `sdk/src/agenttrace/writers/buffered.py`:

```python
"""
AgentTrace SDK - Buffered Writer

Wraps another writer with buffering for improved performance.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .base import BaseWriter


class BufferedWriter(BaseWriter):
    """
    Wraps another writer with buffering for performance.

    Events are accumulated in memory and flushed to the underlying
    writer when the buffer reaches a specified size.

    Args:
        writer: The underlying writer to buffer
        buffer_size: Number of events to buffer before flushing
    """

    def __init__(self, writer: BaseWriter, buffer_size: int = 10):
        self._writer = writer
        self._buffer_size = buffer_size
        self._buffer: List[Dict[str, Any]] = []

    def write(self, event: Dict[str, Any]) -> None:
        """Add event to buffer, flush if full."""
        self._buffer.append(event)

        if len(self._buffer) >= self._buffer_size:
            self.flush()

    def flush(self) -> None:
        """Write all buffered events to the underlying writer."""
        for event in self._buffer:
            self._writer.write(event)

        self._buffer.clear()
        self._writer.flush()

    def close(self) -> None:
        """Flush remaining events and close the underlying writer."""
        self.flush()
        self._writer.close()
```

### 4.5 Writers Package Init

Create `sdk/src/agenttrace/writers/__init__.py`:

```python
"""
AgentTrace SDK - Writers Package

Output writers for trace events.
"""

from .base import BaseWriter
from .file import FileWriter
from .stdout import StdoutWriter
from .buffered import BufferedWriter

__all__ = [
    "BaseWriter",
    "FileWriter",
    "StdoutWriter",
    "BufferedWriter",
]
```

---

## Phase 5: Configuration

### 5.1 Configuration Loader

Create `sdk/src/agenttrace/config.py`:

```python
"""
AgentTrace SDK - Configuration

Loads and manages SDK configuration from YAML files.
"""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

from .types import PluginConfig
from .paths import get_config_path


def load_config(config_path: Optional[Path] = None) -> PluginConfig:
    """
    Load SDK configuration from YAML file.

    Args:
        config_path: Path to config file (defaults to ~/.agenttrace/config.yaml)

    Returns:
        PluginConfig with loaded values merged with defaults
    """
    if config_path is None:
        config_path = get_config_path()

    config = PluginConfig()

    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}

            # Update config with loaded values
            if "trace_dir" in data:
                config.trace_dir = data["trace_dir"]
            if "buffer_size" in data:
                config.buffer_size = int(data["buffer_size"])
            if "sanitize_args" in data:
                config.sanitize_args = bool(data["sanitize_args"])
            if "max_response_preview" in data:
                config.max_response_preview = int(data["max_response_preview"])
            if "retention_days" in data:
                config.retention_days = int(data["retention_days"])

        except Exception as e:
            print(f"[agenttrace] Warning: Failed to load config: {e}")

    return config


def save_config(config: PluginConfig, config_path: Optional[Path] = None) -> None:
    """
    Save SDK configuration to YAML file.

    Args:
        config: Configuration to save
        config_path: Path to config file (defaults to ~/.agenttrace/config.yaml)
    """
    if config_path is None:
        config_path = get_config_path()

    # Ensure parent directory exists
    config_path.parent.mkdir(parents=True, exist_ok=True)

    # Convert to dict, excluding runtime-only fields
    data = {
        "trace_dir": config.trace_dir,
        "buffer_size": config.buffer_size,
        "sanitize_args": config.sanitize_args,
        "max_response_preview": config.max_response_preview,
        "retention_days": config.retention_days,
    }

    with open(config_path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False)


def get_default_config() -> Dict[str, Any]:
    """Get default configuration as a dictionary."""
    return asdict(PluginConfig())
```

---

## Phase 6: Sanitization

### 6.1 Argument Sanitizer

Create `sdk/src/agenttrace/sanitizer.py`:

```python
"""
AgentTrace SDK - Sanitizer

Redacts sensitive data from tool arguments before logging.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Pattern, Set


class Sanitizer:
    """
    Sanitizes sensitive data from dictionaries before logging.

    Redacts values for keys matching sensitive patterns like
    'password', 'secret', 'token', 'api_key', etc.

    Example:
        >>> sanitizer = Sanitizer()
        >>> sanitizer.sanitize_dict({"api_key": "sk-1234", "query": "hello"})
        {"api_key": "[REDACTED]", "query": "hello"}
    """

    # Default patterns for sensitive keys
    DEFAULT_PATTERNS: List[str] = [
        r"password",
        r"passwd",
        r"secret",
        r"token",
        r"api[_-]?key",
        r"auth",
        r"credential",
        r"private[_-]?key",
        r"access[_-]?key",
        r"bearer",
        r"jwt",
        r"session[_-]?id",
        r"cookie",
    ]

    REDACTED_VALUE = "[REDACTED]"

    def __init__(
        self,
        patterns: List[str] | None = None,
        additional_patterns: List[str] | None = None,
        case_sensitive: bool = False,
    ):
        """
        Initialize the sanitizer.

        Args:
            patterns: Custom patterns to use (replaces defaults)
            additional_patterns: Additional patterns to add to defaults
            case_sensitive: Whether pattern matching is case-sensitive
        """
        if patterns is not None:
            all_patterns = patterns
        else:
            all_patterns = self.DEFAULT_PATTERNS.copy()
            if additional_patterns:
                all_patterns.extend(additional_patterns)

        flags = 0 if case_sensitive else re.IGNORECASE
        self._patterns: List[Pattern[str]] = [
            re.compile(p, flags) for p in all_patterns
        ]

        # Cache for key matching results
        self._cache: Dict[str, bool] = {}

    def is_sensitive_key(self, key: str) -> bool:
        """
        Check if a key matches any sensitive pattern.

        Args:
            key: The key to check

        Returns:
            True if the key is sensitive
        """
        if key in self._cache:
            return self._cache[key]

        result = any(p.search(key) for p in self._patterns)
        self._cache[key] = result
        return result

    def sanitize_value(self, key: str, value: Any) -> Any:
        """
        Sanitize a single value if its key is sensitive.

        Args:
            key: The key for this value
            value: The value to potentially sanitize

        Returns:
            Redacted value if sensitive, original value otherwise
        """
        if self.is_sensitive_key(key):
            return self.REDACTED_VALUE

        # Recursively sanitize nested structures
        if isinstance(value, dict):
            return self.sanitize_dict(value)
        elif isinstance(value, list):
            return [self.sanitize_value(key, item) for item in value]

        return value

    def sanitize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize all sensitive values in a dictionary.

        Args:
            data: Dictionary to sanitize

        Returns:
            New dictionary with sensitive values redacted
        """
        return {
            key: self.sanitize_value(key, value)
            for key, value in data.items()
        }

    def add_pattern(self, pattern: str) -> None:
        """
        Add a new sensitive key pattern.

        Args:
            pattern: Regex pattern to add
        """
        self._patterns.append(re.compile(pattern, re.IGNORECASE))
        self._cache.clear()  # Clear cache when patterns change


# Global sanitizer instance for convenience
_default_sanitizer: Sanitizer | None = None


def get_sanitizer() -> Sanitizer:
    """Get the default sanitizer instance."""
    global _default_sanitizer
    if _default_sanitizer is None:
        _default_sanitizer = Sanitizer()
    return _default_sanitizer


def sanitize(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize a dictionary using the default sanitizer.

    Args:
        data: Dictionary to sanitize

    Returns:
        Sanitized dictionary
    """
    return get_sanitizer().sanitize_dict(data)
```

---

## Phase 7: Testing

### 7.1 Pytest Configuration

Create `sdk/tests/conftest.py`:

```python
"""
AgentTrace SDK - Test Fixtures

Shared fixtures for pytest.
"""

import os
import tempfile
from pathlib import Path
from typing import Generator

import pytest

from agenttrace import AgentTracePlugin
from agenttrace.types import PluginConfig


@pytest.fixture
def temp_trace_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for trace files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def plugin(temp_trace_dir: Path) -> Generator[AgentTracePlugin, None, None]:
    """Create a plugin with temporary trace directory."""
    p = AgentTracePlugin(
        trace_dir=str(temp_trace_dir),
        enable_file=True,
        enable_stdout=False,
    )
    yield p
    p.close()


@pytest.fixture
def mock_callback_context():
    """Create a mock ADK callback context."""
    class MockContext:
        invocation_id = "test-invocation-123"
        agent_name = "test_agent"
        user_id = "user-456"
        session_id = "session-789"

    return MockContext()


@pytest.fixture
def mock_llm_request():
    """Create a mock ADK LLM request."""
    class MockTool:
        name = "search_web"

    class MockRequest:
        model = "gemini-2.0-flash"
        contents = [{"role": "user", "parts": [{"text": "Hello"}]}]
        tools = [MockTool()]

    return MockRequest()


@pytest.fixture
def mock_llm_response():
    """Create a mock ADK LLM response."""
    class MockUsage:
        prompt_token_count = 100
        candidates_token_count = 50

    class MockCandidate:
        finish_reason = "STOP"
        content = None

    class MockResponse:
        usage_metadata = MockUsage()
        candidates = [MockCandidate()]

    return MockResponse()


@pytest.fixture(autouse=True)
def clean_env():
    """Clean environment variables before each test."""
    env_vars = [
        "AGENTTRACE_DISABLE",
        "AGENTTRACE_LIVE",
        "AGENTTRACE_RUN_ID",
        "AGENTTRACE_DIR",
    ]

    old_values = {k: os.environ.get(k) for k in env_vars}

    for k in env_vars:
        if k in os.environ:
            del os.environ[k]

    yield

    # Restore old values
    for k, v in old_values.items():
        if v is not None:
            os.environ[k] = v
        elif k in os.environ:
            del os.environ[k]
```

### 7.2 Plugin Tests

Create `sdk/tests/test_plugin.py`:

```python
"""
AgentTrace SDK - Plugin Tests
"""

import os
from pathlib import Path

import pytest

from agenttrace import AgentTracePlugin
from agenttrace.paths import is_tracing_disabled


class TestPluginInitialization:
    """Tests for plugin initialization."""

    def test_creates_with_defaults(self, temp_trace_dir: Path):
        """Plugin initializes with default configuration."""
        plugin = AgentTracePlugin(trace_dir=str(temp_trace_dir))

        assert plugin.config.enable_file is True
        assert plugin.config.enable_stdout is False
        assert plugin.config.sanitize_args is True
        assert len(plugin.run_id) == 8

        plugin.close()

    def test_custom_run_id(self, temp_trace_dir: Path):
        """Plugin accepts custom run ID."""
        plugin = AgentTracePlugin(
            trace_dir=str(temp_trace_dir),
            run_id="custom123",
        )

        assert plugin.run_id == "custom123"
        plugin.close()

    def test_env_run_id(self, temp_trace_dir: Path):
        """Plugin uses run ID from environment."""
        os.environ["AGENTTRACE_RUN_ID"] = "env-run-456"

        plugin = AgentTracePlugin(trace_dir=str(temp_trace_dir))

        assert plugin.run_id == "env-run-456"
        plugin.close()

    def test_disabled_via_env(self, temp_trace_dir: Path):
        """Plugin is disabled when AGENTTRACE_DISABLE is set."""
        os.environ["AGENTTRACE_DISABLE"] = "1"

        plugin = AgentTracePlugin(trace_dir=str(temp_trace_dir))

        assert plugin._disabled is True
        plugin.close()

    def test_live_mode_from_env(self, temp_trace_dir: Path):
        """Plugin enables stdout when AGENTTRACE_LIVE is set."""
        os.environ["AGENTTRACE_LIVE"] = "1"

        plugin = AgentTracePlugin(trace_dir=str(temp_trace_dir))

        assert plugin.config.enable_stdout is True
        plugin.close()


class TestPluginCallbacks:
    """Tests for ADK callback handling."""

    @pytest.mark.asyncio
    async def test_before_agent_callback(
        self,
        plugin: AgentTracePlugin,
        mock_callback_context,
    ):
        """before_agent_callback emits run.start event."""
        class MockContent:
            pass

        result = await plugin.before_agent_callback(
            mock_callback_context,
            MockContent(),
        )

        assert result is None  # Should not modify input
        assert plugin._run_start_time > 0

    @pytest.mark.asyncio
    async def test_after_agent_callback(
        self,
        plugin: AgentTracePlugin,
        mock_callback_context,
    ):
        """after_agent_callback emits run.end event."""
        class MockContent:
            pass

        # Simulate run start
        plugin._run_start_time = 1000.0

        result = await plugin.after_agent_callback(
            mock_callback_context,
            MockContent(),
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_model_callbacks(
        self,
        plugin: AgentTracePlugin,
        mock_callback_context,
        mock_llm_request,
        mock_llm_response,
    ):
        """Model callbacks emit llm.request and llm.response events."""
        # Before
        result = await plugin.before_model_callback(
            mock_callback_context,
            mock_llm_request,
        )
        assert result is None

        # After
        result = await plugin.after_model_callback(
            mock_callback_context,
            mock_llm_response,
        )
        assert result is None

        assert plugin._stats["llm_calls"] == 1
        assert plugin._stats["total_tokens"] == 150


class TestTraceFileCreation:
    """Tests for trace file output."""

    @pytest.mark.asyncio
    async def test_creates_trace_file(
        self,
        temp_trace_dir: Path,
        mock_callback_context,
    ):
        """Plugin creates JSONL trace file."""
        plugin = AgentTracePlugin(
            trace_dir=str(temp_trace_dir),
            run_id="testrun",
        )

        class MockContent:
            pass

        await plugin.before_agent_callback(mock_callback_context, MockContent())
        await plugin.after_agent_callback(mock_callback_context, MockContent())
        plugin.close()

        # Check file was created
        files = list(temp_trace_dir.glob("*.jsonl"))
        assert len(files) == 1
        assert "testrun" in files[0].name

        # Check file has content
        content = files[0].read_text()
        assert "run.start" in content
        assert "run.end" in content
```

### 7.3 Sanitizer Tests

Create `sdk/tests/test_sanitizer.py`:

```python
"""
AgentTrace SDK - Sanitizer Tests
"""

import pytest

from agenttrace.sanitizer import Sanitizer, sanitize


class TestSanitizer:
    """Tests for the Sanitizer class."""

    def test_redacts_password(self):
        """Redacts password fields."""
        s = Sanitizer()

        result = s.sanitize_dict({"password": "secret123"})

        assert result["password"] == "[REDACTED]"

    def test_redacts_api_key(self):
        """Redacts API key fields."""
        s = Sanitizer()

        result = s.sanitize_dict({"api_key": "sk-1234567890"})

        assert result["api_key"] == "[REDACTED]"

    def test_redacts_variations(self):
        """Redacts various sensitive key formats."""
        s = Sanitizer()

        data = {
            "apiKey": "key1",
            "api-key": "key2",
            "API_KEY": "key3",
            "auth_token": "token1",
            "bearer_token": "token2",
            "secret_value": "secret1",
        }

        result = s.sanitize_dict(data)

        for key in data:
            assert result[key] == "[REDACTED]"

    def test_preserves_normal_keys(self):
        """Does not redact normal keys."""
        s = Sanitizer()

        result = s.sanitize_dict({
            "query": "search term",
            "name": "John",
            "count": 42,
        })

        assert result["query"] == "search term"
        assert result["name"] == "John"
        assert result["count"] == 42

    def test_nested_dict(self):
        """Sanitizes nested dictionaries."""
        s = Sanitizer()

        result = s.sanitize_dict({
            "config": {
                "api_key": "secret",
                "endpoint": "https://api.example.com",
            }
        })

        assert result["config"]["api_key"] == "[REDACTED]"
        assert result["config"]["endpoint"] == "https://api.example.com"

    def test_list_values(self):
        """Sanitizes values in lists."""
        s = Sanitizer()

        result = s.sanitize_dict({
            "credentials": [
                {"password": "pass1"},
                {"password": "pass2"},
            ]
        })

        assert result["credentials"][0]["password"] == "[REDACTED]"
        assert result["credentials"][1]["password"] == "[REDACTED]"

    def test_custom_patterns(self):
        """Accepts custom patterns."""
        s = Sanitizer(patterns=["my_secret_field"])

        result = s.sanitize_dict({
            "my_secret_field": "hidden",
            "password": "visible",  # Default pattern not included
        })

        assert result["my_secret_field"] == "[REDACTED]"
        assert result["password"] == "visible"

    def test_additional_patterns(self):
        """Adds patterns to defaults."""
        s = Sanitizer(additional_patterns=["ssn", "credit_card"])

        result = s.sanitize_dict({
            "ssn": "123-45-6789",
            "password": "secret",
        })

        assert result["ssn"] == "[REDACTED]"
        assert result["password"] == "[REDACTED]"


class TestGlobalSanitizer:
    """Tests for the global sanitize function."""

    def test_sanitize_function(self):
        """Global sanitize function works."""
        result = sanitize({"api_key": "secret", "query": "test"})

        assert result["api_key"] == "[REDACTED]"
        assert result["query"] == "test"
```

### 7.4 Writer Tests

Create `sdk/tests/test_writers.py`:

```python
"""
AgentTrace SDK - Writer Tests
"""

import json
import tempfile
from pathlib import Path

import pytest

from agenttrace.writers.file import FileWriter
from agenttrace.writers.buffered import BufferedWriter


class TestFileWriter:
    """Tests for FileWriter."""

    def test_writes_jsonl(self, temp_trace_dir: Path):
        """Writes events as JSONL."""
        path = temp_trace_dir / "test.jsonl"
        writer = FileWriter(path)

        writer.write({"type": "test", "value": 1})
        writer.write({"type": "test", "value": 2})
        writer.flush()
        writer.close()

        lines = path.read_text().strip().split("\n")
        assert len(lines) == 2

        event1 = json.loads(lines[0])
        assert event1["type"] == "test"
        assert event1["value"] == 1

    def test_creates_parent_dirs(self, temp_trace_dir: Path):
        """Creates parent directories if needed."""
        path = temp_trace_dir / "nested" / "deep" / "test.jsonl"
        writer = FileWriter(path)

        writer.write({"test": True})
        writer.close()

        assert path.exists()

    def test_context_manager(self, temp_trace_dir: Path):
        """Works as context manager."""
        path = temp_trace_dir / "test.jsonl"

        with FileWriter(path) as writer:
            writer.write({"test": True})

        assert path.exists()


class TestBufferedWriter:
    """Tests for BufferedWriter."""

    def test_buffers_events(self, temp_trace_dir: Path):
        """Buffers events before flushing."""
        path = temp_trace_dir / "test.jsonl"
        inner = FileWriter(path)
        writer = BufferedWriter(inner, buffer_size=3)

        writer.write({"n": 1})
        writer.write({"n": 2})

        # File should be empty (not flushed yet)
        assert path.read_text() == ""

        writer.write({"n": 3})  # Triggers flush

        lines = path.read_text().strip().split("\n")
        assert len(lines) == 3

        writer.close()

    def test_flushes_on_close(self, temp_trace_dir: Path):
        """Flushes remaining events on close."""
        path = temp_trace_dir / "test.jsonl"
        inner = FileWriter(path)
        writer = BufferedWriter(inner, buffer_size=10)

        writer.write({"n": 1})
        writer.write({"n": 2})
        writer.close()

        lines = path.read_text().strip().split("\n")
        assert len(lines) == 2
```

---

## Phase 8: Packaging

### 8.1 Public API

Create `sdk/src/agenttrace/__init__.py`:

```python
"""
AgentTrace SDK

Tracing plugin for Google ADK agents.

Usage:
    from agenttrace import AgentTracePlugin
    from google.adk.runners import InMemoryRunner

    runner = InMemoryRunner(
        agent=agent,
        app_name="my_app",
        plugins=[AgentTracePlugin()]
    )

For live CLI tailing:
    import os

    plugin = AgentTracePlugin(
        enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1"
    )
"""

from .plugin import AgentTracePlugin
from .types import (
    EventType,
    PluginConfig,
    TraceEvent,
    RunStartEvent,
    RunEndEvent,
    LLMRequestEvent,
    LLMResponseEvent,
    ToolStartEvent,
    ToolEndEvent,
    ToolErrorEvent,
    StateChangeEvent,
    AgentTransferEvent,
)
from .sanitizer import Sanitizer, sanitize
from .paths import (
    get_trace_dir,
    get_config_path,
    is_tracing_disabled,
    is_live_mode,
)

__version__ = "0.1.0"

__all__ = [
    # Main plugin
    "AgentTracePlugin",

    # Configuration
    "PluginConfig",

    # Event types
    "EventType",
    "TraceEvent",
    "RunStartEvent",
    "RunEndEvent",
    "LLMRequestEvent",
    "LLMResponseEvent",
    "ToolStartEvent",
    "ToolEndEvent",
    "ToolErrorEvent",
    "StateChangeEvent",
    "AgentTransferEvent",

    # Utilities
    "Sanitizer",
    "sanitize",
    "get_trace_dir",
    "get_config_path",
    "is_tracing_disabled",
    "is_live_mode",
]
```

### 8.2 SDK README

Create `sdk/README.md`:

```markdown
# agenttrace

Tracing plugin for Google ADK agents. Capture LLM calls, tool executions, and agent behavior for debugging and observability.

## Installation

```bash
pip install agenttrace
```

## Quick Start

### 1. Add the plugin to your agent

```python
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from agenttrace import AgentTracePlugin

agent = Agent(
    name="my_agent",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant.",
    tools=[my_tool],
)

runner = InMemoryRunner(
    agent=agent,
    app_name="my_app",
    plugins=[AgentTracePlugin()],  # Add this line
)

async for event in runner.run_async(user_id, session_id, message):
    print(event.content)
```

### 2. View traces with the CLI

```bash
# Install the CLI
npm install -g agenttrace

# View the most recent trace
agenttrace show last

# Stream events live
agenttrace tail python my_agent.py
```

## Configuration

```python
plugin = AgentTracePlugin(
    trace_dir="~/.agenttrace/traces",  # Where to save traces
    enable_file=True,                   # Write to JSONL files
    enable_stdout=False,                # Stream to stdout (for CLI)
    run_id=None,                        # Custom run ID (auto-generated)
    buffer_size=10,                     # Events to buffer before flush
    sanitize_args=True,                 # Redact sensitive data
    max_response_preview=500,           # Max chars for response preview
)
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENTTRACE_DIR` | Override trace directory |
| `AGENTTRACE_LIVE` | Enable stdout streaming (set by CLI) |
| `AGENTTRACE_RUN_ID` | Override run ID (set by CLI) |
| `AGENTTRACE_DISABLE` | Disable all tracing |

### Live CLI Mode

For live streaming with `agenttrace tail`:

```python
import os
from agenttrace import AgentTracePlugin

plugin = AgentTracePlugin(
    enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
    run_id=os.environ.get("AGENTTRACE_RUN_ID"),
)
```

## Event Types

| Event | Description |
|-------|-------------|
| `run.start` | Agent invocation begins |
| `run.end` | Agent invocation completes |
| `llm.request` | LLM call initiated |
| `llm.response` | LLM response received |
| `tool.start` | Tool execution begins |
| `tool.end` | Tool execution completes |
| `tool.error` | Tool execution failed |
| `state.change` | Session state modified |
| `agent.transfer` | Multi-agent handoff |

## Trace File Format

Traces are stored as JSONL (newline-delimited JSON) in `~/.agenttrace/traces/`.

**File naming:** `{date}_{run_id}.jsonl`

```jsonl
{"type":"run.start","run_id":"abc123","timestamp":1705329121.000,"agent_name":"my_agent"}
{"type":"llm.request","run_id":"abc123","timestamp":1705329121.012,"model":"gemini-2.0-flash"}
{"type":"llm.response","run_id":"abc123","timestamp":1705329121.847,"total_tokens":1203}
{"type":"run.end","run_id":"abc123","timestamp":1705329123.415,"duration_ms":2415}
```

## Security

### Argument Sanitization

By default, sensitive data is redacted from tool arguments:

```python
# Input
{"api_key": "sk-1234", "query": "search term"}

# Stored
{"api_key": "[REDACTED]", "query": "search term"}
```

Patterns matched: `password`, `secret`, `token`, `api_key`, `auth`, `credential`

### File Permissions

Trace files are created with restricted permissions (`0o600`), readable only by the owner.

## Requirements

- Python 3.9+
- google-adk >= 0.1.0

## License

MIT
```

### 8.3 Example Files

Create `sdk/examples/basic_usage.py`:

```python
"""
AgentTrace SDK - Basic Usage Example

Shows how to add tracing to a simple ADK agent.
"""

import asyncio
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner

from agenttrace import AgentTracePlugin


# Define a simple tool
def search_web(query: str) -> str:
    """Search the web for information."""
    return f"Results for: {query}"


# Create the agent
agent = Agent(
    name="search_agent",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant that can search the web.",
    tools=[search_web],
)

# Create the runner with tracing
runner = InMemoryRunner(
    agent=agent,
    app_name="example_app",
    plugins=[AgentTracePlugin()],  # Traces saved to ~/.agenttrace/traces/
)


async def main():
    user_id = "user-123"
    session_id = "session-456"

    print("Running agent with tracing enabled...")
    print("Traces will be saved to ~/.agenttrace/traces/")
    print()

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message="Search for the latest AI news",
    ):
        if hasattr(event, "content") and event.content:
            print(f"Agent: {event.content}")

    print()
    print("Done! View the trace with: agenttrace show last")


if __name__ == "__main__":
    asyncio.run(main())
```

Create `sdk/examples/live_streaming.py`:

```python
"""
AgentTrace SDK - Live Streaming Example

Shows how to enable live streaming for the CLI tail command.
"""

import asyncio
import os
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner

from agenttrace import AgentTracePlugin


def calculate(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        result = eval(expression, {"__builtins__": {}})
        return str(result)
    except Exception as e:
        return f"Error: {e}"


agent = Agent(
    name="calculator_agent",
    model="gemini-2.0-flash",
    instruction="You are a calculator assistant.",
    tools=[calculate],
)

# Enable stdout streaming when AGENTTRACE_LIVE is set
# This is automatically set by: agenttrace tail python live_streaming.py
plugin = AgentTracePlugin(
    enable_file=True,
    enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
    run_id=os.environ.get("AGENTTRACE_RUN_ID"),
)

runner = InMemoryRunner(
    agent=agent,
    app_name="calculator_app",
    plugins=[plugin],
)


async def main():
    async for event in runner.run_async(
        user_id="user-1",
        session_id="session-1",
        new_message="What is 42 * 17 + 123?",
    ):
        if hasattr(event, "content") and event.content:
            print(f"Agent: {event.content}")


if __name__ == "__main__":
    asyncio.run(main())
```

---

## File Reference

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `sdk/pyproject.toml` | 80 | Package configuration |
| `sdk/src/agenttrace/__init__.py` | 60 | Public exports |
| `sdk/src/agenttrace/types.py` | 200 | Type definitions |
| `sdk/src/agenttrace/plugin.py` | 350 | Main plugin class |
| `sdk/src/agenttrace/emitter.py` | 120 | Event factory functions |
| `sdk/src/agenttrace/paths.py` | 80 | Path utilities |
| `sdk/src/agenttrace/config.py` | 70 | Configuration loader |
| `sdk/src/agenttrace/sanitizer.py` | 120 | Argument sanitization |
| `sdk/src/agenttrace/writers/base.py` | 30 | Abstract writer |
| `sdk/src/agenttrace/writers/file.py` | 60 | File writer |
| `sdk/src/agenttrace/writers/stdout.py` | 40 | Stdout writer |
| `sdk/src/agenttrace/writers/buffered.py` | 50 | Buffered wrapper |
| `sdk/tests/conftest.py` | 80 | Test fixtures |
| `sdk/tests/test_plugin.py` | 150 | Plugin tests |
| `sdk/tests/test_sanitizer.py` | 100 | Sanitizer tests |
| `sdk/tests/test_writers.py` | 80 | Writer tests |

**Total: ~1,670 lines of code**

---

## Implementation Checklist

### Phase 1: Project Setup
- [ ] Create `sdk/` directory structure
- [ ] Create `sdk/pyproject.toml`
- [ ] Create `sdk/setup.py`
- [ ] Create `sdk/README.md`

### Phase 2: Core Plugin
- [ ] Create `src/agenttrace/types.py`
- [ ] Create `src/agenttrace/paths.py`
- [ ] Create `src/agenttrace/plugin.py`

### Phase 3: Event Emitters
- [ ] Create `src/agenttrace/emitter.py`

### Phase 4: Output Writers
- [ ] Create `src/agenttrace/writers/base.py`
- [ ] Create `src/agenttrace/writers/file.py`
- [ ] Create `src/agenttrace/writers/stdout.py`
- [ ] Create `src/agenttrace/writers/buffered.py`
- [ ] Create `src/agenttrace/writers/__init__.py`

### Phase 5: Configuration
- [ ] Create `src/agenttrace/config.py`

### Phase 6: Sanitization
- [ ] Create `src/agenttrace/sanitizer.py`

### Phase 7: Testing
- [ ] Create `tests/conftest.py`
- [ ] Create `tests/test_plugin.py`
- [ ] Create `tests/test_sanitizer.py`
- [ ] Create `tests/test_writers.py`
- [ ] Run `pytest` and verify all pass

### Phase 8: Packaging
- [ ] Create `src/agenttrace/__init__.py`
- [ ] Create `examples/basic_usage.py`
- [ ] Create `examples/live_streaming.py`
- [ ] Test `pip install -e .`
- [ ] Test `pip install .`

---

## Quick Start Commands

```bash
# Create the SDK directory and initialize
cd /Volumes/CS_Stuff/watchtower-cli
mkdir -p sdk/src/agenttrace/writers
mkdir -p sdk/tests
mkdir -p sdk/examples

# Initialize package
cd sdk
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Development
pytest                    # Run tests
pytest --cov=agenttrace   # With coverage
mypy src                  # Type check
ruff check src            # Lint
black src tests           # Format

# Build
pip install build
python -m build

# Test locally
pip install -e .
python examples/basic_usage.py
```

---

*This document contains the complete implementation plan for the AgentTrace Python SDK. Each code block is ready to be copied into the corresponding file.*
