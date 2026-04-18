package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignment_text_embeddings", indexes = {
        @Index(name = "idx_ate_course_id", columnList = "course_id"),
        @Index(name = "idx_ate_submission_id", columnList = "submission_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentTextEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "page_or_chunk", length = 120)
    private String pageOrChunk;

    @Column(name = "content_preview", columnDefinition = "TEXT")
    private String contentPreview;

    @Column(name = "embedding", nullable = false, columnDefinition = "vector")
    private String embedding;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

