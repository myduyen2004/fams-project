package com.fams.backend.repository;

import com.fams.backend.entity.Specialization;
import com.fams.backend.entity.SubSpecialization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubSpecializationRepository extends JpaRepository<SubSpecialization, Long> {

        Optional<SubSpecialization> findByCode(String code);

        Optional<SubSpecialization> findByName(String name);

        boolean existsByCode(String code);

        boolean existsByName(String name);

        List<SubSpecialization> findBySpecializationId(Long specializationId);

        @Query("SELECT ss FROM SubSpecialization ss WHERE ss.specialization.id = :specId " +
                        "AND (:keyword IS NULL OR :keyword = '' OR LOWER(ss.code) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR LOWER(ss.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))) "
                        +
                        "AND (:status IS NULL OR ss.status = :status) " +
                        "ORDER BY ss.code ASC")
        Page<SubSpecialization> findBySpecializationIdAndSearch(@Param("specId") Long specId,
                        @Param("keyword") String keyword,
                        @Param("status") SubSpecialization.SubSpecializationStatus status,
                        Pageable pageable);

        long countBySpecializationId(Long specializationId);

        @Query("SELECT COUNT(ss) FROM SubSpecialization ss WHERE ss.specialization.id = :specId AND ss.status = 'ACTIVE'")
        long countActiveBySpecializationId(@Param("specId") Long specId);

        Optional<SubSpecialization> findByNameAndSpecialization(String name, Specialization specialization);

        Optional<SubSpecialization> findByNameIgnoreCaseAndSpecialization(String name, Specialization specialization);
}
