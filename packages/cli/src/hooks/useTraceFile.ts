/**
 * Hook for loading and parsing trace files
 */

import {useState, useEffect} from 'react';
import type {TraceEvent, TraceSummary} from '../lib/types.js';
import {resolveTracePath} from '../lib/paths.js';
import {parseTraceFile, emptySummary} from '../lib/parser.js';

export interface UseTraceFileResult {
	events: TraceEvent[];
	summary: TraceSummary;
	loading: boolean;
	error: string | null;
}

export function useTraceFile(traceRef: string): UseTraceFileResult {
	const [events, setEvents] = useState<TraceEvent[]>([]);
	const [summary, setSummary] = useState<TraceSummary>(emptySummary());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadTrace() {
			try {
				setLoading(true);
				setError(null);

				// Resolve trace reference to file path
				const tracePath = await resolveTracePath(traceRef);

				if (cancelled) return;

				// Parse the trace file
				const result = await parseTraceFile(tracePath);

				if (cancelled) return;

				setEvents(result.events);
				setSummary(result.summary);

				if (result.errors > 0) {
					// Non-fatal: some lines couldn't be parsed
					console.error(`Warning: ${result.errors} lines could not be parsed`);
				}
			} catch (err) {
				if (cancelled) return;

				const message =
					err instanceof Error ? err.message : 'Failed to load trace';
				setError(message);
				setEvents([]);
				setSummary(emptySummary());
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		void loadTrace();

		return () => {
			cancelled = true;
		};
	}, [traceRef]);

	return {events, summary, loading, error};
}

export default useTraceFile;
