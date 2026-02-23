# Hyperanalysis Fixes Design

**Date:** 2026-02-23
**Branch:** fix/critical-issues-and-quick-wins
**Status:** Approved

## Overview

A comprehensive audit of the entire watchtower-cli monorepo (Python SDK, TypeScript CLI, Next.js Web dashboard, CI/CD) identified 100+ issues. This document records the approved design for addressing them in three priority phases using a severity-first approach.

## Scope

All four components:
- `watchtower/` — Python SDK
- `packages/cli/src/` — TypeScript Ink CLI
- `packages/web/src/` — Next.js 14 Web dashboard
- `.github/`, `scripts/` — CI/CD infrastructure

## Approach

**Severity-First (Approach A):** Fix all Critical issues across all packages first, then High, then selected Medium. Low-severity cosmetic issues are deferred.

---

## Phase 1: Critical Fixes (13 items)

### CI/CD (4 items)

| # | File | Fix |
|---|------|-----|
| C1 | `scripts/bump-version.sh` | Rewrite tag creation to emit `sdk-v{X.Y.Z}` and `cli-v{X.Y.Z}` tags separately, matching the `on: push: tags` triggers in the release workflows. Currently creates generic `v*` tags that don't trigger any release workflow. |
| C2 | `.github/workflows/test.yml:206` | Remove duplicate bare `ruff check watchtower/ tests/` step; keep only the `--output-format=github` variant at line 195. |
| C3 | `.github/workflows/release-cli.yml`, `release-sdk.yml` | Add `id-token: write` permission for OIDC publishing; add `contents: write` for GitHub Release creation. |
| C4 | `.github/workflows/test.yml` | Add top-level `permissions: { contents: read }` block following least-privilege principle. |

### Python SDK (3 items)

| # | File | Fix |
|---|------|-----|
| C5 | `watchtower/sdk.py:106` | Remove the unreachable `raise NotImplementedError(...)` that follows an exhaustive if/elif chain. Dead code that misleads developers. |
| C6 | `watchtower/adapters/anthropic.py`, `openai.py` | Add `if response is None: return None` guard before accessing response fields, matching the Google ADK adapter's existing pattern. Prevents AttributeError crashes on None responses. |
| C7 | `watchtower/writers/file_writer.py:216` | Remove the unreachable second `lock_acquired` check. The retry loop already raises on exhaustion; the post-loop check is dead code that creates confusing double-raise potential. |

### TypeScript CLI (2 items)

| # | File | Fix |
|---|------|-----|
| C8 | `packages/cli/src/lib/streaming-parser.ts:257` | Add `.on('error', (err) => { reject(err) })` handler to the `fileStream` from `createReadStream`. Currently, stream-level errors (permissions, device failure) are silently lost. |
| C9 | `packages/cli/src/__tests__/streaming-parser.integration.test.ts` | Create integration tests covering: single-page file, multi-page pagination, jump-to-page, empty file, malformed lines mid-stream. This is the biggest untested critical path. |

### Web Dashboard (4 items)

| # | File | Fix |
|---|------|-----|
| C10 | `packages/web/src/app/error.tsx` | Add global React error boundary (`"use client"` component). Also add `app/traces/error.tsx` and `app/traces/[id]/error.tsx`. Currently, uncaught render errors show a blank page. |
| C11 | `packages/web/src/app/api/traces/route.ts`, `[id]/route.ts` | Replace `String(error)` in error responses with a generic user-facing message (`"Failed to load traces"`). Log the real error server-side with `console.error`. Prevents stack trace leakage. |
| C12 | `packages/web/src/components/TraceList.tsx` | Render `<TraceListSkeleton />` when `isLoading === true`. The component was built but never used — the loading state currently shows nothing. |
| C13 | `packages/web/` test setup | Install `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@vitejs/plugin-react`, `jsdom` as devDependencies. Add `"test": "vitest run"` script. Write initial tests: `trace-reader.test.ts` (3 tests: JSONL parsing, empty dir, malformed line) + `TraceCard.test.tsx` (2 tests: renders, no missing ARIA). |

---

## Phase 2: High Priority Fixes (19 items)

### CI/CD (5 items)

| # | File | Fix |
|---|------|-----|
| H1 | `.github/workflows/security.yml:77` | Fix CodeQL: add a separate `analyze` step for `python` category so Python code is actually scanned. Currently Python is in the init matrix but has no analysis step. |
| H2 | `.github/workflows/test.yml:191` | Change `mypy --follow-imports=skip` to `--follow-imports=normal` for accurate import resolution and error detection. |
| H3 | `packages/web/next.config.js:31` | Remove `'unsafe-eval'` from CSP `script-src`. Replace `'unsafe-inline'` with nonce-based approach using Next.js 14's built-in nonce support in middleware. |
| H4 | `.editorconfig` (root) | Create root-level `.editorconfig`: 2-space indent for TS/JS/JSON/YAML, 4-space for Python, UTF-8, trim trailing whitespace, LF line endings. |
| H5 | `.github/CODEOWNERS` | Create CODEOWNERS assigning maintainers to `packages/cli/`, `watchtower/`, `packages/web/`, and `.github/`. |

### Python SDK (3 items)

| # | File | Fix |
|---|------|-----|
| H6 | `watchtower/adapters/openai.py:250` | Replace silent `pass` with `logger.warning("Failed to parse tool_call arguments as JSON: %s", e)`. Keep the raw string value so downstream code can inspect it. |
| H7 | `watchtower/config.py:77` | Differentiate error types: YAML syntax errors should log at WARNING with file path and line number; missing file silently uses defaults. User must know when their explicit config is broken vs absent. |
| H8 | `watchtower/adapters/google_adk.py:313` | Rewrite `_safe_token_count` to explicitly `if usage is None: return 0` before `getattr` calls; remove the fragile `int(... or 0)` pattern. |

### TypeScript CLI (4 items)

| # | File | Fix |
|---|------|-----|
| H9 | `packages/cli/src/commands/tail.tsx:25` | Make `MAX_EVENTS_BUFFER` read from config (key: `maxBuffer`, default `500`). Expose in config schema and help text. |
| H10 | `packages/cli/src/lib/streaming-parser.ts`, `parser.ts` | Replace the 5 most dangerous `as` assertions with explicit field-existence guards: accesses of `agent_name`, `tool_name`, `total_tokens`, `duration_ms`, `model` on partially-typed events. |
| H11 | `packages/cli/src/commands/tail.tsx` | Refactor `handleEvent` to use `useReducer` instead of `setState({...prev, field: newVal})`. Eliminates object allocation on every live event — critical for long-running agent tails. |
| H12 | `packages/cli/src/hooks/useProcessStream.ts:141` | Ensure `readline.createInterface` is explicitly `.close()`d in the catch/error path, not only in the normal cleanup function. Prevents readline handle leak on stream errors. |

### Web Dashboard (4 items)

| # | File | Fix |
|---|------|-----|
| H13 | `packages/web/src/app/docs/*/page.tsx` | Add `export const metadata: Metadata` to the 6 doc pages missing it: `installation`, `cli/list`, `cli/tail`, `cli/config`, `sdk`, `troubleshooting`. |
| H14 | `packages/web/src/components/layout/Header.tsx:90` | Add `aria-expanded={isMenuOpen}` to the mobile hamburger button. Required for screen reader navigation. |
| H15 | Framer Motion imports | Wrap framer-motion in `next/dynamic` with `ssr: false` in `HeroBackground.tsx`, `FeaturesSection.tsx`, `HowItWorksSection.tsx` — the three heaviest marketing-page users. |
| H16 | `packages/web/src/app/traces/page.tsx` | Wrap trace list in `<Suspense fallback={<TraceListSkeleton />}>`. Extract `POLL_INTERVAL_MS = 5000` to a named constant in a `lib/constants.ts` file. |

---

## Phase 3: Medium Priority Fixes (15 items, curated)

### CI/CD (3 items)

| # | File | Fix |
|---|------|-----|
| M1 | `.github/dependabot.yml` | Create Dependabot config: weekly npm updates for `packages/cli` and `packages/web`; weekly pip updates for root Python deps. |
| M2 | `requirements.txt`, `requirements-dev.txt` | Remove both files. Update `CONTRIBUTING.md` and `README.md` to use `pip install -e ".[dev]"` as the canonical dev setup path. |
| M3 | `.github/workflows/release-notes.yml` | New workflow triggered on `sdk-v*` or `cli-v*` tag push. Uses `softprops/action-gh-release@v2` to auto-generate GitHub Releases from commit messages. |

### Python SDK (3 items)

| # | File | Fix |
|---|------|-----|
| M4 | `tests/test_adapters_openai.py` | Create 5 tests mirroring existing Anthropic tests: LLM call returns response, trace file written, token counts tracked, API error propagates, `None` response returns `None`. |
| M5 | `tests/test_file_writer_advanced.py` | Add 1 threading concurrency test: spawn 10 threads each writing 100 events; assert total event count in file matches 1000, no data lost or corrupted. |
| M6 | `watchtower/plugin.py` | Add `# TODO(#N): AgentTransferEvent emission not yet implemented` comments at the relevant sites in `plugin.py` and `google_adk.py`, so contributors have clear guidance. |

### TypeScript CLI (4 items)

| # | File | Fix |
|---|------|-----|
| M7 | `packages/cli/src/components/HelpOverlay.tsx` | Add `1-9  select agent` entry to the keyboard reference. Add `Ctrl+A  beginning of line` to SearchBar help hint. |
| M8 | `packages/cli/src/commands/config.tsx` | If `loadConfig()` throws, render `<ErrorDisplay message="Config file error: {e.message}" />` rather than silently continuing with defaults. |
| M9 | `packages/cli/src/lib/paths.ts` | Wrap `realpathSync` call in a try/catch that catches both errors and takes a timed fallback using `child_process.spawnSync('realpath', ...)` with a timeout — prevents hanging on circular symlinks. |
| M10 | `packages/cli/src/components/EventLine.tsx` | Check `process.env.NO_COLOR` and terminal color capability; use `eventIconsAscii` map when color is unavailable. |

### Web Dashboard (5 items)

| # | File | Fix |
|---|------|-----|
| M11 | `packages/web/src/app/robots.ts` | Add `robots.ts` (Next.js 14 metadata API) with `allow: '/'`. Add `sitemap.ts` that generates URLs for all static doc pages and the traces index. |
| M12 | `packages/web/src/components/TimelineView.tsx` | Add `aria-expanded={isExpanded}` to event detail toggle buttons and `aria-controls` pointing to the detail panel ID. |
| M13 | `packages/web/src/components/HeroBackground.tsx` | Add `style={{ willChange: 'transform' }}` to animated blob elements to promote them to their own compositor layer. |
| M14 | `packages/web/src/app/api/traces/[id]/route.ts` | Validate `id` matches `/^[a-zA-Z0-9_-]+$/` before passing to `readTrace`. Return 400 with generic message on invalid format. |
| M15 | `packages/web/src/app/traces/page.tsx` | Add `<label htmlFor="search-input">` for the search input and `<label htmlFor="type-filter">` for the type select. |

---

## Explicitly Out of Scope

- Full WCAG 2.1 accessibility audit (needs dedicated UX sprint)
- Mobile gesture/swipe support for web dashboard
- Schema.org / JSON-LD structured data markup
- All 15 "Low" severity issues (cosmetic, defer to future sprint)
- Light mode for web dashboard (dark-only by design decision)
- Complete CI/CD documentation (CI_CD.md, DEPLOYMENT.md)

---

## Success Criteria

- All 13 Critical issues resolved and tested
- All 19 High issues resolved
- All 15 curated Medium issues resolved
- `python3 -m pytest tests/` passes (all tests green)
- `pnpm --filter @watchtower/cli test` passes
- `pnpm --filter @watchtower/web test` passes (new vitest suite)
- `pnpm build` succeeds across all packages
- CI passes on the branch after all changes
