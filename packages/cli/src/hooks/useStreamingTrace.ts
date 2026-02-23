/**
 * Hook for using streaming trace parser with pagination
 */

import {useState, useEffect, useCallback} from 'react';
import type {TraceEvent, TraceSummary, PagedEvents} from '../lib/types.js';
import {StreamingTraceParser} from '../lib/streaming-parser.js';
import {resolveTracePath} from '../lib/paths.js';

export interface UseStreamingTraceResult {
	/**
	 * Current page of events
	 */
	events: TraceEvent[];

	/**
	 * Full trace summary
	 */
	summary: TraceSummary;

	/**
	 * Current page number (0-indexed)
	 */
	page: number;

	/**
	 * Total number of pages
	 */
	totalPages: number;

	/**
	 * Total number of events in file
	 */
	totalEvents: number;

	/**
	 * Whether there's a next page
	 */
	hasNext: boolean;

	/**
	 * Whether there's a previous page
	 */
	hasPrevious: boolean;

	/**
	 * Loading state
	 */
	loading: boolean;

	/**
	 * Error message
	 */
	error: string | null;

	/**
	 * Go to next page
	 */
	nextPage: () => void;

	/**
	 * Go to previous page
	 */
	previousPage: () => void;

	/**
	 * Jump to specific page
	 */
	goToPage: (pageNumber: number) => void;

	/**
	 * Cancel loading
	 */
	cancel: () => void;
}

export function useStreamingTrace(
	traceRef: string,
	options?: {
		pageSize?: number;
		onProgress?: (progress: {current: number; total: number}) => void;
	},
): UseStreamingTraceResult {
	const [page, setPage] = useState(0);
	const [pagedEvents, setPagedEvents] = useState<PagedEvents | null>(null);
	const [summary, setSummary] = useState<TraceSummary>({
		runId: '',
		agentName: '',
		startTime: 0,
		endTime: 0,
		duration: 0,
		llmCalls: 0,
		toolCalls: 0,
		totalTokens: 0,
		errors: 0,
		toolsUsed: [],
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [parser, setParser] = useState<StreamingTraceParser | null>(null);

	// Load initial file
	useEffect(() => {
		let cancelled = false;
		let currentParser: StreamingTraceParser | null = null;

		async function loadTrace() {
			try {
				setLoading(true);
				setError(null);

				// Resolve trace reference to file path
				const tracePath = await resolveTracePath(traceRef);

				if (cancelled) return;

				// Create streaming parser
				currentParser = new StreamingTraceParser(tracePath, {
					pageSize: options?.pageSize ?? 100,
					onProgress: options?.onProgress,
				});
				setParser(currentParser);

				const count = await currentParser.countPromise;
				if (cancelled) return;

				if (count === 0) {
					const empty = {
						events: [] as TraceEvent[],
						page: 0,
						totalPages: 0,
						totalEvents: 0,
						hasNext: false,
						hasPrevious: false,
						summary: await currentParser.summaryPromise,
					};
					if (cancelled) return;
					setPagedEvents(empty);
					setSummary(empty.summary);
					setLoading(false);
					return;
				}

				// Load first page
				const firstPage = await currentParser.getPage(0);

				if (cancelled) return;

				setPagedEvents(firstPage);
				setSummary(firstPage.summary);
				setLoading(false);
			} catch (err) {
				if (cancelled) return;

				const message =
					err instanceof Error ? err.message : 'Failed to load trace';
				setError(message);
				setPagedEvents(null);
				setLoading(false);
			}
		}

		void loadTrace();

		return () => {
			cancelled = true;
			if (currentParser) {
				currentParser.cancel();
			}
		};
	}, [traceRef, options?.pageSize, options?.onProgress]);

	// Navigation callbacks
	const nextPage = useCallback(() => {
		if (pagedEvents?.hasNext) {
			setPage(pagedEvents.page + 1);
		}
	}, [pagedEvents]);

	const previousPage = useCallback(() => {
		if (pagedEvents?.hasPrevious) {
			setPage(pagedEvents.page - 1);
		}
	}, [pagedEvents]);

	const goToPage = useCallback(
		async (pageNumber: number) => {
			if (!parser) return;

			try {
				setLoading(true);
				const newPage = await parser.getPage(pageNumber);
				setPagedEvents(newPage);
				setSummary(newPage.summary);
				setLoading(false);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to load page';
				setError(message);
				setLoading(false);
			}
		},
		[parser],
	);

	// Load page when page number changes
	useEffect(() => {
		if (parser && page !== pagedEvents?.page) {
			void goToPage(page);
		}
	}, [page, pagedEvents?.page, parser, goToPage]);

	return {
		events: pagedEvents?.events ?? [],
		summary,
		page: pagedEvents?.page ?? 0,
		totalPages: pagedEvents?.totalPages ?? 0,
		totalEvents: pagedEvents?.totalEvents ?? 0,
		hasNext: pagedEvents?.hasNext ?? false,
		hasPrevious: pagedEvents?.hasPrevious ?? false,
		loading,
		error,
		nextPage,
		previousPage,
		goToPage,
		cancel: () => parser?.cancel(),
	};
}

export default useStreamingTrace;
