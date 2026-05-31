/**
 * Dropdown ID map cache with 24-hour TTL.
 *
 * Caches the mapping of display-text → numeric API ID for year/shift/class
 * dropdowns so repeated runs don't need live browser discovery.
 *
 * Cache key format:
 *   - Years:  "years"
 *   - Shifts: "shifts:<yearId>"
 *   - Classes: "classes:<yearId>:<shiftId>"
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { log } from '../utils/logger';

const CACHE_FILE = path.join(__dirname, '../../user-data/dropdown_cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  map: Record<string, string>;
  timestamp: number;
}

interface CacheStore {
  [key: string]: CacheEntry;
}

function readCache(): CacheStore {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeCache(store: CacheStore): void {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
  } catch (err) {
    log.warn(`Failed to write dropdown cache: ${(err as Error).message}`);
  }
}

/**
 * Get a cached dropdown ID map, or null if missing/expired.
 */
export function getCachedIdMap(key: string): Map<string, string> | null {
  if (process.env.NO_CACHE === 'true') return null;

  const store = readCache();
  const entry = store[key];
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    log.info(`Dropdown cache expired for "${key}" (${Math.round(age / 3600000)}h old)`);
    return null;
  }

  log.info(`Using cached dropdown map for "${key}" (${Math.round(age / 60000)}min old)`);
  return new Map(Object.entries(entry.map));
}

/**
 * Store a dropdown ID map in the cache.
 */
export function setCachedIdMap(key: string, idMap: Map<string, string>): void {
  if (process.env.NO_CACHE === 'true') return;

  const store = readCache();
  store[key] = {
    map: Object.fromEntries(idMap),
    timestamp: Date.now(),
  };
  writeCache(store);
}

/**
 * Build a cache key for class dropdowns (shift-dependent).
 */
export function classCacheKey(yearId: string, shiftId: string): string {
  return `classes:${yearId}:${shiftId}`;
}

/**
 * Build a cache key for shift dropdowns.
 */
export function shiftCacheKey(yearId: string): string {
  return `shifts:${yearId}`;
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      log.info('Dropdown cache cleared');
    }
  } catch (err) {
    log.warn(`Failed to clear dropdown cache: ${(err as Error).message}`);
  }
}
