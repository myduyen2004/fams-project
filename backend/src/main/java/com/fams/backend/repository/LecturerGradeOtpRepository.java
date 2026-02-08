package com.fams.backend.repository;

import com.fams.backend.entity.LecturerGradeOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LecturerGradeOtpRepository extends JpaRepository<LecturerGradeOtp, Long> {

    Optional<LecturerGradeOtp> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}
