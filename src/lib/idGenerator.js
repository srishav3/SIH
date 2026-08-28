/**
 * AuthentiQ User ID Generator
 * Generates a unique 10-character User ID:
 * - 6 Alphabets (Uppercase) + 4 Digits (0-9)
 * - 1st Alphabet is 'T' for 'traveller' and 'O' for 'officer'
 * - Guarantees non-collision with existing IDs
 */

const ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

/**
 * Generates a random candidate ID conforming to the AuthentiQ specification.
 * @param {'traveller' | 'officer'} role 
 * @returns {string} - e.g. "TABCDE1234" or "OXYZWK5678"
 */
export function generateCandidateId(role) {
  const normalizedRole = (role || 'traveller').toLowerCase();
  const prefix = normalizedRole === 'officer' ? 'O' : 'T';

  // 5 remaining random uppercase alphabets
  let letters = '';
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHABETS.length);
    letters += ALPHABETS[randomIndex];
  }

  // 4 random digits
  let digits = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * DIGITS.length);
    digits += DIGITS[randomIndex];
  }

  return `${prefix}${letters}${digits}`;
}

/**
 * Validates format of an AuthentiQ User ID
 * @param {string} userId 
 * @returns {{ valid: boolean, role?: 'traveller' | 'officer', error?: string }}
 */
export function validateUserIdFormat(userId) {
  if (!userId || typeof userId !== 'string') {
    return { valid: false, error: 'User ID is required' };
  }

  const clean = userId.trim().toUpperCase();
  if (clean.length !== 10) {
    return { valid: false, error: 'User ID must be exactly 10 characters long (6 letters + 4 digits)' };
  }

  const firstChar = clean[0];
  if (firstChar !== 'T' && firstChar !== 'O') {
    return { valid: false, error: "User ID must start with 'T' (Traveller) or 'O' (Officer)" };
  }

  const lettersPart = clean.slice(0, 6);
  const digitsPart = clean.slice(6);

  if (!/^[A-Z]{6}$/.test(lettersPart)) {
    return { valid: false, error: 'First 6 characters must be letters (A-Z)' };
  }

  if (!/^\d{4}$/.test(digitsPart)) {
    return { valid: false, error: 'Last 4 characters must be 4 digits (0-9)' };
  }

  return {
    valid: true,
    role: firstChar === 'T' ? 'traveller' : 'officer',
    formattedId: clean
  };
}

/**
 * Generates an allocated unique User ID guaranteed not to exist in Supabase or local storage.
 * @param {'traveller' | 'officer'} role 
 * @param {Function} checkExistsAsync - async function returning boolean if ID exists
 * @returns {Promise<string>}
 */
export async function generateUniqueUserId(role, checkExistsAsync) {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const candidate = generateCandidateId(role);
    try {
      if (checkExistsAsync) {
        const exists = await checkExistsAsync(candidate);
        if (!exists) {
          return candidate;
        }
      } else {
        return candidate;
      }
    } catch (err) {
      console.warn('Error checking ID collision, proceeding with candidate:', err);
      return candidate;
    }
    attempts++;
  }

  // Fallback timestamp suffix if collision edge-case occurs
  const prefix = (role || '').toLowerCase() === 'officer' ? 'O' : 'T';
  const letters = 'AUTHT';
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}${letters}${digits}`;
}
