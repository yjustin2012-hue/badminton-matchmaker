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
