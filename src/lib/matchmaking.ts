/**
 * Matchmaking algorithm implementation
 * Core fairness logic for generating 2v2 doubles matches
 *
 * Primary rule: Balance matches played across players
 * Secondary rule: Soft penalty for repeated teammate/opponent combinations
 */

import * as Types from '../types';
import { generateUUID } from './uuid';

interface MatchmakingOptions {
  balanceTeamsByRankScore?: boolean;
}

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
 * Select 4 eligible players for a match
 * Prioritizes fairness (fewer matches played)
 * Honours pair preferences by bumping preferred partners into the selected group
 */
export function selectPlayersForMatch(
  eligiblePlayers: Types.Player[]
): Types.Player[] | null {
  // Need at least 4 players
  if (eligiblePlayers.length < 4) {
    return null;
  }

  // Shuffle first so players with equal fairness scores get a fair chance.
  const sorted = shuffleArray([...eligiblePlayers]).sort((a, b) =>
    getFairnessScore(a, [], eligiblePlayers) - getFairnessScore(b, [], eligiblePlayers)
  );

  // Start with the top 4 most-deserving players
  const selected = sorted.slice(0, 4);
  const bench = sorted.slice(4);

  // Pair-preference bump: if a selected player's preferred partner is on the
  // bench, swap that partner in by replacing the least-deserving selected
  // player who isn't already part of a satisfied pair.
  const honored = new Set<string>();
  // First pass: mark preferences already satisfied within the initial top-4
  for (const p of selected) {
    if (p.preferredPartnerId && selected.some((s) => s.id === p.preferredPartnerId)) {
      honored.add(p.id);
      honored.add(p.preferredPartnerId);
    }
  }
  // Second pass: try to satisfy unsatisfied preferences by pulling from bench
  for (let i = 0; i < selected.length; i++) {
    const player = selected[i];
    if (!player.preferredPartnerId) continue;
    if (honored.has(player.id)) continue; // pair already honored

    const benchIdx = bench.findIndex((p) => p.id === player.preferredPartnerId);
    if (benchIdx === -1) continue; // preferred partner not in eligible pool at all

    // Find the best candidate to swap out: last (least deserving) selected player
    // who is not this player and not already part of a honored pair
    let swapOutIdx = -1;
    for (let j = selected.length - 1; j >= 0; j--) {
      if (selected[j].id === player.id) continue;
      if (honored.has(selected[j].id)) continue;
      swapOutIdx = j;
      break;
    }

    if (swapOutIdx !== -1) {
      const [partner] = bench.splice(benchIdx, 1);
      bench.push(selected[swapOutIdx]);
      selected[swapOutIdx] = partner;
      honored.add(player.id);
      honored.add(partner.id);
    }
  }

  if (selected.length !== 4) return null;
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
 * Score a proposed team split by how many pair preferences are satisfied.
 */
function scorePairPreferences(teamA: Types.Player[], teamB: Types.Player[]): number {
  let score = 0;
  for (const team of [teamA, teamB]) {
    if (team[0].preferredPartnerId && team[0].preferredPartnerId === team[1].id) score++;
    if (team[1].preferredPartnerId && team[1].preferredPartnerId === team[0].id) score++;
  }
  return score;
}

/**
 * Count do-not-pair violations in a proposed team split.
 * Returns the number of (player, teammate) pairs where player has teammate in doNotPairWithIds.
 */
function countDoNotPairViolations(teamA: Types.Player[], teamB: Types.Player[]): number {
  let violations = 0;
  for (const team of [teamA, teamB]) {
    const [p0, p1] = team;
    if (p0.doNotPairWithIds?.includes(p1.id)) violations++;
    if (p1.doNotPairWithIds?.includes(p0.id)) violations++;
  }
  return violations;
}

function getRankScoreDifference(teamA: Types.Player[], teamB: Types.Player[]): number {
  const teamAScore = teamA.reduce((sum, player) => sum + (player.rankScore ?? 0), 0);
  const teamBScore = teamB.reduce((sum, player) => sum + (player.rankScore ?? 0), 0);
  return Math.abs(teamAScore - teamBScore);
}

/**
 * Create a match from selected players.
 * Tries all 3 possible team splits and picks the one that best satisfies
 * pair preferences. Ties are broken randomly for variety.
 */
export function createMatchFromPlayers(
  players: Types.Player[],
  options: MatchmakingOptions = {}
): Types.Match {
  if (players.length !== 4) {
    throw new Error('Must have exactly 4 players to create a match');
  }

  // Shuffle players so base ordering is random
  const s = shuffleArray([...players]);

  // All 3 ways to split 4 players into 2 teams of 2
  const splits: [Types.Player[], Types.Player[]][] = [
    [[s[0], s[1]], [s[2], s[3]]],
    [[s[0], s[2]], [s[1], s[3]]],
    [[s[0], s[3]], [s[1], s[2]]],
  ];

  // Pick the split that satisfies the most pair preferences.
  // Among splits with equal preferences, prefer fewest do-not-pair violations.
  // shuffleArray on splits ensures random tiebreaking.
  const shuffledSplits = shuffleArray(splits);
  const [bestTeamA, bestTeamB] = shuffledSplits.reduce((best, curr) => {
    const bestViols = countDoNotPairViolations(best[0], best[1]);
    const currViols = countDoNotPairViolations(curr[0], curr[1]);
    if (currViols !== bestViols) return currViols < bestViols ? curr : best;

    const bestPref = scorePairPreferences(best[0], best[1]);
    const currPref = scorePairPreferences(curr[0], curr[1]);
    if (currPref !== bestPref) return currPref > bestPref ? curr : best;

    if (options.balanceTeamsByRankScore) {
      const bestDiff = getRankScoreDifference(best[0], best[1]);
      const currDiff = getRankScoreDifference(curr[0], curr[1]);
      if (currDiff !== bestDiff) return currDiff < bestDiff ? curr : best;
    }

    return best;
  });

  const teamA: Types.Match['teamA'] = {
    playerIds: [bestTeamA[0].id, bestTeamA[1].id] as [string, string],
  };

  const teamB: Types.Match['teamB'] = {
    playerIds: [bestTeamB[0].id, bestTeamB[1].id] as [string, string],
  };

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
  eligiblePlayers: Types.Player[],
  options: MatchmakingOptions = {}
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
  const match = createMatchFromPlayers(selected, options);

  return { match };
}
