package com.fams.backend.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.spec.KeySpec;
import java.util.Base64;

/**
 * AES-256-GCM grade score decryption utility.
 *
 * Mirrors the PBKDF2 key derivation used in the frontend's gradeEncryption.ts:
 *   - Algorithm  : AES-GCM (256-bit key)
 *   - KDF        : PBKDF2WithHmacSHA256
 *   - Iterations : 100,000
 *   - Salt       : "fams-grade-salt-2024" (shared, fixed)
 *   - IV         : 12 bytes (random per encryption, sent alongside ciphertext)
 *   - Auth tag   : 128 bits (GCM default)
 */
@Component
public class GradeEncryptionUtil {

    private static final String SALT = "fams-grade-salt-2024";
    private static final int ITERATIONS = 100_000;
    private static final int KEY_LENGTH = 256;
    private static final int GCM_TAG_BITS = 128;

    private final SecretKey secretKey;

    public GradeEncryptionUtil(
            @Value("${grade.encryption.key:fams-grade-aes256-secret-key-2024}") String passphrase) {
        try {
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            KeySpec spec = new PBEKeySpec(
                    passphrase.toCharArray(),
                    SALT.getBytes(StandardCharsets.UTF_8),
                    ITERATIONS,
                    KEY_LENGTH
            );
            byte[] keyBytes = factory.generateSecret(spec).getEncoded();
            this.secretKey = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialise grade encryption key", e);
        }
    }

    /**
     * Decrypt a score that was encrypted by the frontend.
     *
     * @param encryptedScoreBase64 Base64-encoded ciphertext (bytes + 16-byte GCM auth tag)
     * @param ivBase64             Base64-encoded 12-byte IV
     * @return Decrypted score as a Double
     * @throws RuntimeException if decryption fails (tampered data / wrong key)
     */
    public Double decryptScore(String encryptedScoreBase64, String ivBase64) {
        try {
            byte[] cipherBytes = Base64.getDecoder().decode(encryptedScoreBase64);
            byte[] ivBytes = Base64.getDecoder().decode(ivBase64);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec paramSpec = new GCMParameterSpec(GCM_TAG_BITS, ivBytes);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, paramSpec);

            byte[] plainBytes = cipher.doFinal(cipherBytes);
            return Double.parseDouble(new String(plainBytes, StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("Grade score decryption failed – possible tampering or key mismatch", e);
        }
    }
}
