/**
 * Hook for spawning Python processes and streaming events
 */

import {useState, useEffect, useRef, useCallback, useLayoutEffect} from 'react';
import {spawn, type ChildProcess} from 'node:child_process';
import * as readline from 'node:readline';
import * as os from 'node:os';
import {v4 as uuidv4} from 'uuid';
import type {TraceEvent, ProcessStatus, LiveStats} from '../lib/types.js';
import {parseJsonRpc, parseLine} from '../lib/parser.js';

/**
 * Platform-aware process termination helper.
 *
 * Windows Signal Behavior:
 * - Windows does not fully support POSIX signals (SIGTERM, SIGINT, etc.)
 * - Node.js emulates some signals on Windows, but behavior differs:
 *   - SIGTERM: May not be delivered reliably; Node uses TerminateProcess()
 *   - SIGKILL: Unconditionally terminates (cannot be trapped)
 *   - SIGBREAK: Can be sent to console processes (more reliable than SIGTERM)
 * - The default proc.kill() on Windows effectively terminates the process
 *
 * Limitations:
 * - This helper terminates only the direct child process
 * - Child process trees (subprocesses spawned by the child) may be orphaned
 * - For production use with complex process trees, consider using tree-kill
 *   or similar libraries that use `taskkill /T` on Windows
 *
 * Current approach is sufficient for typical CLI usage where the spawned
 * Python process doesn't spawn additional long-running children.
 */
const isWindows = os.platform() === 'win32';

function killProcess(proc: ChildProcess): void {
	// Prevent double-termination errors
	if (proc.killed) return;

	if (isWindows) {
		// Windows: Use default kill which terminates via TerminateProcess()
		// SIGTERM is unreliable on Windows; default kill is more effective
		proc.kill();
	} else {
		// Unix-like systems: Use graceful SIGTERM to allow cleanup
		proc.kill('SIGTERM');
	}
}

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

	// Use ref for event callback to avoid stale closures and effect re-runs
	const onEventRef = useRef(onEvent);
	useLayoutEffect(() => {
		onEventRef.current = onEvent;
	});

	// Stop function
	const stop = useCallback(() => {
		if (processRef.current) {
			killProcess(processRef.current);
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
		proc.on('error', err => {
			setError(err.message);
			setStatus('error');
		});

		// Parse stdout as NDJSON
		if (proc.stdout) {
			const rl = readline.createInterface({
				input: proc.stdout,
				crlfDelay: Infinity,
			});

			rl.on('line', line => {
				// Try JSON-RPC format first (SDK live output)
				let event = parseJsonRpc(line);

				// Fall back to raw JSONL format
				if (!event) {
					event = parseLine(line);
				}

				if (event) {
					// Update stats based on event type
					setStats(prev => {
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

					// Emit event to caller (use ref to avoid stale closure)
					onEventRef.current(event);
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
			if (processRef.current) {
				killProcess(processRef.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- onEventRef is stable
	}, [script]);

	return {
		status,
		runId: runId.current,
		error,
		stats,
		stop,
	};
}

export default useProcessStream;
