/**
 * Dexie IndexedDB schema definition
 * Defines the tables and indexes for the badminton app database
 */

import Dexie, { Table } from 'dexie';
import * as Types from '../types';

export class BadmintonDB extends Dexie {
  players!: Table<Types.Player>;
  matches!: Table<Types.Match>;
  snapshots!: Table<Types.Snapshot>;
  presets!: Table<Types.Preset>;
  settings!: Table<Types.Settings>;

  constructor() {
    super('BadmintonMatchmaker');

    this.version(1).stores({
      // Players table
      // Indexes: by id (primary), by name, by availability
      players: '&id, name, available',

      // Matches table
      // Indexes: by id (primary), by status, by createdAt
      matches: '&id, status, createdAt',

      // Snapshots table
      // Indexes: by id (primary), by createdAt
      snapshots: '&id, createdAt',

      // Presets table
      // Indexes: by id (primary), by name, by createdAt, by updatedAt
      presets: '&id, name, createdAt, updatedAt',

      // Settings table (only one record with id='default')
      // Indexes: by id (primary)
      settings: '&id',
    });
  }
}

export const db = new BadmintonDB();

/**
 * Initialize database with default settings if they don't exist
 * Call this on app startup
 */
export async function initializeDatabase() {
  try {
    const existingSettings = await db.settings.get('default');

    if (!existingSettings) {
      const defaultSettings: Types.Settings = {
        id: 'default',
        language: 'en',
        requireAuthForPastEdits: false,
        minMatchesThreshold: 1,
        duUpBelowAverageThreshold: 1,
        ignorePendingMatchesForGeneration: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.settings.add(defaultSettings);
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}
