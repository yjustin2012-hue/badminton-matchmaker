/**
 * History Page
 * Completed matches and ranking snapshots
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../context/SessionContext';
import * as DB from '../db';
import * as Types from '../types';
import * as Stats from '../lib/stats';
import * as Auth from '../lib/auth';
import clsx from 'clsx';

export default function HistoryPage() {
  const { t } = useTranslation();
  const session = useSessionContext();
  const [snapshots, setSnapshots] = useState<Types.Snapshot[]>([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [showSnapshotInput, setShowSnapshotInput] = useState(false);

  // Edit match state
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editTeamAScore, setEditTeamAScore] = useState('');
  const [editTeamBScore, setEditTeamBScore] = useState('');
  const [editPasscode, setEditPasscode] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSnapshots() {
      try {
        const loaded = await DB.getAllSnapshots();
        setSnapshots(loaded);
      } catch (err) {
        console.error('Failed to load snapshots:', err);
      }
    }

    loadSnapshots();
  }, []);

  const handleSaveSnapshot = async () => {
    try {
      await session.saveSnapshot(snapshotName || undefined);
      setSnapshotName('');
      setShowSnapshotInput(false);

      // Reload snapshots
      const loaded = await DB.getAllSnapshots();
      setSnapshots(loaded);
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!confirm(t('history.deleteSnapshotConfirm'))) return;

    try {
      await DB.deleteSnapshot(id);
      const loaded = await DB.getAllSnapshots();
      setSnapshots(loaded);
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    }
  };

  const handleEditMatch = (match: Types.Match) => {
    setEditingMatchId(match.id);
    setEditTeamAScore(match.teamAScore.toString());
    setEditTeamBScore(match.teamBScore.toString());
    setEditPasscode('');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    try {
      setEditError(null);

      // Validate scores
      const teamAScore = parseInt(editTeamAScore, 10);
      const teamBScore = parseInt(editTeamBScore, 10);

      if (isNaN(teamAScore) || isNaN(teamBScore)) {
        setEditError('Scores must be valid numbers');
        return;
      }

      if (teamAScore < 0 || teamBScore < 0) {
        setEditError('Scores must be non-negative');
        return;
      }

      if (teamAScore === teamBScore) {
        setEditError('Scores cannot be tied');
        return;
      }

      // Check passcode if required
      if (session.settings.requireAuthForPastEdits) {
        if (!editPasscode.trim()) {
          setEditError('Passcode is required');
          return;
        }

        if (!session.settings.adminPasscodeHash) {
          setEditError('No passcode is set. Contact admin.');
          return;
        }

        const isValid = Auth.verifyAdminPasscode(editPasscode, session.settings.adminPasscodeHash);
        if (!isValid) {
          setEditError('Incorrect passcode');
          return;
        }
      }

      // Get the match to find affected players
      const match = await DB.getMatch(editingMatchId!);
      if (!match) throw new Error('Match not found');

      // Update match
      await DB.updateMatch(editingMatchId!, {
        teamAScore,
        teamBScore,
      });

      // Affect players are all in teamA and teamB
      const affectedPlayerIds = new Set([...match.teamA.playerIds, ...match.teamB.playerIds]);
      const completedMatches = await DB.getCompletedMatches();

      // Recalculate stats for affected players
      for (const playerId of affectedPlayerIds) {
        const player = await DB.getPlayer(playerId);
        if (!player) continue;

        const recalculated = Stats.calculatePlayerStatsFromMatches(player, completedMatches, {
          showdownWinBonus: session.settings.showdownWinBonus ?? 3,
          showdownLossDeduction: session.settings.showdownLossDeduction ?? 1,
        });

        await DB.updatePlayer(playerId, {
          matchesPlayed: recalculated.matchesPlayed,
          wins: recalculated.wins,
          losses: recalculated.losses,
          rankScore: recalculated.rankScore,
          totalPointsScored: recalculated.totalPointsScored,
          recentMatchIds: recalculated.recentMatchIds,
          lastPlayedTime: recalculated.lastPlayedTime,
          updatedAt: recalculated.updatedAt,
        });
      }

      // Reload match data
      await session.reloadMatchData();

      // Close modal
      setEditingMatchId(null);
      setEditTeamAScore('');
      setEditTeamBScore('');
      setEditPasscode('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes';
      setEditError(message);
    }
  };

  const playerMap = new Map(session.players.map((p) => [p.id, p.name]));

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Completed Matches Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-2xl font-bold text-gray-800">{t('history.completedMatches')}</h2>
            <p className="text-sm text-gray-600 mt-1">{session.completedMatches.length} {t('history.matches')}</p>
          </div>

          {session.completedMatches.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {t('history.noMatches')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('history.time')}</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('history.teamA')}</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('history.score')}</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('history.teamB')}</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('history.winner')}</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {session.completedMatches.map((match) => {
                    const completedAt = match.completedAt ? new Date(match.completedAt) : null;
                    const timeStr = completedAt
                      ? completedAt.toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—';

                    const stats = Stats.getWinnerAndLoserIds(match);
                    const teamAName = match.teamA.playerIds
                      .map((id) => playerMap.get(id))
                      .join(' & ');
                    const teamBName = match.teamB.playerIds
                      .map((id) => playerMap.get(id))
                      .join(' & ');

                    const winner =
                      stats && stats.winnerIds.includes(match.teamA.playerIds[0]) ? 'A' : 'B';

                    return (
                      <tr key={match.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-gray-600">{timeStr}</td>
                        <td className="px-6 py-3 font-semibold text-gray-800">{teamAName}</td>
                        <td className="px-6 py-3 text-center">
                          <span className="font-bold text-lg">
                            {match.teamAScore} - {match.teamBScore}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-semibold text-gray-800">{teamBName}</td>
                        <td className="px-6 py-3 text-center">
                          <span
                            className={clsx(
                              'inline-block px-3 py-1 rounded font-semibold text-sm',
                              winner === 'A'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            )}
                          >
                            {t('history.team')} {winner}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => handleEditMatch(match)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                          >
                            {t('history.edit')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Snapshots Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t('history.snapshots')}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('history.savedSnapshots')} ({snapshots.length})
              </p>
            </div>
            <button
              onClick={() => {
                if (!showSnapshotInput) {
                  const today = new Date();
                  const dateStr = today.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
                  setSnapshotName(dateStr);
                }
                setShowSnapshotInput(!showSnapshotInput);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
            >
              + {t('history.snapshot')}
            </button>
          </div>

          {showSnapshotInput && (
            <div className="px-6 py-4 border-b bg-blue-50 flex gap-2">
              <input
                autoFocus
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder={t('history.snapshotNamePlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSnapshot();
                  if (e.key === 'Escape') {
                    setShowSnapshotInput(false);
                    setSnapshotName('');
                  }
                }}
              />
              <button
                onClick={handleSaveSnapshot}
                className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                {t('history.save')}
              </button>
              <button
                onClick={() => {
                  setShowSnapshotInput(false);
                  setSnapshotName('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t('history.cancel')}
              </button>
            </div>
          )}

          {snapshots.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {t('history.noSnapshots')}
            </div>
          ) : (
            <div className="divide-y">
              {snapshots.map((snapshot) => {
                const createdAt = new Date(snapshot.createdAt);
                const dateStr = createdAt.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const topPlayer = [...snapshot.rankings].sort((a, b) =>
                  b.winPercentage - a.winPercentage
                )[0];

                // Separate rankings by low sample threshold
                const highSample = snapshot.rankings
                  .filter((r) => r.matchesPlayed >= snapshot.minMatchesThreshold)
                  .sort((a, b) => b.winPercentage - a.winPercentage);
                const lowSample = snapshot.rankings
                  .filter((r) => r.matchesPlayed < snapshot.minMatchesThreshold)
                  .sort((a, b) => b.winPercentage - a.winPercentage);

                return (
                  <div key={snapshot.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-lg">
                          {snapshot.name || t('history.defaultSnapshotName')}
                        </h3>
                        <p className="text-sm text-gray-600">{dateStr}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {snapshot.rankings.length} {t('history.playersLabel')} • {snapshot.matches.length} matches • {t('history.top')}: {topPlayer?.playerName} (
                          {topPlayer?.winPercentage.toFixed(0)}%)
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteSnapshot(snapshot.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        {t('history.delete')}
                      </button>
                    </div>

                    {/* Rankings section */}
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-semibold text-gray-600 mb-2">{t('history.rankings')}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                        {highSample.length > 0 ? (
                          highSample.map((rank) => (
                            <div key={rank.playerId} className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                              <div className="font-semibold text-gray-800">{rank.playerName}</div>
                              <div className="text-gray-600">
                                {rank.winPercentage.toFixed(0)}% ({rank.wins}{t('court.wins')}-{rank.losses}{t('court.losses')})
                              </div>
                              {rank.totalPointsScored !== undefined && (
                                <div className="text-gray-500">{rank.totalPointsScored} {t('history.pts')}</div>
                              )}
                            </div>
                          ))
                        ) : null}
                        {lowSample.length > 0 && (
                          <div className="col-span-full">
                            <p className="text-xs text-gray-500 my-1">{t('rankings.lowSample')}:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {lowSample.map((rank) => (
                                <div key={rank.playerId} className="text-xs bg-gray-100 p-2 rounded border border-gray-300">
                                  <div className="font-semibold text-gray-600">{rank.playerName}</div>
                                  <div className="text-gray-500">
                                    {rank.winPercentage.toFixed(0)}% ({rank.wins}{t('court.wins')}-{rank.losses}{t('court.losses')})
                                  </div>                                {rank.totalPointsScored !== undefined && (
                                  <div className="text-gray-400">{rank.totalPointsScored} {t('history.pts')}</div>
                                )}                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Match scores section */}
                    {snapshot.matches.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-semibold text-gray-600 mb-2">{t('history.completedMatches')}</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {snapshot.matches.map((match) => {
                            const completedAt = new Date(match.completedAt);
                            const timeStr = completedAt.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            const teamAName = match.teamAPlayerNames.join(' & ');
                            const teamBName = match.teamBPlayerNames.join(' & ');
                            const winner = match.teamAScore > match.teamBScore ? 'A' : 'B';

                            return (
                              <div
                                key={match.id}
                                className="text-xs bg-gray-50 p-2 rounded border border-gray-200"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-800">{teamAName}</div>
                                    <div className="text-gray-600">{teamBName}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-gray-800">
                                      {match.teamAScore} - {match.teamBScore}
                                    </div>
                                    <div
                                      className={clsx(
                                        'text-xs font-semibold',
                                        winner === 'A' ? 'text-blue-700' : 'text-purple-700'
                                      )}
                                    >
                                      {t('history.team')} {winner} {timeStr}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Match Modal */}
        {editingMatchId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800">{t('history.editMatch')}</h3>

              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {editError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('history.teamAScore')}
                  </label>
                  <input
                    type="number"
                    value={editTeamAScore}
                    onChange={(e) => setEditTeamAScore(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-lg font-semibold"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('history.teamBScore')}
                  </label>
                  <input
                    type="number"
                    value={editTeamBScore}
                    onChange={(e) => setEditTeamBScore(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-center text-lg font-semibold"
                    min="0"
                  />
                </div>

                {session.settings.requireAuthForPastEdits && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('history.passcode')}
                    </label>
                    <input
                      type="password"
                      value={editPasscode}
                      onChange={(e) => setEditPasscode(e.target.value)}
                      placeholder={t('history.enterPasscode')}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                >
                  {t('history.save')}
                </button>
                <button
                  onClick={() => {
                    setEditingMatchId(null);
                    setEditTeamAScore('');
                    setEditTeamBScore('');
                    setEditPasscode('');
                    setEditError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  {t('history.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
