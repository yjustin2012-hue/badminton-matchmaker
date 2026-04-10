/**
 * Settings Page
 * App configuration: language, auth, fairness thresholds
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../context/SessionContext';
import * as Types from '../types';
import * as Auth from '../lib/auth';
import * as DB from '../db';

export default function SettingsPage() {
  const { t } = useTranslation();
  const session = useSessionContext();
  const [showPasscodeInput, setShowPasscodeInput] = useState(false);
  const [showVerificationOnly, setShowVerificationOnly] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [passcodeConfirm, setPasscodeConfirm] = useState('');
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [minSample, setMinSample] = useState(session.settings.minMatchesThreshold.toString());
  const [dueUpThreshold, setDueUpThreshold] = useState(session.settings.duUpBelowAverageThreshold.toString());
  const [allowDuplicatePlayers, setAllowDuplicatePlayers] = useState(session.settings.ignorePendingMatchesForGeneration);
  const [confirmDeleteMatch, setConfirmDeleteMatch] = useState(session.settings.confirmDeletePendingMatch ?? false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLanguageChange = async (language: Types.Language) => {
    try {
      await session.updateLanguage(language);
      setError(null);
      setSuccess('Language updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update language';
      setError(message);
    }
  };

  const handleUpdateMinSample = async () => {
    const value = parseInt(minSample, 10);
    if (isNaN(value) || value < 1) {
      setError('Low sample threshold must be at least 1');
      return;
    }

    try {
      await DB.updateSettings({ minMatchesThreshold: value });
      await session.reloadSettings();
      setError(null);
      setSuccess('Low sample threshold updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  };

  const handleUpdateDueUpThreshold = async () => {
    const value = parseInt(dueUpThreshold, 10);
    if (isNaN(value) || value < 1) {
      setError('Due-up threshold must be at least 1');
      return;
    }

    try {
      await DB.updateSettings({ duUpBelowAverageThreshold: value });
      await session.reloadSettings();
      setError(null);
      setSuccess('Due-up threshold updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  };

  const handleAllowDuplicatePlayersToggle = async (enabled: boolean) => {
    try {
      await DB.updateSettings({ ignorePendingMatchesForGeneration: enabled });
      await session.reloadSettings();
      setAllowDuplicatePlayers(enabled);
      setError(null);
      setSuccess('Match generation setting updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  };

  const handleConfirmDeleteMatchToggle = async (enabled: boolean) => {
    try {
      await DB.updateSettings({ confirmDeletePendingMatch: enabled });
      await session.reloadSettings();
      setConfirmDeleteMatch(enabled);
      setError(null);
      setSuccess('Delete confirmation setting updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  };

  const handleAuthToggle = async (enabled: boolean) => {
    try {
      await session.updateAuthRequirement(enabled);
      setError(null);
      setSuccess('Auth requirement updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update auth';
      setError(message);
    }
  };

    const handleSetPasscode = async () => {
    if (!passcode.trim()) {
      setError('New passcode cannot be empty');
      return;
    }

    if (passcode !== passcodeConfirm) {
      setError('Passcodes do not match');
      return;
    }

    const validation = Auth.validatePasscodeFormat(passcode);
    if (!validation.valid) {
      setError(validation.error || 'Invalid passcode');
      return;
    }

    try {
      const hash = Auth.createPasscodeHash(passcode);
      await session.setAdminPasscode(hash);
      setCurrentPasscode('');
      setPasscode('');
      setPasscodeConfirm('');
      setPasscodeVerified(false);
      setShowVerificationOnly(false);
      setShowPasscodeInput(false);
      setError(null);
      setSuccess('Admin passcode updated successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set passcode';
      setError(message);
    }
  };

  const hasPasscode = !!session.settings.adminPasscodeHash;

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Language Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.language')}</h2>

          <div className="space-y-3">
            {Types.LANGUAGE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center p-3 border-2 rounded cursor-pointer transition-colors hover:bg-gray-50"
                style={{
                  borderColor:
                    session.settings.language === option.value ? '#2563eb' : '#e5e7eb',
                  backgroundColor:
                    session.settings.language === option.value ? '#eff6ff' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="language"
                  value={option.value}
                  checked={session.settings.language === option.value}
                  onChange={(e) => handleLanguageChange(e.target.value as Types.Language)}
                  className="w-4 h-4"
                />
                <span className="ml-3 font-semibold text-gray-800">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Authentication Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.security')}</h2>

          <div className="space-y-4">
            {/* Auth requirement toggle */}
            <div>
              <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={session.settings.requireAuthForPastEdits}
                  onChange={(e) => handleAuthToggle(e.target.checked)}
                  className="w-5 h-5"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-800">
                    {t('settings.requirePasscode')}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('settings.requirePasscodeDesc')}
                  </p>
                </div>
              </label>
            </div>

            {/* Passcode input */}
            {session.settings.requireAuthForPastEdits && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                {!showPasscodeInput ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {t('settings.adminPasscode')} {hasPasscode ? t('settings.passcodeSet') : t('settings.passcodeNotSet')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {hasPasscode
                          ? t('settings.passcodeSetDesc')
                          : t('settings.passcodeNotSetDesc')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowPasscodeInput(true);
                        setCurrentPasscode('');
                        setPasscode('');
                        setPasscodeConfirm('');
                        setPasscodeVerified(false);
                        // If changing existing passcode, show verification screen first
                        if (hasPasscode) {
                          setShowVerificationOnly(true);
                        } else {
                          setShowVerificationOnly(false);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                    >
                      {hasPasscode ? t('settings.change') : t('settings.set')} {t('settings.passcode')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-semibold text-gray-800">{t('settings.setAdminPasscode')}</p>

                    {/* Current passcode verification (MUST be shown first when changing existing passcode) */}
                    {showVerificationOnly && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-semibold text-blue-900 mb-2">Verify current passcode first</p>
                        <input
                          type="password"
                          value={currentPasscode}
                          onChange={(e) => setCurrentPasscode(e.target.value)}
                          placeholder="Enter current passcode"
                          className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleVerifyCurrentPasscode();
                          }}
                        />
                        <button
                          onClick={() => {
                            if (!currentPasscode.trim()) {
                              setError('Current passcode cannot be empty');
                              return;
                            }
                            const isValid = Auth.verifyAdminPasscode(currentPasscode, session.settings.adminPasscodeHash || '');
                            if (!isValid) {
                              setError('Current passcode is incorrect');
                              return;
                            }
                            setPasscodeVerified(true);
                            setShowVerificationOnly(false);
                            setError(null);
                          }}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                        >
                          Verify
                        </button>
                      </div>
                    )}

                    {/* New passcode inputs (show only AFTER verification succeeds, or if no existing passcode) */}
                    {!showVerificationOnly && (
                      <>
                        <input
                          type="password"
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          placeholder={t('settings.enterPasscode')}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                        <input
                          type="password"
                          value={passcodeConfirm}
                          onChange={(e) => setPasscodeConfirm(e.target.value)}
                          placeholder={t('settings.confirmPasscode')}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSetPasscode();
                          }}
                        />
                      </>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleSetPasscode}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={showVerificationOnly}
                      >
                        {t('settings.save')}
                      </button>
                      <button
                        onClick={() => {
                          setShowPasscodeInput(false);
                          setCurrentPasscode('');
                          setPasscode('');
                          setPasscodeConfirm('');
                          setPasscodeVerified(false);
                        }}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                      >
                        {t('settings.cancel')}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      ⚠️ {t('settings.passcodeWarning')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fairness Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.fairness')}</h2>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-800 mb-2">
                {t('settings.lowSampleThreshold')}
              </label>
              <p className="text-sm text-gray-600 mb-3">
                {t('settings.lowSampleThresholdDesc')}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={minSample}
                  onChange={(e) => setMinSample(e.target.value)}
                  min="1"
                  className="w-20 px-3 py-2 border border-gray-300 rounded text-center font-semibold"
                />
                <span className="text-gray-600">{t('settings.matches')}</span>
                <button
                  onClick={handleUpdateMinSample}
                  className="px-3 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 text-sm"
                >
                  {t('settings.save')}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-800 mb-2">
                {t('settings.dueUpThreshold')}
              </label>
              <p className="text-sm text-gray-600 mb-3">
                {t('settings.dueUpThresholdDesc')}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={dueUpThreshold}
                  onChange={(e) => setDueUpThreshold(e.target.value)}
                  min="1"
                  className="w-20 px-3 py-2 border border-gray-300 rounded text-center font-semibold"
                />
                <span className="text-gray-600">{t('settings.matchesBelowAverage')}</span>
                <button
                  onClick={handleUpdateDueUpThreshold}
                  className="px-3 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 text-sm"
                >
                  {t('settings.save')}
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={allowDuplicatePlayers}
                  onChange={(e) => handleAllowDuplicatePlayersToggle(e.target.checked)}
                  className="w-5 h-5"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-800">
                    {t('settings.allowPendingMatches')}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('settings.allowPendingMatchesDesc')}
                  </p>
                </div>
              </label>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={confirmDeleteMatch}
                  onChange={(e) => handleConfirmDeleteMatchToggle(e.target.checked)}
                  className="w-5 h-5"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-800">
                    {t('settings.confirmDeleteMatch')}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('settings.confirmDeleteMatchDesc')}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.about')}</h2>

          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>{t('settings.app')}:</strong> Badminton Matchmaker v0.1.0
            </p>
            <p>
              <strong>{t('settings.platform')}:</strong> Local-first PWA (IndexedDB)
            </p>
            <p>
              <strong>{t('settings.data')}:</strong> {t('settings.dataDesc')}
            </p>
            <p>
              <strong>{t('settings.status')}:</strong> MVP - {t('settings.earlyAccess')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
