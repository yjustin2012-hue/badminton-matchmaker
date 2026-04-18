/**
 * Court layout persistence layer
 * CRUD operations for court layouts in IndexedDB
 */

import { db } from './schema';
import * as Types from '../types';

export async function addCourtLayout(layout: Types.CourtLayout): Promise<string> {
  return db.courtLayouts.add(layout);
}

export async function getAllCourtLayouts(): Promise<Types.CourtLayout[]> {
  return db.courtLayouts.orderBy('createdAt').toArray();
}

export async function getCourtLayout(id: string): Promise<Types.CourtLayout | undefined> {
  return db.courtLayouts.get(id);
}

export async function updateCourtLayout(
  id: string,
  updates: Partial<Types.CourtLayout>
): Promise<number> {
  return db.courtLayouts.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteCourtLayout(id: string): Promise<void> {
  await db.courtLayouts.delete(id);
}
