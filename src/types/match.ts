/**
 * Match domain model
 * Represents a doubles match (2v2) in the session
 */

export type MatchStatus = 'pending' | 'completed';

export interface Team {
  playerIds: [string, string]; // Always exactly 2 player IDs (tuple)
}

export interface Match {
  id: string; // UUID v4
  teamA: Team;
  teamB: Team;
  status: MatchStatus;

  // Scores (required and must be numeric, cannot be tied, higher wins)
  teamAScore?: number; // Undefined until completed
  teamBScore?: number; // Undefined until completed

  createdAt: number;
  completedAt?: number; // Only set when status === 'completed'
  updatedAt: number;
}

/**
 * Pending match display model
 * Includes player names for easy display
 */
export interface PendingMatchDisplay {
  id: string;
  teamA: {
    playerIds: [string, string];
    playerNames: [string, string];
  };
  teamB: {
    playerIds: [string, string];
    playerNames: [string, string];
  };
  createdAt: number;
}

/**
 * Completed match record for history
 * Includes winner info and player names
 */
export interface CompletedMatchRecord {
  id: string;
  teamA: {
    playerIds: [string, string];
    playerNames: [string, string];
  };
  teamB: {
    playerIds: [string, string];
    playerNames: [string, string];
  };
  teamAScore: number;
  teamBScore: number;
  winnerId: 'A' | 'B'; // Which team won
  createdAt: number;
  completedAt: number;
}

/**
 * Match generation eligibility check result
 */
export interface EligibilityCheckResult {
  eligible: boolean;
  eligiblePlayerCount: number;
  requiredPlayerCount: number;
  reason?: string; // If not eligible, explanation
}
