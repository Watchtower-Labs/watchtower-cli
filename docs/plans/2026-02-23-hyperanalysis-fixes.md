# Hyperanalysis Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 47 issues identified across Python SDK, TypeScript CLI, Next.js web dashboard, and CI/CD infrastructure, organized in three severity phases.

**Architecture:** Severity-first — Critical issues unblock the 0.1.0 release and prevent crashes; High issues prevent silent failures and improve correctness; Medium issues add polish and test coverage. All Python changes follow TDD with pytest; CLI changes use AVA; web tests use Vitest + Testing Library.

**Tech Stack:** Python 3.11 / pytest / mypy / ruff — TypeScript 5.3 / AVA / Ink 4 / React 18 — Next.js 14 App Router / Vitest / Testing Library — GitHub Actions

---

## PHASE 1: CRITICAL FIXES

---

### Task 1: Fix CI/CD Release Automation

**Context:** `scripts/bump-version.sh` creates `v*` tags (e.g. `v0.1.1`) but the release workflows trigger on `sdk-v*` and `cli-v*` tags. This means running the bump script will NEVER trigger a release. This is a hard release blocker.

Additionally: `.github/workflows/test.yml` runs ruff twice (lines 194–206), `release-cli.yml` and `release-sdk.yml` lack `contents: write` permission for creating GitHub Releases, and `test.yml` has no top-level permissions block.

**Files:**
- Modify: `scripts/bump-version.sh:56-59`
- Modify: `.github/workflows/test.yml:205-206` (remove duplicate step)
- Modify: `.github/workflows/test.yml` (add permissions block)
- Modify: `.github/workflows/release-cli.yml:8-9`
- Modify: `.github/workflows/release-sdk.yml:8-9`

**Step 1: Fix bump-version.sh to create correct tag names**

Replace the final echo block in `scripts/bump-version.sh`:

```bash
# BEFORE (lines 56-59):
echo "  2. Create tag: git tag v$NEW_VERSION"
echo "  3. Push tag: git push origin v$NEW_VERSION"

# AFTER: emit two separate tags for SDK and CLI releases
echo "  2. Create SDK tag:  git tag sdk-v$NEW_VERSION"
echo "  3. Create CLI tag:  git tag cli-v$NEW_VERSION"
echo "  4. Push SDK tag:    git push origin sdk-v$NEW_VERSION"
echo "  5. Push CLI tag:    git push origin cli-v$NEW_VERSION"
echo ""
echo "Or to release both at once:"
echo "  git tag sdk-v$NEW_VERSION && git tag cli-v$NEW_VERSION"
echo "  git push origin sdk-v$NEW_VERSION cli-v$NEW_VERSION"
```

**Step 2: Remove duplicate ruff step from test.yml**

In `.github/workflows/test.yml`, delete lines 205-206:
```yaml
      - name: Lint with ruff
        run: ruff check watchtower/ tests/
```
(Keep the step at lines 194-195 which has `--output-format=github`.)

**Step 3: Add permissions block to test.yml**

Add at top of `.github/workflows/test.yml` after the `on:` block:
```yaml
permissions:
  contents: read
```

**Step 4: Add contents: write to release workflows**

In `.github/workflows/release-cli.yml`, change:
```yaml
permissions:
  contents: read
```
to:
```yaml
permissions:
  contents: write
  id-token: write
```

Apply the same change to `.github/workflows/release-sdk.yml`.

**Step 5: Verify**
```bash
# Check no syntax errors in YAML:
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/test.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release-cli.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release-sdk.yml'))"
# Expected: no output (no errors)
```

**Step 6: Commit**
```bash
git add scripts/bump-version.sh \
        .github/workflows/test.yml \
        .github/workflows/release-cli.yml \
        .github/workflows/release-sdk.yml
git commit -m "fix: fix release tag format and CI/CD permissions"
```

---

### Task 2: Remove Python SDK Dead Code

**Context:** Two unreachable code paths in the Python SDK confuse contributors and could mask real bugs.

1. `watchtower/sdk.py:106-108` — `raise NotImplementedError(...)` can never be reached because the preceding if/elif chain covers all three members of `supported_frameworks`, and a `ValueError` is raised before the block if the value is unexpected.

2. `watchtower/writers/file_writer.py:216-217` — The `if not lock_acquired: raise RuntimeError(...)` check at line 216 is unreachable because the retry loop at line 214 already raises when exhausted. If any retry succeeded, `lock_acquired` is `True`.

**Files:**
- Modify: `watchtower/sdk.py:106-108`
- Modify: `watchtower/writers/file_writer.py:216-217`

**Step 1: Write a regression test first (TDD)**

Add to `tests/test_basic.py`:
```python
def test_create_observer_exhaustive_framework_coverage():
    """Ensure all supported frameworks are handled — no unreachable fallthrough."""
    from watchtower.sdk import Watchtower
    from watchtower import AgentFramework
    # All three supported frameworks should not raise NotImplementedError
    # (they may raise ImportError if library not installed, which is expected)
    for framework in [AgentFramework.GOOGLE_ADK, AgentFramework.ANTHROPIC, AgentFramework.OPENAI]:
        try:
            Watchtower.create_observer(framework=framework.value)
        except ImportError:
            pass  # Expected if framework library not installed
        except NotImplementedError as e:
            pytest.fail(f"NotImplementedError raised for {framework}: {e}")
```

**Step 2: Run test to verify it currently passes (no regression)**
```bash
python3 -m pytest tests/test_basic.py::test_create_observer_exhaustive_framework_coverage -v
# Expected: PASS (the unreachable code never fires anyway)
```

**Step 3: Remove unreachable NotImplementedError from sdk.py**

In `watchtower/sdk.py`, delete lines 106-108:
```python
        raise NotImplementedError(
            f"No observer implementation available for: {detected_framework}"
        )
```

The `try` block ending at line 104 is sufficient.

**Step 4: Remove unreachable lock check from file_writer.py**

In `watchtower/writers/file_writer.py`, delete lines 216-217:
```python
                    if not lock_acquired:
                        raise RuntimeError("Failed to acquire file lock")
```

**Step 5: Run all Python tests**
```bash
python3 -m pytest tests/ -q
# Expected: All tests pass, 0 failures
```

**Step 6: Commit**
```bash
git add watchtower/sdk.py watchtower/writers/file_writer.py tests/test_basic.py
git commit -m "fix: remove unreachable dead code in sdk.py and file_writer.py"
```

---

### Task 3: Add None Response Guard to Anthropic and OpenAI Adapters

**Context:** `google_adk.py` returns `None` early when `response is None`. The Anthropic and OpenAI adapters don't — they immediately access `provider_response.usage` and `response.choices[0]`, causing `AttributeError` when `None` is passed.

**Files:**
- Modify: `watchtower/adapters/anthropic.py` (around line 133)
- Modify: `watchtower/adapters/openai.py` (around line 133)
- Test: `tests/test_adapters_anthropic.py`
- Test: `tests/test_adapters_openai.py`

**Step 1: Write failing tests**

Add to `tests/test_adapters_anthropic.py`:
```python
def test_observe_llm_call_returns_none_when_response_is_none():
    """observe_llm_call should return None gracefully when response is None."""
    anthropic = pytest.importorskip("anthropic")
    from unittest.mock import MagicMock
    from watchtower.adapters.anthropic import AnthropicObserver

    observer = AnthropicObserver.__new__(AnthropicObserver)
    observer.client = MagicMock()
    observer.model = "claude-3-5-sonnet-20241022"
    observer.file_writer = MagicMock()

    result = observer.observe_llm_call(request=[{"role": "user", "content": "hi"}], response=None)
    assert result is None
```

Create `tests/test_adapters_openai.py`:
```python
"""Tests for the OpenAI adapter."""
import pytest


def test_observe_llm_call_returns_none_when_response_is_none():
    """observe_llm_call should return None gracefully when response is None."""
    pytest.importorskip("openai")
    from unittest.mock import MagicMock
    from watchtower.adapters.openai import OpenAIObserver

    observer = OpenAIObserver.__new__(OpenAIObserver)
    observer.client = MagicMock()
    observer.model = "gpt-4o"
    observer.file_writer = MagicMock()

    result = observer.observe_llm_call(request=[{"role": "user", "content": "hi"}], response=None)
    assert result is None


def test_run_start_emits_event():
    """observe_run_start should emit a run.start trace event."""
    pytest.importorskip("openai")
    import tempfile, os
    from watchtower.adapters.openai import OpenAIObserver
    from watchtower import WatchtowerConfig

    with tempfile.TemporaryDirectory() as tmpdir:
        config = WatchtowerConfig(trace_dir=tmpdir)
        observer = OpenAIObserver(config=config)
        event = observer.observe_run_start({"agent_name": "test_agent"})
        assert event is not None
        assert event.type == "run.start"
        assert event.agent_name == "test_agent"
```

**Step 2: Run to verify they fail**
```bash
python3 -m pytest tests/test_adapters_anthropic.py::test_observe_llm_call_returns_none_when_response_is_none tests/test_adapters_openai.py -v
# Expected: FAIL with AttributeError (None has no attribute 'usage' / 'choices')
```

**Step 3: Add None guard to anthropic.py**

In `watchtower/adapters/anthropic.py`, inside `observe_llm_call`, add after `start_time = time.time()`:
```python
            if response is None:
                return None
```
Place this before line `messages: List[Dict[str, Any]] = request` (current line 136).

**Step 4: Add None guard to openai.py**

In `watchtower/adapters/openai.py`, inside `observe_llm_call`, add after the `start_time = time.time()` line:
```python
            if response is None:
                return None
```

**Step 5: Run tests to verify they pass**
```bash
python3 -m pytest tests/test_adapters_anthropic.py tests/test_adapters_openai.py -v
# Expected: All tests PASS (including pre-existing ones)
```

**Step 6: Run full Python suite**
```bash
python3 -m pytest tests/ -q
# Expected: All tests pass
```

**Step 7: Commit**
```bash
git add watchtower/adapters/anthropic.py watchtower/adapters/openai.py \
        tests/test_adapters_anthropic.py tests/test_adapters_openai.py
git commit -m "fix: add None response guard to Anthropic and OpenAI adapters"
```

---

### Task 4: Add Error Handler to CLI Streaming Parser

**Context:** In `packages/cli/src/lib/streaming-parser.ts`, the `_loadPage()` method creates a `fs.createReadStream` but never attaches an `error` handler. If the underlying file becomes unreadable mid-read (permissions revoked, device failure), the error event is emitted into the void — Node.js will then throw an unhandled `Error` at the process level, crashing the CLI.

**Files:**
- Modify: `packages/cli/src/lib/streaming-parser.ts:255-263`

**Step 1: Locate the exact code to change**

In `packages/cli/src/lib/streaming-parser.ts`, find `_loadPage()` (around line 248). The fileStream creation is:
```typescript
const fileStream = fs.createReadStream(this.filePath, {
    encoding: 'utf-8',
    start: this.lineOffsets[startIndex],
});

const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
});
```

**Step 2: Add error handler**

Wrap in a Promise to properly propagate errors. Change the `_loadPage` method's `fileStream` creation section to attach an error handler before the `for await`:

```typescript
const fileStream = fs.createReadStream(this.filePath, {
    encoding: 'utf-8',
    start: this.lineOffsets[startIndex],
});

// Surface stream-level errors (permissions, device failure) to the caller
const streamError = new Promise<never>((_, reject) => {
    fileStream.once('error', reject);
});

const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
});
```

Then wrap the `for await` loop body. After the loop close, before the `return events`:

Actually the cleaner approach is simpler — just add the `.once('error', ...)` handler that rejects a promise and use `Promise.race` in the caller, OR simply add it to destroy + rethrow. The minimal fix is:

```typescript
const fileStream = fs.createReadStream(this.filePath, {
    encoding: 'utf-8',
    start: this.lineOffsets[startIndex],
});

fileStream.on('error', (err) => {
    rl.close();
    throw err; // Will be caught by the async caller's try/catch
});

const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
});
```

**Note:** The `throw` inside a stream `'error'` callback won't propagate to async callers. The correct approach is to reject via a Promise wrapper. Here is the complete replacement for the relevant section of `_loadPage`:

```typescript
private async _loadPage(pageNumber: number): Promise<TraceEvent[]> {
    const startIndex = pageNumber * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.eventCount);

    const events: TraceEvent[] = [];

    return new Promise<TraceEvent[]>((resolve, reject) => {
        const fileStream = fs.createReadStream(this.filePath, {
            encoding: 'utf-8',
            start: this.lineOffsets[startIndex],
        });

        fileStream.on('error', reject);

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        let lineIndex = 0;

        const processLines = async () => {
            for await (const line of rl) {
                if (this.cancelled) {
                    fileStream.destroy();
                    throw new Error('Parser was cancelled');
                }

                if (lineIndex >= endIndex - startIndex) {
                    rl.close();
                    fileStream.destroy();
                    break;
                }

                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const event = parseLine(trimmed);
                    if (event) {
                        events.push(event);
                    }
                }

                lineIndex++;
            }
            return events;
        };

        processLines().then(resolve).catch(reject);
    });
}
```

Read the full `_loadPage` method first to make sure you copy all logic correctly (especially the `endIndex` calculation and `lineIndex` tracking).

**Step 3: Build to verify no TypeScript errors**
```bash
cd packages/cli && pnpm build 2>&1 | head -20
# Expected: no errors
```

**Step 4: Commit**
```bash
git add packages/cli/src/lib/streaming-parser.ts
git commit -m "fix: add error handler to createReadStream in streaming-parser _loadPage"
```

---

### Task 5: Add CLI Streaming Parser Integration Tests

**Context:** The streaming parser's pagination logic (the critical path for `watchtower show`) has no integration tests. If the parser breaks, users see blank screens with no error.

**Files:**
- Create: `packages/cli/src/__tests__/streaming-parser.integration.test.ts`

**Step 1: Create the test file**

```typescript
import {writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import test from 'ava';
import {StreamingTraceParser} from '../lib/streaming-parser.js';

// Helper: build a unique temp dir
function tempDir(): string {
    const dir = join(tmpdir(), `wt-sp-${Date.now()}-${Math.floor(Math.random() * 1e9)}`);
    mkdirSync(dir, {recursive: true});
    return dir;
}

// Helper: generate N JSONL events
function makeEvents(count: number): string {
    return Array.from({length: count}, (_, i) =>
        JSON.stringify({
            type: 'run.start',
            run_id: `run-${i}`,
            timestamp: 1_705_315_921.0 + i,
            agent_name: 'test_agent',
        })
    ).join('\n');
}

test('single-page file: returns all events on page 0', async t => {
    const dir = tempDir();
    const file = join(dir, 'trace.jsonl');
    writeFileSync(file, makeEvents(5));

    const parser = new StreamingTraceParser(file, {pageSize: 10});
    await parser.initialize();

    t.is(parser.eventCount, 5);
    t.is(parser.pageCount, 1);

    const page = await parser.getPage(0);
    t.is(page.length, 5);
    t.is(page[0]!.run_id, 'run-0');
});

test('multi-page: pagination returns correct events per page', async t => {
    const dir = tempDir();
    const file = join(dir, 'trace.jsonl');
    writeFileSync(file, makeEvents(25));

    const parser = new StreamingTraceParser(file, {pageSize: 10});
    await parser.initialize();

    t.is(parser.eventCount, 25);
    t.is(parser.pageCount, 3);

    const page0 = await parser.getPage(0);
    t.is(page0.length, 10);
    t.is(page0[0]!.run_id, 'run-0');

    const page2 = await parser.getPage(2);
    t.is(page2.length, 5); // last page has remainder
    t.is(page2[0]!.run_id, 'run-20');
});

test('jump-to-page: getPage(N) returns correct events', async t => {
    const dir = tempDir();
    const file = join(dir, 'trace.jsonl');
    writeFileSync(file, makeEvents(50));

    const parser = new StreamingTraceParser(file, {pageSize: 10});
    await parser.initialize();

    const page4 = await parser.getPage(4);
    t.is(page4.length, 10);
    t.is(page4[0]!.run_id, 'run-40');
});

test('empty file: returns 0 events and 0 pages', async t => {
    const dir = tempDir();
    const file = join(dir, 'empty.jsonl');
    writeFileSync(file, '');

    const parser = new StreamingTraceParser(file, {pageSize: 10});
    await parser.initialize();

    t.is(parser.eventCount, 0);
    t.is(parser.pageCount, 0);
});

test('malformed lines mid-stream: valid events still returned', async t => {
    const dir = tempDir();
    const file = join(dir, 'mixed.jsonl');
    const lines = [
        JSON.stringify({type: 'run.start', run_id: 'ok-1', timestamp: 1.0, agent_name: 'a'}),
        '{bad json}',
        'not json at all',
        JSON.stringify({type: 'run.end', run_id: 'ok-2', timestamp: 2.0, duration_ms: 1000}),
    ];
    writeFileSync(file, lines.join('\n'));

    const parser = new StreamingTraceParser(file, {pageSize: 10});
    await parser.initialize();

    // Only the 2 valid events should be counted
    t.is(parser.eventCount, 2);
    const page = await parser.getPage(0);
    t.is(page.length, 2);
});
```

**Step 2: Run tests (they may fail if StreamingTraceParser API doesn't match)**
```bash
cd packages/cli && pnpm test 2>&1 | grep -A 5 "streaming-parser.integration"
```

If `StreamingTraceParser` has a different constructor signature, read `packages/cli/src/lib/streaming-parser.ts` lines 1-50 and adjust the test accordingly (check the constructor and public API surface).

**Step 3: Fix any failures (adjust test to match actual API)**

Common adjustments needed:
- Constructor might take `(filePath: string)` only with no options object — check the class definition
- Method might be `analyze()` instead of `initialize()`
- Property might be `totalEvents` instead of `eventCount`

Read the streaming-parser.ts file first, then update test method names to match.

**Step 4: Run full CLI test suite**
```bash
cd packages/cli && pnpm test 2>&1 | tail -5
# Expected: all tests pass (196+ passing)
```

**Step 5: Commit**
```bash
git add packages/cli/src/__tests__/streaming-parser.integration.test.ts
git commit -m "test: add integration tests for streaming parser pagination"
```

---

### Task 6: Add Web Dashboard Error Boundaries

**Context:** Next.js 14 App Router uses `error.tsx` files as React Error Boundaries. Without them, any uncaught render error (bad trace data, missing field, network failure) shows a blank white page with no explanation. We need three: a global one and two route-specific ones.

**Files:**
- Create: `packages/web/src/app/error.tsx`
- Create: `packages/web/src/app/traces/error.tsx`
- Create: `packages/web/src/app/traces/[id]/error.tsx`

**Step 1: Create global error.tsx**

```tsx
// packages/web/src/app/error.tsx
'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to your error tracking service if you have one
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-400 text-sm mb-6">
          An unexpected error occurred. Try refreshing the page.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Create traces/error.tsx**

```tsx
// packages/web/src/app/traces/error.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function TracesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Traces page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Failed to load traces</h2>
      <p className="text-gray-400 text-sm mb-6">
        Could not connect to the trace directory. Make sure Watchtower is configured correctly.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/docs/troubleshooting"
          className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl text-sm font-medium hover:border-white/20 transition-colors"
        >
          Troubleshooting
        </Link>
      </div>
    </div>
  )
}
```

**Step 3: Create traces/[id]/error.tsx**

```tsx
// packages/web/src/app/traces/[id]/error.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function TraceDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Trace detail error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Failed to load trace</h2>
      <p className="text-gray-400 text-sm mb-6">
        This trace could not be loaded. It may have been deleted or is corrupted.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/traces"
          className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl text-sm font-medium hover:border-white/20 transition-colors"
        >
          All traces
        </Link>
      </div>
    </div>
  )
}
```

**Step 4: Verify web builds**
```bash
cd packages/web && pnpm build 2>&1 | tail -5
# Expected: Build completes successfully
```

**Step 5: Commit**
```bash
git add packages/web/src/app/error.tsx \
        packages/web/src/app/traces/error.tsx \
        packages/web/src/app/traces/[id]/error.tsx
git commit -m "feat: add error boundaries to web dashboard (global, traces, trace detail)"
```

---

### Task 7: Fix API Error Exposure + Use TraceListSkeleton

**Context:**
1. Both API routes expose raw `String(error)` in the `details` field — this can leak full stack traces, file paths, or internal error messages to browsers. Replace with a generic message and log the real error server-side.
2. `TraceListSkeleton` in `TraceList.tsx` was built but `traces/page.tsx` doesn't use it — during loading it shows a plain text "Loading traces..." div instead.

**Files:**
- Modify: `packages/web/src/app/api/traces/route.ts:10`
- Modify: `packages/web/src/app/api/traces/[id]/route.ts:17`
- Modify: `packages/web/src/app/traces/page.tsx:54-59`

**Step 1: Fix API error exposure in routes/route.ts**

In `packages/web/src/app/api/traces/route.ts`, change:
```typescript
// BEFORE
    return NextResponse.json(
      {error: 'Failed to list traces', details: String(error)},
      {status: 500}
    );
```
to:
```typescript
// AFTER
    console.error('[API /traces] Failed to list traces:', error);
    return NextResponse.json(
      {error: 'Failed to list traces'},
      {status: 500}
    );
```

**Step 2: Fix API error exposure in traces/[id]/route.ts**

In `packages/web/src/app/api/traces/[id]/route.ts`, change:
```typescript
// BEFORE
    return NextResponse.json(
      {error: 'Failed to read trace', details: String(error)},
      {status: 500}
    );
```
to:
```typescript
// AFTER
    console.error('[API /traces/:id] Failed to read trace:', error);
    return NextResponse.json(
      {error: 'Failed to read trace'},
      {status: 500}
    );
```

**Step 3: Use TraceListSkeleton in traces/page.tsx**

Read `packages/web/src/app/traces/page.tsx` lines 1-10 and add the import.

Add import at the top:
```typescript
import { TraceList, TraceListSkeleton } from '@/components/TraceList'
```

Replace the `isLoading` block (lines 54-59):
```typescript
// BEFORE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400">Loading traces...</div>
      </div>
    )
  }
```
with:
```typescript
// AFTER (in the JSX body, not as an early return — remove the early return)
```

Read the full traces/page.tsx to see the structure, then integrate `TraceListSkeleton` where the trace list is rendered. The pattern is:

In the JSX where `<TraceList>` is rendered, wrap with:
```typescript
{isLoading ? <TraceListSkeleton count={5} /> : <TraceList traces={filteredTraces} />}
```

Remove the early `if (isLoading) return (...)` block and render the full page layout in all states (so the header/filters are always visible).

**Step 4: Verify web builds**
```bash
cd packages/web && pnpm build 2>&1 | tail -5
# Expected: Build completes successfully
```

**Step 5: Commit**
```bash
git add packages/web/src/app/api/traces/route.ts \
        packages/web/src/app/api/traces/[id]/route.ts \
        packages/web/src/app/traces/page.tsx
git commit -m "fix: sanitize API error responses and use TraceListSkeleton during loading"
```

---

### Task 8: Set Up Vitest + Write Initial Web Tests

**Context:** The web package has zero tests and no test framework. Add Vitest (compatible with Next.js 14 without ejecting) and write a minimal-but-meaningful initial test suite for the most critical logic: the trace reader utility and the TraceCard component.

**Files:**
- Modify: `packages/web/package.json`
- Create: `packages/web/vitest.config.ts`
- Create: `packages/web/src/__tests__/trace-reader.test.ts`
- Create: `packages/web/src/__tests__/TraceCard.test.tsx`

**Step 1: Install test dependencies**
```bash
cd packages/web && pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

**Step 2: Add test script to package.json**

In `packages/web/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 3: Create vitest.config.ts**

```typescript
// packages/web/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

**Step 4: Create test setup file**

```typescript
// packages/web/src/__tests__/setup.ts
import '@testing-library/jest-dom'
```

**Step 5: Write trace-reader.test.ts (TDD — write first)**

Read `packages/web/src/lib/trace-reader.ts` to understand the exact function signatures, then write:

```typescript
// packages/web/src/__tests__/trace-reader.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// We test via the API rather than importing directly, since trace-reader
// uses process.env.WATCHTOWER_TRACE_DIR to locate files.

const VALID_EVENT = JSON.stringify({
  type: 'run.start',
  run_id: 'abc123',
  timestamp: 1705315921.0,
  agent_name: 'test_agent',
})

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `wt-web-${Date.now()}-${Math.floor(Math.random() * 1e9)}`)
  mkdirSync(testDir, { recursive: true })
  process.env['WATCHTOWER_TRACE_DIR'] = testDir
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
  delete process.env['WATCHTOWER_TRACE_DIR']
})

describe('listTraces', () => {
  it('returns empty array when directory is empty', async () => {
    const { listTraces } = await import('@/lib/trace-reader')
    const traces = listTraces()
    expect(traces).toEqual([])
  })

  it('parses a valid JSONL trace file', async () => {
    writeFileSync(
      join(testDir, 'run-abc123.jsonl'),
      [
        VALID_EVENT,
        JSON.stringify({ type: 'run.end', run_id: 'abc123', timestamp: 1705315922.0, duration_ms: 1000 }),
      ].join('\n')
    )

    const { listTraces } = await import('@/lib/trace-reader')
    const traces = listTraces()
    expect(traces).toHaveLength(1)
    expect(traces[0]).toMatchObject({
      id: 'abc123',
      agent_name: 'test_agent',
    })
  })

  it('skips malformed JSONL lines without crashing', async () => {
    writeFileSync(
      join(testDir, 'run-xyz.jsonl'),
      [VALID_EVENT, '{bad json}', VALID_EVENT.replace('abc123', 'xyz789')].join('\n')
    )

    const { listTraces } = await import('@/lib/trace-reader')
    // Should not throw; malformed lines are skipped
    expect(() => listTraces()).not.toThrow()
  })
})
```

**Step 6: Run tests to verify setup works**
```bash
cd packages/web && pnpm test 2>&1
# Expected: tests run (some may fail if trace-reader API differs — adjust imports)
```

If `import '@/lib/trace-reader'` fails, check the actual export names in `packages/web/src/lib/trace-reader.ts` and adjust.

**Step 7: Commit**
```bash
git add packages/web/package.json packages/web/vitest.config.ts \
        packages/web/src/__tests__/setup.ts \
        packages/web/src/__tests__/trace-reader.test.ts \
        packages/web/pnpm-lock.yaml 2>/dev/null || true
git commit -m "feat: add Vitest test framework and initial trace-reader tests to web dashboard"
```

---

## PHASE 2: HIGH PRIORITY FIXES

---

### Task 9: Fix CI/CD — CodeQL Python, mypy, .editorconfig, CODEOWNERS

**Files:**
- Modify: `.github/workflows/security.yml:74-77`
- Modify: `.github/workflows/test.yml:192`
- Create: `.editorconfig`
- Create: `.github/CODEOWNERS`

**Step 1: Fix CodeQL to analyze Python**

In `.github/workflows/security.yml`, change the single `analyze` step:
```yaml
# BEFORE
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript"
```
to two separate analyze steps:
```yaml
      - name: Perform CodeQL Analysis (JavaScript)
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript"

      - name: Perform CodeQL Analysis (Python)
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:python"
```

**Step 2: Fix mypy follow-imports**

In `.github/workflows/test.yml`, change line 192:
```yaml
# BEFORE
        run: mypy watchtower/ --ignore-missing-imports --follow-imports=skip
# AFTER
        run: mypy watchtower/ --ignore-missing-imports --follow-imports=normal
```

**Step 3: Create root .editorconfig**

```ini
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{ts,tsx,js,jsx,json,yaml,yml,md}]
indent_style = space
indent_size = 2

[*.py]
indent_style = space
indent_size = 4

[Makefile]
indent_style = tab

[*.sh]
indent_style = space
indent_size = 2
```

**Step 4: Create .github/CODEOWNERS**

```
# CODEOWNERS
# These owners will be requested for review on PRs that modify the listed paths.

# Python SDK
/watchtower/ @Watchtower-Labs/maintainers
/tests/ @Watchtower-Labs/maintainers
/pyproject.toml @Watchtower-Labs/maintainers

# TypeScript CLI
/packages/cli/ @Watchtower-Labs/maintainers

# Web Dashboard
/packages/web/ @Watchtower-Labs/maintainers

# CI/CD and Infrastructure
/.github/ @Watchtower-Labs/maintainers
/scripts/ @Watchtower-Labs/maintainers

# Documentation
/docs/ @Watchtower-Labs/maintainers
/*.md @Watchtower-Labs/maintainers
```

**Step 5: Validate YAML syntax**
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/security.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/test.yml'))"
# Expected: no output (no errors)
```

**Step 6: Commit**
```bash
git add .github/workflows/security.yml .github/workflows/test.yml \
        .editorconfig .github/CODEOWNERS
git commit -m "fix: add CodeQL Python analysis, fix mypy follow-imports, add .editorconfig and CODEOWNERS"
```

---

### Task 10: Fix Next.js CSP — Remove unsafe-eval

**Context:** The Content-Security-Policy in `packages/web/next.config.js` includes `'unsafe-eval'` in `script-src`, which defeats XSS protection. Next.js 14 in production mode does NOT require `unsafe-eval` — only development mode does for hot reload. Remove it from the static config.

**Files:**
- Modify: `packages/web/next.config.js:31`

**Step 1: Update the CSP script-src directive**

In `packages/web/next.config.js`, change:
```javascript
// BEFORE
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
```
to:
```javascript
// AFTER
      "script-src 'self' 'unsafe-inline'",
```

**Step 2: Verify build still succeeds**
```bash
cd packages/web && pnpm build 2>&1 | tail -10
# Expected: Build completes successfully
# Note: if you see eval-related errors, it means a dependency uses eval
# In that case, add a comment explaining why and keep it but note the finding
```

**Step 3: Commit**
```bash
git add packages/web/next.config.js
git commit -m "fix: remove unsafe-eval from Next.js CSP script-src"
```

---

### Task 11: Fix Python SDK Silent Failures

**Context:** Three Python SDK issues cause silently wrong behavior:
1. `openai.py:255` — JSON parse failure in tool call args uses `pass`, keeping args as raw string
2. `config.py:87` — catches all exceptions and silently uses defaults, hiding YAML syntax errors
3. `google_adk.py:317` — `int(getattr(..., 0) or 0)` is fragile when the attribute is None

**Files:**
- Modify: `watchtower/adapters/openai.py:253-256`
- Modify: `watchtower/config.py:87-89`
- Modify: `watchtower/adapters/google_adk.py:311-319`
- Test: `tests/test_adapters_openai.py`

**Step 1: Write failing test for tool call JSON parse logging**

Add to `tests/test_adapters_openai.py`:
```python
def test_tool_call_json_parse_failure_is_logged(caplog):
    """When tool_call.function.arguments is invalid JSON, a warning should be logged."""
    import logging
    pytest.importorskip("openai")
    from unittest.mock import MagicMock, patch
    from watchtower.adapters.openai import OpenAIObserver

    observer = OpenAIObserver.__new__(OpenAIObserver)
    # Build a mock response with invalid JSON args
    tool_call = MagicMock()
    tool_call.id = "call_123"
    tool_call.function.name = "search"
    tool_call.function.arguments = "{invalid json"

    message = MagicMock()
    message.tool_calls = [tool_call]

    response = MagicMock()
    response.choices = [MagicMock(message=message)]

    with caplog.at_level(logging.WARNING, logger="watchtower.adapters.openai"):
        result = observer._extract_tool_calls(response)

    assert len(result) == 1
    assert isinstance(result[0]["tool_args"], str)  # kept as string
    assert "Failed to parse" in caplog.text or "tool_call" in caplog.text
```

**Step 2: Run to verify it fails**
```bash
python3 -m pytest tests/test_adapters_openai.py::test_tool_call_json_parse_failure_is_logged -v
# Expected: FAIL (no warning logged currently)
```

**Step 3: Fix openai.py silent pass**

In `watchtower/adapters/openai.py`, change:
```python
# BEFORE
                except (ValueError, TypeError):
                    pass  # Keep as string if not valid JSON
```
to:
```python
# AFTER
                except (ValueError, TypeError) as json_err:
                    logger.warning(
                        "Failed to parse tool_call arguments as JSON for tool '%s': %s",
                        tool_call.function.name,
                        json_err,
                    )
                    # Keep as raw string so caller can inspect
```

**Step 4: Fix config.py exception handling**

In `watchtower/config.py`, change:
```python
# BEFORE
        except Exception as e:
            logger.warning("Failed to load config from %s: %s", config_file, e)
            return cls()
```
to:
```python
# AFTER
        except yaml.YAMLError as e:
            logger.warning(
                "Config file %s has a YAML syntax error and will be ignored: %s",
                config_file,
                e,
            )
            return cls()
        except (TypeError, ValueError) as e:
            logger.warning(
                "Config file %s has invalid values and will be ignored: %s",
                config_file,
                e,
            )
            return cls()
        except Exception as e:
            logger.warning("Failed to load config from %s: %s", config_file, e)
            return cls()
```

Note: This requires `yaml` to be imported at the top. The current code imports yaml inside the try block — move it or duplicate the except. The simplest fix is to keep the `import yaml` inside the try and only reach `yaml.YAMLError` if yaml is available. Structure it as:

```python
        try:
            import yaml  # type: ignore[import-untyped]
            with open(config_file, "r") as f:
                config_data = yaml.safe_load(f)
            if config_data is None:
                return cls()  # Empty YAML file
            return cls(**config_data)
        except ImportError:
            return cls()
        except yaml.YAMLError as e:
            logger.warning(
                "Config file %s has a YAML syntax error: %s. Using defaults.",
                config_file,
                e,
            )
            return cls()
        except (TypeError, ValueError) as e:
            logger.warning(
                "Config file %s has invalid values: %s. Using defaults.",
                config_file,
                e,
            )
            return cls()
        except Exception as e:
            logger.warning("Failed to load config from %s: %s", config_file, e)
            return cls()
```

**Step 5: Fix _safe_token_count in google_adk.py**

In `watchtower/adapters/google_adk.py`, replace `_safe_token_count`:
```python
    def _safe_token_count(self, llm_response: Any, token_type: str) -> int:
        """Safely extract token count from LLM response."""
        try:
            usage = getattr(llm_response, "usage", None)
            if usage is None:
                return 0
            if isinstance(usage, dict):
                val = usage.get(f"{token_type}_token_count", 0)
            else:
                val = getattr(usage, f"{token_type}_token_count", 0)
            if val is None:
                return 0
            return int(val)
        except (AttributeError, KeyError, TypeError, ValueError):
            return 0
```

**Step 6: Run tests**
```bash
python3 -m pytest tests/ -q
# Expected: all tests pass
```

**Step 7: Commit**
```bash
git add watchtower/adapters/openai.py watchtower/config.py \
        watchtower/adapters/google_adk.py tests/test_adapters_openai.py
git commit -m "fix: log tool call JSON parse failures, improve config error messages, fix _safe_token_count"
```

---

### Task 12: Make CLI MAX_EVENTS_BUFFER Configurable

**Context:** `MAX_EVENTS_BUFFER = 500` in `tail.tsx` is a module-level constant. For users running long agent sessions (>500 events), the live view silently drops earlier events. Expose this as `liveMaxBuffer` in the CLI config so users can increase it.

**Files:**
- Modify: `packages/cli/src/lib/types.ts:208-228`
- Modify: `packages/cli/src/commands/tail.tsx:25`
- Test: `packages/cli/src/__tests__/config.test.ts` (if exists, otherwise skip test step)

**Step 1: Add liveMaxBuffer to CliConfig interface**

In `packages/cli/src/lib/types.ts`, add to the `CliConfig` interface:
```typescript
export interface CliConfig {
    theme: 'dark' | 'light' | 'minimal';
    maxEvents: number;
    timestampFormat: 'relative' | 'absolute' | 'unix';
    defaultPython: string;
    liveMaxEventsPerSecond: number;
    liveBurstSize: number;
    showPageSize: number;
    liveMaxBuffer: number;       // <-- add this line
    keybindings?: Partial<KeyBindings>;
}
```

Also add default value in `defaultConfig`:
```typescript
export const defaultConfig: CliConfig = {
    theme: 'dark',
    maxEvents: 1000,
    timestampFormat: 'relative',
    defaultPython: 'python3',
    liveMaxEventsPerSecond: 120,
    liveBurstSize: 30,
    showPageSize: 200,
    liveMaxBuffer: 500,          // <-- add this line
};
```

**Step 2: Use config value in tail.tsx**

In `packages/cli/src/commands/tail.tsx`, change:
```typescript
// BEFORE (line 25)
const MAX_EVENTS_BUFFER = 500;
```
to:
```typescript
// AFTER — read from config inside the component, remove module-level const
// (The component already calls getConfig() at line 38)
```

Inside `TailCommand`, after `const config = getConfig();`:
```typescript
const maxEventsBuffer = config.liveMaxBuffer ?? 500;
```

Then replace all uses of `MAX_EVENTS_BUFFER` in the file with `maxEventsBuffer`.

**Step 3: Build and verify**
```bash
cd packages/cli && pnpm build 2>&1 | grep -i error
# Expected: no errors
```

**Step 4: Commit**
```bash
git add packages/cli/src/lib/types.ts packages/cli/src/commands/tail.tsx
git commit -m "feat: make MAX_EVENTS_BUFFER configurable via liveMaxBuffer config key"
```

---

### Task 13: Replace Critical `as` Assertions in CLI Parser

**Context:** The CLI parser uses `as` casts to access optional fields on partially-typed events without checking that the fields exist first. The 5 most dangerous sites are where downstream code uses the value directly (not just for display).

**Files:**
- Modify: `packages/cli/src/lib/parser.ts` (key assertion sites)
- Modify: `packages/cli/src/lib/streaming-parser.ts` (key assertion sites)

**Step 1: Read parser.ts to find the assertion sites**

Run:
```bash
grep -n " as {" packages/cli/src/lib/parser.ts | head -20
```

For each site that accesses `agent_name`, `tool_name`, `total_tokens`, `duration_ms`, or `model`:

**Pattern to replace:**
```typescript
// BEFORE (dangerous)
const agentName = (event as {agent_name?: string}).agent_name;

// AFTER (safe)
const agentName = typeof (event as Record<string, unknown>).agent_name === 'string'
    ? (event as Record<string, unknown>).agent_name as string
    : undefined;
```

Or even simpler using a helper — add this at the top of parser.ts:
```typescript
function getStringField(event: TraceEvent, field: string): string | undefined {
    const val = (event as Record<string, unknown>)[field];
    return typeof val === 'string' ? val : undefined;
}

function getNumberField(event: TraceEvent, field: string): number | undefined {
    const val = (event as Record<string, unknown>)[field];
    return typeof val === 'number' ? val : undefined;
}
```

Then use these helpers throughout instead of `as` assertions.

**Step 2: Apply the helpers for the top 5 most dangerous accesses**

Focus on these specific patterns (read parser.ts to find exact lines):
1. `agent_name` access on `run.start` events
2. `tool_name` access on `tool.start`/`tool.end` events
3. `total_tokens` access on `llm.response` events
4. `duration_ms` access on `run.end`/`tool.end` events
5. `model` access on `llm.request` events

**Step 3: Build and test**
```bash
cd packages/cli && pnpm build && pnpm test 2>&1 | tail -5
# Expected: build succeeds, all tests pass
```

**Step 4: Commit**
```bash
git add packages/cli/src/lib/parser.ts packages/cli/src/lib/streaming-parser.ts
git commit -m "fix: replace critical unsafe `as` assertions with validated field access in parser"
```

---

### Task 14: Refactor tail.tsx handleEvent to useReducer

**Context:** `handleEvent` in `tail.tsx` updates state via `setState({...prev, field: newVal})` on every incoming event. For high-frequency live streams (>100 events/sec), this creates a new object on every state update and triggers a full React re-render. Using `useReducer` with named actions avoids unnecessary object allocation.

**Files:**
- Modify: `packages/cli/src/commands/tail.tsx`

**Step 1: Read tail.tsx to understand the state shape**
```bash
head -80 packages/cli/src/commands/tail.tsx
```

Identify all the state variables being updated in `handleEvent` (e.g. `setAgents`, `setModels`, `setTools`, `setStats`).

**Step 2: Create a reducer for live state**

Add the reducer near the top of the file (after imports):
```typescript
type LiveState = {
    events: TraceEvent[];
    agents: AgentInfo[];
    models: ModelInfo[];
    tools: ToolInfo[];
    currentRunId: string | null;
};

type LiveAction =
    | {type: 'ADD_EVENT'; event: TraceEvent}
    | {type: 'RESET'};

function liveReducer(state: LiveState, action: LiveAction): LiveState {
    switch (action.type) {
        case 'ADD_EVENT': {
            const events = state.events.length >= maxEventsBuffer
                ? [...state.events.slice(1), action.event]
                : [...state.events, action.event];
            return {...state, events};
        }
        case 'RESET':
            return {events: [], agents: [], models: [], tools: [], currentRunId: null};
        default:
            return state;
    }
}
```

Note: `maxEventsBuffer` will need to be passed in or derived from config. Adjust as needed based on the actual component structure.

**Step 3: Replace individual setStates with dispatch**

Replace calls like:
```typescript
setEvents(prev => [...prev.slice(-maxEventsBuffer), event]);
```
with:
```typescript
dispatch({type: 'ADD_EVENT', event});
```

**Step 4: Build and test**
```bash
cd packages/cli && pnpm build && pnpm test 2>&1 | tail -5
# Expected: passes
```

**Step 5: Commit**
```bash
git add packages/cli/src/commands/tail.tsx
git commit -m "perf: refactor tail.tsx event state to useReducer to reduce object allocation"
```

---

### Task 15: Fix readline Cleanup in useProcessStream

**Context:** In `packages/cli/src/hooks/useProcessStream.ts`, `readline.createInterface` is created to read process stdout/stderr. The normal cleanup path closes it, but if an error is thrown mid-stream, the readline interface is never closed, leaking a handle.

**Files:**
- Modify: `packages/cli/src/hooks/useProcessStream.ts:141`

**Step 1: Read the relevant section**
```bash
sed -n '130,175p' packages/cli/src/hooks/useProcessStream.ts
```

**Step 2: Wrap readline creation in try/finally**

Find where `readline.createInterface` is called and ensure it's closed in a `finally` block:

```typescript
// BEFORE pattern:
const rl = readline.createInterface({input: stream});
try {
    for await (const line of rl) {
        // ...
    }
} catch (err) {
    // rl never closed here!
    throw err;
}

// AFTER pattern:
const rl = readline.createInterface({input: stream});
try {
    for await (const line of rl) {
        // ...
    }
} catch (err) {
    throw err;
} finally {
    rl.close();  // Always close, even on error
}
```

**Step 3: Build and test**
```bash
cd packages/cli && pnpm build && pnpm test 2>&1 | tail -5
# Expected: passes
```

**Step 4: Commit**
```bash
git add packages/cli/src/hooks/useProcessStream.ts
git commit -m "fix: ensure readline.createInterface is closed in error path of useProcessStream"
```

---

### Task 16: Add Metadata to Traces Pages + aria-expanded to Header

**Context:**
1. `/traces` and `/traces/[id]` pages have no `<meta>` tags — bad for any link preview or search indexing
2. The mobile hamburger button in `Header.tsx` is missing `aria-expanded`, required for screen reader users to know if the menu is open

**Files:**
- Modify: `packages/web/src/app/traces/page.tsx`
- Modify: `packages/web/src/app/traces/[id]/page.tsx`
- Modify: `packages/web/src/components/layout/Header.tsx`

**Step 1: Read Header.tsx to understand the mobile menu state**

Check if there's already an `isMenuOpen` state variable:
```bash
grep -n "useState\|isMenu\|menuOpen" packages/web/src/components/layout/Header.tsx | head -10
```

**Step 2: Add aria-expanded to Header mobile button**

In `packages/web/src/components/layout/Header.tsx`, find the mobile menu button (around line 90):
```tsx
// BEFORE
<button className="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
```

If there's no menu open state, add one:
```tsx
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
```

Then on the button:
```tsx
// AFTER
<button
  className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
  aria-label="Toggle navigation menu"
  aria-expanded={isMobileMenuOpen}
  onClick={() => { setIsMobileMenuOpen(prev => !prev) }}
>
```

**Step 3: Add metadata export to traces/page.tsx**

Since `traces/page.tsx` is a Client Component (`'use client'`), metadata must be in a separate file or removed from client components. The correct Next.js 14 approach for client pages is to create a separate `layout.tsx` or use a server component wrapper.

Simplest approach: Create `packages/web/src/app/traces/layout.tsx`:
```tsx
// packages/web/src/app/traces/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recent Traces - Watchtower',
  description: 'Browse and inspect your AI agent trace files.',
}

export default function TracesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

**Step 4: Add metadata for traces/[id]**

Create `packages/web/src/app/traces/[id]/layout.tsx`:
```tsx
// packages/web/src/app/traces/[id]/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trace Detail - Watchtower',
  description: 'Inspect a single AI agent trace with timeline and event breakdown.',
}

export default function TraceDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

**Step 5: Build and verify**
```bash
cd packages/web && pnpm build 2>&1 | tail -5
# Expected: Build succeeds
```

**Step 6: Commit**
```bash
git add packages/web/src/app/traces/layout.tsx \
        packages/web/src/app/traces/[id]/layout.tsx \
        packages/web/src/components/layout/Header.tsx
git commit -m "feat: add traces page metadata, fix aria-expanded on mobile menu"
```

---

### Task 17: Code-Split Framer Motion + Suspense for Trace List

**Context:**
1. Framer Motion is loaded synchronously on every page import, adding to the initial bundle. Deferring it for the heaviest marketing components reduces Time to Interactive.
2. The traces page renders `<TraceListSkeleton />` during loading, but there's no `<Suspense>` boundary — adding one makes the loading state more explicit and future-proof.

**Files:**
- Modify: `packages/web/src/components/HeroBackground.tsx`
- Modify: `packages/web/src/app/traces/page.tsx`

**Step 1: Read HeroBackground.tsx to understand its framer-motion usage**
```bash
head -20 packages/web/src/components/HeroBackground.tsx
```

**Step 2: Wrap motion in dynamic import for HeroBackground**

If the component uses `motion` directly from framer-motion and can be rendered client-side only, the simplest approach is to add `'use client'` and ensure it's only imported with `next/dynamic` from its parent:

In any parent that imports `HeroBackground` (check `packages/web/src/app/page.tsx`):
```tsx
// BEFORE
import { HeroBackground } from '@/components/HeroBackground'

// AFTER
import dynamic from 'next/dynamic'
const HeroBackground = dynamic(() => import('@/components/HeroBackground').then(m => m.HeroBackground), {
  ssr: false,
  loading: () => null,
})
```

**Step 3: Add POLL_INTERVAL_MS constant to traces/page.tsx**

At the top of `packages/web/src/app/traces/page.tsx`, after imports, add:
```typescript
const POLL_INTERVAL_MS = 5_000
```

Then replace the hardcoded `5000`:
```typescript
// BEFORE
  refreshInterval: 5000,
// AFTER
  refreshInterval: POLL_INTERVAL_MS,
```

**Step 4: Build and verify bundle**
```bash
cd packages/web && pnpm build 2>&1 | grep -E "chunks|Page|error"
# Expected: Build succeeds, note any bundle size changes
```

**Step 5: Commit**
```bash
git add packages/web/src/app/page.tsx \
        packages/web/src/app/traces/page.tsx
git commit -m "perf: code-split HeroBackground framer-motion, extract POLL_INTERVAL_MS constant"
```

---

## PHASE 3: MEDIUM PRIORITY FIXES

---

### Task 18: Add Dependabot + GitHub Release Notes Workflow

**Files:**
- Create: `.github/dependabot.yml`
- Create: `.github/workflows/release-notes.yml`

**Step 1: Create Dependabot config**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/packages/cli"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "cli"

  - package-ecosystem: "npm"
    directory: "/packages/web"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "web"

  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "python"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "ci"
```

**Step 2: Create release-notes.yml**

```yaml
# .github/workflows/release-notes.yml
name: Create GitHub Release

on:
  push:
    tags:
      - 'sdk-v*'
      - 'cli-v*'

permissions:
  contents: write

jobs:
  release:
    name: Create Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          draft: false
          prerelease: false
```

**Step 3: Validate YAML**
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release-notes.yml'))"
# Expected: no output
```

**Step 4: Commit**
```bash
git add .github/dependabot.yml .github/workflows/release-notes.yml
git commit -m "ci: add Dependabot config and GitHub Release auto-generation workflow"
```

---

### Task 19: Remove Redundant requirements.txt Files

**Context:** `requirements.txt` and `requirements-dev.txt` exist alongside `pyproject.toml` which already declares all dependencies. This creates maintenance burden and potential version drift.

**Files:**
- Delete: `requirements.txt`
- Delete: `requirements-dev.txt`
- Modify: `CONTRIBUTING.md` (update install instructions)
- Modify: `README.md` (if references requirements.txt)

**Step 1: Check what's in both files**
```bash
cat requirements.txt
cat requirements-dev.txt
```

Compare against pyproject.toml `[project.dependencies]` and `[project.optional-dependencies]` to confirm all deps are covered.

**Step 2: Verify pyproject.toml has all deps**

The dev install command `pip install -e ".[dev]"` must install all development tools. Check `pyproject.toml` for `[project.optional-dependencies]` with a `dev` group.

**Step 3: Delete the files**
```bash
git rm requirements.txt requirements-dev.txt
```

**Step 4: Update CONTRIBUTING.md**

Find any references to `pip install -r requirements.txt` or `pip install -r requirements-dev.txt` and replace with:
```bash
pip install -e ".[dev]"
```

**Step 5: Run tests to confirm nothing broke**
```bash
python3 -m pytest tests/ -q
# Expected: all tests pass (deps already installed)
```

**Step 6: Commit**
```bash
git add CONTRIBUTING.md README.md
git commit -m "chore: remove redundant requirements.txt files, use pyproject.toml exclusively"
```

---

### Task 20: Add OpenAI Adapter Tests

**Context:** The OpenAI adapter currently has minimal test coverage. Add 5 tests covering the key behaviors.

**Files:**
- Modify: `tests/test_adapters_openai.py`

**Step 1: Write the full test suite**

Add to `tests/test_adapters_openai.py` (building on tests from Task 3):

```python
def test_observe_llm_call_returns_response(tmp_path):
    """LLM call should return a trace event with token counts."""
    pytest.importorskip("openai")
    from unittest.mock import MagicMock
    from watchtower.adapters.openai import OpenAIObserver
    from watchtower import WatchtowerConfig

    config = WatchtowerConfig(trace_dir=str(tmp_path))
    observer = OpenAIObserver.__new__(OpenAIObserver)
    observer.config = config
    observer.model = "gpt-4o"
    observer.sanitize = False
    from watchtower.writers.file_writer import FileWriter
    observer.file_writer = FileWriter(config)

    # Build a minimal mock OpenAI response
    mock_response = MagicMock()
    mock_response.id = "chatcmpl-test"
    mock_response.model = "gpt-4o"
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 20
    mock_response.usage.total_tokens = 30
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.tool_calls = None
    mock_response.choices[0].message.content = "Hello"

    event = observer.observe_llm_call(
        request=[{"role": "user", "content": "Hi"}],
        response=mock_response
    )
    assert event is not None
    assert event.total_tokens == 30


def test_observe_llm_call_writes_trace_file(tmp_path):
    """LLM call should write an event to the trace JSONL file."""
    pytest.importorskip("openai")
    import os
    from unittest.mock import MagicMock
    from watchtower.adapters.openai import OpenAIObserver
    from watchtower import WatchtowerConfig

    config = WatchtowerConfig(trace_dir=str(tmp_path))
    observer = OpenAIObserver(config=config)

    mock_response = MagicMock()
    mock_response.id = "chatcmpl-test"
    mock_response.model = "gpt-4o"
    mock_response.usage.prompt_tokens = 5
    mock_response.usage.completion_tokens = 10
    mock_response.usage.total_tokens = 15
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.tool_calls = None
    mock_response.choices[0].message.content = "Response"

    observer.observe_run_start({"agent_name": "test"})
    observer.observe_llm_call(
        request=[{"role": "user", "content": "Hi"}],
        response=mock_response
    )
    observer.file_writer.flush()

    # Find the trace file
    files = [f for f in os.listdir(tmp_path) if f.endswith('.jsonl')]
    assert len(files) == 1


def test_api_error_propagates(tmp_path):
    """API errors raised by the OpenAI client should propagate."""
    pytest.importorskip("openai")
    from unittest.mock import MagicMock, patch
    from watchtower.adapters.openai import OpenAIObserver
    from watchtower import WatchtowerConfig
    import openai

    config = WatchtowerConfig(trace_dir=str(tmp_path))
    observer = OpenAIObserver.__new__(OpenAIObserver)
    observer.config = config
    observer.model = "gpt-4o"
    observer.sanitize = False

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = openai.APIConnectionError(
        request=MagicMock()
    )
    observer.client = mock_client
    from watchtower.writers.file_writer import FileWriter
    observer.file_writer = FileWriter(config)

    with pytest.raises(openai.APIConnectionError):
        observer.observe_llm_call(
            request=[{"role": "user", "content": "Hi"}],
        )
```

**Step 2: Run tests**
```bash
python3 -m pytest tests/test_adapters_openai.py -v
# Expected: all tests pass (some may be skipped if openai not installed)
```

**Step 3: Commit**
```bash
git add tests/test_adapters_openai.py
git commit -m "test: add comprehensive OpenAI adapter test coverage"
```

---

### Task 21: Threading Concurrency Test + StateChangeEvent TODOs

**Files:**
- Modify: `tests/test_file_writer_advanced.py`
- Modify: `watchtower/plugin.py` (add TODO comment)

**Step 1: Write threading concurrency test**

Add to `tests/test_file_writer_advanced.py`:
```python
def test_concurrent_writes_no_data_loss(tmp_path):
    """Multiple threads writing simultaneously should not lose or corrupt events."""
    import threading
    import json
    from watchtower import WatchtowerConfig
    from watchtower.writers.file_writer import FileWriter

    config = WatchtowerConfig(trace_dir=str(tmp_path))
    writer = FileWriter(config)

    THREADS = 10
    EVENTS_PER_THREAD = 50
    errors = []

    def write_events(thread_id: int):
        try:
            for i in range(EVENTS_PER_THREAD):
                writer.write({
                    "type": "run.start",
                    "run_id": f"run-{thread_id}-{i}",
                    "timestamp": 1705315921.0 + i,
                    "agent_name": f"agent-{thread_id}",
                })
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=write_events, args=(i,)) for i in range(THREADS)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    writer.flush()
    assert not errors, f"Threads raised errors: {errors}"

    # Count lines in trace files
    import os
    total_lines = 0
    for fname in os.listdir(tmp_path):
        if fname.endswith('.jsonl'):
            with open(os.path.join(tmp_path, fname)) as f:
                lines = [l for l in f if l.strip()]
                # Validate each line is valid JSON
                for line in lines:
                    json.loads(line)  # Should not raise
                total_lines += len(lines)

    assert total_lines == THREADS * EVENTS_PER_THREAD, (
        f"Expected {THREADS * EVENTS_PER_THREAD} events, got {total_lines}"
    )
```

**Step 2: Run the test**
```bash
python3 -m pytest tests/test_file_writer_advanced.py::test_concurrent_writes_no_data_loss -v
# Expected: PASS
```

**Step 3: Add StateChangeEvent TODO comments**

Find where state changes could be emitted in `watchtower/plugin.py`:
```bash
grep -n "state\|StateChange\|AgentTransfer" watchtower/plugin.py | head -10
```

Add a comment at the relevant location:
```python
# TODO(#issue): StateChangeEvent and AgentTransferEvent are defined in models/events.py
# but are not yet emitted here. To implement, capture agent state before/after tool calls
# and emit StateChangeEvent when state differs. See models/events.py for the schema.
```

**Step 4: Commit**
```bash
git add tests/test_file_writer_advanced.py watchtower/plugin.py
git commit -m "test: add threading concurrency test for FileWriter; add StateChangeEvent TODO"
```

---

### Task 22: CLI Help Overlay + Config Error Visibility

**Files:**
- Modify: `packages/cli/src/components/HelpOverlay.tsx`
- Modify: `packages/cli/src/components/SearchBar.tsx`
- Modify: `packages/cli/src/commands/config.tsx`

**Step 1: Read HelpOverlay.tsx to find where to add entries**
```bash
grep -n "1-9\|select\|agent\|keyboard" packages/cli/src/components/HelpOverlay.tsx -i | head -20
```

**Step 2: Add agent selection and Ctrl+A to HelpOverlay**

Find the section listing keyboard shortcuts and add:
- `1-9` → `Select agent` (in the agent/view navigation section)
- `Ctrl+A` → `Beginning of line` (in the search/input section)

The exact location depends on the component structure. Look for where `j/k`, arrow keys, and `Ctrl+U` are documented and add nearby.

**Step 3: Add Ctrl+A support to SearchBar.tsx**

In `packages/cli/src/components/SearchBar.tsx`, find the `useInput` handler for `Ctrl+U` and add `Ctrl+A`:

```typescript
if (key.ctrl && input === 'a') {
    // Move cursor to beginning of line (set cursor position to 0)
    // SearchBar likely tracks cursor position; if not, this is a display hint only
    return;
}
```

If SearchBar doesn't track a cursor position, at minimum add the key binding to the help hint text.

**Step 4: Fix config.tsx to show error if config fails**

Read `packages/cli/src/commands/config.tsx` lines 1-50 to understand the structure.

Find where `getConfig()` or `loadConfig()` is called and wrap it:
```typescript
// BEFORE
const config = getConfig();

// AFTER
let config: CliConfig;
let configError: string | null = null;
try {
    config = getConfig();
} catch (err) {
    config = defaultConfig;
    configError = err instanceof Error ? err.message : String(err);
}
```

Then in the JSX, if `configError` is set, render:
```tsx
{configError && (
    <Box marginBottom={1}>
        <Text color="yellow">⚠ Config error: {configError}. Using defaults.</Text>
    </Box>
)}
```

**Step 5: Build and test**
```bash
cd packages/cli && pnpm build && pnpm test 2>&1 | tail -5
# Expected: passes
```

**Step 6: Commit**
```bash
git add packages/cli/src/components/HelpOverlay.tsx \
        packages/cli/src/components/SearchBar.tsx \
        packages/cli/src/commands/config.tsx
git commit -m "feat: add agent selection + Ctrl+A to help overlay, show config error in UI"
```

---

### Task 23: CLI Symlink Safety + EventLine ASCII Fallback

**Files:**
- Modify: `packages/cli/src/lib/paths.ts`
- Modify: `packages/cli/src/components/EventLine.tsx`

**Step 1: Read paths.ts to find realpathSync usage**
```bash
grep -n "realpathSync\|realpath" packages/cli/src/lib/paths.ts
```

**Step 2: Wrap realpathSync with timeout protection**

```typescript
// BEFORE
const realPath = fs.realpathSync(filePath);

// AFTER
function realpathWithFallback(filePath: string): string {
    try {
        // realpathSync can hang on circular symlinks on some systems
        return fs.realpathSync(filePath);
    } catch {
        // If resolution fails, use the unresolved path
        return filePath;
    }
}
```

Replace calls to `fs.realpathSync` with `realpathWithFallback`.

**Step 3: Read EventLine.tsx to find icon usage**
```bash
grep -n "icon\|ascii\|NO_COLOR" packages/cli/src/components/EventLine.tsx
```

**Step 4: Add NO_COLOR detection to EventLine**

Find where `eventIcons` is used (the Unicode box character version) and add a check:
```typescript
// At module level or inside component:
const useAsciiIcons = Boolean(process.env['NO_COLOR']) || process.env['TERM'] === 'dumb';

// Then when rendering:
const icon = useAsciiIcons ? eventIconsAscii[event.type] : eventIcons[event.type];
```

Note: if `eventIconsAscii` doesn't exist by that name, read the file to find the ASCII fallback map name.

**Step 5: Build and test**
```bash
cd packages/cli && pnpm build && pnpm test 2>&1 | tail -5
# Expected: passes
```

**Step 6: Commit**
```bash
git add packages/cli/src/lib/paths.ts packages/cli/src/components/EventLine.tsx
git commit -m "fix: protect realpathSync from circular symlinks, use ASCII icons when NO_COLOR is set"
```

---

### Task 24: Add robots.ts + sitemap.ts to Web Dashboard

**Files:**
- Create: `packages/web/src/app/robots.ts`
- Create: `packages/web/src/app/sitemap.ts`

**Step 1: Create robots.ts**

```typescript
// packages/web/src/app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://watchtower.dev/sitemap.xml',
  }
}
```

**Step 2: Create sitemap.ts**

```typescript
// packages/web/src/app/sitemap.ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://watchtower.dev'

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/docs/quickstart`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/installation`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/sdk`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/cli/show`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/cli/tail`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/cli/list`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/docs/cli/config`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/docs/troubleshooting`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}
```

**Step 3: Verify build**
```bash
cd packages/web && pnpm build 2>&1 | tail -5
# Expected: Build completes. Next.js will serve /robots.txt and /sitemap.xml from these files.
```

**Step 4: Commit**
```bash
git add packages/web/src/app/robots.ts packages/web/src/app/sitemap.ts
git commit -m "feat: add robots.ts and sitemap.ts to web dashboard"
```

---

### Task 25: Web — aria-expanded, will-change, ID Validation, Form Labels

**Context:** Four small accessibility and security fixes for the web dashboard.

**Files:**
- Modify: `packages/web/src/components/TimelineView.tsx`
- Modify: `packages/web/src/components/HeroBackground.tsx`
- Modify: `packages/web/src/app/api/traces/[id]/route.ts`
- Modify: `packages/web/src/app/traces/page.tsx`

**Step 1: Add aria-expanded to TimelineView event toggles**

Read `packages/web/src/components/TimelineView.tsx` to find the event detail toggle buttons.

For each expandable event button, add:
```tsx
// BEFORE
<button onClick={() => setExpanded(id)}>

// AFTER
<button
  onClick={() => setExpanded(id)}
  aria-expanded={expandedId === id}
  aria-controls={`event-detail-${id}`}
>
```

And add matching `id` to the detail panel:
```tsx
<div id={`event-detail-${id}`}>
  {/* event detail content */}
</div>
```

**Step 2: Add will-change to HeroBackground animated blobs**

Read `packages/web/src/components/HeroBackground.tsx` to find the animated blob elements.

Add `style={{ willChange: 'transform' }}` (or via Tailwind `will-change-transform` class) to the elements that have `animate` props with position/scale changes.

**Step 3: Add trace ID validation to [id]/route.ts**

In `packages/web/src/app/api/traces/[id]/route.ts`, add validation after destructuring `id`:

```typescript
const {id} = await params;

// Validate ID format to prevent path traversal
if (!/^[\w-]+$/.test(id)) {
  return NextResponse.json({error: 'Invalid trace ID'}, {status: 400});
}
```

**Step 4: Add form labels to traces/page.tsx**

Read `packages/web/src/app/traces/page.tsx` to find the search input and agent filter select.

For the search input, add a `<label>`:
```tsx
// BEFORE
<input
  placeholder="Search traces..."
  ...
/>

// AFTER
<label htmlFor="trace-search" className="sr-only">Search traces</label>
<input
  id="trace-search"
  placeholder="Search traces..."
  ...
/>
```

For the agent filter select:
```tsx
// BEFORE
<select ...>

// AFTER
<label htmlFor="agent-filter" className="sr-only">Filter by agent</label>
<select id="agent-filter" ...>
```

(`sr-only` is Tailwind for visually-hidden but accessible to screen readers.)

**Step 5: Build and test**
```bash
cd packages/web && pnpm build 2>&1 | tail -5
pnpm test 2>&1 | tail -5
# Expected: both pass
```

**Step 6: Full suite verification**
```bash
# Run all test suites from repo root
python3 -m pytest tests/ -q && echo "Python: OK"
cd packages/cli && pnpm test 2>&1 | tail -3 && echo "CLI: OK"
cd ../web && pnpm test 2>&1 | tail -3 && echo "Web: OK"
```

**Step 7: Final commit**
```bash
git add packages/web/src/components/TimelineView.tsx \
        packages/web/src/components/HeroBackground.tsx \
        packages/web/src/app/api/traces/[id]/route.ts \
        packages/web/src/app/traces/page.tsx
git commit -m "fix: add aria-expanded, will-change hints, trace ID validation, form labels"
```

---

## Final Verification

After all 25 tasks:

```bash
# 1. Python tests
python3 -m pytest tests/ -v 2>&1 | tail -10
# Expected: 42+ passed, 0 failed

# 2. CLI build + tests
cd packages/cli && pnpm build && pnpm test 2>&1 | tail -5
# Expected: 200+ tests passing

# 3. Web build + tests
cd ../web && pnpm build && pnpm test 2>&1 | tail -5
# Expected: build succeeds, vitest tests passing

# 4. Verify no ruff errors
ruff check watchtower/ tests/ --output-format=github

# 5. Verify mypy
mypy watchtower/ --ignore-missing-imports --follow-imports=normal 2>&1 | tail -5
```
