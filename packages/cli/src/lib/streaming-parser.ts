/**
 * Streaming parser for large trace files
 *
 * Processes trace files incrementally without loading everything into memory.
 * Supports pagination, backpressure handling, and efficient memory usage.
 */

import * as fs from 'node:fs';
import * as readline from 'node:readline';
import type {TraceEvent, TraceSummary} from './types.js';
import {parseLine, emptySummary} from './parser.js';

export interface StreamingParserOptions {
	/**
	 * Maximum number of events to buffer in memory
	 * @default 100
	 */
	bufferSize?: number;

	/**
	 * Maximum events per page for pagination
	 * @default 100
	 */
	pageSize?: number;

	/**
	 * Callback for progress updates
	 */
	onProgress?: (progress: {current: number; total: number}) => void;

	/**
	 * Enable backpressure handling
	 * @default true
	 */
	backpressureEnabled?: boolean;
}

export interface PagedEvents {
	/**
	 * Events for the current page
	 */
	events: TraceEvent[];

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
	 * Summary of all events (available after full parse)
	 */
	summary: TraceSummary;
}

export interface StreamingParseResult {
	/**
	 * Function to get a specific page of events
	 */
	getPage: (pageNumber: number) => Promise<PagedEvents>;

	/**
	 * Full summary of all events (available after streaming completes)
	 */
	summaryPromise: Promise<TraceSummary>;

	/**
	 * Total number of events (available after counting completes)
	 */
	countPromise: Promise<number>;

	/**
	 * Cancel ongoing parsing
	 */
	cancel: () => void;
}

/**
 * Streaming trace file parser with pagination support.
 *
 * This parser reads trace files line-by-line, counting events and building
 * the summary without keeping all events in memory. Pages are loaded on demand.
 *
 * @example
 * ```ts
 * const parser = new StreamingTraceParser(filePath);
 *
 * // Get first page
 * const page1 = await parser.getPage(0);
 * console.log(`Showing ${page1.events.length} of ${page1.totalEvents} events`);
 *
 * // Navigate to next page
 * if (page1.hasNext) {
 *   const page2 = await parser.getPage(page1.page + 1);
 * }
 * ```
 */
export class StreamingTraceParser {
	private filePath: string;
	private pageSize: number;
	private onProgress?: (progress: {current: number; total: number}) => void;
	private backpressureEnabled: boolean;

	private cancelled = false;
	private eventCount = 0;
	private parseErrors = 0;
	private lineOffsets: number[] = [];
	private summary: TraceSummary = emptySummary();
	private countComplete = false;
	private summaryComplete = false;

	// Caching for frequently accessed pages
	private pageCache = new Map<number, TraceEvent[]>();

	constructor(filePath: string, options: StreamingParserOptions = {}) {
		this.filePath = filePath;
		this.pageSize = options.pageSize ?? 100;
		this.onProgress = options.onProgress;
		this.backpressureEnabled = options.backpressureEnabled ?? true;

		// Start counting events and building summary in background
		void this._analyzeFile();
	}

	/**
	 * Get a specific page of events.
	 *
	 * @param pageNumber - Page number (0-indexed)
	 * @returns Promise resolving to page with events and metadata
	 */
	async getPage(pageNumber: number): Promise<PagedEvents> {
		if (this.cancelled) {
			throw new Error('Parser was cancelled');
		}

		// Wait for count to complete
		await this.countPromise;

		if (pageNumber < 0) {
			throw new Error(`Page number must be >= 0, got ${pageNumber}`);
		}

		const totalPages = Math.ceil(this.eventCount / this.pageSize);

		// Empty file — return empty page 0 rather than throwing
		if (totalPages === 0 && pageNumber === 0) {
			return {
				events: [],
				page: 0,
				totalPages: 0,
				totalEvents: 0,
				hasNext: false,
				hasPrevious: false,
				summary: this.summary,
			};
		}

		if (pageNumber >= totalPages) {
			throw new Error(`Page ${pageNumber} out of range (total: ${totalPages})`);
		}

		// Check cache
		if (this.pageCache.has(pageNumber)) {
			const cachedEvents = this.pageCache.get(pageNumber)!;
			return this._buildPage(cachedEvents, pageNumber);
		}

		// Load page from file
		const events = await this._loadPage(pageNumber);

		// Cache the page (limit cache size)
		if (this.pageCache.size >= 5) {
			// Remove oldest cache entry (first key)
			const firstKey = this.pageCache.keys().next().value;
			if (firstKey !== undefined) {
				this.pageCache.delete(firstKey);
			}
		}
		this.pageCache.set(pageNumber, events);

		return this._buildPage(events, pageNumber);
	}

	/**
	 * Get total event count (waits for analysis to complete).
	 */
	get countPromise(): Promise<number> {
		return new Promise(resolve => {
			const checkCount = () => {
				if (this.countComplete || this.cancelled) {
					resolve(this.eventCount);
				} else {
					// Poll every 10ms
					setTimeout(checkCount, 10);
				}
			};
			checkCount();
		});
	}

	/**
	 * Get full summary (waits for analysis to complete).
	 */
	get summaryPromise(): Promise<TraceSummary> {
		return new Promise(resolve => {
			const checkSummary = () => {
				if (this.summaryComplete || this.cancelled) {
					resolve(this.summary);
				} else {
					setTimeout(checkSummary, 10);
				}
			};
			checkSummary();
		});
	}

	/**
	 * Get parse errors count (available after analysis completes).
	 */
	get errors(): Promise<number> {
		return new Promise(resolve => {
			const checkErrors = () => {
				if (this.countComplete || this.cancelled) {
					resolve(this.parseErrors);
				} else {
					setTimeout(checkErrors, 10);
				}
			};
			checkErrors();
		});
	}

	/**
	 * Cancel ongoing parsing.
	 */
	cancel(): void {
		this.cancelled = true;
	}

	/**
	 * Load a specific page of events from the file.
	 */
	private async _loadPage(pageNumber: number): Promise<TraceEvent[]> {
		const startIndex = pageNumber * this.pageSize;
		const endIndex = Math.min(startIndex + this.pageSize, this.eventCount);

		const events: TraceEvent[] = [];

		// Open file and seek to start of page
		const fileStream = fs.createReadStream(this.filePath, {
			encoding: 'utf-8',
			start: this.lineOffsets[startIndex],
		});

		// Surface stream-level errors (permissions, device failure) to the caller
		const streamError = new Promise<never>((_, reject) => {
			fileStream.once('error', reject);
		});

		const rl = readline.createInterface({
			input: fileStream,
			crlfDelay: Infinity,
		});

		// Wrap the loop in a race so stream errors propagate even during line iteration
		const readLines = async () => {
			let lineIndex = 0;

			for await (const line of rl) {
				if (this.cancelled) {
					rl.close();
					fileStream.destroy();
					throw new Error('Parser was cancelled');
				}

				// Stop at end of page
				if (lineIndex >= endIndex - startIndex) {
					rl.close();
					fileStream.destroy();
					break;
				}

				const event = parseLine(line);
				if (event) {
					events.push(event);
				}

				lineIndex++;

				// Apply backpressure if enabled
				if (this.backpressureEnabled && lineIndex % 50 === 0) {
					await new Promise(resolve => setTimeout(resolve, 0));
				}
			}

			fileStream.destroy();
			return events;
		};

		return Promise.race([readLines(), streamError]);
	}

	/**
	 * Build page object with metadata.
	 */
	private _buildPage(events: TraceEvent[], pageNumber: number): PagedEvents {
		const totalPages = Math.ceil(this.eventCount / this.pageSize);

		return {
			events,
			page: pageNumber,
			totalPages,
			totalEvents: this.eventCount,
			hasNext: pageNumber < totalPages - 1,
			hasPrevious: pageNumber > 0,
			summary: this.summary,
		};
	}

	/**
	 * Analyze file to count events and build summary.
	 * Runs in background without keeping events in memory.
	 */
	private async _analyzeFile(): Promise<void> {
		try {
			const fileStream = fs.createReadStream(this.filePath, {
				encoding: 'utf-8',
			});

			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity,
			});

			// Track line offsets for efficient seeking
			let byteOffset = 0;

			// Accumulate summary data directly
			const summaryData = {
				llmCalls: 0,
				toolCalls: 0,
				totalTokens: 0,
				errors: 0,
				toolsUsed: new Set<string>(),
				startTime: Number.POSITIVE_INFINITY,
				endTime: Number.NEGATIVE_INFINITY,
				runId: '',
				agentName: '',
			};

			for await (const line of rl) {
				if (this.cancelled) {
					fileStream.destroy();
					return;
				}

				// Store line offset for seeking
				this.lineOffsets.push(byteOffset);

				const event = parseLine(line);

				// Count parse errors (null means invalid JSON or parsing failed)
				if (!event && line.trim() !== '' && !line.trim().startsWith('#')) {
					this.parseErrors++;
				}

				if (event) {
					this.eventCount++;

					// Build summary directly
					summaryData.runId = event.run_id || summaryData.runId;
					summaryData.startTime = Math.min(
						summaryData.startTime,
						event.timestamp,
					);
					summaryData.endTime = Math.max(summaryData.endTime, event.timestamp);

					switch (event.type) {
						case 'llm.response': {
							summaryData.llmCalls++;
							const ev = event as {
								total_tokens?: number;
								input_tokens?: number;
								output_tokens?: number;
							};
							if (ev.total_tokens) {
								summaryData.totalTokens += ev.total_tokens;
							} else if (ev.input_tokens && ev.output_tokens) {
								summaryData.totalTokens += ev.input_tokens + ev.output_tokens;
							}
							break;
						}

						case 'tool.start': {
							summaryData.toolCalls++;
							const ev = event as {
								tool_name?: string;
							};
							if (ev.tool_name) {
								summaryData.toolsUsed.add(ev.tool_name);
							}
							break;
						}

						case 'tool.error': {
							summaryData.errors++;
							break;
						}

						case 'run.start': {
							const ev = event as {agent_name?: string};
							if (ev.agent_name) {
								summaryData.agentName = ev.agent_name;
							}
							break;
						}
					}

					// Report progress
					this.onProgress?.({
						current: this.eventCount,
						total: this.eventCount, // Unknown until complete
					});
				}

				// Update byte offset (line + newline)
				byteOffset += Buffer.byteLength(line, 'utf-8') + 1;
			}

			// Build final summary
			this.summary = {
				runId: summaryData.runId,
				agentName: summaryData.agentName,
				startTime:
					summaryData.startTime === Number.POSITIVE_INFINITY
						? 0
						: summaryData.startTime,
				endTime:
					summaryData.endTime === Number.NEGATIVE_INFINITY
						? 0
						: summaryData.endTime,
				duration:
					summaryData.endTime === Number.NEGATIVE_INFINITY ||
					summaryData.startTime === Number.POSITIVE_INFINITY
						? 0
						: (summaryData.endTime - summaryData.startTime) * 1000,
				llmCalls: summaryData.llmCalls,
				toolCalls: summaryData.toolCalls,
				totalTokens: summaryData.totalTokens,
				errors: summaryData.errors,
				toolsUsed: [...summaryData.toolsUsed],
			};

			this.countComplete = true;
			this.summaryComplete = true;

			fileStream.destroy();
		} catch (error) {
			if (!this.cancelled) {
				console.error('Error analyzing trace file:', error);
				this.countComplete = true;
				this.summaryComplete = true;
			}
		}
	}
}

/**
 * Create a streaming parser for a trace file.
 *
 * @param filePath - Path to trace file
 * @param options - Parser options
 * @returns Streaming parser instance
 */
export function createStreamingParser(
	filePath: string,
	options?: StreamingParserOptions,
): StreamingTraceParser {
	return new StreamingTraceParser(filePath, options);
}

/**
 * Parse a trace file using streaming mode (for backward compatibility).
 *
 * @param filePath - Path to trace file
 * @param options - Parser options
 * @returns Promise with events, summary, and errors
 */
export async function parseTraceFileStreaming(
	filePath: string,
	options?: StreamingParserOptions,
): Promise<{
	events: TraceEvent[];
	summary: TraceSummary;
	errors: number;
}> {
	const parser = new StreamingTraceParser(filePath, options);

	// Load all pages to get full event list
	const allEvents: TraceEvent[] = [];
	let currentPage = 0;

	try {
		while (true) {
			const page = await parser.getPage(currentPage);
			allEvents.push(...page.events);

			if (!page.hasNext) {
				break;
			}

			currentPage++;
		}
	} catch (error) {
		// Page loading errors are rare but possible
		if ((error as Error).message !== 'Parser was cancelled') {
			console.error('Error loading page:', error);
		}
	}

	const summary = await parser.summaryPromise;
	const errors = await parser.errors;

	return {
		events: allEvents,
		summary,
		errors,
	};
}

export default StreamingTraceParser;
