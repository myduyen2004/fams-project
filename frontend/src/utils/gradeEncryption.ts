/**
 * Grade Score Encryption Utility
 *
 * Uses AES-256-GCM (Web Crypto API) to encrypt grade scores before sending to the backend.
 * The same shared secret key is configured in both frontend (.env) and backend (application.yml).
 *
 * Format sent over the wire (EncryptedScorePayload):
 *   { encryptedScore: "<base64 ciphertext + tag>", iv: "<base64 12-byte IV>" }
 */

const GRADE_SECRET_KEY = import.meta.env.VITE_GRADE_ENCRYPTION_KEY || 'fams-grade-aes256-secret-key-2024';

// Derive a 256-bit CryptoKey from the shared passphrase using PBKDF2
let _cachedKey: CryptoKey | null = null;

async function getDerivedKey(): Promise<CryptoKey> {
    if (_cachedKey) return _cachedKey;

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(GRADE_SECRET_KEY),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    _cachedKey = await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            // Fixed salt — same value baked into backend config
            salt: enc.encode('fams-grade-salt-2024'),
            iterations: 100_000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    return _cachedKey;
}

export interface EncryptedScorePayload {
    encryptedScore: string; // base64 (ciphertext + 16-byte GCM auth tag)
    iv: string;             // base64 (12-byte random IV)
}

/**
 * Encrypts a numeric score (0–10) into an EncryptedScorePayload.
 * Returns null if score is null (no grade entered).
 */
export async function encryptScore(score: number | null): Promise<EncryptedScorePayload | null> {
    if (score === null || score === undefined) return null;

    const key = await getDerivedKey();
    const iv = new Uint8Array(window.crypto.getRandomValues(new Uint8Array(12)).buffer as ArrayBuffer);
    const enc = new TextEncoder();

    const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(String(score))
    );

    return {
        encryptedScore: uint8ToBase64(new Uint8Array(cipherBuffer)),
        iv: uint8ToBase64(iv),
    };
}

/**
 * Decrypts an EncryptedScorePayload back into a number (for testing / preview).
 */
export async function decryptScore(payload: EncryptedScorePayload): Promise<number> {
    const key = await getDerivedKey();
    const iv = base64ToUint8(payload.iv) as unknown as Uint8Array<ArrayBuffer>;
    const cipherBuffer = base64ToUint8(payload.encryptedScore) as unknown as Uint8Array<ArrayBuffer>;

    const plainBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherBuffer
    );

    return parseFloat(new TextDecoder().decode(plainBuffer));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
}

function base64ToUint8(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
