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
import clsx from 'clsx';

export default function CourtPage() {
  const { t } = useTranslation();
  const session = useSessionContext();
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<Record<string, { teamA: string; teamB: string }>>({});

  // Preset state
  const [presets, setPresets] = useState<Types.Preset[]>([]);
  const [showSaveRoster, setShowSaveRoster] = useState(false);
  const [rosterName, setRosterName] = useState('');
  const [showLoadRoster, setShowLoadRoster] = useState(false);
  const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);
  const [loadedRosterName, setLoadedRosterName] = useState<string | null>(null);

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

    if (!confirm('Remove this player?')) return;

    try {
      await session.removePlayer(id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove player');
    }
  };

  const handleGenerateMatch = async () => {
    try {
      await session.generateMatch();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate match');
    }
  };

  const handleCompleteMatch = async (matchId: string) => {
    const scores = scoreInput[matchId];
    if (!scores || !scores.teamA || !scores.teamB) {
      setError('Both scores required');
      return;
    }

    const teamAScore = parseInt(scores.teamA, 10);
    const teamBScore = parseInt(scores.teamB, 10);

    if (isNaN(teamAScore) || isNaN(teamBScore)) {
      setError('Scores must be numeric');
      return;
    }

    if (teamAScore === teamBScore) {
      setError('Scores cannot be tied');
      return;
    }

    try {
      await session.completeMatch(matchId, teamAScore, teamBScore);
      setScoreInput((prev) => {
        const updated = { ...prev };
        delete updated[matchId];
        return updated;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete match');
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Delete this pending match?')) return;

    try {
      await session.deleteMatch(matchId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete match');
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
            setLoadedRosterName(loadedPreset.name);
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
      setLoadedRosterName(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to overwrite roster');
    }
  };

  const handleSaveAsNewRoster = async () => {
    setShowOverwritePrompt(false);
    setLoadedRosterName(null);
    setShowSaveRoster(true);
  };

  const handleSaveRosterConfirm = async () => {
    if (!rosterName.trim()) {
      setError('Roster name cannot be empty');
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
      setError(err instanceof Error ? err.message : 'Failed to save roster');
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
      setError(err instanceof Error ? err.message : 'Failed to load roster');
    }
  };

  const handleDeleteRoster = async (presetId: string) => {
    if (!confirm('Delete this roster?')) return;

    try {
      await DB.deletePreset(presetId);
      const loaded = await DB.getAllPresets();
      setPresets(loaded);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete roster');
    }
  };

  const handleStartOver = async () => {
    if (!confirm('Reset session? This will clear pending matches and reset all player stats.')) return;

    try {
      await session.startOver();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start over');
    }
  };

  const playerMap = new Map(session.players.map((p) => [p.id, p.name]));

  return (
    <div className="h-full overflow-auto bg-gray-50 p-4 flex flex-col gap-6 landscape:flex-row">
      {/* Left column: Players */}
      <div className="flex-1 flex flex-col gap-4 landscape:border-r landscape:pr-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">{t('court.players')} ({session.players.length})</h2>

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
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-800">
                          {player.name}
                        </div>
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
            <div className="flex gap-2 mb-3">
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
          ) : (
            <button
              onClick={() => setShowAddPlayer(true)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded font-bold text-lg hover:bg-blue-700"
            >
              + {t('court.addPlayer')}
            </button>
          )}
        </div>

        {/* Match generation */}
        <div className="bg-white rounded-lg shadow p-4">
          <button
            onClick={handleGenerateMatch}
            className="w-full px-6 py-4 bg-indigo-600 text-white rounded font-bold text-xl hover:bg-indigo-700 transition-colors"
          >
            {t('court.generateMatch')}
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
      </div>

      {/* Right column: Pending Matches */}
      <div className="flex-1 flex flex-col gap-4">
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
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-600 mb-1">{t('court.teamA')}</div>
                        <div className="space-y-1">
                          {match.teamA.playerIds.map((id) => (
                            <div key={id} className="text-sm font-semibold text-gray-800">
                              {playerMap.get(id)}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-600 mb-1">{t('court.teamB')}</div>
                        <div className="space-y-1">
                          {match.teamB.playerIds.map((id) => (
                            <div key={id} className="text-sm font-semibold text-gray-800">
                              {playerMap.get(id)}
                            </div>
                          ))}
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

                    {/* Action buttons */}
                    <div className="flex gap-2">
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
      </div>

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
            <h3 className="text-xl font-bold text-gray-800">Update Roster</h3>
            <p className="text-sm text-gray-600">
              You've loaded "{loadedRosterName}" and made changes. What would you like to do?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleOverwriteRoster}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
              >
                Overwrite "{loadedRosterName}"
              </button>
              <button
                onClick={handleSaveAsNewRoster}
                className="w-full px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                Save as New Roster
              </button>
              <button
                onClick={() => {
                  setShowOverwritePrompt(false);
                  setLoadedRosterName(null);
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
                        onClick={() => handleLoadRoster(preset.id)}
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
    </div>
  );
}
