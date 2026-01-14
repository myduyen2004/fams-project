package com.fams.backend.repository;

import com.fams.backend.entity.SemesterWeekday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SemesterWeekdayRepository extends JpaRepository<SemesterWeekday, Long> {
    List<SemesterWeekday> findBySemesterId(Long semesterId);
}
