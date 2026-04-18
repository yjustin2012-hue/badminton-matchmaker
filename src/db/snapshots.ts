/**
 * Snapshot persistence layer
 * CRUD operations for ranking snapshots in IndexedDB
 */

import { db } from './schema';
import * as Types from '../types';

/**
 * Add a new snapshot
 */
export async function addSnapshot(snapshot: Types.Snapshot): Promise<string> {
  return db.snapshots.add(snapshot);
}

/**
 * Get a snapshot by ID
 */
export async function getSnapshot(id: string): Promise<Types.Snapshot | undefined> {
  return db.snapshots.get(id);
}

/**
 * Get all snapshots
 */
export async function getAllSnapshots(): Promise<Types.Snapshot[]> {
  return db.snapshots.orderBy('createdAt').reverse().toArray();
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(id: string): Promise<void> {
  await db.snapshots.delete(id);
}

/**
 * Delete all snapshots (for full reset)
 */
export async function deleteAllSnapshots(): Promise<void> {
  await db.snapshots.clear();
}

/**
 * Update snapshot name
 */
export async function updateSnapshotName(id: string, name: string): Promise<number> {
  return db.snapshots.update(id, { name });
}

/**
 * Get recently-seen unique player names across snapshots, presets (rosters), and
 * the current active players list — ordered most-recently-seen first.
 * Returns up to `limit` unique names.
 */
export async function getRecentPlayerNames(limit: number): Promise<string[]> {
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (name: string) => {
    const key = name.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(name.trim());
    }
  };

  // 1. Snapshots (ranked history) — most recent first
  const snapshots = await db.snapshots.orderBy('createdAt').reverse().toArray();
  for (const snap of snapshots) {
    for (const r of snap.rankings) add(r.playerName);
    if (result.length >= limit) return result.slice(0, limit);
  }

  // 2. Presets / rosters — most recently updated first
  const presets = await db.presets.orderBy('updatedAt').reverse().toArray();
  for (const preset of presets) {
    for (const p of preset.players) add(p.name);
    if (result.length >= limit) return result.slice(0, limit);
  }

  // 3. Current active players table
  const players = await db.players.toArray();
  for (const p of players) add(p.name);

  return result.slice(0, limit);
}
