package com.fams.backend.repository;

import com.fams.backend.entity.Major;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MajorRepository extends JpaRepository<Major, Long> {

    boolean existsByCode(String code);

    boolean existsByName(String name);

    // Search by code or name of Major OR Specialization, and filter by status
    @Query("SELECT DISTINCT m FROM Major m LEFT JOIN m.specializations s WHERE " +
            "(:keyword IS NULL OR LOWER(m.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            +
            "OR LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) "
            +
            "AND (:status IS NULL OR m.status = :status)")
    Page<Major> searchMajors(String keyword, Major.MajorStatus status, Pageable pageable);

    Optional<Major> findByCode(String code);

    Optional<Major> findByName(String name);

    Optional<Major> findByNameIgnoreCase(String name);
}
