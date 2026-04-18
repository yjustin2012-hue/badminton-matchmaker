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

export function getPlayerTeamId(match: Types.Match, playerId: string): 'A' | 'B' | null {
  if (match.teamA.playerIds.includes(playerId)) return 'A';
  if (match.teamB.playerIds.includes(playerId)) return 'B';
  return null;
}

export function getPlayerScore(match: Types.Match, playerId: string): number {
  const teamId = getPlayerTeamId(match, playerId);
  if (!teamId) return 0;
  return teamId === 'A' ? match.teamAScore ?? 0 : match.teamBScore ?? 0;
}

export function getPlayerRankScoreDelta(
  match: Types.Match,
  playerId: string,
  settings: Pick<Types.Settings, 'showdownWinBonus' | 'showdownLossDeduction'>
): number {
  const result = getWinnerAndLoserIds(match);
  if (!result) return 0;

  const isWinner = result.winnerIds.includes(playerId);
  const teamId = getPlayerTeamId(match, playerId);
  if (!teamId) return 0;

  const isShowdown = match.isShowdown ?? false;
  const initiatedByPlayerTeam =
    isShowdown &&
    match.showdownInitiatorTeam != null &&
    match.showdownInitiatorTeam === teamId;

  if (isWinner) {
    return initiatedByPlayerTeam ? settings.showdownWinBonus : 1;
  }

  return initiatedByPlayerTeam ? -settings.showdownLossDeduction : 0;
}

export function applyCompletedMatchToPlayer(
  player: Types.Player,
  match: Types.Match,
  settings: Pick<Types.Settings, 'showdownWinBonus' | 'showdownLossDeduction'>
): Types.Player {
  const result = getWinnerAndLoserIds(match);
  if (!result) return player;
  const teamId = getPlayerTeamId(match, player.id);
  if (!teamId) return player;

  const won = result.winnerIds.includes(player.id);
  const pointsScored = getPlayerScore(match, player.id);

  return {
    ...player,
    matchesPlayed: player.matchesPlayed + 1,
    wins: won ? player.wins + 1 : player.wins,
    losses: won ? player.losses : player.losses + 1,
    rankScore: (player.rankScore ?? 0) + getPlayerRankScoreDelta(match, player.id, settings),
    totalPointsScored: (player.totalPointsScored ?? 0) + pointsScored,
    recentMatchIds: [...(player.recentMatchIds || []), match.id].slice(-20),
    lastPlayedTime: match.completedAt ?? player.lastPlayedTime,
    updatedAt: match.completedAt ?? Date.now(),
  };
}

export function calculatePlayerStatsFromMatches(
  player: Types.Player,
  matches: Types.Match[],
  settings: Pick<Types.Settings, 'showdownWinBonus' | 'showdownLossDeduction'>
): Types.Player {
  const relevantMatches = matches
    .filter(
      (match) =>
        match.teamA.playerIds.includes(player.id) || match.teamB.playerIds.includes(player.id)
    )
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));

  let nextPlayer: Types.Player = {
    ...player,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    rankScore: 0,
    totalPointsScored: 0,
    recentMatchIds: [],
    lastPlayedTime: undefined,
  };

  for (const match of relevantMatches) {
    nextPlayer = applyCompletedMatchToPlayer(nextPlayer, match, settings);
  }

  return nextPlayer;
}

export function getPlayerMatchHistory(
  playerId: string,
  matches: Types.Match[],
  players: Types.Player[]
): Types.PlayerMatchHistoryEntry[] {
  const playerMap = new Map(players.map((player) => [player.id, player]));

  return matches
    .filter(
      (match) =>
        match.status === 'completed' &&
        (match.teamA.playerIds.includes(playerId) || match.teamB.playerIds.includes(playerId))
    )
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .map((match) => {
      const playerTeamId = getPlayerTeamId(match, playerId);
      const teammateIds = (playerTeamId === 'A' ? match.teamA.playerIds : match.teamB.playerIds).filter(
        (id) => id !== playerId
      );
      const opponentIds = playerTeamId === 'A' ? match.teamB.playerIds : match.teamA.playerIds;
      const winnerAndLoser = getWinnerAndLoserIds(match);

      return {
        matchId: match.id,
        completedAt: match.completedAt ?? match.updatedAt,
        teammates: teammateIds
          .map((id) => playerMap.get(id))
          .filter((player): player is Types.Player => Boolean(player)),
        opponents: opponentIds
          .map((id) => playerMap.get(id))
          .filter((player): player is Types.Player => Boolean(player)),
        teamScore: getPlayerScore(match, playerId),
        opponentScore:
          playerTeamId === 'A' ? match.teamBScore ?? 0 : match.teamAScore ?? 0,
        won: winnerAndLoser?.winnerIds.includes(playerId) ?? false,
        isShowdown: match.isShowdown ?? false,
        showdownInitiatedByPlayerTeam:
          (match.isShowdown ?? false) &&
          match.showdownInitiatorTeam != null &&
          match.showdownInitiatorTeam === playerTeamId,
        courtNumber: match.courtNumber ?? null,
      };
    });
}

function getLeaderGroup(players: Types.Player[], pickValue: (player: Types.Player) => number): Types.SessionLeaderGroup {
  const value = players.reduce((maxValue, player) => Math.max(maxValue, pickValue(player)), 0);
  if (value <= 0) {
    return { value: 0, players: [] };
  }

  return {
    value,
    players: players.filter((player) => pickValue(player) === value),
  };
}

export function getSessionSummary(players: Types.Player[], completedMatches: Types.Match[]): Types.SessionSummary {
  return {
    hasMatches: completedMatches.length > 0,
    mostWins: getLeaderGroup(players, (player) => player.wins),
    highestScore: getLeaderGroup(players, (player) => player.rankScore ?? 0),
    mostMatches: getLeaderGroup(players, (player) => player.matchesPlayed),
  };
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
