/**
 * Rosters Page
 * Manage saved player rosters with full CRUD operations
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../context/SessionContext';
import * as DB from '../db';
import * as Types from '../types';
import clsx from 'clsx';

export default function RostersPage() {
  const { t } = useTranslation();
  const session = useSessionContext();
  const [rosters, setRosters] = useState<Types.Preset[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLoadWarning, setShowLoadWarning] = useState(false);
  const [pendingLoadRosterId, setPendingLoadRosterId] = useState<string | null>(null);

  useEffect(() => {
    loadRosters();
  }, []);

  const loadRosters = async () => {
    try {
      const loaded = await DB.getAllPresets();
      setRosters(loaded.sort((a, b) => b.updatedAt - a.updatedAt));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rosters.failedLoad'));
    }
  };

  const handleDeleteRoster = async (rosterId: string) => {
    if (!confirm(t('rosters.confirmDelete'))) return;

    try {
      await DB.deletePreset(rosterId);
      await loadRosters();
      setSelectedRosterId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rosters.failedDelete'));
    }
  };

  const handleLoadRoster = async (rosterId: string) => {
    setPendingLoadRosterId(rosterId);
    setShowLoadWarning(true);
  };

  const handleConfirmLoadRoster = async () => {
    if (!pendingLoadRosterId) return;
    
    try {
      await session.startOver();
      await session.loadPresetPlayers(pendingLoadRosterId);
      setError(null);
      alert(t('rosters.loadedSuccess'));
      setShowLoadWarning(false);
      setPendingLoadRosterId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rosters.failedLoad'));
    }
  };

  const handleRenameRoster = async (rosterId: string) => {
    if (!editingName.trim()) {
      setError(t('rosters.nameEmpty'));
      return;
    }

    // Check for duplicate names (excluding current roster)
    if (
      rosters.some(
        (r) =>
          r.id !== rosterId && r.name.toLowerCase() === editingName.trim().toLowerCase()
      )
    ) {
      setError(t('rosters.nameExists'));
      return;
    }

    try {
      const roster = rosters.find((r) => r.id === rosterId);
      if (!roster) throw new Error(t('rosters.notFound'));

      await DB.updatePreset(rosterId, {
        name: editingName.trim(),
        updatedAt: Date.now(),
      });

      await loadRosters();
      setEditingNameId(null);
      setEditingName('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rosters.failedRename'));
    }
  };

  const selectedRoster = rosters.find((r) => r.id === selectedRosterId);

  return (
    <div className="flex h-full gap-4 p-4 bg-gray-50">
      {/* Rosters List */}
      <div className="flex-1 flex flex-col min-w-0">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('nav.rosters')}</h2>

        {/* Info Banner */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
          <p className="font-semibold mb-1">ℹ️ {t('rosters.infoBannerTitle')}</p>
          <p>{t('rosters.infoBannerDesc')}</p>
        </div>

        {/* Rosters List Grid */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {rosters.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {t('rosters.noRosters')}
            </div>
          ) : (
            rosters.map((roster) => (
              <div
                key={roster.id}
                onClick={() => setSelectedRosterId(roster.id)}
                className={clsx(
                  'p-4 rounded-lg cursor-pointer transition-all border-2',
                  selectedRosterId === roster.id
                    ? 'bg-blue-50 border-blue-300 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{roster.name}</h3>
                    <p className="text-sm text-gray-600">
                      {roster.players.length} {t('rosters.players')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('rosters.updated')}{' '}
                      {new Date(roster.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Roster Details Panel */}
      {selectedRoster && (
        <div className="w-80 flex flex-col bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            {editingNameId === selectedRoster.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameRoster(selectedRoster.id);
                    if (e.key === 'Escape') {
                      setEditingNameId(null);
                      setEditingName('');
                    }
                  }}
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('rosters.rosterName')}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRenameRoster(selectedRoster.id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition-colors"
                  >
                    {t('rosters.save')}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNameId(null);
                      setEditingName('');
                    }}
                    className="flex-1 px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 text-sm font-semibold transition-colors"
                  >
                    {t('rosters.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedRoster.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedRoster.players.length} {t('rosters.players')}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {t('rosters.created')}{' '}
                  {new Date(selectedRoster.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Players List */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedRoster.players.length === 0 ? (
              <p className="text-center text-gray-500 py-6">{t('rosters.noPlayers')}</p>
            ) : (
              <ul className="space-y-2">
                {selectedRoster.players.map((player, idx) => (
                  <li
                    key={player.id}
                    className="p-2 bg-gray-50 rounded-lg text-sm text-gray-700 flex items-center"
                  >
                    <span className="font-semibold text-gray-500 mr-3">{idx + 1}.</span>
                    {player.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action Buttons */}
          {editingNameId !== selectedRoster.id && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
              <button
                onClick={() => handleLoadRoster(selectedRoster.id)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
              >
                {t('rosters.load')}
              </button>
              <button
                onClick={() => {
                  setEditingNameId(selectedRoster.id);
                  setEditingName(selectedRoster.name);
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-sm"
              >
                {t('rosters.rename')}
              </button>
              <button
                onClick={() => handleDeleteRoster(selectedRoster.id)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
              >
                {t('rosters.delete')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Load Roster Warning Modal */}
      {showLoadWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Load Roster?</h3>
            <p className="text-sm text-gray-600">
              Loading a new roster will clear all pending matches and reset player stats. Continue?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmLoadRoster}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
              >
                Load Roster
              </button>
              <button
                onClick={() => {
                  setShowLoadWarning(false);
                  setPendingLoadRosterId(null);
                }}
                className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t('rosters.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
