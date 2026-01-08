import test from 'ava';
import * as path from 'node:path';

// Re-implement path functions for unit testing

// parseTraceFilename implementation
function parseTraceFilename(filename: string): {
	date: string;
	runId: string;
} | null {
	const match = /^(\d{4}-\d{2}-\d{2})_([a-zA-Z0-9]+)\.jsonl$/.exec(filename);
	if (!match) {
		return null;
	}

	return {
		date: match[1]!,
		runId: match[2]!,
	};
}

// isWithinTraceDir implementation
function isWithinTraceDir(filePath: string, traceDir: string): boolean {
	const resolvedPath = path.resolve(filePath);
	const resolvedTraceDir = path.resolve(traceDir);

	const relative = path.relative(resolvedTraceDir, resolvedPath);

	return !relative.startsWith('..') && !path.isAbsolute(relative);
}

// parseTraceFilename tests
test('parseTraceFilename valid filename', t => {
	const result = parseTraceFilename('2024-01-15_abc123.jsonl');

	t.deepEqual(result, {
		date: '2024-01-15',
		runId: 'abc123',
	});
});

test('parseTraceFilename with long run ID', t => {
	const result = parseTraceFilename('2024-12-31_abcdef12.jsonl');

	t.deepEqual(result, {
		date: '2024-12-31',
		runId: 'abcdef12',
	});
});

test('parseTraceFilename invalid format - no underscore', t => {
	const result = parseTraceFilename('2024-01-15abc123.jsonl');
	t.is(result, null);
});

test('parseTraceFilename invalid format - wrong date format', t => {
	const result = parseTraceFilename('24-01-15_abc123.jsonl');
	t.is(result, null);
});

test('parseTraceFilename invalid format - wrong extension', t => {
	const result = parseTraceFilename('2024-01-15_abc123.json');
	t.is(result, null);
});

test('parseTraceFilename invalid format - empty run ID', t => {
	const result = parseTraceFilename('2024-01-15_.jsonl');
	t.is(result, null);
});

test('parseTraceFilename invalid format - empty string', t => {
	const result = parseTraceFilename('');
	t.is(result, null);
});

test('parseTraceFilename handles uppercase run ID', t => {
	const result = parseTraceFilename('2024-01-15_ABC123.jsonl');

	t.deepEqual(result, {
		date: '2024-01-15',
		runId: 'ABC123',
	});
});

test('parseTraceFilename handles mixed case run ID', t => {
	const result = parseTraceFilename('2024-01-15_AbC123xYz.jsonl');

	t.deepEqual(result, {
		date: '2024-01-15',
		runId: 'AbC123xYz',
	});
});

// isWithinTraceDir tests
test('isWithinTraceDir valid path within trace dir', t => {
	const traceDir = '/home/user/.watchtower/traces';
	const validPath = '/home/user/.watchtower/traces/2024-01-15_abc123.jsonl';

	t.true(isWithinTraceDir(validPath, traceDir));
});

test('isWithinTraceDir path traversal attempt blocked', t => {
	const traceDir = '/home/user/.watchtower/traces';
	const invalidPath = '/home/user/.watchtower/traces/../../../etc/passwd';

	t.false(isWithinTraceDir(invalidPath, traceDir));
});

test('isWithinTraceDir nested path is valid', t => {
	const traceDir = '/home/user/.watchtower/traces';
	const nestedPath = '/home/user/.watchtower/traces/subdir/file.jsonl';

	t.true(isWithinTraceDir(nestedPath, traceDir));
});

test('isWithinTraceDir completely different path blocked', t => {
	const traceDir = '/home/user/.watchtower/traces';
	const differentPath = '/tmp/traces/file.jsonl';

	t.false(isWithinTraceDir(differentPath, traceDir));
});

test('isWithinTraceDir parent directory blocked', t => {
	const traceDir = '/home/user/.watchtower/traces';
	const parentPath = '/home/user/.watchtower/file.jsonl';

	t.false(isWithinTraceDir(parentPath, traceDir));
});

// Date filtering tests
test('date string comparison works for filtering', t => {
	const dates = ['2024-01-15', '2024-01-16', '2024-01-14'];
	const since = '2024-01-15';

	const filtered = dates.filter(date => date >= since);

	t.deepEqual(filtered.sort(), ['2024-01-15', '2024-01-16']);
});

test('date string comparison handles edge cases', t => {
	const date1 = '2024-01-01';
	const date2 = '2024-12-31';
	const date3 = '2023-12-31';

	t.true(date2 > date1);
	t.true(date1 > date3);
	t.true(date2 > date3);
});

test('date string comparison month boundaries', t => {
	const jan = '2024-01-31';
	const feb = '2024-02-01';

	t.true(feb > jan);
});

test('date string comparison year boundaries', t => {
	const dec2023 = '2023-12-31';
	const jan2024 = '2024-01-01';

	t.true(jan2024 > dec2023);
});
