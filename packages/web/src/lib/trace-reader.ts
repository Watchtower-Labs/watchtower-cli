/**
 * Server-side trace file reader for the web dashboard.
 *
 * Reads JSONL trace files from the filesystem and returns
 * Trace-compatible objects for use in Next.js API routes.
 */

import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {getTracesDir} from './config';
import type {Trace, TraceEvent, TraceSummary} from './types';

// -------------------------------------------------------
// Lightweight list — no full event arrays
// -------------------------------------------------------

export type TraceListItem = Omit<Trace, 'events'>;

export function listTraces(): TraceListItem[] {
  const dir = getTracesDir();
  let files: string[];

  try {
    files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  } catch {
    return [];
  }

  const results: TraceListItem[] = [];

  for (const filename of files) {
    const filePath = join(dir, filename);

    // Filename format: YYYY-MM-DD_runId.jsonl
    const nameWithoutExt = filename.replace(/\.jsonl$/, '');
    const underscoreIdx = nameWithoutExt.indexOf('_');
    const date = underscoreIdx > 0 ? nameWithoutExt.slice(0, underscoreIdx) : '';
    const id = underscoreIdx > 0 ? nameWithoutExt.slice(underscoreIdx + 1) : nameWithoutExt;

    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(filePath);
    } catch {
      continue;
    }

    const parsed = parseSummaryFromFile(filePath);

    results.push({
      id,
      filename,
      date,
      agent_name: parsed.agent_name ?? 'unknown',
      app_name: parsed.app_name,
      startedAt: parsed.startedAt ?? stat.mtimeMs,
      completedAt: parsed.completedAt,
      summary: parsed.summary,
    });
  }

  // Most recent first
  return results.sort((a, b) => b.startedAt - a.startedAt);
}

// -------------------------------------------------------
// Full trace — includes all events
// -------------------------------------------------------

export function readTrace(id: string): Trace | null {
  const dir = getTracesDir();
  let files: string[];

  try {
    files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  } catch {
    return null;
  }

  // Match by runId appearing anywhere in the filename after the first underscore
  const matchingFile = files.find(f => {
    const nameWithoutExt = f.replace(/\.jsonl$/, '');
    const underscoreIdx = nameWithoutExt.indexOf('_');
    const fileRunId = underscoreIdx > 0 ? nameWithoutExt.slice(underscoreIdx + 1) : nameWithoutExt;
    return fileRunId === id;
  });

  if (!matchingFile) return null;

  const filePath = join(dir, matchingFile);
  const events = parseEventsFromFile(filePath);
  if (events.length === 0) return null;

  const nameWithoutExt = matchingFile.replace(/\.jsonl$/, '');
  const underscoreIdx = nameWithoutExt.indexOf('_');
  const date = underscoreIdx > 0 ? nameWithoutExt.slice(0, underscoreIdx) : '';

  const runStart = events.find(e => e.type === 'run.start');
  const runEnd = events.find(e => e.type === 'run.end');

  const summary = computeSummary(events);

  return {
    id,
    filename: matchingFile,
    date,
    agent_name: (runStart as {agent_name?: string} | undefined)?.agent_name ?? 'unknown',
    app_name: (runStart as {app_name?: string} | undefined)?.app_name,
    startedAt: runStart?.timestamp ?? events[0]!.timestamp,
    completedAt: runEnd?.timestamp,
    events,
    summary,
  };
}

// -------------------------------------------------------
// Internal helpers
// -------------------------------------------------------

interface FileSummary {
  agent_name?: string;
  app_name?: string;
  startedAt?: number;
  completedAt?: number;
  summary: TraceSummary;
}

function parseSummaryFromFile(filePath: string): FileSummary {
  const events = parseEventsFromFile(filePath);
  const runStart = events.find(e => e.type === 'run.start');
  const runEnd = events.find(e => e.type === 'run.end');

  return {
    agent_name: (runStart as {agent_name?: string} | undefined)?.agent_name,
    app_name: (runStart as {app_name?: string} | undefined)?.app_name,
    startedAt: runStart?.timestamp,
    completedAt: runEnd?.timestamp,
    summary: computeSummary(events),
  };
}

function parseEventsFromFile(filePath: string): TraceEvent[] {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const events: TraceEvent[] = [];
  for (const line of content.trim().split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      // Normalize string timestamps to numbers
      if (typeof obj['timestamp'] === 'string') {
        const parsed = Number(obj['timestamp']);
        if (!isNaN(parsed)) obj['timestamp'] = parsed;
      }
      events.push(obj as unknown as TraceEvent);
    } catch {
      // Skip malformed lines
    }
  }
  return events;
}

function computeSummary(events: TraceEvent[]): TraceSummary {
  const llm_calls = events.filter(e => e.type === 'llm.response').length;
  const tool_calls = events.filter(e => e.type === 'tool.end' || e.type === 'tool.error').length;
  const total_tokens = events
    .filter(e => e.type === 'llm.response')
    .reduce((sum, e) => sum + ((e as {total_tokens?: number}).total_tokens ?? 0), 0);
  const errors = events.filter(e => e.type === 'tool.error').length;
  const tools_used = Array.from(
    new Set(
      events
        .filter(e => (e as {tool_name?: string}).tool_name)
        .map(e => (e as {tool_name?: string}).tool_name!)
    )
  );
  const runEnd = events.find(e => e.type === 'run.end');
  const duration_ms = (runEnd as {duration_ms?: number} | undefined)?.duration_ms ?? 0;

  return {duration_ms, llm_calls, tool_calls, total_tokens, errors, tools_used};
}
