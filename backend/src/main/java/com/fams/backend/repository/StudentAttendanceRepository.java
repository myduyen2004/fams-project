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

        List<StudentAttendance> findBySessionIdIn(Collection<Long> sessionIds);

        Optional<StudentAttendance> findBySessionIdAndStudentId(Long sessionId, Long studentId);

        @Query("SELECT sa FROM StudentAttendance sa " +
                        "JOIN sa.session s " +
                        "WHERE sa.requiresManualVerify = true " +
                        "AND s.lecturer.id = :lecturerId " +
                        "ORDER BY sa.updatedAt DESC")
        List<StudentAttendance> findByRequiresManualVerifyTrueAndSessionLecturerId(
                        @Param("lecturerId") Long lecturerId);

        @Query("SELECT sa FROM StudentAttendance sa " +
                        "JOIN FETCH sa.session s " +
                        "JOIN FETCH s.timetableSlot ts " +
                        "JOIN FETCH ts.classSection cs " +
                        "WHERE sa.student.id = :studentId " +
                        "AND cs.className = :className")
        List<StudentAttendance> findByStudentIdAndClassName(
                        @Param("studentId") Long studentId,
                        @Param("className") String className);

        @Query("SELECT sa.session.id, COUNT(sa) FROM StudentAttendance sa WHERE sa.session.id IN :sessionIds AND sa.status = com.fams.backend.entity.StudentAttendance$AttendanceStatus.PRESENT GROUP BY sa.session.id")
        List<Object[]> countPresentBySessionIdIn(@Param("sessionIds") Collection<Long> sessionIds);

        @Query("SELECT COUNT(sa) FROM StudentAttendance sa WHERE sa.session.id = :sessionId AND sa.status = com.fams.backend.entity.StudentAttendance$AttendanceStatus.PRESENT")
        long countPresentBySessionId(@Param("sessionId") Long sessionId);
}
