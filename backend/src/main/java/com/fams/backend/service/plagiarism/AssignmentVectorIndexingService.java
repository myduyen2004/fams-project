package com.fams.backend.service.plagiarism;

import com.fams.backend.dto.plagiarism.EmbeddingVectorPayload;
import com.fams.backend.dto.plagiarism.SubmissionIndexingRequest;
import com.fams.backend.dto.plagiarism.SubmissionIndexingResponse;
import com.fams.backend.entity.AssignmentSubmission;
import com.fams.backend.entity.AssignmentSubmissionVectorIndex;
import com.fams.backend.entity.AssignmentSubmissionVectorIndex.VectorIndexStatus;
import com.fams.backend.repository.AssignmentSubmissionRepository;
import com.fams.backend.repository.AssignmentSubmissionVectorIndexRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssignmentVectorIndexingService {

    private final AssignmentSubmissionRepository submissionRepository;
    private final AssignmentSubmissionVectorIndexRepository vectorIndexRepository;
    private final PlagiarismAiClient plagiarismAiClient;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public void enqueueSubmissionIndexing(Long submissionId) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Bài nộp không tồn tại: " + submissionId));

        Long courseId = submission.getAssignment().getClassSection().getCourse().getId();
        AssignmentSubmissionVectorIndex state = vectorIndexRepository.findBySubmission_Id(submissionId)
                .orElse(AssignmentSubmissionVectorIndex.builder()
                        .submission(submission)
                        .courseId(courseId)
                        .attemptCount(0)
                        .build());

        state.setStatus(VectorIndexStatus.PENDING);
        state.setErrorMessage(null);
        state.setIndexedAt(null);
        vectorIndexRepository.save(state);

        processSubmissionIndexingAsync(submissionId);
    }

    @Async("plagiarismExecutor")
    @Transactional
    public void processSubmissionIndexingAsync(Long submissionId) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Bài nộp không tồn tại: " + submissionId));
        Long courseId = submission.getAssignment().getClassSection().getCourse().getId();

        AssignmentSubmissionVectorIndex state = vectorIndexRepository.findBySubmission_Id(submissionId)
                .orElse(AssignmentSubmissionVectorIndex.builder()
                        .submission(submission)
                        .courseId(courseId)
                        .attemptCount(0)
                        .build());
        state.setStatus(VectorIndexStatus.PROCESSING);
        state.setErrorMessage(null);
        state.setAttemptCount((state.getAttemptCount() == null ? 0 : state.getAttemptCount()) + 1);
        vectorIndexRepository.save(state);

        try {
            SubmissionIndexingRequest request = SubmissionIndexingRequest.builder()
                    .submissionId(submission.getId())
                    .assignmentId(submission.getAssignment().getId())
                    .courseId(courseId)
                    .studentId(submission.getStudent().getId())
                    .note(submission.getNote())
                    .fileUrls(splitTriplePipe(submission.getFileUrl()))
                    .fileNames(splitTriplePipe(submission.getFileName()))
                    .build();

            SubmissionIndexingResponse response = plagiarismAiClient.indexSubmission(request);
            replaceSubmissionEmbeddings(submission, response);

            state.setStatus(VectorIndexStatus.INDEXED);
            state.setErrorMessage(null);
            state.setIndexedAt(LocalDateTime.now());
            vectorIndexRepository.save(state);
            log.info("Vector indexing success for submission {}", submissionId);
        } catch (Exception e) {
            state.setStatus(VectorIndexStatus.FAILED);
            state.setErrorMessage(e.getMessage());
            vectorIndexRepository.save(state);
            log.error("Vector indexing failed for submission {}: {}", submissionId, e.getMessage(), e);
        }
    }

    private List<String> splitTriplePipe(String value) {
        if (value == null || value.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(value.split("\\|\\|\\|"))
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .toList();
    }

    private void replaceSubmissionEmbeddings(AssignmentSubmission submission, SubmissionIndexingResponse response) {
        jdbcTemplate.update("DELETE FROM assignment_text_embeddings WHERE submission_id = ?", submission.getId());
        jdbcTemplate.update("DELETE FROM assignment_image_embeddings WHERE submission_id = ?", submission.getId());


        List<EmbeddingVectorPayload> textEmbeddings = response.getTextEmbeddings() == null
            ? List.of()
            : response.getTextEmbeddings();
        List<EmbeddingVectorPayload> imageEmbeddings = response.getImageEmbeddings() == null
            ? List.of()
            : response.getImageEmbeddings();

        List<String> fileNames = splitTriplePipe(submission.getFileName());
        List<String> fileUrls = splitTriplePipe(submission.getFileUrl());
        boolean textExpected = hasAnyTextCandidate(fileNames, fileUrls) || (submission.getNote() != null && !submission.getNote().isBlank());

        if (textExpected && textEmbeddings.isEmpty()) {
            if (response.getWarnings() != null && !response.getWarnings().isEmpty()) {
            log.warn("Không tạo được text embeddings cho submission {}: {}", submission.getId(), response.getWarnings());
            } else {
            throw new RuntimeException("Không tạo được text embeddings cho bài có nội dung văn bản (doc/docx/pdf/txt).");
            }
        }

        for (EmbeddingVectorPayload payload : textEmbeddings) {
            if (payload.getEmbedding() == null || payload.getEmbedding().isEmpty()) {
                continue;
            }
            jdbcTemplate.update("""
                    INSERT INTO assignment_text_embeddings(
                        submission_id, assignment_id, course_id, student_id,
                        file_name, page_or_chunk, content_preview, embedding
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS vector))
                    """,
                    submission.getId(),
                    submission.getAssignment().getId(),
                    submission.getAssignment().getClassSection().getCourse().getId(),
                    submission.getStudent().getId(),
                    payload.getFileName(),
                    payload.getPageOrChunk(),
                    payload.getContentPreview(),
                    toVectorLiteral(payload.getEmbedding()));
        }
        log.info("Inserted {} text embeddings for submission {}", textEmbeddings.size(), submission.getId());

        for (EmbeddingVectorPayload payload : imageEmbeddings) {
            if (payload.getEmbedding() == null || payload.getEmbedding().isEmpty()) {
                continue;
            }
            jdbcTemplate.update("""
                    INSERT INTO assignment_image_embeddings(
                        submission_id, assignment_id, course_id, student_id,
                        file_name, page_or_chunk, content_preview, embedding
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS vector))
                    """,
                    submission.getId(),
                    submission.getAssignment().getId(),
                    submission.getAssignment().getClassSection().getCourse().getId(),
                    submission.getStudent().getId(),
                    payload.getFileName(),
                    payload.getPageOrChunk(),
                    payload.getContentPreview(),
                    toVectorLiteral(payload.getEmbedding()));
        }
        log.info("Inserted {} image embeddings for submission {}", imageEmbeddings.size(), submission.getId());
    }

    private boolean hasAnyTextCandidate(List<String> fileNames, List<String> fileUrls) {
        return fileNames.stream().anyMatch(this::isTextFileHint) || fileUrls.stream().anyMatch(this::isTextFileHint);
    }

    private boolean isTextFileHint(String value) {
        String lower = value == null ? "" : value.toLowerCase(Locale.ROOT);
        if (lower.isBlank()) {
            return false;
        }
        return lower.contains(".pdf")
                || lower.contains(".docx")
                || lower.contains(".doc")
                || lower.contains(".txt")
                || lower.contains(".md")
                || lower.contains(".csv")
                || lower.contains(".json");
    }

    private String toVectorLiteral(List<Double> embedding) {
        StringBuilder builder = new StringBuilder("[");
        for (int i = 0; i < embedding.size(); i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(embedding.get(i));
        }
        builder.append(']');
        return builder.toString();
    }
}
