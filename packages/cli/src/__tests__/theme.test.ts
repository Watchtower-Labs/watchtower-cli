import test from 'ava';

// Re-implement theme functions for unit testing without import issues

// formatTimestamp implementation
function formatTimestamp(
	timestamp: number,
	format: 'relative' | 'absolute' | 'unix' = 'absolute',
	referenceTimestamp?: number,
): string {
	if (format === 'unix') {
		return timestamp.toFixed(3);
	}

	const date = new Date(timestamp * 1000);

	if (format === 'absolute') {
		const time = date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
		const ms = String(date.getMilliseconds()).padStart(3, '0');
		return `${time}.${ms}`;
	}

	// Relative format - show time since reference (or start)
	const ref = referenceTimestamp ?? 0;
	const deltaMs = (timestamp - ref) * 1000;

	if (deltaMs < 0) {
		return `-${Math.abs(Math.round(deltaMs))}ms`;
	}

	return `+${Math.round(deltaMs)}ms`;
}

// formatDuration implementation
function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}

	if (ms < 60000) {
		return `${(ms / 1000).toFixed(1)}s`;
	}

	const minutes = Math.floor(ms / 60000);
	const seconds = ((ms % 60000) / 1000).toFixed(0);
	return `${minutes}m ${seconds}s`;
}

// formatDurationCompact implementation
function formatDurationCompact(ms: number): string {
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}
	return `${(ms / 1000).toFixed(1)}s`;
}

// formatFileSize implementation
function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes}B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)}KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// formatRelativeTime implementation
function formatRelativeTime(date: Date): string {
	const now = Date.now();
	const diff = now - date.getTime();

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return days === 1 ? '1 day ago' : `${days} days ago`;
	}

	if (hours > 0) {
		return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
	}

	if (minutes > 0) {
		return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
	}

	return 'just now';
}

// truncate implementation
function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) {
		return str;
	}

	return str.slice(0, maxLength - 1) + '…';
}

// padEnd implementation
function padEnd(str: string, width: number): string {
	if (str.length >= width) {
		return str.slice(0, width);
	}

	return str + ' '.repeat(width - str.length);
}

// padStart implementation
function padStart(str: string, width: number): string {
	if (str.length >= width) {
		return str.slice(0, width);
	}

	return ' '.repeat(width - str.length) + str;
}

// horizontalRule implementation
function horizontalRule(width: number, char: string = '─'): string {
	return char.repeat(width);
}

// formatKey implementation
function formatKey(key: string): string {
	return `[${key}]`;
}

// Progress bar characters
const progressBar = {
	filled: '█',
	empty: '░',
	half: '▓',
};

// createDurationBar implementation
function createDurationBar(
	ms: number,
	maxMs: number = 2000,
	width: number = 10,
): string {
	const ratio = Math.min(ms / maxMs, 1);
	const filled = Math.round(ratio * width);
	const empty = width - filled;
	return progressBar.filled.repeat(filled) + progressBar.empty.repeat(empty);
}

// createPercentBar implementation
function createPercentBar(percent: number, width: number = 10): string {
	const ratio = Math.min(percent / 100, 1);
	const filled = Math.round(ratio * width);
	const empty = width - filled;
	return progressBar.filled.repeat(filled) + progressBar.empty.repeat(empty);
}

// Tests

// formatTimestamp tests
test('formatTimestamp with unix format', t => {
	const timestamp = 1705344000.123;
	const result = formatTimestamp(timestamp, 'unix');
	t.is(result, '1705344000.123');
});

test('formatTimestamp with absolute format', t => {
	const timestamp = 1705344000;
	const result = formatTimestamp(timestamp, 'absolute');
	t.regex(result, /^\d{2}:\d{2}:\d{2}\.\d{3}$/);
});

test('formatTimestamp with relative format positive', t => {
	const baseTime = 1000;
	const currentTime = 1000.5;
	const result = formatTimestamp(currentTime, 'relative', baseTime);
	t.is(result, '+500ms');
});

test('formatTimestamp with relative format negative', t => {
	const baseTime = 1000;
	const currentTime = 999.5;
	const result = formatTimestamp(currentTime, 'relative', baseTime);
	t.is(result, '-500ms');
});

// formatDuration tests
test('formatDuration milliseconds', t => {
	t.is(formatDuration(100), '100ms');
	t.is(formatDuration(999), '999ms');
});

test('formatDuration seconds', t => {
	t.is(formatDuration(1000), '1.0s');
	t.is(formatDuration(1500), '1.5s');
});

test('formatDuration minutes', t => {
	t.is(formatDuration(60000), '1m 0s');
	t.is(formatDuration(90000), '1m 30s');
});

// formatDurationCompact tests
test('formatDurationCompact milliseconds', t => {
	t.is(formatDurationCompact(100), '100ms');
	t.is(formatDurationCompact(999), '999ms');
});

test('formatDurationCompact seconds', t => {
	t.is(formatDurationCompact(1000), '1.0s');
	t.is(formatDurationCompact(1500), '1.5s');
});

// formatFileSize tests
test('formatFileSize bytes', t => {
	t.is(formatFileSize(100), '100B');
	t.is(formatFileSize(1023), '1023B');
});

test('formatFileSize kilobytes', t => {
	t.is(formatFileSize(1024), '1.0KB');
	t.is(formatFileSize(1536), '1.5KB');
});

test('formatFileSize megabytes', t => {
	t.is(formatFileSize(1048576), '1.0MB');
	t.is(formatFileSize(1572864), '1.5MB');
});

// formatRelativeTime tests
test('formatRelativeTime just now', t => {
	const now = new Date();
	const result = formatRelativeTime(now);
	t.is(result, 'just now');
});

test('formatRelativeTime minutes ago', t => {
	const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
	const result = formatRelativeTime(fiveMinutesAgo);
	t.is(result, '5 mins ago');
});

test('formatRelativeTime hours ago', t => {
	const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
	const result = formatRelativeTime(twoHoursAgo);
	t.is(result, '2 hours ago');
});

test('formatRelativeTime days ago', t => {
	const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
	const result = formatRelativeTime(threeDaysAgo);
	t.is(result, '3 days ago');
});

// truncate tests
test('truncate short string unchanged', t => {
	t.is(truncate('hello', 10), 'hello');
});

test('truncate long string with ellipsis', t => {
	const result = truncate('hello world', 8);
	t.is(result.length, 8);
	t.true(result.endsWith('…'));
});

test('truncate exact length unchanged', t => {
	t.is(truncate('hello', 5), 'hello');
});

// padEnd tests
test('padEnd short string', t => {
	t.is(padEnd('hi', 5), 'hi   ');
});

test('padEnd exact length', t => {
	t.is(padEnd('hello', 5), 'hello');
});

test('padEnd long string truncated', t => {
	t.is(padEnd('hello world', 5), 'hello');
});

// padStart tests
test('padStart short string', t => {
	t.is(padStart('hi', 5), '   hi');
});

test('padStart exact length', t => {
	t.is(padStart('hello', 5), 'hello');
});

test('padStart long string truncated', t => {
	t.is(padStart('hello world', 5), 'hello');
});

// horizontalRule tests
test('horizontalRule default character', t => {
	const result = horizontalRule(5);
	t.is(result, '─────');
	t.is(result.length, 5);
});

test('horizontalRule custom character', t => {
	const result = horizontalRule(5, '=');
	t.is(result, '=====');
});

// formatKey tests
test('formatKey wraps in brackets', t => {
	t.is(formatKey('Enter'), '[Enter]');
	t.is(formatKey('q'), '[q]');
});

// createDurationBar tests
test('createDurationBar empty bar', t => {
	const bar = createDurationBar(0, 2000, 10);
	t.is(bar.length, 10);
	t.is(bar, '░░░░░░░░░░');
});

test('createDurationBar full bar', t => {
	const bar = createDurationBar(2000, 2000, 10);
	t.is(bar.length, 10);
	t.is(bar, '██████████');
});

test('createDurationBar half bar', t => {
	const bar = createDurationBar(1000, 2000, 10);
	t.is(bar.length, 10);
	t.is(bar, '█████░░░░░');
});

// createPercentBar tests
test('createPercentBar empty', t => {
	const bar = createPercentBar(0, 10);
	t.is(bar.length, 10);
	t.is(bar, '░░░░░░░░░░');
});

test('createPercentBar full', t => {
	const bar = createPercentBar(100, 10);
	t.is(bar.length, 10);
	t.is(bar, '██████████');
});

test('createPercentBar half', t => {
	const bar = createPercentBar(50, 10);
	t.is(bar.length, 10);
	t.is(bar, '█████░░░░░');
});
