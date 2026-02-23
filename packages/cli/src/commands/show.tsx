/**
 * Show command - View a saved trace file
 *
 * Design: Streaming-first timeline with on-demand full trace loading
 */

import React, {useState, useMemo, useEffect} from 'react';
import {Box, Text} from 'ink';
import {Header} from '../components/Header.js';
import {Summary} from '../components/Summary.js';
import {EventListGrouped} from '../components/EventListGrouped.js';
import {EventListPaginated} from '../components/EventListPaginated.js';
import {EventDetail} from '../components/EventDetail.js';
import {StatusBar} from '../components/StatusBar.js';
import {Spinner} from '../components/Spinner.js';
import {AgentPanel} from '../components/AgentPanel.js';
import {InfoPanel, ToolSummary, ModelSummary} from '../components/InfoPanel.js';
import {HelpOverlay} from '../components/HelpOverlay.js';
import {SearchBar} from '../components/SearchBar.js';
import {ExportMenu, handleExportKey} from '../components/ExportMenu.js';
import {ErrorDisplay} from '../components/ErrorDisplay.js';
import {useTraceFile} from '../hooks/useTraceFile.js';
import {useStreamingTrace} from '../hooks/useStreamingTrace.js';
import {useKeyboard} from '../hooks/useKeyboard.js';
import {useTerminalSize} from '../hooks/useTerminalSize.js';
import {analyzeTrace} from '../lib/parser.js';
import {filterEvents} from '../lib/filter.js';
import {exportTrace, type ExportFormat} from '../lib/export.js';
import {getConfig} from '../lib/config.js';
import type {TraceEvent} from '../lib/types.js';
import {colors} from '../lib/theme.js';

export interface ShowCommandProps {
	trace: string;
}

type ViewMode = 'timeline' | 'agents' | 'tools' | 'models' | 'detail';

export function ShowCommand({trace}: ShowCommandProps): React.ReactElement {
	const config = getConfig();
	const terminalSize = useTerminalSize();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [expandedEvent, setExpandedEvent] = useState<TraceEvent | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('timeline');
	const [showHelp, setShowHelp] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [showExport, setShowExport] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [forceFullFallback, setForceFullFallback] = useState(false);
	const [exportResult, setExportResult] = useState<
		{success: boolean; path?: string; error?: string} | undefined
	>();

	const shouldLoadFullTrace =
		forceFullFallback ||
		searchQuery.length > 0 ||
		isSearching ||
		viewMode !== 'timeline' ||
		showExport;

	// Streaming parser is always the default path for timeline rendering.
	const {
		events: streamedEvents,
		summary: streamedSummary,
		loading: streamingLoading,
		error: streamingError,
		page,
		totalPages,
		totalEvents,
		hasNext,
		hasPrevious,
		nextPage,
		previousPage,
		goToPage,
	} = useStreamingTrace(trace, {
		pageSize: config.showPageSize,
	});

	// Full trace is loaded on demand for search/analysis/export.
	const {
		events: fullEvents,
		summary: fullSummary,
		loading: fullLoading,
		error: fullError,
	} = useTraceFile(shouldLoadFullTrace ? trace : '');

	const activeSummary = fullEvents.length > 0 ? fullSummary : streamedSummary;
	const useFullTimelineFallback = forceFullFallback && fullEvents.length > 0;

	const filteredResult = useMemo(() => {
		if (!searchQuery || fullEvents.length === 0) {
			return {
				events: [],
				totalMatched: 0,
				query: searchQuery,
			};
		}

		return filterEvents(fullEvents, searchQuery);
	}, [fullEvents, searchQuery]);

	const analysis = useMemo(() => {
		if (fullEvents.length === 0) return null;
		return analyzeTrace(fullEvents);
	}, [fullEvents]);

	const timelineEvents = searchQuery
		? filteredResult.events
		: useFullTimelineFallback
		? fullEvents
		: streamedEvents;

	const handleExport = async (format: ExportFormat) => {
		if (fullLoading || fullEvents.length === 0) {
			setExportResult({
				success: false,
				error: 'Preparing full trace data for export. Please try again.',
			});
			return;
		}

		setExporting(true);
		const result = await exportTrace(fullEvents, fullSummary, analysis, {
			format,
		});
		setExporting(false);
		setExportResult({
			success: result.success,
			path: result.path,
			error: result.error,
		});
	};

	useEffect(() => {
		setSelectedIndex(i => {
			const max = Math.max(0, timelineEvents.length - 1);
			return Math.min(i, max);
		});
	}, [timelineEvents.length, page]);

	useEffect(() => {
		if (streamingError) {
			setForceFullFallback(true);
		}
	}, [streamingError]);

	useKeyboard({
		onUp: () => {
			if (!expandedEvent && !isSearching) {
				setSelectedIndex(i => Math.max(0, i - 1));
			}
		},
		onDown: () => {
			if (!expandedEvent && !isSearching) {
				setSelectedIndex(i =>
					Math.max(0, Math.min(timelineEvents.length - 1, i + 1)),
				);
			}
		},
		onPageUp: () => {
			if (expandedEvent || isSearching) return;
			if (searchQuery) {
				setSelectedIndex(i => Math.max(0, i - 10));
				return;
			}

			if (hasPrevious) {
				previousPage();
				setSelectedIndex(0);
			}
		},
		onPageDown: () => {
			if (expandedEvent || isSearching) return;
			if (searchQuery) {
				setSelectedIndex(i =>
					Math.max(0, Math.min(timelineEvents.length - 1, i + 10)),
				);
				return;
			}

			if (hasNext) {
				nextPage();
				setSelectedIndex(0);
			}
		},
		onHome: () => {
			if (expandedEvent || isSearching) return;
			if (searchQuery) {
				setSelectedIndex(0);
				return;
			}

			goToPage(0);
			setSelectedIndex(0);
		},
		onEnd: () => {
			if (expandedEvent || isSearching) return;
			if (searchQuery) {
				setSelectedIndex(Math.max(0, timelineEvents.length - 1));
				return;
			}

			if (totalPages > 0) {
				goToPage(totalPages - 1);
				setSelectedIndex(0);
			}
		},
		onEnter: () => {
			if (!expandedEvent && !isSearching && timelineEvents[selectedIndex]) {
				setExpandedEvent(timelineEvents[selectedIndex]!);
			}
		},
		onBack: () => {
			if (isSearching) return;
			if (expandedEvent) {
				setExpandedEvent(null);
			} else if (searchQuery) {
				setSearchQuery('');
				setSelectedIndex(0);
			} else if (viewMode !== 'timeline') {
				setViewMode('timeline');
			}
		},
		onEscape: () => {
			if (isSearching) {
				setIsSearching(false);
				return;
			}
			if (showExport) {
				setShowExport(false);
				setExportResult(undefined);
				return;
			}
			if (showHelp) {
				setShowHelp(false);
			} else if (expandedEvent) {
				setExpandedEvent(null);
			} else if (searchQuery) {
				setSearchQuery('');
				setSelectedIndex(0);
			} else if (viewMode !== 'timeline') {
				setViewMode('timeline');
			}
		},
		onCustom: key => {
			if (isSearching) return;

			if (showExport) {
				if (exportResult) {
					setShowExport(false);
					setExportResult(undefined);
					return;
				}
				if (handleExportKey(key, handleExport)) {
					return;
				}
				return;
			}

			if (key === '?') {
				setShowHelp(h => !h);
				return;
			}

			if (showHelp) {
				setShowHelp(false);
				return;
			}

			if (key === 'e' && !expandedEvent) {
				setShowExport(true);
				setExportResult(undefined);
				return;
			}

			if (key === '/') {
				setIsSearching(true);
				return;
			}

			if (key === 'c' && searchQuery && !expandedEvent) {
				setSearchQuery('');
				setSelectedIndex(0);
				return;
			}

			if (key === 'a' && !expandedEvent) {
				setViewMode(viewMode === 'agents' ? 'timeline' : 'agents');
			} else if (key === 't' && !expandedEvent) {
				setViewMode(viewMode === 'tools' ? 'timeline' : 'tools');
			} else if (key === 'm' && !expandedEvent) {
				setViewMode(viewMode === 'models' ? 'timeline' : 'models');
			}
		},
	});

	if (streamingLoading) {
		return (
			<Box flexDirection="column">
				<Header runId="..." />
				<Box
					borderStyle="round"
					borderColor={colors.border.secondary}
					paddingX={1}
					paddingY={1}
				>
					<Spinner type="dots" color="cyan" label="Loading trace..." />
				</Box>
			</Box>
		);
	}

	if (streamingError && !forceFullFallback) {
		return (
			<Box flexDirection="column">
				<Header runId={trace} />
				<Box
					borderStyle="round"
					borderColor={colors.border.secondary}
					paddingX={1}
					paddingY={1}
				>
					<Spinner
						type="dots"
						color="yellow"
						label="Streaming parser failed, falling back to full trace parser..."
					/>
				</Box>
			</Box>
		);
	}

	if (streamingError && fullError) {
		return (
			<Box flexDirection="column">
				<Header runId={trace} status="error" />
				<ErrorDisplay
					error={`Streaming parser error: ${streamingError}\nFallback parser error: ${fullError}`}
				/>
				<StatusBar keys={['q: Quit']} />
			</Box>
		);
	}

	if (fullError && shouldLoadFullTrace && !streamingError) {
		return (
			<Box flexDirection="column">
				<Header runId={trace} status="error" />
				<ErrorDisplay error={fullError} />
				<StatusBar keys={['q: Quit']} />
			</Box>
		);
	}

	if (totalEvents === 0) {
		return (
			<Box flexDirection="column">
				<Header runId={activeSummary.runId || 'unknown'} />
				<Box
					borderStyle="round"
					borderColor={colors.border.secondary}
					paddingX={1}
				>
					<Text dimColor>No events found in trace</Text>
				</Box>
				<StatusBar keys={['q: Quit']} />
			</Box>
		);
	}

	if (expandedEvent) {
		return (
			<Box flexDirection="column">
				<Header
					runId={activeSummary.runId}
					agentName={activeSummary.agentName}
					timestamp={activeSummary.startTime}
				/>
				<EventDetail event={expandedEvent} />
				<StatusBar keys={['b/Esc: Back', 'q: Quit']} />
			</Box>
		);
	}

	if (showHelp) {
		return (
			<Box flexDirection="column">
				<Header
					runId={activeSummary.runId}
					agentName={
						analysis?.hasMultipleAgents ? undefined : activeSummary.agentName
					}
					timestamp={activeSummary.startTime}
				/>
				<HelpOverlay context="show" />
			</Box>
		);
	}

	if (showExport) {
		return (
			<Box flexDirection="column">
				<Header
					runId={activeSummary.runId}
					agentName={
						analysis?.hasMultipleAgents ? undefined : activeSummary.agentName
					}
					timestamp={activeSummary.startTime}
				/>
				{fullLoading ? (
					<Box
						borderStyle="round"
						borderColor={colors.border.secondary}
						paddingX={1}
						paddingY={1}
					>
						<Spinner
							type="dots"
							color="cyan"
							label="Preparing full trace for export..."
						/>
					</Box>
				) : (
					<ExportMenu
						onSelect={handleExport}
						onClose={() => {
							setShowExport(false);
							setExportResult(undefined);
						}}
						exporting={exporting}
						result={exportResult}
					/>
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Header
				runId={activeSummary.runId}
				agentName={
					analysis?.hasMultipleAgents ? undefined : activeSummary.agentName
				}
				timestamp={activeSummary.startTime}
			/>

			<Summary summary={activeSummary} />

			{analysis && (
				<InfoPanel models={analysis.models} tools={analysis.tools} />
			)}

			{(isSearching || searchQuery) && (
				<SearchBar
					query={searchQuery}
					onChange={setSearchQuery}
					resultCount={searchQuery ? filteredResult.events.length : totalEvents}
					totalCount={searchQuery ? fullEvents.length : totalEvents}
					onClose={() => setIsSearching(false)}
					isActive={isSearching}
				/>
			)}

			{viewMode === 'timeline' && (
				<Box>
					<Box flexGrow={1}>
						{searchQuery ? (
							fullLoading ? (
								<Box
									borderStyle="round"
									borderColor={colors.border.secondary}
									paddingX={1}
									paddingY={1}
								>
									<Spinner
										type="dots"
										color="cyan"
										label="Loading full trace for search..."
									/>
								</Box>
							) : (
								<EventListGrouped
									events={timelineEvents}
									eventGroups={analysis?.eventGroups ?? []}
									selectedIndex={selectedIndex}
									hasMultipleAgents={analysis?.hasMultipleAgents ?? false}
									maxVisible={
										terminalSize.isNarrow ? 10 : terminalSize.isMedium ? 15 : 20
									}
								/>
							)
						) : useFullTimelineFallback ? (
							<EventListGrouped
								events={timelineEvents}
								eventGroups={analysis?.eventGroups ?? []}
								selectedIndex={selectedIndex}
								hasMultipleAgents={analysis?.hasMultipleAgents ?? false}
								maxVisible={
									terminalSize.isNarrow ? 10 : terminalSize.isMedium ? 15 : 20
								}
							/>
						) : (
							<EventListPaginated
								events={streamedEvents}
								selectedIndex={selectedIndex}
								page={page}
								totalPages={totalPages}
								totalEvents={totalEvents}
								hasNext={hasNext}
								hasPrevious={hasPrevious}
								onNext={nextPage}
								onPrevious={previousPage}
							/>
						)}
					</Box>
				</Box>
			)}

			{viewMode === 'agents' && (
				<>
					{fullLoading ? (
						<Box
							borderStyle="round"
							borderColor={colors.border.secondary}
							paddingX={1}
							paddingY={1}
						>
							<Spinner
								type="dots"
								color="cyan"
								label="Loading agent analysis..."
							/>
						</Box>
					) : analysis ? (
						<AgentPanel agents={analysis.agents} />
					) : (
						<Text dimColor>No agent analysis available.</Text>
					)}
				</>
			)}

			{viewMode === 'tools' && (
				<>
					{fullLoading ? (
						<Box
							borderStyle="round"
							borderColor={colors.border.secondary}
							paddingX={1}
							paddingY={1}
						>
							<Spinner
								type="dots"
								color="cyan"
								label="Loading tool analysis..."
							/>
						</Box>
					) : analysis ? (
						<ToolSummary tools={analysis.tools} />
					) : (
						<Text dimColor>No tool analysis available.</Text>
					)}
				</>
			)}

			{viewMode === 'models' && (
				<>
					{fullLoading ? (
						<Box
							borderStyle="round"
							borderColor={colors.border.secondary}
							paddingX={1}
							paddingY={1}
						>
							<Spinner
								type="dots"
								color="cyan"
								label="Loading model analysis..."
							/>
						</Box>
					) : analysis ? (
						<ModelSummary models={analysis.models} />
					) : (
						<Text dimColor>No model analysis available.</Text>
					)}
				</>
			)}

			<StatusBar
				keys={[
					'↑↓: Move',
					searchQuery ? '' : 'PageUp/PageDown: Page',
					'Enter: View',
					'/: Search',
					searchQuery ? 'c: Clear' : '',
					'a/t/m: Views',
					'e: Export',
					'?: Help',
					'q: Quit',
				].filter(Boolean)}
			/>
		</Box>
	);
}

export default ShowCommand;
