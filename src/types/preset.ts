/**
 * Preset domain model
 * Reusable player roster that can be loaded into a session
 */

export interface PresetPlayer {
  // Simplified player data for preset (no session stats)
  id: string;
  name: string;
}

export interface Preset {
  id: string; // UUID v4
  name: string; // User-given name for the preset
  players: PresetPlayer[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Preset list item for display
 */
export interface PresetListItem {
  id: string;
  name: string;
  playerCount: number;
  createdAt: number;
  updatedAt: number;
}
