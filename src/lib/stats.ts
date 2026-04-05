/**
 * Player statistics update logic
 * Handles wins/losses calculations and session stat management
 */

import * as Types from '../types';

/**
 * Determine the winner of a match
 */
export function determineMatchWinner(
  teamAScore: number,
  teamBScore: number
): 'A' | 'B' {
  if (teamAScore === teamBScore) {
    throw new Error('Cannot determine winner: scores are tied');
  }

  return teamAScore > teamBScore ? 'A' : 'B';
}

/**
 * Get winner and loser player IDs from a match
 */
export function getWinnerAndLoserIds(
  match: Types.Match
): {
  winnerIds: string[];
  loserIds: string[];
} | null {
  if (
    match.status !== 'completed' ||
    match.teamAScore === undefined ||
    match.teamBScore === undefined
  ) {
    return null;
  }

  const winner = determineMatchWinner(match.teamAScore, match.teamBScore);

  const winnerIds =
    winner === 'A' ? [...match.teamA.playerIds] : [...match.teamB.playerIds];
  const loserIds =
    winner === 'A' ? [...match.teamB.playerIds] : [...match.teamA.playerIds];

  return { winnerIds, loserIds };
}

/**
 * Create a completed match record for display in history
 */
export function createCompletedMatchRecord(
  match: Types.Match,
  playerMap: Map<string, string> // id -> name
): Types.CompletedMatchRecord | null {
  if (
    match.status !== 'completed' ||
    match.teamAScore === undefined ||
    match.teamBScore === undefined ||
    match.completedAt === undefined
  ) {
    return null;
  }

  const winnerId = determineMatchWinner(match.teamAScore, match.teamBScore);

  return {
    id: match.id,
    teamA: {
      playerIds: match.teamA.playerIds,
      playerNames: [
        playerMap.get(match.teamA.playerIds[0]) || 'Unknown',
        playerMap.get(match.teamA.playerIds[1]) || 'Unknown',
      ] as [string, string],
    },
    teamB: {
      playerIds: match.teamB.playerIds,
      playerNames: [
        playerMap.get(match.teamB.playerIds[0]) || 'Unknown',
        playerMap.get(match.teamB.playerIds[1]) || 'Unknown',
      ] as [string, string],
    },
    teamAScore: match.teamAScore,
    teamBScore: match.teamBScore,
    winnerId,
    createdAt: match.createdAt,
    completedAt: match.completedAt,
  };
}

/**
 * Reverse match stats for undo functionality
 * Recalculates wins/losses as if match never happened
 */
export function reverseMatchStats(
  players: Types.Player[],
  match: Types.Match
): Map<string, Partial<Types.Player>> {
  const updates = new Map<string, Partial<Types.Player>>();

  if (
    match.status !== 'completed' ||
    match.teamAScore === undefined ||
    match.teamBScore === undefined
  ) {
    return updates;
  }

  const winnerAndLoser = getWinnerAndLoserIds(match);
  if (!winnerAndLoser) return updates;

  // Reverse winner stats
  for (const winnerId of winnerAndLoser.winnerIds) {
    const player = players.find((p) => p.id === winnerId);
    if (player) {
      updates.set(winnerId, {
        matchesPlayed: Math.max(0, player.matchesPlayed - 1),
        wins: Math.max(0, player.wins - 1),
      });
    }
  }

  // Reverse loser stats
  for (const loserId of winnerAndLoser.loserIds) {
    const player = players.find((p) => p.id === loserId);
    if (player) {
      updates.set(loserId, {
        matchesPlayed: Math.max(0, player.matchesPlayed - 1),
        losses: Math.max(0, player.losses - 1),
      });
    }
  }

  return updates;
}

/**
 * Create a display stats object from a player
 */
export function createPlayerStats(player: Types.Player): Types.PlayerStats {
  const total = player.wins + player.losses;
  const winPercentage = total > 0 ? (player.wins / total) * 100 : 0;

  return {
    id: player.id,
    name: player.name,
    available: player.available,
    matchesPlayed: player.matchesPlayed,
    wins: player.wins,
    losses: player.losses,
    winPercentage,
    lastPlayedTime: player.lastPlayedTime,
  };
}
