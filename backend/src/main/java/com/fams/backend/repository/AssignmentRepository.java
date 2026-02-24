package com.fams.backend.repository;

import com.fams.backend.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    List<Assignment> findByClassSection_ClassNameOrderByCreatedAtDesc(String className);

    List<Assignment> findByClassSection_ClassNameAndStatusOrderByCreatedAtDesc(
            String className, Assignment.AssignmentStatus status);

    List<Assignment> findByCreatedBy_IdOrderByCreatedAtDesc(Long lecturerId);

    List<Assignment> findByTimetableSlotIdIn(List<Long> slotIds);

    /**
     * Tìm bài tập trong cửa sổ [from, to] chưa gửi reminder.
     * Dùng cho scheduler nhắc nhở trước hạn nộp 1 ngày.
     */
    @Query("SELECT a FROM Assignment a " +
            "JOIN FETCH a.classSection cs " +
            "JOIN FETCH cs.course " +
            "JOIN FETCH a.createdBy " +
            "WHERE a.status = 'OPEN' " +
            "AND a.reminderSent = false " +
            "AND a.dueDate BETWEEN :from AND :to")
    List<Assignment> findDueForReminder(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
