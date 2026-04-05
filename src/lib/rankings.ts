/**
 * Rankings calculation logic
 * Derives ranking statistics from player data
 */

import * as Types from '../types';

/**
 * Calculate win percentage for a player
 */
function calculateWinPercentage(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return (wins / total) * 100;
}

/**
 * Check if a player has low sample size for their ranking
 * (too few matches to make confident ranking assessment)
 */
function isLowSample(matchesPlayed: number, threshold: number): boolean {
  return matchesPlayed < threshold;
}

/**
 * Calculate "due-up" status for fairness indicator
 * Player is due-up if they've played significantly fewer matches than average
 */
function calculateDueUpStatus(
  player: Types.Player,
  averageMatches: number,
  threshold: number
): boolean {
  return player.matchesPlayed <= averageMatches - threshold;
}

/**
 * Generate ranking display from player data
 */
export function calculateRankings(
  players: Types.Player[],
  config: { minMatchesThreshold: number; dueUpThreshold: number }
): Types.Ranking[] {
  // Calculate average
  const avgMatches =
    players.length > 0
      ? players.reduce((sum, p) => sum + p.matchesPlayed, 0) / players.length
      : 0;

  // Create rankings
  const rankings: Types.Ranking[] = players.map((player) => ({
    playerId: player.id,
    playerName: player.name,
    matchesPlayed: player.matchesPlayed,
    wins: player.wins,
    losses: player.losses,
    winPercentage: calculateWinPercentage(player.wins, player.losses),
    available: player.available,
    dueUp: calculateDueUpStatus(player, avgMatches, config.dueUpThreshold),
    lastPlayedAt: player.lastPlayedTime,
  }));

  // Sort by win percentage (desc), then matches played (desc), then name
  rankings.sort((a, b) => {
    // First: higher win percentage
    if (a.winPercentage !== b.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }

    // Second: more matches played (more valid ranking)
    if (a.matchesPlayed !== b.matchesPlayed) {
      return b.matchesPlayed - a.matchesPlayed;
    }

    // Third: alphabetically by name
    return a.playerName.localeCompare(b.playerName);
  });

  return rankings;
}

/**
 * Get ranking for a specific player
 */
export function getPlayerRanking(
  playerId: string,
  rankings: Types.Ranking[]
): Types.Ranking | undefined {
  return rankings.find((r) => r.playerId === playerId);
}

/**
 * Get top N players by ranking
 */
export function getTopPlayers(rankings: Types.Ranking[], count: number): Types.Ranking[] {
  return rankings.slice(0, count);
}

/**
 * Get all "due-up" players (fairness indicator)
 */
export function getDueUpPlayers(rankings: Types.Ranking[]): Types.Ranking[] {
  return rankings.filter((r) => r.dueUp && r.available);
}

/**
 * Get high sample size players (for reliable ranking display)
 */
export function getHighSampleRankings(
  rankings: Types.Ranking[],
  minSampleSize: number
): Types.Ranking[] {
  return rankings.filter((r) => r.matchesPlayed >= minSampleSize);
}

/**
 * Get low sample size players (for annotation in rankings)
 */
export function getLowSampleRankings(
  rankings: Types.Ranking[],
  minSampleSize: number
): Types.Ranking[] {
  return rankings.filter((r) => r.matchesPlayed < minSampleSize);
}

/**
 * Calculate win/loss distribution for statistics display
 */
export function calculateWinLossDistribution(rankings: Types.Ranking[]) {
  return rankings.map((r) => ({
    playerName: r.playerName,
    wins: r.wins,
    losses: r.losses,
    total: r.wins + r.losses,
  }));
}
