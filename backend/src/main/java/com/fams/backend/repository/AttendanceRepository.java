package com.fams.backend.repository;

import com.fams.backend.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    long countByIsPresentTrue();

    long countByIsPresentFalse();
}
