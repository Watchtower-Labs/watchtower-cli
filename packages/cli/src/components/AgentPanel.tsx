/**
 * AgentPanel component showing all agents involved in a trace
 *
 * Design: Compact panel with selection, stats, and navigation hints
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {AgentInfo} from '../lib/types.js';
import {colors} from '../lib/theme.js';

export interface AgentPanelProps {
	agents: AgentInfo[];
	compact?: boolean;
	selectedIndex?: number;
	showStats?: boolean;
}

export function AgentPanel({
	agents,
	compact = false,
	selectedIndex = -1,
	showStats = true,
}: AgentPanelProps): React.ReactElement {
	if (agents.length === 0) {
		return (
			<Box
				borderStyle="round"
				borderColor={colors.border.secondary}
				paddingX={1}
				flexDirection="column"
			>
				<Text bold color={colors.brand.primary}>
					Agents
				</Text>
				<Text dimColor>No agents detected</Text>
			</Box>
		);
	}

	// Calculate totals for context
	const totalTokens = agents.reduce((sum, a) => sum + a.tokens, 0);
	const totalLLM = agents.reduce((sum, a) => sum + a.llmCalls, 0);
	const totalTools = agents.reduce((sum, a) => sum + a.toolCalls, 0);

	// Compact mode for side panel
	if (compact) {
		return (
			<Box
				borderStyle="round"
				borderColor={colors.border.secondary}
				paddingX={1}
				flexDirection="column"
				minWidth={32}
			>
				{/* Header with navigation hint */}
				<Box justifyContent="space-between">
					<Text bold color={colors.brand.primary}>
						Agents
					</Text>
					<Text dimColor>n/N 1-{agents.length}</Text>
				</Box>

				{/* Agent list */}
				{agents.map((agent, index) => {
					const isSelected = index === selectedIndex;
					const isActive = agent.isActive;

					// Calculate percentage of total tokens
					const tokenPct =
						totalTokens > 0
							? Math.round((agent.tokens / totalTokens) * 100)
							: 0;

					return (
						<Box key={agent.name} flexDirection="column">
							<Box>
								{/* Number key */}
								<Text color={isSelected ? 'cyan' : 'gray'}>{index + 1}</Text>
								{/* Selection/status indicator */}
								<Text color={isSelected ? 'cyan' : isActive ? 'green' : 'gray'}>
									{isSelected ? ' ▸ ' : isActive ? ' ● ' : ' ○ '}
								</Text>
								{/* Agent name */}
								<Text
									bold={isSelected || isActive}
									color={isSelected ? 'cyan' : isActive ? 'white' : undefined}
								>
									{agent.name}
								</Text>
							</Box>
							{/* Stats row (only if showStats and selected or has significant activity) */}
							{showStats && (isSelected || agent.tokens > 0) && (
								<Box marginLeft={4}>
									<Text dimColor>
										{agent.llmCalls > 0 && `${agent.llmCalls}llm `}
										{agent.toolCalls > 0 && `${agent.toolCalls}tool `}
										{agent.tokens > 0 && `${agent.tokens.toLocaleString()}tok`}
										{tokenPct > 0 && ` (${tokenPct}%)`}
									</Text>
								</Box>
							)}
						</Box>
					);
				})}

				{/* Footer with totals */}
				<Box marginTop={0} borderStyle={undefined}>
					<Text dimColor>
						─ {totalLLM}llm {totalTools}tool {totalTokens.toLocaleString()}tok
					</Text>
				</Box>
			</Box>
		);
	}

	// Full mode with detailed stats
	return (
		<Box
			borderStyle="round"
			borderColor={colors.border.secondary}
			paddingX={1}
			flexDirection="column"
		>
			<Box justifyContent="space-between" marginBottom={0}>
				<Text bold color={colors.brand.primary}>
					Agents
				</Text>
				<Text dimColor>{agents.length} agents</Text>
			</Box>

			{agents.map((agent, index) => {
				const isSelected = index === selectedIndex;
				const isActive = agent.isActive;
				const tokenPct =
					totalTokens > 0 ? Math.round((agent.tokens / totalTokens) * 100) : 0;

				return (
					<Box key={agent.name} justifyContent="space-between">
						<Box>
							<Text color={isSelected ? 'cyan' : 'gray'}>{index + 1}</Text>
							<Text color={isSelected ? 'cyan' : isActive ? 'green' : 'gray'}>
								{isSelected ? ' ▸ ' : isActive ? ' ● ' : ' ○ '}
							</Text>
							<Text
								bold={isSelected || isActive}
								color={isSelected ? 'cyan' : isActive ? 'white' : undefined}
							>
								{agent.name}
							</Text>
						</Box>
						<Box>
							<Text dimColor>
								{agent.llmCalls}llm {agent.toolCalls}tool{' '}
								{agent.tokens.toLocaleString()}tok
							</Text>
							{tokenPct > 0 && <Text color="cyan"> {tokenPct}%</Text>}
						</Box>
					</Box>
				);
			})}

			{/* Totals row */}
			<Box justifyContent="space-between" marginTop={0}>
				<Text dimColor>Total:</Text>
				<Text bold>
					{totalLLM}llm {totalTools}tool {totalTokens.toLocaleString()}tok
				</Text>
			</Box>
		</Box>
	);
}

export default AgentPanel;
