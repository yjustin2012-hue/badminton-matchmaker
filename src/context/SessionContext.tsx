/**
 * Session Context
 * Central state management for the badminton app
 * Manages players, matches, rankings, and settings
 */

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as Types from '../types';
import * as DB from '../db';
import * as Matchmaking from '../lib/matchmaking';
import * as Rankings from '../lib/rankings';
import * as Stats from '../lib/stats';
import { generateUUID } from '../lib/uuid';

interface SessionContextType {
  // State
  players: Types.Player[];
  pendingMatches: Types.Match[];
  completedMatches: Types.Match[];
  settings: Types.Settings;
  isLoading: boolean;
  error: string | null;
  loadedRosterId: string | null; // Track which roster was loaded

  // Player operations
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  updatePlayerName: (id: string, newName: string) => Promise<void>;
  togglePlayerAvailability: (id: string) => Promise<void>;
  loadPresetPlayers: (presetId: string) => Promise<void>;

  // Match operations
  generateMatch: () => Promise<void>;
  completeMatch: (matchId: string, teamAScore: number, teamBScore: number) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;

  // Session operations
  startOver: () => Promise<void>;
  saveSnapshot: (name?: string) => Promise<void>;
  undoLastMatch: () => Promise<void>;

  // Preset operations
  saveAsPreset: (name: string) => Promise<void>;
  overwritePreset: (presetId: string) => Promise<void>;

  // Settings operations
  updateLanguage: (language: Types.Language) => Promise<void>;
  updateAuthRequirement: (required: boolean) => Promise<void>;
  setAdminPasscode: (hash: string) => Promise<void>;
  reloadSettings: () => Promise<void>;
  reloadMatchData: () => Promise<void>;

  // Derived data
  rankings: Types.Ranking[];
  sessionInfo: Types.SessionInfo;
}

const SessionContext = createContext<SessionContextType | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { i18n } = useTranslation();
  const [players, setPlayers] = useState<Types.Player[]>([]);
  const [pendingMatches, setPendingMatches] = useState<Types.Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Types.Match[]>([]);
  const [settings, setSettings] = useState<Types.Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedRosterId, setLoadedRosterId] = useState<string | null>(null);

  // Initialize database on mount
  useEffect(() => {
    async function initializeApp() {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize database
        await DB.initializeDatabase();

        // Load all data
        const [loadedPlayers, loadedPending, loadedCompleted, loadedSettings] =
          await Promise.all([
            DB.getAllPlayers(),
            DB.getPendingMatches(),
            DB.getCompletedMatches(),
            DB.getSettings(),
          ]);

        setPlayers(loadedPlayers);
        setPendingMatches(loadedPending);
        setCompletedMatches(loadedCompleted);
        setSettings(loadedSettings);

        // Sync language with i18n
        await i18n.changeLanguage(loadedSettings.language);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize app';
        setError(message);
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initializeApp();
  }, [i18n]);

  // Player operations
  const addPlayer = useCallback(
    async (name: string) => {
      try {
        const newPlayer: Types.Player = {
          id: generateUUID(),
          name: name.trim(),
          available: true,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          recentMatchIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await DB.addPlayer(newPlayer);
        setPlayers((prev) => [...prev, newPlayer]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add player';
        setError(message);
        throw err;
      }
    },
    []
  );

  const removePlayer = useCallback(
    async (id: string) => {
      try {
        await DB.deletePlayer(id);
        setPlayers((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove player';
        setError(message);
        throw err;
      }
    },
    []
  );

  const updatePlayerName = useCallback(
    async (id: string, newName: string) => {
      try {
        await DB.updatePlayer(id, { name: newName.trim() });
        setPlayers((prev) =>
          prev.map((p) => (p.id === id ? { ...p, name: newName.trim() } : p))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update player name';
        setError(message);
        throw err;
      }
    },
    []
  );

  const togglePlayerAvailability = useCallback(
    async (id: string) => {
      try {
        await DB.togglePlayerAvailability(id);
        setPlayers((prev) =>
          prev.map((p) => (p.id === id ? { ...p, available: !p.available } : p))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to toggle availability';
        setError(message);
        throw err;
      }
    },
    []
  );

  const loadPresetPlayers = useCallback(
    async (presetId: string) => {
      try {
        const preset = await DB.getPreset(presetId);
        if (!preset) throw new Error('Preset not found');

        // Clear current players and add preset players
        await DB.deleteAllPlayers();

        const newPlayers = preset.players.map((p): Types.Player => ({
          id: generateUUID(),
          name: p.name,
          available: true,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          recentMatchIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));

        for (const player of newPlayers) {
          await DB.addPlayer(player);
        }

        setPlayers(newPlayers);
        setLoadedRosterId(presetId); // Track which roster was loaded
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load preset';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Match operations
  const generateMatch = useCallback(async () => {
    try {
      // Get available players
      const available = players.filter((p) => p.available);
      
      // Separate into non-pending and pending players
      const nonPendingPlayers = available.filter((p) => 
        !pendingMatches.some((m) => 
          m.teamA.playerIds.includes(p.id) || m.teamB.playerIds.includes(p.id)
        )
      );
      const pendingPlayersList = available.filter((p) => 
        pendingMatches.some((m) => 
          m.teamA.playerIds.includes(p.id) || m.teamB.playerIds.includes(p.id)
        )
      );

      // Try to generate from non-pending players first
      let eligibleFiltered = nonPendingPlayers;
      let result = Matchmaking.generateMatch(eligibleFiltered);

      // If can't generate from non-pending, try allowing pending (if setting allows)
      if (result.error && settings.ignorePendingMatchesForGeneration) {
        // Combine available players with pending ones
        eligibleFiltered = available;
        result = Matchmaking.generateMatch(eligibleFiltered);
      }

      if (result.error) {
        const unavailable = players.filter((p) => !p.available).length;
        const detailedError = `${result.error} (Total: ${players.length}, Available: ${available.length}, Unavailable: ${unavailable}, In pending matches: ${pendingPlayersList.length})`;
        setError(detailedError);
        throw new Error(detailedError);
      }

      const match = result.match!;
      await DB.addMatch(match);
      setPendingMatches((prev) => [...prev, match]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate match';
      setError(message);
      throw err;
    }
  }, [players, settings, pendingMatches]);

  const completeMatch = useCallback(
    async (matchId: string, teamAScore: number, teamBScore: number) => {
      try {
        await DB.completeMatch(matchId, teamAScore, teamBScore);

        const match = await DB.getMatch(matchId);
        if (!match) throw new Error('Match not found after completion');

        // Update player stats
        const winnerAndLoser = Stats.getWinnerAndLoserIds(match);
        if (!winnerAndLoser) throw new Error('Could not determine match winner');

        for (const winnerId of winnerAndLoser.winnerIds) {
          await DB.updatePlayerStats(winnerId, matchId, true);
        }

        for (const loserId of winnerAndLoser.loserIds) {
          await DB.updatePlayerStats(loserId, matchId, false);
        }

        // Reload data
        const [loadedPlayers, loadedPending, loadedCompleted] = await Promise.all([
          DB.getAllPlayers(),
          DB.getPendingMatches(),
          DB.getCompletedMatches(),
        ]);

        setPlayers(loadedPlayers);
        setPendingMatches(loadedPending);
        setCompletedMatches(loadedCompleted);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to complete match';
        setError(message);
        throw err;
      }
    },
    []
  );

  const deleteMatch = useCallback(
    async (matchId: string) => {
      try {
        await DB.deleteMatch(matchId);
        setPendingMatches((prev) => prev.filter((m) => m.id !== matchId));
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete match';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Session operations
  const startOver = useCallback(async () => {
    try {
      // Clear all matches (pending and completed) and reset all player stats
      await DB.deleteAllMatches();
      await DB.resetAllPlayerStats();

      const loadedPlayers = await DB.getAllPlayers();
      setPlayers(loadedPlayers);
      setPendingMatches([]);
      setCompletedMatches([]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start over';
      setError(message);
      throw err;
    }
  }, []);

  const saveSnapshot = useCallback(
    async (name?: string) => {
      try {
        if (!settings) throw new Error('Settings not loaded');

        const playerMap = new Map(players.map((p) => [p.id, p.name]));
        const snapshotRankings: Types.SnapshotRanking[] = players.map((p) => {
          const total = p.wins + p.losses;
          const winPercentage = total > 0 ? (p.wins / total) * 100 : 0;

          return {
            playerId: p.id,
            playerName: p.name,
            matchesPlayed: p.matchesPlayed,
            wins: p.wins,
            losses: p.losses,
            winPercentage,
          };
        });

        // Capture completed matches
        const snapshotMatches: Types.SnapshotMatch[] = completedMatches.map((match) => ({
          id: match.id,
          teamAPlayerIds: match.teamA.playerIds,
          teamAPlayerNames: [
            playerMap.get(match.teamA.playerIds[0]) || 'Unknown',
            playerMap.get(match.teamA.playerIds[1]) || 'Unknown',
          ] as [string, string],
          teamBPlayerIds: match.teamB.playerIds,
          teamBPlayerNames: [
            playerMap.get(match.teamB.playerIds[0]) || 'Unknown',
            playerMap.get(match.teamB.playerIds[1]) || 'Unknown',
          ] as [string, string],
          teamAScore: match.teamAScore!,
          teamBScore: match.teamBScore!,
          completedAt: match.completedAt!,
        }));

        const snapshot: Types.Snapshot = {
          id: generateUUID(),
          name,
          rankings: snapshotRankings,
          matches: snapshotMatches,
          minMatchesThreshold: settings.minMatchesThreshold,
          createdAt: Date.now(),
        };

        await DB.addSnapshot(snapshot);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save snapshot';
        setError(message);
        throw err;
      }
    },
    [players, settings]
  );

  const undoLastMatch = useCallback(async () => {
    try {
      const lastMatch = await DB.getMostRecentCompletedMatch();
      if (!lastMatch) throw new Error('No completed match to undo');

      // TODO: Implement match undo logic
      // This would involve reverting player stats and moving match back to pending
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to undo match';
      setError(message);
      throw err;
    }
  }, []);

  // Preset operations
  const saveAsPreset = useCallback(
    async (name: string) => {
      try {
        const preset: Types.Preset = {
          id: generateUUID(),
          name: name.trim(),
          players: players.map((p) => ({
            id: p.id,
            name: p.name,
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await DB.addPreset(preset);
        setLoadedRosterId(null); // Clear loaded roster since we're creating a new one
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save preset';
        setError(message);
        throw err;
      }
    },
    [players]
  );

  const overwritePreset = useCallback(
    async (presetId: string) => {
      try {
        await DB.updatePreset(presetId, {
          players: players.map((p) => ({
            id: p.id,
            name: p.name,
          })),
          updatedAt: Date.now(),
        });
        setLoadedRosterId(presetId); // Keep tracking this as the loaded roster
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to overwrite preset';
        setError(message);
        throw err;
      }
    },
    [players]
  );

  // Settings operations
  const updateLanguage = useCallback(
    async (language: Types.Language) => {
      try {
        await DB.setLanguage(language);
        setSettings((prev) => (prev ? { ...prev, language } : null));
        await i18n.changeLanguage(language);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update language';
        setError(message);
        throw err;
      }
    },
    [i18n]
  );

  const reloadSettings = useCallback(async () => {
    try {
      const updatedSettings = await DB.getSettings();
      setSettings(updatedSettings);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reload settings';
      setError(message);
    }
  }, []);

  const reloadMatchData = useCallback(async () => {
    try {
      const [loadedPlayers, loadedCompleted] = await Promise.all([
        DB.getAllPlayers(),
        DB.getCompletedMatches(),
      ]);
      setPlayers(loadedPlayers);
      setCompletedMatches(loadedCompleted);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reload match data';
      setError(message);
    }
  }, []);

  const updateAuthRequirement = useCallback(
    async (required: boolean) => {
      try {
        await DB.setAuthRequirement(required);
        setSettings((prev) =>
          prev ? { ...prev, requireAuthForPastEdits: required } : null
        );
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update auth';
        setError(message);
        throw err;
      }
    },
    []
  );

  const setAdminPasscode = useCallback(
    async (hash: string) => {
      try {
        await DB.setAdminPasscode(hash);
        setSettings((prev) =>
          prev ? { ...prev, adminPasscodeHash: hash } : null
        );
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set passcode';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Derive rankings
  const rankings = settings
    ? Rankings.calculateRankings(players, {
        minMatchesThreshold: settings.minMatchesThreshold,
        dueUpThreshold: settings.duUpBelowAverageThreshold,
      })
    : [];

  // Derive session info
  const sessionInfo: Types.SessionInfo = {
    playerCount: players.length,
    pendingMatchCount: pendingMatches.length,
    completedMatchCount: completedMatches.length,
    totalMatchCount: pendingMatches.length + completedMatches.length,
    sessionDurationMs: Date.now() - (players[0]?.createdAt || Date.now()),
    startedAt: players[0]?.createdAt || Date.now(),
  };

  const value: SessionContextType = {
    players,
    pendingMatches,
    completedMatches,
    settings: settings || ({} as Types.Settings),
    isLoading,
    error,
    loadedRosterId,
    addPlayer,
    removePlayer,
    updatePlayerName,
    togglePlayerAvailability,
    loadPresetPlayers,
    generateMatch,
    completeMatch,
    deleteMatch,
    startOver,
    saveSnapshot,
    undoLastMatch,
    saveAsPreset,
    overwritePreset,
    updateLanguage,
    updateAuthRequirement,
    setAdminPasscode,
    reloadSettings,
    reloadMatchData,
    rankings,
    sessionInfo,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <p className="text-lg text-slate-600">Loading session...</p>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSessionContext must be used inside SessionProvider');
  }
  return ctx;
}
