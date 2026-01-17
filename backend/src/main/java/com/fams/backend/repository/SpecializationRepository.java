package com.fams.backend.repository;

import com.fams.backend.entity.Major;
import com.fams.backend.entity.Specialization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpecializationRepository extends JpaRepository<Specialization, Long> {
        List<Specialization> findByMajorId(Long majorId);

        boolean existsByCode(String code);

        boolean existsByName(String name);

        @Query("SELECT DISTINCT s FROM Specialization s LEFT JOIN s.subSpecializations sub WHERE " +
                        "s.major.id = :majorId AND " +
                        "(:keyword IS NULL OR LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) "
                        +
                        "OR LOWER(sub.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(sub.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) "
                        +
                        "AND (:status IS NULL OR s.status = :status)")
        Page<Specialization> findByMajorIdAndSearch(Long majorId, String keyword,
                        Specialization.SpecializationStatus status, Pageable pageable);

        Optional<Specialization> findByCode(String code);

        Optional<Specialization> findByName(String name);

        Optional<Specialization> findByNameAndMajor(String name, Major major);
}
