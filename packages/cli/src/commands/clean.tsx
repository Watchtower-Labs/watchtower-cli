/**
 * Clean command - Delete old traces based on retention policy
 */

import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {getTraceDir} from '../lib/paths.js';
import {formatFileSize} from '../lib/theme.js';

// Trace file pattern: {date}_{run_id}.jsonl
const TRACE_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})_([a-zA-Z0-9]+)\.jsonl$/;

interface CleanCommandProps {
	dryRun?: boolean;
	all?: boolean;
	retentionDays?: number;
}

interface TraceFile {
	path: string;
	date: string;
	size: number;
}

function listExpiredTraces(retentionDays: number): TraceFile[] {
	const traceDir = getTraceDir();

	if (!fs.existsSync(traceDir)) {
		return [];
	}

	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
	const cutoffStr = cutoffDate.toISOString().split('T')[0]!;

	const expired: TraceFile[] = [];

	const entries = fs.readdirSync(traceDir);
	for (const entry of entries) {
		const match = TRACE_FILE_PATTERN.exec(entry);
		if (!match) {
			continue;
		}

		const dateStr = match[1]!;
		if (dateStr < cutoffStr) {
			const filePath = path.join(traceDir, entry);
			try {
				const stats = fs.statSync(filePath);
				expired.push({
					path: filePath,
					date: dateStr,
					size: stats.size,
				});
			} catch {
				// File may have been deleted
				continue;
			}
		}
	}

	return expired;
}

function listAllTraces(): TraceFile[] {
	const traceDir = getTraceDir();

	if (!fs.existsSync(traceDir)) {
		return [];
	}

	const traces: TraceFile[] = [];

	const entries = fs.readdirSync(traceDir);
	for (const entry of entries) {
		const match = TRACE_FILE_PATTERN.exec(entry);
		if (!match) {
			continue;
		}

		const filePath = path.join(traceDir, entry);
		try {
			const stats = fs.statSync(filePath);
			traces.push({
				path: filePath,
				date: match[1]!,
				size: stats.size,
			});
		} catch {
			continue;
		}
	}

	return traces;
}

export function CleanCommand({
	dryRun = false,
	all = false,
	retentionDays = 30,
}: CleanCommandProps) {
	const [status, setStatus] = useState<'scanning' | 'done' | 'error'>(
		'scanning',
	);
	const [deletedCount, setDeletedCount] = useState(0);
	const [bytesFreed, setBytesFreed] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [filesToDelete, setFilesToDelete] = useState<TraceFile[]>([]);

	useEffect(() => {
		try {
			const files = all ? listAllTraces() : listExpiredTraces(retentionDays);
			setFilesToDelete(files);

			if (files.length === 0) {
				setStatus('done');
				return;
			}

			let count = 0;
			let bytes = 0;

			for (const file of files) {
				if (!dryRun) {
					try {
						fs.unlinkSync(file.path);
					} catch {
						// Skip files that can't be deleted
						continue;
					}
				}
				count++;
				bytes += file.size;
			}

			setDeletedCount(count);
			setBytesFreed(bytes);
			setStatus('done');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setStatus('error');
		}
	}, [dryRun, all, retentionDays]);

	if (status === 'scanning') {
		return (
			<Box>
				<Text color="yellow">Scanning for traces to clean...</Text>
			</Box>
		);
	}

	if (status === 'error') {
		return (
			<Box>
				<Text color="red">Error: {error}</Text>
			</Box>
		);
	}

	if (filesToDelete.length === 0) {
		return (
			<Box flexDirection="column">
				<Text color="green">No traces to clean.</Text>
				{!all && (
					<Text color="gray">
						All traces are within the {retentionDays}-day retention period.
					</Text>
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			{dryRun ? (
				<>
					<Text color="yellow">Dry run - no files deleted</Text>
					<Text>
						Would delete{' '}
						<Text color="cyan" bold>
							{deletedCount}
						</Text>{' '}
						trace{deletedCount === 1 ? '' : 's'} ({formatFileSize(bytesFreed)})
					</Text>
					<Box marginTop={1}>
						<Text color="gray">Files that would be deleted:</Text>
					</Box>
					{filesToDelete.slice(0, 10).map(file => (
						<Text key={file.path} color="gray">
							{' '}
							{path.basename(file.path)} ({formatFileSize(file.size)})
						</Text>
					))}
					{filesToDelete.length > 10 && (
						<Text color="gray"> ... and {filesToDelete.length - 10} more</Text>
					)}
				</>
			) : (
				<>
					<Text color="green">
						Deleted <Text bold>{deletedCount}</Text> trace
						{deletedCount === 1 ? '' : 's'}
					</Text>
					<Text>
						Freed{' '}
						<Text color="cyan" bold>
							{formatFileSize(bytesFreed)}
						</Text>
					</Text>
				</>
			)}
		</Box>
	);
}

export default CleanCommand;
