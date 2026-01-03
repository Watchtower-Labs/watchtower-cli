# AgentTrace CLI - Complete Implementation Guide

> **Project:** Terminal-based observability for Google ADK agents
> **Repository:** watchtower-cli
> **Target:** Full design document implementation
> **Stack:** TypeScript + Ink (React for CLI) + tsup + Vitest

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Project Setup](#phase-1-project-setup)
4. [Phase 2: Core Infrastructure](#phase-2-core-infrastructure)
5. [Phase 3: UI Components](#phase-3-ui-components)
6. [Phase 4: Custom Hooks](#phase-4-custom-hooks)
7. [Phase 5: Commands](#phase-5-commands)
8. [Phase 6: Configuration](#phase-6-configuration)
9. [Phase 7: Testing](#phase-7-testing)
10. [Phase 8: Packaging](#phase-8-packaging)
11. [File Reference](#file-reference)
12. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

### What We're Building

The `agenttrace` CLI is a terminal-based observability tool that allows developers to:

1. **View saved traces** (`agenttrace show`) - Navigate through past agent execution traces
2. **Stream live events** (`agenttrace tail`) - Watch agent activity in real-time
3. **List traces** (`agenttrace list`) - Browse recent trace files

### Why Ink?

Ink is React for the command line. It allows us to build complex, interactive terminal UIs using familiar React patterns:
- Component-based architecture
- Hooks for state management
- JSX for declarative UI

### Why tsup?

tsup is a zero-config bundler powered by esbuild:
- Fast builds (esbuild under the hood)
- TypeScript support out of the box
- Easy executable generation with shebang
- ESM/CJS dual output

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLI ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         ENTRY POINT                                 │ │
│  │                                                                     │ │
│  │   src/index.tsx                                                     │ │
│  │   └─ yargs command routing                                          │ │
│  │      ├─ show [trace]  →  ShowCommand                               │ │
│  │      ├─ tail <script> →  TailCommand                               │ │
│  │      └─ list          →  ListCommand                               │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                          COMMANDS                                   │ │
│  │                                                                     │ │
│  │   ShowCommand          TailCommand           ListCommand           │ │
│  │   ├─ useTraceFile     ├─ useProcessStream   ├─ listTraces()       │ │
│  │   ├─ useKeyboard      ├─ useKeyboard        └─ useKeyboard        │ │
│  │   └─ Components       └─ Components                                │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         COMPONENTS                                  │ │
│  │                                                                     │ │
│  │   Header     Summary     EventList     EventDetail     StatusBar   │ │
│  │     │           │            │              │              │       │ │
│  │     └───────────┴────────────┴──────────────┴──────────────┘       │ │
│  │                              │                                      │ │
│  │                              ▼                                      │ │
│  │                         Theme (colors, icons)                       │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                       CORE INFRASTRUCTURE                           │ │
│  │                                                                     │ │
│  │   lib/types.ts      lib/parser.ts     lib/paths.ts    lib/process.ts│
│  │   └─ TypeScript     └─ NDJSON         └─ File         └─ Python     │ │
│  │      interfaces        parsing           resolution      spawning   │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Project Setup

### 1.1 Directory Structure

Create the following structure in the watchtower-cli repository:

```
watchtower-cli/
├── cli/                              # NEW: CLI package
│   ├── package.json                  # CLI package configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── tsup.config.ts                # Build configuration
│   ├── vitest.config.ts              # Test configuration
│   ├── .eslintrc.js                  # Linting configuration
│   ├── src/
│   │   ├── index.tsx                 # Entry point with yargs routing
│   │   ├── commands/
│   │   │   ├── show.tsx              # agenttrace show [trace]
│   │   │   ├── tail.tsx              # agenttrace tail <script>
│   │   │   └── list.tsx              # agenttrace list
│   │   ├── components/
│   │   │   ├── Header.tsx            # Title bar component
│   │   │   ├── StatusBar.tsx         # Bottom help bar
│   │   │   ├── Summary.tsx           # Stats display
│   │   │   ├── EventList.tsx         # Timeline component
│   │   │   ├── EventDetail.tsx       # Expanded event view
│   │   │   └── ErrorDisplay.tsx      # Error messages
│   │   ├── hooks/
│   │   │   ├── useTraceFile.ts       # Load trace from file
│   │   │   ├── useProcessStream.ts   # Spawn & stream from Python
│   │   │   └── useKeyboard.ts        # Keyboard navigation
│   │   ├── lib/
│   │   │   ├── types.ts              # TypeScript interfaces
│   │   │   ├── parser.ts             # NDJSON/JSON-RPC parser
│   │   │   ├── paths.ts              # Trace directory utilities
│   │   │   ├── process.ts            # Python process management
│   │   │   └── config.ts             # Configuration loader
│   │   └── styles/
│   │       └── theme.ts              # Colors and icons
│   ├── __tests__/
│   │   ├── lib/
│   │   │   ├── parser.test.ts
│   │   │   └── paths.test.ts
│   │   └── components/
│   │       ├── Header.test.tsx
│   │       └── EventList.test.tsx
│   └── bin/
│       └── agenttrace.js             # Executable wrapper (generated)
│
├── src/                              # EXISTING: Next.js landing page
│   ├── app/
│   └── components/
│
├── package.json                      # Root package.json (existing)
├── pnpm-workspace.yaml               # NEW: Workspace configuration
└── README.md
```

**Commands to create structure:**

```bash
cd /Volumes/CS_Stuff/watchtower-cli
mkdir -p cli/src/{commands,components,hooks,lib,styles}
mkdir -p cli/__tests__/{lib,components}
```

### 1.2 Create pnpm Workspace

Create `pnpm-workspace.yaml` in the root:

```yaml
packages:
  - 'cli'
```

### 1.3 CLI package.json

Create `cli/package.json`:

```json
{
  "name": "agenttrace",
  "version": "0.1.0",
  "description": "Terminal-based observability for Google ADK agents",
  "type": "module",
  "bin": {
    "agenttrace": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "clean": "rm -rf dist",
    "prepublishOnly": "pnpm run build && pnpm run test:run"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "ink": "^4.4.1",
    "ink-spinner": "^5.0.0",
    "react": "^18.2.0",
    "uuid": "^9.0.0",
    "yaml": "^2.3.4",
    "yargs": "^17.7.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "@types/yargs": "^17.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.57.0",
    "ink-testing-library": "^3.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "cli",
    "terminal",
    "observability",
    "tracing",
    "adk",
    "google-adk",
    "ai-agents",
    "debugging"
  ],
  "author": "Watchtower Labs",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/watchtower-cli"
  },
  "homepage": "https://watchtower.dev",
  "bugs": {
    "url": "https://github.com/your-org/watchtower-cli/issues"
  }
}
```

### 1.4 TypeScript Configuration

Create `cli/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

### 1.5 tsup Build Configuration

Create `cli/tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry points
  entry: ['src/index.tsx'],

  // Output format (ESM only for modern Node.js)
  format: ['esm'],

  // Target Node.js 18+
  target: 'node18',

  // Generate TypeScript declarations
  dts: true,

  // Clean dist folder before build
  clean: true,

  // Generate sourcemaps for debugging
  sourcemap: true,

  // Don't split chunks (single file output)
  splitting: false,

  // Minify for production
  minify: false,

  // Handle JSX with React 17+ automatic runtime
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },

  // Add shebang for CLI executable
  banner: {
    js: '#!/usr/bin/env node',
  },

  // External packages (don't bundle)
  external: [
    // Node.js built-ins are automatically external
  ],

  // Handle __dirname/__filename in ESM
  shims: true,
});
```

### 1.6 Vitest Configuration

Create `cli/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{ts,tsx}'],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
```

### 1.7 ESLint Configuration

Create `cli/.eslintrc.js`:

```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off',
  },
  ignorePatterns: ['dist', 'node_modules', '*.js'],
};
```

---

## Phase 2: Core Infrastructure

### 2.1 Type Definitions

Create `cli/src/lib/types.ts`:

```typescript
/**
 * AgentTrace CLI - Type Definitions
 *
 * This file contains all TypeScript interfaces and types used throughout
 * the CLI application. These match the event format from the Python SDK.
 */

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * All possible event types emitted by the AgentTrace Python SDK
 */
export type EventType =
  | 'run.start'      // Agent invocation begins
  | 'run.end'        // Agent invocation completes
  | 'llm.request'    // LLM call initiated
  | 'llm.response'   // LLM response received
  | 'tool.start'     // Tool execution begins
  | 'tool.end'       // Tool execution completes
  | 'tool.error'     // Tool execution failed
  | 'state.change'   // Session state modified
  | 'agent.transfer'; // Multi-agent handoff

/**
 * Base interface for all trace events
 */
export interface TraceEvent {
  type: EventType;
  run_id: string;
  timestamp: number; // Unix timestamp in seconds
  [key: string]: unknown; // Allow additional fields
}

// ============================================================================
// SPECIFIC EVENT INTERFACES
// ============================================================================

export interface RunStartEvent extends TraceEvent {
  type: 'run.start';
  invocation_id: string;
  agent_name: string;
}

export interface RunEndEvent extends TraceEvent {
  type: 'run.end';
  duration_ms: number;
  summary?: {
    llm_calls: number;
    tool_calls: number;
    total_tokens: number;
    errors: number;
  };
}

export interface LLMRequestEvent extends TraceEvent {
  type: 'llm.request';
  request_id: string;
  model: string;
  message_count: number;
  tools_available: string[];
}

export interface LLMResponseEvent extends TraceEvent {
  type: 'llm.response';
  request_id: string;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  has_tool_calls: boolean;
  finish_reason: string;
}

export interface ToolStartEvent extends TraceEvent {
  type: 'tool.start';
  tool_call_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  agent_name: string;
}

export interface ToolEndEvent extends TraceEvent {
  type: 'tool.end';
  tool_call_id: string;
  tool_name: string;
  duration_ms: number;
  response_preview: string;
  success: boolean;
}

export interface ToolErrorEvent extends TraceEvent {
  type: 'tool.error';
  tool_call_id: string;
  tool_name: string;
  error_type: string;
  error_message: string;
}

export interface StateChangeEvent extends TraceEvent {
  type: 'state.change';
  author: string;
  state_delta: Record<string, unknown>;
}

export interface AgentTransferEvent extends TraceEvent {
  type: 'agent.transfer';
  from_agent: string;
  to_agent: string;
  reason: string;
}

// ============================================================================
// AGGREGATED TYPES
// ============================================================================

/**
 * Summary statistics for a trace
 */
export interface TraceSummary {
  runId: string;
  startTime: number;
  duration: number; // milliseconds
  llmCalls: number;
  toolCalls: number;
  totalTokens: number;
  errors: number;
  agentName?: string;
}

/**
 * Information about a trace file
 */
export interface TraceInfo {
  runId: string;
  date: string;
  path: string;
  size: number;
  mtime: Date;
}

/**
 * Real-time statistics during live tailing
 */
export interface LiveStats {
  startTime: number;
  duration: number;
  tokens: number;
  toolCalls: number;
  llmCalls: number;
  errors: number;
}

// ============================================================================
// JSON-RPC FORMAT (for live streaming)
// ============================================================================

/**
 * JSON-RPC 2.0 notification format used for live streaming
 */
export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params: TraceEvent;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * CLI configuration options
 */
export interface CliConfig {
  theme: 'dark' | 'light' | 'minimal';
  maxEvents: number;
  timestampFormat: 'relative' | 'absolute' | 'unix';
  defaultPython: string;
}

/**
 * Default CLI configuration
 */
export const DEFAULT_CONFIG: CliConfig = {
  theme: 'dark',
  maxEvents: 1000,
  timestampFormat: 'relative',
  defaultPython: 'python3',
};

// ============================================================================
// PROCESS MANAGEMENT
// ============================================================================

/**
 * Status of a spawned Python process
 */
export type ProcessStatus = 'starting' | 'running' | 'stopped' | 'error';

/**
 * Options for process manager
 */
export interface ProcessOptions {
  script: string[];
  runId?: string;
  pythonPath?: string;
}
```

### 2.2 NDJSON/JSON-RPC Parser

Create `cli/src/lib/parser.ts`:

```typescript
/**
 * AgentTrace CLI - NDJSON/JSON-RPC Parser
 *
 * Parses trace events from both:
 * 1. JSONL files (raw events)
 * 2. Live stdout streams (JSON-RPC wrapped events)
 */

import { TraceEvent, JsonRpcNotification, EventType } from './types.js';

/**
 * Valid event types for validation
 */
const VALID_EVENT_TYPES: Set<string> = new Set([
  'run.start',
  'run.end',
  'llm.request',
  'llm.response',
  'tool.start',
  'tool.end',
  'tool.error',
  'state.change',
  'agent.transfer',
]);

/**
 * Parse a single line of NDJSON
 *
 * Handles two formats:
 * 1. Raw JSONL: {"type":"run.start","run_id":"abc123",...}
 * 2. JSON-RPC: {"jsonrpc":"2.0","method":"run.start","params":{...}}
 *
 * @param line - Single line of text to parse
 * @returns Parsed TraceEvent or null if invalid
 */
export function parseLine(line: string): TraceEvent | null {
  // Skip empty lines
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);

    // Check if it's JSON-RPC 2.0 wrapped format (from live streaming)
    if (isJsonRpcNotification(parsed)) {
      const notification = parsed as JsonRpcNotification;
      return normalizeEvent({
        type: notification.method as EventType,
        ...notification.params,
      });
    }

    // Raw event format (from trace files)
    if (isValidEvent(parsed)) {
      return normalizeEvent(parsed as TraceEvent);
    }

    return null;
  } catch {
    // Skip malformed JSON - common when mixed with regular stdout
    return null;
  }
}

/**
 * Check if object is a JSON-RPC 2.0 notification
 */
function isJsonRpcNotification(obj: unknown): obj is JsonRpcNotification {
  if (typeof obj !== 'object' || obj === null) return false;
  const rpc = obj as Record<string, unknown>;
  return (
    rpc.jsonrpc === '2.0' &&
    typeof rpc.method === 'string' &&
    typeof rpc.params === 'object' &&
    rpc.params !== null
  );
}

/**
 * Check if object is a valid trace event
 */
function isValidEvent(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const event = obj as Record<string, unknown>;
  return (
    typeof event.type === 'string' &&
    VALID_EVENT_TYPES.has(event.type) &&
    typeof event.run_id === 'string' &&
    typeof event.timestamp === 'number'
  );
}

/**
 * Normalize event fields (ensure consistent types)
 */
function normalizeEvent(event: TraceEvent): TraceEvent {
  return {
    ...event,
    // Ensure timestamp is a number
    timestamp: typeof event.timestamp === 'string'
      ? parseFloat(event.timestamp)
      : event.timestamp,
  };
}

/**
 * Parse multiple lines of NDJSON
 *
 * @param text - Multi-line NDJSON text
 * @returns Array of parsed events (skips invalid lines)
 */
export function parseLines(text: string): TraceEvent[] {
  return text
    .split('\n')
    .map(parseLine)
    .filter((event): event is TraceEvent => event !== null);
}

/**
 * Create an async generator for parsing NDJSON streams
 *
 * @param lines - Async iterable of lines (e.g., from readline)
 * @yields Parsed TraceEvent objects
 */
export async function* parseStream(
  lines: AsyncIterable<string>
): AsyncGenerator<TraceEvent> {
  for await (const line of lines) {
    const event = parseLine(line);
    if (event) {
      yield event;
    }
  }
}

/**
 * Aggregate summary statistics from events
 *
 * @param events - Array of trace events
 * @returns Summary statistics
 */
export function aggregateSummary(events: TraceEvent[]): {
  runId: string;
  startTime: number;
  duration: number;
  llmCalls: number;
  toolCalls: number;
  totalTokens: number;
  errors: number;
  agentName?: string;
} {
  let runId = '';
  let startTime = 0;
  let endTime = 0;
  let llmCalls = 0;
  let toolCalls = 0;
  let totalTokens = 0;
  let errors = 0;
  let agentName: string | undefined;

  for (const event of events) {
    switch (event.type) {
      case 'run.start':
        runId = event.run_id;
        startTime = event.timestamp;
        agentName = (event as { agent_name?: string }).agent_name;
        break;
      case 'run.end':
        endTime = event.timestamp;
        break;
      case 'llm.response':
        llmCalls++;
        totalTokens += ((event as { total_tokens?: number }).total_tokens) || 0;
        break;
      case 'tool.start':
        toolCalls++;
        break;
      case 'tool.error':
        errors++;
        break;
    }
  }

  return {
    runId,
    startTime,
    duration: (endTime - startTime) * 1000, // Convert to milliseconds
    llmCalls,
    toolCalls,
    totalTokens,
    errors,
    agentName,
  };
}
```

### 2.3 Path Utilities

Create `cli/src/lib/paths.ts`:

```typescript
/**
 * AgentTrace CLI - Path Utilities
 *
 * Handles trace file discovery and path resolution.
 * Traces are stored in ~/.agenttrace/traces/ as JSONL files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TraceInfo } from './types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Base directory for all agenttrace data */
export const AGENTTRACE_DIR = path.join(os.homedir(), '.agenttrace');

/** Directory containing trace files */
export const TRACE_DIR = path.join(AGENTTRACE_DIR, 'traces');

/** CLI configuration file path */
export const CLI_CONFIG_PATH = path.join(AGENTTRACE_DIR, 'cli.yaml');

/** SDK configuration file path */
export const SDK_CONFIG_PATH = path.join(AGENTTRACE_DIR, 'config.yaml');

// ============================================================================
// DIRECTORY MANAGEMENT
// ============================================================================

/**
 * Ensure the trace directory exists with proper permissions
 */
export function ensureTraceDir(): void {
  if (!fs.existsSync(TRACE_DIR)) {
    fs.mkdirSync(TRACE_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Ensure the base agenttrace directory exists
 */
export function ensureBaseDir(): void {
  if (!fs.existsSync(AGENTTRACE_DIR)) {
    fs.mkdirSync(AGENTTRACE_DIR, { recursive: true, mode: 0o700 });
  }
}

// ============================================================================
// PATH RESOLUTION
// ============================================================================

/**
 * Resolve a trace reference to an absolute file path
 *
 * Handles three formats:
 * 1. "last" - Most recent trace file
 * 2. Run ID (e.g., "abc123") - Find by run ID
 * 3. File path (e.g., "./trace.jsonl") - Direct path
 *
 * @param traceRef - Trace reference string
 * @returns Absolute path to trace file
 * @throws Error if trace not found
 */
export async function resolveTracePath(traceRef: string): Promise<string> {
  // Handle direct file paths
  if (traceRef.endsWith('.jsonl') || path.isAbsolute(traceRef)) {
    const resolved = path.resolve(traceRef);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Trace file not found: ${resolved}`);
    }
    return resolved;
  }

  // Handle "last" keyword
  if (traceRef.toLowerCase() === 'last') {
    return getLatestTrace();
  }

  // Handle run ID lookup
  return findTraceByRunId(traceRef);
}

/**
 * Get the most recent trace file
 *
 * @returns Absolute path to most recent trace
 * @throws Error if no traces found
 */
export function getLatestTrace(): string {
  ensureTraceDir();

  const files = getTraceFiles();

  if (files.length === 0) {
    throw new Error(
      'No traces found.\n\n' +
      'To create traces, add AgentTracePlugin to your ADK agent:\n\n' +
      '  from agenttrace import AgentTracePlugin\n' +
      '  runner = InMemoryRunner(..., plugins=[AgentTracePlugin()])\n'
    );
  }

  // Sort by modification time, newest first
  const sorted = files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return sorted[0].path;
}

/**
 * Find a trace file by run ID (supports partial matching)
 *
 * @param runId - Full or partial run ID
 * @returns Absolute path to matching trace
 * @throws Error if no match found
 */
export function findTraceByRunId(runId: string): string {
  ensureTraceDir();

  const files = fs.readdirSync(TRACE_DIR).filter(f => f.endsWith('.jsonl'));

  // Try exact match first (date_runid.jsonl)
  const exactMatch = files.find(f => f.includes(`_${runId}.jsonl`));
  if (exactMatch) {
    return path.join(TRACE_DIR, exactMatch);
  }

  // Try partial match
  const partialMatch = files.find(f => f.toLowerCase().includes(runId.toLowerCase()));
  if (partialMatch) {
    return path.join(TRACE_DIR, partialMatch);
  }

  // Try matching just the run ID part
  const runIdMatch = files.find(f => {
    const [, fileRunId] = f.replace('.jsonl', '').split('_');
    return fileRunId && fileRunId.startsWith(runId);
  });
  if (runIdMatch) {
    return path.join(TRACE_DIR, runIdMatch);
  }

  throw new Error(
    `No trace found matching: ${runId}\n\n` +
    'Use "agenttrace list" to see available traces.'
  );
}

// ============================================================================
// TRACE LISTING
// ============================================================================

/**
 * Get all trace files with metadata
 */
function getTraceFiles(): TraceInfo[] {
  ensureTraceDir();

  return fs.readdirSync(TRACE_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => {
      const filePath = path.join(TRACE_DIR, f);
      const stat = fs.statSync(filePath);
      const [date, runIdWithExt] = f.split('_');
      const runId = runIdWithExt?.replace('.jsonl', '') || 'unknown';

      return {
        runId,
        date: date || 'unknown',
        path: filePath,
        size: stat.size,
        mtime: stat.mtime,
      };
    });
}

/**
 * List recent traces with metadata
 *
 * @param limit - Maximum number of traces to return (default: 10)
 * @param since - Only return traces since this date (optional)
 * @returns Array of trace info, sorted by modification time (newest first)
 */
export function listTraces(limit: number = 10, since?: string): TraceInfo[] {
  const sinceDate = since ? new Date(since) : new Date(0);

  return getTraceFiles()
    .filter(t => t.mtime >= sinceDate)
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    .slice(0, limit);
}

/**
 * Check if any traces exist
 */
export function hasTraces(): boolean {
  try {
    ensureTraceDir();
    const files = fs.readdirSync(TRACE_DIR).filter(f => f.endsWith('.jsonl'));
    return files.length > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
```

### 2.4 Process Manager

Create `cli/src/lib/process.ts`:

```typescript
/**
 * AgentTrace CLI - Process Manager
 *
 * Handles spawning and managing Python processes for live tailing.
 * Sets up the environment for the Python SDK to emit events to stdout.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import { TraceEvent, ProcessStatus } from './types.js';
import { parseLine } from './parser.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessManagerEvents {
  event: (event: TraceEvent) => void;
  error: (error: Error) => void;
  exit: (code: number | null) => void;
  statusChange: (status: ProcessStatus) => void;
}

export interface ProcessManagerOptions {
  /** Command and arguments to run (e.g., ['python', 'my_agent.py']) */
  script: string[];
  /** Optional custom run ID (auto-generated if not provided) */
  runId?: string;
  /** Path to Python executable (default: python3) */
  pythonPath?: string;
}

// ============================================================================
// PROCESS MANAGER CLASS
// ============================================================================

/**
 * Manages a Python subprocess for live event streaming
 *
 * Usage:
 * ```typescript
 * const manager = new ProcessManager({
 *   script: ['python', 'my_agent.py'],
 * });
 *
 * manager.on('event', (event) => console.log(event));
 * manager.on('error', (err) => console.error(err));
 * manager.on('exit', (code) => console.log('Exited with:', code));
 *
 * manager.start();
 * // Later: manager.stop();
 * ```
 */
export class ProcessManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private _runId: string;
  private _status: ProcessStatus = 'starting';
  private options: ProcessManagerOptions;
  private readline: readline.Interface | null = null;

  constructor(options: ProcessManagerOptions) {
    super();
    this.options = options;
    this._runId = options.runId || uuidv4().slice(0, 8);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get the run ID for this process
   */
  get runId(): string {
    return this._runId;
  }

  /**
   * Get the current process status
   */
  get status(): ProcessStatus {
    return this._status;
  }

  /**
   * Start the Python process
   */
  start(): void {
    const [command, ...args] = this.options.script;

    this.setStatus('starting');

    // Spawn the Python process with special environment variables
    this.process = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'inherit'],
      env: {
        ...process.env,
        // Force unbuffered Python output
        PYTHONUNBUFFERED: '1',
        // Tell SDK to emit events to stdout
        AGENTTRACE_LIVE: '1',
        // Pass our run ID to the SDK
        AGENTTRACE_RUN_ID: this._runId,
      },
    });

    // Set up stdout parsing
    if (this.process.stdout) {
      this.readline = readline.createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity,
      });

      this.readline.on('line', (line) => {
        this.handleLine(line);
      });
    }

    // Handle process spawn
    this.process.on('spawn', () => {
      this.setStatus('running');
    });

    // Handle process errors
    this.process.on('error', (err) => {
      this.setStatus('error');
      this.emit('error', err);
    });

    // Handle process exit
    this.process.on('exit', (code) => {
      this.setStatus(code === 0 ? 'stopped' : 'error');
      this.cleanup();
      this.emit('exit', code);
    });
  }

  /**
   * Stop the Python process gracefully
   */
  stop(): void {
    if (this.process && !this.process.killed) {
      // Try graceful shutdown first
      this.process.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 3000);
    }

    this.cleanup();
  }

  /**
   * Check if process is currently running
   */
  isRunning(): boolean {
    return this._status === 'running';
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private handleLine(line: string): void {
    const event = parseLine(line);
    if (event) {
      this.emit('event', event);
    }
    // Non-JSON lines are ignored (regular print statements)
  }

  private setStatus(status: ProcessStatus): void {
    this._status = status;
    this.emit('statusChange', status);
  }

  private cleanup(): void {
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }
    this.process = null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    await execAsync(`${checkCmd} ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find Python executable
 */
export async function findPython(): Promise<string | null> {
  const candidates = ['python3', 'python'];

  for (const cmd of candidates) {
    if (await commandExists(cmd)) {
      return cmd;
    }
  }

  return null;
}
```

### 2.5 Configuration Loader

Create `cli/src/lib/config.ts`:

```typescript
import * as fs from 'fs';
import { parse as parseYaml } from 'yaml';
import { CliConfig, DEFAULT_CONFIG } from './types.js';
import { CLI_CONFIG_PATH, ensureBaseDir } from './paths.js';

/**
 * Load CLI configuration from ~/.agenttrace/cli.yaml
 */
export function loadConfig(): CliConfig {
  try {
    if (fs.existsSync(CLI_CONFIG_PATH)) {
      const content = fs.readFileSync(CLI_CONFIG_PATH, 'utf-8');
      const parsed = parseYaml(content);

      // Merge with defaults
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
      };
    }
  } catch (error) {
    console.warn(`Warning: Could not load config from ${CLI_CONFIG_PATH}`);
    console.warn(error instanceof Error ? error.message : 'Unknown error');
  }

  return DEFAULT_CONFIG;
}

/**
 * Save CLI configuration to ~/.agenttrace/cli.yaml
 */
export function saveConfig(config: Partial<CliConfig>): void {
  ensureBaseDir();

  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...config };

  const yaml = Object.entries(newConfig)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  fs.writeFileSync(CLI_CONFIG_PATH, yaml + '\n', { mode: 0o600 });
}

/**
 * Get the configuration file path
 */
export function getConfigPath(): string {
  return CLI_CONFIG_PATH;
}
```

---

## Phase 3: UI Components

### 3.1 Theme Configuration

Create `cli/src/styles/theme.ts`:

```typescript
/**
 * AgentTrace CLI - Theme Configuration
 *
 * Defines colors, icons, and visual styles for the terminal UI.
 */

// ============================================================================
// EVENT STYLING
// ============================================================================

/**
 * Icon and color mapping for each event type
 */
export const eventStyles: Record<string, { icon: string; color: string }> = {
  'run.start': { icon: '▶', color: 'green' },
  'run.end': { icon: '■', color: 'blue' },
  'llm.request': { icon: '→', color: 'cyan' },
  'llm.response': { icon: '←', color: 'cyan' },
  'tool.start': { icon: '⚙', color: 'yellow' },
  'tool.end': { icon: '✓', color: 'green' },
  'tool.error': { icon: '✗', color: 'red' },
  'state.change': { icon: '◊', color: 'magenta' },
  'agent.transfer': { icon: '⇄', color: 'blue' },
};

/**
 * Get icon for event type (with fallback)
 */
export function getEventIcon(type: string): string {
  return eventStyles[type]?.icon || '•';
}

/**
 * Get color for event type (with fallback)
 */
export function getEventColor(type: string): string {
  return eventStyles[type]?.color || 'white';
}

// ============================================================================
// COLOR SCHEMES
// ============================================================================

export interface ColorScheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  muted: string;
  highlight: string;
  background: string;
  border: string;
}

export const darkTheme: ColorScheme = {
  primary: 'cyan',
  secondary: 'gray',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
  muted: 'gray',
  highlight: 'white',
  background: 'black',
  border: 'gray',
};

export const lightTheme: ColorScheme = {
  primary: 'blue',
  secondary: 'gray',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'cyan',
  muted: 'gray',
  highlight: 'black',
  background: 'white',
  border: 'gray',
};

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number, format: 'relative' | 'absolute' | 'unix' = 'absolute'): string {
  const date = new Date(timestamp * 1000);

  switch (format) {
    case 'unix':
      return timestamp.toFixed(3);
    case 'relative':
      const now = Date.now();
      const diff = now - date.getTime();
      if (diff < 1000) return 'now';
      if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      return `${Math.floor(diff / 3600000)}h ago`;
    case 'absolute':
    default:
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      });
  }
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Format token count
 */
export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}
```

### 3.2 Header Component

Create `cli/src/components/Header.tsx`:

```typescript
import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  runId: string;
  timestamp?: number;
  live?: boolean;
  status?: 'running' | 'stopped' | 'error' | 'starting';
  paused?: boolean;
  agentName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  runId,
  timestamp,
  live = false,
  status = 'stopped',
  paused = false,
  agentName,
}) => {
  const dateStr = timestamp
    ? new Date(timestamp * 1000).toLocaleString()
    : '';

  return (
    <Box
      borderStyle="single"
      paddingX={1}
      justifyContent="space-between"
      flexDirection="row"
    >
      <Box>
        <Text bold color="cyan">agenttrace</Text>
        <Text> • Run: </Text>
        <Text bold color="white">{runId}</Text>
        {agentName && (
          <>
            <Text> • </Text>
            <Text color="yellow">{agentName}</Text>
          </>
        )}
        {dateStr && <Text dimColor> • {dateStr}</Text>}
      </Box>

      {live && (
        <Box>
          {paused ? (
            <Text color="yellow">⏸ PAUSED</Text>
          ) : status === 'running' ? (
            <Text color="red" bold>● LIVE</Text>
          ) : status === 'starting' ? (
            <Text color="yellow">◌ STARTING</Text>
          ) : status === 'error' ? (
            <Text color="red">✗ ERROR</Text>
          ) : (
            <Text color="gray">● STOPPED</Text>
          )}
        </Box>
      )}
    </Box>
  );
};
```

### 3.3 StatusBar Component

Create `cli/src/components/StatusBar.tsx`:

```typescript
import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  keys: string[];
  message?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ keys, message }) => {
  return (
    <Box
      borderStyle="single"
      paddingX={1}
      justifyContent="space-between"
    >
      <Box gap={2}>
        {keys.map((key, i) => (
          <Text key={i} dimColor>
            [{key}]
          </Text>
        ))}
      </Box>
      {message && (
        <Text color="yellow">{message}</Text>
      )}
    </Box>
  );
};
```

### 3.4 Summary Component

Create `cli/src/components/Summary.tsx`:

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import { formatDuration, formatTokens } from '../styles/theme.js';

interface SummaryProps {
  duration: number;
  llmCalls: number;
  toolCalls: number;
  totalTokens: number;
  errors?: number;
  compact?: boolean;
}

export const Summary: React.FC<SummaryProps> = ({
  duration,
  llmCalls,
  toolCalls,
  totalTokens,
  errors = 0,
  compact = false,
}) => {
  if (compact) {
    return (
      <Box gap={2} paddingX={1}>
        <Text>
          Duration: <Text bold>{formatDuration(duration)}</Text>
        </Text>
        <Text>
          Tokens: <Text bold>{formatTokens(totalTokens)}</Text>
        </Text>
        <Text>
          Tools: <Text bold>{toolCalls}</Text>
        </Text>
        {errors > 0 && (
          <Text color="red">
            Errors: <Text bold>{errors}</Text>
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box
      borderStyle="single"
      paddingX={1}
      flexDirection="column"
    >
      <Text bold marginBottom={1}>Summary</Text>
      <Box gap={3}>
        <Box flexDirection="column">
          <Text dimColor>Duration</Text>
          <Text bold>{formatDuration(duration)}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>LLM Calls</Text>
          <Text bold>{llmCalls}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Tool Calls</Text>
          <Text bold>{toolCalls}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Tokens</Text>
          <Text bold>{formatTokens(totalTokens)}</Text>
        </Box>
        {errors > 0 && (
          <Box flexDirection="column">
            <Text dimColor>Errors</Text>
            <Text bold color="red">{errors}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
```

### 3.5 EventList Component

Create `cli/src/components/EventList.tsx`:

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import { TraceEvent } from '../lib/types.js';
import { getEventIcon, getEventColor, formatTimestamp, formatDuration } from '../styles/theme.js';

interface EventListProps {
  events: TraceEvent[];
  selectedIndex: number;
  maxVisible?: number;
  showLineNumbers?: boolean;
}

export const EventList: React.FC<EventListProps> = ({
  events,
  selectedIndex,
  maxVisible = 15,
  showLineNumbers = false,
}) => {
  // Calculate visible window (centered on selection)
  const halfWindow = Math.floor(maxVisible / 2);
  let start = Math.max(0, selectedIndex - halfWindow);
  const end = Math.min(events.length, start + maxVisible);

  // Adjust start if we're near the end
  if (end - start < maxVisible) {
    start = Math.max(0, end - maxVisible);
  }

  const visibleEvents = events.slice(start, end);

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold marginBottom={1}>Timeline</Text>

      {visibleEvents.length === 0 ? (
        <Text dimColor>No events</Text>
      ) : (
        <Box flexDirection="column">
          {visibleEvents.map((event, i) => {
            const actualIndex = start + i;
            const isSelected = actualIndex === selectedIndex;

            return (
              <EventLine
                key={actualIndex}
                event={event}
                selected={isSelected}
                lineNumber={showLineNumbers ? actualIndex + 1 : undefined}
              />
            );
          })}
        </Box>
      )}

      {events.length > maxVisible && (
        <Text dimColor marginTop={1}>
          Showing {start + 1}-{end} of {events.length} events
        </Text>
      )}
    </Box>
  );
};

// ============================================================================
// EVENT LINE COMPONENT
// ============================================================================

interface EventLineProps {
  event: TraceEvent;
  selected: boolean;
  lineNumber?: number;
}

const EventLine: React.FC<EventLineProps> = ({ event, selected, lineNumber }) => {
  const icon = getEventIcon(event.type);
  const color = getEventColor(event.type);
  const time = formatTimestamp(event.timestamp);
  const detail = formatEventDetail(event);

  return (
    <Box>
      {/* Selection indicator */}
      <Text color={selected ? 'cyan' : undefined}>
        {selected ? '> ' : '  '}
      </Text>

      {/* Line number */}
      {lineNumber !== undefined && (
        <Text dimColor>{String(lineNumber).padStart(3)} </Text>
      )}

      {/* Timestamp */}
      <Text dimColor>{time}</Text>
      <Text>  </Text>

      {/* Icon */}
      <Text color={color}>{icon}</Text>
      <Text> </Text>

      {/* Event type */}
      <Text bold={selected}>{event.type.padEnd(15)}</Text>
      <Text> </Text>

      {/* Event details */}
      <Text dimColor wrap="truncate">{detail}</Text>
    </Box>
  );
};

// ============================================================================
// EVENT FORMATTING
// ============================================================================

function formatEventDetail(event: TraceEvent): string {
  switch (event.type) {
    case 'run.start':
      return (event as { agent_name?: string }).agent_name || '';

    case 'run.end':
      const runEnd = event as { duration_ms?: number };
      return runEnd.duration_ms ? formatDuration(runEnd.duration_ms) : '';

    case 'llm.request':
      const llmReq = event as { model?: string; message_count?: number };
      return `${llmReq.model || ''} (${llmReq.message_count || 0} msgs)`;

    case 'llm.response':
      const llmRes = event as { total_tokens?: number; duration_ms?: number };
      const tokens = llmRes.total_tokens ? `${llmRes.total_tokens} tokens` : '';
      const duration = llmRes.duration_ms ? formatDuration(llmRes.duration_ms) : '';
      return [tokens, duration].filter(Boolean).join(' ');

    case 'tool.start':
      const toolStart = event as { tool_name?: string };
      return toolStart.tool_name || '';

    case 'tool.end':
      const toolEnd = event as { tool_name?: string; duration_ms?: number };
      const name = toolEnd.tool_name || '';
      const dur = toolEnd.duration_ms ? formatDuration(toolEnd.duration_ms) : '';
      return [name, dur].filter(Boolean).join(' ');

    case 'tool.error':
      const toolErr = event as { tool_name?: string; error_type?: string };
      return `${toolErr.tool_name || ''} - ${toolErr.error_type || 'Error'}`;

    case 'state.change':
      const stateChange = event as { author?: string };
      return stateChange.author || '';

    case 'agent.transfer':
      const transfer = event as { from_agent?: string; to_agent?: string };
      return `${transfer.from_agent || ''} → ${transfer.to_agent || ''}`;

    default:
      return '';
  }
}

export { formatEventDetail };
```

### 3.6 EventDetail Component

Create `cli/src/components/EventDetail.tsx`:

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import { TraceEvent } from '../lib/types.js';
import { getEventIcon, getEventColor, formatTimestamp } from '../styles/theme.js';

interface EventDetailProps {
  event: TraceEvent;
}

export const EventDetail: React.FC<EventDetailProps> = ({ event }) => {
  const icon = getEventIcon(event.type);
  const color = getEventColor(event.type);

  // Fields to exclude from detail view (shown in header)
  const excludeFields = new Set(['type', 'run_id', 'timestamp']);

  // Get remaining fields
  const fields = Object.entries(event).filter(([key]) => !excludeFields.has(key));

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={color}>{icon} </Text>
        <Text bold>{event.type}</Text>
        <Text dimColor> • {formatTimestamp(event.timestamp)}</Text>
        <Text dimColor> • Run: {event.run_id}</Text>
      </Box>

      {/* Fields */}
      <Box flexDirection="column">
        {fields.map(([key, value]) => (
          <Box key={key} marginLeft={2}>
            <Text color="cyan" bold>{key}: </Text>
            <Text wrap="wrap">
              {formatValue(value)}
            </Text>
          </Box>
        ))}
      </Box>

      {fields.length === 0 && (
        <Text dimColor marginLeft={2}>No additional details</Text>
      )}
    </Box>
  );
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}
```

### 3.7 ErrorDisplay Component

Create `cli/src/components/ErrorDisplay.tsx`:

```typescript
import React from 'react';
import { Box, Text } from 'ink';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  suggestion?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Error',
  message,
  suggestion,
}) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="red" bold>
        ✗ {title}
      </Text>
      <Text color="red" marginTop={1}>
        {message}
      </Text>
      {suggestion && (
        <Text dimColor marginTop={1}>
          Suggestion: {suggestion}
        </Text>
      )}
    </Box>
  );
};
```

---

## Phase 4: Custom Hooks

### 4.1 useTraceFile Hook

Create `cli/src/hooks/useTraceFile.ts`:

```typescript
import { useState, useEffect } from 'react';
import * as fs from 'fs';
import * as readline from 'readline';
import { TraceEvent, TraceSummary } from '../lib/types.js';
import { resolveTracePath } from '../lib/paths.js';
import { parseLine, aggregateSummary } from '../lib/parser.js';

interface UseTraceFileResult {
  events: TraceEvent[];
  summary: TraceSummary;
  loading: boolean;
  error: string | null;
}

const EMPTY_SUMMARY: TraceSummary = {
  runId: '',
  startTime: 0,
  duration: 0,
  llmCalls: 0,
  toolCalls: 0,
  totalTokens: 0,
  errors: 0,
};

export function useTraceFile(traceRef: string): UseTraceFileResult {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [summary, setSummary] = useState<TraceSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTrace() {
      try {
        setLoading(true);
        setError(null);

        // Resolve path
        const tracePath = await resolveTracePath(traceRef);

        if (!fs.existsSync(tracePath)) {
          throw new Error(`Trace file not found: ${tracePath}`);
        }

        // Stream and parse file
        const fileStream = fs.createReadStream(tracePath);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity,
        });

        const loadedEvents: TraceEvent[] = [];

        for await (const line of rl) {
          if (cancelled) break;

          const event = parseLine(line);
          if (event) {
            loadedEvents.push(event);
          }
        }

        if (cancelled) return;

        // Calculate summary
        const summaryData = aggregateSummary(loadedEvents);

        setEvents(loadedEvents);
        setSummary(summaryData);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : 'Failed to load trace';
        setError(message);
        setLoading(false);
      }
    }

    loadTrace();

    return () => {
      cancelled = true;
    };
  }, [traceRef]);

  return { events, summary, loading, error };
}
```

### 4.2 useProcessStream Hook

Create `cli/src/hooks/useProcessStream.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { ProcessManager } from '../lib/process.js';
import { TraceEvent, ProcessStatus, LiveStats } from '../lib/types.js';

interface UseProcessStreamResult {
  status: ProcessStatus;
  runId: string;
  error: string | null;
  stats: LiveStats;
  stop: () => void;
}

export function useProcessStream(
  script: string[],
  onEvent: (event: TraceEvent) => void
): UseProcessStreamResult {
  const [status, setStatus] = useState<ProcessStatus>('starting');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LiveStats>({
    startTime: Date.now(),
    duration: 0,
    tokens: 0,
    toolCalls: 0,
    llmCalls: 0,
    errors: 0,
  });

  const managerRef = useRef<ProcessManager | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Stable event handler
  const handleEvent = useCallback(
    (event: TraceEvent) => {
      // Update stats
      setStats((prev) => {
        const newStats = { ...prev };
        newStats.duration = Date.now() - startTimeRef.current;

        switch (event.type) {
          case 'llm.response':
            newStats.llmCalls++;
            newStats.tokens += ((event as { total_tokens?: number }).total_tokens) || 0;
            break;
          case 'tool.start':
            newStats.toolCalls++;
            break;
          case 'tool.error':
            newStats.errors++;
            break;
        }

        return newStats;
      });

      // Forward to callback
      onEvent(event);
    },
    [onEvent]
  );

  // Stop function
  const stop = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.stop();
    }
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const manager = new ProcessManager({ script });
    managerRef.current = manager;

    manager.on('event', handleEvent);

    manager.on('statusChange', (newStatus: ProcessStatus) => {
      setStatus(newStatus);
    });

    manager.on('error', (err: Error) => {
      setError(err.message);
      setStatus('error');
    });

    manager.on('exit', (code: number | null) => {
      if (code !== 0 && code !== null) {
        setError(`Process exited with code ${code}`);
      }
    });

    manager.start();

    return () => {
      manager.stop();
    };
  }, [script, handleEvent]);

  return {
    status,
    runId: managerRef.current?.runId || '',
    error,
    stats,
    stop,
  };
}
```

### 4.3 useKeyboard Hook

Create `cli/src/hooks/useKeyboard.ts`:

```typescript
import { useInput, useApp } from 'ink';
import { useCallback } from 'react';

interface KeyboardHandlers {
  onUp?: () => void;
  onDown?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onBack?: () => void;
  onQuit?: () => void;
  onPause?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
}

interface UseKeyboardOptions {
  handlers: KeyboardHandlers;
  exitOnQuit?: boolean;
}

export function useKeyboard({ handlers, exitOnQuit = true }: UseKeyboardOptions): void {
  const { exit } = useApp();

  const handleInput = useCallback(
    (input: string, key: {
      upArrow?: boolean;
      downArrow?: boolean;
      return?: boolean;
      escape?: boolean;
      ctrl?: boolean;
      pageUp?: boolean;
      pageDown?: boolean;
    }) => {
      // Quit handlers
      if (input === 'q' || (key.ctrl && input === 'c')) {
        handlers.onQuit?.();
        if (exitOnQuit) {
          exit();
        }
        return;
      }

      // Navigation
      if (key.upArrow) {
        handlers.onUp?.();
        return;
      }

      if (key.downArrow) {
        handlers.onDown?.();
        return;
      }

      if (key.return) {
        handlers.onEnter?.();
        return;
      }

      if (key.escape) {
        handlers.onEscape?.();
        handlers.onBack?.();
        return;
      }

      // Vim-style navigation
      if (input === 'k') {
        handlers.onUp?.();
        return;
      }

      if (input === 'j') {
        handlers.onDown?.();
        return;
      }

      // Back
      if (input === 'b') {
        handlers.onBack?.();
        return;
      }

      // Pause/resume
      if (input === 'p') {
        handlers.onPause?.();
        return;
      }

      // Page navigation
      if (key.pageUp || input === 'u') {
        handlers.onPageUp?.();
        return;
      }

      if (key.pageDown || input === 'd') {
        handlers.onPageDown?.();
        return;
      }

      // Home/End
      if (input === 'g') {
        handlers.onHome?.();
        return;
      }

      if (input === 'G') {
        handlers.onEnd?.();
        return;
      }
    },
    [handlers, exitOnQuit, exit]
  );

  useInput(handleInput);
}
```

---

## Phase 5: Commands

### 5.1 Show Command

Create `cli/src/commands/show.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

import { useTraceFile } from '../hooks/useTraceFile.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { Header } from '../components/Header.js';
import { Summary } from '../components/Summary.js';
import { EventList } from '../components/EventList.js';
import { EventDetail } from '../components/EventDetail.js';
import { StatusBar } from '../components/StatusBar.js';
import { ErrorDisplay } from '../components/ErrorDisplay.js';
import { TraceEvent } from '../lib/types.js';

interface ShowCommandProps {
  trace: string;
}

export const ShowCommand: React.FC<ShowCommandProps> = ({ trace }) => {
  const { events, summary, loading, error } = useTraceFile(trace);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedEvent, setExpandedEvent] = useState<TraceEvent | null>(null);

  // Navigation handlers
  const handleUp = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleDown = useCallback(() => {
    setSelectedIndex((i) => Math.min(events.length - 1, i + 1));
  }, [events.length]);

  const handleEnter = useCallback(() => {
    if (events[selectedIndex]) {
      setExpandedEvent(events[selectedIndex]);
    }
  }, [events, selectedIndex]);

  const handleBack = useCallback(() => {
    setExpandedEvent(null);
  }, []);

  const handlePageUp = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 10));
  }, []);

  const handlePageDown = useCallback(() => {
    setSelectedIndex((i) => Math.min(events.length - 1, i + 10));
  }, [events.length]);

  const handleHome = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  const handleEnd = useCallback(() => {
    setSelectedIndex(events.length - 1);
  }, [events.length]);

  // Set up keyboard handling
  useKeyboard({
    handlers: {
      onUp: handleUp,
      onDown: handleDown,
      onEnter: handleEnter,
      onBack: handleBack,
      onEscape: handleBack,
      onPageUp: handlePageUp,
      onPageDown: handlePageDown,
      onHome: handleHome,
      onEnd: handleEnd,
    },
  });

  // Loading state
  if (loading) {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Loading trace...
        </Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        message={error}
        suggestion='Use "agenttrace list" to see available traces'
      />
    );
  }

  // Detail view
  if (expandedEvent) {
    return (
      <Box flexDirection="column">
        <Header
          runId={summary.runId}
          timestamp={summary.startTime}
          agentName={summary.agentName}
        />
        <EventDetail event={expandedEvent} />
        <StatusBar keys={['b/Esc: Back', 'q: Quit']} />
      </Box>
    );
  }

  // Main view
  return (
    <Box flexDirection="column">
      <Header
        runId={summary.runId}
        timestamp={summary.startTime}
        agentName={summary.agentName}
      />
      <Summary
        duration={summary.duration}
        llmCalls={summary.llmCalls}
        toolCalls={summary.toolCalls}
        totalTokens={summary.totalTokens}
        errors={summary.errors}
      />
      <EventList
        events={events}
        selectedIndex={selectedIndex}
        maxVisible={15}
      />
      <StatusBar
        keys={['↑↓/jk: Navigate', 'Enter: Expand', 'u/d: Page', 'q: Quit']}
      />
    </Box>
  );
};
```

### 5.2 Tail Command

Create `cli/src/commands/tail.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import { Box, Text, Static } from 'ink';
import Spinner from 'ink-spinner';

import { useProcessStream } from '../hooks/useProcessStream.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { Header } from '../components/Header.js';
import { Summary } from '../components/Summary.js';
import { StatusBar } from '../components/StatusBar.js';
import { ErrorDisplay } from '../components/ErrorDisplay.js';
import { TraceEvent } from '../lib/types.js';
import { getEventIcon, getEventColor, formatTimestamp } from '../styles/theme.js';
import { formatEventDetail } from '../components/EventList.js';

interface TailCommandProps {
  script: string[];
}

export const TailCommand: React.FC<TailCommandProps> = ({ script }) => {
  const [paused, setPaused] = useState(false);
  const [completedEvents, setCompletedEvents] = useState<TraceEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<TraceEvent | null>(null);

  // Event handler
  const handleEvent = useCallback((event: TraceEvent) => {
    if (paused) return;

    // Move current to completed, set new current
    setCurrentEvent((prev) => {
      if (prev) {
        setCompletedEvents((events) => [...events, prev]);
      }
      return event;
    });
  }, [paused]);

  const { status, runId, error, stats, stop } = useProcessStream(script, handleEvent);

  // Keyboard handlers
  const handlePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const handleQuit = useCallback(() => {
    stop();
  }, [stop]);

  useKeyboard({
    handlers: {
      onPause: handlePause,
      onQuit: handleQuit,
    },
    exitOnQuit: true,
  });

  // Error state
  if (error && status === 'error') {
    return (
      <ErrorDisplay
        message={error}
        suggestion="Check that the script exists and Python is installed"
      />
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

      <Summary
        duration={stats.duration}
        llmCalls={stats.llmCalls}
        toolCalls={stats.toolCalls}
        totalTokens={stats.tokens}
        errors={stats.errors}
        compact={true}
      />

      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        <Text bold marginBottom={1}>Timeline</Text>

        {/* Completed events - rendered once via Static */}
        <Static items={completedEvents}>
          {(event, index) => (
            <EventLine key={index} event={event} />
          )}
        </Static>

        {/* Current event - dynamically updated */}
        {currentEvent && (
          <EventLine event={currentEvent} current={true} />
        )}

        {/* Running indicator */}
        {status === 'running' && !currentEvent && (
          <Box>
            <Text>
              <Spinner type="dots" /> Waiting for events...
            </Text>
          </Box>
        )}

        {status === 'running' && currentEvent && (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Running...
            </Text>
          </Box>
        )}

        {status === 'stopped' && (
          <Box marginTop={1}>
            <Text color="green">✓ Process completed</Text>
          </Box>
        )}
      </Box>

      <StatusBar
        keys={[
          'Ctrl+C: Stop',
          `p: ${paused ? 'Resume' : 'Pause'}`,
          'q: Quit',
        ]}
        message={paused ? 'PAUSED' : undefined}
      />
    </Box>
  );
};

// ============================================================================
// EVENT LINE COMPONENT (for tail view)
// ============================================================================

interface EventLineProps {
  event: TraceEvent;
  current?: boolean;
}

const EventLine: React.FC<EventLineProps> = ({ event, current = false }) => {
  const icon = getEventIcon(event.type);
  const color = getEventColor(event.type);
  const time = formatTimestamp(event.timestamp);
  const detail = formatEventDetail(event);

  return (
    <Box>
      <Text dimColor>{time}</Text>
      <Text>  </Text>
      <Text color={color}>{icon}</Text>
      <Text> </Text>
      <Text bold={current}>{event.type.padEnd(15)}</Text>
      <Text> </Text>
      <Text dimColor>{detail}</Text>
    </Box>
  );
};
```

### 5.3 List Command

Create `cli/src/commands/list.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';

import { useKeyboard } from '../hooks/useKeyboard.js';
import { StatusBar } from '../components/StatusBar.js';
import { listTraces, formatSize, formatRelativeTime } from '../lib/paths.js';
import { TraceInfo } from '../lib/types.js';

interface ListCommandProps {
  limit: number;
  since?: string;
  onSelect?: (trace: TraceInfo) => void;
}

export const ListCommand: React.FC<ListCommandProps> = ({
  limit,
  since,
  onSelect,
}) => {
  const traces = listTraces(limit, since);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Navigation handlers
  const handleUp = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleDown = useCallback(() => {
    setSelectedIndex((i) => Math.min(traces.length - 1, i + 1));
  }, [traces.length]);

  const handleEnter = useCallback(() => {
    if (traces[selectedIndex] && onSelect) {
      onSelect(traces[selectedIndex]);
    }
  }, [traces, selectedIndex, onSelect]);

  useKeyboard({
    handlers: {
      onUp: handleUp,
      onDown: handleDown,
      onEnter: handleEnter,
    },
  });

  if (traces.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">No traces found.</Text>
        <Text dimColor marginTop={1}>
          To create traces, add AgentTracePlugin to your ADK agent:
        </Text>
        <Text dimColor marginTop={1}>
          {'  '}from agenttrace import AgentTracePlugin
        </Text>
        <Text dimColor>
          {'  '}runner = InMemoryRunner(..., plugins=[AgentTracePlugin()])
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" paddingX={1}>
        <Text bold>Recent Traces</Text>
        <Text dimColor> ({traces.length} found)</Text>
      </Box>

      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        {/* Header row */}
        <Box marginBottom={1}>
          <Text bold>{'  '}</Text>
          <Text bold>{'RUN ID'.padEnd(12)}</Text>
          <Text bold>{'DATE'.padEnd(12)}</Text>
          <Text bold>{'SIZE'.padEnd(10)}</Text>
          <Text bold>{'AGE'.padEnd(12)}</Text>
        </Box>

        {/* Data rows */}
        {traces.map((trace, i) => {
          const isSelected = i === selectedIndex;

          return (
            <Box key={trace.runId}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '> ' : '  '}
              </Text>
              <Text bold={isSelected}>
                {trace.runId.slice(0, 10).padEnd(12)}
              </Text>
              <Text>{trace.date.padEnd(12)}</Text>
              <Text dimColor>{formatSize(trace.size).padEnd(10)}</Text>
              <Text dimColor>{formatRelativeTime(trace.mtime).padEnd(12)}</Text>
            </Box>
          );
        })}
      </Box>

      <StatusBar keys={['↑↓: Navigate', 'Enter: View', 'q: Quit']} />
    </Box>
  );
};
```

### 5.4 Entry Point

Create `cli/src/index.tsx`:

```typescript
#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { ShowCommand } from './commands/show.js';
import { TailCommand } from './commands/tail.js';
import { ListCommand } from './commands/list.js';

// ============================================================================
// CLI DEFINITION
// ============================================================================

yargs(hideBin(process.argv))
  .scriptName('agenttrace')
  .usage('$0 <command> [options]')
  .version()
  .alias('v', 'version')
  .help()
  .alias('h', 'help')

  // ============================================================================
  // SHOW COMMAND
  // ============================================================================
  .command(
    'show [trace]',
    'View a saved trace file',
    (yargs) =>
      yargs.positional('trace', {
        describe: 'Trace ID, file path, or "last" for most recent',
        type: 'string',
        default: 'last',
      }),
    (argv) => {
      render(<ShowCommand trace={argv.trace} />);
    }
  )

  // ============================================================================
  // TAIL COMMAND
  // ============================================================================
  .command(
    'tail <script..>',
    'Run a script and stream events live',
    (yargs) =>
      yargs
        .positional('script', {
          describe: 'Command to run (e.g., python my_agent.py)',
          type: 'string',
          array: true,
          demandOption: true,
        })
        .example('$0 tail python my_agent.py', 'Tail a Python script')
        .example('$0 tail -- python my_agent.py --verbose', 'With script arguments'),
    (argv) => {
      render(<TailCommand script={argv.script as string[]} />);
    }
  )

  // ============================================================================
  // LIST COMMAND
  // ============================================================================
  .command(
    'list',
    'List recent traces',
    (yargs) =>
      yargs
        .option('limit', {
          alias: 'n',
          type: 'number',
          default: 10,
          describe: 'Number of traces to show',
        })
        .option('since', {
          type: 'string',
          describe: 'Show traces since date (YYYY-MM-DD)',
        }),
    (argv) => {
      render(
        <ListCommand
          limit={argv.limit}
          since={argv.since}
        />
      );
    }
  )

  // ============================================================================
  // GLOBAL OPTIONS
  // ============================================================================
  .demandCommand(1, 'You must specify a command')
  .strict()
  .wrap(Math.min(120, process.stdout.columns || 80))
  .epilogue('For more information, visit: https://github.com/your-org/agenttrace')
  .parse();
```

---

## Phase 7: Testing

### 7.1 Parser Tests

Create `cli/__tests__/lib/parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseLine, parseLines, aggregateSummary } from '../../src/lib/parser.js';

describe('parseLine', () => {
  it('parses raw JSONL event', () => {
    const line = '{"type":"run.start","run_id":"abc123","timestamp":1705329121}';
    const event = parseLine(line);

    expect(event).not.toBeNull();
    expect(event?.type).toBe('run.start');
    expect(event?.run_id).toBe('abc123');
    expect(event?.timestamp).toBe(1705329121);
  });

  it('parses JSON-RPC wrapped event', () => {
    const line = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tool.start',
      params: {
        type: 'tool.start',
        run_id: 'abc123',
        timestamp: 1705329121,
        tool_name: 'search_web',
      },
    });

    const event = parseLine(line);

    expect(event).not.toBeNull();
    expect(event?.type).toBe('tool.start');
    expect(event?.tool_name).toBe('search_web');
  });

  it('returns null for empty lines', () => {
    expect(parseLine('')).toBeNull();
    expect(parseLine('   ')).toBeNull();
    expect(parseLine('\n')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseLine('not json')).toBeNull();
    expect(parseLine('{invalid}')).toBeNull();
    expect(parseLine('{"type": "unknown"}')).toBeNull(); // Missing required fields
  });

  it('returns null for invalid event types', () => {
    const line = '{"type":"invalid.event","run_id":"abc123","timestamp":1705329121}';
    expect(parseLine(line)).toBeNull();
  });
});

describe('parseLines', () => {
  it('parses multiple lines', () => {
    const text = [
      '{"type":"run.start","run_id":"abc123","timestamp":1705329121}',
      '{"type":"run.end","run_id":"abc123","timestamp":1705329125}',
    ].join('\n');

    const events = parseLines(text);

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('run.start');
    expect(events[1].type).toBe('run.end');
  });

  it('skips invalid lines', () => {
    const text = [
      '{"type":"run.start","run_id":"abc123","timestamp":1705329121}',
      'invalid line',
      '{"type":"run.end","run_id":"abc123","timestamp":1705329125}',
    ].join('\n');

    const events = parseLines(text);

    expect(events).toHaveLength(2);
  });
});

describe('aggregateSummary', () => {
  it('calculates summary from events', () => {
    const events = [
      { type: 'run.start' as const, run_id: 'abc123', timestamp: 1000, agent_name: 'test' },
      { type: 'llm.response' as const, run_id: 'abc123', timestamp: 1001, total_tokens: 500 },
      { type: 'tool.start' as const, run_id: 'abc123', timestamp: 1002 },
      { type: 'tool.end' as const, run_id: 'abc123', timestamp: 1003 },
      { type: 'llm.response' as const, run_id: 'abc123', timestamp: 1004, total_tokens: 300 },
      { type: 'run.end' as const, run_id: 'abc123', timestamp: 1005 },
    ];

    const summary = aggregateSummary(events);

    expect(summary.runId).toBe('abc123');
    expect(summary.llmCalls).toBe(2);
    expect(summary.toolCalls).toBe(1);
    expect(summary.totalTokens).toBe(800);
    expect(summary.duration).toBe(5000); // (1005 - 1000) * 1000
    expect(summary.agentName).toBe('test');
  });
});
```

### 7.2 Component Tests

Create `cli/__tests__/components/Header.test.tsx`:

```typescript
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { Header } from '../../src/components/Header.js';

describe('Header', () => {
  it('renders run ID', () => {
    const { lastFrame } = render(<Header runId="abc123" />);

    expect(lastFrame()).toContain('abc123');
    expect(lastFrame()).toContain('agenttrace');
  });

  it('shows LIVE indicator when live mode', () => {
    const { lastFrame } = render(
      <Header runId="abc123" live={true} status="running" />
    );

    expect(lastFrame()).toContain('LIVE');
  });

  it('shows PAUSED when paused', () => {
    const { lastFrame } = render(
      <Header runId="abc123" live={true} paused={true} />
    );

    expect(lastFrame()).toContain('PAUSED');
  });

  it('shows agent name when provided', () => {
    const { lastFrame } = render(
      <Header runId="abc123" agentName="my_agent" />
    );

    expect(lastFrame()).toContain('my_agent');
  });

  it('formats timestamp correctly', () => {
    const timestamp = 1705329121; // 2024-01-15 14:32:01
    const { lastFrame } = render(
      <Header runId="abc123" timestamp={timestamp} />
    );

    // Should contain some date string
    expect(lastFrame()).toContain('2024');
  });
});
```

---

## File Reference

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `cli/package.json` | 60 | Package configuration |
| `cli/tsconfig.json` | 25 | TypeScript config |
| `cli/tsup.config.ts` | 30 | Build config |
| `cli/vitest.config.ts` | 25 | Test config |
| `cli/src/lib/types.ts` | 150 | Type definitions |
| `cli/src/lib/parser.ts` | 120 | NDJSON parsing |
| `cli/src/lib/paths.ts` | 150 | Path utilities |
| `cli/src/lib/process.ts` | 150 | Process management |
| `cli/src/lib/config.ts` | 50 | Config loader |
| `cli/src/styles/theme.ts` | 100 | Colors and formatting |
| `cli/src/components/Header.tsx` | 50 | Header component |
| `cli/src/components/StatusBar.tsx` | 25 | Status bar |
| `cli/src/components/Summary.tsx` | 70 | Summary stats |
| `cli/src/components/EventList.tsx` | 150 | Event timeline |
| `cli/src/components/EventDetail.tsx` | 60 | Event details |
| `cli/src/components/ErrorDisplay.tsx` | 25 | Error messages |
| `cli/src/hooks/useTraceFile.ts` | 80 | File loading hook |
| `cli/src/hooks/useProcessStream.ts` | 100 | Live streaming hook |
| `cli/src/hooks/useKeyboard.ts` | 80 | Keyboard hook |
| `cli/src/commands/show.tsx` | 120 | Show command |
| `cli/src/commands/tail.tsx` | 150 | Tail command |
| `cli/src/commands/list.tsx` | 100 | List command |
| `cli/src/index.tsx` | 100 | Entry point |

**Total: ~1,900 lines of code**

---

## Implementation Checklist

### Phase 1: Project Setup
- [ ] Create `cli/` directory structure
- [ ] Create `pnpm-workspace.yaml`
- [ ] Create `cli/package.json`
- [ ] Create `cli/tsconfig.json`
- [ ] Create `cli/tsup.config.ts`
- [ ] Create `cli/vitest.config.ts`
- [ ] Create `cli/.eslintrc.js`
- [ ] Run `pnpm install` in cli directory
- [ ] Verify `pnpm run build` works

### Phase 2: Core Infrastructure
- [ ] Create `src/lib/types.ts`
- [ ] Create `src/lib/parser.ts`
- [ ] Create `src/lib/paths.ts`
- [ ] Create `src/lib/process.ts`
- [ ] Create `src/lib/config.ts`

### Phase 3: UI Components
- [ ] Create `src/styles/theme.ts`
- [ ] Create `src/components/Header.tsx`
- [ ] Create `src/components/StatusBar.tsx`
- [ ] Create `src/components/Summary.tsx`
- [ ] Create `src/components/EventList.tsx`
- [ ] Create `src/components/EventDetail.tsx`
- [ ] Create `src/components/ErrorDisplay.tsx`

### Phase 4: Hooks
- [ ] Create `src/hooks/useTraceFile.ts`
- [ ] Create `src/hooks/useProcessStream.ts`
- [ ] Create `src/hooks/useKeyboard.ts`

### Phase 5: Commands
- [ ] Create `src/commands/show.tsx`
- [ ] Create `src/commands/tail.tsx`
- [ ] Create `src/commands/list.tsx`
- [ ] Create `src/index.tsx`
- [ ] Test `agenttrace show last`
- [ ] Test `agenttrace tail python test.py`
- [ ] Test `agenttrace list`

### Phase 6: Configuration
- [ ] Implement config loading
- [ ] Test config file parsing

### Phase 7: Testing
- [ ] Create `__tests__/lib/parser.test.ts`
- [ ] Create `__tests__/lib/paths.test.ts`
- [ ] Create `__tests__/components/Header.test.tsx`
- [ ] Create `__tests__/components/EventList.test.tsx`
- [ ] Run `pnpm test` and verify all pass

### Phase 8: Packaging
- [ ] Create `cli/README.md`
- [ ] Update package.json metadata
- [ ] Test `npm pack`
- [ ] Test local install with `npm install -g ./`
- [ ] Verify `agenttrace --help` works

---

## Quick Start Commands

```bash
# Create the CLI directory and initialize
cd /Volumes/CS_Stuff/watchtower-cli
mkdir -p cli/src/{commands,components,hooks,lib,styles}
mkdir -p cli/__tests__/{lib,components}

# Initialize package (after creating package.json)
cd cli
pnpm install

# Development
pnpm run dev        # Watch mode
pnpm run build      # Build
pnpm run test       # Run tests
pnpm run typecheck  # Type check

# Test locally
node dist/index.js show last
node dist/index.js list
```

---

*This document contains the complete implementation plan for the AgentTrace CLI. Each code block is ready to be copied into the corresponding file.*
