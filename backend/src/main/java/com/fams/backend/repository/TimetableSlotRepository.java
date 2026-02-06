package com.fams.backend.repository;

import com.fams.backend.entity.TimetableSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TimetableSlotRepository extends JpaRepository<TimetableSlot, Long> {

        // Derived queries for conflict checking
        boolean existsByRoomIdAndDateAndSlotNumberAndStatusNot(Long roomId, LocalDate date, Integer slotNumber,
                        TimetableSlot.TimetableSlotStatus status);

        boolean existsByClassSectionLecturerIdAndDateAndSlotNumberAndStatusNot(Long lecturerId, LocalDate date,
                        Integer slotNumber, TimetableSlot.TimetableSlotStatus status);

        boolean existsByClassSectionClassNameAndDateAndSlotNumberAndStatusNot(String className, LocalDate date,
                        Integer slotNumber, TimetableSlot.TimetableSlotStatus status);

        // Conflict checking while excluding specific slot ID (for reschedule/room
        // change)
        @Query("SELECT CASE WHEN COUNT(ts) > 0 THEN true ELSE false END FROM TimetableSlot ts " +
                        "WHERE ts.room.id = :roomId AND ts.date = :date AND ts.slotNumber = :slotNumber " +
                        "AND ts.status != :status AND ts.id != :excludeSlotId")
        boolean existsByRoomIdAndDateAndSlotNumberExcludingSlot(
                        @Param("roomId") Long roomId,
                        @Param("date") LocalDate date,
                        @Param("slotNumber") Integer slotNumber,
                        @Param("status") TimetableSlot.TimetableSlotStatus status,
                        @Param("excludeSlotId") Long excludeSlotId);

        @Query("SELECT CASE WHEN COUNT(ts) > 0 THEN true ELSE false END FROM TimetableSlot ts " +
                        "WHERE ts.classSection.lecturer.id = :lecturerId AND ts.date = :date AND ts.slotNumber = :slotNumber "
                        +
                        "AND ts.status != :status AND ts.id != :excludeSlotId")
        boolean existsByLecturerIdAndDateAndSlotNumberExcludingSlot(
                        @Param("lecturerId") Long lecturerId,
                        @Param("date") LocalDate date,
                        @Param("slotNumber") Integer slotNumber,
                        @Param("status") TimetableSlot.TimetableSlotStatus status,
                        @Param("excludeSlotId") Long excludeSlotId);

        @Query("SELECT CASE WHEN COUNT(ts) > 0 THEN true ELSE false END FROM TimetableSlot ts " +
                        "WHERE ts.classSection.className = :className AND ts.date = :date AND ts.slotNumber = :slotNumber "
                        +
                        "AND ts.status != :status AND ts.id != :excludeSlotId")
        boolean existsByClassNameAndDateAndSlotNumberExcludingSlot(
                        @Param("className") String className,
                        @Param("date") LocalDate date,
                        @Param("slotNumber") Integer slotNumber,
                        @Param("status") TimetableSlot.TimetableSlotStatus status,
                        @Param("excludeSlotId") Long excludeSlotId);

        List<TimetableSlot> findByRoomIdAndDateAndSlotNumberAndStatusNot(Long roomId, LocalDate date,
                        Integer slotNumber, TimetableSlot.TimetableSlotStatus status);

        List<TimetableSlot> findByClassSectionLecturerIdAndDateAndSlotNumberAndStatusNot(Long lecturerId,
                        LocalDate date,
                        Integer slotNumber, TimetableSlot.TimetableSlotStatus status);

        List<TimetableSlot> findByClassSectionClassNameAndDateAndSlotNumberAndStatusNot(String className,
                        LocalDate date,
                        Integer slotNumber, TimetableSlot.TimetableSlotStatus status);

        java.util.Optional<TimetableSlot> findByClassSectionClassNameAndDateAndSlotNumber(String className,
                        LocalDate date, Integer slotNumber);

        /**
         * Find all slots for a class section
         */
        @Query("SELECT ts FROM TimetableSlot ts " +
                        "JOIN FETCH ts.room r " +
                        "JOIN FETCH ts.slotType st " +
                        "WHERE ts.classSection.className = :className " +
                        "ORDER BY ts.date, ts.slotNumber")
        List<TimetableSlot> findByClassName(@Param("className") String className);

        /**
         * Find all slots for a semester (via class section)
         */
        @Query("SELECT ts FROM TimetableSlot ts " +
                        "JOIN FETCH ts.classSection cs " +
                        "LEFT JOIN FETCH cs.course c " +
                        "LEFT JOIN FETCH cs.lecturer lec " +
                        "JOIN FETCH ts.room r " +
                        "JOIN FETCH ts.slotType st " +
                        "WHERE cs.semester.code = :semesterCode " +
                        "ORDER BY ts.date, ts.slotNumber")
        List<TimetableSlot> findBySemesterCode(@Param("semesterCode") String semesterCode);

        /**
         * Find slots for a semester and specific date (optimized for single day view)
         */
        @Query("SELECT ts FROM TimetableSlot ts " +
                        "JOIN FETCH ts.classSection cs " +
                        "LEFT JOIN FETCH cs.course c " +
                        "LEFT JOIN FETCH cs.lecturer lec " +
                        "JOIN FETCH ts.room r " +
                        "JOIN FETCH ts.slotType st " +
                        "WHERE cs.semester.code = :semesterCode " +
                        "AND ts.date = :date " +
                        "ORDER BY ts.slotNumber")
        List<TimetableSlot> findBySemesterCodeAndDate(
                        @Param("semesterCode") String semesterCode,
                        @Param("date") LocalDate date);

        /**
         * Find slots for a semester within a date range (optimized for weekly
         * view/export)
         */
        @Query("SELECT ts FROM TimetableSlot ts " +
                        "JOIN FETCH ts.classSection cs " +
                        "LEFT JOIN FETCH cs.course c " +
                        "LEFT JOIN FETCH cs.lecturer lec " +
                        "JOIN FETCH ts.room r " +
                        "JOIN FETCH ts.slotType st " +
                        "WHERE cs.semester.code = :semesterCode " +
                        "AND ts.date BETWEEN :startDate AND :endDate " +
                        "ORDER BY ts.date, ts.slotNumber")
        List<TimetableSlot> findBySemesterCodeAndDateBetween(
                        @Param("semesterCode") String semesterCode,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /**
         * Find slots by date range
         */
        @Query("SELECT ts FROM TimetableSlot ts " +
                        "JOIN FETCH ts.classSection cs " +
                        "JOIN FETCH ts.room r " +
                        "JOIN FETCH ts.slotType st " +
                        "WHERE ts.date BETWEEN :startDate AND :endDate " +
                        "ORDER BY ts.date, ts.slotNumber")
        List<TimetableSlot> findByDateBetween(
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /**
         * Find slots for a student (via enrollment)
         */
        @Query("SELECT ts FROM TimetableSlot ts " +
                        "JOIN FETCH ts.classSection cs " +
                        "JOIN FETCH cs.course c " +
                        "LEFT JOIN FETCH cs.lecturer lec " +
                        "JOIN FETCH ts.room r " +
                        "JOIN FETCH ts.slotType st " +
                        "JOIN cs.enrollments e " +
                        "JOIN e.student s " +
                        "WHERE s.code = :studentCode " +
                        "AND e.status != com.fams.backend.entity.Enrollment.EnrollmentStatus.DROPPED " +
                        "AND ts.date BETWEEN :startDate AND :endDate " +
                        "AND ts.status = com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.SCHEDULED " +
                        "ORDER BY ts.date, ts.slotNumber")
        List<TimetableSlot> findByStudentCodeAndDateBetween(
                        @Param("studentCode") String studentCode,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /**
         * Find slots for a lecturer
         */
        @Query("SELECT ts FROM TimetableSlot ts " +
                        "JOIN FETCH ts.classSection cs " +
                        "JOIN FETCH cs.course c " +
                        "LEFT JOIN FETCH cs.lecturer lec " +
                        "JOIN FETCH ts.room r " +
                        "JOIN FETCH ts.slotType st " +
                        "WHERE cs.lecturer.id = :lecturerId " +
                        "AND ts.date BETWEEN :startDate AND :endDate " +
                        "AND ts.status = com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.SCHEDULED " +
                        "ORDER BY ts.date, ts.slotNumber")
        List<TimetableSlot> findByLecturerIdAndDateBetween(
                        @Param("lecturerId") Long lecturerId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /**
         * Find slots for a class and lecturer (ordered by date and slot number)
         */
        List<TimetableSlot> findByClassSectionClassNameAndClassSectionLecturerIdOrderByDateAscSlotNumberAsc(
                        String className, Long lecturerId);

        /**
         * Find slots for a room
         */
        @Query("SELECT ts FROM TimetableSlot ts " +
                        "JOIN FETCH ts.classSection cs " +
                        "JOIN FETCH ts.slotType st " +
                        "WHERE ts.room.id = :roomId " +
                        "AND ts.date BETWEEN :startDate AND :endDate " +
                        "ORDER BY ts.date, ts.slotNumber")
        List<TimetableSlot> findByRoomIdAndDateBetween(
                        @Param("roomId") Long roomId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /**
         * Delete all slots for a semester
         */
        @Modifying(clearAutomatically = true)
        @Transactional
        @Query("DELETE FROM TimetableSlot ts WHERE ts.classSection.className IN " +
                        "(SELECT cs.className FROM ClassSection cs WHERE cs.semester.code = :semesterCode)")
        void deleteBySemesterCode(@Param("semesterCode") String semesterCode);

        /**
         * Count slots by semester
         */
        @Query("SELECT COUNT(ts) FROM TimetableSlot ts " +
                        "WHERE ts.classSection.semester.code = :semesterCode")
        long countBySemesterCode(@Param("semesterCode") String semesterCode);

        /**
         * Check room availability at specific slot
         */
        @Query("SELECT CASE WHEN COUNT(ts) > 0 THEN false ELSE true END FROM TimetableSlot ts " +
                        "WHERE ts.room.id = :roomId " +
                        "AND ts.date = :date " +
                        "AND ts.slotNumber = :slotNumber " +
                        "AND ts.status = 'SCHEDULED'")
        boolean isRoomAvailable(
                        @Param("roomId") Long roomId,
                        @Param("date") LocalDate date,
                        @Param("slotNumber") Integer slotNumber);

        /**
         * Find conflicts for a slot assignment
         */
        @Query("SELECT ts FROM TimetableSlot ts " +
                        "WHERE ts.room.id = :roomId " +
                        "AND ts.date = :date " +
                        "AND ts.slotNumber = :slotNumber " +
                        "AND ts.status = 'SCHEDULED'")
        List<TimetableSlot> findConflicts(
                        @Param("roomId") Long roomId,
                        @Param("date") LocalDate date,
                        @Param("slotNumber") Integer slotNumber);

        /**
         * Find all busy room IDs for a specific date and slot
         */
        @Query("SELECT DISTINCT ts.room.id FROM TimetableSlot ts " +
                        "WHERE ts.date = :date " +
                        "AND ts.slotNumber = :slotNumber " +
                        "AND ts.status = 'SCHEDULED'")
        List<Long> findBusyRoomIds(
                        @Param("date") LocalDate date,
                        @Param("slotNumber") Integer slotNumber);

        /**
         * Find the earliest createdAt timestamp for a semester's timetable
         * This is used to compare with semester config updatedAt to detect config
         * changes
         */
        @Query("SELECT MIN(ts.createdAt) FROM TimetableSlot ts " +
                        "WHERE ts.classSection.semester.code = :semesterCode")
        java.time.LocalDateTime findEarliestCreatedAtBySemesterCode(@Param("semesterCode") String semesterCode);

        // ==================== STUDENT CONFLICT VALIDATION ====================

        /**
         * Check if any student in the class has a schedule conflict
         * with other classes on the target date and slot
         */
        @Query("SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END " +
                        "FROM Enrollment e1 " +
                        "JOIN Enrollment e2 ON e2.student.id = e1.student.id " +
                        "JOIN TimetableSlot ts2 ON ts2.classSection.className = e2.classSection.className " +
                        "WHERE e1.classSection.className = :className " +
                        "AND e1.status = 'ENROLLED' " +
                        "AND e2.classSection.className != :className " +
                        "AND e2.status = 'ENROLLED' " +
                        "AND ts2.date = :date " +
                        "AND ts2.slotNumber = :slotNumber " +
                        "AND ts2.status != 'CANCELLED'")
        boolean hasStudentConflict(
                        @Param("className") String className,
                        @Param("date") LocalDate date,
                        @Param("slotNumber") Integer slotNumber);

        /**
         * Count the number of students in the class who have schedule conflicts
         * with other classes on the target date and slot
         */
        @Query("SELECT COUNT(DISTINCT e1.student.id) " +
                        "FROM Enrollment e1 " +
                        "JOIN Enrollment e2 ON e2.student.id = e1.student.id " +
                        "JOIN TimetableSlot ts2 ON ts2.classSection.className = e2.classSection.className " +
                        "WHERE e1.classSection.className = :className " +
                        "AND e1.status = 'ENROLLED' " +
                        "AND e2.classSection.className != :className " +
                        "AND e2.status = 'ENROLLED' " +
                        "AND ts2.date = :date " +
                        "AND ts2.slotNumber = :slotNumber " +
                        "AND ts2.status != 'CANCELLED'")
        long countStudentConflicts(
                        @Param("className") String className,
                        @Param("date") LocalDate date,
                        @Param("slotNumber") Integer slotNumber);
}
