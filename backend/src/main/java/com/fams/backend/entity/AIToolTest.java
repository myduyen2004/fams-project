package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * AIToolTest (Lịch sử test công cụ AI)
 * Lưu trữ các kết quả test của AI chatbot đối với từng tool.
 */
@Entity
@Table(name = "ai_tool_tests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIToolTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tool_id", nullable = false)
    private AITool tool;

    @Column(name = "is_passed", nullable = false)
    @Builder.Default
    private Boolean isPassed = false;

    @Column(name = "test_query", columnDefinition = "TEXT")
    private String testQuery;

    @Column(name = "test_result_summary", columnDefinition = "TEXT")
    private String testResultSummary;

    @Column(name = "logs", columnDefinition = "TEXT")
    private String logs;

    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
