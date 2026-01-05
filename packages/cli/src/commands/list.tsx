/**
 * List command - Browse recent trace files
 */

import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {Header} from '../components/Header.js';
import {StatusBar} from '../components/StatusBar.js';
import {useKeyboard} from '../hooks/useKeyboard.js';
import {listTraceFiles, type ListTracesOptions} from '../lib/paths.js';
import type {TraceFileInfo} from '../lib/types.js';
import {formatFileSize, formatRelativeTime} from '../lib/theme.js';

export interface ListCommandProps {
	limit?: number;
	since?: string;
}

export function ListCommand({
	limit = 10,
	since,
}: ListCommandProps): React.ReactElement {
	const [traces, setTraces] = useState<TraceFileInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Load trace files
	useEffect(() => {
		async function load() {
			try {
				const options: ListTracesOptions = {limit, since};
				const files = await listTraceFiles(options);
				setTraces(files);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to list traces');
			} finally {
				setLoading(false);
			}
		}

		void load();
	}, [limit, since]);

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
				// In full implementation, this would open the trace
				// For now, just show the run ID
				console.log(`Selected: ${selected.runId}`);
			}
		},
	});

	// Loading state
	if (loading) {
		return (
			<Box flexDirection="column">
				<Header runId="list" />
				<Box paddingX={1} paddingY={1}>
					<Text color="yellow">Loading traces...</Text>
				</Box>
			</Box>
		);
	}

	// Error state
	if (error) {
		return (
			<Box flexDirection="column">
				<Header runId="list" />
				<Box
					borderStyle="single"
					borderColor="red"
					paddingX={1}
					flexDirection="column"
				>
					<Text color="red" bold>
						Error
					</Text>
					<Text>{error}</Text>
				</Box>
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
					borderStyle="single"
					borderColor="gray"
					paddingX={1}
					flexDirection="column"
				>
					<Text bold>Recent Traces</Text>
					<Text dimColor>No traces found</Text>
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
				borderStyle="single"
				borderColor="gray"
				paddingX={1}
				flexDirection="column"
			>
				{/* Table header */}
				<Box>
					<Text bold>{'  '}</Text>
					<Text bold color="gray">
						{'RUN ID'.padEnd(12)}
					</Text>
					<Text bold color="gray">
						{'DATE'.padEnd(14)}
					</Text>
					<Text bold color="gray">
						{'SIZE'.padEnd(10)}
					</Text>
					<Text bold color="gray">
						AGE
					</Text>
				</Box>

				{/* Trace rows */}
				{traces.map((trace, index) => {
					const isSelected = index === selectedIndex;
					return (
						<Box key={trace.path}>
							<Text color={isSelected ? 'cyan' : undefined}>
								{isSelected ? '\u25B6 ' : '  '}
							</Text>
							<Text bold={isSelected}>{trace.runId.padEnd(12)}</Text>
							<Text>{trace.date.padEnd(14)}</Text>
							<Text dimColor>{formatFileSize(trace.size).padEnd(10)}</Text>
							<Text dimColor>{formatRelativeTime(trace.modifiedAt)}</Text>
						</Box>
					);
				})}
			</Box>

			<StatusBar keys={['\u2191\u2193: Navigate', 'Enter: View', 'q: Quit']} />
		</Box>
	);
}

export default ListCommand;
