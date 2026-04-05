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
