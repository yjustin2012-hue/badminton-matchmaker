/**
 * Utility functions: UUID generation and other helpers
 */

/**
 * Generate a UUID v4 string
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a simple hash of a string (for local passcode storage)
 * WARNING: NOT cryptographically secure, for MVP only
 * Use a proper hash library for production
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Base64 encode (for passcode MVP)
 */
export function base64Encode(str: string): string {
  return btoa(str);
}

/**
 * Base64 decode (for passcode MVP)
 */
export function base64Decode(str: string): string {
  return atob(str);
}

/**
 * Verify a passcode against a hash
 * WARNING: NOT secure, for MVP only
 */
export function verifyPasscode(passcode: string, hash: string): boolean {
  const encoded = base64Encode(passcode);
  return encoded === hash;
}

/**
 * Hash a passcode for storage (MVP version)
 */
export function hashPasscode(passcode: string): string {
  return base64Encode(passcode);
}
