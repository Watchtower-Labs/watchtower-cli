# Known Issues & Improvement Tracker

This document tracks known issues, bugs, and improvement opportunities for the Watchtower project.

**Last Updated:** January 2025
**Total Issues:** 62 (5 Critical fixed, 57 remaining)

---

## Table of Contents

- [Critical Issues](#critical-issues)
- [Code Quality](#code-quality)
- [Security](#security)
- [Cross-Platform Compatibility](#cross-platform-compatibility)
- [Performance](#performance)
- [Missing Features](#missing-features)
- [CLI UX](#cli-ux)
- [SDK Limitations](#sdk-limitations)
- [Documentation](#documentation)
- [Testing Gaps](#testing-gaps)
- [Operational Concerns](#operational-concerns)

---

## Critical Issues

Issues that should be fixed before v1.0 release.

### ~~CRIT-001: Unconstrained google-adk dependency version~~ ✅ FIXED
- **Severity:** 🔴 Critical
- **Component:** Python SDK
- **File:** `pyproject.toml`
- **Status:** ✅ Fixed - Changed to `google-adk>=0.1.0,<1.0.0`
- **Description:** The dependency `google-adk>=0.1.0` has no upper bound, allowing any future version including breaking changes.
- **Impact:** Future google-adk releases could break the SDK without warning.

### ~~CRIT-002: TOCTOU race condition in file listing~~ ✅ FIXED
- **Severity:** 🔴 Critical
- **Component:** CLI
- **File:** `packages/cli/src/lib/paths.ts:145-161`
- **Status:** ✅ Fixed - Wrapped `statSync()` in try-catch, skipping files that disappear
- **Description:** File could be deleted between `existsSync()` check and `statSync()` call.
- **Impact:** CLI crashes with unhandled exception if file disappears during listing.

### ~~CRIT-003: Incomplete argument sanitization~~ ✅ FIXED
- **Severity:** 🔴 Critical
- **Component:** Python SDK
- **File:** `watchtower/utils/sanitization.py`
- **Status:** ✅ Fixed - Added value pattern matching for common credential formats (OpenAI keys, Google API keys, GitHub tokens, Bearer tokens, etc.)
- **Description:** Sanitization only checks dictionary keys, not values that may contain secrets.
- **Impact:** Secrets in values like `{"url": "https://user:password@host"}` are logged in plain text.

### ~~CRIT-004: Unbounded buffer size in FileWriter~~ ✅ FIXED
- **Severity:** 🔴 Critical
- **Component:** Python SDK
- **File:** `watchtower/writers/file_writer.py`
- **Status:** ✅ Fixed - Added `max_buffer_size` config (default 1000) with warning when dropping oldest events
- **Description:** No maximum buffer size limit. If flush fails repeatedly, buffer grows indefinitely.
- **Impact:** Memory exhaustion for long-running agents with flush failures.

### ~~CRIT-005: SIGTERM signal not supported on Windows~~ ✅ FIXED
- **Severity:** 🔴 Critical
- **Component:** CLI
- **File:** `packages/cli/src/hooks/useProcessStream.ts:16-26`
- **Status:** ✅ Fixed - Added platform-aware `killProcess()` helper that uses default kill on Windows
- **Description:** Uses `SIGTERM` signal which doesn't exist on Windows.
- **Impact:** Process termination logic broken on Windows.

---

## Code Quality

### CQ-001: Overly broad exception catching
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **File:** `watchtower/plugin.py` (14 instances)
- **Description:** Catches bare `Exception` instead of specific exceptions, masking programming errors.
- **Impact:** Bugs silently logged to stderr, harder debugging, no error propagation.
- **Fix:** Catch specific exceptions (AttributeError, KeyError, ValueError), re-raise unexpected errors.

### CQ-002: Silent error suppression in StdoutWriter
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **File:** `watchtower/writers/stdout_writer.py:65-67`
- **Description:** Empty `except: pass` swallows all errors without logging.
- **Impact:** Users have no idea if writing failed.
- **Fix:** Log errors to stderr or add error callback.

### CQ-003: State update on unmounted component
- **Severity:** 🟡 Medium
- **Component:** CLI
- **File:** `packages/cli/src/commands/list.tsx:29-43`
- **Description:** `load()` doesn't check if component is mounted before calling `setTraces()`.
- **Impact:** React memory leak warnings, potential state inconsistency.
- **Fix:** Add `cancelled` flag pattern like in `useTraceFile`.

### CQ-004: Error recovery in FileWriter buffer management
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **File:** `watchtower/writers/file_writer.py:183-187`
- **Description:** Complex buffer slicing after failed writes could drop events or lose tracking.
- **Impact:** Events could be silently lost during retry scenarios.
- **Fix:** Simplify buffer management, add event tracking IDs.

### CQ-005: Using `Any` type for ADK types
- **Severity:** 🟢 Low
- **Component:** Python SDK
- **File:** `watchtower/plugin.py:26-32`
- **Description:** `InvocationContext = Any`, `CallbackContext = Any` defeats type checking.
- **Impact:** No IDE autocomplete, no static type checking for hook parameters.
- **Fix:** Use Protocol classes or TypedDict for structural typing.

### CQ-006: Weak event validation in parser
- **Severity:** 🟢 Low
- **Component:** CLI
- **File:** `packages/cli/src/lib/parser.ts:23-58`
- **Description:** `isValidTraceEvent()` validates existence but not structure.
- **Impact:** Malformed events could pass validation.
- **Fix:** Add proper type guards with structural validation.

### CQ-007: Code duplication - error logging pattern
- **Severity:** 🟢 Low
- **Component:** Python SDK
- **File:** `watchtower/plugin.py`
- **Description:** Same try/except pattern appears 14 times.
- **Fix:** Create `@safe_hook` decorator or context manager.

### CQ-008: Code duplication - buffer slice logic
- **Severity:** 🟢 Low
- **Component:** Python SDK
- **File:** `watchtower/writers/file_writer.py:183-187, 220-224`
- **Description:** Same buffer slice logic appears twice.
- **Fix:** Extract to helper method.

### CQ-009: JSON serialization too permissive
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **File:** `watchtower/writers/file_writer.py:89,93`
- **Description:** `default=str` converts ANY object to string, including sensitive objects.
- **Impact:** Large objects bloat traces, sensitive objects bypass sanitization.
- **Fix:** Remove `default=str`, raise TypeError for non-JSON types.

---

## Security

### SEC-001: Sanitization misses secrets in values
- **Severity:** 🔴 Critical
- **Reference:** CRIT-003

### SEC-002: File permissions not enforced on Windows
- **Severity:** 🟡 Medium
- **Component:** Both
- **Files:** `paths.ts:27`, `config.ts:40,167`, `file_writer.py:45,47`
- **Description:** POSIX permissions (0o700, 0o600) silently ignored on Windows.
- **Impact:** Trace files may be world-readable on shared Windows systems.
- **Fix:** Document limitation, consider Windows ACL APIs for security-critical deployments.

### SEC-003: Environment variable inheritance
- **Severity:** 🟢 Low
- **Component:** CLI
- **File:** `packages/cli/src/hooks/useProcessStream.ts:67-75`
- **Description:** Spreads all parent env vars to child process.
- **Impact:** Could leak sensitive env vars to child process if compromised.
- **Fix:** Consider whitelisting safe env vars only.

### SEC-004: Dead letter files not encrypted
- **Severity:** 🟢 Low
- **Component:** Python SDK
- **File:** `watchtower/writers/file_writer.py:69-101`
- **Description:** Failed events written to dead-letter file may contain unsanitized data.
- **Impact:** Sensitive data could leak if original sanitization failed.
- **Fix:** Apply sanitization before dead-letter write.

### SEC-005: No path traversal prevention
- **Severity:** 🟡 Medium
- **Component:** CLI
- **File:** `packages/cli/src/lib/paths.ts`
- **Description:** `watchtower show /etc/passwd` would attempt to read arbitrary files.
- **Impact:** Information disclosure via CLI.
- **Fix:** Validate that resolved path is within trace directory.

---

## Cross-Platform Compatibility

### COMPAT-001: SIGTERM on Windows
- **Severity:** 🔴 Critical
- **Reference:** CRIT-005

### COMPAT-002: File permissions on Windows
- **Severity:** 🟡 Medium
- **Reference:** SEC-002

### COMPAT-003: fcntl module Unix-only
- **Severity:** ✅ Handled
- **Component:** Python SDK
- **File:** `watchtower/writers/file_writer.py:13-18`
- **Description:** fcntl import gracefully fails on Windows, disables file locking.
- **Status:** Correctly handled with HAS_FCNTL flag.

### COMPAT-004: Path separator handling
- **Severity:** ✅ Handled
- **Component:** CLI
- **File:** `packages/cli/src/lib/paths.ts:63`
- **Description:** Checks for both `/` and `\` separators.
- **Status:** Correctly handles both platforms.

### COMPAT-005: No Windows CI testing
- **Severity:** 🟡 Medium
- **Component:** CI/CD
- **Description:** GitHub Actions workflow only tests on ubuntu-latest.
- **Impact:** Windows-specific bugs not caught.
- **Fix:** Add Windows runner to CI matrix.

---

## Performance

### PERF-001: Regex compiled on every sanitization call
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **File:** `watchtower/utils/sanitization.py:60`
- **Description:** `re.search(pattern, key_lower)` compiles regex each time.
- **Impact:** Slower sanitization for high-frequency events.
- **Fix:** Pre-compile patterns: `SENSITIVE_PATTERNS_COMPILED = [re.compile(p) for p in SENSITIVE_PATTERNS]`

### PERF-002: Blocking file I/O in plugin hooks
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **File:** `watchtower/writers/file_writer.py:130-189`
- **Description:** File writes happen synchronously in plugin hooks.
- **Impact:** Agent blocked during slow disk I/O or lock contention.
- **Fix:** Consider async I/O or background thread for writes.

### PERF-003: React re-renders on every stats update
- **Severity:** 🟡 Medium
- **Component:** CLI
- **File:** `packages/cli/src/hooks/useProcessStream.ts:108-135`
- **Description:** Every event triggers `setStats()` causing re-render.
- **Impact:** Thousands of re-renders with large event streams.
- **Fix:** Use `useReducer` or batch updates, debounce stats updates.

### PERF-004: Trace file listing reads all metadata
- **Severity:** 🟡 Medium
- **Component:** CLI
- **File:** `packages/cli/src/lib/paths.ts:134-155`
- **Description:** Calls `statSync()` for every file in directory.
- **Impact:** Slow listing with 10,000+ trace files.
- **Fix:** Use `fs.readdirSync(dir, {withFileTypes: true})` to get metadata in one call.

### PERF-005: Inefficient buffer clearing
- **Severity:** 🟢 Low
- **Component:** Python SDK
- **File:** `watchtower/writers/file_writer.py:184`
- **Description:** `self._buffer = self._buffer[len(events):]` creates new list.
- **Fix:** Use `del self._buffer[:len(events)]` for in-place modification.

### PERF-006: CLI loads entire trace into memory
- **Severity:** 🟡 Medium
- **Component:** CLI
- **File:** `packages/cli/src/hooks/useTraceFile.ts`
- **Description:** `parseTraceFile()` loads all events into memory.
- **Impact:** OOM crash with very large traces (100MB+).
- **Fix:** Implement streaming/pagination for large files.

---

## Missing Features

### FEAT-001: Search/filter events in CLI
- **Priority:** 🔴 High
- **Component:** CLI
- **Description:** No way to search or filter events by type, name, or content.
- **Impact:** Users must manually scroll through 100+ events.
- **Scope:**
  - Add `Ctrl+F` interactive search
  - Add `--filter` flag to commands
  - Filter by event type, tool name, time range

### FEAT-002: Export to JSON/CSV formats
- **Priority:** 🟡 Medium
- **Component:** CLI
- **Description:** Traces are JSONL-only, no export functionality.
- **Impact:** Can't share data with spreadsheets, analysis tools, or team members.
- **Scope:**
  - `watchtower export <trace> --format json|csv`
  - Handle nested objects in CSV (flatten or JSON-encode)

### FEAT-003: Trace comparison/diff
- **Priority:** 🟡 Medium
- **Component:** CLI
- **Description:** No way to compare two traces side-by-side.
- **Impact:** Can't identify regressions or differences between runs.
- **Scope:**
  - `watchtower diff <trace1> <trace2>`
  - Side-by-side timeline view
  - Statistics comparison

### FEAT-004: Delete/cleanup command
- **Priority:** 🔴 High
- **Component:** CLI
- **Description:** No way to delete old traces from CLI.
- **Impact:** Traces accumulate indefinitely, filling disk.
- **Scope:**
  - `watchtower delete <trace>` - delete specific trace
  - `watchtower prune --older-than 30d` - bulk cleanup
  - `watchtower prune --keep 100` - keep N most recent

### FEAT-005: Retention policy enforcement
- **Priority:** 🔴 High
- **Component:** Python SDK
- **File:** `watchtower/config.py`
- **Description:** `retention_days: 30` config exists but is never used.
- **Impact:** Old traces never cleaned up automatically.
- **Scope:**
  - Enforce retention on SDK startup
  - Add CLI command to run cleanup manually

### FEAT-006: Multi-run trace merging
- **Priority:** 🟢 Low
- **Component:** CLI
- **Description:** Can't combine traces from multiple agent runs.
- **Scope:**
  - `watchtower merge <trace1> <trace2> --output merged.jsonl`
  - Correlation ID support

### FEAT-007: Aggregate statistics across traces
- **Priority:** 🟢 Low
- **Component:** CLI
- **Description:** No statistics across multiple runs.
- **Scope:**
  - `watchtower stats --since 7d`
  - Average LLM latency, token usage, error rates

### FEAT-008: Custom user events
- **Priority:** 🟡 Medium
- **Component:** Python SDK
- **Description:** Users can't emit their own events (e.g., business metrics).
- **Scope:**
  - `plugin.emit_event("custom.metric", {"value": 42})`
  - New event type or generic custom event

---

## CLI UX

### UX-001: `--since` only accepts YYYY-MM-DD
- **Severity:** 🟢 Low
- **Component:** CLI
- **File:** `packages/cli/src/commands/list.tsx`
- **Description:** No relative date support like "7d" or "last week".
- **Fix:** Add relative date parsing.

### UX-002: No config validation warnings
- **Severity:** 🟢 Low
- **Component:** CLI
- **File:** `packages/cli/src/lib/config.ts`
- **Description:** Invalid theme or timestampFormat silently falls back to defaults.
- **Fix:** Log warning when invalid values detected.

### UX-003: Missing environment variable documentation in --help
- **Severity:** 🟢 Low
- **Component:** CLI
- **Description:** `WATCHTOWER_TRACE_DIR` etc. not shown in CLI help.
- **Fix:** Add env var section to help output.

### UX-004: No scrolling progress indicator
- **Severity:** 🟢 Low
- **Component:** CLI
- **Description:** On large traces, users don't know position in list.
- **Fix:** Add "Event 50 of 1234" indicator.

### UX-005: Errors don't stand out visually
- **Severity:** 🟢 Low
- **Component:** CLI
- **Description:** `tool.error` events don't have distinct styling.
- **Fix:** Add red background or icon for error events.

---

## SDK Limitations

### SDK-001: No `llm.error` event type
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **Description:** Tool errors captured but LLM errors (rate limiting, validation) not tracked.
- **Fix:** Add `on_model_error_callback` hook and `llm.error` event type.

### SDK-002: No `run.interrupt` event
- **Severity:** 🟢 Low
- **Component:** Python SDK
- **Description:** When user interrupts (Ctrl+C), no event recorded.
- **Fix:** Add signal handler to emit interrupt event.

### SDK-003: No async writing mode
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **Description:** All file writes are synchronous, blocking agent.
- **Fix:** Add `async_writes: true` config option using threading or asyncio.

### SDK-004: StateChangeEvent incomplete
- **Severity:** 🟢 Low
- **Component:** Python SDK
- **Description:** Only captures if `state_delta` exists, misses state reads.
- **Fix:** Optionally capture full state snapshots.

### SDK-005: No timeout for hooks
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **File:** `watchtower/plugin.py`
- **Description:** Hooks could hang indefinitely on slow I/O.
- **Fix:** Add configurable timeout with `asyncio.timeout()`.

---

## Documentation

### DOC-001: No async agent example
- **Severity:** 🟢 Low
- **Component:** Docs
- **Description:** All examples use synchronous code patterns.
- **Fix:** Add async/await example in SDK.md.

### DOC-002: No multi-agent example
- **Severity:** 🟢 Low
- **Component:** Docs
- **Description:** `agent.transfer` event defined but not demonstrated.
- **Fix:** Add example showing agent handoff tracing.

### DOC-003: Token counting fields unclear
- **Severity:** 🟢 Low
- **Component:** Docs
- **Description:** `input_tokens` vs `prompt_tokens` difference not explained.
- **Fix:** Document that SDK tries both field names for compatibility.

### DOC-004: TraceWriter interface undocumented
- **Severity:** 🟢 Low
- **Component:** Docs
- **Description:** Base class for custom writers exists but no extension guide.
- **Fix:** Add "Custom Writers" section to SDK.md.

### DOC-005: Event schema not formally defined
- **Severity:** 🟢 Low
- **Component:** Docs
- **Description:** EventType enum exists but required/optional fields unclear.
- **Fix:** Add JSON Schema or table of fields per event type.

---

## Testing Gaps

### TEST-001: No large trace tests
- **Severity:** 🟡 Medium
- **Component:** Both
- **Description:** Tests use small traces, no tests with 10k+ events.
- **Impact:** Unknown performance characteristics at scale.
- **Fix:** Add benchmark tests with large synthetic traces.

### TEST-002: No concurrent plugin tests
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **Description:** Untested: multiple runners with same plugin instance.
- **Fix:** Add test with concurrent async runs.

### TEST-003: No disk full scenario tests
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **Description:** FileWriter behavior when disk is full untested.
- **Fix:** Mock disk full errors, verify graceful handling.

### TEST-004: No Windows tests
- **Severity:** 🟡 Medium
- **Component:** Both
- **Description:** All tests run on Unix, Windows untested.
- **Fix:** Add Windows to CI matrix.

### TEST-005: No corrupted trace tests
- **Severity:** 🟢 Low
- **Component:** CLI
- **Description:** Parser behavior with malformed JSONL untested.
- **Fix:** Add tests with truncated lines, invalid JSON.

### TEST-006: No coverage enforcement
- **Severity:** 🟢 Low
- **Component:** CI/CD
- **Description:** Coverage measured but no minimum threshold.
- **Fix:** Add `--cov-fail-under=80` to pytest.

---

## Operational Concerns

### OPS-001: No log rotation
- **Severity:** 🔴 High
- **Component:** Python SDK
- **Description:** Trace files grow unboundedly, no rotation mechanism.
- **Impact:** Disk fills up in production.
- **Fix:** Implement rotation by size/count, or document external rotation.

### OPS-002: No disk space monitoring
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **Description:** No warning when trace directory approaches quota.
- **Impact:** Silent failure when disk full.
- **Fix:** Check available space before write, warn at threshold.

### OPS-003: retention_days not enforced
- **Severity:** 🔴 High
- **Reference:** FEAT-005

### OPS-004: No max file size limit
- **Severity:** 🟡 Medium
- **Component:** Python SDK
- **Description:** Single trace file could grow to gigabytes.
- **Fix:** Add `max_trace_size_mb` config, rotate when exceeded.

### OPS-005: Dead letter directory accumulates
- **Severity:** 🟢 Low
- **Component:** Python SDK
- **Description:** Failed events written to dead_letter/ never cleaned up.
- **Fix:** Include in retention policy, or add separate cleanup.

### OPS-006: No metrics/monitoring hooks
- **Severity:** 🟢 Low
- **Component:** Python SDK
- **Description:** Can't track SDK overhead (buffer size, flush latency).
- **Fix:** Add optional metrics callback or Prometheus integration.

---

## Issue Summary by Priority

### 🔴 Critical (5)
- CRIT-001: Unconstrained google-adk version
- CRIT-002: TOCTOU race condition
- CRIT-003: Incomplete sanitization
- CRIT-004: Unbounded buffer size
- CRIT-005: SIGTERM on Windows

### 🔴 High Priority Features (3)
- FEAT-001: Search/filter events
- FEAT-004: Delete/cleanup command
- FEAT-005: Retention enforcement

### 🟡 Medium (25)
- Code quality: CQ-001 through CQ-004, CQ-009
- Security: SEC-002, SEC-005
- Performance: PERF-001 through PERF-004, PERF-006
- Features: FEAT-002, FEAT-003, FEAT-008
- SDK: SDK-001, SDK-003, SDK-005
- Testing: TEST-001 through TEST-004
- Operations: OPS-002, OPS-004

### 🟢 Low (29)
- Remaining code quality, UX, documentation, and minor issues

---

## Contributing

To work on an issue:

1. Comment on the issue to claim it
2. Create a branch: `fix/ISSUE-ID-short-description`
3. Submit PR referencing the issue
4. Ensure tests pass and coverage maintained

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.
