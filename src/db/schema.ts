/**
 * Dexie IndexedDB schema definition
 * Defines the tables and indexes for the badminton app database
 */

import Dexie, { Table } from 'dexie';
import * as Types from '../types';

export function buildDefaultSettings(now = Date.now()): Types.Settings {
  return {
    id: 'default',
    language: 'zh-Hans',
    requireAuthForPastEdits: false,
    minMatchesThreshold: 1,
    duUpBelowAverageThreshold: 1,
    ignorePendingMatchesForGeneration: true,
    balanceTeamsByRankScore: false,
    confirmDeletePendingMatch: false,
    recentPlayersSuggestCount: 30,
    courtViewEnabled: true,
    courtTimerEnabled: false,
    numberOfCourts: 2,
    courtNames: [],
    showScoreShortcuts: true,
    scoreShortcutMin: 15,
    scoreShortcutMax: 25,
    strictCourtAutoFill: true,
    appTheme: 'light' as Types.AppTheme,
    doNotPairEnabled: false,
    appFontSize: 100,
    showdownWinBonus: 3,
    showdownLossDeduction: 1,
    showPlayerScores: false,
    createdAt: now,
    updatedAt: now,
  };
}

export class BadmintonDB extends Dexie {
  players!: Table<Types.Player, string>;
  matches!: Table<Types.Match, string>;
  snapshots!: Table<Types.Snapshot, string>;
  presets!: Table<Types.Preset, string>;
  settings!: Table<Types.Settings, string>;
  courtLayouts!: Table<Types.CourtLayout, string>;

  constructor() {
    super('BadmintonMatchmaker');

    this.version(1).stores({
      players: '&id, name, available',
      matches: '&id, status, createdAt',
      snapshots: '&id, createdAt',
      presets: '&id, name, createdAt, updatedAt',
      settings: '&id',
    });

    // v2: adds court layout table
    this.version(2).stores({
      courtLayouts: '&id, name, createdAt',
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
      await db.settings.add(buildDefaultSettings());
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}
