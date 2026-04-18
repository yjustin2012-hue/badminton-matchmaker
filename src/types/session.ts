/**
 * Session domain model
 * Represents the current session state
 */

import { Player } from './player';
import { Match } from './match';
import { Settings } from './settings';

export interface SessionState {
  // Core data
  players: Player[];
  pendingMatches: Match[]; // Matches with status === 'pending'
  completedMatches: Match[]; // Matches with status === 'completed'
  settings: Settings;

  // Session metadata
  startedAt: number;
  lastActivityAt: number;
}

/**
 * Simplified display model for session info
 */
export interface SessionInfo {
  playerCount: number;
  pendingMatchCount: number;
  completedMatchCount: number;
  totalMatchCount: number;
  sessionDurationMs: number;
  startedAt: number;
}

export interface SessionLeaderGroup {
  value: number;
  players: Player[];
}

export interface SessionSummary {
  hasMatches: boolean;
  mostWins: SessionLeaderGroup;
  highestScore: SessionLeaderGroup;
  mostMatches: SessionLeaderGroup;
}

export interface PlayerMatchHistoryEntry {
  matchId: string;
  completedAt: number;
  teammates: Player[];
  opponents: Player[];
  teamScore: number;
  opponentScore: number;
  won: boolean;
  isShowdown: boolean;
  showdownInitiatedByPlayerTeam: boolean;
  courtNumber: number | null;
}

/**
 * Notification types for user feedback
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  duration?: number; // ms; if undefined, auto-dismiss default
}
