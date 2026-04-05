/**
 * Preset persistence layer
 * CRUD operations for presets (saved player rosters) in IndexedDB
 */

import { db } from './schema';
import * as Types from '../types';

/**
 * Add a new preset
 */
export async function addPreset(preset: Types.Preset): Promise<string> {
  return db.presets.add(preset);
}

/**
 * Get a preset by ID
 */
export async function getPreset(id: string): Promise<Types.Preset | undefined> {
  return db.presets.get(id);
}

/**
 * Get all presets, ordered by most recent
 */
export async function getAllPresets(): Promise<Types.Preset[]> {
  return db.presets.orderBy('updatedAt').reverse().toArray();
}

/**
 * Update a preset
 */
export async function updatePreset(
  id: string,
  updates: Partial<Types.Preset>
): Promise<number> {
  return db.presets.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
}

/**
 * Delete a preset
 */
export async function deletePreset(id: string): Promise<void> {
  await db.presets.delete(id);
}

/**
 * Delete all presets (for full reset)
 */
export async function deleteAllPresets(): Promise<void> {
  await db.presets.clear();
}
