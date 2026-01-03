#!/usr/bin/env node
/**
 * Watchtower CLI - Terminal UI for viewing ADK agent traces
 */

import React from 'react';
import {render} from 'ink';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {ShowCommand} from './commands/show.js';
import {TailCommand} from './commands/tail.js';
import {ListCommand} from './commands/list.js';
import {ConfigCommand} from './commands/config.js';

// Parse arguments and render appropriate command
void yargs(hideBin(process.argv))
	.scriptName('watchtower')
	.usage('$0 <command> [options]')
	.command(
		'show [trace]',
		'View a saved trace file',
		(yargs) =>
			yargs.positional('trace', {
				describe: 'Trace ID, file path, or "last"',
				type: 'string',
				default: 'last',
			}),
		(argv) => {
			render(<ShowCommand trace={argv.trace} />);
		},
	)
	.command(
		'tail <script..>',
		'Run a script and stream events live',
		(yargs) =>
			yargs.positional('script', {
				describe: 'Command and arguments to run',
				type: 'string',
				array: true,
				demandOption: true,
			}),
		(argv) => {
			render(<TailCommand script={argv.script as string[]} />);
		},
	)
	.command(
		'list',
		'List recent traces',
		(yargs) =>
			yargs
				.option('limit', {
					alias: 'n',
					type: 'number',
					description: 'Number of traces to show',
					default: 10,
				})
				.option('since', {
					type: 'string',
					description: 'Only show traces since date (YYYY-MM-DD)',
				}),
		(argv) => {
			render(<ListCommand limit={argv.limit} since={argv.since} />);
		},
	)
	.command(
		'config [action] [key] [value]',
		'Manage CLI configuration',
		(yargs) =>
			yargs
				.positional('action', {
					describe: 'Action: show, init, or set',
					type: 'string',
					default: 'show',
				})
				.positional('key', {
					describe: 'Config key (for set action)',
					type: 'string',
				})
				.positional('value', {
					describe: 'Config value (for set action)',
					type: 'string',
				})
				.example('$0 config', 'Show current configuration')
				.example('$0 config init', 'Create default config file')
				.example('$0 config set theme dark', 'Set theme to dark'),
		(argv) => {
			render(
				<ConfigCommand
					action={argv.action as 'show' | 'init' | 'set'}
					key={argv.key}
					value={argv.value}
				/>,
			);
		},
	)
	.demandCommand(1, 'You need to specify a command')
	.help()
	.alias('help', 'h')
	.version()
	.alias('version', 'v')
	.example('$0 show last', 'View the most recent trace')
	.example('$0 show abc123', 'View trace with run ID abc123')
	.example('$0 tail python agent.py', 'Run agent and stream events')
	.example('$0 list -n 20', 'List 20 most recent traces')
	.strict()
	.parse();
