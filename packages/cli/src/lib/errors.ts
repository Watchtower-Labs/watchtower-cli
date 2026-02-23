/**
 * Structured error handling for Watchtower CLI
 *
 * Provides error codes, user-friendly messages, and troubleshooting hints.
 */

export interface WatchtowerCliError {
	code: string;
	title: string;
	message: string;
	hints?: string[];
	details?: string;
}

// Error code prefixes:
// WT1xx - Trace file errors
// WT2xx - Parse errors
// WT3xx - Configuration errors
// WT4xx - Process/runtime errors

const ERROR_PATTERNS: Array<{
	pattern: RegExp;
	error: (match: RegExpMatchArray, original: string) => WatchtowerCliError;
}> = [
	// No traces found
	{
		pattern: /No traces found in (.+)/,
		error: (match, _original) => ({
			code: 'WT101',
			title: 'No Traces Found',
			message: `No trace files found in ${match[1]}`,
			hints: [
				'Run an agent with the Watchtower SDK to create traces',
				'Check WATCHTOWER_TRACE_DIR if using a custom directory',
				'Example: python your_agent.py (with AgentTracePlugin installed)',
			],
		}),
	},
	// Trace file not found
	{
		pattern: /Trace file not found: (.+)/,
		error: (match, _original) => ({
			code: 'WT102',
			title: 'Trace File Not Found',
			message: `Could not find trace file at: ${match[1]}`,
			hints: [
				"Run 'watchtower list' to see available traces",
				'The trace may have been deleted by cleanup',
				'Check the run ID is correct',
			],
		}),
	},
	// No trace with run ID
	{
		pattern: /No trace found with run ID: (.+)/,
		error: (match, _original) => ({
			code: 'WT103',
			title: 'Unknown Run ID',
			message: `No trace found with run ID: ${match[1]}`,
			hints: [
				"Run 'watchtower list' to see available traces",
				'Run IDs are 8-character identifiers (e.g., abc12345)',
				'The trace may have been deleted by cleanup',
			],
		}),
	},
	// Trace directory not found
	{
		pattern: /Trace directory not found: (.+)/,
		error: (match, _original) => ({
			code: 'WT104',
			title: 'Trace Directory Not Found',
			message: `Trace directory does not exist: ${match[1]}`,
			hints: [
				'Run an agent with Watchtower SDK to create the directory',
				'Check WATCHTOWER_TRACE_DIR environment variable',
				'The default directory is ~/.watchtower/traces',
			],
		}),
	},
	// Access denied (path traversal)
	{
		pattern: /Access denied: (.+)/,
		error: (match, _original) => ({
			code: 'WT105',
			title: 'Access Denied',
			message: match[1] ?? 'Access to this path is not allowed',
			hints: [
				"Use 'watchtower list' to see available traces",
				'Only traces in the watchtower directory can be viewed',
			],
		}),
	},
	// Parse error
	{
		pattern: /Failed to parse trace/i,
		error: (_match, original) => ({
			code: 'WT201',
			title: 'Parse Error',
			message: 'The trace file could not be parsed',
			hints: [
				'The file may be corrupted or incomplete',
				'Try viewing a different trace',
				'Check if the agent completed successfully',
			],
			details: original,
		}),
	},
	// Invalid JSON
	{
		pattern: /JSON/i,
		error: (_match, original) => ({
			code: 'WT202',
			title: 'Invalid Trace Format',
			message: 'The trace file contains invalid JSON',
			hints: [
				'The file may be corrupted',
				'Check if the agent was interrupted during write',
				'Try running the agent again',
			],
			details: original,
		}),
	},
	// ENOENT (file not found at OS level)
	{
		pattern: /ENOENT/,
		error: (_match, original) => ({
			code: 'WT106',
			title: 'File Not Found',
			message: 'The requested file does not exist',
			hints: [
				"Run 'watchtower list' to see available traces",
				'The file may have been moved or deleted',
			],
			details: original,
		}),
	},
	// EACCES (permission denied at OS level)
	{
		pattern: /EACCES/,
		error: (_match, original) => ({
			code: 'WT107',
			title: 'Permission Denied',
			message: 'Cannot read the trace file (permission denied)',
			hints: [
				'Check file permissions on the trace directory',
				'Ensure you own the trace files',
			],
			details: original,
		}),
	},
	// Process spawn errors
	{
		pattern: /spawn (.+) ENOENT/,
		error: (match, _original) => ({
			code: 'WT401',
			title: 'Command Not Found',
			message: `Could not find command: ${match[1]}`,
			hints: [
				`Ensure '${match[1]}' is installed and in your PATH`,
				'Try using the full path to the executable',
				'Check your Python installation',
			],
		}),
	},
];

/**
 * Parse an error message into a structured WatchtowerCliError
 */
export function parseError(error: string | Error): WatchtowerCliError {
	const message = error instanceof Error ? error.message : error;

	// Try to match against known patterns
	for (const {pattern, error: errorFn} of ERROR_PATTERNS) {
		const match = pattern.exec(message);
		if (match) {
			return errorFn(match, message);
		}
	}

	// Generic fallback
	return {
		code: 'WT999',
		title: 'Error',
		message,
		hints: [
			"Run 'watchtower --help' for usage information",
			'Check the GitHub issues for known problems',
		],
	};
}

/**
 * Format an error for display
 */
export function formatError(error: WatchtowerCliError): string {
	const lines: string[] = [];

	lines.push(`Error [${error.code}]: ${error.title}`);
	lines.push(`  ${error.message}`);

	if (error.hints && error.hints.length > 0) {
		lines.push('');
		lines.push('Possible solutions:');
		for (const hint of error.hints) {
			lines.push(`  - ${hint}`);
		}
	}

	if (error.details) {
		lines.push('');
		lines.push('Details:');
		lines.push(`  ${error.details}`);
	}

	return lines.join('\n');
}
