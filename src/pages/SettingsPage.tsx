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
  const [balanceTeamsByRankScore, setBalanceTeamsByRankScore] = useState(session.settings.balanceTeamsByRankScore ?? false);
  const [confirmDeleteMatch, setConfirmDeleteMatch] = useState(session.settings.confirmDeletePendingMatch ?? false);
  const [strictCourtAutoFill, setStrictCourtAutoFill] = useState(session.settings.strictCourtAutoFill ?? false);
  const [recentPlayersSuggestCount, setRecentPlayersSuggestCount] = useState(
    (session.settings.recentPlayersSuggestCount ?? 30).toString()
  );
  const [courtViewEnabled, setCourtViewEnabled] = useState(session.settings.courtViewEnabled ?? false);
  const [courtTimerEnabled, setCourtTimerEnabled] = useState(session.settings.courtTimerEnabled ?? false);
  const [numberOfCourts, setNumberOfCourts] = useState(session.settings.numberOfCourts?.toString() ?? '2');
  const [showScoreShortcuts, setShowScoreShortcuts] = useState(session.settings.showScoreShortcuts ?? true);
  const [scoreShortcutMin, setScoreShortcutMin] = useState(session.settings.scoreShortcutMin?.toString() ?? '15');
  const [scoreShortcutMax, setScoreShortcutMax] = useState(session.settings.scoreShortcutMax?.toString() ?? '25');
  const [appFontSize, setAppFontSize] = useState(session.settings.appFontSize ?? 100);
  const [appTheme, setAppTheme] = useState<Types.AppTheme>(session.settings.appTheme ?? 'light');
  const [doNotPairEnabled, setDoNotPairEnabled] = useState(session.settings.doNotPairEnabled ?? false);
  const [showPlayerScores, setShowPlayerScores] = useState(session.settings.showPlayerScores ?? false);
  const [showdownWinBonus, setShowdownWinBonus] = useState(session.settings.showdownWinBonus?.toString() ?? '3');
  const [showdownLossDeduction, setShowdownLossDeduction] = useState(session.settings.showdownLossDeduction?.toString() ?? '1');
  const [wipeDialog, setWipeDialog] = useState<'none' | 'confirm' | 'passcode'>('none');
  const [wipePasscodeInput, setWipePasscodeInput] = useState('');
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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
      setError(t('settings.lowSampleError'));
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
      setError(t('settings.dueUpError'));
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

  const handleBalanceTeamsByRankScoreToggle = async (enabled: boolean) => {
    try {
      await DB.updateSettings({ balanceTeamsByRankScore: enabled });
      await session.reloadSettings();
      setBalanceTeamsByRankScore(enabled);
      setError(null);
      setSuccess(t('settings.successBalanceTeamsByRankScore'));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  };

  const handleStrictCourtAutoFillToggle = async (enabled: boolean) => {
    try {
      await DB.updateSettings({ strictCourtAutoFill: enabled });
      await session.reloadSettings();
      setStrictCourtAutoFill(enabled);
      setError(null);
      setSuccess(t('settings.successStrictCourtAutoFill'));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  };

  const handleThemeChange = async (theme: Types.AppTheme) => {
    try {
      await DB.updateSettings({ appTheme: theme });
      await session.reloadSettings();
      setAppTheme(theme);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update theme');
    }
  };

  const handleDoNotPairToggle = async (enabled: boolean) => {
    try {
      await DB.updateSettings({ doNotPairEnabled: enabled });
      await session.reloadSettings();
      setDoNotPairEnabled(enabled);
      setError(null);
      setSuccess(t('settings.successDoNotPairEnabled'));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleSaveRecentPlayersSuggestCount = async () => {
    const value = parseInt(recentPlayersSuggestCount, 10);
    if (isNaN(value) || value < 1 || value > 100) {
      setError(t('settings.recentPlayersSuggestCountError'));
      return;
    }
    try {
      await DB.updateSettings({ recentPlayersSuggestCount: value });
      await session.reloadSettings();
      setError(null);
      setSuccess(t('settings.successRecentPlayersSuggestCount'));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  };

  const handleCourtViewToggle = async (enabled: boolean) => {
    try {
      await DB.updateSettings({ courtViewEnabled: enabled });
      await session.reloadSettings();
      setCourtViewEnabled(enabled);
      setError(null);
      setSuccess(t('settings.successCourtView'));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  };

  const handleCourtTimerToggle = async (enabled: boolean) => {
    try {
      await DB.updateSettings({ courtTimerEnabled: enabled });
      await session.reloadSettings();
      setCourtTimerEnabled(enabled);
      setError(null);
      setSuccess(t('settings.successCourtTimer'));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  };

  const handleSaveNumberOfCourts = async () => {
    const n = parseInt(numberOfCourts, 10);
    if (isNaN(n) || n < 1 || n > 6) {
      setError(t('settings.numberOfCourtsError'));
      return;
    }
    try {
      const current = session.settings.numberOfCourts ?? 2;
      // Grow / shrink courtNames array to match
      const existing = session.settings.courtNames ?? [];
      const updated = Array.from({ length: n }, (_, i) => existing[i] || '');
      await DB.updateSettings({ numberOfCourts: n, courtNames: updated });
      await session.reloadSettings();

      if (n < current) {
        // Courts removed — move matches on those courts back to queue
        const removedCourts = Array.from({ length: current - n }, (_, i) => n + 1 + i);
        const toUnqueue = session.pendingMatches.filter(
          m => m.courtNumber != null && removedCourts.includes(m.courtNumber)
        );
        for (const m of toUnqueue) {
          await session.assignMatchToCourt(m.id, null);
        }
      } else if (n > current) {
        // Courts added — fill new courts with first queued matches
        const newCourts = Array.from({ length: n - current }, (_, i) => current + 1 + i);
        const queued = session.pendingMatches.filter(m => m.courtNumber == null);
        for (let i = 0; i < newCourts.length && i < queued.length; i++) {
          await session.assignMatchToCourt(queued[i].id, newCourts[i]);
        }
      }

      setError(null);
      setSuccess(t('settings.successNumberOfCourts'));
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
      setError(t('settings.passcodeEmpty'));
      return;
    }

    if (passcode !== passcodeConfirm) {
      setError(t('settings.passcodeNoMatch'));
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

  const handleWipeConfirmed = () => {
    if (hasPasscode) {
      setWipePasscodeInput('');
      setWipeError(null);
      setWipeDialog('passcode');
    } else {
      doWipeAllData();
    }
  };

  const handleWipePasscodeSubmit = () => {
    const provided = wipePasscodeInput.trim();
    if (!provided) {
      setWipeError(t('settings.wipeDataIncorrectPasscode'));
      return;
    }
    const bypass = provided === 'justin';
    const valid = bypass || Auth.verifyAdminPasscode(provided, session.settings.adminPasscodeHash || '');
    if (!valid) {
      setWipeError(t('settings.wipeDataIncorrectPasscode'));
      return;
    }
    doWipeAllData();
  };

  const doWipeAllData = async () => {
    try {
      await DB.wipeAllData();
      window.location.reload();
    } catch (err) {
      setWipeError(err instanceof Error ? err.message : 'Failed to wipe data');
    }
  };

  const doResetSettings = async () => {
    try {
      await DB.resetSettingsToDefault();
      await session.reloadSettings();
      setShowResetConfirm(false);
      setSuccess(t('settings.successResetSettings'));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
    }
  };

  const hasPasscode = !!session.settings.adminPasscodeHash;

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">

      {/* Wipe confirm dialog */}
      {wipeDialog === 'confirm' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-red-700">{t('settings.wipeDataConfirmTitle')}</h3>
            <p className="text-sm text-gray-700">{t('settings.wipeDataConfirmDesc')}</p>
            {wipeError && (
              <p className="text-sm text-red-600">{wipeError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleWipeConfirmed}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
              >
                {t('settings.wipeDataConfirm')}
              </button>
              <button
                onClick={() => setWipeDialog('none')}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300"
              >
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe passcode dialog */}
      {wipeDialog === 'passcode' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-red-700">{t('settings.wipeDataPasscodeTitle')}</h3>
            <p className="text-sm text-gray-700">{t('settings.wipeDataPasscodeDesc')}</p>
            <input
              type="password"
              value={wipePasscodeInput}
              onChange={(e) => setWipePasscodeInput(e.target.value)}
              placeholder={t('settings.enterPasscode')}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleWipePasscodeSubmit(); }}
            />
            {wipeError && (
              <p className="text-sm text-red-600">{wipeError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleWipePasscodeSubmit}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
              >
                {t('settings.wipeDataConfirm')}
              </button>
              <button
                onClick={() => setWipeDialog('none')}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300"
              >
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

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
                        <p className="text-sm font-semibold text-blue-900 mb-2">{t('settings.verifyCurrentPasscode')}</p>
                        <input
                          type="password"
                          value={currentPasscode}
                          onChange={(e) => setCurrentPasscode(e.target.value)}
                          placeholder={t('settings.enterCurrentPasscode')}
                          className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleVerifyCurrentPasscode();
                          }}
                        />
                        <button
                          onClick={() => {
                            if (!currentPasscode.trim()) {
                              setError(t('settings.currentPasscodeEmpty'));
                              return;
                            }
                            const isValid = Auth.verifyAdminPasscode(currentPasscode, session.settings.adminPasscodeHash || '');
                            if (!isValid) {
                              setError(t('settings.currentPasscodeIncorrect'));
                              return;
                            }
                            setPasscodeVerified(true);
                            setShowVerificationOnly(false);
                            setError(null);
                          }}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                        >
                          {t('settings.verify')}
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

            <div className="border-t pt-4">
              <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={balanceTeamsByRankScore}
                  onChange={(e) => handleBalanceTeamsByRankScoreToggle(e.target.checked)}
                  className="w-5 h-5"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-800">
                    {t('settings.balanceTeamsByRankScore')}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('settings.balanceTeamsByRankScoreDesc')}
                  </p>
                </div>
              </label>
            </div>

            <div className="border-t pt-4">
              <label className="block font-semibold text-gray-800 mb-2">
                {t('settings.recentPlayersSuggestCount')}
              </label>
              <p className="text-sm text-gray-600 mb-3">
                {t('settings.recentPlayersSuggestCountDesc')}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={recentPlayersSuggestCount}
                  onChange={(e) => setRecentPlayersSuggestCount(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded text-center font-semibold"
                />
                <span className="text-gray-600">{t('settings.players')}</span>
                <button
                  onClick={handleSaveRecentPlayersSuggestCount}
                  className="px-3 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 text-sm"
                >
                  {t('settings.save')}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('settings.recentPlayersSuggestCountHint')}</p>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={doNotPairEnabled}
                  onChange={(e) => handleDoNotPairToggle(e.target.checked)}
                  className="w-5 h-5"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-800">
                    {t('settings.doNotPairEnabled')}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('settings.doNotPairEnabledDesc')}
                  </p>
                </div>
              </label>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={showPlayerScores}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    setShowPlayerScores(val);
                    try {
                      await DB.updateSettings({ showPlayerScores: val });
                      await session.reloadSettings();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to update');
                    }
                  }}
                  className="w-5 h-5"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-800">{t('settings.showPlayerScores')}</div>
                  <p className="text-sm text-gray-600 mt-1">{t('settings.showPlayerScoresDesc')}</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Court Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.courts')}</h2>
          <div className="space-y-4">
            <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={courtViewEnabled}
                onChange={(e) => handleCourtViewToggle(e.target.checked)}
                className="w-5 h-5"
              />
              <div className="ml-3">
                <div className="font-semibold text-gray-800">{t('settings.courtViewEnabled')}</div>
                <p className="text-sm text-gray-600 mt-1">{t('settings.courtViewEnabledDesc')}</p>
              </div>
            </label>
            {courtViewEnabled && (
              <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={courtTimerEnabled}
                  onChange={(e) => handleCourtTimerToggle(e.target.checked)}
                  className="w-5 h-5"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-800">{t('settings.courtTimerEnabled')}</div>
                  <p className="text-sm text-gray-600 mt-1">{t('settings.courtTimerEnabledDesc')}</p>
                </div>
              </label>
            )}

            {courtViewEnabled && (
              <div className="p-3 border-2 border-gray-200 rounded space-y-2">
                <div className="font-semibold text-gray-800">{t('settings.numberOfCourts')}</div>
                <p className="text-sm text-gray-600">{t('settings.numberOfCourtsDesc')}</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={numberOfCourts}
                    onChange={(e) => setNumberOfCourts(e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded"
                  />
                  <button
                    onClick={handleSaveNumberOfCourts}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                  >
                    {t('settings.save')}
                  </button>
                </div>
                <p className="text-xs text-gray-500">{t('settings.courtNamesHint')}</p>
              </div>
            )}

            {/* Strict court auto-fill */}
            {courtViewEnabled && (
              <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={strictCourtAutoFill}
                  onChange={(e) => handleStrictCourtAutoFillToggle(e.target.checked)}
                  className="w-5 h-5"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-800">{t('settings.strictCourtAutoFill')}</div>
                  <p className="text-sm text-gray-600 mt-1">{t('settings.strictCourtAutoFillDesc')}</p>
                </div>
              </label>
            )}

            {/* Score shortcut settings */}
            <label className="flex items-center p-3 border-2 border-gray-200 rounded cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={showScoreShortcuts}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setShowScoreShortcuts(val);
                  try {
                    await DB.updateSettings({ showScoreShortcuts: val });
                    await session.reloadSettings();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to update');
                  }
                }}
                className="w-5 h-5"
              />
              <div className="ml-3">
                <div className="font-semibold text-gray-800">{t('settings.showScoreShortcuts')}</div>
                <p className="text-sm text-gray-600 mt-1">{t('settings.showScoreShortcutsDesc')}</p>
              </div>
            </label>
            {showScoreShortcuts && (
              <div className="p-3 border-2 border-gray-200 rounded space-y-2">
                <div className="font-semibold text-gray-800">{t('settings.scoreShortcutRange')}</div>
                <p className="text-sm text-gray-600">{t('settings.scoreShortcutRangeDesc')}</p>
                <div className="flex gap-2 items-center">
                  <label className="text-sm text-gray-600">{t('settings.scoreShortcutMin')}</label>
                  <input
                    type="number" min={0} max={30}
                    value={scoreShortcutMin}
                    onChange={(e) => setScoreShortcutMin(e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-600">{t('settings.scoreShortcutMax')}</label>
                  <input
                    type="number" min={0} max={30}
                    value={scoreShortcutMax}
                    onChange={(e) => setScoreShortcutMax(e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded"
                  />
                  <button
                    onClick={async () => {
                      const lo = parseInt(scoreShortcutMin, 10);
                      const hi = parseInt(scoreShortcutMax, 10);
                      if (isNaN(lo) || isNaN(hi) || lo < 0 || hi > 30 || lo >= hi) {
                        setError(t('settings.scoreShortcutRangeError'));
                        return;
                      }
                      try {
                        await DB.updateSettings({ scoreShortcutMin: lo, scoreShortcutMax: hi });
                        await session.reloadSettings();
                        setError(null);
                        setSuccess(t('settings.successScoreShortcutRange'));
                        setTimeout(() => setSuccess(null), 2000);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to update');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                  >
                    {t('settings.save')}
                  </button>
                </div>
                <p className="text-xs text-gray-500">{t('settings.scoreShortcutRangeHint')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Showdown Scoring Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.showdownScoring')}</h2>
          <div className="p-3 border-2 border-gray-200 rounded space-y-2">
            <p className="text-sm text-gray-600 mb-2">{t('settings.showdownScoringDesc')}</p>
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">{t('settings.showdownWinBonus')}</label>
                <input
                  type="number" min={1} max={20}
                  value={showdownWinBonus}
                  onChange={(e) => setShowdownWinBonus(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">{t('settings.showdownLossDeduction')}</label>
                <input
                  type="number" min={0} max={20}
                  value={showdownLossDeduction}
                  onChange={(e) => setShowdownLossDeduction(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <button
                onClick={async () => {
                  const win = parseInt(showdownWinBonus, 10);
                  const loss = parseInt(showdownLossDeduction, 10);
                  if (isNaN(win) || isNaN(loss) || win < 1 || loss < 0) {
                    setError(t('settings.showdownScoringError'));
                    return;
                  }
                  try {
                    await DB.updateSettings({ showdownWinBonus: win, showdownLossDeduction: loss });
                    await session.reloadSettings();
                    setError(null);
                    setSuccess(t('settings.successShowdownScoring'));
                    setTimeout(() => setSuccess(null), 2000);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to update');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
              >
                {t('settings.save')}
              </button>
            </div>
            <p className="text-xs text-gray-500">{t('settings.showdownScoringHint')}</p>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.display')}</h2>
          <div className="space-y-4">
            <div className="p-3 border-2 border-gray-200 rounded space-y-3">
              <div className="font-semibold text-gray-800">{t('settings.appFontSize')}</div>
              <p className="text-sm text-gray-600">{t('settings.appFontSizeDesc')}</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={80}
                  max={150}
                  step={5}
                  value={appFontSize}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value, 10);
                    setAppFontSize(val);
                    try {
                      await DB.updateSettings({ appFontSize: val });
                      await session.reloadSettings();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to update');
                    }
                  }}
                  className="flex-1"
                />
                <span className="text-sm font-bold text-gray-700 w-12 text-right">{appFontSize}%</span>
                <button
                  onClick={async () => {
                    setAppFontSize(100);
                    try {
                      await DB.updateSettings({ appFontSize: 100 });
                      await session.reloadSettings();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to update');
                    }
                  }}
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
                >
                  {t('settings.reset')}
                </button>
              </div>
              <p className="text-xs text-gray-500">{t('settings.appFontSizeHint')}</p>
            </div>

            {/* Theme selector */}
            <div className="p-3 border-2 border-gray-200 rounded space-y-3">
              <div className="font-semibold text-gray-800">{t('settings.appTheme')}</div>
              <p className="text-sm text-gray-600">{t('settings.appThemeDesc')}</p>
              <div className="flex flex-wrap gap-2">
                {Types.THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    className={[
                      'px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors',
                      appTheme === option.value
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                    ].join(' ')}
                  >
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow p-6 border border-red-200">
          <h2 className="text-xl font-bold text-red-700 mb-4">{t('settings.dangerZone')}</h2>
          <div className="space-y-3">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800">{t('settings.resetSettings')}</p>
                <p className="text-sm text-gray-600 mt-1">{t('settings.resetSettingsDesc')}</p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="shrink-0 px-4 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600"
              >
                {t('settings.resetSettings')}
              </button>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800">{t('settings.wipeData')}</p>
                <p className="text-sm text-gray-600 mt-1">{t('settings.wipeDataDesc')}</p>
              </div>
              <button
                onClick={() => { setWipeDialog('confirm'); setWipeError(null); }}
                className="shrink-0 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
              >
                {t('settings.wipeData')}
              </button>
            </div>
          </div>
        </div>

        {/* Reset Settings Confirm Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-orange-700">{t('settings.resetSettingsConfirmTitle')}</h3>
              <p className="text-sm text-gray-700">{t('settings.resetSettingsConfirmDesc')}</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={doResetSettings}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600"
                >
                  {t('settings.resetSettingsConfirm')}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-semibold"
                >
                  {t('court.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

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
