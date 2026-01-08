/**
 * Visual theme constants for Watchtower CLI
 *
 * Design philosophy: Modern, clean, professional
 * Inspired by Vercel CLI, GitHub CLI, and Railway CLI
 */

import type {EventType} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════════════════════════

export const colors = {
	// Brand colors (matching web)
	brand: {
		primary: 'magenta', // Main brand color
		secondary: 'cyan', // Accent color
	},

	// Semantic colors
	success: 'green',
	warning: 'yellow',
	error: 'red',
	info: 'blue',

	// Text hierarchy
	text: {
		primary: 'white',
		secondary: 'gray',
		muted: 'gray',
	},

	// Borders
	border: {
		primary: 'magenta',
		secondary: 'gray',
		muted: 'gray',
	},
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// EVENT TYPE STYLING
// ═══════════════════════════════════════════════════════════════════════════

// Event type icons (Unicode) - more distinctive
export const eventIcons: Record<EventType, string> = {
	'run.start': '▶', // Play
	'run.end': '⏹', // Stop
	'llm.request': '↗', // Sending up
	'llm.response': '↙', // Receiving down
	'tool.start': '⚡', // Lightning bolt
	'tool.end': '✔', // Checkmark
	'tool.error': '✖', // X mark
	'state.change': '◈', // Diamond
	'agent.transfer': '⇋', // Transfer arrows
};

// Fallback ASCII icons for terminals without Unicode
export const eventIconsAscii: Record<EventType, string> = {
	'run.start': '>',
	'run.end': '#',
	'llm.request': '^',
	'llm.response': 'v',
	'tool.start': '*',
	'tool.end': '+',
	'tool.error': 'x',
	'state.change': '~',
	'agent.transfer': '<>',
};

// Ink color names for event types - refined palette
export const eventColors: Record<EventType, string> = {
	'run.start': 'green',
	'run.end': 'blue',
	'llm.request': 'magenta',
	'llm.response': 'cyan',
	'tool.start': 'yellow',
	'tool.end': 'green',
	'tool.error': 'red',
	'state.change': 'cyan',
	'agent.transfer': 'magenta',
};

// Background colors for badges (when supported)
export const eventBgColors: Record<EventType, string> = {
	'run.start': 'greenBright',
	'run.end': 'blueBright',
	'llm.request': 'magentaBright',
	'llm.response': 'cyanBright',
	'tool.start': 'yellowBright',
	'tool.end': 'greenBright',
	'tool.error': 'redBright',
	'state.change': 'cyanBright',
	'agent.transfer': 'magentaBright',
};

// Status indicator colors
export const statusColors = {
	starting: 'yellow',
	running: 'green',
	stopped: 'gray',
	error: 'red',
	paused: 'yellow',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// BOX DRAWING CHARACTERS
// ═══════════════════════════════════════════════════════════════════════════

export const box = {
	// Double line (primary containers)
	double: {
		topLeft: '╔',
		topRight: '╗',
		bottomLeft: '╚',
		bottomRight: '╝',
		horizontal: '═',
		vertical: '║',
		teeRight: '╠',
		teeLeft: '╣',
		teeDown: '╦',
		teeUp: '╩',
		cross: '╬',
	},

	// Rounded (secondary containers)
	rounded: {
		topLeft: '╭',
		topRight: '╮',
		bottomLeft: '╰',
		bottomRight: '╯',
		horizontal: '─',
		vertical: '│',
	},

	// Single line
	single: {
		topLeft: '┌',
		topRight: '┐',
		bottomLeft: '└',
		bottomRight: '┘',
		horizontal: '─',
		vertical: '│',
		teeRight: '├',
		teeLeft: '┤',
		teeDown: '┬',
		teeUp: '┴',
		cross: '┼',
	},

	// Heavy/bold
	heavy: {
		topLeft: '┏',
		topRight: '┓',
		bottomLeft: '┗',
		bottomRight: '┛',
		horizontal: '━',
		vertical: '┃',
	},
} as const;

// Timeline connectors
export const timeline = {
	start: '┌',
	middle: '├',
	end: '└',
	line: '│',
	blank: ' ',
	arrow: '→',
	dot: '●',
	dotEmpty: '○',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// VISUAL INDICATORS
// ═══════════════════════════════════════════════════════════════════════════

// Status badges (ASCII-safe for terminal compatibility)
export const badges = {
	live: '[LIVE]',
	recording: '[REC]',
	paused: '[PAUSED]',
	stopped: '[STOPPED]',
	error: '[ERROR]',
	success: '[OK]',
} as const;

// Spinner frames for animations
export const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
export const dotsFrames = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

// Progress bar characters
export const progressBar = {
	filled: '█',
	empty: '░',
	half: '▓',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// STAT ICONS
// ═══════════════════════════════════════════════════════════════════════════

export const statIcons = {
	duration: '*',
	llm: '>',
	tools: '#',
	tokens: '+',
	errors: 'x',
	success: 'ok',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Get icon for event type
export function getEventIcon(type: EventType, ascii = false): string {
	return ascii ? eventIconsAscii[type] ?? '?' : eventIcons[type] ?? '•';
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

// Format duration as compact string (for inline display)
export function formatDurationCompact(ms: number): string {
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}
	return `${(ms / 1000).toFixed(1)}s`;
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

// Create a visual duration bar
export function createDurationBar(
	ms: number,
	maxMs: number = 2000,
	width: number = 10,
): string {
	const ratio = Math.min(ms / maxMs, 1);
	const filled = Math.round(ratio * width);
	const empty = width - filled;
	return progressBar.filled.repeat(filled) + progressBar.empty.repeat(empty);
}

// Create a percentage bar
export function createPercentBar(percent: number, width: number = 10): string {
	const ratio = Math.min(percent / 100, 1);
	const filled = Math.round(ratio * width);
	const empty = width - filled;
	return progressBar.filled.repeat(filled) + progressBar.empty.repeat(empty);
}

// Truncate string with ellipsis
export function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) {
		return str;
	}

	return str.slice(0, maxLength - 1) + '…';
}

// Pad string to fixed width
export function padEnd(str: string, width: number): string {
	if (str.length >= width) {
		return str.slice(0, width);
	}

	return str + ' '.repeat(width - str.length);
}

// Pad string to fixed width (start)
export function padStart(str: string, width: number): string {
	if (str.length >= width) {
		return str.slice(0, width);
	}

	return ' '.repeat(width - str.length) + str;
}

// Create a horizontal rule
export function horizontalRule(width: number, char: string = '─'): string {
	return char.repeat(width);
}

// Format a key binding for display (e.g., "[Enter]")
export function formatKey(key: string): string {
	return `[${key}]`;
}

// Get the appropriate timeline connector for a position
export function getTimelineConnector(
	index: number,
	total: number,
	isSelected: boolean = false,
): string {
	if (total === 1) {
		return isSelected ? '●' : '○';
	}

	if (index === 0) {
		return timeline.start;
	}

	if (index === total - 1) {
		return timeline.end;
	}

	return timeline.middle;
}
