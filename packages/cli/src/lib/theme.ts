/**
 * Visual theme constants for Watchtower CLI
 */

import type {EventType} from './types.js';

// Event type icons (Unicode)
export const eventIcons: Record<EventType, string> = {
	'run.start': '\u25B6', // ▶
	'run.end': '\u25A0', // ■
	'llm.request': '\u2192', // →
	'llm.response': '\u2190', // ←
	'tool.start': '\u2699', // ⚙
	'tool.end': '\u2713', // ✓
	'tool.error': '\u2717', // ✗
	'state.change': '\u25C7', // ◇
	'agent.transfer': '\u21C4', // ⇄
};

// Fallback ASCII icons for terminals without Unicode
export const eventIconsAscii: Record<EventType, string> = {
	'run.start': '>',
	'run.end': '#',
	'llm.request': '->',
	'llm.response': '<-',
	'tool.start': '*',
	'tool.end': '+',
	'tool.error': 'x',
	'state.change': '~',
	'agent.transfer': '<>',
};

// Ink color names for event types
export const eventColors: Record<EventType, string> = {
	'run.start': 'green',
	'run.end': 'blue',
	'llm.request': 'cyan',
	'llm.response': 'cyan',
	'tool.start': 'yellow',
	'tool.end': 'yellow',
	'tool.error': 'red',
	'state.change': 'magenta',
	'agent.transfer': 'white',
};

// Status indicator colors
export const statusColors = {
	starting: 'yellow',
	running: 'green',
	stopped: 'gray',
	error: 'red',
} as const;

// Get icon for event type
export function getEventIcon(type: EventType, ascii = false): string {
	return ascii ? eventIconsAscii[type] ?? '?' : eventIcons[type] ?? '\u2022';
}

// Get color for event type
export function getEventColor(type: EventType): string {
	return eventColors[type] ?? 'white';
}

// Format timestamp for display
export function formatTimestamp(
	timestamp: number,
	format: 'relative' | 'absolute' | 'unix' = 'absolute',
	referenceTimestamp?: number,
): string {
	if (format === 'unix') {
		return timestamp.toFixed(3);
	}

	const date = new Date(timestamp * 1000);

	if (format === 'absolute') {
		const time = date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
		const ms = String(date.getMilliseconds()).padStart(3, '0');
		return `${time}.${ms}`;
	}

	// Relative format - show time since reference (or start)
	const ref = referenceTimestamp ?? 0;
	const deltaMs = (timestamp - ref) * 1000;

	if (deltaMs < 0) {
		return `-${Math.abs(Math.round(deltaMs))}ms`;
	}

	return `+${Math.round(deltaMs)}ms`;
}

// Format duration in human-readable form
export function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}

	if (ms < 60000) {
		return `${(ms / 1000).toFixed(1)}s`;
	}

	const minutes = Math.floor(ms / 60000);
	const seconds = ((ms % 60000) / 1000).toFixed(0);
	return `${minutes}m ${seconds}s`;
}

// Format token count with commas
export function formatTokens(count: number): string {
	return count.toLocaleString();
}

// Format file size
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes}B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)}KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: Date): string {
	const now = Date.now();
	const diff = now - date.getTime();

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return days === 1 ? '1 day ago' : `${days} days ago`;
	}

	if (hours > 0) {
		return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
	}

	if (minutes > 0) {
		return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
	}

	return 'just now';
}

// Truncate string with ellipsis
export function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) {
		return str;
	}

	return str.slice(0, maxLength - 1) + '\u2026';
}

// Pad string to fixed width
export function padEnd(str: string, width: number): string {
	if (str.length >= width) {
		return str.slice(0, width);
	}

	return str + ' '.repeat(width - str.length);
}
