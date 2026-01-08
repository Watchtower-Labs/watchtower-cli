/**
 * Trace file path utilities
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type {TraceFileInfo} from './types.js';

// Default trace directory
const DEFAULT_TRACE_DIR = '.watchtower/traces';

/**
 * Check if a file path is within the trace directory (security: prevent path traversal)
 *
 * This function uses fs.realpathSync() to resolve symlinks, preventing symlink-based
 * directory escape attacks (e.g., traces/evil.jsonl -> /etc/passwd).
 *
 * @param filePath - The file path to check
 * @param traceDir - The trace directory to check against
 * @returns true if the path is within the trace directory
 */
function isWithinTraceDir(filePath: string, traceDir: string): boolean {
	try {
		// Resolve symlinks to get the actual path
		// This prevents symlink escape attacks where a file inside the trace dir
		// is a symlink pointing outside (e.g., traces/evil.jsonl -> /etc/passwd)
		const resolvedPath = fs.existsSync(filePath)
			? fs.realpathSync(filePath)
			: path.resolve(filePath);
		const resolvedTraceDir = fs.existsSync(traceDir)
			? fs.realpathSync(traceDir)
			: path.resolve(traceDir);

		// Calculate relative path from trace directory
		const relative = path.relative(resolvedTraceDir, resolvedPath);

		// If relative path starts with '..', it's outside the trace directory
		// If it's an absolute path, it's also outside
		return !relative.startsWith('..') && !path.isAbsolute(relative);
	} catch {
		// If realpath fails (e.g., broken symlink), deny access
		return false;
	}
}

// Get the trace directory path
export function getTraceDir(): string {
	const envDir = process.env['WATCHTOWER_TRACE_DIR'];
	if (envDir) {
		return path.resolve(envDir);
	}

	return path.join(os.homedir(), DEFAULT_TRACE_DIR);
}

// Ensure trace directory exists
export function ensureTraceDir(): string {
	const traceDir = getTraceDir();
	if (!fs.existsSync(traceDir)) {
		fs.mkdirSync(traceDir, {recursive: true, mode: 0o700});
	}

	return traceDir;
}

// Check if a path is a valid trace file
export function isTraceFile(filePath: string): boolean {
	return (
		filePath.endsWith('.jsonl') &&
		fs.existsSync(filePath) &&
		fs.statSync(filePath).isFile()
	);
}

// Parse trace filename to extract run ID and date
// Format: {date}_{run_id}.jsonl (e.g., 2024-01-15_abc123.jsonl)
export function parseTraceFilename(filename: string): {
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

// Resolve a trace reference to an absolute file path
// Accepts: "last", run ID (e.g., "abc123"), or file path
export async function resolveTracePath(traceRef: string): Promise<string> {
	const traceDir = getTraceDir();

	// If it's a file path (absolute or relative)
	if (traceRef.includes('/') || traceRef.includes('\\')) {
		const resolved = path.resolve(traceRef);

		// Security: Prevent path traversal attacks
		// Only allow files within the trace directory
		if (!isWithinTraceDir(resolved, traceDir)) {
			throw new Error(
				`Access denied: Trace files must be within ${traceDir}. ` +
					`Use 'watchtower list' to see available traces.`,
			);
		}

		if (!fs.existsSync(resolved)) {
			throw new Error(`Trace file not found: ${resolved}`);
		}

		return resolved;
	}

	// If it ends with .jsonl, treat as filename
	if (traceRef.endsWith('.jsonl')) {
		const resolved = path.join(traceDir, traceRef);

		// Security: Verify the resolved path is still within trace directory
		// (in case filename contains path components like "../")
		if (!isWithinTraceDir(resolved, traceDir)) {
			throw new Error(
				`Access denied: Invalid trace filename. ` +
					`Use 'watchtower list' to see available traces.`,
			);
		}

		if (!fs.existsSync(resolved)) {
			throw new Error(`Trace file not found: ${resolved}`);
		}

		return resolved;
	}

	// Handle "last" - get most recent trace
	if (traceRef === 'last') {
		const files = await listTraceFiles({limit: 1});
		if (files.length === 0) {
			throw new Error(`No traces found in ${traceDir}`);
		}

		return files[0]!.path;
	}

	// Otherwise, treat as run ID - search for matching file
	if (!fs.existsSync(traceDir)) {
		throw new Error(`Trace directory not found: ${traceDir}`);
	}

	const entries = fs.readdirSync(traceDir);
	const matchingFile = entries.find(entry => {
		const parsed = parseTraceFilename(entry);
		return parsed && parsed.runId === traceRef;
	});

	if (!matchingFile) {
		throw new Error(
			`No trace found with run ID: ${traceRef}. Use 'watchtower list' to see available traces.`,
		);
	}

	return path.join(traceDir, matchingFile);
}

// List trace files with optional filtering
export interface ListTracesOptions {
	limit?: number;
	since?: string; // Date string YYYY-MM-DD
}

export async function listTraceFiles(
	options: ListTracesOptions = {},
): Promise<TraceFileInfo[]> {
	const {limit = 100, since} = options;
	const traceDir = getTraceDir();

	if (!fs.existsSync(traceDir)) {
		return [];
	}

	const entries = fs.readdirSync(traceDir);
	const traceFiles: TraceFileInfo[] = [];

	for (const entry of entries) {
		const parsed = parseTraceFilename(entry);
		if (!parsed) {
			continue;
		}

		// Filter by date if specified
		if (since && parsed.date < since) {
			continue;
		}

		const filePath = path.join(traceDir, entry);

		// Handle TOCTOU race: file may be deleted between readdir and stat
		try {
			const stats = fs.statSync(filePath);
			traceFiles.push({
				path: filePath,
				runId: parsed.runId,
				date: parsed.date,
				size: stats.size,
				modifiedAt: stats.mtime,
			});
		} catch (err) {
			// File was deleted or became inaccessible between readdir and stat
			// Skip this entry silently
			continue;
		}
	}

	// Sort by modification time (newest first)
	traceFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

	// Apply limit
	return traceFiles.slice(0, limit);
}

// Get trace file info by path
export function getTraceFileInfo(filePath: string): TraceFileInfo | null {
	if (!fs.existsSync(filePath)) {
		return null;
	}

	const stats = fs.statSync(filePath);
	const filename = path.basename(filePath);
	const parsed = parseTraceFilename(filename);

	return {
		path: filePath,
		runId: parsed?.runId ?? 'unknown',
		date: parsed?.date ?? 'unknown',
		size: stats.size,
		modifiedAt: stats.mtime,
	};
}

// Delete a trace file
export function deleteTraceFile(filePath: string): boolean {
	try {
		if (fs.existsSync(filePath) && isTraceFile(filePath)) {
			fs.unlinkSync(filePath);
			return true;
		}

		return false;
	} catch {
		return false;
	}
}
