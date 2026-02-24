package com.fams.backend.repository;

import com.fams.backend.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    List<Assignment> findByClassSection_ClassNameOrderByCreatedAtDesc(String className);

    List<Assignment> findByClassSection_ClassNameAndStatusOrderByCreatedAtDesc(
            String className, Assignment.AssignmentStatus status);

    List<Assignment> findByCreatedBy_IdOrderByCreatedAtDesc(Long lecturerId);

    List<Assignment> findByTimetableSlotIdIn(List<Long> slotIds);
}
