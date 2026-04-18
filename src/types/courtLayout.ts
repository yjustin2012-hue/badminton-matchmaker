/**
 * Court layout domain model
 * Represents a saved physical court arrangement
 */

export interface CourtLayout {
  id: string; // UUID v4
  name: string; // e.g. "Main Hall", "Tournament Setup"
  numberOfCourts: number;
  courtNames: string[]; // e.g. ["Court A", "Court B"] — length === numberOfCourts
  createdAt: number;
  updatedAt: number;
}
