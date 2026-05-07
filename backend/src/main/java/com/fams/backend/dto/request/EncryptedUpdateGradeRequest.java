package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Encrypted grade request received from the frontend.
 * The score is AES-256-GCM encrypted; the controller decrypts it
 * before passing a standard UpdateGradeRequest to the service layer.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EncryptedUpdateGradeRequest {

    private Long enrollmentId;

    private Long gradeComponentId;

    /**
     * Base64-encoded AES-GCM ciphertext (ciphertext bytes + 16-byte auth tag).
     * Null when no score has been entered.
     */
    private String encryptedScore;

    /**
     * Base64-encoded 12-byte random IV used during encryption.
     * Null when encryptedScore is null.
     */
    private String iv;

    private String note;
}
