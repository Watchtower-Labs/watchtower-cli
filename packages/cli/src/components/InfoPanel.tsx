/**
 * InfoPanel component showing models and tools summary
 *
 * Design: Combined panel with model and tool breakdowns
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {ModelInfo, ToolInfo} from '../lib/types.js';
import {colors, formatTokens, formatDurationCompact} from '../lib/theme.js';

export interface InfoPanelProps {
	models: ModelInfo[];
	tools: ToolInfo[];
}

export function InfoPanel({models, tools}: InfoPanelProps): React.ReactElement {
	return (
		<Box
			borderStyle="round"
			borderColor={colors.border.secondary}
			paddingX={1}
			flexDirection="column"
		>
			{/* Models Section */}
			{models.length > 0 && (
				<>
					<Box marginBottom={0}>
						<Text dimColor>MODELS: </Text>
						{models.map((model, i) => (
							<React.Fragment key={model.name}>
								<Text color="magenta">{model.name}</Text>
								<Text dimColor> ({formatTokens(model.totalTokens)} tok)</Text>
								{i < models.length - 1 && <Text dimColor>, </Text>}
							</React.Fragment>
						))}
					</Box>
				</>
			)}

			{/* Tools Section */}
			{tools.length > 0 && (
				<Box>
					<Text dimColor>TOOLS: </Text>
					{tools.map((tool, i) => (
						<React.Fragment key={tool.name}>
							<Text color="yellow">{tool.name}</Text>
							<Text dimColor> x{tool.callCount}</Text>
							{tool.errorCount > 0 && (
								<Text color="red"> ({tool.errorCount} err)</Text>
							)}
							{i < tools.length - 1 && <Text dimColor>, </Text>}
						</React.Fragment>
					))}
				</Box>
			)}

			{/* Empty state */}
			{models.length === 0 && tools.length === 0 && (
				<Text dimColor>No model or tool usage detected</Text>
			)}
		</Box>
	);
}

// Separate ModelSummary component for detailed view
export interface ModelSummaryProps {
	models: ModelInfo[];
}

export function ModelSummary({models}: ModelSummaryProps): React.ReactElement {
	if (models.length === 0) {
		return (
			<Box
				borderStyle="round"
				borderColor={colors.border.secondary}
				paddingX={1}
			>
				<Text dimColor>No models used</Text>
			</Box>
		);
	}

	return (
		<Box
			borderStyle="round"
			borderColor={colors.border.secondary}
			paddingX={1}
			flexDirection="column"
		>
			<Text bold color={colors.brand.primary}>
				Models
			</Text>
			{models.map(model => (
				<Box key={model.name} justifyContent="space-between">
					<Text color="magenta">{model.name}</Text>
					<Box>
						<Text dimColor>{model.requestCount} calls</Text>
						<Text dimColor> | </Text>
						<Text color="cyan">{formatTokens(model.totalTokens)} tok</Text>
						{model.avgLatencyMs > 0 && (
							<>
								<Text dimColor> | </Text>
								<Text dimColor>
									~{formatDurationCompact(model.avgLatencyMs)}
								</Text>
							</>
						)}
					</Box>
				</Box>
			))}
		</Box>
	);
}

// Separate ToolSummary component for detailed view
export interface ToolSummaryProps {
	tools: ToolInfo[];
}

export function ToolSummary({tools}: ToolSummaryProps): React.ReactElement {
	if (tools.length === 0) {
		return (
			<Box
				borderStyle="round"
				borderColor={colors.border.secondary}
				paddingX={1}
			>
				<Text dimColor>No tools used</Text>
			</Box>
		);
	}

	return (
		<Box
			borderStyle="round"
			borderColor={colors.border.secondary}
			paddingX={1}
			flexDirection="column"
		>
			<Text bold color={colors.brand.primary}>
				Tools
			</Text>
			{tools.map(tool => (
				<Box key={tool.name} justifyContent="space-between">
					<Box>
						<Text color={tool.errorCount > 0 ? 'red' : 'yellow'}>
							{tool.errorCount > 0 ? 'x ' : '* '}
						</Text>
						<Text color="yellow">{tool.name}</Text>
					</Box>
					<Box>
						<Text dimColor>x{tool.callCount}</Text>
						{tool.successCount > 0 && (
							<>
								<Text dimColor> | </Text>
								<Text color="green">{tool.successCount} ok</Text>
							</>
						)}
						{tool.errorCount > 0 && (
							<>
								<Text dimColor> | </Text>
								<Text color="red">{tool.errorCount} err</Text>
							</>
						)}
						{tool.avgDurationMs > 0 && (
							<>
								<Text dimColor> | </Text>
								<Text dimColor>
									~{formatDurationCompact(tool.avgDurationMs)}
								</Text>
							</>
						)}
					</Box>
				</Box>
			))}
		</Box>
	);
}

export default InfoPanel;
