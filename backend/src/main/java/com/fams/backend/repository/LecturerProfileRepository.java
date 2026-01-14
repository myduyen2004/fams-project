package com.fams.backend.repository;

import com.fams.backend.entity.LecturerProfile;
import com.fams.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LecturerProfileRepository extends JpaRepository<LecturerProfile, Long> {
    Optional<LecturerProfile> findByUser(User user);

    boolean existsByUser(User user);

    List<LecturerProfile> findAllByUserIdIn(List<Long> userIds);
}
