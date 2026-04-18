/**
 * Court Page
 * Main session screen for live badminton match management
 * Displays player list, pending matches, and controls
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../context/SessionContext';
import * as DB from '../db';
import * as Types from '../types';
import * as Stats from '../lib/stats';
import clsx from 'clsx';

export default function CourtPage() {
  const { t } = useTranslation();
  const session = useSessionContext();
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showPickFromList, setShowPickFromList] = useState(false);
  const [pickFromListFilter, setPickFromListFilter] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [recentPlayers, setRecentPlayers] = useState<string[]>([]);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<Record<string, { teamA: string; teamB: string }>>({}); 
  const [pairModalPlayerId, setPairModalPlayerId] = useState<string | null>(null);
  const [colorModalPlayerId, setColorModalPlayerId] = useState<string | null>(null);
  const [doNotPairModalPlayerId, setDoNotPairModalPlayerId] = useState<string | null>(null);
  const [showPlayerManager, setShowPlayerManager] = useState(false);
  const [managerEditingId, setManagerEditingId] = useState<string | null>(null);
  const [managerEditingName, setManagerEditingName] = useState('');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // Court assign modal state
  const [courtAssignMatchId, setCourtAssignMatchId] = useState<string | null>(null);
  const [showFullQueue, setShowFullQueue] = useState(true);

  // Preset state
  const [presets, setPresets] = useState<Types.Preset[]>([]);
  const [showSaveRoster, setShowSaveRoster] = useState(false);
  const [rosterName, setRosterName] = useState('');
  const [showLoadRoster, setShowLoadRoster] = useState(false);
  const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);
  const [overwriteRosterName, setOverwriteRosterName] = useState<string | null>(null);
  const [showLoadRosterWarning, setShowLoadRosterWarning] = useState(false);
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [pickFromListWarning, setPickFromListWarning] = useState<string | null>(null);
  const [showManualPickModal, setShowManualPickModal] = useState(false);
  const [manualPickSelected, setManualPickSelected] = useState<string[]>([]);
  const [pendingRosterId, setPendingRosterId] = useState<string | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());

  useEffect(() => {
    async function loadPresets() {
      try {
        const loaded = await DB.getAllPresets();
        setPresets(loaded);
      } catch (err) {
        console.error('Failed to load presets:', err);
      }
    }

    loadPresets();
  }, []);

  useEffect(() => {
    if (!showAddPlayer && !showPickFromList) return;
    const limit = session.settings.recentPlayersSuggestCount ?? 30;
    DB.getRecentPlayerNames(limit).then(setRecentPlayers).catch(() => {});
  }, [showAddPlayer, showPickFromList, session.settings.recentPlayersSuggestCount]);

  useEffect(() => {
    if (!(session.settings.courtTimerEnabled && session.pendingMatches.some((m) => m.courtNumber != null))) {
      return;
    }

    setTimerNow(Date.now());
    const intervalId = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [session.settings.courtTimerEnabled, session.pendingMatches]);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      setError('Player name cannot be empty');
      return;
    }

    // Check for duplicate names (case-insensitive)
    const normalizedNewName = newPlayerName.trim().toLowerCase();
    const isDuplicate = session.players.some(
      (p) => p.name.toLowerCase() === normalizedNewName
    );

    if (isDuplicate) {
      setError('A player with this name already exists');
      return;
    }

    try {
      await session.addPlayer(newPlayerName);
      setNewPlayerName('');
      setShowAddPlayer(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player');
    }
  };

  const handleUpdatePlayerName = async (id: string) => {
    if (!editingName.trim()) {
      setError('Player name cannot be empty');
      return;
    }

    try {
      await session.updatePlayerName(id, editingName);
      setEditingPlayerId(null);
      setEditingName('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update player');
    }
  };

  const handleToggleAvailability = async (id: string) => {
    try {
      await session.togglePlayerAvailability(id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle availability');
    }
  };

  const handleRemovePlayer = async (id: string) => {
    const hasNoMatches = session.pendingMatches.length === 0 && session.completedMatches.length === 0;

    // Check if player is in any pending matches
    const inPendingMatch = session.pendingMatches.some(
      (match) =>
        match.teamA.playerIds.includes(id) || match.teamB.playerIds.includes(id)
    );

    if (inPendingMatch) {
      setError(t('court.playerInPendingMatch'));
      return;
    }

    // Check if player is in any completed matches
    const inCompletedMatch = session.completedMatches.some(
      (match) =>
        match.teamA.playerIds.includes(id) || match.teamB.playerIds.includes(id)
    );

    if (inCompletedMatch) {
      setError(t('court.playerInCompletedMatches'));
      return;
    }

    if (!hasNoMatches && !confirm(t('court.removePlayerConfirm'))) return;

    try {
      await session.removePlayer(id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedRemovePlayer'));
    }
  };

  const handleGenerateMatch = async () => {
    try {
      await session.generateMatch();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedGenerateMatch'));
    }
  };

  const handleManualPickCreate = async () => {
    if (manualPickSelected.length !== 4) return;
    try {
      const [a1, a2, b1, b2] = manualPickSelected as [string, string, string, string];
      await session.createManualMatch([a1, a2], [b1, b2]);
      setManualPickSelected([]);
      setShowManualPickModal(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedGenerateMatch'));
    }
  };

  const handleCompleteMatch = async (matchId: string) => {
    const scores = scoreInput[matchId];
    if (!scores || !scores.teamA || !scores.teamB) {
      setError(t('court.scoresRequired'));
      return;
    }

    const teamAScore = parseInt(scores.teamA, 10);
    const teamBScore = parseInt(scores.teamB, 10);

    if (isNaN(teamAScore) || isNaN(teamBScore)) {
      setError(t('court.scoresNumeric'));
      return;
    }

    if (teamAScore === teamBScore) {
      setError(t('court.scoresCantTie'));
      return;
    }

    // Capture court assignment before completing — used for auto-fill
    const matchToComplete = session.pendingMatches.find(m => m.id === matchId);
    const freedCourt = matchToComplete?.courtNumber ?? null;
    const strict = session.settings.strictCourtAutoFill ?? false;
    const firstQueued = strict
      ? session.pendingMatches.find(m => !m.courtNumber && m.id !== matchId &&
          m.targetCourtNumber === freedCourt)
      : session.pendingMatches.find(m => !m.courtNumber && m.id !== matchId);

    try {
      await session.completeMatch(matchId, teamAScore, teamBScore);
      setScoreInput((prev) => {
        const updated = { ...prev };
        delete updated[matchId];
        return updated;
      });
      // Auto-fill the freed court with the next eligible queued match
      if (session.settings.courtViewEnabled && freedCourt !== null && firstQueued) {
        await session.assignMatchToCourt(firstQueued.id, freedCourt);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedCompleteMatch'));
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (session.settings.confirmDeletePendingMatch) {
      if (!confirm(t('court.deleteMatchConfirm'))) return;
    }

    // Capture court assignment before deleting — used for auto-fill
    const matchToDelete = session.pendingMatches.find(m => m.id === matchId);
    const freedCourt = matchToDelete?.courtNumber ?? null;
    const strict = session.settings.strictCourtAutoFill ?? false;
    const firstQueued = strict
      ? session.pendingMatches.find(m => !m.courtNumber && m.id !== matchId &&
          m.targetCourtNumber === freedCourt)
      : session.pendingMatches.find(m => !m.courtNumber && m.id !== matchId);

    try {
      await session.deleteMatch(matchId);
      // Auto-fill the freed court with the next eligible queued match
      if (session.settings.courtViewEnabled && freedCourt !== null && firstQueued) {
        await session.assignMatchToCourt(firstQueued.id, freedCourt);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedDeleteMatch'));
    }
  };

  const handleSaveRoster = async () => {
    // Check if a roster was loaded and if players have changed
    if (session.loadedRosterId) {
      try {
        const loadedPreset = await DB.getPreset(session.loadedRosterId);
        if (loadedPreset) {
          // Compare player names (order doesn't matter)
          const currentPlayerNames = new Set(session.players.map((p) => p.name));
          const loadedPlayerNames = new Set(loadedPreset.players.map((p) => p.name));

          const isSame =
            currentPlayerNames.size === loadedPlayerNames.size &&
            Array.from(currentPlayerNames).every((n) => loadedPlayerNames.has(n));

          if (!isSame) {
            // Rosters are different, show overwrite prompt
            setOverwriteRosterName(loadedPreset.name);
            setShowOverwritePrompt(true);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking loaded roster:', err);
      }
    }

    // No loaded roster or rosters are the same, show save new dialog
    setShowSaveRoster(true);
  };

  const handleOverwriteRoster = async () => {
    if (!session.loadedRosterId) return;

    try {
      await session.overwritePreset(session.loadedRosterId);
      const loaded = await DB.getAllPresets();
      setPresets(loaded);
      setShowOverwritePrompt(false);
      setOverwriteRosterName(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedSaveRoster'));
    }
  };

  const handleSaveAsNewRoster = async () => {
    setShowOverwritePrompt(false);
    setOverwriteRosterName(null);
    setShowSaveRoster(true);
  };

  const handleSaveRosterConfirm = async () => {
    if (!rosterName.trim()) {
      setError(t('rosters.nameEmpty'));
      return;
    }

    try {
      await session.saveAsPreset(rosterName);
      const loaded = await DB.getAllPresets();
      setPresets(loaded);
      setRosterName('');
      setShowSaveRoster(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedSaveRoster'));
    }
  };

  const handleLoadRoster = async (presetId: string) => {
    try {
      await session.loadPresetPlayers(presetId);
      const loaded = await DB.getAllPresets();
      setPresets(loaded);
      setShowLoadRoster(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedLoadRoster'));
    }
  };

  const handleShowLoadRosterWarning = (presetId: string) => {
    setPendingRosterId(presetId);
    setShowLoadRosterWarning(true);
  };

  const handleConfirmLoadRoster = async () => {
    if (!pendingRosterId) return;

    try {
      // First, start over (clear pending matches and stats)
      await session.startOver();
      // Then load the new roster
      await handleLoadRoster(pendingRosterId);
      setShowLoadRosterWarning(false);
      setPendingRosterId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedLoadRoster'));
    }
  };

  const handleDeleteRoster = async (presetId: string) => {
    if (!confirm(t('rosters.confirmDelete'))) return;

    try {
      await DB.deletePreset(presetId);
      const loaded = await DB.getAllPresets();
      setPresets(loaded);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedDeleteRoster'));
    }
  };

  const handleStartOver = () => {
    setShowStartOverModal(true);
  };

  const doStartOver = async (clearPlayers: boolean) => {
    try {
      if (clearPlayers) {
        await DB.deleteAllPlayers();
      }
      await session.startOver();
      setShowStartOverModal(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedStartOver'));
      setShowStartOverModal(false);
    }
  };

  const handleAssignCourt = async (matchId: string, courtNumber: number | null) => {
    try {
      await session.assignMatchToCourt(matchId, courtNumber);
      setCourtAssignMatchId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedAssignCourt'));
    }
  };

  const handleSetPairPreference = async (playerId: string, partnerId: string | null) => {
    try {
      await session.setPlayerPreferredPartner(playerId, partnerId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedSetPairPreference'));
    }
  };

  const handleChangeNumberOfCourts = async (delta: number) => {
    const current = session.settings.numberOfCourts || 2;
    const next = Math.max(1, Math.min(6, current + delta));
    if (next === current) return;
    try {
      const existing = session.settings.courtNames ?? [];
      const updated = Array.from({ length: next }, (_, i) => existing[i] || '');
      await DB.updateSettings({ numberOfCourts: next, courtNames: updated });
      await session.reloadSettings();

      if (delta < 0) {
        // Courts were removed — move matches on removed courts back to queue
        const removedCourts = Array.from({ length: current - next }, (_, i) => next + 1 + i);
        const toUnqueue = session.pendingMatches.filter(
          m => m.courtNumber != null && removedCourts.includes(m.courtNumber)
        );
        for (const m of toUnqueue) {
          await session.assignMatchToCourt(m.id, null);
        }
      } else {
        // Courts were added — fill new courts with first queued matches
        const newCourts = Array.from({ length: next - current }, (_, i) => current + 1 + i);
        const queued = session.pendingMatches.filter(m => m.courtNumber == null);
        for (let i = 0; i < newCourts.length && i < queued.length; i++) {
          await session.assignMatchToCourt(queued[i].id, newCourts[i]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('court.failedAssignCourt'));
    }
  };

  const playerMap = new Map(session.players.map((p) => [p.id, p.name]));
  const playerColorMap = new Map(session.players.map((p) => [p.id, p.color ?? null]));
  const sessionSummary = Stats.getSessionSummary(session.players, session.completedMatches);

  const formatElapsedTime = (startedAt?: number | null): string => {
    if (!startedAt) return '00:00';

    const elapsedMs = Math.max(0, timerNow - startedAt);
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatSummaryNames = (players: Types.Player[]) => players.map((player) => player.name).join(', ');

  // Returns the display name for a court, falling back to the translated label
  // if the stored name is empty or still the old default English format "Court N"
  const getCourtName = (courtNum: number): string => {
    const stored = (session.settings.courtNames ?? [])[courtNum - 1];
    if (!stored || /^Court\s+\d+$/i.test(stored.trim())) {
      return t('court.courtLabel', { num: courtNum });
    }
    return stored;
  };

  return (
    <div className="h-full overflow-auto bg-gray-50 p-4 flex flex-col gap-6 landscape:flex-row">
      {/* Left column: Players (30%) */}
      <div className={clsx('flex-none flex flex-col gap-4 landscape:border-r landscape:pr-6', leftPanelCollapsed ? 'w-full landscape:w-56' : 'w-full landscape:w-[30%]')}>

        {/* Collapsed state: just a big Generate button + expand toggle */}
        {leftPanelCollapsed ? (
          <div className="flex flex-col gap-3 items-stretch h-full">
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              className="w-full px-3 py-2 bg-gray-100 text-gray-600 border border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
              title={t('court.expandPanel')}
            >
              ▶
            </button>
            <button
              onClick={handleGenerateMatch}
              className="w-full flex-1 min-h-[60vh] px-4 py-6 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 active:scale-95 transition-all shadow-xl flex flex-col items-center justify-center gap-4"
            >
              <span className="text-7xl">⚡</span>
              <span className="text-2xl font-black text-center leading-tight">{t('court.generateMatch')}</span>
            </button>
            <button
              onClick={() => { setManualPickSelected([]); setShowManualPickModal(true); }}
              className="w-full px-4 py-4 bg-purple-100 text-purple-700 border border-purple-300 rounded-xl font-bold text-lg hover:bg-purple-200 transition-colors"
            >
              👥
            </button>
          </div>
        ) : (
          <>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{t('court.players')} ({session.players.length})</h2>
            <div className="flex items-center gap-2">
              {session.players.length > 0 && (
                <button
                  onClick={() => setShowPlayerManager(true)}
                  className="px-3 py-1.5 bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg font-semibold text-sm hover:bg-indigo-200 transition-colors"
                >
                  👥 {t('court.managePlayers')}
                </button>
              )}
              <button
                onClick={() => setLeftPanelCollapsed(true)}
                className="px-2 py-1.5 bg-gray-100 text-gray-500 border border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
                title={t('court.collapsePanel')}
              >
                ◀
              </button>
            </div>
          </div>

          {/* Show loaded roster name if any */}
          {session.loadedRosterName && (
            <div className="mb-2 text-sm text-blue-600 font-medium flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
              {t('court.loadedRosterLabel', { name: session.loadedRosterName })}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Player list */}
          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {session.players.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t('court.noPlayers')}</p>
            ) : (
              session.players.map((player) => (
                <div
                  key={player.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded border-2 transition-colors',
                    player.available
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-100 border-gray-300'
                  )}
                  style={player.color ? { backgroundColor: player.color + '66', borderColor: player.color } : undefined}
                >
                  <div className="flex-1">
                    {editingPlayerId === player.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => setEditingPlayerId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdatePlayerName(player.id);
                          if (e.key === 'Escape') setEditingPlayerId(null);
                        }}
                        className="w-full px-2 py-1 border rounded font-semibold text-sm"
                        style={player.color ? { backgroundColor: player.color + '33' } : undefined}
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-gray-800">
                          {player.name}
                        </div>
                        {session.settings.showPlayerScores && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                            {player.rankScore ?? 0} pts
                          </span>
                        )}
                        {!player.available && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                            {t('court.unavailable')}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingPlayerId(player.id);
                            setEditingName(player.name);
                          }}
                          className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-semibold"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setPairModalPlayerId(player.id)}
                          className={clsx(
                            'px-2 py-0.5 text-xs rounded font-semibold transition-colors',
                            player.preferredPartnerId
                              ? 'bg-violet-500 text-white hover:bg-violet-600'
                              : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                          )}
                          title={player.preferredPartnerId
                            ? t('court.pairTooltipActive', { name: playerMap.get(player.preferredPartnerId) ?? 'unknown' })
                            : t('court.pairTooltipNone')}
                        >
                          {player.preferredPartnerId ? t('court.pairActive') : t('court.pair')}
                        </button>
                        <button
                          onClick={() => setColorModalPlayerId(player.id)}
                          className="px-2 py-0.5 text-xs rounded font-semibold border border-gray-300 hover:bg-gray-100 transition-colors"
                          title={t('court.playerColorTooltip')}
                          style={player.color ? { backgroundColor: player.color, borderColor: player.color, color: '#374151' } : undefined}
                        >
                          🎨
                        </button>
                        {session.settings.doNotPairEnabled && (
                          <button
                            onClick={() => setDoNotPairModalPlayerId(player.id)}
                            className={clsx(
                              'px-2 py-0.5 text-xs rounded font-semibold transition-colors',
                              player.doNotPairWithIds?.length
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                            )}
                            title={t('court.doNotPairTooltip')}
                          >
                            ⛔
                          </button>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-600 mt-1">
                      {player.matchesPlayed} {t('court.matchesPlayed')} • {player.wins}{t('court.wins')} - {player.losses}{t('court.losses')}
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggleAvailability(player.id)}
                    className={clsx(
                      'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                      player.available
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-400 hover:bg-gray-500'
                    )}
                    title={player.available ? 'Click to make unavailable' : 'Click to make available'}
                  >
                    <span
                      className={clsx(
                        'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                        player.available ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlayer(player.id);
                    }}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    {t('court.remove')}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add player input */}
          {showAddPlayer ? (
            <div className="mb-3 space-y-2">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddPlayer();
                    if (e.key === 'Escape') {
                      setShowAddPlayer(false);
                      setNewPlayerName('');
                    }
                  }}
                  placeholder={t('court.enterPlayerName')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded"
                />
                <button
                  onClick={handleAddPlayer}
                  className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
                >
                  {t('court.add')}
                </button>
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  {t('court.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddPlayer(true)}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded font-bold text-lg hover:bg-blue-700"
              >
                + {t('court.addPlayer')}
              </button>
              <button
                onClick={() => setShowPickFromList(true)}
                className="px-4 py-3 bg-blue-100 text-blue-700 rounded font-bold text-lg hover:bg-blue-200 border border-blue-300"
                title={t('court.addFromList')}
              >
                ☆
              </button>
            </div>
          )}
        </div>

        {/* Match generation */}
        <div className="bg-white rounded-lg shadow p-4 space-y-2">
          <button
            onClick={handleGenerateMatch}
            className="w-full px-6 py-4 bg-indigo-600 text-white rounded font-bold text-xl hover:bg-indigo-700 transition-colors"
          >
            {t('court.generateMatch')}
          </button>
          <button
            onClick={() => { setManualPickSelected([]); setShowManualPickModal(true); }}
            className="w-full px-4 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded font-semibold hover:bg-purple-200 transition-colors"
          >
            👥 {t('court.pickMatch')}
          </button>
        </div>

        {/* Session controls */}
        <div className="bg-white rounded-lg shadow p-4 space-y-2">
          <button
            onClick={handleSaveRoster}
            className="w-full px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
          >
            💾 {t('court.saveRoster')}
          </button>
          <button
            onClick={() => setShowLoadRoster(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
          >
            📂 {t('court.loadRoster')}
          </button>
          <button
            onClick={handleStartOver}
            className="w-full px-4 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600"
          >
            {t('court.startOver')}
          </button>
        </div>
        </>
        )}
      </div>

      {/* Right column: Pending Matches / Court View (70%) */}
      <div className="flex-1 landscape:w-[70%] flex flex-col gap-4">
        {session.settings.courtViewEnabled ? (
          /* === COURT VIEW === */
          <>
            {/* Court cards grid */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{t('court.courtsTitle')}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleChangeNumberOfCourts(-1)}
                    disabled={(session.settings.numberOfCourts || 2) <= 1}
                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-lg flex items-center justify-center hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >−</button>
                  <span className="text-sm font-semibold text-gray-700 w-20 text-center">
                    {session.settings.numberOfCourts || 2} {t('court.courtsTitle').toLowerCase()}
                  </span>
                  <button
                    onClick={() => handleChangeNumberOfCourts(1)}
                    disabled={(session.settings.numberOfCourts || 2) >= 6}
                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-lg flex items-center justify-center hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >+</button>
                </div>
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${Math.min(session.settings.numberOfCourts || 2, 3)}, 1fr)` }}
              >
                {(() => {
                  const numCourts = session.settings.numberOfCourts || 2;
                  // Build ordered list of which courts are occupied (ascending)
                  const occupiedCourtNums = Array.from({ length: numCourts }, (_, i) => i + 1)
                    .filter(n => session.pendingMatches.some(m => m.courtNumber === n));
                  // Queued matches (no court assigned), in order
                  const queuedMatches = session.pendingMatches.filter(m => !m.courtNumber);
                  const strict = session.settings.strictCourtAutoFill ?? false;

                  return Array.from({ length: numCourts }, (_, i) => i + 1).map((courtNum) => {
                  const courtName = getCourtName(courtNum);
                  const assignedMatch = session.pendingMatches.find(
                    (m) => m.courtNumber === courtNum
                  );
                  // Each occupied court gets the next queued match in order of court number
                  const occupiedIndex = assignedMatch ? occupiedCourtNums.indexOf(courtNum) : -1;
                  let nextUp: Types.Match | undefined;
                  if (occupiedIndex >= 0) {
                    if (strict) {
                      // Only show a queued match whose targetCourtNumber matches this court
                      nextUp = queuedMatches.find(
                        m => m.targetCourtNumber === courtNum
                      );
                    } else {
                      nextUp = queuedMatches[occupiedIndex];
                    }
                  }
                  const scores = assignedMatch
                    ? scoreInput[assignedMatch.id] || { teamA: '', teamB: '' }
                    : { teamA: '', teamB: '' };

                  return (
                    <div
                      key={courtNum}
                      className={clsx(
                        'border-2 rounded-lg p-3 flex flex-col gap-2',
                        assignedMatch
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      )}
                    >
                      {/* Court header */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base text-gray-800">{courtName}</span>
                        {assignedMatch && (
                          <button
                            onClick={() => setCourtAssignMatchId(assignedMatch.id)}
                            className="text-xs px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-100"
                          >
                            {t('court.reassign')}
                          </button>
                        )}
                      </div>

                      {assignedMatch && session.settings.courtTimerEnabled && (
                        <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-white">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                            {t('court.timer')}
                          </span>
                          <span className="font-mono text-lg font-bold leading-none">
                            {formatElapsedTime(assignedMatch.courtAssignedAt ?? assignedMatch.createdAt)}
                          </span>
                        </div>
                      )}

                      {assignedMatch ? (
                        /* Match card inside court */
                        <>
                          {assignedMatch.isShowdown && (
                            <div className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 text-center mb-1">
                              ⚡ {t('court.showdown')}
                            </div>
                          )}
                          {assignedMatch.isShowdown && (
                            <div className="flex items-center justify-center gap-1 text-xs mb-2">
                              <span className="text-amber-700 font-semibold">{t('court.showdownInitiator')}</span>
                              <button
                                onClick={() => session.setShowdownInitiatorTeam(assignedMatch.id, assignedMatch.showdownInitiatorTeam === 'A' ? null : 'A')}
                                className={`px-2 py-0.5 rounded font-bold border text-xs transition ${assignedMatch.showdownInitiatorTeam === 'A' ? 'bg-amber-500 text-white border-amber-600' : 'bg-gray-100 text-gray-500 border-gray-300 hover:border-amber-400'}`}
                              >
                                {t('court.teamA')} ⚡
                              </button>
                              <button
                                onClick={() => session.setShowdownInitiatorTeam(assignedMatch.id, assignedMatch.showdownInitiatorTeam === 'B' ? null : 'B')}
                                className={`px-2 py-0.5 rounded font-bold border text-xs transition ${assignedMatch.showdownInitiatorTeam === 'B' ? 'bg-amber-500 text-white border-amber-600' : 'bg-gray-100 text-gray-500 border-gray-300 hover:border-amber-400'}`}
                              >
                                {t('court.teamB')} ⚡
                              </button>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-0.5">{t('court.teamA')}</div>
                              {assignedMatch.teamA.playerIds.map((id) => {
                                const color = playerColorMap.get(id);
                                return (
                                  <div key={id} className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                    {color && <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
                                    {playerMap.get(id)}
                                  </div>
                                );
                              })}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-0.5">{t('court.teamB')}</div>
                              {assignedMatch.teamB.playerIds.map((id) => {
                                const color = playerColorMap.get(id);
                                return (
                                  <div key={id} className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                    {color && <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
                                    {playerMap.get(id)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* Score row */}
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={scores.teamA}
                              onChange={(e) =>
                                setScoreInput((prev) => ({
                                  ...prev,
                                  [assignedMatch.id]: { ...scores, teamA: e.target.value },
                                }))
                              }
                              placeholder="A"
                              className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-semibold text-sm"
                            />
                            <span className="px-1 py-1 font-bold text-gray-500 text-sm">vs</span>
                            <input
                              type="number"
                              value={scores.teamB}
                              onChange={(e) =>
                                setScoreInput((prev) => ({
                                  ...prev,
                                  [assignedMatch.id]: { ...scores, teamB: e.target.value },
                                }))
                              }
                              placeholder="B"
                              className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-semibold text-sm"
                            />
                          </div>
                          {/* Shortcut score buttons - compact */}
                          {(session.settings.showScoreShortcuts ?? true) && (() => {
                            const sMin = session.settings.scoreShortcutMin ?? 15;
                            const sMax = session.settings.scoreShortcutMax ?? 25;
                            const nums = Array.from({ length: sMax - sMin + 1 }, (_, i) => sMin + i);
                            return (
                              <>
                                <div className="flex gap-0.5 flex-wrap">
                                  {nums.map((num) => (
                                    <button
                                      key={`a-${num}`}
                                      onClick={() => setScoreInput((prev) => ({
                                        ...prev,
                                        [assignedMatch.id]: { ...scores, teamA: num.toString() },
                                      }))}
                                      className={clsx(
                                        'px-2 py-1 rounded text-sm font-bold text-white transition',
                                        num === 21 ? 'bg-green-600 hover:bg-green-700 scale-110' : 'bg-green-500 hover:bg-green-600'
                                      )}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-0.5 flex-wrap">
                                  {nums.map((num) => (
                                    <button
                                      key={`b-${num}`}
                                      onClick={() => setScoreInput((prev) => ({
                                        ...prev,
                                        [assignedMatch.id]: { ...scores, teamB: num.toString() },
                                      }))}
                                      className={clsx(
                                        'px-2 py-1 rounded text-sm font-bold text-white transition',
                                        num === 21 ? 'bg-orange-600 hover:bg-orange-700 scale-110' : 'bg-orange-500 hover:bg-orange-600'
                                      )}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                          <div className="flex gap-1">
                            <button
                              onClick={() => session.toggleShowdownMode(assignedMatch.id)}
                              title={t('court.showdown')}
                              className={`px-2 py-1.5 rounded text-sm font-bold border transition ${assignedMatch.isShowdown ? 'bg-amber-400 text-white border-amber-500' : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-amber-50 hover:text-amber-600'}`}
                            >
                              ⚡
                            </button>
                            <button
                              onClick={() => handleCompleteMatch(assignedMatch.id)}
                              className="flex-1 px-2 py-1.5 bg-green-600 text-white rounded font-semibold text-sm hover:bg-green-700"
                            >
                              {t('court.done')}
                            </button>
                            <button
                              onClick={() => handleDeleteMatch(assignedMatch.id)}
                              className="px-2 py-1.5 bg-red-500 text-white rounded font-semibold text-sm hover:bg-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400 italic py-2 text-center">{t('court.courtEmpty')}</div>
                      )}

                      {/* Up next / per-court queue */}
                      {strict ? (() => {
                        const courtQueue = queuedMatches.filter(m => m.targetCourtNumber === courtNum);
                        if (courtQueue.length === 0) return null;
                        return (
                          <div className="mt-1 pt-2 border-t border-gray-200">
                            <div className="text-xs font-semibold text-gray-500 mb-1">{t('court.upNext')} ({courtQueue.length})</div>
                            <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: '5rem' }}>
                              {courtQueue.map((m, idx) => (
                                <div key={m.id} className="text-xs text-gray-600 flex items-start gap-1">
                                  <span className="text-gray-400 shrink-0">{idx + 1}.</span>
                                  <span>
                                    {m.teamA.playerIds.map(id => playerMap.get(id)).join(' & ')}
                                    {' vs '}
                                    {m.teamB.playerIds.map(id => playerMap.get(id)).join(' & ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })() : (nextUp && (
                        <div className="mt-1 pt-2 border-t border-gray-200">
                          <div className="text-xs font-semibold text-gray-500 mb-0.5">{t('court.upNext')}</div>
                          <div className="text-xs text-gray-600">
                            {nextUp.teamA.playerIds.map((id) => playerMap.get(id)).join(' & ')}
                            {' vs '}
                            {nextUp.teamB.playerIds.map((id) => playerMap.get(id)).join(' & ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                  });
                })()}
              </div>
            </div>

            {/* Queue: unassigned matches */}
            {(() => {
              const strict = session.settings.strictCourtAutoFill ?? false;
              const queueCount = session.pendingMatches.filter(m => !m.courtNumber).length;
              const queueVisible = !strict || showFullQueue;
              return (
                <div className="bg-white rounded-lg shadow p-4 flex-1 overflow-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold text-gray-800">
                      {t('court.queue')}{queueCount > 0 ? ` (${queueCount})` : ''}
                    </h2>
                    {strict && (
                      <button
                        onClick={() => setShowFullQueue(prev => !prev)}
                        className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 font-medium"
                      >
                        {showFullQueue ? t('court.hideQueue') : t('court.showQueue')}
                      </button>
                    )}
                  </div>
                  {queueVisible && (
                    queueCount === 0 ? (
                      <p className="text-gray-500 text-center py-4">{t('court.queueEmpty')}</p>
                    ) : (
                  <div className="space-y-3">
                  {(() => {
                    const numCourts = session.settings.numberOfCourts || 2;
                    const allCourtNums = Array.from({ length: numCourts }, (_, i) => i + 1);
                    const emptyCourts = allCourtNums.filter(n => !session.pendingMatches.some(m => m.courtNumber === n));
                    const occupiedCourts = allCourtNums.filter(n => session.pendingMatches.some(m => m.courtNumber === n));
                    const strict = session.settings.strictCourtAutoFill ?? false;
                    const queuedMatches = session.pendingMatches.filter(m => !m.courtNumber);
                    return queuedMatches.map((match, queueIndex) => {
                      // Determine which court this match is heading to
                      let nextCourtNum: number | null = null;
                      if (strict && match.targetCourtNumber != null) {
                        // Strict mode: always show the designated target court
                        nextCourtNum = match.targetCourtNumber;
                      } else if (queueIndex < emptyCourts.length) {
                        nextCourtNum = emptyCourts[queueIndex];
                      } else {
                        const occupiedIdx = queueIndex - emptyCourts.length;
                        if (occupiedIdx < occupiedCourts.length) {
                          nextCourtNum = occupiedCourts[occupiedIdx];
                        }
                      }
                      const nextCourtLabel = nextCourtNum !== null ? getCourtName(nextCourtNum) : null;
                      const courtIsEmpty = nextCourtNum !== null && emptyCourts.includes(nextCourtNum);
                      const scores = scoreInput[match.id] || { teamA: '', teamB: '' };
                      return (
                        <div key={match.id} className="border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <div className="text-sm text-gray-600">
                                <span className="font-semibold">{playerMap.get(match.teamA.playerIds[0])} & {playerMap.get(match.teamA.playerIds[1])}</span>
                                {' vs '}
                                <span className="font-semibold">{playerMap.get(match.teamB.playerIds[0])} & {playerMap.get(match.teamB.playerIds[1])}</span>
                              </div>
                              {nextCourtLabel && (
                                <span className={clsx(
                                  'text-xs px-2 py-0.5 rounded-full font-semibold border whitespace-nowrap',
                                  courtIsEmpty
                                    ? 'bg-green-50 text-green-700 border-green-300'
                                    : 'bg-amber-50 text-amber-700 border-amber-300'
                                )}>
                                  {courtIsEmpty ? `→ ${nextCourtLabel}` : `⏳ ${nextCourtLabel}`}
                                </span>
                              )}
                              {match.isShowdown && (
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  ⚡ {t('court.showdown')}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => session.toggleShowdownMode(match.id)}
                                title={t('court.showdown')}
                                className={`text-xs px-2 py-1 rounded font-bold border transition ${match.isShowdown ? 'bg-amber-400 text-white border-amber-500' : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-amber-50 hover:text-amber-600'}`}
                              >
                                ⚡
                              </button>
                              <button
                                onClick={() => setCourtAssignMatchId(match.id)}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-semibold"
                              >
                                {t('court.assignCourt')}
                              </button>
                              <button
                                onClick={() => handleDeleteMatch(match.id)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {match.isShowdown && (
                            <div className="flex items-center gap-1 text-xs mb-2">
                              <span className="text-amber-700 font-semibold">{t('court.showdownInitiator')}</span>
                              <button
                                onClick={() => session.setShowdownInitiatorTeam(match.id, match.showdownInitiatorTeam === 'A' ? null : 'A')}
                                className={`px-2 py-0.5 rounded font-bold border text-xs transition ${match.showdownInitiatorTeam === 'A' ? 'bg-amber-500 text-white border-amber-600' : 'bg-gray-100 text-gray-500 border-gray-300 hover:border-amber-400'}`}
                              >
                                {t('court.teamA')} ⚡
                              </button>
                              <button
                                onClick={() => session.setShowdownInitiatorTeam(match.id, match.showdownInitiatorTeam === 'B' ? null : 'B')}
                                className={`px-2 py-0.5 rounded font-bold border text-xs transition ${match.showdownInitiatorTeam === 'B' ? 'bg-amber-500 text-white border-amber-600' : 'bg-gray-100 text-gray-500 border-gray-300 hover:border-amber-400'}`}
                              >
                                {t('court.teamB')} ⚡
                              </button>
                            </div>
                          )}
                          {/* Score entry for queued matches */}
                          <div className="flex gap-1 mb-1">
                            <input type="number" value={scores.teamA}
                              onChange={(e) => setScoreInput((prev) => ({ ...prev, [match.id]: { ...scores, teamA: e.target.value } }))}
                              placeholder="A" className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-semibold text-sm" />
                            <span className="px-1 py-1 font-bold text-gray-500 text-sm">vs</span>
                            <input type="number" value={scores.teamB}
                              onChange={(e) => setScoreInput((prev) => ({ ...prev, [match.id]: { ...scores, teamB: e.target.value } }))}
                              placeholder="B" className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-semibold text-sm" />
                            <button onClick={() => handleCompleteMatch(match.id)}
                              className="ml-1 px-3 py-1 bg-green-600 text-white rounded font-semibold text-sm hover:bg-green-700">
                              {t('court.done')}
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  </div>
                  ))}
                </div>
              );
            })()}
          </>
        ) : (
          /* === FLAT LIST VIEW (original) === */
          <div className="bg-white rounded-lg shadow p-4 flex-1 overflow-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{t('court.pendingMatches')}</h2>

            {session.pendingMatches.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('court.noPendingMatches')}</p>
            ) : (
              <div className="space-y-3">
                {session.pendingMatches.map((match) => {
                  const scores = scoreInput[match.id] || { teamA: '', teamB: '' };

                  return (
                    <div
                      key={match.id}
                      className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50"
                    >
                      {match.isShowdown && (
                        <div className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 text-center mb-2">
                          ⚡ {t('court.showdown')}
                        </div>
                      )}
                      {match.isShowdown && (
                        <div className="flex items-center justify-center gap-1 text-xs mb-2">
                          <span className="text-amber-700 font-semibold">{t('court.showdownInitiator')}</span>
                          <button
                            onClick={() => session.setShowdownInitiatorTeam(match.id, match.showdownInitiatorTeam === 'A' ? null : 'A')}
                            className={`px-2 py-0.5 rounded font-bold border text-xs transition ${match.showdownInitiatorTeam === 'A' ? 'bg-amber-500 text-white border-amber-600' : 'bg-gray-100 text-gray-500 border-gray-300 hover:border-amber-400'}`}
                          >
                            {t('court.teamA')} ⚡
                          </button>
                          <button
                            onClick={() => session.setShowdownInitiatorTeam(match.id, match.showdownInitiatorTeam === 'B' ? null : 'B')}
                            className={`px-2 py-0.5 rounded font-bold border text-xs transition ${match.showdownInitiatorTeam === 'B' ? 'bg-amber-500 text-white border-amber-600' : 'bg-gray-100 text-gray-500 border-gray-300 hover:border-amber-400'}`}
                          >
                            {t('court.teamB')} ⚡
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-600 mb-1">{t('court.teamA')}</div>
                          <div className="space-y-1">
                            {match.teamA.playerIds.map((id) => {
                              const color = playerColorMap.get(id);
                              return (
                                <div key={id} className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                  {color && <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
                                  {playerMap.get(id)}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-gray-600 mb-1">{t('court.teamB')}</div>
                          <div className="space-y-1">
                            {match.teamB.playerIds.map((id) => {
                              const color = playerColorMap.get(id);
                              return (
                                <div key={id} className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                  {color && <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
                                  {playerMap.get(id)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Score entry */}
                      <div className="flex gap-2 mb-3">
                        <input
                          type="number"
                          value={scores.teamA}
                          onChange={(e) =>
                            setScoreInput((prev) => ({
                              ...prev,
                              [match.id]: { ...scores, teamA: e.target.value },
                            }))
                          }
                          placeholder={t('court.teamAScore')}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-center font-semibold"
                        />
                        <span className="px-2 py-2 font-bold text-gray-600">vs</span>
                        <input
                          type="number"
                          value={scores.teamB}
                          onChange={(e) =>
                            setScoreInput((prev) => ({
                              ...prev,
                              [match.id]: { ...scores, teamB: e.target.value },
                            }))
                          }
                          placeholder={t('court.teamBScore')}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-center font-semibold"
                        />
                      </div>

                      {/* Preset score buttons for Team A */}
                      {(session.settings.showScoreShortcuts ?? true) && (() => {
                        const sMin = session.settings.scoreShortcutMin ?? 15;
                        const sMax = session.settings.scoreShortcutMax ?? 25;
                        const nums = Array.from({ length: sMax - sMin + 1 }, (_, i) => sMin + i);
                        return (
                          <>
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-600 mb-1">Team A Shortcuts:</p>
                              <div className="flex gap-1 flex-wrap items-center">
                                {nums.map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    className={num === 21 ? "px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-lg font-bold shadow-sm transition scale-110" : "px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-base font-bold shadow-sm transition"}
                                    onClick={() => setScoreInput((prev) => ({
                                      ...prev,
                                      [match.id]: { ...scores, teamA: num.toString() },
                                    }))}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-600 mb-1">Team B Shortcuts:</p>
                              <div className="flex gap-1 flex-wrap items-center">
                                {nums.map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    className={num === 21 ? "px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-lg font-bold shadow-sm transition scale-110" : "px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-base font-bold shadow-sm transition"}
                                    onClick={() => setScoreInput((prev) => ({
                                      ...prev,
                                      [match.id]: { ...scores, teamB: num.toString() },
                                    }))}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => session.toggleShowdownMode(match.id)}
                          title={t('court.showdown')}
                          className={`px-3 py-2 rounded font-bold border transition ${match.isShowdown ? 'bg-amber-400 text-white border-amber-500' : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-amber-50 hover:text-amber-600'}`}
                        >
                          ⚡
                        </button>
                        <button
                          onClick={() => handleCompleteMatch(match.id)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
                        >
                          {t('court.done')}
                        </button>
                        <button
                          onClick={() => handleDeleteMatch(match.id)}
                          className="px-3 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Pick Match Modal */}
      {showManualPickModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">{t('court.pickMatchTitle')}</h3>
            <p className="text-sm text-gray-500">{t('court.pickMatchDesc')}</p>
            {/* Player pills */}
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {session.players.map(player => {
                const idx = manualPickSelected.indexOf(player.id);
                const selected = idx !== -1;
                const isTeamA = selected && idx < 2;
                return (
                  <button
                    key={player.id}
                    onClick={() => {
                      if (selected) {
                        setManualPickSelected(prev => prev.filter(id => id !== player.id));
                      } else if (manualPickSelected.length < 4) {
                        setManualPickSelected(prev => [...prev, player.id]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      isTeamA
                        ? 'bg-blue-500 text-white border-blue-600'
                        : selected
                        ? 'bg-orange-500 text-white border-orange-600'
                        : manualPickSelected.length >= 4
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {player.name}
                    {selected && <span className="ml-1 text-xs font-bold">{isTeamA ? 'A' : 'B'}{(idx % 2) + 1}</span>}
                  </button>
                );
              })}
            </div>
            {/* Team preview */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-blue-50 rounded p-2 border border-blue-200">
                <div className="font-semibold text-blue-700 mb-1">{t('court.teamA')}</div>
                {[0, 1].map(i => (
                  <div key={i} className="text-gray-700">
                    {manualPickSelected[i] ? playerMap.get(manualPickSelected[i]) : <span className="text-gray-400">—</span>}
                  </div>
                ))}
              </div>
              <div className="bg-orange-50 rounded p-2 border border-orange-200">
                <div className="font-semibold text-orange-700 mb-1">{t('court.teamB')}</div>
                {[2, 3].map(i => (
                  <div key={i} className="text-gray-700">
                    {manualPickSelected[i] ? playerMap.get(manualPickSelected[i]) : <span className="text-gray-400">—</span>}
                  </div>
                ))}
              </div>
            </div>
            {/* Swap button */}
            {manualPickSelected.length >= 2 && (
              <button
                onClick={() => setManualPickSelected(prev => [...prev.slice(2, 4), ...prev.slice(0, 2)])}
                className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded text-sm font-medium hover:bg-gray-200"
              >
                🔄 {t('court.pickMatchSwap')}
              </button>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleManualPickCreate}
                disabled={manualPickSelected.length !== 4}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('court.pickMatchCreate')} {manualPickSelected.length < 4 && `(${manualPickSelected.length}/4)`}
              </button>
              <button
                onClick={() => { setShowManualPickModal(false); setManualPickSelected([]); }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-semibold"
              >
                {t('court.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pick From Recent Players Modal */}
      {showPickFromList && (() => {
        const hasNoMatches = session.pendingMatches.length === 0 && session.completedMatches.length === 0;
        const currentNames = new Set(session.players.map(p => p.name.toLowerCase()));
        const filtered = recentPlayers.filter(name =>
          name.toLowerCase().includes(pickFromListFilter.toLowerCase())
        );
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-800">{t('court.addFromList')}</h3>
              <input
                autoFocus
                value={pickFromListFilter}
                onChange={e => setPickFromListFilter(e.target.value)}
                placeholder={t('court.enterPlayerName')}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              {pickFromListWarning && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  {pickFromListWarning}
                </p>
              )}
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 w-full text-center py-4">{t('court.noPlayers')}</p>
                ) : filtered.map(name => {
                  const alreadyAdded = currentNames.has(name.toLowerCase());
                  const canRemove = hasNoMatches && alreadyAdded;
                  const lockedAdded = !hasNoMatches && alreadyAdded;
                  return (
                    <button
                      key={name}
                      onClick={async () => {
                        if (canRemove) {
                          const player = session.players.find(p => p.name.toLowerCase() === name.toLowerCase());
                          if (player) await handleRemovePlayer(player.id);
                        } else if (lockedAdded) {
                          setPickFromListWarning(t('court.cannotRemoveHasMatches'));
                        } else {
                          setPickFromListWarning(null);
                          await session.addPlayer(name);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        canRemove
                          ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100 cursor-pointer'
                          : lockedAdded
                          ? 'bg-green-100 text-green-700 border-green-300 cursor-pointer hover:bg-green-200'
                          : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer'
                      }`}
                    >
                      {name}
                      {canRemove && <span className="ml-1">✕</span>}
                      {lockedAdded && <span className="ml-1">✓</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => { setShowPickFromList(false); setPickFromListFilter(''); setPickFromListWarning(null); }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-semibold"
              >
                {t('court.close')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Save Roster Modal */}
      {showSaveRoster && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">{t('court.saveRosterTitle')}</h3>
            <p className="text-sm text-gray-600">{t('court.saveRosterDesc')}</p>

            <input
              autoFocus
              type="text"
              value={rosterName}
              onChange={(e) => setRosterName(e.target.value)}
              placeholder={t('court.rosterNamePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRosterConfirm();
                if (e.key === 'Escape') {
                  setShowSaveRoster(false);
                  setRosterName('');
                }
              }}
            />

            <div className="flex gap-2">
              <button
                onClick={handleSaveRosterConfirm}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                {t('court.save')}
              </button>
              <button
                onClick={() => {
                  setShowSaveRoster(false);
                  setRosterName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t('court.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Roster Prompt */}
      {showOverwritePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">{t('court.overwriteTitle')}</h3>
            <p className="text-sm text-gray-600">
              {t('court.overwriteDesc', { name: overwriteRosterName })}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleOverwriteRoster}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
              >
                {t('court.overwriteButton', { name: overwriteRosterName })}
              </button>
              <button
                onClick={handleSaveAsNewRoster}
                className="w-full px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                {t('court.saveAsNewButton')}
              </button>
              <button
                onClick={() => {
                  setShowOverwritePrompt(false);
                  setOverwriteRosterName(null);
                }}
                className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t('court.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Roster Modal */}
      {showLoadRoster && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800">{t('court.loadRosterTitle')}</h3>

            {presets.length === 0 ? (
              <p className="text-sm text-gray-600">{t('court.noRosters')}</p>
            ) : (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{preset.name}</div>
                      <div className="text-xs text-gray-600">
                        {preset.players.length} {t('court.players')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleShowLoadRosterWarning(preset.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {t('court.load')}
                      </button>
                      <button
                        onClick={() => handleDeleteRoster(preset.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowLoadRoster(false)}
              className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              {t('court.close')}
            </button>
          </div>
        </div>
      )}

      {/* Court Assign Modal */}
      {courtAssignMatchId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-xs w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">{t('court.assignCourtTitle')}</h3>
            <p className="text-sm text-gray-500">{t('court.assignCourtDesc')}</p>
            <div className="space-y-2">
              {Array.from({ length: session.settings.numberOfCourts || 2 }, (_, i) => i + 1).map((courtNum) => {
                const courtName = getCourtName(courtNum);
                const isOccupied =
                  session.pendingMatches.some(
                    (m) => m.courtNumber === courtNum && m.id !== courtAssignMatchId
                  );
                return (
                  <button
                    key={courtNum}
                    disabled={isOccupied}
                    onClick={() => handleAssignCourt(courtAssignMatchId, courtNum)}
                    className={clsx(
                      'w-full px-4 py-3 rounded font-semibold text-left transition-colors',
                      isOccupied
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    )}
                  >
                    {courtName}
                    {isOccupied && <span className="text-xs ml-2 opacity-75">({t('court.courtOccupied')})</span>}
                  </button>
                );
              })}
              <button
                onClick={() => handleAssignCourt(courtAssignMatchId, null)}
                className="w-full px-4 py-3 rounded font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {t('court.moveToQueue')}
              </button>
            </div>
            <button
              onClick={() => setCourtAssignMatchId(null)}
              className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              {t('court.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Pair Selection Modal */}
      {pairModalPlayerId && (() => {
        const currentPlayer = session.players.find(p => p.id === pairModalPlayerId);
        if (!currentPlayer) return null;
        const otherPlayers = session.players.filter(p => p.id !== pairModalPlayerId);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800">
                {t('court.pairModalTitle', { name: currentPlayer.name })}
              </h3>
              <p className="text-sm text-gray-500">
                {t('court.pairModalDesc')}
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                {t('court.pairOneDirectional')}
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {otherPlayers.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('court.pairNoOtherPlayers')}</p>
                ) : (
                  otherPlayers.map(partner => {
                    const isSelected = currentPlayer.preferredPartnerId === partner.id;
                    return (
                      <button
                        key={partner.id}
                        onClick={() => handleSetPairPreference(
                          pairModalPlayerId,
                          isSelected ? null : partner.id
                        )}
                        className={clsx(
                          'w-full px-4 py-3 rounded font-semibold text-left flex items-center justify-between transition-colors',
                          isSelected
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        )}
                      >
                        <span>{partner.name}</span>
                        {isSelected && <span className="text-sm opacity-90">{t('court.pairPaired')}</span>}
                      </button>
                    );
                  })
                )}
              </div>
              {currentPlayer.preferredPartnerId && (
                <button
                  onClick={() => handleSetPairPreference(pairModalPlayerId, null)}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded font-semibold hover:bg-red-200"
                >
                  {t('court.pairClear')}
                </button>
              )}
              <button
                onClick={() => setPairModalPlayerId(null)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t('court.pairClose')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Color picker modal */}
      {colorModalPlayerId && (() => {
        const currentPlayer = session.players.find(p => p.id === colorModalPlayerId);
        if (!currentPlayer) return null;
        const COLOR_PALETTE = [
          { label: t('court.colorNone'), value: null },
          { label: '🔴', value: '#fca5a5' },
          { label: '🟠', value: '#fdba74' },
          { label: '🟡', value: '#fde68a' },
          { label: '🟢', value: '#86efac' },
          { label: '🔵', value: '#93c5fd' },
          { label: '🟣', value: '#c4b5fd' },
          { label: '🩷', value: '#f9a8d4' },
          { label: '⬜', value: '#d1d5db' },
        ];
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-xs w-full p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800">
                {t('court.playerColorTitle', { name: currentPlayer.name })}
              </h3>
              <p className="text-sm text-gray-500">{t('court.playerColorDesc')}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {COLOR_PALETTE.map((swatch) => (
                  <button
                    key={swatch.value ?? 'none'}
                    onClick={async () => {
                      await session.setPlayerColor(colorModalPlayerId, swatch.value);
                      setColorModalPlayerId(null);
                    }}
                    className={clsx(
                      'w-10 h-10 rounded-full border-4 text-lg flex items-center justify-center transition-transform hover:scale-110',
                      currentPlayer.color === swatch.value
                        ? 'border-blue-600 scale-110'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: swatch.value ?? '#f3f4f6' }}
                    title={swatch.label}
                  >
                    {swatch.value === null ? '✕' : ''}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setColorModalPlayerId(null)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t('court.cancel')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Do-not-pair modal */}
      {doNotPairModalPlayerId && (() => {
        const currentPlayer = session.players.find(p => p.id === doNotPairModalPlayerId);
        if (!currentPlayer) return null;
        const otherPlayers = session.players.filter(p => p.id !== doNotPairModalPlayerId);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800">
                {t('court.doNotPairTitle', { name: currentPlayer.name })}
              </h3>
              <p className="text-sm text-gray-500">{t('court.doNotPairDesc')}</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {otherPlayers.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('court.pairNoOtherPlayers')}</p>
                ) : (
                  otherPlayers.map(other => {
                    const isBlocked = currentPlayer.doNotPairWithIds?.includes(other.id) ?? false;
                    return (
                      <button
                        key={other.id}
                        onClick={() => session.setPlayerDoNotPair(doNotPairModalPlayerId, other.id)}
                        className={clsx(
                          'w-full px-4 py-3 rounded font-semibold text-left flex items-center justify-between transition-colors',
                          isBlocked
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        )}
                      >
                        <span>{other.name}</span>
                        {isBlocked && <span className="text-sm opacity-90">⛔</span>}
                      </button>
                    );
                  })
                )}
              </div>
              {(currentPlayer.doNotPairWithIds?.length ?? 0) > 0 && (
                <button
                  onClick={() => session.setPlayerDoNotPair(doNotPairModalPlayerId, null)}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded font-semibold hover:bg-red-200"
                >
                  {t('court.doNotPairClearAll')}
                </button>
              )}
              <button
                onClick={() => setDoNotPairModalPlayerId(null)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t('court.doNotPairClose')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Start Over Modal */}
      {showStartOverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">{t('court.startOverTitle')}</h3>
            <p className="text-sm text-gray-600">{t('court.startOverDesc')}</p>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-blue-900">{t('court.sessionSummaryTitle')}</p>
                <p className="text-xs text-blue-700 mt-1">
                  {t('court.sessionSummarySubtitle', { matches: session.completedMatches.length })}
                </p>
              </div>

              {sessionSummary.hasMatches ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-white/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {t('court.summaryMostWins')}
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-800">
                      {formatSummaryNames(sessionSummary.mostWins.players)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {t('court.summaryWinsValue', { count: sessionSummary.mostWins.value })}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {t('court.summaryHighestScore')}
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-800">
                      {formatSummaryNames(sessionSummary.highestScore.players)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {t('court.summaryScoreValue', { count: sessionSummary.highestScore.value })}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {t('court.summaryMostMatches')}
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-800">
                      {formatSummaryNames(sessionSummary.mostMatches.players)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {t('court.summaryMatchesValue', { count: sessionSummary.mostMatches.value })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-white/80 p-3 text-sm text-gray-600">
                  {t('court.sessionSummaryEmpty')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => doStartOver(false)}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600"
              >
                {t('court.startOverMatchesOnly')}
              </button>
              <button
                onClick={() => doStartOver(true)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
              >
                {t('court.startOverWithPlayers')}
              </button>
              <button
                onClick={() => setShowStartOverModal(false)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t('court.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Roster Warning Modal */}
      {showLoadRosterWarning && (        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">{t('court.loadRosterConfirmTitle')}</h3>
            <p className="text-sm text-gray-600">
              {t('court.loadRosterConfirmDesc')}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmLoadRoster}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
              >
                {t('court.loadRoster')}
              </button>
              <button
                onClick={() => {
                  setShowLoadRosterWarning(false);
                  setPendingRosterId(null);
                }}
                className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t('court.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Player Manager Modal ===== */}
      {showPlayerManager && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                👥 {t('court.managePlayers')} ({session.players.length})
              </h2>
              <button
                onClick={() => setShowPlayerManager(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Player table */}
            <div className="overflow-y-auto flex-1 px-4 py-3">
              {session.players.length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t('court.noPlayers')}</p>
              ) : (
                <div className="space-y-2">
                  {session.players.map((player) => (
                    <div
                      key={player.id}
                      className={clsx(
                        'flex items-center gap-3 p-3 rounded-lg border-2 transition-colors',
                        player.available ? 'bg-green-50 border-green-300' : 'bg-gray-100 border-gray-300'
                      )}
                      style={player.color ? { backgroundColor: player.color + '44', borderColor: player.color } : undefined}
                    >
                      {/* Name / inline edit */}
                      <div className="flex-1 min-w-0">
                        {managerEditingId === player.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={managerEditingName}
                              onChange={(e) => setManagerEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  session.updatePlayerName(player.id, managerEditingName);
                                  setManagerEditingId(null);
                                }
                                if (e.key === 'Escape') setManagerEditingId(null);
                              }}
                              className="flex-1 px-2 py-1 border-2 border-blue-400 rounded font-semibold text-sm min-w-0"
                            />
                            <button
                              onClick={() => {
                                session.updatePlayerName(player.id, managerEditingName);
                                setManagerEditingId(null);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex-shrink-0"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setManagerEditingId(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300 flex-shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800 text-base">{player.name}</span>
                            {session.settings.showPlayerScores && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                                {player.rankScore ?? 0} pts
                              </span>
                            )}
                            {!player.available && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                {t('court.unavailable')}
                              </span>
                            )}
                            {player.preferredPartnerId && (
                              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded">
                                🤝 {playerMap.get(player.preferredPartnerId) ?? '?'}
                              </span>
                            )}
                            {player.doNotPairWithIds?.length ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                ⛔ {player.doNotPairWithIds.length}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                        {/* Edit name */}
                        <button
                          onClick={() => { setManagerEditingId(player.id); setManagerEditingName(player.name); }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-semibold"
                          title="Edit name"
                        >
                          ✏️
                        </button>

                        {/* Preferred pair */}
                        <button
                          onClick={() => setPairModalPlayerId(player.id)}
                          className={clsx(
                            'px-2 py-1 text-xs rounded font-semibold transition-colors',
                            player.preferredPartnerId
                              ? 'bg-violet-500 text-white hover:bg-violet-600'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          )}
                          title={player.preferredPartnerId
                            ? t('court.pairTooltipActive', { name: playerMap.get(player.preferredPartnerId) ?? 'unknown' })
                            : t('court.pairTooltipNone')}
                        >
                          🤝
                        </button>

                        {/* Color */}
                        <button
                          onClick={() => setColorModalPlayerId(player.id)}
                          className="px-2 py-1 text-xs rounded font-semibold border border-gray-300 hover:bg-gray-100 transition-colors"
                          title={t('court.playerColorTooltip')}
                          style={player.color ? { backgroundColor: player.color, borderColor: player.color } : undefined}
                        >
                          🎨
                        </button>

                        {/* Do-not-pair */}
                        {session.settings.doNotPairEnabled && (
                          <button
                            onClick={() => setDoNotPairModalPlayerId(player.id)}
                            className={clsx(
                              'px-2 py-1 text-xs rounded font-semibold transition-colors',
                              player.doNotPairWithIds?.length
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                            )}
                            title={t('court.doNotPairTooltip')}
                          >
                            ⛔
                          </button>
                        )}

                        {/* Enable / Disable toggle */}
                        <button
                          onClick={async () => {
                            try { await session.togglePlayerAvailability(player.id); }
                            catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
                          }}
                          className={clsx(
                            'px-2 py-1 text-xs rounded font-semibold transition-colors',
                            player.available
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          )}
                        >
                          {player.available ? t('court.disable') : t('court.enable')}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleRemovePlayer(player.id)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
                        >
                          {t('court.remove')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setShowPlayerManager(false)}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
              >
                {t('court.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
