/**
 * Config command - Manage CLI configuration
 */

import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {Header} from '../components/Header.js';
import {StatusBar} from '../components/StatusBar.js';
import {useKeyboard} from '../hooks/useKeyboard.js';
import {
	getConfigPath,
	loadConfig,
	saveConfig,
	initConfig,
} from '../lib/config.js';
import type {CliConfig} from '../lib/types.js';

export interface ConfigCommandProps {
	action?: 'show' | 'init' | 'set';
	key?: string;
	value?: string;
}

export function ConfigCommand({
	action = 'show',
	key,
	value,
}: ConfigCommandProps): React.ReactElement {
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [config, setConfig] = useState<CliConfig | null>(null);

	useKeyboard({});

	useEffect(() => {
		try {
			switch (action) {
				case 'init': {
					const created = initConfig();
					if (created) {
						setMessage(`Configuration file created at ${getConfigPath()}`);
					} else {
						setMessage(`Configuration file already exists at ${getConfigPath()}`);
					}

					setConfig(loadConfig());
					break;
				}

				case 'set': {
					if (!key) {
						setError('Missing key. Usage: watchtower config set <key> <value>');
						break;
					}

					if (value === undefined) {
						setError('Missing value. Usage: watchtower config set <key> <value>');
						break;
					}

					const current = loadConfig();
					const updates: Partial<CliConfig> = {};

					switch (key) {
						case 'theme': {
							if (value !== 'dark' && value !== 'light' && value !== 'minimal') {
								setError('Invalid theme. Must be: dark, light, or minimal');
								return;
							}

							updates.theme = value;
							break;
						}

						case 'maxEvents': {
							const num = parseInt(value, 10);
							if (isNaN(num) || num < 1) {
								setError('Invalid maxEvents. Must be a positive number');
								return;
							}

							updates.maxEvents = num;
							break;
						}

						case 'timestampFormat': {
							if (value !== 'relative' && value !== 'absolute' && value !== 'unix') {
								setError('Invalid timestampFormat. Must be: relative, absolute, or unix');
								return;
							}

							updates.timestampFormat = value;
							break;
						}

						case 'defaultPython': {
							updates.defaultPython = value;
							break;
						}

						default: {
							setError(`Unknown config key: ${key}`);
							return;
						}
					}

					saveConfig(updates);
					setMessage(`Set ${key} = ${value}`);
					setConfig({...current, ...updates});
					break;
				}

				case 'show':
				default: {
					setConfig(loadConfig());
					break;
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error');
		}
	}, [action, key, value]);

	// Error state
	if (error) {
		return (
			<Box flexDirection="column">
				<Header runId="config" />
				<Box
					borderStyle="single"
					borderColor="red"
					paddingX={1}
					flexDirection="column"
				>
					<Text color="red" bold>
						Error
					</Text>
					<Text>{error}</Text>
				</Box>
				<StatusBar keys={['q: Quit']} />
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Header runId="config" />

			{message && (
				<Box paddingX={1} marginBottom={1}>
					<Text color="green">{message}</Text>
				</Box>
			)}

			{config && (
				<Box
					borderStyle="single"
					borderColor="gray"
					paddingX={1}
					flexDirection="column"
				>
					<Text bold>Configuration</Text>
					<Text dimColor>Path: {getConfigPath()}</Text>
					<Box marginTop={1} flexDirection="column">
						<Text>
							theme: <Text bold>{config.theme}</Text>
						</Text>
						<Text>
							maxEvents: <Text bold>{config.maxEvents}</Text>
						</Text>
						<Text>
							timestampFormat: <Text bold>{config.timestampFormat}</Text>
						</Text>
						<Text>
							defaultPython: <Text bold>{config.defaultPython}</Text>
						</Text>
					</Box>
				</Box>
			)}

			<StatusBar keys={['q: Quit']} />
		</Box>
	);
}

export default ConfigCommand;
