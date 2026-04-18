# Badminton Matchmaker - Design Decisions Log

## Session 1: MVP Implementation & Feature Completion

### Decision 1.1: Roster Management Approach
**Date**: April 4, 2026  
**Issue**: How to handle editing/deleting players from saved rosters without losing match history

**Decision**: Implement non-destructive roster approach (Option A)
- Rosters are snapshots of player groups created from the Court screen
- Players are never deleted from rosters in the Rosters tab
- Players can only be added/removed via the Court screen
- When a roster is loaded, it adds/repopulates players without deleting others

**Rationale**:
- Prevents accidental data loss from match history
- Match records always maintain referential integrity
- Simpler implementation without schema changes
- Preserves all historical data automatically
- Clear separation of concerns (Court = player management, Rosters = roster viewing)

**Implementation**: Added informational banner on Rosters page explaining this behavior

---

### Decision 1.2: Player Deletion Prevention
**Date**: April 4, 2026  
**Issue**: Risk of breaking match history and rankings by deleting players

**Decision**: Prevent player deletion if they have any pending or completed matches
- Validation check blocks deletion
- Error message explains why deletion is prevented
- Provides clear path: "complete or delete the pending match first" if in pending match
- For completed matches: explains the impact on history and rankings

**Validation Rules**:
1. Check if player is in ANY pending match → block with message
2. Check if player is in ANY completed match → block with message
3. Only if both checks pass → allow deletion with confirmation

**Scope**: Snapshots are unaffected because they store historical stat data, not player references

**Translation Keys Added**:
- `court.playerInPendingMatch`
- `court.playerInCompletedMatches`

---

### Decision 1.3: Rosters Tab as Main Navigation
**Date**: April 4, 2026  
**Issue**: How to surface roster management without cluttering the main Court screen

**Decision**: Create a dedicated "Rosters" main tab (between History and Settings)
- Full CRUD interface for managing rosters
- List view on left with roster selection
- Detail panel on right showing roster contents
- Actions: Load, Rename, Delete
- Create new roster modal

**Tab Navigation**: Court → Rankings → History → Rosters → Settings

**User Mental Model**: 
- Court = Live session management
- Rosters = View/manage saved player groups
- Rosters are created on Court, managed in this dedicated tab

---

### Decision 1.4: Database Schema Versioning
**Date**: April 4, 2026  
**Issue**: Attempt to bump schema version from 1→2 caused data loss

**Decision**: Keep schema version at 1, avoid version bumping without explicit migration
- The `updatedAt` index on presets was already working in v1
- Version bump without migration handler caused Dexie to clear databases
- Rolled back to v1 to preserve data integrity

**Lesson Learned**: 
- Only bump version if providing proper migration handlers
- For MVP, stable schema is better than versioning overhead

---

### Decision 1.5: Match Editing Stats Recalculation
**Date**: April 4, 2026  
**Issue**: When editing past match scores, player stats weren't recalculated

**Decision**: Implement two-phase recalculation for match edits
1. Reset affected player stats to baseline (0 wins/losses)
2. Replay all their completed matches to recalculate stats

**New Function**: `DB.resetPlayerStats(playerId)`
- Resets single player's stats to baseline
- Required by HistoryPage match editing flow

**Why This Works**:
- Ensures stats stay consistent with match history
- Simpler than trying to calculate differential impact
- Stats always match their match results exactly

---

### Decision 1.6: Rosters are Read-Only Display
**Date**: April 4, 2026  
**Issue**: User asked about adding/removing players directly from Rosters page

**Decision**: Make roster players read-only in the Rosters tab
- Players aren't displayed as editable in Rosters
- Clear message: "Player rosters are snapshots created on the Court screen"
- "To add or remove players, edit your roster from the Court page"
- Distinguishes between "set a roster" (Court) vs "view a roster" (Rosters)

**UX Benefit**: Clear mental model—Court is for roster modification, Rosters is for management

---

## Implementation Status

### Completed Features
- ✅ `resetPlayerStats()` function for match editing stats recalculation
- ✅ RostersPage with full CRUD (Create, Read, Update, Delete)
- ✅ Rosters main navigation tab (5th tab)
- ✅ Player deletion validation (pending + completed match checks)
- ✅ Informational banner on Rosters page
- ✅ Full i18n for all new features (EN, 简体, 繁體)
- ✅ Proper error messaging and user feedback

### Not Implemented (Out of Scope)
- Modifying players within rosters (by design)
- Automatic roster creation
- Roster export/import
- Player history tracking across rosters

---

## Database & Performance Considerations

### Schema
- Presets table: `&id, name, createdAt, updatedAt`
- Ordering: Rosters sorted by `updatedAt DESC` (most recent first)
- No schema versioning needed for MVP

### Performance
- Roster list load: O(n) where n = number of saved rosters
- Player deletion validation: O(m) where m = pending + completed matches
- Match editing stats recalculation: O(k) where k = player's match history

### Data Integrity
- Match history preserved even if players removed (validation prevents this anyway)
- Snapshots unaffected by player deletions
- All stats recalculated when match scores edited

---

## Future Considerations

### Potential Enhancements
1. Bulk player operations (import CSV rosters)
2. Roster templates with preset players
3. Archive old rosters instead of delete
4. Duplicate/clone roster feature
5. Player skills/positions in rosters
6. Player statistics by roster

### Potential Issues to Watch
1. If rosters grow very large (100+ players), pagination may be needed
2. If match history gets very long, stat recalculation could slow down
3. Rename functionality could benefit from optimistic UI updates

---

## Localization Coverage

All new text translated to 3 languages:
- Navigation: `nav.rosters`
- Rosters actions: create, load, rename, delete, save, cancel
- Rosters info: createNew, noRosters, noPlayers, players count, updated/created dates
- Info banner: `infoBannerTitle`, `infoBannerDesc`
- Player validation: `playerInPendingMatch`, `playerInCompletedMatches`
- Success messages: `loadedSuccess`

---

## Sign-Off

**Status**: MVP features complete and tested  
**Last Build**: ✅ Successful (npm run build)  
**Data Integrity**: ✅ Schema v1 stable, no migration issues  
**i18n Coverage**: ✅ All new UI text localized (EN, 简体, 繁體)

---

## Session 2: Pair Preference, Fairness Fix, and PWA Hardening

### Decision 2.1: Pair Preference as One-Directional Soft Constraint
**Date**: April 9, 2026  
**Issue**: Players wanted to indicate a preferred match partner

**Decision**: Implement pair preference as a one-directional soft constraint
- A selects B → only A is constrained; B is free to select anyone else or nothing
- Multiple players can independently prefer the same person
- Preference is soft: respected when feasible, does not block generation
- Stored as `preferredPartnerId` on the Player record in IndexedDB

**Rationale**:
- One-directional mirrors common real-world intent (e.g., a beginner wanting to play with a specific mentor)
- Soft constraint prevents the feature from making match generation impossible
- Simpler than two-way mutual agreement logic

---

### Decision 2.2: Pair Preference Pool Expansion
**Date**: April 9, 2026  
**Issue**: A player's preferred partner could be in a pending match and thus excluded from the eligible pool, making the preference impossible to satisfy

**Decision**: Expand the eligible pool to include a pending player if they are someone's preferred partner
- Implemented in `generateMatch` in `SessionContext.tsx`
- Only pending players who are a named preference are pulled in
- Does not bypass the general "non-pending first" logic for everyone

**Rationale**:
- Without this, pair preferences would silently fail whenever scheduling overlapped
- The pool expansion is targeted and minimal — only the specific preferred partner is added

---

### Decision 2.3: Fairness Selection — Shuffle Before Sort
**Date**: April 9, 2026  
**Issue**: With 5 players all at 0 matches (tied fairness scores), the same 4 players were always selected because sort order was deterministic on equal keys

**Decision**: Shuffle eligible players randomly *before* sorting by fairness score
- Equal-score players are now selected with uniform probability
- Implemented in `selectPlayersForMatch` in `matchmaking.ts`

**Rationale**:
- Without shuffling, the 5th player never rotates in at the start
- Shuffling preserves the fairness intent while adding tie-breaking randomness

---

### Decision 2.4: Pair-Preference Team Assignment via Exhaustive Split Scoring
**Date**: April 9, 2026  
**Issue**: Even after selecting the right 4 players, random team assignment could still split preferred partners onto opposing teams

**Decision**: Evaluate all 3 possible 2v2 team splits and choose the one with the highest preference-satisfaction score
- Score = count of (player, preferred partner) pairs that are on the same team
- Ties broken randomly (splits list is shuffled before reducing)
- Implemented in `createMatchFromPlayers` replacing the simple shuffle-and-split

---

### Decision 2.5: PWA Hardening for iPad Safari Install
**Date**: April 9, 2026  

**Issues found and fixed**:
1. `public/icons/` was empty — PWA install requires actual PNG files
2. `index.html` was missing `<link rel="apple-touch-icon">` — required for Safari Home Screen icon
3. `public/manifest.json` referenced non-existent screenshot files
4. `App.tsx` manually registered `/sw.js` while `vite-plugin-pwa` auto-registered its own SW — two conflicting service workers
5. `vite.config.ts` had dead Google Fonts runtime caching (no Google Fonts are used)

**Fixes applied**:
- Created `scripts/generate-icons.cjs` — pure Node.js (no deps) PNG generator producing 180×180, 192×192, and 512×512 icons
- Added `<link rel="apple-touch-icon" href="/icons/icon-180x180.png">` to `index.html`
- Removed screenshot entries from `public/manifest.json`
- Removed manual SW registration from `App.tsx`; `vite-plugin-pwa` handles SW lifecycle exclusively
- Replaced dead Google Fonts caching with `cleanupOutdatedCaches: true` in workbox config

**Build output verified**: `dist/` contains all icons, `sw.js`, `workbox-*.js`, `manifest.json`, `manifest.webmanifest`, and all JS/CSS assets.

---

### Decision 2.6: Version Badge in UI
**Date**: April 9, 2026  

**Decision**: Show a fixed top-right version badge (version number + composition date) on all screens
- Defined in `src/version.ts` as `APP_VERSION` and `APP_VERSION_DATE` constants
- Rendered in `Layout.tsx` as a fixed-position, non-interactive overlay
- Format: `v1.0.0 / Apr 9, 2026`
- Increment `APP_VERSION` in `src/version.ts` for every released change

---

## Updated Implementation Status

### Completed Features (Session 2)
- ✅ Pair preference UI (Pair button per player, popup modal, violet highlight when active)
- ✅ Pair preference persistence (`preferredPartnerId` in IndexedDB)
- ✅ Pair preference pool expansion in match generation
- ✅ Pair preference team assignment (exhaustive split scoring)
- ✅ 5-player fairness fix (shuffle before sort)
- ✅ PWA icons generated (180, 192, 512px)
- ✅ `apple-touch-icon` added to HTML
- ✅ Single service worker (vite-plugin-pwa only, no conflict)
- ✅ Version badge in top-right of all screens (v1.0.0 · Apr 9, 2026)
- ✅ Build verified clean

---

## Session 3: Stats Tiebreaker, Delete Confirmation, i18n Hardening

### Decision 3.1: Total Points Scored as Ranking Tiebreaker
**Date**: April 9, 2026  
**Issue**: Players with the same win percentage had no stable, meaningful secondary sort key

**Decision**: Add `totalPointsScored` field to Player and accumulate it on each `completeMatch()` call
- Used as the tiebreaker immediately after win percentage in the ranking sort
- Displayed as a "Total Pts" column in the Rankings table
- Low-sample players are already filtered into their own section, so point totals only affect the high-sample ranking order
- Field initialised to 0 on `addPlayer` and `loadPresetPlayers`; reset with `resetPlayerStats`

**Sort order**: win% desc → total points desc → matches played desc → name asc

---

### Decision 3.2: Confirm Delete Pending Match Setting
**Date**: April 9, 2026  
**Issue**: Accidental taps on the delete button for a generated match would lose the match silently

**Decision**: Add `confirmDeletePendingMatch: boolean` to Settings (default: `false`)
- When `false` (default): matches delete immediately with no prompt — preserves the fast live-session flow
- When `true`: a `confirm()` dialog appears before deletion
- Toggle surfaced in Settings → Fairness section with a descriptive label and sub-description

**Rationale**: Default off respects the fast-tap UX for experienced users; opt-in protection for users who want it

---

### Decision 3.3: Full i18n Coverage for UI Strings
**Date**: April 9, 2026  
**Issue**: Multiple `confirm()`, `alert()`, and `setError()` calls used hardcoded English strings — they displayed in English regardless of the selected language

**Decision**: Replace every hardcoded UI string with `t()` calls; add any missing keys to all three locale files

**Strings fixed**:
- `confirm('Remove this player?')` → `t('court.removePlayerConfirm')`
- `confirm('Delete this pending match?')` → `t('court.deleteMatchConfirm')`
- `confirm('Delete this roster?')` → `t('rosters.confirmDelete')`
- `confirm('Reset session?...')` → `t('court.confirmStartOver')`
- `confirm('Delete this snapshot?')` → `t('history.deleteSnapshotConfirm')`
- Score validation errors: `t('court.scoresRequired')`, `t('court.scoresNumeric')`, `t('court.scoresCantTie')`
- Roster name validation: `t('rosters.nameEmpty')`
- All catch-block fallback strings for roster/match/player operations

**New i18n keys added** (all 3 locales):
- `court.loadRosterConfirmTitle`, `court.loadRosterConfirmDesc` — Load Roster confirm modal
- `court.failedLoadRoster`, `court.failedDeleteRoster`, `court.failedSaveRoster`, `court.failedSetPairPreference`
- `court.pairOneDirectional` — one-directional pairing warning in pair modal

---

### Decision 3.4: One-Directional Pair Warning in Pair Modal
**Date**: April 9, 2026  
**Issue**: Users were not aware that pair preferences are one-directional — Player A pairing with B does not automatically make B prefer A

**Decision**: Display an amber warning banner inside the pair selection modal
- Styled with amber border + background to draw attention without being alarming
- Text: "⚠️ Pairing is one-directional. For mutual pairing, the other player must also select you."
- Translated in all 3 locales via `court.pairOneDirectional`

---

## Updated Implementation Status

### Completed Features (Session 3)
- ✅ `totalPointsScored` field — accumulated per match, tiebreaker in rankings, "Total Pts" column visible
- ✅ `confirmDeletePendingMatch` setting — default off, opt-in confirm dialog before deleting pending match
- ✅ All `confirm()` / `setError()` hardcoded strings replaced with `t()` calls
- ✅ New i18n keys added to all 3 locales (en, zh-Hans, zh-Hant)
- ✅ Pair modal one-directional warning (amber banner, fully translated)
- ✅ Version bumped to 1.0.2
- ✅ Build verified clean (v1.0.2)

---

## Session 4 — Court Management Feature (v1.0.3)

### Decision 4.1: Court View Feature Flag
**Date**: April 10, 2026  
**Decision**: Add `courtViewEnabled` boolean to Settings. When false (default), app behaves exactly as before. When true, a Courts nav tab appears and pending matches are displayed as court cards instead of a flat list.

### Decision 4.2: Court Card Layout
**Date**: April 10, 2026  
**Decision**: Each court shows its current assigned match (with full score entry + done/delete controls) and an "Up Next" preview of the first queued match. Empty courts display a placeholder state.

### Decision 4.3: Queue System
**Date**: April 10, 2026  
**Decision**: When all courts are occupied, newly generated matches are queued (courtNumber = null). A Queue section below the court cards lists queued matches with an "Assign Court" button.

### Decision 4.4: Auto-Assignment on Generate
**Date**: April 10, 2026  
**Decision**: When courtViewEnabled, generateMatch automatically assigns the new match to the lowest-numbered free court. If all courts are full, match is placed in queue.

### Decision 4.5: Manual Court Assignment Modal
**Date**: April 10, 2026  
**Decision**: "Assign Court" and "Reassign" buttons open a modal showing available courts. Occupied courts are shown as disabled. A "Move to Queue" option is always available.

### Decision 4.6: Court Layouts Tab
**Date**: April 10, 2026  
**Decision**: A separate "Courts" tab (only visible when courtViewEnabled) allows saving/loading named court configurations (name, numberOfCourts, courtNames[]). Loading a layout applies it to settings and persists to DB.

### Decision 4.7: DB Schema v2
**Date**: April 10, 2026  
**Decision**: Added `courtLayouts` table in Dexie version(2). Existing v1 tables unchanged. New settings defaults: courtViewEnabled=false, numberOfCourts=2, courtNames=['Court 1', 'Court 2'].

### Decision 4.8: courtNumber Field on Match
**Date**: April 10, 2026  
**Decision**: Added `courtNumber?: number | null` to Match type. 1-indexed (1 = court 1). null = queued/unassigned. Persisted to IndexedDB.

## Updated Implementation Status

### Completed Features (Session 4)
- ✅ `courtViewEnabled` feature flag in settings (default off)
- ✅ `numberOfCourts` setting (default 2, range 1–6)
- ✅ `courtNames` array setting (default ["Court 1", "Court 2"])
- ✅ `match.courtNumber` field (auto-assigned on generate, null = queued)
- ✅ DB schema v2 + courtLayouts CRUD
- ✅ Court view in CourtPage (cards + queue + assign modal)
- ✅ CourtsPage — layout save/load/edit/delete
- ✅ Courts nav tab (conditional on courtViewEnabled)
- ✅ SettingsPage court section
- ✅ All i18n keys added to all 3 locales
- ✅ Version bumped to 1.0.3
- ✅ Build verified clean (v1.0.3)

---

## Session 5 — Strict Court Assignment, Quick-pick, Danger Zone, Reset (v1.0.4 → v1.0.5)

### Decision 5.1: App Font Size via Root Element
**Date**: April 10, 2026
**Issue**: App font size setting (stored as a percentage in Settings) was not applied to CourtPage because Tailwind `text-*` utilities use `rem` which is relative to `<html>`, not to a parent div's `font-size`.

**Decision**: Apply the font scale by setting `document.documentElement.style.fontSize` directly from a `useEffect` in `Layout.tsx`, and clear it on unmount. The previous inline `style={{ fontSize }}` on a parent div was removed.

---

### Decision 5.2: Wipe All Data Feature
**Date**: April 10, 2026

**Decision**: Add a "Wipe All Data" button in Settings → Danger Zone.
- Two-step confirmation: first a "Are you sure?" modal, then (if a passcode is set) a passcode entry modal.
- `DB.wipeAllData()` clears all Dexie tables: players, matches, snapshots, presets, courtLayouts, settings.
- After wipe, `window.location.reload()` re-initialises defaults.
- Secret bypass passcode: `'justin'` (dev backstop, not exposed in UI).

---

### Decision 5.3: Reset Settings to Default
**Date**: April 11, 2026

**Decision**: Add a "Reset Settings to Default" button in Settings → Danger Zone (orange, above the red Wipe button).
- Single confirmation modal.
- `DB.resetSettingsToDefault()` updates the settings record with all default values, **preserving** language, auth config, and passcode.
- Calls `session.reloadSettings()` so the UI reflects new values immediately without a page reload.

---

### Decision 5.4: Strict Court Auto-fill
**Date**: April 10–11, 2026

**Issue**: When court view is enabled, any queued match would fill any free court, ignoring the idea of "this match belongs to court N".

**Decision**: Add `strictCourtAutoFill: boolean` to Settings (default `false`).
- At generation time, when all courts are occupied, each queued match is assigned `targetCourtNumber = ((queuedCount % numCourts) + 1)`.
- Auto-fill (on complete/delete) in strict mode only moves a queued match to a court if `match.targetCourtNumber === freedCourtNumber`.
- Bug fix from v1.0.4: the original filter included `m.targetCourtNumber == null` (letting untargeted matches spill to any court). Corrected to require exact match.
- `match.targetCourtNumber` stored alongside `match.courtNumber` in IndexedDB.

---

### Decision 5.5: Per-Court Queue Display (Strict Mode)
**Date**: April 11, 2026

**Issue**: In strict mode, the "Up Next" single-line preview was misleading — it only showed one match, but there could be multiple matches queued for the same court.

**Decision**: In strict mode, each court card shows a numbered scrollable list of all queued matches targeted at it (instead of a single "Up Next" line). Max visible height ~5rem, scrolls if more.

**Global queue section**: In strict mode, the queue is hidden by default. A "Show Queue / Hide Queue" toggle button in the section header reveals it. The header always shows the total count. In non-strict mode, behaviour is unchanged.

---

### Decision 5.6: Court Count Change Behaviour
**Date**: April 11, 2026

**Decision**: When the number of courts changes:
- **Decrease:** Matches currently assigned to removed courts are unassigned (`courtNumber = null`), returning them to the queue.
- **Increase:** The first N queued matches are auto-assigned to the N new courts.

This logic is applied in both `handleChangeNumberOfCourts` (CourtPage ±1 buttons) and `handleSaveNumberOfCourts` (SettingsPage number input).

---

### Decision 5.7: Recent Players Quick-pick (Star Button)
**Date**: April 10–11, 2026

**Issue**: A separate "add from history" button was requested next to the "+ Add Player" button.

**Decision**: A ☆ (star) button next to "+ Add Player" opens a "Pick from list" modal.
- Modal shows a filter text input and pill buttons for each known player name.
- Already-added players are shown greyed out with ✓ and are non-interactive (no duplicate adds).
- Tapping a name calls `session.addPlayer(name)` — the modal stays open so multiple players can be added in one flow.
- Close button resets the filter and closes.

**Source of player names** (Bug fix, v1.0.5): Originally `getRecentPlayerNames()` only read from **snapshots** (session history). Since most users will have rosters but no snapshots yet, this returned empty. Fixed to also read from **presets** (rosters) and the **current players** table, in that order — snapshots first (most recent session context), then presets, then current active players.

---

### Decision 5.8: REQUIREMENTS.md Created
**Date**: April 11, 2026

Created `REQUIREMENTS.md` as a living specification document covering all implemented features, settings, data model, and non-goals. Intended as the authoritative reference for what the app does.

---

## Updated Implementation Status

### Completed Features (Session 5)
- ✅ Font size fix — applied via `document.documentElement.style.fontSize` in Layout.tsx
- ✅ Wipe All Data — `DB.wipeAllData()`, confirm + passcode modals, Danger Zone UI, full i18n
- ✅ Reset Settings to Default — `DB.resetSettingsToDefault()`, confirm modal, orange button in Danger Zone, full i18n
- ✅ `strictCourtAutoFill` — type, schema default, SessionContext `targetCourtNumber` assignment, auto-fill exact-match filter, queue badges, Settings toggle, full i18n
- ✅ Bug fix: strict auto-fill filter was allowing `targetCourtNumber == null` matches to spill (fixed to exact match only)
- ✅ Per-court queue list in strict mode (numbered, scrollable, replaces single "Up Next")
- ✅ Global queue toggle (hidden by default in strict mode, "Show Queue" button)
- ✅ Court count change → unqueue/auto-fill logic in CourtPage and SettingsPage
- ✅ Quick-pick star (☆) button — modal with filter, pill buttons, duplicate detection, `court.addFromList` i18n
- ✅ Bug fix: `getRecentPlayerNames` now reads from snapshots → presets → players (not snapshots only)
- ✅ `recentPlayersSuggestCount` setting (1–100, default 30) in Settings → Fairness
- ✅ `REQUIREMENTS.md` created
- ✅ Version bumped to 1.0.5
- ✅ Build verified clean (v1.0.5)

---

## Session 6 — April 11, 2026

### Decision 6.1: Start Over — Option to Clear Players
**Date**: April 11, 2026

**Request**: When starting over, add an option to clear all players from the screen too.

**Decision**: Replaced the native `confirm()` dialog on the Start Over button with a custom modal offering two distinct actions:
- **Clear matches only (keep players)** — calls `session.startOver()`. Existing behaviour.
- **Clear matches and remove all players** — calls `DB.deleteAllPlayers()` first, then `session.startOver()`. Because `startOver()` does `getAllPlayers()` internally, deleting first causes it to reload an empty list.

Modal has a grey Cancel button. No i18n keys were reused (new keys: `court.startOverTitle`, `court.startOverDesc`, `court.startOverMatchesOnly`, `court.startOverWithPlayers`).

---

### Decision 6.2: Remove Player — Skip Confirm When No Matches
**Date**: April 11, 2026

**Request**: Remove the confirmation pop-up when removing a player if there are no matches in the session.

**Decision**: `handleRemovePlayer` checks `session.pendingMatches.length === 0 && session.completedMatches.length === 0`. If true, the `confirm()` dialog is skipped and the player is removed immediately. The existing guard (blocking removal if the player is in a pending or completed match) is unaffected.

---

### Decision 6.3: Quick-pick Modal — Remove Player & Colour Scheme
**Date**: April 11, 2026

**Request**: Allow removing a player from the quick-pick (star ☆) modal when no matches exist. Use green for selected players, blue for unselected.

**Decision**:
- **Green pill** = player already in the active list (selected). Always green regardless of match state.
  - When no matches exist: interactive (cursor-pointer), shows ✕ — clicking removes the player.
  - When matches exist: non-interactive (cursor-default), shows ✓.
- **Blue pill** = player not yet in the active list. Clicking adds them (unchanged).
- Removal reuses `handleRemovePlayer()`, which already has the no-matches guard and skips the confirm dialog.

---

## Updated Implementation Status

### Completed Features (Session 6)
- ✅ Start Over modal — two-choice (keep players / remove players)
- ✅ Remove player skips confirm when no matches exist
- ✅ Quick-pick modal: green = selected, blue = unselected; removable when no matches
- ✅ REQUIREMENTS.md updated to v1.0.6
- ✅ DECISIONS.md Session 6 appended
