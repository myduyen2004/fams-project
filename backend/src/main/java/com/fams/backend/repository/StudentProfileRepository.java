package com.fams.backend.repository;

import com.fams.backend.entity.StudentProfile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

    @Query("SELECT s FROM StudentProfile s ORDER BY s.gpa DESC")
    List<StudentProfile> findTop100ByOrderByGpaDesc(Pageable pageable);

    boolean existsByMajorId(Long majorId);

    boolean existsBySpecializationId(Long specializationId);

    boolean existsBySubSpecializationId(Long subSpecializationId);
}
