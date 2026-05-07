package com.fams.backend.repository;

import com.fams.backend.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    /**
     * Find all active sessions (last activity within the specified time)
     */
    @Query("SELECT us FROM UserSession us WHERE us.isActive = true AND us.lastActivityTime > :threshold")
    List<UserSession> findActiveSessions(@Param("threshold") LocalDateTime threshold);

    /**
     * Count active sessions by province
     */
    @Query("SELECT us.province, COUNT(us) FROM UserSession us " +
            "WHERE us.isActive = true AND us.lastActivityTime > :threshold " +
            "GROUP BY us.province")
    List<Object[]> countActiveSessionsByProvince(@Param("threshold") LocalDateTime threshold);

    /**
     * Find active session for a specific user
     */
    @Query("SELECT us FROM UserSession us WHERE us.user.id = :userId AND us.isActive = true " +
            "ORDER BY us.lastActivityTime DESC")
    List<UserSession> findActiveSessionsByUserId(@Param("userId") Long userId);

    /**
     * Find the most recent session for a user
     */
    Optional<UserSession> findTopByUserIdOrderByLoginTimeDesc(Long userId);

    /**
     * Bulk fetch the latest login time for a list of users
     */
    @Query("SELECT us.user.id, MAX(us.loginTime) FROM UserSession us WHERE us.user.id IN :userIds GROUP BY us.user.id")
    List<Object[]> findLatestLoginTimesByUserIds(@Param("userIds") List<Long> userIds);

    /**
     * Delete old inactive sessions
     */
    @Query("DELETE FROM UserSession us WHERE us.lastActivityTime < :threshold")
    void deleteOldSessions(@Param("threshold") LocalDateTime threshold);
}
