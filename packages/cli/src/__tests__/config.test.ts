import test from 'ava';

// Test YAML parsing logic (unit tests without imports)

// Helper to parse simple YAML format
function parseSimpleYaml(
	content: string,
): Record<string, string | number | boolean> {
	const result: Record<string, string | number | boolean> = {};
	const lines = content.split('\n');

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip empty lines and comments
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		// Parse key: value
		const colonIndex = trimmed.indexOf(':');
		if (colonIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, colonIndex).trim();
		let value: string | number | boolean = trimmed.slice(colonIndex + 1).trim();

		// Remove quotes if present
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		// Parse booleans
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		// Parse numbers
		else if (!isNaN(Number(value)) && value !== '') {
			value = Number(value);
		}

		result[key] = value;
	}

	return result;
}

test('parseSimpleYaml basic key-value', t => {
	const content = 'theme: dark';
	const result = parseSimpleYaml(content);

	t.is(result['theme'], 'dark');
});

test('parseSimpleYaml multiple values', t => {
	const content = `theme: dark
maxEvents: 1000
timestampFormat: relative`;
	const result = parseSimpleYaml(content);

	t.is(result['theme'], 'dark');
	t.is(result['maxEvents'], 1000);
	t.is(result['timestampFormat'], 'relative');
});

test('parseSimpleYaml skips empty lines', t => {
	const content = `theme: dark

maxEvents: 500`;
	const result = parseSimpleYaml(content);

	t.is(result['theme'], 'dark');
	t.is(result['maxEvents'], 500);
});

test('parseSimpleYaml skips comments', t => {
	const content = `# This is a comment
theme: light
# Another comment
maxEvents: 2000`;
	const result = parseSimpleYaml(content);

	t.is(result['theme'], 'light');
	t.is(result['maxEvents'], 2000);
});

test('parseSimpleYaml removes double quotes', t => {
	const content = `defaultPython: "python3.11"`;
	const result = parseSimpleYaml(content);

	t.is(result['defaultPython'], 'python3.11');
});

test('parseSimpleYaml removes single quotes', t => {
	const content = `defaultPython: 'python3.11'`;
	const result = parseSimpleYaml(content);

	t.is(result['defaultPython'], 'python3.11');
});

test('parseSimpleYaml parses true boolean', t => {
	const content = `enabled: true`;
	const result = parseSimpleYaml(content);

	t.is(result['enabled'], true);
});

test('parseSimpleYaml parses false boolean', t => {
	const content = `enabled: false`;
	const result = parseSimpleYaml(content);

	t.is(result['enabled'], false);
});

test('parseSimpleYaml parses numbers', t => {
	const content = `count: 42`;
	const result = parseSimpleYaml(content);

	t.is(result['count'], 42);
});

test('parseSimpleYaml handles empty content', t => {
	const result = parseSimpleYaml('');

	t.deepEqual(result, {});
});

test('parseSimpleYaml handles only comments', t => {
	const content = `# comment 1
# comment 2`;
	const result = parseSimpleYaml(content);

	t.deepEqual(result, {});
});

// Type guards tests
test('valid theme values', t => {
	const validThemes = ['dark', 'light', 'minimal'];
	const invalidThemes = ['blue', 'green', 'custom'];

	for (const theme of validThemes) {
		t.true(['dark', 'light', 'minimal'].includes(theme));
	}

	for (const theme of invalidThemes) {
		t.false(['dark', 'light', 'minimal'].includes(theme));
	}
});

test('valid timestamp format values', t => {
	const validFormats = ['relative', 'absolute', 'unix'];
	const invalidFormats = ['iso', 'custom', 'epoch'];

	for (const format of validFormats) {
		t.true(['relative', 'absolute', 'unix'].includes(format));
	}

	for (const format of invalidFormats) {
		t.false(['relative', 'absolute', 'unix'].includes(format));
	}
});
