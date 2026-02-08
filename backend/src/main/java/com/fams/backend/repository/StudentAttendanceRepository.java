package com.fams.backend.repository;

import com.fams.backend.entity.StudentAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentAttendanceRepository extends JpaRepository<StudentAttendance, Long> {

    @Query("SELECT sa FROM StudentAttendance sa " +
            "JOIN FETCH sa.session s " +
            "JOIN FETCH s.timetableSlot ts " +
            "WHERE sa.student.id = :studentId " +
            "AND ts.id IN :slotIds")
    List<StudentAttendance> findByStudentIdAndSlotIds(
            @Param("studentId") Long studentId,
            @Param("slotIds") Collection<Long> slotIds);

    List<StudentAttendance> findBySessionId(Long sessionId);

    Optional<StudentAttendance> findBySessionIdAndStudentId(Long sessionId, Long studentId);

    @Query("SELECT sa FROM StudentAttendance sa " +
            "JOIN sa.session s " +
            "WHERE sa.requiresManualVerify = true " +
            "AND s.lecturer.id = :lecturerId " +
            "ORDER BY sa.updatedAt DESC")
    List<StudentAttendance> findByRequiresManualVerifyTrueAndSessionLecturerId(
            @Param("lecturerId") Long lecturerId);
}
