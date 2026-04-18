package com.fams.backend.service.plagiarism;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fams.backend.dto.plagiarism.PlagiarismCommentRequest;
import com.fams.backend.dto.plagiarism.PlagiarismCommentResponse;
import com.fams.backend.dto.plagiarism.SubmissionIndexingRequest;
import com.fams.backend.dto.plagiarism.SubmissionIndexingResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
@Slf4j
public class PlagiarismAiClient {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai-service.url:http://localhost:5000}")
    private String aiServiceUrl;

    public SubmissionIndexingResponse indexSubmission(SubmissionIndexingRequest request) {
        String url = aiServiceUrl + "/api/v1/plagiarism/index-submission";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<SubmissionIndexingRequest> entity = new HttpEntity<>(request, headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("AI-service index-submission failed: " + response.getStatusCode());
        }
        try {
            return objectMapper.readValue(response.getBody(), SubmissionIndexingResponse.class);
        } catch (Exception e) {
            throw new RuntimeException("Cannot parse index-submission response: " + e.getMessage(), e);
        }
    }

    public PlagiarismCommentResponse generateComments(PlagiarismCommentRequest request) {
        String url = aiServiceUrl + "/api/v1/plagiarism/generate-comments";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<PlagiarismCommentRequest> entity = new HttpEntity<>(request, headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("AI-service generate-comments failed: " + response.getStatusCode());
            }
            return objectMapper.readValue(response.getBody(), PlagiarismCommentResponse.class);
        } catch (Exception e) {
            log.warn("generate-comments failed, using fallback comments: {}", e.getMessage());
            return null;
        }
    }
}

