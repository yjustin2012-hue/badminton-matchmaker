/**
 * Rankings Page
 * Live rankings display with fairness indicators
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../context/SessionContext';
import clsx from 'clsx';
import * as Stats from '../lib/stats';

export default function RankingsPage() {
  const { t } = useTranslation();
  const session = useSessionContext();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const rankings = session.rankings;
  const highSample = rankings.filter(
    (r) => r.matchesPlayed >= session.settings.minMatchesThreshold
  );
  const lowSample = rankings.filter(
    (r) => r.matchesPlayed < session.settings.minMatchesThreshold
  );
  const selectedPlayer = session.players.find((player) => player.id === selectedPlayerId) ?? null;
  const selectedPlayerRanking = rankings.find((ranking) => ranking.playerId === selectedPlayerId) ?? null;
  const selectedHistory = useMemo(() => {
    if (!selectedPlayerId) return [];
    return Stats.getPlayerMatchHistory(selectedPlayerId, session.completedMatches, session.players);
  }, [selectedPlayerId, session.completedMatches, session.players]);

  const renderPlayerButton = (ranking: typeof rankings[number]) => {
    const player = session.players.find((entry) => entry.id === ranking.playerId);
    return (
      <button
        type="button"
        onClick={() => setSelectedPlayerId(ranking.playerId)}
        className="inline-flex items-center gap-2 font-semibold text-gray-800 hover:text-blue-700 hover:underline"
      >
        {player?.color && (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: player.color }}
          />
        )}
        <span>{ranking.playerName}</span>
      </button>
    );
  };

  const formatCompletedAt = (timestamp: number) =>
    new Date(timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h1 className="text-3xl font-bold text-gray-800">{t('rankings.title')}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {session.players.length} {t('rankings.players')} • {session.sessionInfo.completedMatchCount} {t('rankings.matches')}
            </p>
            <p className="text-xs text-gray-500 mt-2">{t('rankings.viewHistoryHint')}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('rankings.rank')}</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('rankings.player')}</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('rankings.score')}</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('rankings.matches')}</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('rankings.winPercent')}</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('rankings.record')}</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('rankings.totalPts')}</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('rankings.status')}</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {highSample.length > 0 ? (
                  highSample.map((ranking, index) => (
                    <tr
                      key={ranking.playerId}
                      className={clsx(
                        'hover:bg-gray-50 transition-colors',
                        !ranking.available && 'opacity-60'
                      )}
                    >
                      <td className="px-6 py-3 text-lg font-bold text-gray-800">#{index + 1}</td>

                      <td className="px-6 py-3 font-semibold text-gray-800">
                        {renderPlayerButton(ranking)}
                      </td>

                      <td className="px-6 py-3 text-center">
                        <span className="font-bold text-lg text-amber-600">
                          {ranking.rankScore ?? 0}
                        </span>
                      </td>

                      <td className="px-6 py-3 text-center text-gray-700">
                        {ranking.matchesPlayed}
                      </td>

                      <td className="px-6 py-3 text-center">
                        <span
                          className={clsx(
                            'font-bold text-lg',
                            ranking.matchesPlayed === 0
                              ? 'text-gray-500'
                              : ranking.winPercentage >= 60
                                ? 'text-green-600'
                                : ranking.winPercentage >= 40
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                          )}
                        >
                          {ranking.matchesPlayed === 0 ? '—' : ranking.winPercentage.toFixed(0)}%
                        </span>
                      </td>

                      <td className="px-6 py-3 text-center text-gray-700">
                        <span className="font-semibold">{ranking.wins}</span>
                        <span className="text-gray-500 mx-1">-</span>
                        <span className="font-semibold">{ranking.losses}</span>
                      </td>

                      <td className="px-6 py-3 text-center">
                        <span className="font-semibold text-gray-700">
                          {ranking.matchesPlayed === 0 ? '—' : ranking.totalPointsScored}
                        </span>
                      </td>

                      <td className="px-6 py-3 text-center">
                        {ranking.dueUp ? (
                          <span className="inline-block px-3 py-1 bg-orange-100 border border-orange-400 rounded-full text-orange-700 font-semibold text-sm">
                            {t('rankings.dueUp')}
                          </span>
                        ) : ranking.available ? (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 font-semibold text-sm">
                            {t('rankings.available')}
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-gray-200 text-gray-600 font-semibold text-sm">
                            {t('rankings.unavailable')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      {t('rankings.noRankings')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Low sample indicator */}
          {lowSample.length > 0 && (
            <div className="px-6 py-4 bg-blue-50 border-t">
              <p className="text-sm text-blue-800 font-semibold mb-2">
                {t('rankings.lowSampleSize')} ({lowSample.length})
              </p>
              <p className="text-xs text-blue-700 mb-3">
                {t('rankings.lowSampleDescription', { count: session.settings.minMatchesThreshold })}
              </p>
              <div className="space-y-2">
                {lowSample.map((ranking) => (
                  <div key={ranking.playerId} className="flex items-center justify-between">
                    <div>{renderPlayerButton(ranking)}</div>
                    <span className="text-sm text-gray-600">
                      {ranking.matchesPlayed} {t('rankings.matchesLabel', { count: ranking.matchesPlayed })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="border-b px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedPlayer.color && (
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: selectedPlayer.color }}
                        />
                      )}
                      <h2 className="text-2xl font-bold text-gray-800">
                        {t('rankings.historyTitle', { name: selectedPlayer.name })}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {selectedPlayerRanking
                        ? t('rankings.historySubtitle', {
                            score: selectedPlayerRanking.rankScore ?? 0,
                            matches: selectedPlayerRanking.matchesPlayed,
                            wins: selectedPlayerRanking.wins,
                            losses: selectedPlayerRanking.losses,
                          })
                        : t('rankings.noRankings')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerId(null)}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    {t('rankings.closeHistory')}
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(85vh-96px)] overflow-y-auto px-6 py-5">
                {selectedHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-gray-500">
                    {t('rankings.noHistory')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedHistory.map((entry) => (
                      <div key={entry.matchId} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm text-gray-500">{formatCompletedAt(entry.completedAt)}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={clsx(
                                'rounded-full px-3 py-1 text-xs font-bold',
                                entry.won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              )}
                            >
                              {entry.won ? t('rankings.resultWin') : t('rankings.resultLoss')}
                            </span>
                            {entry.isShowdown && (
                              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                {entry.showdownInitiatedByPlayerTeam
                                  ? t('rankings.showdownInitiated')
                                  : t('rankings.showdown')}
                              </span>
                            )}
                            <span className="text-lg font-bold text-gray-800">
                              {entry.teamScore} - {entry.opponentScore}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t('rankings.playedWith')}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entry.teammates.map((player) => (
                                <span
                                  key={player.id}
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700 ring-1 ring-gray-200"
                                >
                                  {player.color && (
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full"
                                      style={{ backgroundColor: player.color }}
                                    />
                                  )}
                                  {player.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t('rankings.playedAgainst')}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entry.opponents.map((player) => (
                                <span
                                  key={player.id}
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700 ring-1 ring-gray-200"
                                >
                                  {player.color && (
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full"
                                      style={{ backgroundColor: player.color }}
                                    />
                                  )}
                                  {player.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
