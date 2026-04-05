/**
 * Settings persistence layer
 * CRUD operations for app settings in IndexedDB
 */

import { db } from './schema';
import * as Types from '../types';

/**
 * Get the default settings (should always exist after init)
 */
export async function getSettings(): Promise<Types.Settings> {
  const settings = await db.settings.get('default');

  if (!settings) {
    throw new Error('Settings not initialized. Call initializeDatabase() first.');
  }

  return settings;
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
