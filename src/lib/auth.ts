/**
 * Authentication helpers for MVP
 * Local passcode protection for completed match edits
 * WARNING: NOT cryptographically secure, for MVP only
 */

import { hashPasscode, verifyPasscode } from './uuid';

/**
 * Verify if a provided passcode matches the stored hash
 */
export function verifyAdminPasscode(provided: string, storedHash: string): boolean {
  try {
    return verifyPasscode(provided, storedHash);
  } catch {
    return false;
  }
}

/**
 * Create a passcode hash for storage
 */
export function createPasscodeHash(passcode: string): string {
  return hashPasscode(passcode);
}

/**
 * Validate passcode format (MVP: simple length check)
 */
export function validatePasscodeFormat(passcode: string): { valid: boolean; error?: string } {
  if (!passcode || passcode.length < 4) {
    return { valid: false, error: 'Passcode must be at least 4 characters' };
  }

  if (passcode.length > 32) {
    return { valid: false, error: 'Passcode must be 32 characters or less' };
  }

  return { valid: true };
}
