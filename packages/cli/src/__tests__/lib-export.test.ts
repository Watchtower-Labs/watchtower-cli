import {mkdirSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import test from 'ava';
import {exportTrace, getExportContent} from '../lib/export.js';
import {aggregateSummary} from '../lib/parser.js';
import type {TraceEvent} from '../lib/types.js';

const mockEvents: TraceEvent[] = [
	{
		type: 'run.start',
		run_id: 'test123',
		timestamp: 1_705_315_921.0,
		agent_name: 'test_agent',
	},
	{
		type: 'tool.start',
		run_id: 'test123',
		timestamp: 1_705_315_922.0,
		tool_name: 'search_web',
	},
	{
		type: 'tool.end',
		run_id: 'test123',
		timestamp: 1_705_315_923.0,
		tool_name: 'search_web',
		duration_ms: 1000,
	},
	{
		type: 'run.end',
		run_id: 'test123',
		timestamp: 1_705_315_925.0,
		duration_ms: 4000,
	},
];

const mockSummary = aggregateSummary(mockEvents);

// ─── exportTrace ─────────────────────────────────────────────────────────────

test('exportTrace json writes valid parseable JSON', async t => {
	const dir = join(tmpdir(), `wt-export-${Date.now()}`);
	mkdirSync(dir, {recursive: true});
	const outPath = join(dir, 'trace.json');

	const result = await exportTrace(mockEvents, mockSummary, null, {
		format: 'json',
		outputPath: outPath,
	});

	t.true(result.success);
	t.is(result.path, outPath);
	t.true(result.size > 0);

	const content = await readFile(outPath, 'utf-8');
	const parsed = JSON.parse(content) as unknown;
	t.truthy(parsed);
});

test('exportTrace csv writes header row', async t => {
	const dir = join(tmpdir(), `wt-export-${Date.now()}`);
	mkdirSync(dir, {recursive: true});
	const outPath = join(dir, 'trace.csv');

	const result = await exportTrace(mockEvents, mockSummary, null, {
		format: 'csv',
		outputPath: outPath,
	});

	t.true(result.success);

	const content = await readFile(outPath, 'utf-8');
	// CSV should have a header with expected columns
	t.regex(content, /timestamp.*type.*agent_name/i);
});

test('exportTrace markdown writes h1 heading', async t => {
	const dir = join(tmpdir(), `wt-export-${Date.now()}`);
	mkdirSync(dir, {recursive: true});
	const outPath = join(dir, 'trace.md');

	const result = await exportTrace(mockEvents, mockSummary, null, {
		format: 'markdown',
		outputPath: outPath,
	});

	t.true(result.success);

	const content = await readFile(outPath, 'utf-8');
	t.regex(content, /^# Trace Report/m);
});

test('exportTrace returns error result for bad path', async t => {
	const result = await exportTrace(mockEvents, mockSummary, null, {
		format: 'json',
		outputPath: '/no/such/directory/trace.json',
	});

	t.false(result.success);
	t.truthy(result.error);
});

// ─── getExportContent ─────────────────────────────────────────────────────────

test('getExportContent json returns valid JSON string', t => {
	const content = getExportContent(mockEvents, mockSummary, null, 'json');
	t.notThrows(() => {
		JSON.parse(content);
	});
});

test('getExportContent csv includes run_id', t => {
	const content = getExportContent(mockEvents, mockSummary, null, 'csv');
	t.regex(content, /test123/);
});

test('getExportContent markdown includes agent name', t => {
	const content = getExportContent(mockEvents, mockSummary, null, 'markdown');
	t.regex(content, /test_agent/);
});
