/**
 * Ranking domain model
 * Represents live player rankings and fairness metrics
 */

export interface Ranking {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number; // 0-100, or 0 if no matches yet
  totalPointsScored: number; // Tiebreaker when win% is equal
  available: boolean;
  dueUp: boolean;
  lastPlayedAt?: number;
}

/**
 * Ranking sort option
 */
export type RankingSortBy = 'winPercentage' | 'matchesPlayed' | 'name';

/**
 * Due-up threshold configuration
 * Player is marked "due-up" if their matches played is <= (avg - threshold)
 */
export interface DueUpConfig {
  enabled: boolean;
  thresholdBelowAverage: number; // e.g., 2 matches below average
}
