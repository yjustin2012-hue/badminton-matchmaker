/**
 * Settings domain model
 * App-wide configuration and preferences
 */

export type Language = 'en' | 'zh-Hans' | 'zh-Hant';

export type AppTheme = 'light' | 'dark' | 'blue' | 'purple' | 'pink' | 'yellow';

export const THEME_OPTIONS: { value: AppTheme; labelKey: string }[] = [
  { value: 'light',  labelKey: 'settings.themeLight' },
  { value: 'dark',   labelKey: 'settings.themeDark' },
  { value: 'blue',   labelKey: 'settings.themeBlue' },
  { value: 'purple', labelKey: 'settings.themePurple' },
  { value: 'pink',   labelKey: 'settings.themePink' },
  { value: 'yellow', labelKey: 'settings.themeYellow' },
];

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
  balanceTeamsByRankScore: boolean; // When true, split selected players into more even teams by rankScore

  // Recent players quick-pick
  recentPlayersSuggestCount: number; // How many recent players to suggest when adding (default 30)

  // Match deletion behaviour
  confirmDeletePendingMatch: boolean; // When true, show a confirmation dialog before deleting a pending match

  // Court management
  courtViewEnabled: boolean; // Feature flag — show visual court assignments
  courtTimerEnabled: boolean; // Show a live elapsed timer for matches currently on court
  numberOfCourts: number; // How many physical courts are available (default 2)
  courtNames: string[]; // Custom names per court, length === numberOfCourts

  // Score shortcut buttons
  showScoreShortcuts: boolean; // Whether to show the pre-score shortcut buttons (default true)
  scoreShortcutMin: number; // Lower bound of shortcut range (default 15, 0–30)
  scoreShortcutMax: number; // Upper bound of shortcut range (default 25, 0–30)

  // Court auto-fill
  strictCourtAutoFill: boolean; // When true, queued matches only auto-fill their designated target court

  // Showdown scoring
  showdownWinBonus: number; // Points added to rankScore when the initiating team wins (default 3)
  showdownLossDeduction: number; // Points deducted from rankScore when the initiating team loses (default 1)

  // Anti-pair constraint feature
  doNotPairEnabled: boolean; // When true, show per-player do-not-pair buttons
  showPlayerScores: boolean; // When true, show each player's current rankScore in the player list

  // Display
  appTheme: AppTheme; // Color theme: light / dark / blue / purple / pink / yellow
  appFontSize: number; // Base font scale percentage, 80–150, default 100

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
