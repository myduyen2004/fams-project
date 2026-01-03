package com.fams.backend.repository;

import com.fams.backend.entity.LecturerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LecturerProfileRepository extends JpaRepository<LecturerProfile, Long> {
}
