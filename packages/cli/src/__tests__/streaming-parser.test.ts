import test from 'ava';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
	StreamingTraceParser,
	createStreamingParser,
	parseTraceFileStreaming,
} from '../lib/streaming-parser.js';
import type {TraceEvent} from '../lib/types.js';

// Helper to create a test trace file
function createTestTraceFile(eventCount: number): string {
	const tmpDir = os.tmpdir();
	const fileName = `test-trace-${Date.now()}-${Math.random()
		.toString(36)
		.slice(2)}.jsonl`;
	const filePath = path.join(tmpDir, fileName);

	const events: TraceEvent[] = [];
	for (let i = 0; i < eventCount; i++) {
		events.push({
			type: 'llm.request',
			run_id: 'test123',
			timestamp: 1234567890.0 + i,
			request_id: `req-${i}`,
			model: 'gemini-2.0-flash',
			message_count: 1,
			tools_available: ['search', 'calculator'],
		});
	}

	const content = events.map(e => JSON.stringify(e)).join('\n');

	fs.writeFileSync(filePath, content, 'utf-8');

	return filePath;
}

// Cleanup function
function cleanup(filePath: string): void {
	try {
		fs.unlinkSync(filePath);
	} catch {
		// Ignore cleanup errors
	}
}

test('StreamingTraceParser creates successfully', t => {
	const filePath = createTestTraceFile(10);
	const parser = createStreamingParser(filePath);

	t.is(parser instanceof StreamingTraceParser, true);

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser counts events correctly', async t => {
	const filePath = createTestTraceFile(250);
	const parser = new StreamingTraceParser(filePath);

	const count = await parser.countPromise;

	t.is(count, 250);

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser gets first page', async t => {
	const filePath = createTestTraceFile(300);
	const parser = new StreamingTraceParser(filePath, {pageSize: 100});

	const page = await parser.getPage(0);

	t.is(page.events.length, 100);
	t.is(page.page, 0);
	t.is(page.totalPages, 3);
	t.is(page.totalEvents, 300);
	t.is(page.hasNext, true);
	t.is(page.hasPrevious, false);

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser gets middle page', async t => {
	const filePath = createTestTraceFile(300);
	const parser = new StreamingTraceParser(filePath, {pageSize: 100});

	const page = await parser.getPage(1);

	t.is(page.events.length, 100);
	t.is(page.page, 1);
	t.is(page.totalPages, 3);
	t.is(page.totalEvents, 300);
	t.is(page.hasNext, true);
	t.is(page.hasPrevious, true);

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser gets last page', async t => {
	const filePath = createTestTraceFile(250);
	const parser = new StreamingTraceParser(filePath, {pageSize: 100});

	const page = await parser.getPage(2);

	t.is(page.events.length, 50); // Last page may have fewer events
	t.is(page.page, 2);
	t.is(page.totalPages, 3);
	t.is(page.totalEvents, 250);
	t.is(page.hasNext, false);
	t.is(page.hasPrevious, true);

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser throws for invalid page', async t => {
	const filePath = createTestTraceFile(100);
	const parser = new StreamingTraceParser(filePath);

	await t.throwsAsync(async () => parser.getPage(999), {
		message: /out of range/,
	});

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser throws for negative page', async t => {
	const filePath = createTestTraceFile(100);
	const parser = new StreamingTraceParser(filePath);

	await t.throwsAsync(async () => parser.getPage(-1), {
		message: /must be >= 0/,
	});

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser respects page size', async t => {
	const filePath = createTestTraceFile(500);
	const parser = new StreamingTraceParser(filePath, {pageSize: 50});

	const page = await parser.getPage(0);

	t.is(page.events.length, 50);
	t.is(page.totalPages, 10);

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser cancels correctly', async t => {
	const filePath = createTestTraceFile(1000);
	const parser = new StreamingTraceParser(filePath);

	// Cancel immediately
	parser.cancel();

	// Wait a bit for cancellation to take effect
	await new Promise(resolve => setTimeout(resolve, 100));

	await t.throwsAsync(async () => parser.getPage(0), {message: /cancelled/});

	cleanup(filePath);
});

test('StreamingTraceParser handles progress callback', async t => {
	const filePath = createTestTraceFile(200);
	const progressUpdates: Array<{current: number; total: number}> = [];

	const parser = new StreamingTraceParser(filePath, {
		onProgress: progress => {
			progressUpdates.push(progress);
		},
	});

	// Wait for count to complete
	await parser.countPromise;

	// Should have received at least one progress update
	t.true(progressUpdates.length > 0);

	parser.cancel();
	cleanup(filePath);
});

test('parseTraceFileStreaming loads all events', async t => {
	const filePath = createTestTraceFile(150);
	const pageSize = 50;

	const result = await parseTraceFileStreaming(filePath, {pageSize});

	t.is(result.events.length, 150);
	t.is(result.errors, 0);

	cleanup(filePath);
});

test('parseTraceFileStreaming handles malformed lines', async t => {
	const tmpDir = os.tmpdir();
	const fileName = `test-trace-malformed-${Date.now()}.jsonl`;
	const filePath = path.join(tmpDir, fileName);

	const events: TraceEvent[] = [];
	for (let i = 0; i < 10; i++) {
		events.push({
			type: 'llm.request',
			run_id: 'test123',
			timestamp: 1234567890.0 + i,
			request_id: `req-${i}`,
			model: 'gemini-2.0-flash',
			message_count: 1,
			tools_available: ['search', 'calculator'],
		});
	}

	const content =
		events.map(e => JSON.stringify(e)).join('\n') +
		'\nmalformed json line\n' +
		'\n# comment line\n' +
		JSON.stringify(events[0]);

	fs.writeFileSync(filePath, content, 'utf-8');

	const result = await parseTraceFileStreaming(filePath);

	// Should have loaded valid events and counted errors
	t.true(result.events.length >= 10);
	t.true(result.errors > 0);

	cleanup(filePath);
});

test('StreamingTraceParser caches pages', async t => {
	const filePath = createTestTraceFile(300);
	const parser = new StreamingTraceParser(filePath, {pageSize: 100});

	// Load page 0
	const page1 = await parser.getPage(0);
	const events1 = page1.events[0];

	// Load page 0 again (should use cache)
	const page1Again = await parser.getPage(0);
	const events1Again = page1Again.events[0];

	// Should return the same object reference (cached)
	t.is(events1, events1Again);

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser with large file (memory efficiency)', async t => {
	// Create a file with 10,000 events
	const filePath = createTestTraceFile(10000);
	const parser = new StreamingTraceParser(filePath, {pageSize: 100});

	// Load first page - should not load all events
	const page = await parser.getPage(0);

	t.is(page.events.length, 100);
	t.is(page.totalEvents, 10000);
	t.is(page.totalPages, 100);

	// The key test: loading one page should not consume
	// memory proportional to total events
	// (In a real test, we'd measure memory usage)

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser handles empty file', async t => {
	const tmpDir = os.tmpdir();
	const fileName = `test-trace-empty-${Date.now()}.jsonl`;
	const filePath = path.join(tmpDir, fileName);

	fs.writeFileSync(filePath, '', 'utf-8');

	const parser = new StreamingTraceParser(filePath);
	const count = await parser.countPromise;

	t.is(count, 0);

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser handles single event file', async t => {
	const filePath = createTestTraceFile(1);
	const parser = new StreamingTraceParser(filePath);

	const page = await parser.getPage(0);

	t.is(page.events.length, 1);
	t.is(page.totalPages, 1);
	t.is(page.hasNext, false);
	t.is(page.hasPrevious, false);

	parser.cancel();
	cleanup(filePath);
});

test('StreamingTraceParser summary duration uses milliseconds', async t => {
	const tmpDir = os.tmpdir();
	const fileName = `test-trace-duration-${Date.now()}.jsonl`;
	const filePath = path.join(tmpDir, fileName);

	const lines = [
		JSON.stringify({
			type: 'run.start',
			run_id: 'test123',
			timestamp: 1000,
			agent_name: 'agent',
		}),
		JSON.stringify({
			type: 'run.end',
			run_id: 'test123',
			timestamp: 1001.5,
			duration_ms: 1500,
		}),
	];
	fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');

	const parser = new StreamingTraceParser(filePath);
	const summary = await parser.summaryPromise;

	t.is(summary.duration, 1500);

	parser.cancel();
	cleanup(filePath);
});
