package com.fams.backend.repository;

import com.fams.backend.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    List<Holiday> findBySemesterId(Long semesterId);

    List<Holiday> findBySemesterIdIsNull();

    @Modifying
    @Query("DELETE FROM Holiday h WHERE h.semester.id = :semesterId")
    void deleteBySemesterId(@Param("semesterId") Long semesterId);
}
