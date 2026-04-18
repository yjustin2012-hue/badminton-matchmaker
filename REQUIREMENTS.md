# Badminton Matchmaker — Requirements

> Last updated: April 11, 2026 (v1.0.6)

---

## 1. Overview

A local-first, iPad-first PWA for managing fair recreational badminton sessions. All data is stored in IndexedDB (via Dexie). No server, no login, no sync.

---

## 2. Core Concepts

| Concept | Description |
|---|---|
| **Player** | A named participant in a session. Tracked per-session with win/loss stats. |
| **Match** | A 2v2 game with a score. Exists as *pending* (in progress) or *completed*. |
| **Court** | A physical court. Matches are assigned to courts and tracked visually. |
| **Roster** | A saved named list of players (called "Preset" internally). Load or manage from the Rosters tab. |
| **Snapshot** | A point-in-time export of rankings/stats saved at end of session. Shown in History tab. |
| **Settings** | All app configuration, persisted as a single `'default'` record in IndexedDB. |

---

## 3. Player Management

- Add a player by name from the Court screen.
- **Quick-pick (star ☆ button):** Opens a modal showing recently-seen player names from snapshots, rosters, and the current player list. Tap to add instantly. Already-added players are shown **green** (selected). If no matches exist in the session, they can be tapped again to remove them (shows ✕). Unselected players are shown **blue**.
- Edit a player's display name inline.
- Remove a player (blocked if they are in any pending or completed match). If no matches exist in the session, removal is immediate with no confirmation dialog.
- Pair preference: each player can designate a preferred partner (one-directional soft constraint).

---

## 4. Match Generation

- Generates a 2v2 match from available players using a fairness algorithm.
- **Fairness algorithm:**
  - Players who have played fewer matches relative to the session average are prioritised ("due up").
  - Players in pending matches are excluded from the eligible pool unless they are a named pair preference.
  - If fewer than 4 eligible players exist, generation fails with an error message.
- **Pair preference satisfaction:**
  - When a preferred partner exists and is eligible, they are pulled into the same team.
  - All 3 possible team splits are evaluated; the split with the most satisfied pair preferences wins.
  - Tie-break is random.
- **Shuffle before sort:** Eligible players are shuffled before sorting by fairness score, so tied players rotate fairly.
- Setting: `ignorePendingMatchesForGeneration` — allow players currently in pending matches to also be selected for new matches.

---

## 5. Court View

Enabled via Settings → Court Management → Enable Court View.

- Configurable number of courts (1–6). Courts can have custom names.
- Each court card shows:
  - The currently assigned match with full score entry.
  - In **normal mode**: "Up Next" preview (the next queued match in FIFO order).
  - In **strict mode**: A numbered list of all queued matches targeted at that court.
- Score shortcut buttons (configurable range, e.g. 15–25).
- **Auto-assignment:** When a match is generated, it is assigned to the lowest-numbered free court. If all courts are occupied, it is added to the queue.
- **Auto-fill on complete/delete:** When a match ends and a court becomes free, the next eligible queued match is automatically moved to that court.
- **Reassign:** Any assigned match can be manually moved to a different court or back to the queue via a modal.

### Strict Court Assignment Mode

Enabled via Settings → Court Management → Strict Court Auto-fill.

- Each queued match is locked to a specific target court number at generation time.
  - Assignment: `targetCourtNumber = (queuePosition % numCourts) + 1`.
- In strict mode, auto-fill only moves a match onto its designated court — it never spills to another empty court.
- The global queue section is **hidden by default** in strict mode; a "Show Queue" toggle reveals it.
- Per-court queue lists (below each court card) show all matches targeted at that court.

### Court Count Changes

- **Reducing courts:** Matches currently on removed courts are automatically moved back to the queue (courtNumber = null).
- **Increasing courts:** The first N queued matches are automatically assigned to the N new courts.
- Both CourtPage (±1 buttons) and SettingsPage (number input) apply this logic.

---

## 6. Score Entry and Match Completion

- Score entry via number inputs on the court card or queue card. Shortcut buttons for common scores.
- Validation: both scores required, numeric, not equal (no ties).
- Completing a match:
  - Records the result (winner, scores) to the completed matches table.
  - Updates player stats: wins, losses, totalPointsScored.
  - Triggers auto-fill of the freed court (court view mode).
- Deleting a pending match:
  - Setting `confirmDeletePendingMatch` — when on, shows a confirm dialog before deletion.
  - Triggers auto-fill of the freed court.

---

## 7. Rankings

- Live rankings table updated after every completed match.
- Sort order: win% desc → total points scored desc → matches played desc → name asc.
- "Low sample" players (below `minMatchesThreshold`) shown in a separate lower section.
- **Due-up indicator:** Players more than `duUpBelowAverageThreshold` matches below the session average are highlighted.

---

## 8. History (Snapshots)

- Users can save a session snapshot (exported rankings + match list) from the History tab.
- Snapshots are named and timestamped.
- Past match scores can be edited from a snapshot (triggers full stats recalculation).
- Snapshots can be deleted.
- Snapshot player names feed the Quick-pick suggestions.

---

## 9. Rosters (Presets)

- Create a roster by saving the current player list from the Court screen.
- Load a roster to populate the Court screen with that player list.
- Manage (rename, delete) rosters from the Rosters tab.
- Rosters are read-only in the Rosters tab; modification is done from the Court screen.
- Roster player names feed the Quick-pick suggestions.

---

## 10. Court Layouts

- Visible only when Court View is enabled.
- Save a named layout (court count + court names).
- Load a layout to apply it as the current court configuration.
- Edit layout name, court count, and court names.
- Delete a layout.

---

## 11. Settings

### Language
- English, 简体中文, 繁體中文. Full i18n coverage across all UI strings.

### Fairness
| Setting | Default | Description |
|---|---|---|
| `minMatchesThreshold` | 1 | Match count below which a player is shown in the "low sample" ranking section. |
| `duUpBelowAverageThreshold` | 1 | Matches below avg before due-up indicator shows. |
| `ignorePendingMatchesForGeneration` | true | Allow pending-match players to be re-selected. |
| `confirmDeletePendingMatch` | false | Show confirm dialog before deleting a pending match. |
| `recentPlayersSuggestCount` | 30 | Max players shown in the Quick-pick star modal. Range 1–100. |

### Court Management
| Setting | Default | Description |
|---|---|---|
| `courtViewEnabled` | false (true after first enable) | Shows court cards + queue instead of flat list. |
| `numberOfCourts` | 2 | Physical courts available. Range 1–6. |
| `courtNames` | [] | Per-court custom names. Falls back to "Court N". |
| `showScoreShortcuts` | true | Show/hide score shortcut buttons on court cards. |
| `scoreShortcutMin` | 15 | Lower end of shortcut range. |
| `scoreShortcutMax` | 25 | Upper end of shortcut range. |
| `strictCourtAutoFill` | true | Lock queued matches to their designated court. |

### Display
| Setting | Default | Description |
|---|---|---|
| `appFontSize` | 100 | Base font scale %. Range 80–150. Applied via `document.documentElement.style.fontSize`. |

### Auth & Security
- Optional admin passcode (base64 hash, not cryptographic — MVP only).
- When set, required before wipe or other admin actions.
- Secret bypass: `'justin'` (dev/backstop only).

### Danger Zone
- **Reset Settings to Default:** Restores all settings to defaults. Language, auth config, and data are preserved.
- **Wipe All Data:** Clears all IndexedDB tables (players, matches, snapshots, presets, courtLayouts, settings). Requires confirmation + passcode if one is set. Reloads the page after.

---

## 12. PWA / Platform

- Offline-capable PWA. Service worker managed by vite-plugin-pwa (Workbox).
- Installable on iOS Safari (apple-touch-icon provided).
- Icons: 180×180, 192×192, 512×512 PNG.
- App version displayed as a fixed top-right badge (`v{VERSION} / {DATE}`).

---

## 13. Non-Goals (Out of Scope)

- Server-side storage, cloud sync, or user accounts.
- Multiplayer / real-time sharing.
- More than 4 players per match.
- Singles (1v1) matches.
- CSV import/export.
- Deleting players who have match history (blocked by design).
- Roster player editing from the Rosters tab (Court screen only).
