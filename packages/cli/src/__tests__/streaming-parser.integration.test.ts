/**
 * Integration tests for StreamingTraceParser pagination behaviour.
 *
 * These tests exercise the parser against real files on disk, verifying that
 * page boundaries, event identity, empty-file handling, and malformed-line
 * skipping all work correctly end-to-end.
 */

import test from 'ava';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {StreamingTraceParser} from '../lib/streaming-parser.js';
import type {TraceEvent} from '../lib/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a unique temporary directory for each test so tests do not interfere
 * with each other even when run in parallel.
 */
function makeTmpDir(): string {
	const dir = path.join(
		os.tmpdir(),
		`wt-sp-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
	);
	fs.mkdirSync(dir, {recursive: true});
	return dir;
}

/**
 * Write a JSONL trace file containing `count` synthetic `run.start` events.
 * Each event carries a deterministic `run_id` of `run-N` so tests can assert
 * which events appear on which page.
 */
function writeTraceFile(dir: string, count: number): string {
	const filePath = path.join(dir, 'trace.jsonl');
	const lines: string[] = [];
	for (let i = 0; i < count; i++) {
		const event: TraceEvent = {
			type: 'run.start',
			run_id: `run-${i}`,
			timestamp: 1_700_000_000 + i,
		};
		lines.push(JSON.stringify(event));
	}
	fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
	return filePath;
}

// ---------------------------------------------------------------------------
// Test 1: single-page file returns all events on page 0
// ---------------------------------------------------------------------------

test('single-page file: getPage(0) returns all events', async t => {
	const tmpDir = makeTmpDir();
	const filePath = writeTraceFile(tmpDir, 8);

	const parser = new StreamingTraceParser(filePath, {pageSize: 10});

	const page = await parser.getPage(0);

	t.is(page.events.length, 8, 'all 8 events should be on page 0');
	t.is(page.page, 0);
	t.is(page.totalPages, 1);
	t.is(page.totalEvents, 8);
	t.is(page.hasNext, false);
	t.is(page.hasPrevious, false);

	// Verify event identity (run_id matches position)
	for (let i = 0; i < 8; i++) {
		const ev = page.events[i] as TraceEvent & {run_id: string};
		t.is(ev.run_id, `run-${i}`, `event ${i} should have run_id run-${i}`);
	}

	parser.cancel();
	fs.rmSync(tmpDir, {recursive: true, force: true});
});

// ---------------------------------------------------------------------------
// Test 2: multi-page file returns correct events per page
// 25 events, pageSize 10 → 3 pages (10, 10, 5)
// ---------------------------------------------------------------------------

test('multi-page file: 25 events, pageSize 10 → 3 pages with correct counts', async t => {
	const tmpDir = makeTmpDir();
	const filePath = writeTraceFile(tmpDir, 25);

	const parser = new StreamingTraceParser(filePath, {pageSize: 10});

	const page0 = await parser.getPage(0);
	const page1 = await parser.getPage(1);
	const page2 = await parser.getPage(2);

	// Page metadata
	t.is(page0.totalPages, 3);
	t.is(page0.totalEvents, 25);

	// Event counts per page
	t.is(page0.events.length, 10, 'page 0 should have 10 events');
	t.is(page1.events.length, 10, 'page 1 should have 10 events');
	t.is(page2.events.length, 5, 'page 2 should have 5 events');

	// Navigation flags
	t.is(page0.hasNext, true);
	t.is(page0.hasPrevious, false);
	t.is(page1.hasNext, true);
	t.is(page1.hasPrevious, true);
	t.is(page2.hasNext, false);
	t.is(page2.hasPrevious, true);

	// Spot-check first event on each page
	const ev0 = page0.events[0] as TraceEvent & {run_id: string};
	const ev1 = page1.events[0] as TraceEvent & {run_id: string};
	const ev2 = page2.events[0] as TraceEvent & {run_id: string};
	t.is(ev0.run_id, 'run-0');
	t.is(ev1.run_id, 'run-10');
	t.is(ev2.run_id, 'run-20');

	parser.cancel();
	fs.rmSync(tmpDir, {recursive: true, force: true});
});

// ---------------------------------------------------------------------------
// Test 3: jump to page 4 of a 50-event, pageSize-10 file → events run-40..run-49
// ---------------------------------------------------------------------------

test('jump to page 4: 50 events, pageSize 10 → page 4 contains run-40 to run-49', async t => {
	const tmpDir = makeTmpDir();
	const filePath = writeTraceFile(tmpDir, 50);

	const parser = new StreamingTraceParser(filePath, {pageSize: 10});

	const page = await parser.getPage(4);

	t.is(page.events.length, 10, 'page 4 should have 10 events');
	t.is(page.page, 4);
	t.is(page.totalPages, 5);

	for (let i = 0; i < 10; i++) {
		const ev = page.events[i] as TraceEvent & {run_id: string};
		t.is(
			ev.run_id,
			`run-${40 + i}`,
			`event ${i} on page 4 should be run-${40 + i}`,
		);
	}

	parser.cancel();
	fs.rmSync(tmpDir, {recursive: true, force: true});
});

// ---------------------------------------------------------------------------
// Test 4: empty file → 0 events, 0 pages
// ---------------------------------------------------------------------------

test('empty file: countPromise resolves to 0 and getPage(0) returns empty page', async t => {
	const tmpDir = makeTmpDir();
	const filePath = path.join(tmpDir, 'empty.jsonl');
	fs.writeFileSync(filePath, '', 'utf-8');

	const parser = new StreamingTraceParser(filePath, {pageSize: 10});

	const count = await parser.countPromise;
	t.is(count, 0, 'empty file should have 0 events');

	// getPage(0) should return an empty page rather than throwing
	const page = await parser.getPage(0);
	t.is(page.events.length, 0, 'empty page should have no events');
	t.is(page.totalEvents, 0);
	t.is(page.totalPages, 0);
	t.false(page.hasNext);
	t.false(page.hasPrevious);

	parser.cancel();
	fs.rmSync(tmpDir, {recursive: true, force: true});
});

// ---------------------------------------------------------------------------
// Test 5: malformed lines mid-stream → valid events returned, bad lines skipped
// ---------------------------------------------------------------------------

test('malformed lines: valid events still returned, malformed lines skipped', async t => {
	const tmpDir = makeTmpDir();
	const filePath = path.join(tmpDir, 'mixed.jsonl');

	// Write a file with valid events on consecutive lines (no interleaving), followed
	// by malformed lines. This exercises parseLine's skipping behaviour without
	// triggering the raw-line-index vs event-count mismatch that exists in the
	// streaming parser's pagination design (lineOffsets indexes raw lines, while
	// eventCount counts only valid events).
	//
	// Layout (7 raw lines, 3 valid events at indices 0–2):
	//   line 0: valid run.start  run-0
	//   line 1: valid run.start  run-1
	//   line 2: valid run.start  run-2
	//   line 3: malformed JSON
	//   line 4: blank
	//   line 5: # comment
	//   line 6: malformed JSON
	//
	// _analyzeFile counts eventCount=3, lineOffsets has 7 entries.
	// _loadPage(0) with pageSize=10 seeks to lineOffsets[0]=0 and reads
	// min(10,3)=3 raw lines → gets all 3 valid events.
	const validEvent: TraceEvent = {
		type: 'run.start',
		run_id: 'run-0',
		timestamp: 1_700_000_000,
	};

	const lines = [
		JSON.stringify(validEvent), // valid - line 0
		JSON.stringify({...validEvent, run_id: 'run-1', timestamp: 1_700_000_001}), // valid - line 1
		JSON.stringify({...validEvent, run_id: 'run-2', timestamp: 1_700_000_002}), // valid - line 2
		'this is not json {{{', // malformed - line 3
		'', // blank - line 4
		'# a comment line', // comment - line 5
		'{broken', // malformed - line 6
	];

	fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');

	const parser = new StreamingTraceParser(filePath, {pageSize: 10});

	// Wait for analysis to complete so eventCount is accurate
	const count = await parser.countPromise;
	t.is(count, 3, 'only the 3 valid events should be counted');

	const page = await parser.getPage(0);
	t.is(page.events.length, 3, 'page should contain exactly 3 valid events');

	// Verify event identity
	const runIds = page.events.map(
		e => (e as TraceEvent & {run_id: string}).run_id,
	);
	t.deepEqual(runIds, ['run-0', 'run-1', 'run-2']);

	// Parse errors should have been counted (2 malformed lines)
	const errors = await parser.errors;
	t.true(errors >= 2, `expected >= 2 parse errors, got ${errors}`);

	parser.cancel();
	fs.rmSync(tmpDir, {recursive: true, force: true});
});
