package com.fams.backend.repository;

import com.fams.backend.entity.AIToolTest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AIToolTestRepository extends JpaRepository<AIToolTest, Long> {
    
    // Get latest tests for a tool ordered by created_at desc
    List<AIToolTest> findByToolIdOrderByCreatedAtDesc(Long toolId, Pageable pageable);

    // Get count of passed tests out of the last N tests for a tool
    @Query(value = "SELECT COUNT(*) FROM (" +
                   "  SELECT is_passed FROM ai_tool_tests " +
                   "  WHERE tool_id = :toolId " +
                   "  ORDER BY created_at DESC LIMIT :limit" +
                   ") as recent_tests " +
                   "WHERE is_passed = true", nativeQuery = true)
    long countPassesInLastNTests(@Param("toolId") Long toolId, @Param("limit") int limit);
    
    // Get total count of last N tests (to handle case where there are fewer than N tests)
    @Query(value = "SELECT COUNT(*) FROM (" +
                   "  SELECT id FROM ai_tool_tests " +
                   "  WHERE tool_id = :toolId " +
                   "  ORDER BY created_at DESC LIMIT :limit" +
                   ") as recent_tests", nativeQuery = true)
    long countTotalInLastNTests(@Param("toolId") Long toolId, @Param("limit") int limit);
}
