/**
 * List command - Browse recent trace files
 *
 * Design: Table view with selectable rows
 */

import React, {useState, useEffect, useCallback} from 'react';
import {spawn} from 'node:child_process';
import {Box, Text, useApp} from 'ink';
import {Header} from '../components/Header.js';
import {StatusBar} from '../components/StatusBar.js';
import {Spinner} from '../components/Spinner.js';
import {ErrorDisplay} from '../components/ErrorDisplay.js';
import {useKeyboard} from '../hooks/useKeyboard.js';
import {listTraceFiles, type ListTracesOptions} from '../lib/paths.js';
import type {TraceFileInfo} from '../lib/types.js';
import {formatFileSize, formatRelativeTime, colors} from '../lib/theme.js';
import {getBookmarkedIds, toggleBookmark} from '../lib/bookmarks.js';

export interface ListCommandProps {
	limit?: number;
	since?: string;
}

export function ListCommand({
	limit = 10,
	since,
}: ListCommandProps): React.ReactElement {
	const {exit} = useApp();
	const [traces, setTraces] = useState<TraceFileInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
	const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

	// Handle bookmark toggle
	const handleToggleBookmark = useCallback(() => {
		const selected = traces[selectedIndex];
		if (selected) {
			const isNowBookmarked = toggleBookmark(selected.runId);
			// Update local state
			setBookmarkedIds(prev => {
				const next = new Set(prev);
				if (isNowBookmarked) {
					next.add(selected.runId);
				} else {
					next.delete(selected.runId);
				}
				return next;
			});
		}
	}, [traces, selectedIndex]);

	// Load trace files and bookmarks
	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const options: ListTracesOptions = {limit, since};
				const files = await listTraceFiles(options);
				const bookmarks = getBookmarkedIds();

				// Sort traces: bookmarked first, then by date
				const sortedFiles = [...files].sort((a, b) => {
					const aBookmarked = bookmarks.has(a.runId);
					const bBookmarked = bookmarks.has(b.runId);
					if (aBookmarked && !bBookmarked) return -1;
					if (!aBookmarked && bBookmarked) return 1;
					return b.modifiedAt.getTime() - a.modifiedAt.getTime();
				});

				// Only update state if component is still mounted
				if (!cancelled) {
					setTraces(sortedFiles);
					setBookmarkedIds(bookmarks);
				}
			} catch (err) {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : 'Failed to list traces',
					);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		void load();

		// Cleanup: mark as cancelled when component unmounts
		return () => {
			cancelled = true;
		};
	}, [limit, since]);

	// Handle navigation to selected trace
	useEffect(() => {
		if (selectedTrace) {
			// Exit Ink app and spawn watchtower show command
			exit();

			// Use process.nextTick to ensure Ink has cleaned up
			process.nextTick(() => {
				const child = spawn(
					process.argv[0]!,
					[process.argv[1]!, 'show', selectedTrace],
					{
						stdio: 'inherit',
						detached: false,
					},
				);

				child.on('exit', code => {
					process.exit(code ?? 0);
				});
			});
		}
	}, [selectedTrace, exit]);

	// Keyboard navigation
	useKeyboard({
		onUp: () => {
			setSelectedIndex(i => Math.max(0, i - 1));
		},
		onDown: () => {
			setSelectedIndex(i => {
				if (traces.length === 0) return 0;
				return Math.min(traces.length - 1, i + 1);
			});
		},
		onEnter: () => {
			const selected = traces[selectedIndex];
			if (selected) {
				// Set selected trace to trigger navigation
				setSelectedTrace(selected.runId);
			}
		},
		onCustom: key => {
			if (key === '*') {
				handleToggleBookmark();
			}
		},
	});

	// Loading state
	if (loading) {
		return (
			<Box flexDirection="column">
				<Header runId="list" />
				<Box
					borderStyle="round"
					borderColor={colors.border.secondary}
					paddingX={1}
					paddingY={1}
				>
					<Spinner type="dots" color="cyan" label="Loading traces..." />
				</Box>
			</Box>
		);
	}

	// Error state
	if (error) {
		return (
			<Box flexDirection="column">
				<Header runId="list" />
				<ErrorDisplay error={error} />
				<StatusBar keys={['q: Quit']} />
			</Box>
		);
	}

	// Empty state
	if (traces.length === 0) {
		return (
			<Box flexDirection="column">
				<Header runId="list" />
				<Box
					borderStyle="round"
					borderColor={colors.border.secondary}
					paddingX={1}
					flexDirection="column"
				>
					<Text bold color={colors.brand.primary}>
						Recent Traces
					</Text>
					<Box marginTop={1}>
						<Text dimColor>No traces found</Text>
					</Box>
					<Text dimColor>Run an agent with watchtower to create traces</Text>
				</Box>
				<StatusBar keys={['q: Quit']} />
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Header runId="list" />

			<Box
				borderStyle="round"
				borderColor={colors.border.secondary}
				paddingX={1}
				flexDirection="column"
			>
				{/* Header */}
				<Box justifyContent="space-between" marginBottom={0}>
					<Text bold color={colors.brand.primary}>
						Recent Traces
					</Text>
					<Text dimColor>{traces.length} traces</Text>
				</Box>

				{/* Table header */}
				<Box marginTop={0}>
					<Text dimColor>
						{'  '}
						{'RUN ID'.padEnd(12)}
						{'DATE'.padEnd(14)}
						{'SIZE'.padEnd(10)}
						{'AGE'}
					</Text>
				</Box>

				{/* Separator */}
				<Text dimColor>{'─'.repeat(50)}</Text>

				{/* Trace rows */}
				{traces.map((trace, index) => {
					const isSelected = index === selectedIndex;
					const isBookmarked = bookmarkedIds.has(trace.runId);
					return (
						<Box key={trace.path}>
							<Text
								color={isBookmarked ? 'yellow' : isSelected ? 'cyan' : 'gray'}
							>
								{isBookmarked ? '★ ' : isSelected ? '● ' : '○ '}
							</Text>
							<Text bold={isSelected} color={isSelected ? 'white' : undefined}>
								{trace.runId.padEnd(12)}
							</Text>
							<Text color={isSelected ? 'white' : undefined}>
								{trace.date.padEnd(14)}
							</Text>
							<Text dimColor={!isSelected}>
								{formatFileSize(trace.size).padEnd(10)}
							</Text>
							<Text dimColor={!isSelected}>
								{formatRelativeTime(trace.modifiedAt)}
							</Text>
						</Box>
					);
				})}
			</Box>

			<StatusBar keys={['↑↓: Move', 'Enter: Open', '*: Bookmark', 'q: Quit']} />
		</Box>
	);
}

export default ListCommand;
