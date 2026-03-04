package com.fams.backend.dto.response;

import com.fams.backend.entity.AssignmentSubmission;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSubmissionResponse {

    private Long id;

    // Assignment info
    private Long assignmentId;
    private String assignmentTitle;
    private String className;
    private String courseCode;
    private String courseName;

    // Student info
    private String studentCode;
    private String studentName;

    // Submission info
    private List<String> fileUrls;
    private List<String> fileNames;
    private String note;
    private String lecturerComment;
    private AssignmentSubmission.SubmissionStatus status;
    private LocalDateTime submittedAt;

    // Assignment config
    private LocalDateTime assignmentDueDate;

    // Lecturer reference file
    private String referenceUrl;
    private String referenceName;
}
