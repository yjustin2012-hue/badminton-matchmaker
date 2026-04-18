/**
 * Courts Page
 * Save and load physical court layout configurations
 * Only shown when courtViewEnabled setting is true
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../context/SessionContext';
import * as DB from '../db';
import * as Types from '../types';
import { generateUUID } from '../lib/uuid';

export default function CourtsPage() {
  const { t } = useTranslation();
  const session = useSessionContext();

  const getCourtName = (courtNum: number): string => {
    const stored = (session.settings.courtNames ?? [])[courtNum - 1];
    if (!stored || /^Court\s+\d+$/i.test(stored.trim())) {
      return t('court.courtLabel', { num: courtNum });
    }
    return stored;
  };

  const [layouts, setLayouts] = useState<Types.CourtLayout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New layout form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formNumCourts, setFormNumCourts] = useState(2);
  const [formCourtNames, setFormCourtNames] = useState(['', '']);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadLayouts();
  }, []);

  // Sync formCourtNames length when formNumCourts changes
  const handleFormNumCourtsChange = (n: number) => {
    const clamped = Math.max(1, Math.min(6, n));
    setFormNumCourts(clamped);
    setFormCourtNames((prev) => {
      const updated = [...prev];
      while (updated.length < clamped) updated.push('');
      return updated.slice(0, clamped);
    });
  };

  const handleCourtNameChange = (index: number, value: string) => {
    setFormCourtNames((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const loadLayouts = async () => {
    try {
      const loaded = await DB.getAllCourtLayouts();
      setLayouts(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('courts.failedLoad'));
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormName('');
    setFormNumCourts(session.settings.numberOfCourts || 2);
    const names = Array.from(
      { length: session.settings.numberOfCourts || 2 },
      (_, i) => (session.settings.courtNames ?? [])[i] || ''
    );
    setFormCourtNames(names);
    setShowCreateForm(true);
  };

  const openEditForm = (layout: Types.CourtLayout) => {
    setEditingId(layout.id);
    setFormName(layout.name);
    setFormNumCourts(layout.numberOfCourts);
    setFormCourtNames([...layout.courtNames]);
    setShowCreateForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError(t('courts.nameRequired'));
      return;
    }
    try {
      if (editingId) {
        await DB.updateCourtLayout(editingId, {
          name: formName.trim(),
          numberOfCourts: formNumCourts,
          courtNames: formCourtNames,
        });
      } else {
        const layout: Types.CourtLayout = {
          id: generateUUID(),
          name: formName.trim(),
          numberOfCourts: formNumCourts,
          courtNames: formCourtNames,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await DB.addCourtLayout(layout);
      }
      setShowCreateForm(false);
      setEditingId(null);
      setError(null);
      await loadLayouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('courts.failedSave'));
    }
  };

  const handleLoad = async (layout: Types.CourtLayout) => {
    try {
      await DB.updateSettings({
        numberOfCourts: layout.numberOfCourts,
        courtNames: layout.courtNames,
      });
      await session.reloadSettings();
      setSuccess(t('courts.loadedSuccess', { name: layout.name }));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('courts.failedLoad'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('courts.confirmDelete'))) return;
    try {
      await DB.deleteCourtLayout(id);
      await loadLayouts();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('courts.failedDelete'));
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('courts.title')}</h1>
      <p className="text-sm text-gray-500 mb-4">{t('courts.subtitle')}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded border border-green-200 text-sm">
          {success}
        </div>
      )}

      {/* Active settings preview */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm font-semibold text-blue-800 mb-1">{t('courts.currentConfig')}</div>
        <div className="text-sm text-blue-700">
          {t('courts.courts', { count: session.settings.numberOfCourts || 2 })}
          {' — '}
          {Array.from({ length: session.settings.numberOfCourts || 2 }, (_, i) => getCourtName(i + 1)).join(', ')}
        </div>
      </div>

      {/* Create button */}
      {!showCreateForm && (
        <button
          onClick={openCreateForm}
          className="w-full mb-4 px-4 py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
        >
          + {t('courts.createNew')}
        </button>
      )}

      {/* Create / Edit form */}
      {showCreateForm && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow space-y-3">
          <h2 className="font-bold text-gray-800">
            {editingId ? t('courts.editLayout') : t('courts.newLayout')}
          </h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('courts.layoutName')}</label>
            <input
              autoFocus
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t('courts.layoutNamePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('courts.numCourts')}</label>
            <input
              type="number"
              min={1}
              max={6}
              value={formNumCourts}
              onChange={(e) => handleFormNumCourtsChange(parseInt(e.target.value) || 1)}
              className="w-24 px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('courts.courtNames')}</label>
            <div className="space-y-2">
              {formCourtNames.map((name, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-16">{t('courts.courtNum', { num: index + 1 })}</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleCourtNameChange(index, e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
            >
              {t('courts.save')}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setEditingId(null); setError(null); }}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              {t('courts.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Saved layouts list */}
      {layouts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">{t('courts.noLayouts')}</p>
      ) : (
        <div className="space-y-3">
          {layouts.map((layout) => (
            <div key={layout.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800">{layout.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {t('courts.courts', { count: layout.numberOfCourts })}
                    {' — '}
                    {layout.courtNames.join(', ')}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleLoad(layout)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700"
                  >
                    {t('courts.load')}
                  </button>
                  <button
                    onClick={() => openEditForm(layout)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-semibold hover:bg-gray-200"
                  >
                    {t('courts.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(layout.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm font-semibold hover:bg-red-200"
                  >
                    {t('courts.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
