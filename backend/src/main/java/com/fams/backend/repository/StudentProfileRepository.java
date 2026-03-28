package com.fams.backend.repository;

import com.fams.backend.dto.response.GroupedStatDTO;
import com.fams.backend.entity.StudentProfile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

    @Query("SELECT s FROM StudentProfile s JOIN FETCH s.user ORDER BY s.gpa DESC")
    List<StudentProfile> findTop100ByOrderByGpaDesc(Pageable pageable);

    boolean existsByMajorId(Long majorId);

    boolean existsBySpecializationId(Long specializationId);

    boolean existsBySubSpecializationId(Long subSpecializationId);

    @Query("SELECT new com.fams.backend.dto.response.GroupedStatDTO(" +
            "COALESCE(m.name, 'Chưa xác định'), COUNT(s)) " +
            "FROM StudentProfile s " +
            "LEFT JOIN s.major m " +
            "GROUP BY m.name")
    List<GroupedStatDTO> countByMajor();
}
