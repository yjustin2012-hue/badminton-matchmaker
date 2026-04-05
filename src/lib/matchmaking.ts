/**
 * Matchmaking algorithm implementation
 * Core fairness logic for generating 2v2 doubles matches
 *
 * Primary rule: Balance matches played across players
 * Secondary rule: Soft penalty for repeated teammate/opponent combinations
 */

import * as Types from '../types';
import { generateUUID } from './uuid';

/**
 * Calculate average matches played across all players
 */
function calculateAverageMatchesPlayed(players: Types.Player[]): number {
  if (players.length === 0) return 0;
  const total = players.reduce((sum, p) => sum + p.matchesPlayed, 0);
  return total / players.length;
}

/**
 * Get a fairness score for a player
 * Lower score = more deserving to play (fewer matches)
 * Takes into account:
 * 1. Matches played (primary)
 * 2. Recent teammate/opponent repetition (secondary, soft penalty)
 */
function getFairnessScore(
  player: Types.Player,
  otherSelectedPlayers: Types.Player[],
  allPlayers: Types.Player[]
): number {
  const avgMatches = calculateAverageMatchesPlayed(allPlayers);
  const belowAverage = avgMatches - player.matchesPlayed; // Positive = deserving more play

  // Primary score: inversely proportional to matches played
  let score = -belowAverage; // Lower score = more deserving

  // Secondary soft penalty: penalize if player recently played with any selected player
  for (const other of otherSelectedPlayers) {
    const recentlyPlayedTogether = (player.recentMatchIds || []).filter((matchId) =>
      (other.recentMatchIds || []).includes(matchId)
    );

    // Soft penalty: 0.1 per recent repetition (not hard constraint)
    score += recentlyPlayedTogether.length * 0.1;
  }

  return score;
}

/**
 * Check if two players have recently been teammates
 */
function haveRecentlyBeenTeammates(player1: Types.Player, player2: Types.Player): boolean {
  const recent1 = player1.recentMatchIds || [];
  const recent2 = player2.recentMatchIds || [];
  const commonMatches = recent1.filter((id) => recent2.includes(id));
  return commonMatches.length > 0;
}

/**
 * Select 4 eligible players for a match
 * Prioritizes fairness (fewer matches played)
 * Uses soft penalty for repetition control
 */
export function selectPlayersForMatch(
  eligiblePlayers: Types.Player[]
): Types.Player[] | null {
  // Need at least 4 players
  if (eligiblePlayers.length < 4) {
    return null;
  }

  // Sort by fairness score (lower = more deserving)
  const sortedByFairness = [...eligiblePlayers].sort((a, b) => {
    const scoreA = getFairnessScore(a, [], eligiblePlayers);
    const scoreB = getFairnessScore(b, [], eligiblePlayers);
    return scoreA - scoreB;
  });

  // Start with the player most deserving of play
  const selected: Types.Player[] = [sortedByFairness[0]];

  // Select 2nd player: prefer someone who hasn't recently played with player 1
  for (const candidate of sortedByFairness.slice(1)) {
    if (!haveRecentlyBeenTeammates(selected[0], candidate)) {
      selected.push(candidate);
      break;
    }
  }

  // If couldn't find non-teammate, just pick next most deserving
  if (selected.length === 1) {
    selected.push(sortedByFairness[1]);
  }

  // Select 3rd player: prefer someone who hasn't played with selected players
  for (const candidate of sortedByFairness.slice(1)) {
    if (selected.every((p) => p.id !== candidate.id)) {
      const recentlyPlayedWithAny = selected.some((p) =>
        haveRecentlyBeenTeammates(p, candidate)
      );
      if (!recentlyPlayedWithAny) {
        selected.push(candidate);
        break;
      }
    }
  }

  // If couldn't find non-repeated, pick next most deserving
  if (selected.length === 2) {
    for (const candidate of sortedByFairness.slice(1)) {
      if (selected.every((p) => p.id !== candidate.id)) {
        selected.push(candidate);
        break;
      }
    }
  }

  // Select 4th player: remaining
  for (const candidate of sortedByFairness) {
    if (selected.every((p) => p.id !== candidate.id)) {
      selected.push(candidate);
      break;
    }
  }

  // Should always have exactly 4 at this point
  if (selected.length !== 4) {
    return null;
  }

  return selected;
}

/**
 * Fisher-Yates shuffle for true randomization
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Create a match from selected players
 * Randomizes team assignment for variety (even with same 4 players)
 */
export function createMatchFromPlayers(players: Types.Player[]): Types.Match {
  if (players.length !== 4) {
    throw new Error('Must have exactly 4 players to create a match');
  }

  // Shuffle all 4 players randomly
  const shuffled = shuffleArray(players);

  // Debug: log the shuffled players
  console.log('Players before shuffle:', players.map(p => p.name));
  console.log('Players after shuffle:', shuffled.map(p => p.name));

  // Split into two teams: first 2 vs last 2
  const teamA: Types.Match['teamA'] = {
    playerIds: [shuffled[0].id, shuffled[1].id] as [string, string],
  };

  const teamB: Types.Match['teamB'] = {
    playerIds: [shuffled[2].id, shuffled[3].id] as [string, string],
  };

  console.log('Team A:', shuffled[0].name, shuffled[1].name);
  console.log('Team B:', shuffled[2].name, shuffled[3].name);

  const match: Types.Match = {
    id: generateUUID(),
    teamA,
    teamB,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return match;
}

/**
 * Generate a match with validation
 * Returns match or error reason
 */
export function generateMatch(
  eligiblePlayers: Types.Player[]
): { match: Types.Match; error?: undefined } | { match?: undefined; error: string } {
  // Check minimum players requirement
  if (eligiblePlayers.length < 4) {
    return {
      error: `Need at least 4 eligible players. Currently have ${eligiblePlayers.length}.`,
    };
  }

  // Select players using fairness algorithm
  const selected = selectPlayersForMatch(eligiblePlayers);

  if (!selected) {
    return {
      error: 'Failed to select players for match. Please try again.',
    };
  }

  // Create match from selected players
  const match = createMatchFromPlayers(selected);

  return { match };
}
