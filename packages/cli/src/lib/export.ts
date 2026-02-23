/**
 * Trace export utilities
 *
 * Exports trace data to various formats:
 * - JSON: Full trace with all events and metadata
 * - CSV: Tabular format for spreadsheet analysis
 * - Markdown: Human-readable report
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type {TraceEvent, TraceSummary, TraceAnalysis} from './types.js';
import {formatDuration, formatTokens} from './theme.js';

export type ExportFormat = 'json' | 'csv' | 'markdown';

export interface ExportOptions {
	format: ExportFormat;
	outputPath?: string;
	includeRawEvents?: boolean;
}

export interface ExportResult {
	success: boolean;
	path: string;
	size: number;
	error?: string;
}

/**
 * Export trace to JSON format
 */
function exportToJson(
	events: TraceEvent[],
	summary: TraceSummary,
	analysis: TraceAnalysis | null,
): string {
	const data = {
		version: '1.0',
		exportedAt: new Date().toISOString(),
		summary: {
			runId: summary.runId,
			agentName: summary.agentName,
			startTime: new Date(summary.startTime).toISOString(),
			endTime: new Date(summary.endTime).toISOString(),
			duration: summary.duration,
			durationFormatted: formatDuration(summary.duration),
			llmCalls: summary.llmCalls,
			toolCalls: summary.toolCalls,
			totalTokens: summary.totalTokens,
			errors: summary.errors,
			toolsUsed: summary.toolsUsed,
		},
		analysis: analysis
			? {
					agents: analysis.agents.map(a => ({
						name: a.name,
						eventCount: a.eventCount,
						toolCalls: a.toolCalls,
						llmCalls: a.llmCalls,
						tokens: a.tokens,
					})),
					models: analysis.models.map(m => ({
						name: m.name,
						requestCount: m.requestCount,
						totalTokens: m.totalTokens,
						inputTokens: m.inputTokens,
						outputTokens: m.outputTokens,
						avgLatencyMs: m.avgLatencyMs,
					})),
					tools: analysis.tools.map(t => ({
						name: t.name,
						callCount: t.callCount,
						successCount: t.successCount,
						errorCount: t.errorCount,
						avgDurationMs: t.avgDurationMs,
					})),
			  }
			: null,
		events: events.map(e => ({
			...e,
			timestampFormatted: new Date(e.timestamp).toISOString(),
		})),
	};

	return JSON.stringify(data, null, 2);
}

/**
 * Export trace to CSV format
 */
function exportToCsv(events: TraceEvent[], summary: TraceSummary): string {
	const lines: string[] = [];

	// Header
	lines.push(
		'timestamp,type,agent_name,tool_name,model,duration_ms,tokens,error',
	);

	// Events
	for (const event of events) {
		const e = event as Record<string, unknown>;
		const timestamp = new Date(event.timestamp).toISOString();
		const type = event.type;
		const agentName = String(e['agent_name'] ?? e['author'] ?? '');
		const toolName = String(e['tool_name'] ?? '');
		const model = String(e['model'] ?? '');
		const durationMs = String(e['duration_ms'] ?? '');
		const tokens = String(e['total_tokens'] ?? '');
		const error = e['error_message']
			? String(e['error_message']).replace(/"/g, '""')
			: '';

		lines.push(
			`"${timestamp}","${type}","${agentName}","${toolName}","${model}","${durationMs}","${tokens}","${error}"`,
		);
	}

	// Add summary section
	lines.push('');
	lines.push('# Summary');
	lines.push(`"Run ID","${summary.runId}"`);
	lines.push(`"Agent","${summary.agentName}"`);
	lines.push(`"Duration","${formatDuration(summary.duration)}"`);
	lines.push(`"LLM Calls","${summary.llmCalls}"`);
	lines.push(`"Tool Calls","${summary.toolCalls}"`);
	lines.push(`"Total Tokens","${summary.totalTokens}"`);
	lines.push(`"Errors","${summary.errors}"`);

	return lines.join('\n');
}

/**
 * Export trace to Markdown format
 */
function exportToMarkdown(
	events: TraceEvent[],
	summary: TraceSummary,
	analysis: TraceAnalysis | null,
): string {
	const lines: string[] = [];

	// Title
	lines.push(`# Trace Report: ${summary.runId}`);
	lines.push('');
	lines.push(`*Exported at ${new Date().toISOString()}*`);
	lines.push('');

	// Summary section
	lines.push('## Summary');
	lines.push('');
	lines.push('| Metric | Value |');
	lines.push('|--------|-------|');
	lines.push(`| Run ID | \`${summary.runId}\` |`);
	lines.push(`| Agent | ${summary.agentName} |`);
	lines.push(
		`| Start Time | ${new Date(summary.startTime).toLocaleString()} |`,
	);
	lines.push(`| Duration | ${formatDuration(summary.duration)} |`);
	lines.push(`| LLM Calls | ${summary.llmCalls} |`);
	lines.push(`| Tool Calls | ${summary.toolCalls} |`);
	lines.push(`| Total Tokens | ${formatTokens(summary.totalTokens)} |`);
	lines.push(`| Errors | ${summary.errors} |`);
	lines.push('');

	// Models section
	if (analysis && analysis.models.length > 0) {
		lines.push('## Models Used');
		lines.push('');
		lines.push('| Model | Requests | Tokens | Avg Latency |');
		lines.push('|-------|----------|--------|-------------|');
		for (const model of analysis.models) {
			const latency =
				model.avgLatencyMs > 0 ? `${model.avgLatencyMs.toFixed(0)}ms` : '-';
			lines.push(
				`| ${model.name} | ${model.requestCount} | ${formatTokens(
					model.totalTokens,
				)} | ${latency} |`,
			);
		}
		lines.push('');
	}

	// Tools section
	if (analysis && analysis.tools.length > 0) {
		lines.push('## Tools Used');
		lines.push('');
		lines.push('| Tool | Calls | Success | Errors | Avg Duration |');
		lines.push('|------|-------|---------|--------|--------------|');
		for (const tool of analysis.tools) {
			const duration =
				tool.avgDurationMs > 0 ? `${tool.avgDurationMs.toFixed(0)}ms` : '-';
			lines.push(
				`| ${tool.name} | ${tool.callCount} | ${tool.successCount} | ${tool.errorCount} | ${duration} |`,
			);
		}
		lines.push('');
	}

	// Agents section (if multiple)
	if (analysis && analysis.agents.length > 1) {
		lines.push('## Agents');
		lines.push('');
		lines.push('| Agent | Events | LLM Calls | Tool Calls | Tokens |');
		lines.push('|-------|--------|-----------|------------|--------|');
		for (const agent of analysis.agents) {
			lines.push(
				`| ${agent.name} | ${agent.eventCount} | ${agent.llmCalls} | ${
					agent.toolCalls
				} | ${formatTokens(agent.tokens)} |`,
			);
		}
		lines.push('');
	}

	// Event timeline (condensed)
	lines.push('## Event Timeline');
	lines.push('');
	lines.push('```');

	const baseTime = events[0]?.timestamp ?? 0;
	for (const event of events) {
		const relativeTime = ((event.timestamp - baseTime) / 1000).toFixed(2);
		const e = event as Record<string, unknown>;

		let detail = '';
		switch (event.type) {
			case 'run.start':
				detail = `agent=${e['agent_name']}`;
				break;
			case 'run.end':
				detail = `duration=${e['duration_ms']}ms`;
				break;
			case 'llm.request':
				detail = `model=${e['model']}`;
				break;
			case 'llm.response':
				detail = `tokens=${e['total_tokens']}`;
				break;
			case 'tool.start':
				detail = `tool=${e['tool_name']}`;
				break;
			case 'tool.end':
				detail = `tool=${e['tool_name']} (${e['duration_ms']}ms)`;
				break;
			case 'tool.error':
				detail = `tool=${e['tool_name']} error="${e['error_message']}"`;
				break;
			case 'agent.transfer':
				detail = `${e['from_agent']} -> ${e['to_agent']}`;
				break;
			default:
				detail = '';
		}

		lines.push(`[${relativeTime}s] ${event.type.padEnd(15)} ${detail}`);
	}

	lines.push('```');
	lines.push('');

	// Footer
	lines.push('---');
	lines.push('*Generated by Watchtower CLI*');

	return lines.join('\n');
}

/**
 * Export trace to file
 */
export async function exportTrace(
	events: TraceEvent[],
	summary: TraceSummary,
	analysis: TraceAnalysis | null,
	options: ExportOptions,
): Promise<ExportResult> {
	try {
		let content: string;
		let extension: string;

		switch (options.format) {
			case 'json':
				content = exportToJson(events, summary, analysis);
				extension = 'json';
				break;
			case 'csv':
				content = exportToCsv(events, summary);
				extension = 'csv';
				break;
			case 'markdown':
				content = exportToMarkdown(events, summary, analysis);
				extension = 'md';
				break;
			default:
				throw new Error(`Unsupported format: ${options.format}`);
		}

		// Determine output path
		const outputPath =
			options.outputPath ??
			path.join(
				process.cwd(),
				`watchtower-${summary.runId}-${Date.now()}.${extension}`,
			);

		// Write file
		await fs.writeFile(outputPath, content, 'utf-8');

		// Get file size
		const stats = await fs.stat(outputPath);

		return {
			success: true,
			path: outputPath,
			size: stats.size,
		};
	} catch (error) {
		return {
			success: false,
			path: '',
			size: 0,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Get content for export without writing to file
 */
export function getExportContent(
	events: TraceEvent[],
	summary: TraceSummary,
	analysis: TraceAnalysis | null,
	format: ExportFormat,
): string {
	switch (format) {
		case 'json':
			return exportToJson(events, summary, analysis);
		case 'csv':
			return exportToCsv(events, summary);
		case 'markdown':
			return exportToMarkdown(events, summary, analysis);
		default:
			throw new Error(`Unsupported format: ${format}`);
	}
}

export default exportTrace;
