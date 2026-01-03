/**
 * Configuration file support for Watchtower CLI
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type {CliConfig} from './types.js';
import {defaultConfig} from './types.js';

// Config file locations
const CONFIG_DIR = '.watchtower';
const CONFIG_FILE = 'cli.yaml';

/**
 * Get the configuration directory path
 */
export function getConfigDir(): string {
	const envDir = process.env['WATCHTOWER_CONFIG_DIR'];
	if (envDir) {
		return path.resolve(envDir);
	}

	return path.join(os.homedir(), CONFIG_DIR);
}

/**
 * Get the configuration file path
 */
export function getConfigPath(): string {
	return path.join(getConfigDir(), CONFIG_FILE);
}

/**
 * Ensure the configuration directory exists
 */
export function ensureConfigDir(): string {
	const configDir = getConfigDir();
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, {recursive: true, mode: 0o700});
	}

	return configDir;
}

/**
 * Parse a simple YAML config file
 * Supports basic key: value format without nested objects
 */
function parseSimpleYaml(content: string): Record<string, string | number | boolean> {
	const result: Record<string, string | number | boolean> = {};
	const lines = content.split('\n');

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip empty lines and comments
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		// Parse key: value
		const colonIndex = trimmed.indexOf(':');
		if (colonIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, colonIndex).trim();
		let value: string | number | boolean = trimmed.slice(colonIndex + 1).trim();

		// Remove quotes if present
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		// Parse booleans
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		// Parse numbers
		else if (!isNaN(Number(value)) && value !== '') {
			value = Number(value);
		}

		result[key] = value;
	}

	return result;
}

/**
 * Load configuration from file
 */
export function loadConfig(): CliConfig {
	const configPath = getConfigPath();

	// Return defaults if no config file
	if (!fs.existsSync(configPath)) {
		return {...defaultConfig};
	}

	try {
		const content = fs.readFileSync(configPath, 'utf-8');
		const parsed = parseSimpleYaml(content);

		// Merge with defaults
		const config: CliConfig = {...defaultConfig};

		if (parsed['theme'] && isValidTheme(parsed['theme'])) {
			config.theme = parsed['theme'] as CliConfig['theme'];
		}

		if (typeof parsed['maxEvents'] === 'number') {
			config.maxEvents = parsed['maxEvents'];
		}

		if (parsed['timestampFormat'] && isValidTimestampFormat(parsed['timestampFormat'])) {
			config.timestampFormat = parsed['timestampFormat'] as CliConfig['timestampFormat'];
		}

		if (typeof parsed['defaultPython'] === 'string') {
			config.defaultPython = parsed['defaultPython'];
		}

		return config;
	} catch {
		// Return defaults on error
		return {...defaultConfig};
	}
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Partial<CliConfig>): void {
	ensureConfigDir();
	const configPath = getConfigPath();

	// Merge with existing config
	const existing = loadConfig();
	const merged = {...existing, ...config};

	// Generate YAML content
	const lines = [
		'# Watchtower CLI Configuration',
		'# See: https://github.com/anthropics/watchtower-cli',
		'',
		`theme: ${merged.theme}`,
		`maxEvents: ${merged.maxEvents}`,
		`timestampFormat: ${merged.timestampFormat}`,
		`defaultPython: ${merged.defaultPython}`,
		'',
	];

	fs.writeFileSync(configPath, lines.join('\n'), {mode: 0o600});
}

/**
 * Create default configuration file if it doesn't exist
 */
export function initConfig(): boolean {
	const configPath = getConfigPath();

	if (fs.existsSync(configPath)) {
		return false; // Already exists
	}

	saveConfig(defaultConfig);
	return true;
}

// Type guards
function isValidTheme(value: unknown): value is CliConfig['theme'] {
	return value === 'dark' || value === 'light' || value === 'minimal';
}

function isValidTimestampFormat(value: unknown): value is CliConfig['timestampFormat'] {
	return value === 'relative' || value === 'absolute' || value === 'unix';
}

// Export a singleton config instance
let cachedConfig: CliConfig | null = null;

export function getConfig(): CliConfig {
	if (!cachedConfig) {
		cachedConfig = loadConfig();
	}

	return cachedConfig;
}

export function resetConfigCache(): void {
	cachedConfig = null;
}
