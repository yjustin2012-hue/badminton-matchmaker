/**
 * Player domain model
 * Represents a player in the badminton session
 */

export interface Player {
  id: string; // UUID v4
  name: string;
  available: boolean;

  // Session stats (reset on Start Over)
  matchesPlayed: number;
  wins: number;
  losses: number;
  totalPointsScored: number; // Cumulative points scored across all matches (tiebreaker)
  rankScore: number; // Ranking score: normal win=+1; showdown initiator win=×2, loss=-1

  // Pair preference: player this person wants to be teamed with
  preferredPartnerId?: string | null;

  // Anti-pair constraint: player IDs this player refuses to be teamed with
  doNotPairWithIds?: string[];

  // Display color (hex, e.g. '#fca5a5') — optional highlight on player card
  color?: string;

  // For fairness and repetition control
  recentMatchIds: string[]; // Last N match IDs for teammate/opponent analysis
  lastPlayedTime?: number; // Timestamp of last match

  createdAt: number;
  updatedAt: number;
}

/**
 * Derived player statistics for display
 * Calculated from session stats
 */
export interface PlayerStats {
  id: string;
  name: string;
  available: boolean;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number; // 0-100
  lastPlayedTime?: number;
}
