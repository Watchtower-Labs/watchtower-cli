import {homedir} from 'node:os';
import {join} from 'node:path';

export function getTracesDir(): string {
  return process.env['WATCHTOWER_TRACE_DIR'] ?? join(homedir(), '.watchtower', 'traces');
}
