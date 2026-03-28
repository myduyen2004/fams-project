package com.fams.backend.repository;

import com.fams.backend.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * High-performance JDBC repository for bulk operations.
 * Bypasses JPA overhead for extreme speed.
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class BulkUserRepository {

    private final JdbcTemplate jdbcTemplate; // Added JdbcTemplate field

    /**
     * Ultra-fast bulk insertion using native JDBC batch update.
     */
    @Transactional
    public void bulkInsertUsers(List<User> users) {
        if (users.isEmpty())
            return;

        String sql = "INSERT INTO users (full_name, code, username, password, email, phone, dob, role, status, face_data_status, avatar, created_at, updated_at, is_password_changed) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        long start = System.currentTimeMillis();
        LocalDateTime now = LocalDateTime.now();

        jdbcTemplate.batchUpdate(sql, users, 500, (ps, user) -> {
            ps.setString(1, user.getFullName());
            ps.setString(2, user.getCode());
            ps.setString(3, user.getUsername());
            ps.setString(4, user.getPassword());
            ps.setString(5, user.getEmail());
            ps.setString(6, user.getPhone());
            ps.setObject(7, user.getDob());
            ps.setString(8, user.getRole().name());
            ps.setString(9, user.getStatus().name());
            ps.setString(10, user.getFaceDataStatus().name());
            ps.setString(11, user.getAvatar());
            ps.setObject(12, now);
            ps.setObject(13, now);
            ps.setBoolean(14, false);
        });

        long elapsed = System.currentTimeMillis() - start;
        log.info("JDBC Bulk Insert: {} users in {}ms", users.size(), elapsed);
    }

    /**
     * Ultra-fast bulk activation using native JDBC batch update.
     */
    @Transactional
    public int bulkActivateUsers(List<User> users) {
        if (users.isEmpty())
            return 0;

        String sql = "UPDATE users SET username = ?, password = ?, status = 'ACTIVE', is_password_changed = false WHERE id = ?";

        long start = System.currentTimeMillis();

        int[][] results = jdbcTemplate.batchUpdate(sql, users, 500, (ps, user) -> {
            ps.setString(1, user.getUsername());
            ps.setString(2, user.getPassword());
            ps.setLong(3, user.getId());
        });

        int totalUpdated = 0;
        for (int[] batch : results) {
            for (int r : batch) {
                totalUpdated += r;
            }
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("JDBC Bulk Update: {} users in {}ms", totalUpdated, elapsed);

        return totalUpdated;
    }
}
