/**
 * Match persistence layer
 * CRUD operations for matches in IndexedDB
 */

import { db } from './schema';
import * as Types from '../types';

/**
 * Add a new match (pending status)
 */
export async function addMatch(match: Types.Match): Promise<string> {
  return db.matches.add(match);
}

/**
 * Get a match by ID
 */
export async function getMatch(id: string): Promise<Types.Match | undefined> {
  return db.matches.get(id);
}

/**
 * Get all matches
 */
export async function getAllMatches(): Promise<Types.Match[]> {
  return db.matches.toArray();
}

/**
 * Get all pending matches
 */
export async function getPendingMatches(): Promise<Types.Match[]> {
  return db.matches.where('status').equals('pending').toArray();
}

/**
 * Get all completed matches
 */
export async function getCompletedMatches(): Promise<Types.Match[]> {
  return db.matches.where('status').equals('completed').toArray();
}

/**
 * Update a match
 */
export async function updateMatch(
  id: string,
  updates: Partial<Types.Match>
): Promise<number> {
  return db.matches.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
}

/**
 * Complete a pending match with scores
 */
export async function completeMatch(
  id: string,
  teamAScore: number,
  teamBScore: number
): Promise<number> {
  if (teamAScore === teamBScore) {
    throw new Error('Scores cannot be tied');
  }

  if (teamAScore < 0 || teamBScore < 0) {
    throw new Error('Scores must be non-negative');
  }

  return updateMatch(id, {
    status: 'completed' as Types.MatchStatus,
    teamAScore,
    teamBScore,
    completedAt: Date.now(),
  });
}

/**
 * Delete a match (useful for discarding pending matches)
 */
export async function deleteMatch(id: string): Promise<void> {
  await db.matches.delete(id);
}

/**
 * Delete all pending matches only (for reset)
 */
export async function deletePendingMatches(): Promise<void> {
  const pendingMatches = await getPendingMatches();
  await db.matches.bulkDelete(pendingMatches.map((m) => m.id));
}

/**
 * Delete all matches (for full reset)
 */
export async function deleteAllMatches(): Promise<void> {
  await db.matches.clear();
}

/**
 * Check if a player is in any pending match
 */
export async function isPlayerInPendingMatch(playerId: string): Promise<boolean> {
  const pendingMatches = await getPendingMatches();

  return pendingMatches.some(
    (match) =>
      match.teamA.playerIds.includes(playerId) ||
      match.teamB.playerIds.includes(playerId)
  );
}

/**
 * Get all pending matches that include a specific player
 */
export async function getPlayerPendingMatches(playerId: string): Promise<Types.Match[]> {
  const pendingMatches = await getPendingMatches();

  return pendingMatches.filter(
    (match) =>
      match.teamA.playerIds.includes(playerId) ||
      match.teamB.playerIds.includes(playerId)
  );
}

/**
 * Verify undo capability: get most recent completed match if within time window
 */
export async function getMostRecentCompletedMatch(): Promise<Types.Match | undefined> {
  const completedMatches = await getCompletedMatches();

  if (completedMatches.length === 0) return undefined;

  return completedMatches.reduce((latest, current) =>
    (current.completedAt || 0) > (latest.completedAt || 0) ? current : latest
  );
}
