package com.fams.backend.repository;

import com.fams.backend.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {
    Optional<Semester> findByCode(String code);

    @Query("SELECT s FROM Semester s " +
            "LEFT JOIN FETCH s.weekdays " +
            "LEFT JOIN FETCH s.holidays " +
            "LEFT JOIN FETCH s.config " +
            "WHERE s.code = :code")
    Optional<Semester> findByCodeWithDetails(String code);

    @Query("SELECT s FROM Semester s ORDER BY s.startDate DESC")
    List<Semester> findAllOrderByStartDateDesc();

    @Query("SELECT s FROM Semester s WHERE s.status = com.fams.backend.entity.Semester$SemesterStatus.ONGOING ORDER BY s.startDate DESC")
    List<Semester> findActiveSemesters();

    @Query("SELECT s FROM Semester s WHERE s.status = com.fams.backend.entity.Semester$SemesterStatus.UPCOMING ORDER BY s.startDate ASC")
    List<Semester> findUpcomingSemesters();

    @Query("SELECT s FROM Semester s WHERE (s.startDate <= :endDate AND s.endDate >= :startDate) AND s.code != :excludeCode")
    List<Semester> findOverlappingSemesters(java.time.LocalDate startDate, java.time.LocalDate endDate,
            String excludeCode);

    @Query("SELECT s FROM Semester s WHERE (s.startDate <= :endDate AND s.endDate >= :startDate)")
    List<Semester> findOverlappingSemestersForNew(java.time.LocalDate startDate, java.time.LocalDate endDate);

    @Query("SELECT s FROM Semester s WHERE :date >= s.startDate AND :date <= s.endDate")
    Optional<Semester> findSemesterByDate(java.time.LocalDate date);
}
