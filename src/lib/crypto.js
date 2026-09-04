/**
 * Cryptographic utility for password hashing and verification.
 * Uses the standard Web Crypto API (PBKDF2 with SHA-256 and random 128-bit salt).
 */

const DEFAULT_ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';

/**
 * Converts a Uint8Array buffer to a hexadecimal string.
 * @param {Uint8Array} buffer 
 * @returns {string}
 */
function bufferToHex(buffer) {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hexadecimal string back to a Uint8Array.
 * @param {string} hexString 
 * @returns {Uint8Array}
 */
function hexToBuffer(hexString) {
  const matches = hexString.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

function getCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  throw new Error('Web Cryptography API is not available in this environment.');
}

/**
 * Securely hashes a plain text password using PBKDF2-SHA256 and a random salt.
 * @param {string} password - Plain text password
 * @returns {Promise<string|null>} Formatted hash string (e.g., pbkdf2_sha256$100000$salt$hash)
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    return null;
  }

  // Prevent double-hashing if already a formatted hash
  if (password.startsWith('pbkdf2_sha256$') || password.startsWith('pbkdf2$')) {
    return password;
  }

  try {
    const cryptoApi = getCrypto();
    // Generate 16 bytes (128 bits) of cryptographically secure random salt
    const salt = cryptoApi.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import the password as key material for PBKDF2
    const keyMaterial = await cryptoApi.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Derive 256 bits (32 bytes) key using PBKDF2-SHA256
    const derivedBits = await cryptoApi.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: DEFAULT_ITERATIONS,
        hash: HASH_ALGO
      },
      keyMaterial,
      256
    );

    const hashHex = bufferToHex(new Uint8Array(derivedBits));
    const saltHex = bufferToHex(salt);

    return `pbkdf2_sha256$${DEFAULT_ITERATIONS}$${saltHex}$${hashHex}`;
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Failed to securely hash password.');
  }
}

/**
 * Computes a raw SHA-256 hash of any string input.
 * @param {string} input - Plain text to hash
 * @returns {Promise<string>} Lowercase hex-encoded SHA-256 digest
 */
export async function sha256(input) {
  const cryptoApi = getCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(String(input));
  const hashBuffer = await cryptoApi.subtle.digest('SHA-256', data);
  return bufferToHex(new Uint8Array(hashBuffer));
}

/**
 * Verifies a candidate plain text password against a stored hash or legacy record.
 * @param {string} password - Candidate plain text password
 * @param {string} storedHash - Stored hash from database
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) {
    return false;
  }

  try {
    // Check if storedHash uses the PBKDF2 standard format
    if (storedHash.startsWith('pbkdf2_sha256$') || storedHash.startsWith('pbkdf2$')) {
      const parts = storedHash.split('$');
      if (parts.length !== 4) {
        return false;
      }

      const iterations = parseInt(parts[1], 10);
      const saltHex = parts[2];
      const targetHashHex = parts[3];

      if (isNaN(iterations) || !saltHex || !targetHashHex) {
        return false;
      }

      const cryptoApi = getCrypto();
      const salt = hexToBuffer(saltHex);
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);

      const keyMaterial = await cryptoApi.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await cryptoApi.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: iterations,
          hash: HASH_ALGO
        },
        keyMaterial,
        256
      );

      const computedHashHex = bufferToHex(new Uint8Array(derivedBits));
      return computedHashHex === targetHashHex;
    }

    // Fallback: Backward-compatibility for any pre-existing plain text records
    return password === storedHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
