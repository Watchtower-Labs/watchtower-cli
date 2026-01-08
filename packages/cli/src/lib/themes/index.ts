/**
 * Theme definitions for Watchtower CLI
 *
 * Each theme provides a consistent color palette for the CLI.
 * The theme is selected via the 'theme' config option.
 */

import type {EventType} from '../types.js';

// Theme interface
export interface Theme {
	name: 'dark' | 'light' | 'minimal';
	brand: {
		primary: string;
		secondary: string;
	};
	success: string;
	warning: string;
	error: string;
	info: string;
	text: {
		primary: string;
		secondary: string;
		muted: string;
	};
	border: {
		primary: string;
		secondary: string;
		muted: string;
	};
	eventColors: Record<EventType, string>;
	status: {
		starting: string;
		running: string;
		stopped: string;
		error: string;
		paused: string;
	};
}

// Dark theme (default)
export const darkTheme: Theme = {
	name: 'dark',
	brand: {
		primary: 'magenta',
		secondary: 'cyan',
	},
	success: 'green',
	warning: 'yellow',
	error: 'red',
	info: 'blue',
	text: {
		primary: 'white',
		secondary: 'gray',
		muted: 'gray',
	},
	border: {
		primary: 'magenta',
		secondary: 'gray',
		muted: 'gray',
	},
	eventColors: {
		'run.start': 'green',
		'run.end': 'blue',
		'llm.request': 'magenta',
		'llm.response': 'cyan',
		'tool.start': 'yellow',
		'tool.end': 'green',
		'tool.error': 'red',
		'state.change': 'cyan',
		'agent.transfer': 'magenta',
	},
	status: {
		starting: 'yellow',
		running: 'green',
		stopped: 'gray',
		error: 'red',
		paused: 'yellow',
	},
};

// Light theme
export const lightTheme: Theme = {
	name: 'light',
	brand: {
		primary: 'blue',
		secondary: 'cyan',
	},
	success: 'green',
	warning: 'yellow',
	error: 'red',
	info: 'blue',
	text: {
		primary: 'black',
		secondary: 'gray',
		muted: 'gray',
	},
	border: {
		primary: 'blue',
		secondary: 'gray',
		muted: 'gray',
	},
	eventColors: {
		'run.start': 'green',
		'run.end': 'blue',
		'llm.request': 'blue',
		'llm.response': 'cyan',
		'tool.start': 'yellow',
		'tool.end': 'green',
		'tool.error': 'red',
		'state.change': 'cyan',
		'agent.transfer': 'blue',
	},
	status: {
		starting: 'yellow',
		running: 'green',
		stopped: 'gray',
		error: 'red',
		paused: 'yellow',
	},
};

// Minimal theme (reduced colors)
export const minimalTheme: Theme = {
	name: 'minimal',
	brand: {
		primary: 'white',
		secondary: 'gray',
	},
	success: 'green',
	warning: 'yellow',
	error: 'red',
	info: 'white',
	text: {
		primary: 'white',
		secondary: 'gray',
		muted: 'gray',
	},
	border: {
		primary: 'gray',
		secondary: 'gray',
		muted: 'gray',
	},
	eventColors: {
		'run.start': 'white',
		'run.end': 'white',
		'llm.request': 'white',
		'llm.response': 'gray',
		'tool.start': 'white',
		'tool.end': 'gray',
		'tool.error': 'red',
		'state.change': 'gray',
		'agent.transfer': 'white',
	},
	status: {
		starting: 'yellow',
		running: 'green',
		stopped: 'gray',
		error: 'red',
		paused: 'yellow',
	},
};

// Get theme by name
export function getTheme(name: 'dark' | 'light' | 'minimal'): Theme {
	switch (name) {
		case 'light':
			return lightTheme;
		case 'minimal':
			return minimalTheme;
		default:
			return darkTheme;
	}
}

// Default theme
export const defaultTheme = darkTheme;
