/**
 * Rankings Page
 * Live rankings display with fairness indicators
 */

import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../context/SessionContext';
import clsx from 'clsx';

export default function RankingsPage() {
  const { t } = useTranslation();
  const session = useSessionContext();

  const rankings = session.rankings;
  const highSample = rankings.filter(
    (r) => r.matchesPlayed >= session.settings.minMatchesThreshold
  );
  const lowSample = rankings.filter(
    (r) => r.matchesPlayed < session.settings.minMatchesThreshold
  );

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h1 className="text-3xl font-bold text-gray-800">{t('rankings.title')}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {session.players.length} {t('rankings.players')} • {session.sessionInfo.completedMatchCount} {t('rankings.matches')}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('rankings.rank')}</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('rankings.player')}</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('rankings.matches')}</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('rankings.winPercent')}</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('rankings.record')}</th>
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
                        {ranking.playerName}
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
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
                    <span className="font-medium text-gray-800">{ranking.playerName}</span>
                    <span className="text-sm text-gray-600">
                      {ranking.matchesPlayed} {t('rankings.matchesLabel', { count: ranking.matchesPlayed })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
