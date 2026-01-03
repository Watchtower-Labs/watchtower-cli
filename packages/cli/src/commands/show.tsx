/**
 * Show command - View a saved trace file
 */

import React, {useState} from 'react';
import {Box, Text} from 'ink';
import {Header} from '../components/Header.js';
import {Summary} from '../components/Summary.js';
import {EventList} from '../components/EventList.js';
import {EventDetail} from '../components/EventDetail.js';
import {StatusBar} from '../components/StatusBar.js';
import {useTraceFile} from '../hooks/useTraceFile.js';
import {useKeyboard} from '../hooks/useKeyboard.js';
import type {TraceEvent} from '../lib/types.js';

export interface ShowCommandProps {
	trace: string;
}

export function ShowCommand({trace}: ShowCommandProps): React.ReactElement {
	const {events, summary, loading, error} = useTraceFile(trace);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [expandedEvent, setExpandedEvent] = useState<TraceEvent | null>(null);

	// Keyboard navigation
	useKeyboard({
		onUp: () => {
			if (!expandedEvent) {
				setSelectedIndex((i) => Math.max(0, i - 1));
			}
		},
		onDown: () => {
			if (!expandedEvent) {
				setSelectedIndex((i) => Math.min(events.length - 1, i + 1));
			}
		},
		onPageUp: () => {
			if (!expandedEvent) {
				setSelectedIndex((i) => Math.max(0, i - 10));
			}
		},
		onPageDown: () => {
			if (!expandedEvent) {
				setSelectedIndex((i) => Math.min(events.length - 1, i + 10));
			}
		},
		onHome: () => {
			if (!expandedEvent) {
				setSelectedIndex(0);
			}
		},
		onEnd: () => {
			if (!expandedEvent) {
				setSelectedIndex(events.length - 1);
			}
		},
		onEnter: () => {
			if (!expandedEvent && events[selectedIndex]) {
				setExpandedEvent(events[selectedIndex]!);
			}
		},
		onBack: () => {
			if (expandedEvent) {
				setExpandedEvent(null);
			}
		},
		onEscape: () => {
			if (expandedEvent) {
				setExpandedEvent(null);
			}
		},
	});

	// Loading state
	if (loading) {
		return (
			<Box flexDirection="column">
				<Header runId="..." />
				<Box paddingX={1} paddingY={1}>
					<Text color="yellow">Loading trace...</Text>
				</Box>
			</Box>
		);
	}

	// Error state
	if (error) {
		return (
			<Box flexDirection="column">
				<Header runId="error" />
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

	// Empty trace
	if (events.length === 0) {
		return (
			<Box flexDirection="column">
				<Header runId={summary.runId || 'unknown'} />
				<Box
					borderStyle="single"
					borderColor="gray"
					paddingX={1}
				>
					<Text dimColor>No events found in trace</Text>
				</Box>
				<StatusBar keys={['q: Quit']} />
			</Box>
		);
	}

	// Expanded event detail view
	if (expandedEvent) {
		return (
			<Box flexDirection="column">
				<Header
					runId={summary.runId}
					agentName={summary.agentName}
					timestamp={summary.startTime}
				/>
				<EventDetail event={expandedEvent} />
				<StatusBar keys={['b/Esc: Back', 'q: Quit']} />
			</Box>
		);
	}

	// Main timeline view
	return (
		<Box flexDirection="column">
			<Header
				runId={summary.runId}
				agentName={summary.agentName}
				timestamp={summary.startTime}
			/>
			<Summary summary={summary} />
			<EventList events={events} selectedIndex={selectedIndex} />
			<StatusBar
				keys={[
					'\u2191\u2193/jk: Navigate',
					'Enter: Expand',
					'u/d: Page',
					'g/G: Home/End',
					'q: Quit',
				]}
			/>
		</Box>
	);
}

export default ShowCommand;
