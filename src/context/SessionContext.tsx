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
  loadedRosterName: string | null; // Track the name of the loaded roster

  // Player operations
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  updatePlayerName: (id: string, newName: string) => Promise<void>;
  togglePlayerAvailability: (id: string) => Promise<void>;
  loadPresetPlayers: (presetId: string) => Promise<void>;
  setPlayerPreferredPartner: (playerId: string, partnerId: string | null) => Promise<void>;
  setPlayerColor: (playerId: string, color: string | null) => Promise<void>;
  setPlayerDoNotPair: (playerId: string, targetId: string | null) => Promise<void>;

  // Match operations
  generateMatch: () => Promise<void>;
  completeMatch: (matchId: string, teamAScore: number, teamBScore: number) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  assignMatchToCourt: (matchId: string, courtNumber: number | null) => Promise<void>;
  setMatchTargetCourt: (matchId: string, targetCourtNumber: number | null) => Promise<void>;
  toggleShowdownMode: (matchId: string) => Promise<void>;
  setShowdownInitiatorTeam: (matchId: string, team: 'A' | 'B' | null) => Promise<void>;
  createManualMatch: (teamAIds: [string, string], teamBIds: [string, string]) => Promise<void>;

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
  const { i18n, t } = useTranslation();
  const [players, setPlayers] = useState<Types.Player[]>([]);
  const [pendingMatches, setPendingMatches] = useState<Types.Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Types.Match[]>([]);
  const [settings, setSettings] = useState<Types.Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedRosterId, setLoadedRosterId] = useState<string | null>(null);
  const [loadedRosterName, setLoadedRosterName] = useState<string | null>(null);

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
          rankScore: 0,
          totalPointsScored: 0,
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

  const setPlayerPreferredPartner = useCallback(
    async (playerId: string, partnerId: string | null) => {
      try {
        await DB.updatePlayer(playerId, { preferredPartnerId: partnerId });
        setPlayers((prev) =>
          prev.map((p) => (p.id === playerId ? { ...p, preferredPartnerId: partnerId } : p))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set pair preference';
        setError(message);
        throw err;
      }
    },
    []
  );

  const setPlayerColor = useCallback(
    async (playerId: string, color: string | null) => {
      try {
        await DB.updatePlayer(playerId, { color: color ?? undefined });
        setPlayers((prev) =>
          prev.map((p) => (p.id === playerId ? { ...p, color: color ?? undefined } : p))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set player color';
        setError(message);
        throw err;
      }
    },
    []
  );

  const setPlayerDoNotPair = useCallback(
    async (playerId: string, targetId: string | null) => {
      try {
        const player = players.find((p) => p.id === playerId);
        if (!player) return;
        let updated: string[];
        if (targetId === null) {
          updated = [];
        } else if (player.doNotPairWithIds?.includes(targetId)) {
          updated = (player.doNotPairWithIds ?? []).filter((id) => id !== targetId);
        } else {
          updated = [...(player.doNotPairWithIds ?? []), targetId];
        }
        await DB.updatePlayer(playerId, { doNotPairWithIds: updated });
        setPlayers((prev) =>
          prev.map((p) => (p.id === playerId ? { ...p, doNotPairWithIds: updated } : p))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set do-not-pair';
        setError(message);
        throw err;
      }
    },
    [players]
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
          color: p.color,
          available: true,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          rankScore: 0,
          totalPointsScored: 0,
          recentMatchIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));

        for (const player of newPlayers) {
          await DB.addPlayer(player);
        }

        setPlayers(newPlayers);
        setLoadedRosterId(presetId); // Track which roster was loaded
        setLoadedRosterName(preset.name); // Track the roster name
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
      let eligibleFiltered = [...nonPendingPlayers];

      // Pair-preference pool expansion: if any non-pending player has a preferred
      // partner who is currently pending, include that partner so the pair can play
      // together. Respecting preferences takes priority over keeping them off court.
      const alreadyEligible = new Set(eligibleFiltered.map((p) => p.id));
      for (const player of nonPendingPlayers) {
        if (player.preferredPartnerId && !alreadyEligible.has(player.preferredPartnerId)) {
          const preferredPartner = pendingPlayersList.find(
            (p) => p.id === player.preferredPartnerId
          );
          if (preferredPartner) {
            eligibleFiltered.push(preferredPartner);
            alreadyEligible.add(preferredPartner.id);
          }
        }
      }

      let result = Matchmaking.generateMatch(eligibleFiltered, {
        balanceTeamsByRankScore: settings.balanceTeamsByRankScore ?? false,
      });

      // If can't generate from non-pending, try allowing pending (if setting allows)
      if (result.error && settings.ignorePendingMatchesForGeneration) {
        // Combine available players with pending ones
        eligibleFiltered = available;
        result = Matchmaking.generateMatch(eligibleFiltered, {
          balanceTeamsByRankScore: settings.balanceTeamsByRankScore ?? false,
        });
      }

      if (result.error) {
        const unavailable = players.filter((p) => !p.available).length;
        const detailedError = t('court.needEligiblePlayers', {
          total: String(players.length),
          available: String(available.length),
          unavailable: String(unavailable),
          pending: String(pendingPlayersList.length)
        });
        setError(detailedError);
        throw new Error(detailedError);
      }

      const match = result.match!;

      // Auto-assign to an empty court if court view is enabled
      if (settings.courtViewEnabled) {
        const occupiedCourts = new Set(
          pendingMatches.filter((m) => m.courtNumber != null).map((m) => m.courtNumber!)
        );
        let assignedCourt: number | null = null;
        for (let i = 1; i <= (settings.numberOfCourts || 2); i++) {
          if (!occupiedCourts.has(i)) {
            assignedCourt = i;
            break;
          }
        }

        if (assignedCourt !== null) {
          // Empty court found — assign directly
          match.courtNumber = assignedCourt;
          match.courtAssignedAt = Date.now();
          match.targetCourtNumber = null;
        } else if (settings.strictCourtAutoFill) {
          // Strict mode: queue the match and designate the court with the fewest
          // pending matches already targeted at it.
          match.courtNumber = null;
          match.courtAssignedAt = null;
          const numCourts = settings.numberOfCourts || 2;
          const queuedPerCourt = new Map<number, number>();
          for (let i = 1; i <= numCourts; i++) queuedPerCourt.set(i, 0);
          for (const m of pendingMatches) {
            if (m.courtNumber == null && m.targetCourtNumber != null) {
              queuedPerCourt.set(m.targetCourtNumber, (queuedPerCourt.get(m.targetCourtNumber) ?? 0) + 1);
            }
          }
          // Pick the court with the lowest queue count; break ties by lowest court number
          let targetCourt = 1;
          let minQueue = Infinity;
          for (let i = 1; i <= numCourts; i++) {
            const count = queuedPerCourt.get(i) ?? 0;
            if (count < minQueue) {
              minQueue = count;
              targetCourt = i;
            }
          }
          match.targetCourtNumber = targetCourt;
        } else {
          // Relaxed mode: queue without a designated court
          match.courtNumber = null;
          match.courtAssignedAt = null;
          match.targetCourtNumber = null;
        }
      } else {
        match.courtNumber = null;
        match.courtAssignedAt = null;
        match.targetCourtNumber = null;
      }

      await DB.addMatch(match);
      setPendingMatches((prev) => [...prev, match]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate match';
      setError(message);
      throw err;
    }
  }, [players, settings, pendingMatches, t]);

  const completeMatch = useCallback(
    async (matchId: string, teamAScore: number, teamBScore: number) => {
      try {
        await DB.completeMatch(matchId, teamAScore, teamBScore);

        const match = await DB.getMatch(matchId);
        if (!match) throw new Error('Match not found after completion');

        const winnerAndLoser = Stats.getWinnerAndLoserIds(match);
        if (!winnerAndLoser) throw new Error('Could not determine match winner');

        const allPlayerIds = [...winnerAndLoser.winnerIds, ...winnerAndLoser.loserIds];
        for (const playerId of allPlayerIds) {
          const p = await DB.getPlayer(playerId);
          if (!p) continue;
          const updatedPlayer = Stats.applyCompletedMatchToPlayer(p, match, {
            showdownWinBonus: settings?.showdownWinBonus ?? 3,
            showdownLossDeduction: settings?.showdownLossDeduction ?? 1,
          });

          await DB.updatePlayer(playerId, {
            matchesPlayed: updatedPlayer.matchesPlayed,
            wins: updatedPlayer.wins,
            losses: updatedPlayer.losses,
            rankScore: updatedPlayer.rankScore,
            totalPointsScored: updatedPlayer.totalPointsScored,
            recentMatchIds: updatedPlayer.recentMatchIds,
            lastPlayedTime: updatedPlayer.lastPlayedTime,
            updatedAt: updatedPlayer.updatedAt,
          });
        }

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
    [settings]
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

  const assignMatchToCourt = useCallback(
    async (matchId: string, courtNumber: number | null) => {
      try {
        const match = await DB.getMatch(matchId);
        if (!match) throw new Error('Match not found');

        const nextAssignedAt =
          courtNumber == null
            ? null
            : match.courtNumber == null
              ? Date.now()
              : match.courtAssignedAt ?? Date.now();

        await DB.updateMatch(matchId, { courtNumber, courtAssignedAt: nextAssignedAt });
        setPendingMatches((prev) =>
          prev.map((m) =>
            m.id === matchId ? { ...m, courtNumber, courtAssignedAt: nextAssignedAt } : m
          )
        );
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to assign court';
        setError(message);
        throw err;
      }
    },
    []
  );

  const setMatchTargetCourt = useCallback(
    async (matchId: string, targetCourtNumber: number | null) => {
      try {
        await DB.updateMatch(matchId, { targetCourtNumber });
        setPendingMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, targetCourtNumber } : m))
        );
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set target court';
        setError(message);
        throw err;
      }
    },
    []
  );

  const toggleShowdownMode = useCallback(async (matchId: string) => {
    try {
      const match = await DB.getMatch(matchId);
      if (!match) return;
      const newVal = !match.isShowdown;
      // When turning on, default initiator to Team A; when turning off, clear it
      const initiator = newVal ? 'A' : null;
      await DB.updateMatch(matchId, {
        isShowdown: newVal,
        showdownInitiatorTeam: initiator,
      });
      setPendingMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? { ...m, isShowdown: newVal, showdownInitiatorTeam: initiator }
            : m
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle showdown';
      setError(message);
      throw err;
    }
  }, []);

  const setShowdownInitiatorTeam = useCallback(
    async (matchId: string, team: 'A' | 'B' | null) => {
      try {
        await DB.updateMatch(matchId, { showdownInitiatorTeam: team });
        setPendingMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, showdownInitiatorTeam: team } : m))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set showdown initiator';
        setError(message);
        throw err;
      }
    },
    []
  );

  const createManualMatch = useCallback(
    async (teamAIds: [string, string], teamBIds: [string, string]) => {
      try {
        const match: Types.Match = {
          id: generateUUID(),
          teamA: { playerIds: teamAIds },
          teamB: { playerIds: teamBIds },
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          courtNumber: null,
          courtAssignedAt: null,
          targetCourtNumber: null,
        };

        if (settings.courtViewEnabled) {
          const occupiedCourts = new Set(
            pendingMatches.filter((m) => m.courtNumber != null).map((m) => m.courtNumber!)
          );
          let assignedCourt: number | null = null;
          for (let i = 1; i <= (settings.numberOfCourts || 2); i++) {
            if (!occupiedCourts.has(i)) {
              assignedCourt = i;
              break;
            }
          }

          if (assignedCourt !== null) {
            match.courtNumber = assignedCourt;
            match.courtAssignedAt = Date.now();
            match.targetCourtNumber = null;
          } else if (settings.strictCourtAutoFill) {
            match.courtNumber = null;
            match.courtAssignedAt = null;
            const numCourts = settings.numberOfCourts || 2;
            const queuedPerCourt = new Map<number, number>();
            for (let i = 1; i <= numCourts; i++) queuedPerCourt.set(i, 0);
            for (const m of pendingMatches) {
              if (m.courtNumber == null && m.targetCourtNumber != null) {
                queuedPerCourt.set(m.targetCourtNumber, (queuedPerCourt.get(m.targetCourtNumber) ?? 0) + 1);
              }
            }
            let targetCourt = 1;
            let minQueue = Infinity;
            for (let i = 1; i <= numCourts; i++) {
              const count = queuedPerCourt.get(i) ?? 0;
              if (count < minQueue) { minQueue = count; targetCourt = i; }
            }
            match.targetCourtNumber = targetCourt;
          } else {
            match.courtAssignedAt = null;
          }
        }

        await DB.addMatch(match);
        setPendingMatches((prev) => [...prev, match]);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create match';
        setError(message);
        throw err;
      }
    },
    [settings, pendingMatches]
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
            totalPointsScored: p.totalPointsScored,
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
            color: p.color,
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await DB.addPreset(preset);
        setLoadedRosterId(preset.id);
        setLoadedRosterName(preset.name);
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
            color: p.color,
          })),
          updatedAt: Date.now(),
        });
        setLoadedRosterId(presetId);
        // Note: loadedRosterName should be updated when overwritePreset is called with the preset name
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
    loadedRosterName,
    addPlayer,
    removePlayer,
    updatePlayerName,
    togglePlayerAvailability,
    loadPresetPlayers,
    setPlayerPreferredPartner,
    setPlayerColor,
    setPlayerDoNotPair,
    generateMatch,
    completeMatch,
    deleteMatch,
    assignMatchToCourt,
    setMatchTargetCourt,
    toggleShowdownMode,
    setShowdownInitiatorTeam,
    createManualMatch,
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
