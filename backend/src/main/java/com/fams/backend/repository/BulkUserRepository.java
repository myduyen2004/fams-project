package com.fams.backend.repository;

import com.fams.backend.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * High-performance JDBC repository for bulk operations.
 * Bypasses JPA overhead for extreme speed.
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class BulkUserRepository {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Ultra-fast bulk activation using native JDBC batch update.
     * ~100x faster than JPA saveAll for large datasets.
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
