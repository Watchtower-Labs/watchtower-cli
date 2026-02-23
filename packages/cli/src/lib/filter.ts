/**
 * Event filtering utilities for search functionality
 *
 * Supports syntax:
 * - type:llm, type:tool, type:run, type:state, type:error
 * - agent:name - filter by agent name
 * - tool:name - filter by tool name
 * - model:name - filter by model name
 * - error - show only error events
 * - plain text - search in event content
 */

import type {TraceEvent, EventType} from './types.js';

export interface FilterResult {
	events: TraceEvent[];
	matchedIndices: Set<number>;
}

export interface ParsedFilter {
	type: 'type' | 'agent' | 'tool' | 'model' | 'error' | 'text';
	value: string;
}

/**
 * Parse a search query into filter components
 */
export function parseFilter(query: string): ParsedFilter[] {
	if (!query.trim()) {
		return [];
	}

	const filters: ParsedFilter[] = [];
	const parts = query.trim().split(/\s+/);

	for (const part of parts) {
		const colonIndex = part.indexOf(':');

		if (colonIndex > 0) {
			const prefix = part.slice(0, colonIndex).toLowerCase();
			const value = part.slice(colonIndex + 1);

			if (prefix === 'type' && value) {
				filters.push({type: 'type', value: value.toLowerCase()});
			} else if (prefix === 'agent' && value) {
				filters.push({type: 'agent', value: value.toLowerCase()});
			} else if (prefix === 'tool' && value) {
				filters.push({type: 'tool', value: value.toLowerCase()});
			} else if (prefix === 'model' && value) {
				filters.push({type: 'model', value: value.toLowerCase()});
			} else {
				// Unknown prefix, treat as text search
				filters.push({type: 'text', value: part.toLowerCase()});
			}
		} else if (
			part.toLowerCase() === 'error' ||
			part.toLowerCase() === 'errors'
		) {
			filters.push({type: 'error', value: ''});
		} else {
			filters.push({type: 'text', value: part.toLowerCase()});
		}
	}

	return filters;
}

/**
 * Check if an event type matches a type filter
 */
function matchesTypeFilter(eventType: EventType, filterValue: string): boolean {
	// Map common aliases to event type prefixes
	const typeMap: Record<string, string[]> = {
		llm: ['llm.request', 'llm.response'],
		tool: ['tool.start', 'tool.end', 'tool.error'],
		run: ['run.start', 'run.end'],
		state: ['state.change'],
		transfer: ['agent.transfer'],
		request: ['llm.request'],
		response: ['llm.response'],
		start: ['run.start', 'tool.start'],
		end: ['run.end', 'tool.end'],
	};

	// Direct match
	if (eventType.toLowerCase().includes(filterValue)) {
		return true;
	}

	// Alias match
	const matchingTypes = typeMap[filterValue];
	if (matchingTypes) {
		return matchingTypes.includes(eventType);
	}

	return false;
}

/**
 * Check if an event matches a single filter
 */
function matchesFilter(event: TraceEvent, filter: ParsedFilter): boolean {
	switch (filter.type) {
		case 'type':
			return matchesTypeFilter(event.type, filter.value);

		case 'agent': {
			const agentName = (event as {agent_name?: string}).agent_name ?? '';
			const fromAgent = (event as {from_agent?: string}).from_agent ?? '';
			const toAgent = (event as {to_agent?: string}).to_agent ?? '';
			const author = (event as {author?: string}).author ?? '';

			return (
				agentName.toLowerCase().includes(filter.value) ||
				fromAgent.toLowerCase().includes(filter.value) ||
				toAgent.toLowerCase().includes(filter.value) ||
				author.toLowerCase().includes(filter.value)
			);
		}

		case 'tool': {
			const toolName = (event as {tool_name?: string}).tool_name ?? '';
			return toolName.toLowerCase().includes(filter.value);
		}

		case 'model': {
			const model = (event as {model?: string}).model ?? '';
			return model.toLowerCase().includes(filter.value);
		}

		case 'error':
			return (
				event.type === 'tool.error' ||
				(event as {success?: boolean}).success === false ||
				(event as {error_type?: string}).error_type !== undefined
			);

		case 'text': {
			// Search in common text fields
			const searchableFields = [
				event.type,
				(event as {tool_name?: string}).tool_name,
				(event as {agent_name?: string}).agent_name,
				(event as {model?: string}).model,
				(event as {error_message?: string}).error_message,
				(event as {reason?: string}).reason,
				(event as {response_preview?: string}).response_preview,
				(event as {finish_reason?: string}).finish_reason,
			];

			const searchText = searchableFields
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return searchText.includes(filter.value);
		}

		default:
			return true;
	}
}

/**
 * Filter events based on a search query
 */
export function filterEvents(
	events: TraceEvent[],
	query: string,
): FilterResult {
	if (!query.trim()) {
		return {
			events,
			matchedIndices: new Set(events.map((_, i) => i)),
		};
	}

	const filters = parseFilter(query);

	if (filters.length === 0) {
		return {
			events,
			matchedIndices: new Set(events.map((_, i) => i)),
		};
	}

	const matchedIndices = new Set<number>();
	const filteredEvents: TraceEvent[] = [];

	events.forEach((event, index) => {
		// Event must match ALL filters (AND logic)
		const matches = filters.every(filter => matchesFilter(event, filter));

		if (matches) {
			filteredEvents.push(event);
			matchedIndices.add(index);
		}
	});

	return {
		events: filteredEvents,
		matchedIndices,
	};
}

/**
 * Get filter suggestions based on current query
 */
export function getFilterSuggestions(
	query: string,
	events: TraceEvent[],
): string[] {
	const suggestions: string[] = [];
	const queryLower = query.toLowerCase();

	// Suggest type filters
	if (
		queryLower.startsWith('type:') ||
		queryLower === 't' ||
		queryLower === 'ty'
	) {
		suggestions.push('type:llm', 'type:tool', 'type:run', 'type:error');
	}

	// Suggest agent filters from events
	if (
		queryLower.startsWith('agent:') ||
		queryLower === 'a' ||
		queryLower === 'ag'
	) {
		const agents = new Set<string>();
		for (const event of events) {
			const agentName = (event as {agent_name?: string}).agent_name;
			if (agentName) agents.add(agentName);
		}
		suggestions.push(...[...agents].map(a => `agent:${a}`));
	}

	// Suggest tool filters from events
	if (queryLower.startsWith('tool:') || queryLower === 'to') {
		const tools = new Set<string>();
		for (const event of events) {
			const toolName = (event as {tool_name?: string}).tool_name;
			if (toolName) tools.add(toolName);
		}
		suggestions.push(...[...tools].map(t => `tool:${t}`));
	}

	return suggestions.slice(0, 5);
}

export default filterEvents;
