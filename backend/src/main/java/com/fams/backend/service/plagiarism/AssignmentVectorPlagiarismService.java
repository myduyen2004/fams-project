package com.fams.backend.service.plagiarism;

import com.fams.backend.dto.plagiarism.PlagiarismCommentMatchInput;
import com.fams.backend.dto.plagiarism.PlagiarismCommentRequest;
import com.fams.backend.dto.plagiarism.PlagiarismCommentResponse;
import com.fams.backend.dto.response.AssignmentPlagiarismMatchResponse;
import com.fams.backend.dto.response.AssignmentPlagiarismResponse;
import com.fams.backend.dto.response.PlagiarismEvidenceFragmentResponse;
import com.fams.backend.dto.response.PlagiarismEvidenceItemResponse;
import com.fams.backend.entity.Assignment;
import com.fams.backend.entity.AssignmentPlagiarismCheck;
import com.fams.backend.entity.AssignmentSubmission;
import com.fams.backend.entity.AssignmentSubmissionVectorIndex.VectorIndexStatus;
import com.fams.backend.repository.AssignmentPlagiarismCheckRepository;
import com.fams.backend.repository.AssignmentRepository;
import com.fams.backend.repository.AssignmentSubmissionRepository;
import com.fams.backend.repository.AssignmentSubmissionVectorIndexRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssignmentVectorPlagiarismService {

    private static final int TOP_MATCH_LIMIT = 5;
    private static final int EVIDENCE_LIMIT = 3;
    private static final String COMMENT_PREFIX = "Sau khi phân tích thì ";
    private static final double DEFAULT_TEXT_THRESHOLD = 0.70d;
    private static final double DEFAULT_IMAGE_THRESHOLD = 0.95d;
    private static final Set<String> IMAGE_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp");
    private static final Set<String> TEXT_EXTENSIONS = Set.of(".txt", ".md", ".csv", ".json", ".pdf", ".docx", ".doc");

    private static final String TAG_DIRECT_COPY = "DIRECT_COPY";
    private static final String TAG_IMPROPER_PARAPHRASING = "IMPROPER_PARAPHRASING";
    private static final String TAG_IDEA_PLAGIARISM = "IDEA_PLAGIARISM";
    private static final String TAG_MOSAIC_PATCHWRITING = "MOSAIC_PATCHWRITING";
    private static final String TAG_SELF_PLAGIARISM = "SELF_PLAGIARISM";
    private static final String TAG_MIS_CITATION = "MIS_CITATION";
    private static final String TAG_UNINTENTIONAL_RISK = "UNINTENTIONAL_RISK";
    private static final String TAG_INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE";

    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final AssignmentSubmissionVectorIndexRepository vectorIndexRepository;
    private final AssignmentPlagiarismCheckRepository plagiarismCheckRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PlagiarismAiClient plagiarismAiClient;

    @Transactional(readOnly = true)
    public AssignmentPlagiarismResponse checkPlagiarism(Long assignmentId, Long submissionId, Long lecturerId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại: " + assignmentId));

        if (!assignment.getClassSection().getLecturer().getId().equals(lecturerId)) {
            throw new RuntimeException("Bạn không phải giảng viên của lớp này");
        }

        AssignmentSubmission targetSubmission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Bài nộp không tồn tại: " + submissionId));

        if (!targetSubmission.getAssignment().getId().equals(assignmentId)) {
            throw new RuntimeException("Bài nộp không thuộc bài tập này");
        }

        if (targetSubmission.getStatus() != AssignmentSubmission.SubmissionStatus.SUBMITTED) {
            throw new RuntimeException("Chỉ có thể kiểm tra đạo văn cho bài đã nộp");
        }

        Long courseId = assignment.getClassSection().getCourse().getId();
        String courseCode = assignment.getClassSection().getCourse().getCode();
        double textThreshold = normalizeThreshold(assignment.getPlagiarismTextThreshold(), DEFAULT_TEXT_THRESHOLD);
        double imageThreshold = normalizeThreshold(assignment.getPlagiarismImageThreshold(), DEFAULT_IMAGE_THRESHOLD);
        boolean targetHasImage = hasImageAttachment(targetSubmission);
        boolean targetHasText = hasTextContent(targetSubmission);

        Map<Long, Double> textScores = computeSimilarityScores(submissionId, courseId, lecturerId, true);
        Map<Long, Double> imageScores = computeSimilarityScores(submissionId, courseId, lecturerId, false);

        Set<Long> candidateIds = new HashSet<>();
        candidateIds.addAll(textScores.keySet());
        candidateIds.addAll(imageScores.keySet());

        List<AssignmentSubmission> candidateSubmissions = candidateIds.isEmpty()
                ? List.of()
                : submissionRepository.findAllById(candidateIds);
        Map<Long, AssignmentSubmission> candidateMap = new HashMap<>();
        for (AssignmentSubmission candidate : candidateSubmissions) {
            candidateMap.put(candidate.getId(), candidate);
        }

        List<AssignmentPlagiarismMatchResponse> allMatches = candidateIds.stream()
                .map(candidateId -> buildMatch(
                        targetSubmission,
                        candidateId,
                        courseId,
                        lecturerId,
                        targetHasText,
                        targetHasImage,
                        candidateMap.get(candidateId),
                        textScores,
                        imageScores,
                        textThreshold,
                        imageThreshold))
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparingInt((AssignmentPlagiarismMatchResponse match) -> isSuspect(match) ? 0 : 1)
                        .thenComparing((AssignmentPlagiarismMatchResponse match) -> Math
                                .max(safeDouble(match.getTextScore()), safeDouble(match.getImageScore())),
                                Comparator.reverseOrder()))
                .toList();

        List<AssignmentPlagiarismMatchResponse> topMatches = allMatches.stream()
                .limit(TOP_MATCH_LIMIT)
                .toList();
        List<AssignmentPlagiarismMatchResponse> topTextMatches = allMatches.stream()
                .filter(match -> Boolean.TRUE.equals(match.getTextSuspect()))
                .limit(TOP_MATCH_LIMIT)
                .toList();
        List<AssignmentPlagiarismMatchResponse> topImageMatches = allMatches.stream()
                .filter(match -> Boolean.TRUE.equals(match.getImageSuspect()))
                .limit(TOP_MATCH_LIMIT)
                .toList();

        boolean plagiarizedText = !topTextMatches.isEmpty();
        boolean plagiarizedImage = !topImageMatches.isEmpty();
        boolean plagiarized = plagiarizedText || plagiarizedImage;

        double strongestTextScore = topTextMatches.isEmpty() ? 0.0d : safeDouble(topTextMatches.get(0).getTextScore());
        double strongestImageScore = topImageMatches.isEmpty() ? 0.0d
                : safeDouble(topImageMatches.get(0).getImageScore());
        double strongestCombined = Math.max(strongestTextScore, strongestImageScore);

        int plagiarismPercent = plagiarized ? clampPercent(strongestCombined * 100d) : 0;
        double probability = plagiarized ? round4(strongestCombined) : 0.0d;

        long totalSubmitted = submissionRepository.findSubmittedByCourseId(courseId).stream()
                .filter(sub -> !Objects.equals(sub.getId(), submissionId))
                .count();
        long indexedSubmitted = vectorIndexRepository.countIndexedInCourseExcludingSubmission(courseId, submissionId);
        long pendingCount = vectorIndexRepository.countByCourseIdAndStatusIn(
                courseId,
                List.of(VectorIndexStatus.PENDING, VectorIndexStatus.PROCESSING));
        double indexCoverage = totalSubmitted == 0 ? 1.0d : round4((double) indexedSubmitted / (double) totalSubmitted);
        String coverageNote = pendingCount > 0
                ? "Có " + pendingCount + " bài đang được index, kết quả hiện tại dựa trên dữ liệu đã sẵn sàng."
                : null;

        AssignmentPlagiarismResponse response = AssignmentPlagiarismResponse.builder()
                .assignmentId(assignmentId)
                .submissionId(submissionId)
                .assignmentTitle(assignment.getTitle())
                .className(assignment.getClassSection().getClassName())
                .courseCode(courseCode)
                .courseName(assignment.getClassSection().getCourse().getName())
                .studentCode(targetSubmission.getStudent().getCode())
                .studentName(targetSubmission.getStudent().getFullName())
                .scope("vector-course:" + courseCode)
                .model("cohere_text + jina_image + vector_knn_v1")
                .strategy("vector search by course + independent text/image thresholds")
                .plagiarismPercent(plagiarismPercent)
                .originalityPercent(Math.max(0, 100 - plagiarismPercent))
                .probability(probability)
                .plagiarized(plagiarized)
                .plagiarizedText(plagiarizedText)
                .plagiarizedImage(plagiarizedImage)
                .textThreshold(textThreshold)
                .imageThreshold(imageThreshold)
                .comparedSubmissionCount((int) totalSubmitted)
                .textScore(round4(strongestTextScore))
                .imageScore(round4(strongestImageScore))
                .metadataScore(0.0d)
                .fileNameScore(0.0d)
                .keySignals(buildKeySignals(plagiarizedText, plagiarizedImage, strongestTextScore, strongestImageScore,
                        textThreshold, imageThreshold))
                .topMatches(new ArrayList<>(topMatches))
                .topTextMatches(new ArrayList<>(topTextMatches))
                .topImageMatches(new ArrayList<>(topImageMatches))
                .indexCoverage(indexCoverage)
                .pendingIndexedSubmissionCount((int) pendingCount)
                .coverageNote(coverageNote)
                .build();

        applyLlmComments(response);
        persistAuditLogs(assignmentId, lecturerId, response);
        return response;
    }

    private AssignmentPlagiarismMatchResponse buildMatch(
            AssignmentSubmission targetSubmission,
            Long candidateId,
            Long courseId,
            Long lecturerId,
            boolean targetHasText,
            boolean targetHasImage,
            AssignmentSubmission candidate,
            Map<Long, Double> textScores,
            Map<Long, Double> imageScores,
            double textThreshold,
            double imageThreshold) {
        if (candidate == null) {
            return null;
        }

        boolean candidateHasText = hasTextContent(candidate);
        boolean candidateHasImage = hasImageAttachment(candidate);

        // Only compare same modality to avoid cross-type false positives (e.g., image
        // vs docx)
        double textScore = (targetHasText && candidateHasText)
                ? round4(textScores.getOrDefault(candidateId, 0.0d))
                : 0.0d;
        double imageScore = (targetHasImage && candidateHasImage)
                ? round4(imageScores.getOrDefault(candidateId, 0.0d))
                : 0.0d;
        boolean textSuspect = textScore >= textThreshold;
        boolean imageSuspect = imageScore >= imageThreshold;
        double strongest = Math.max(textScore, imageScore);

        List<PlagiarismEvidenceItemResponse> evidence = buildTopEvidence(
                targetSubmission.getId(),
                candidateId,
                courseId,
                lecturerId,
                textSuspect,
                imageSuspect);

        List<String> reasonTags = deriveReasonTags(targetSubmission, candidate, textScore, imageScore, evidence,
                textThreshold, imageThreshold);
        String reasonSummary = buildRuleBasedReasonSummary(reasonTags, evidence);

        List<String> signals = new ArrayList<>();
        if (textSuspect) {
            signals.add("Văn bản vượt ngưỡng nghi ngờ (>= " + clampPercent(textThreshold * 100d) + "%)");
        }
        if (imageSuspect) {
            signals.add("Hình ảnh vượt ngưỡng nghi ngờ (>= " + clampPercent(imageThreshold * 100d) + "%)");
        }
        if (signals.isEmpty()) {
            signals.add("Chưa có tín hiệu vượt ngưỡng theo text hoặc image");
        }
        if (targetHasImage && !candidateHasImage) {
            signals.add("Bài đối chiếu không có file ảnh, bỏ qua so sánh ảnh");
        }
        if (targetHasText && !candidateHasText) {
            signals.add("Bài đối chiếu không có nội dung văn bản, bỏ qua so sánh text");
        }

        String notePreview = candidate.getNote() == null ? "" : candidate.getNote();
        if (notePreview.length() > 180) {
            notePreview = notePreview.substring(0, 180) + "...";
        }

        AssignmentPlagiarismMatchResponse.MatchCategory category = (textSuspect || imageSuspect)
                ? AssignmentPlagiarismMatchResponse.MatchCategory.PLAGIARISM_SUSPECT
                : AssignmentPlagiarismMatchResponse.MatchCategory.LOW_SIMILARITY;

        return AssignmentPlagiarismMatchResponse.builder()
                .submissionId(candidateId)
                .studentCode(candidate.getStudent().getCode())
                .studentName(candidate.getStudent().getFullName())
                .className(candidate.getAssignment().getClassSection().getClassName())
                .assignmentTitle(candidate.getAssignment().getTitle())
                .plagiarismPercent(clampPercent(strongest * 100d))
                .probability(round4(strongest))
                .textScore(textScore)
                .imageScore(imageScore)
                .metadataScore(0.0d)
                .fileNameScore(0.0d)
                .submittedAt(candidate.getSubmittedAt())
                .notePreview(notePreview)
                .fileNames(splitTriplePipe(candidate.getFileName()))
                .sharedSignals(signals)
                .matchCategory(category)
                .topicSimilarOnly(false)
                .textSuspect(textSuspect)
                .imageSuspect(imageSuspect)
                .reasonTags(reasonTags)
                .reasonSummary(reasonSummary)
                .evidenceTop3(evidence)
                .comparedFileLinks(splitTriplePipe(candidate.getFileUrl()))
                .build();
    }

    private List<PlagiarismEvidenceItemResponse> buildTopEvidence(
            Long targetSubmissionId,
            Long candidateSubmissionId,
            Long courseId,
            Long lecturerId,
            boolean includeText,
            boolean includeImage) {
        List<PlagiarismEvidenceItemResponse> rows = new ArrayList<>();
        if (includeText) {
            rows.addAll(fetchPairwiseEvidence(targetSubmissionId, candidateSubmissionId, courseId, lecturerId, true,
                    EVIDENCE_LIMIT));
        }
        if (includeImage) {
            rows.addAll(fetchPairwiseEvidence(targetSubmissionId, candidateSubmissionId, courseId, lecturerId, false,
                    EVIDENCE_LIMIT));
        }

        return rows.stream()
                .sorted(Comparator
                        .comparingDouble(item -> safeDouble(((PlagiarismEvidenceItemResponse) item).getSimilarity()))
                        .reversed())
                .limit(EVIDENCE_LIMIT)
                .toList();
    }

    private List<PlagiarismEvidenceItemResponse> fetchPairwiseEvidence(
            Long targetSubmissionId,
            Long candidateSubmissionId,
            Long courseId,
            Long lecturerId,
            boolean textMode,
            int limit) {
        String tableName = textMode ? "assignment_text_embeddings" : "assignment_image_embeddings";
        String modality = textMode ? "TEXT" : "IMAGE";
        String sql = """
                WITH target AS (
                    SELECT file_name, page_or_chunk, content_preview, embedding
                    FROM %s
                    WHERE submission_id = ?
                ),
                candidate AS (
                    SELECT file_name, page_or_chunk, content_preview, embedding, assignment_id
                    FROM %s
                    WHERE submission_id = ? AND course_id = ?
                )
                SELECT
                    1 - (candidate.embedding <=> target.embedding) AS similarity,
                    target.file_name AS target_file_name,
                    target.page_or_chunk AS target_page_or_chunk,
                    target.content_preview AS target_content_preview,
                    candidate.file_name AS compared_file_name,
                    candidate.page_or_chunk AS compared_page_or_chunk,
                    candidate.content_preview AS compared_content_preview
                FROM target
                JOIN candidate ON true
                JOIN assignments a ON candidate.assignment_id = a.id
                WHERE a.created_by = ?
                ORDER BY similarity DESC
                LIMIT ?
                """.formatted(tableName, tableName);

        return jdbcTemplate.query(sql, ps -> {
            ps.setLong(1, targetSubmissionId);
            ps.setLong(2, candidateSubmissionId);
            ps.setLong(3, courseId);
            ps.setLong(4, lecturerId);
            ps.setInt(5, limit);
        }, rs -> {
            List<PlagiarismEvidenceItemResponse> items = new ArrayList<>();
            while (rs.next()) {
                double similarity = Math.max(0.0d, rs.getDouble("similarity"));
                items.add(PlagiarismEvidenceItemResponse.builder()
                        .modality(modality)
                        .similarity(round4(similarity))
                        .target(PlagiarismEvidenceFragmentResponse.builder()
                                .fileName(rs.getString("target_file_name"))
                                .pageOrChunk(rs.getString("target_page_or_chunk"))
                                .contentPreview(trimPreview(rs.getString("target_content_preview")))
                                .build())
                        .compared(PlagiarismEvidenceFragmentResponse.builder()
                                .fileName(rs.getString("compared_file_name"))
                                .pageOrChunk(rs.getString("compared_page_or_chunk"))
                                .contentPreview(trimPreview(rs.getString("compared_content_preview")))
                                .build())
                        .build());
            }
            return items;
        });
    }

    private List<String> deriveReasonTags(
            AssignmentSubmission targetSubmission,
            AssignmentSubmission candidateSubmission,
            double textScore,
            double imageScore,
            List<PlagiarismEvidenceItemResponse> evidence,
            double textThreshold,
            double imageThreshold) {
        LinkedHashSet<String> tags = new LinkedHashSet<>();

        boolean textSuspect = textScore >= textThreshold;
        boolean imageSuspect = imageScore >= imageThreshold;

        if (!textSuspect && !imageSuspect) {
            tags.add(TAG_INSUFFICIENT_EVIDENCE);
            return new ArrayList<>(tags);
        }

        if (Objects.equals(targetSubmission.getStudent().getId(), candidateSubmission.getStudent().getId())) {
            tags.add(TAG_SELF_PLAGIARISM);
        }

        if (textSuspect) {
            if (textScore >= 0.93d) {
                tags.add(TAG_DIRECT_COPY);
            } else if (textScore >= 0.85d) {
                tags.add(TAG_IMPROPER_PARAPHRASING);
            } else {
                tags.add(TAG_IDEA_PLAGIARISM);
            }

            long distinctComparedSources = evidence.stream()
                    .filter(item -> "TEXT".equalsIgnoreCase(item.getModality()))
                    .map(item -> item.getCompared() == null ? ""
                            : safeText(item.getCompared().getFileName()) + "::"
                                    + safeText(item.getCompared().getPageOrChunk()))
                    .filter(value -> !value.isBlank())
                    .distinct()
                    .count();
            if (distinctComparedSources >= 2 && textScore >= 0.78d) {
                tags.add(TAG_MOSAIC_PATCHWRITING);
            }

            if (hasCitationIndicators(targetSubmission) && textScore >= 0.75d) {
                tags.add(TAG_MIS_CITATION);
            }

            if (textScore >= textThreshold && textScore < 0.78d && !tags.contains(TAG_DIRECT_COPY)) {
                tags.add(TAG_UNINTENTIONAL_RISK);
            }
        }

        if (imageSuspect && !textSuspect) {
            tags.add(TAG_IDEA_PLAGIARISM);
        }

        if (tags.isEmpty()) {
            tags.add(TAG_INSUFFICIENT_EVIDENCE);
        }

        return new ArrayList<>(tags);
    }

    private boolean hasCitationIndicators(AssignmentSubmission submission) {
        String text = safeText(submission.getNote()).toLowerCase(Locale.ROOT);
        if (text.isBlank()) {
            return false;
        }
        return text.contains("nguồn")
                || text.contains("tham khảo")
                || text.contains("reference")
                || text.contains("http://")
                || text.contains("https://")
                || text.contains("[1]");
    }

    private String buildRuleBasedReasonSummary(List<String> reasonTags, List<PlagiarismEvidenceItemResponse> evidence) {
        if (reasonTags == null || reasonTags.isEmpty() || reasonTags.contains(TAG_INSUFFICIENT_EVIDENCE)) {
            return "Dữ liệu hiện tại chưa đủ mạnh để kết luận rõ loại vi phạm; cần đối chiếu thủ công thêm nguồn và nội dung chi tiết.";
        }

        String dominantTag = reasonTags.get(0);
        String evidenceHint = evidence == null || evidence.isEmpty()
                ? "chưa có đoạn bằng chứng nổi bật"
                : "đã ghi nhận " + evidence.size() + " cặp đoạn/trang có độ tương đồng cao";

        return switch (dominantTag) {
            case TAG_DIRECT_COPY -> "Nghi ngờ sao chép trực tiếp vì mức tương đồng rất cao và " + evidenceHint
                    + ". Cần kiểm tra nguyên văn và trích dẫn nguồn.";
            case TAG_IMPROPER_PARAPHRASING ->
                "Nghi ngờ diễn đạt lại chưa đúng chuẩn học thuật; nội dung gần với bài đối chiếu và " + evidenceHint
                        + ".";
            case TAG_IDEA_PLAGIARISM ->
                "Nghi ngờ trùng ý tưởng/cấu trúc lập luận giữa hai bài; hệ thống ghi nhận " + evidenceHint + ".";
            case TAG_MOSAIC_PATCHWRITING ->
                "Nghi ngờ dạng ghép mảnh nội dung từ nhiều đoạn tương tự; hệ thống ghi nhận " + evidenceHint + ".";
            case TAG_SELF_PLAGIARISM ->
                "Nghi ngờ tự đạo văn do bài cùng sinh viên có mức tương đồng cao; cần kiểm tra quy định tái sử dụng nội dung.";
            case TAG_MIS_CITATION ->
                "Nghi ngờ trích dẫn chưa đầy đủ/chưa chính xác dù có dấu hiệu tham chiếu nguồn; cần rà soát mục tài liệu tham khảo.";
            case TAG_UNINTENTIONAL_RISK ->
                "Mức tương đồng đang sát ngưỡng nghi ngờ, có khả năng đạo văn vô ý; cần hướng dẫn bổ sung trích dẫn và diễn giải lại.";
            default -> "Hệ thống phát hiện tín hiệu tương đồng nhưng vẫn cần đối chiếu thủ công trước khi kết luận.";
        };
    }

    private String trimPreview(String contentPreview) {
        String raw = safeText(contentPreview).replaceAll("\\s+", " ").trim();
        if (raw.length() <= 200) {
            return raw;
        }
        return raw.substring(0, 200) + "...";
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }

    private List<String> buildKeySignals(boolean plagiarizedText, boolean plagiarizedImage, double strongestTextScore,
            double strongestImageScore, double textThreshold, double imageThreshold) {
        List<String> signals = new ArrayList<>();
        if (plagiarizedText) {
            signals.add("Có bài vượt ngưỡng đạo văn văn bản (>= " + clampPercent(textThreshold * 100d) + "%)");
        }
        if (plagiarizedImage) {
            signals.add("Có bài vượt ngưỡng đạo ảnh (>= " + clampPercent(imageThreshold * 100d) + "%)");
        }
        if (signals.isEmpty()) {
            signals.add("Không có bài vượt ngưỡng theo văn bản hoặc hình ảnh");
        } else {
            signals.add("Text cao nhất: " + clampPercent(strongestTextScore * 100d) + "%");
            signals.add("Image cao nhất: " + clampPercent(strongestImageScore * 100d) + "%");
        }
        return signals;
    }

    private boolean isSuspect(AssignmentPlagiarismMatchResponse match) {
        return match != null
                && (Boolean.TRUE.equals(match.getTextSuspect()) || Boolean.TRUE.equals(match.getImageSuspect()));
    }

    private Map<Long, Double> computeSimilarityScores(Long submissionId, Long courseId, Long lecturerId,
            boolean textMode) {
        String tableName = textMode ? "assignment_text_embeddings" : "assignment_image_embeddings";
        String sql = """
                WITH target AS (
                    SELECT embedding
                    FROM %s
                    WHERE submission_id = ?
                )
                SELECT candidate.submission_id AS candidate_submission_id,
                       MAX(1 - (candidate.embedding <=> target.embedding)) AS similarity
                FROM target
                JOIN %s candidate ON candidate.course_id = ? AND candidate.submission_id <> ?
                JOIN assignments a ON candidate.assignment_id = a.id
                WHERE a.created_by = ?
                GROUP BY candidate.submission_id
                ORDER BY similarity DESC
                """.formatted(tableName, tableName);

        return jdbcTemplate.query(sql, ps -> {
            ps.setLong(1, submissionId);
            ps.setLong(2, courseId);
            ps.setLong(3, submissionId);
            ps.setLong(4, lecturerId);
        }, rs -> {
            Map<Long, Double> map = new HashMap<>();
            while (rs.next()) {
                map.put(rs.getLong("candidate_submission_id"), Math.max(0.0d, rs.getDouble("similarity")));
            }
            return map;
        });
    }

    private void applyLlmComments(AssignmentPlagiarismResponse response) {
        List<AssignmentPlagiarismMatchResponse> suspectMatches = response.getTopMatches().stream()
                .filter(this::isSuspect)
                .toList();

        List<PlagiarismCommentMatchInput> matchInputs = suspectMatches.stream()
                .map(match -> {
                    List<String> aiSignals = new ArrayList<>(
                            match.getSharedSignals() == null ? List.of() : match.getSharedSignals());
                    if (match.getReasonTags() != null && !match.getReasonTags().isEmpty()) {
                        aiSignals.add("reasonTags=" + String.join(",", match.getReasonTags()));
                    }
                    if (match.getEvidenceTop3() != null && !match.getEvidenceTop3().isEmpty()) {
                        for (PlagiarismEvidenceItemResponse item : match.getEvidenceTop3()) {
                            aiSignals.add("evidence=" + safeText(item.getModality()) + "@"
                                    + Math.round(safeDouble(item.getSimilarity()) * 100) + "%");
                        }
                    }

                    return PlagiarismCommentMatchInput.builder()
                            .submissionId(match.getSubmissionId())
                            .studentCode(match.getStudentCode())
                            .studentName(match.getStudentName())
                            .plagiarismPercent(match.getPlagiarismPercent())
                            .textScore(match.getTextScore())
                            .imageScore(match.getImageScore())
                            .metadataScore(0.0d)
                            .matchCategory(match.getMatchCategory() != null ? match.getMatchCategory().name() : null)
                            .topicSimilarOnly(false)
                            .textSuspect(Boolean.TRUE.equals(match.getTextSuspect()))
                            .imageSuspect(Boolean.TRUE.equals(match.getImageSuspect()))
                            .sharedSignals(aiSignals)
                            .build();
                })
                .toList();

        PlagiarismCommentRequest request = PlagiarismCommentRequest.builder()
                .assignmentId(response.getAssignmentId())
                .submissionId(response.getSubmissionId())
                .assignmentTitle(response.getAssignmentTitle())
                .courseCode(response.getCourseCode())
                .studentName(response.getStudentName())
                .plagiarismPercent(response.getPlagiarismPercent())
                .probability(response.getProbability())
                .plagiarizedText(response.getPlagiarizedText())
                .plagiarizedImage(response.getPlagiarizedImage())
                .textThreshold(response.getTextThreshold())
                .imageThreshold(response.getImageThreshold())
                .topMatches(matchInputs)
                .build();

        PlagiarismCommentResponse commentResponse = plagiarismAiClient.generateComments(request);
        if (commentResponse == null) {
            response.setOverallComment(sanitizeOverallComment(
                    normalizeCommentPrefix(buildFallbackOverallComment(response)),
                    response));
            for (AssignmentPlagiarismMatchResponse match : response.getTopMatches()) {
                String fallbackComment = sanitizeMatchComment(
                        normalizeCommentPrefix(buildFallbackMatchComment(match)),
                        match);
                match.setMatchComment(fallbackComment);
                match.setReasonSummary(match.getReasonSummary() == null || match.getReasonSummary().isBlank()
                        ? buildRuleBasedReasonSummary(match.getReasonTags(), match.getEvidenceTop3())
                        : match.getReasonSummary());
            }
            return;
        }

        String normalizedOverall = normalizeCommentPrefix(commentResponse.getOverallComment());
        response.setOverallComment(sanitizeOverallComment(normalizedOverall, response));
        Map<Long, String> commentsByMatchId = new HashMap<>();
        if (commentResponse.getMatchComments() != null) {
            for (PlagiarismCommentResponse.MatchComment matchComment : commentResponse.getMatchComments()) {
                commentsByMatchId.put(matchComment.getSubmissionId(),
                        normalizeCommentPrefix(matchComment.getComment()));
            }
        }
        response.getTopMatches().forEach(match -> {
            String normalized = commentsByMatchId.getOrDefault(match.getSubmissionId(),
                    normalizeCommentPrefix(buildFallbackMatchComment(match)));
            String sanitized = sanitizeMatchComment(normalized, match);
            match.setMatchComment(sanitized);
            match.setReasonSummary(sanitized);
        });
    }

    private String buildFallbackOverallComment(AssignmentPlagiarismResponse response) {
        boolean textSuspect = Boolean.TRUE.equals(response.getPlagiarizedText());
        boolean imageSuspect = Boolean.TRUE.equals(response.getPlagiarizedImage());
        int textThresholdPercent = clampPercent(safeDouble(response.getTextThreshold()) * 100d);
        int imageThresholdPercent = clampPercent(safeDouble(response.getImageThreshold()) * 100d);

        if (!textSuspect && !imageSuspect) {
            return "chưa có bài nào vượt ngưỡng nghi ngờ theo văn bản (" + textThresholdPercent
                    + "%) hoặc hình ảnh (" + imageThresholdPercent + "%).";
        }
        if (textSuspect && imageSuspect) {
            return "bài nộp có dấu hiệu nghi ngờ ở cả văn bản và hình ảnh, cần đối chiếu thủ công các bài tương tự.";
        }
        if (textSuspect) {
            return "bài nộp có dấu hiệu nghi ngờ chủ yếu theo văn bản (>= " + textThresholdPercent
                    + "%), cần rà soát phần nội dung tài liệu.";
        }
        return "bài nộp có dấu hiệu nghi ngờ chủ yếu theo hình ảnh (>= " + imageThresholdPercent
                + "%), cần rà soát phần ảnh đính kèm.";
    }

    private String buildFallbackMatchComment(AssignmentPlagiarismMatchResponse match) {
        boolean textSuspect = Boolean.TRUE.equals(match.getTextSuspect());
        boolean imageSuspect = Boolean.TRUE.equals(match.getImageSuspect());
        if (textSuspect && imageSuspect) {
            return "match vượt ngưỡng ở cả văn bản và hình ảnh; đây là tín hiệu nghi ngờ và cần đối chiếu thủ công trước khi kết luận.";
        }
        if (textSuspect) {
            return "match vượt ngưỡng nghi ngờ theo văn bản; cần kiểm tra đoạn tương đồng và trích dẫn đi kèm.";
        }
        if (imageSuspect) {
            return "match vượt ngưỡng nghi ngờ theo hình ảnh; cần rà soát nguồn ảnh và chú thích sử dụng.";
        }
        return "match chưa vượt ngưỡng nghi ngờ theo văn bản hoặc hình ảnh.";
    }

    private String normalizeCommentPrefix(String comment) {
        String content = comment == null ? "" : comment.trim();
        if (content.isBlank()) {
            return COMMENT_PREFIX + "chưa có đủ dữ liệu để đưa ra nhận định chắc chắn.";
        }
        if (content.toLowerCase(Locale.ROOT).startsWith(COMMENT_PREFIX.toLowerCase(Locale.ROOT))) {
            String rest = content.substring(COMMENT_PREFIX.length()).trim();
            if (rest.isBlank()) {
                return COMMENT_PREFIX + "chưa có đủ dữ liệu để đưa ra nhận định chắc chắn.";
            }
            return COMMENT_PREFIX + Character.toLowerCase(rest.charAt(0)) + rest.substring(1);
        }
        return COMMENT_PREFIX + Character.toLowerCase(content.charAt(0)) + content.substring(1);
    }

    private String sanitizeOverallComment(String comment, AssignmentPlagiarismResponse response) {
        if (comment == null || comment.isBlank()) {
            return normalizeCommentPrefix(buildFallbackOverallComment(response));
        }
        if ((Boolean.TRUE.equals(response.getPlagiarizedText()) || Boolean.TRUE.equals(response.getPlagiarizedImage()))
                && containsInsufficientEvidenceLanguage(comment)) {
            return normalizeCommentPrefix(buildFallbackOverallComment(response));
        }
        return comment;
    }

    private String sanitizeMatchComment(String comment, AssignmentPlagiarismMatchResponse match) {
        if (comment == null || comment.isBlank()) {
            return normalizeCommentPrefix(buildFallbackMatchComment(match));
        }
        if (isSuspect(match) && containsInsufficientEvidenceLanguage(comment)) {
            return normalizeCommentPrefix(buildFallbackMatchComment(match));
        }
        return comment;
    }

    private boolean containsInsufficientEvidenceLanguage(String text) {
        String normalized = safeText(text).toLowerCase(Locale.ROOT);
        return normalized.contains("chưa đủ bằng chứng")
                || normalized.contains("chưa có đủ dữ liệu")
                || normalized.contains("insufficient evidence")
                || normalized.contains("not enough evidence");
    }

    private void persistAuditLogs(Long assignmentId, Long lecturerId, AssignmentPlagiarismResponse response) {
        try {
            List<AssignmentPlagiarismCheck> logs = new ArrayList<>();
            if (response.getTopMatches() == null || response.getTopMatches().isEmpty()) {
                logs.add(AssignmentPlagiarismCheck.builder()
                        .assignmentId(assignmentId)
                        .targetSubmissionId(response.getSubmissionId())
                        .checkerLecturerId(lecturerId)
                        .scope(response.getScope())
                        .modelName(response.getModel())
                        .strategy(response.getStrategy())
                        .textScore(response.getTextScore())
                        .imageScore(response.getImageScore())
                        .metadataScore(0.0d)
                        .fileNameScore(response.getFileNameScore())
                        .probability(response.getProbability())
                        .plagiarismPercent(response.getPlagiarismPercent())
                        .plagiarized(response.getPlagiarized())
                        .plagiarizedText(response.getPlagiarizedText())
                        .plagiarizedImage(response.getPlagiarizedImage())
                        .textThreshold(response.getTextThreshold())
                        .imageThreshold(response.getImageThreshold())
                        .overallComment(response.getOverallComment())
                        .indexCoverage(response.getIndexCoverage())
                        .targetTextLength(0)
                        .comparedTextLength(0)
                        .contentBased(true)
                        .build());
            } else {
                for (AssignmentPlagiarismMatchResponse match : response.getTopMatches()) {
                    logs.add(AssignmentPlagiarismCheck.builder()
                            .assignmentId(assignmentId)
                            .targetSubmissionId(response.getSubmissionId())
                            .comparedSubmissionId(match.getSubmissionId())
                            .checkerLecturerId(lecturerId)
                            .scope(response.getScope())
                            .modelName(response.getModel())
                            .strategy(response.getStrategy())
                            .textScore(match.getTextScore())
                            .imageScore(match.getImageScore())
                            .metadataScore(0.0d)
                            .fileNameScore(match.getFileNameScore())
                            .probability(match.getProbability())
                            .plagiarismPercent(match.getPlagiarismPercent())
                            .plagiarized(isSuspect(match))
                            .plagiarizedText(match.getTextSuspect())
                            .plagiarizedImage(match.getImageSuspect())
                            .textThreshold(response.getTextThreshold())
                            .imageThreshold(response.getImageThreshold())
                            .overallComment(response.getOverallComment())
                            .matchComment(match.getMatchComment())
                            .reasonTags(match.getReasonTags() != null ? String.join(",", match.getReasonTags()) : null)
                            .indexCoverage(response.getIndexCoverage())
                            .targetTextLength(0)
                            .comparedTextLength(0)
                            .contentBased(true)
                            .build());
                }
            }
            plagiarismCheckRepository.saveAll(logs);

            // Update submission summary
            submissionRepository.findById(response.getSubmissionId()).ifPresent(sub -> {
                sub.setPlagiarismPercent(response.getPlagiarismPercent());
                sub.setPlagiarismStatus(response.getPlagiarized() ? "SUSPECT" : "SAFE");
                submissionRepository.save(sub);
            });
        } catch (Exception e) {
            log.warn("Failed to persist plagiarism vector audit logs for submission {}: {}", response.getSubmissionId(),
                    e.getMessage());
        }
    }

    private List<String> splitTriplePipe(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split("\\|\\|\\|"))
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .toList();
    }

    private boolean hasImageAttachment(AssignmentSubmission submission) {
        return splitTriplePipe(submission.getFileName()).stream()
                .map(name -> name.toLowerCase(Locale.ROOT))
                .anyMatch(this::isImageFileName);
    }

    private boolean hasTextContent(AssignmentSubmission submission) {
        if (submission.getNote() != null && !submission.getNote().trim().isBlank()) {
            return true;
        }
        return splitTriplePipe(submission.getFileName()).stream()
                .map(name -> name.toLowerCase(Locale.ROOT))
                .anyMatch(this::isTextFileName);
    }

    private boolean isImageFileName(String fileName) {
        return IMAGE_EXTENSIONS.stream().anyMatch(fileName::endsWith);
    }

    private boolean isTextFileName(String fileName) {
        return TEXT_EXTENSIONS.stream().anyMatch(fileName::endsWith);
    }

    private int clampPercent(double value) {
        return Math.max(0, Math.min(100, (int) Math.round(value)));
    }

    private double round4(double value) {
        return Math.round(value * 10000.0d) / 10000.0d;
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0d : value;
    }

    private double normalizeThreshold(Double configured, double defaultValue) {
        if (configured == null || configured < 0.0d || configured > 1.0d) {
            return defaultValue;
        }
        return configured;
    }
}
