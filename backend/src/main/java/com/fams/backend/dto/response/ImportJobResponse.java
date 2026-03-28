package com.fams.backend.dto.response;

import com.fams.backend.entity.ImportJob;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportJobResponse {
    private String jobId;
    private String type;
    private String status;
    private String filename;
    private Integer totalRecords;
    private Integer processedRecords;
    private Integer successCount;
    private Integer failedCount;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private Integer percentage;

    public static ImportJobResponse fromEntity(ImportJob job) {
        int percentage = 0;
        if (job.getTotalRecords() != null && job.getTotalRecords() > 0) {
            percentage = (int) ((job.getProcessedRecords() * 100.0) / job.getTotalRecords());
        }

        return ImportJobResponse.builder()
                .jobId(job.getJobId())
                .type(job.getType().name())
                .status(job.getStatus().name())
                .filename(job.getFilename())
                .totalRecords(job.getTotalRecords())
                .processedRecords(job.getProcessedRecords())
                .successCount(job.getSuccessCount())
                .failedCount(job.getFailedCount())
                .errorMessage(job.getErrorMessage())
                .createdAt(job.getCreatedAt())
                .completedAt(job.getCompletedAt())
                .percentage(percentage)
                .build();
    }
}
