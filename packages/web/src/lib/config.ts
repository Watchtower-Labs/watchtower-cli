import {homedir} from 'node:os';
import {join, resolve, sep} from 'node:path';

export function getTracesDir(): string {
  const envDir = process.env['WATCHTOWER_TRACE_DIR'];
  if (envDir) {
    const resolvedDir = resolve(envDir);
    const homeDir = homedir();
    // Require the trace directory to be within the user's home directory
    if (!resolvedDir.startsWith(homeDir + sep) && resolvedDir !== homeDir) {
      console.warn(`WATCHTOWER_TRACE_DIR "${envDir}" is outside the home directory. Using default.`);
      return join(homeDir, '.watchtower', 'traces');
    }
    return resolvedDir;
  }
  return join(homedir(), '.watchtower', 'traces');
}
