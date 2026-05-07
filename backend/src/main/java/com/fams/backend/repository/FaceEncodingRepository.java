package com.fams.backend.repository;

import com.fams.backend.entity.FaceEncoding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface FaceEncodingRepository extends JpaRepository<FaceEncoding, Long> {

    /**
     * Find all face encodings by user ID (1:N relationship)
     */
    java.util.List<FaceEncoding> findAllByUserId(Long userId);

    @Deprecated
    default java.util.Optional<FaceEncoding> findByUserId(Long userId) {
        java.util.List<FaceEncoding> list = findAllByUserId(userId);
        return list.isEmpty() ? java.util.Optional.empty() : java.util.Optional.of(list.get(0));
    }

    /**
     * Check if user has registered face data
     */
    boolean existsByUserId(Long userId);

    /**
     * Delete face encoding by user ID
     */
    void deleteByUserId(Long userId);

    /**
     * Count users with face data registered
     */
    @Query("SELECT COUNT(f) FROM FaceEncoding f WHERE f.livenessVerified = true")
    long countVerifiedEncodings();
}
