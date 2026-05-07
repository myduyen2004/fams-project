package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignment_plagiarism_checks", indexes = {
        @Index(name = "idx_apc_assignment", columnList = "assignment_id"),
        @Index(name = "idx_apc_target_submission", columnList = "target_submission_id"),
        @Index(name = "idx_apc_compared_submission", columnList = "compared_submission_id"),
        @Index(name = "idx_apc_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentPlagiarismCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "target_submission_id", nullable = false)
    private Long targetSubmissionId;

    @Column(name = "compared_submission_id")
    private Long comparedSubmissionId;

    @Column(name = "checker_lecturer_id", nullable = false)
    private Long checkerLecturerId;

    @Column(name = "scope", nullable = false, length = 100)
    private String scope;

    @Column(name = "model_name", nullable = false, length = 120)
    private String modelName;

    @Column(name = "strategy", nullable = false, length = 255)
    private String strategy;

    @Column(name = "text_score")
    private Double textScore;

    @Column(name = "image_score")
    private Double imageScore;

    @Column(name = "metadata_score")
    private Double metadataScore;

    @Column(name = "file_name_score")
    private Double fileNameScore;

    @Column(name = "probability")
    private Double probability;

    @Column(name = "plagiarism_percent")
    private Integer plagiarismPercent;

    @Column(name = "plagiarized")
    private Boolean plagiarized;

    @Column(name = "plagiarized_text")
    private Boolean plagiarizedText;

    @Column(name = "plagiarized_image")
    private Boolean plagiarizedImage;

    @Column(name = "text_threshold")
    private Double textThreshold;

    @Column(name = "image_threshold")
    private Double imageThreshold;

    @Column(name = "overall_comment", columnDefinition = "TEXT")
    private String overallComment;

    @Column(name = "match_comment", columnDefinition = "TEXT")
    private String matchComment;

    @Column(name = "reason_tags", length = 500)
    private String reasonTags;

    @Column(name = "index_coverage")
    private Double indexCoverage;

    @Column(name = "target_text_length")
    private Integer targetTextLength;

    @Column(name = "compared_text_length")
    private Integer comparedTextLength;

    @Column(name = "content_based", nullable = false)
    @Builder.Default
    private Boolean contentBased = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
