/**
 * Player persistence layer
 * CRUD operations for players in IndexedDB
 */

import { db } from './schema';
import * as Types from '../types';

/**
 * Add a new player to the database
 */
export async function addPlayer(player: Types.Player): Promise<string> {
  return db.players.add(player);
}

/**
 * Get a player by ID
 */
export async function getPlayer(id: string): Promise<Types.Player | undefined> {
  return db.players.get(id);
}

/**
 * Get all players
 */
export async function getAllPlayers(): Promise<Types.Player[]> {
  return db.players.toArray();
}

/**
 * Get all available players
 */
export async function getAvailablePlayers(): Promise<Types.Player[]> {
  return db.players.filter((p) => p.available).toArray();
}

/**
 * Update a player
 */
export async function updatePlayer(
  id: string,
  updates: Partial<Types.Player>
): Promise<number> {
  return db.players.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
}

/**
 * Delete a player
 */
export async function deletePlayer(id: string): Promise<void> {
  await db.players.delete(id);
}

/**
 * Delete all players (for reset/clear)
 */
export async function deleteAllPlayers(): Promise<void> {
  await db.players.clear();
}

/**
 * Toggle player availability
 */
export async function togglePlayerAvailability(id: string): Promise<number> {
  const player = await getPlayer(id);
  if (!player) throw new Error(`Player ${id} not found`);

  return updatePlayer(id, { available: !player.available });
}

/**
 * Update player stats after a match
 * Called when a match is completed
 */
export async function updatePlayerStats(
  playerId: string,
  matchId: string,
  won: boolean,
  pointsScored: number = 0
): Promise<number> {
  const player = await getPlayer(playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  const recentMatchIds = [...(player.recentMatchIds || []), matchId].slice(-20); // Keep last 20

  return updatePlayer(playerId, {
    matchesPlayed: player.matchesPlayed + 1,
    wins: won ? player.wins + 1 : player.wins,
    losses: won ? player.losses : player.losses + 1,
    totalPointsScored: (player.totalPointsScored ?? 0) + pointsScored,
    recentMatchIds,
    lastPlayedTime: Date.now(),
  });
}

/**
 * Reset a single player's stats to baseline
 * Used when recalculating stats after match edits
 */
export async function resetPlayerStats(playerId: string): Promise<number> {
  const player = await getPlayer(playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  return updatePlayer(playerId, {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    rankScore: 0,
    totalPointsScored: 0,
    recentMatchIds: [],
    lastPlayedTime: undefined,
  });
}

/**
 * Reset all player stats for the session (for "Start Over")
 * But preserve player records
 */
export async function resetAllPlayerStats(): Promise<void> {
  const players = await getAllPlayers();

  for (const player of players) {
    await updatePlayer(player.id, {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      rankScore: 0,
      totalPointsScored: 0,
      recentMatchIds: [],
      lastPlayedTime: undefined,
    });
  }
}
