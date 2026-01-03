/**
 * Hook for spawning Python processes and streaming events
 */

import {useState, useEffect, useRef, useCallback} from 'react';
import {spawn, type ChildProcess} from 'node:child_process';
import * as readline from 'node:readline';
import {v4 as uuidv4} from 'uuid';
import type {TraceEvent, ProcessStatus, LiveStats} from '../lib/types.js';
import {parseJsonRpc, parseLine} from '../lib/parser.js';

export interface UseProcessStreamResult {
	status: ProcessStatus;
	runId: string;
	error: string | null;
	stats: LiveStats;
	stop: () => void;
}

export function useProcessStream(
	script: string[],
	onEvent: (event: TraceEvent) => void,
): UseProcessStreamResult {
	const [status, setStatus] = useState<ProcessStatus>('starting');
	const [error, setError] = useState<string | null>(null);
	const [stats, setStats] = useState<LiveStats>({
		startTime: Date.now(),
		duration: 0,
		llmCalls: 0,
		toolCalls: 0,
		tokens: 0,
		errors: 0,
	});

	const runId = useRef(uuidv4().slice(0, 8));
	const processRef = useRef<ChildProcess | null>(null);
	const startTimeRef = useRef<number>(Date.now());

	// Stable event handler
	const stableOnEvent = useCallback(onEvent, [onEvent]);

	// Stop function
	const stop = useCallback(() => {
		if (processRef.current && !processRef.current.killed) {
			processRef.current.kill('SIGTERM');
		}
	}, []);

	useEffect(() => {
		if (script.length === 0) {
			setError('No script specified');
			setStatus('error');
			return;
		}

		const [command, ...args] = script;

		if (!command) {
			setError('No command specified');
			setStatus('error');
			return;
		}

		startTimeRef.current = Date.now();

		// Spawn Python process with environment variables for live mode
		const proc = spawn(command, args, {
			stdio: ['inherit', 'pipe', 'inherit'],
			env: {
				...process.env,
				PYTHONUNBUFFERED: '1',
				WATCHTOWER_LIVE: '1',
				WATCHTOWER_RUN_ID: runId.current,
			},
		});

		processRef.current = proc;

		// Handle spawn success
		proc.on('spawn', () => {
			setStatus('running');
		});

		// Handle spawn error
		proc.on('error', (err) => {
			setError(err.message);
			setStatus('error');
		});

		// Parse stdout as NDJSON
		if (proc.stdout) {
			const rl = readline.createInterface({
				input: proc.stdout,
				crlfDelay: Infinity,
			});

			rl.on('line', (line) => {
				// Try JSON-RPC format first (SDK live output)
				let event = parseJsonRpc(line);

				// Fall back to raw JSONL format
				if (!event) {
					event = parseLine(line);
				}

				if (event) {
					// Update stats based on event type
					setStats((prev) => {
						const newStats = {...prev};
						newStats.duration = Date.now() - startTimeRef.current;

						switch (event.type) {
							case 'llm.response': {
								newStats.llmCalls++;
								const tokens = (event as {total_tokens?: number}).total_tokens;
								if (tokens) {
									newStats.tokens += tokens;
								}

								break;
							}

							case 'tool.start': {
								newStats.toolCalls++;
								break;
							}

							case 'tool.error': {
								newStats.errors++;
								break;
							}
						}

						return newStats;
					});

					// Emit event to caller
					stableOnEvent(event);
				}
			});
		}

		// Handle process exit
		proc.on('exit', (code, signal) => {
			if (signal === 'SIGTERM') {
				setStatus('stopped');
			} else if (code === 0) {
				setStatus('stopped');
			} else {
				setError(`Process exited with code ${code ?? 'unknown'}`);
				setStatus('error');
			}
		});

		// Cleanup on unmount
		return () => {
			if (processRef.current && !processRef.current.killed) {
				processRef.current.kill('SIGTERM');
			}
		};
	}, [script, stableOnEvent]);

	return {
		status,
		runId: runId.current,
		error,
		stats,
		stop,
	};
}

export default useProcessStream;
