/**
 * Settings domain model
 * App-wide configuration and preferences
 */

export type Language = 'en' | 'zh-Hans' | 'zh-Hant';

export interface Settings {
  id: string; // Always 'default' as there's only one settings record
  language: Language;
  
  // Auth protection MVP: local passcode (base64 hash)
  requireAuthForPastEdits: boolean;
  adminPasscodeHash?: string; // base64 hash of passcode, not cryptographic
  
  // Fairness thresholds
  minMatchesThreshold: number; // For due-up indicator
  duUpBelowAverageThreshold: number; // e.g., 2 matches below average
  
  // Advanced match generation
  ignorePendingMatchesForGeneration: boolean; // Allow players in pending matches to be selected for new matches

  // Match deletion behaviour
  confirmDeletePendingMatch: boolean; // When true, show a confirmation dialog before deleting a pending match

  createdAt: number;
  updatedAt: number;
}

/**
 * Language options for UI dropdown
 */
export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-Hans', label: '简体中文' },
  { value: 'zh-Hant', label: '繁體中文' },
];
