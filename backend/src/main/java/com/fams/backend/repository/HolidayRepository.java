package com.fams.backend.repository;

import com.fams.backend.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    List<Holiday> findBySemesterId(Long semesterId);

    List<Holiday> findBySemesterIdIsNull();
}
