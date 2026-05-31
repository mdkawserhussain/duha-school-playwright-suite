/**
 * Heartbeat — pings uptime monitoring services (Better Stack / Cronitor) on run start/end.
 *
 * Sends a simple GET/POST to a configurable heartbeat URL.
 * Never throws — all errors are caught and logged.
 */

import { log } from './logger';

/**
 * Pings the heartbeat URL.
 * @param phase 'start' or 'end'
 */
export async function pingHeartbeat(phase: 'start' | 'end'): Promise<void> {
  const url = process.env.HEARTBEAT_URL;
  if (!url) return;

  try {
    const separator = url.includes('?') ? '&' : '?';
    const pingUrl = `${url}${separator}phase=${phase}`;
    await fetch(pingUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
    log.info(`Heartbeat ping sent (${phase})`);
  } catch (err) {
    log.warn(`Heartbeat ping failed (${phase}): ${(err as Error).message}`);
  }
}
