/**
 * Settings persistence layer
 * CRUD operations for app settings in IndexedDB
 */

import { buildDefaultSettings, db } from './schema';
import * as Types from '../types';

/**
 * Get the default settings (should always exist after init)
 */
export async function getSettings(): Promise<Types.Settings> {
  const settings = await db.settings.get('default');

  if (!settings) {
    throw new Error('Settings not initialized. Call initializeDatabase() first.');
  }

  const defaults = buildDefaultSettings(settings.createdAt ?? Date.now());
  const normalized: Types.Settings = {
    ...defaults,
    ...settings,
    courtNames: settings.courtNames ?? defaults.courtNames,
    createdAt: settings.createdAt ?? defaults.createdAt,
  };

  const missingKeys = Object.entries(defaults).some(([key, value]) => {
    if (!(key in settings)) return true;
    if (settings[key as keyof Types.Settings] === undefined && value !== undefined) return true;
    return false;
  });

  if (missingKeys) {
    await db.settings.put(normalized);
  }

  return normalized;
}

/**
 * Update settings
 */
export async function updateSettings(
  updates: Partial<Omit<Types.Settings, 'id'>>
): Promise<number> {
  return db.settings.update('default', {
    ...updates,
    updatedAt: Date.now(),
  });
}

/**
 * Update language
 */
export async function setLanguage(language: Types.Language): Promise<number> {
  return updateSettings({ language });
}

/**
 * Get current language
 */
export async function getLanguage(): Promise<Types.Language> {
  const settings = await getSettings();
  return settings.language;
}

/**
 * Update auth requirement
 */
export async function setAuthRequirement(required: boolean): Promise<number> {
  return updateSettings({ requireAuthForPastEdits: required });
}

/**
 * Set admin passcode hash
 */
export async function setAdminPasscode(hash: string): Promise<number> {
  return updateSettings({ adminPasscodeHash: hash });
}

/**
 * Check if auth is required for past edits
 */
export async function isAuthRequired(): Promise<boolean> {
  const settings = await getSettings();
  return settings.requireAuthForPastEdits;
}

/**
 * Get admin passcode hash
 */
export async function getAdminPasscodeHash(): Promise<string | undefined> {
  const settings = await getSettings();
  return settings.adminPasscodeHash;
}

/**
 * Update due-up threshold
 */
export async function setDueUpThreshold(threshold: number): Promise<number> {
  return updateSettings({ duUpBelowAverageThreshold: threshold });
}

/**
 * Wipe all app data — clears every table and removes settings.
 * After calling this, reload the page to re-initialize defaults.
 */
export async function wipeAllData(): Promise<void> {
  await Promise.all([
    db.players.clear(),
    db.matches.clear(),
    db.snapshots.clear(),
    db.presets.clear(),
    db.courtLayouts.clear(),
    db.settings.clear(),
  ]);
}

/**
 * Reset all settings to their defaults, preserving language, auth config, and passcode.
 */
export async function resetSettingsToDefault(): Promise<void> {
  const current = await getSettings();
  const defaults = buildDefaultSettings(current.createdAt ?? Date.now());
  await db.settings.update('default', {
    ...defaults,
    id: 'default',
    language: current.language,
    requireAuthForPastEdits: current.requireAuthForPastEdits,
    adminPasscodeHash: current.adminPasscodeHash,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  });
}
