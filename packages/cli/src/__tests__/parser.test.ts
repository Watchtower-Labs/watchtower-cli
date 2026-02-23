import {writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import test from 'ava';
import {parseLine, parseTraceFile, aggregateSummary} from '../lib/parser.js';

const VALID_EVENT = {
	type: 'run.start',
	run_id: 'abc123',
	timestamp: 1_705_315_921.5,
	agent_name: 'test_agent',
};

// ─── parseLine ───────────────────────────────────────────────────────────────

test('parseLine returns null for empty string', t => {
	t.is(parseLine(''), null);
});

test('parseLine returns null for whitespace-only string', t => {
	t.is(parseLine('   '), null);
});

test('parseLine returns null for comment line', t => {
	t.is(parseLine('# this is a comment'), null);
});

test('parseLine returns null for invalid JSON', t => {
	t.is(parseLine('{broken json'), null);
});

test('parseLine returns null for missing run_id', t => {
	const line = JSON.stringify({type: 'run.start', timestamp: 1.0});
	t.is(parseLine(line), null);
});

test('parseLine returns null for unknown event type', t => {
	const line = JSON.stringify({
		...VALID_EVENT,
		type: 'unknown.event.type',
	});
	t.is(parseLine(line), null);
});

test('parseLine parses valid run.start event', t => {
	const event = parseLine(JSON.stringify(VALID_EVENT));
	t.not(event, null);
	t.is(event!.type, 'run.start');
	t.is(event!.run_id, 'abc123');
	t.is(typeof event!.timestamp, 'number');
});

test('parseLine normalizes string timestamp to number', t => {
	const line = JSON.stringify({...VALID_EVENT, timestamp: '1705315921.5'});
	const event = parseLine(line);
	t.not(event, null);
	t.is(typeof event!.timestamp, 'number');
	t.is(event!.timestamp, 1_705_315_921.5);
});

test('parseLine rejects non-numeric string timestamp', t => {
	const line = JSON.stringify({...VALID_EVENT, timestamp: 'not-a-number'});
	t.is(parseLine(line), null);
});

test('parseLine parses all valid event types', t => {
	const types = [
		'run.start',
		'run.end',
		'llm.request',
		'llm.response',
		'tool.start',
		'tool.end',
		'tool.error',
		'state.change',
		'agent.transfer',
	];
	for (const type of types) {
		const event = parseLine(JSON.stringify({...VALID_EVENT, type}));
		t.not(event, null, `Expected parseLine to accept type: ${type}`);
	}
});

// ─── parseTraceFile ──────────────────────────────────────────────────────────

test('parseTraceFile returns empty events for empty file', async t => {
	const dir = join(
		tmpdir(),
		`wt-test-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
	);
	mkdirSync(dir, {recursive: true});
	const filePath = join(dir, 'empty.jsonl');
	writeFileSync(filePath, '');

	const result = await parseTraceFile(filePath);
	t.deepEqual(result.events, []);
	t.is(result.errors, 0);
});

test('parseTraceFile parses multi-event file', async t => {
	const dir = join(
		tmpdir(),
		`wt-test-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
	);
	mkdirSync(dir, {recursive: true});
	const filePath = join(dir, 'trace.jsonl');

	const events = [
		{...VALID_EVENT, type: 'run.start'},
		{...VALID_EVENT, type: 'llm.request'},
		{...VALID_EVENT, type: 'llm.response'},
		{...VALID_EVENT, type: 'run.end'},
	];
	writeFileSync(filePath, events.map(e => JSON.stringify(e)).join('\n'));

	const result = await parseTraceFile(filePath);
	t.is(result.events.length, 4);
	t.is(result.errors, 0);
});

test('parseTraceFile skips malformed lines and counts errors', async t => {
	const dir = join(
		tmpdir(),
		`wt-test-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
	);
	mkdirSync(dir, {recursive: true});
	const filePath = join(dir, 'trace.jsonl');

	writeFileSync(
		filePath,
		[
			JSON.stringify(VALID_EVENT),
			'{bad json}',
			'not json at all',
			JSON.stringify({...VALID_EVENT, type: 'run.end'}),
		].join('\n'),
	);

	const result = await parseTraceFile(filePath);
	t.is(result.events.length, 2);
	t.is(result.errors, 2);
});

test('parseTraceFile skips comment lines without counting as errors', async t => {
	const dir = join(
		tmpdir(),
		`wt-test-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
	);
	mkdirSync(dir, {recursive: true});
	const filePath = join(dir, 'trace.jsonl');

	writeFileSync(
		filePath,
		[
			'# This is a comment',
			JSON.stringify(VALID_EVENT),
			'# Another comment',
		].join('\n'),
	);

	const result = await parseTraceFile(filePath);
	t.is(result.events.length, 1);
	t.is(result.errors, 0);
});

// ─── aggregateSummary ────────────────────────────────────────────────────────

test('aggregateSummary counts llm calls', t => {
	const events = [
		{...VALID_EVENT, type: 'run.start' as const},
		{...VALID_EVENT, type: 'llm.request' as const},
		{...VALID_EVENT, type: 'llm.response' as const, total_tokens: 100},
		{...VALID_EVENT, type: 'llm.response' as const, total_tokens: 200},
	];
	const summary = aggregateSummary(events);
	t.is(summary.llmCalls, 2);
	t.is(summary.totalTokens, 300);
});

test('aggregateSummary counts tool errors', t => {
	const events = [
		{...VALID_EVENT, type: 'run.start' as const},
		{...VALID_EVENT, type: 'tool.start' as const, tool_name: 'search'},
		{...VALID_EVENT, type: 'tool.error' as const, tool_name: 'search'},
	];
	const summary = aggregateSummary(events);
	t.is(summary.errors, 1);
	t.is(summary.toolCalls, 1);
});
