/**
 * Show command - View a saved trace file
 *
 * Design: Enhanced timeline view with agent grouping and detailed panels
 */

import React, {useState, useMemo} from 'react';
import {Box, Text, useInput} from 'ink';
import {Header} from '../components/Header.js';
import {Summary} from '../components/Summary.js';
import {EventListGrouped} from '../components/EventListGrouped.js';
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
import {useKeyboard} from '../hooks/useKeyboard.js';
import {useTerminalSize} from '../hooks/useTerminalSize.js';
import {analyzeTrace} from '../lib/parser.js';
import {filterEvents} from '../lib/filter.js';
import {exportTrace, type ExportFormat} from '../lib/export.js';
import type {TraceEvent} from '../lib/types.js';
import {colors} from '../lib/theme.js';

export interface ShowCommandProps {
	trace: string;
}

type ViewMode = 'timeline' | 'agents' | 'tools' | 'models' | 'detail';

export function ShowCommand({trace}: ShowCommandProps): React.ReactElement {
	const {events, summary, loading, error} = useTraceFile(trace);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [expandedEvent, setExpandedEvent] = useState<TraceEvent | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('timeline');
	const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
	const [showHelp, setShowHelp] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [showExport, setShowExport] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [exportResult, setExportResult] = useState<
		{success: boolean; path?: string; error?: string} | undefined
	>();
	const terminalSize = useTerminalSize();

	// Handle export
	const handleExport = async (format: ExportFormat) => {
		setExporting(true);
		const result = await exportTrace(events, summary, analysis, {format});
		setExporting(false);
		setExportResult({
			success: result.success,
			path: result.path,
			error: result.error,
		});
	};

	// Filter events based on search query
	const filteredResult = useMemo(() => {
		return filterEvents(events, searchQuery);
	}, [events, searchQuery]);

	// Use filtered events for display
	const displayEvents = searchQuery ? filteredResult.events : events;

	// Handle search input
	useInput(
		(input, key) => {
			if (!isSearching) return;

			if (key.escape) {
				setIsSearching(false);
				return;
			}

			if (key.return) {
				setIsSearching(false);
				// Keep the filter active, just close input mode
				return;
			}

			if (key.backspace || key.delete) {
				setSearchQuery(q => q.slice(0, -1));
				return;
			}

			// Add printable characters to query
			if (input && !key.ctrl && !key.meta) {
				setSearchQuery(q => q + input);
			}
		},
		{isActive: isSearching},
	);

	// Analyze trace for enhanced data
	const analysis = useMemo(() => {
		if (events.length === 0) return null;
		return analyzeTrace(events);
	}, [events]);

	// Jump to agent's first event
	const jumpToAgent = (agentIndex: number) => {
		if (!analysis || agentIndex < 0 || agentIndex >= analysis.agents.length)
			return;
		const agent = analysis.agents[agentIndex];
		if (agent) {
			setSelectedAgentIndex(agentIndex);
			setSelectedIndex(agent.firstEventIndex);
		}
	};

	// Keyboard navigation (disabled during search)
	useKeyboard({
		onUp: () => {
			if (!expandedEvent && !isSearching) {
				setSelectedIndex(i => Math.max(0, i - 1));
			}
		},
		onDown: () => {
			if (!expandedEvent && !isSearching) {
				setSelectedIndex(i => Math.min(displayEvents.length - 1, i + 1));
			}
		},
		onPageUp: () => {
			if (!expandedEvent && !isSearching) {
				setSelectedIndex(i => Math.max(0, i - 10));
			}
		},
		onPageDown: () => {
			if (!expandedEvent && !isSearching) {
				setSelectedIndex(i => Math.min(displayEvents.length - 1, i + 10));
			}
		},
		onHome: () => {
			if (!expandedEvent && !isSearching) {
				setSelectedIndex(0);
			}
		},
		onEnd: () => {
			if (!expandedEvent && !isSearching) {
				setSelectedIndex(displayEvents.length - 1);
			}
		},
		onEnter: () => {
			if (!expandedEvent && !isSearching && displayEvents[selectedIndex]) {
				setExpandedEvent(displayEvents[selectedIndex]!);
			}
		},
		onBack: () => {
			if (isSearching) return;
			if (expandedEvent) {
				setExpandedEvent(null);
			} else if (searchQuery) {
				// Clear search filter
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

			// Export menu handling
			if (showExport) {
				if (exportResult) {
					// Any key closes result
					setShowExport(false);
					setExportResult(undefined);
					return;
				}
				if (handleExportKey(key, handleExport)) {
					return;
				}
				return;
			}

			// Help toggle
			if (key === '?') {
				setShowHelp(h => !h);
				return;
			}

			// If help is showing, close it on any key except ?
			if (showHelp) {
				setShowHelp(false);
				return;
			}

			// Export toggle
			if (key === 'e' && !expandedEvent) {
				setShowExport(true);
				setExportResult(undefined);
				return;
			}

			// Search toggle
			if (key === '/') {
				setIsSearching(true);
				return;
			}

			// Clear search with 'c'
			if (key === 'c' && searchQuery && !expandedEvent) {
				setSearchQuery('');
				setSelectedIndex(0);
				return;
			}

			// View mode shortcuts
			if (key === 'a' && !expandedEvent) {
				setViewMode(viewMode === 'agents' ? 'timeline' : 'agents');
			} else if (key === 't' && !expandedEvent) {
				setViewMode(viewMode === 'tools' ? 'timeline' : 'tools');
			} else if (key === 'm' && !expandedEvent) {
				setViewMode(viewMode === 'models' ? 'timeline' : 'models');
			}
			// Agent navigation - n/N for next/previous agent
			else if (key === 'n' && !expandedEvent && analysis?.hasMultipleAgents) {
				const nextIndex = (selectedAgentIndex + 1) % analysis.agents.length;
				jumpToAgent(nextIndex);
			} else if (key === 'N' && !expandedEvent && analysis?.hasMultipleAgents) {
				const prevIndex =
					selectedAgentIndex === 0
						? analysis.agents.length - 1
						: selectedAgentIndex - 1;
				jumpToAgent(prevIndex);
			}
			// Number keys 1-9 to jump directly to agent
			else if (
				!expandedEvent &&
				analysis?.hasMultipleAgents &&
				/^[1-9]$/.test(key)
			) {
				const agentIndex = parseInt(key, 10) - 1;
				if (agentIndex < analysis.agents.length) {
					jumpToAgent(agentIndex);
				}
			}
		},
	});

	// Loading state
	if (loading) {
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

	// Error state
	if (error) {
		return (
			<Box flexDirection="column">
				<Header runId={trace} status="error" />
				<ErrorDisplay error={error} />
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

	// Help overlay
	if (showHelp) {
		return (
			<Box flexDirection="column">
				<Header
					runId={summary.runId}
					agentName={
						analysis?.hasMultipleAgents ? undefined : summary.agentName
					}
					timestamp={summary.startTime}
				/>
				<HelpOverlay context="show" />
			</Box>
		);
	}

	// Export menu
	if (showExport) {
		return (
			<Box flexDirection="column">
				<Header
					runId={summary.runId}
					agentName={
						analysis?.hasMultipleAgents ? undefined : summary.agentName
					}
					timestamp={summary.startTime}
				/>
				<ExportMenu
					onSelect={handleExport}
					onClose={() => {
						setShowExport(false);
						setExportResult(undefined);
					}}
					exporting={exporting}
					result={exportResult}
				/>
			</Box>
		);
	}

	// Main timeline view with new layout
	return (
		<Box flexDirection="column">
			<Header
				runId={summary.runId}
				agentName={analysis?.hasMultipleAgents ? undefined : summary.agentName}
				timestamp={summary.startTime}
			/>

			{/* Stats row */}
			<Summary summary={summary} />

			{/* Info panel with models and tools */}
			{analysis && (
				<InfoPanel models={analysis.models} tools={analysis.tools} />
			)}

			{/* Search bar */}
			{(isSearching || searchQuery) && (
				<SearchBar
					query={searchQuery}
					onChange={setSearchQuery}
					resultCount={displayEvents.length}
					totalCount={events.length}
					onClose={() => setIsSearching(false)}
				/>
			)}

			{/* Main content area */}
			{viewMode === 'timeline' && (
				<Box>
					{/* Agent panel (if multiple agents and not filtering) */}
					{analysis?.hasMultipleAgents && !searchQuery && (
						<Box marginRight={1}>
							<AgentPanel
								agents={analysis.agents}
								compact
								selectedIndex={selectedAgentIndex}
							/>
						</Box>
					)}

					{/* Event timeline */}
					<Box flexGrow={1}>
						<EventListGrouped
							events={displayEvents}
							eventGroups={searchQuery ? [] : analysis?.eventGroups ?? []}
							selectedIndex={selectedIndex}
							hasMultipleAgents={
								searchQuery ? false : analysis?.hasMultipleAgents ?? false
							}
							maxVisible={
								terminalSize.isNarrow ? 10 : terminalSize.isMedium ? 15 : 20
							}
						/>
					</Box>
				</Box>
			)}

			{viewMode === 'agents' && analysis && (
				<AgentPanel agents={analysis.agents} />
			)}

			{viewMode === 'tools' && analysis && (
				<ToolSummary tools={analysis.tools} />
			)}

			{viewMode === 'models' && analysis && (
				<ModelSummary models={analysis.models} />
			)}

			<StatusBar
				keys={[
					'↑↓: Move',
					'Enter: View',
					'/: Search',
					searchQuery ? 'c: Clear' : '',
					analysis?.hasMultipleAgents && !searchQuery ? 'n/N: Agent' : '',
					't: Tools',
					'm: Models',
					'e: Export',
					'?: Help',
					'q: Quit',
				].filter(Boolean)}
			/>
		</Box>
	);
}

export default ShowCommand;
