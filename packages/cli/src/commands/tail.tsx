/**
 * Tail command - Run a script and stream events live
 */

import React, {useState, useCallback, useRef} from 'react';
import {Box, Text, Static} from 'ink';
import {Header} from '../components/Header.js';
import {Summary} from '../components/Summary.js';
import {EventLine} from '../components/EventLine.js';
import {StatusBar} from '../components/StatusBar.js';
import {useProcessStream} from '../hooks/useProcessStream.js';
import {useKeyboard} from '../hooks/useKeyboard.js';
import type {TraceEvent} from '../lib/types.js';

export interface TailCommandProps {
	script: string[];
}

export function TailCommand({script}: TailCommandProps): React.ReactElement {
	const [paused, setPaused] = useState(false);
	const [completedEvents, setCompletedEvents] = useState<TraceEvent[]>([]);
	const [currentEvent, setCurrentEvent] = useState<TraceEvent | null>(null);
	const [baseTimestamp, setBaseTimestamp] = useState<number>(0);
	const baseTimestampRef = useRef<number>(0);

	// Handle incoming events
	const handleEvent = useCallback(
		(event: TraceEvent) => {
			if (paused) return;

			// Set base timestamp from first event using ref to avoid stale closure
			if (baseTimestampRef.current === 0) {
				baseTimestampRef.current = event.timestamp;
				setBaseTimestamp(event.timestamp);
			}

			// Move current event to completed using functional updater
			setCurrentEvent(prev => {
				if (prev) {
					setCompletedEvents(events => [...events, prev]);
				}
				return event;
			});
		},
		[paused],
	);

	const {status, runId, error, stats, stop} = useProcessStream(
		script,
		handleEvent,
	);

	// Keyboard handlers
	useKeyboard({
		onPause: () => {
			setPaused(p => !p);
		},
		onQuit: () => {
			stop();
		},
	});

	// Error state
	if (error && status === 'error') {
		return (
			<Box flexDirection="column">
				<Header runId={runId} live status="error" />
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

	return (
		<Box flexDirection="column">
			<Header runId={runId} live status={status} paused={paused} />
			<Summary liveStats={stats} />

			{/* Completed events - rendered once via Static */}
			<Box
				borderStyle="single"
				borderColor="gray"
				paddingX={1}
				flexDirection="column"
			>
				<Box justifyContent="space-between">
					<Text bold>Events</Text>
					<Text dimColor>
						{completedEvents.length + (currentEvent ? 1 : 0)} events
					</Text>
				</Box>

				<Static items={completedEvents}>
					{(event, index) => (
						<EventLine
							key={`${event.timestamp}-${index}`}
							event={event}
							baseTimestamp={baseTimestamp}
						/>
					)}
				</Static>

				{/* Current event - dynamically updated */}
				{currentEvent && (
					<EventLine
						event={currentEvent}
						current
						baseTimestamp={baseTimestamp}
					/>
				)}

				{/* Running indicator */}
				{status === 'running' && !currentEvent && (
					<Text dimColor>Waiting for events...</Text>
				)}

				{status === 'stopped' && <Text dimColor>Process finished</Text>}
			</Box>

			<StatusBar
				keys={['Ctrl+C: Stop', `p: ${paused ? 'Resume' : 'Pause'}`, 'q: Quit']}
			/>
		</Box>
	);
}

export default TailCommand;
