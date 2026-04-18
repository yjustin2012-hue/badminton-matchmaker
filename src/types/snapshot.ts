/**
 * Snapshot domain model
 * Historical ranking snapshot saved at a point in time
 */

export interface SnapshotRanking {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number;
  totalPointsScored?: number;
}

export interface SnapshotMatch {
  id: string;
  teamAPlayerIds: [string, string];
  teamAPlayerNames: [string, string];
  teamBPlayerIds: [string, string];
  teamBPlayerNames: [string, string];
  teamAScore: number;
  teamBScore: number;
  completedAt: number;
}

export interface Snapshot {
  id: string; // UUID v4
  name?: string; // Optional custom name given by user
  rankings: SnapshotRanking[];
  matches: SnapshotMatch[]; // Completed matches at time of snapshot
  minMatchesThreshold: number; // Low sample threshold at time of snapshot
  createdAt: number;
  sessionId?: string; // Optional reference to session this was taken from
}

/**
 * Snapshot list item for display
 */
export interface SnapshotListItem {
  id: string;
  name?: string;
  createdAt: number;
  playerCount: number;
  topPlayer?: {
    name: string;
    winPercentage: number;
  };
}
