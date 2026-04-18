/**
 * Database instance and initialization
 * Central export for accessing Dexie database
 */

export { db, initializeDatabase } from './schema';
export * from './players';
export * from './matches';
export * from './snapshots';
export * from './presets';
export * from './settings';
export * from './courtLayouts';
