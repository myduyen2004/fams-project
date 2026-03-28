package com.fams.backend.repository;

import com.fams.backend.entity.UserDeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDeviceTokenRepository extends JpaRepository<UserDeviceToken, Long> {
    List<UserDeviceToken> findByUserId(Long userId);

    List<UserDeviceToken> findByUserIdIn(List<Long> userIds);

    Optional<UserDeviceToken> findByToken(String token);

    void deleteByToken(String token);
}
