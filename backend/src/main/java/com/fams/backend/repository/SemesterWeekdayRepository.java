package com.fams.backend.repository;

import com.fams.backend.entity.SemesterWeekday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SemesterWeekdayRepository extends JpaRepository<SemesterWeekday, Long> {
    List<SemesterWeekday> findBySemesterId(Long semesterId);

    @Modifying
    @Query("DELETE FROM SemesterWeekday sw WHERE sw.semester.id = :semesterId")
    void deleteBySemesterId(@Param("semesterId") Long semesterId);
}
