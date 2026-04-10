package com.fams.backend.service.impl;

import com.fams.backend.dto.AIToolTestRequestDto;
import com.fams.backend.dto.AIToolTestResponseDto;
import com.fams.backend.entity.AITool;
import com.fams.backend.entity.AIToolTest;
import com.fams.backend.repository.AIToolRepository;
import com.fams.backend.repository.AIToolTestRepository;
import com.fams.backend.service.AIToolInventory;
import com.fams.backend.service.AIToolService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIToolServiceImpl implements AIToolService {

    private final AIToolRepository aiToolRepository;
    private final AIToolTestRepository aiToolTestRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai-service.url:http://localhost:5000}")
    private String aiServiceBaseUrl;

    private void reloadAiToolRegistry() {
        String reloadUrl = aiServiceBaseUrl + "/api/chat/admin/reload-tools";
        try {
            restTemplate.postForObject(reloadUrl, null, Object.class);
        } catch (Exception e) {
            log.warn("Failed to reload AI tool registry after DB change: {}", e.getMessage());
        }
    }

    @Override
    public List<AITool> getAllTools() {
        return aiToolRepository.findAllByOrderByNameAsc().stream()
                .filter(tool -> AIToolInventory.isManagedTool(tool.getName()))
                .collect(Collectors.toList());
    }

    @Override
    public AITool getToolById(Long id) {
        AITool tool = aiToolRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("AI Tool not found with id: " + id));
        ensureManagedTool(tool);
        return tool;
    }

    @Override
    @Transactional
    public AITool createTool(AITool tool) {
        validateManagedToolName(tool.getName());
        AITool savedTool = aiToolRepository.save(tool);
        reloadAiToolRegistry();
        return savedTool;
    }

    @Override
    @Transactional
    public AITool updateTool(Long id, AITool toolDetails) {
        AITool tool = getToolById(id);
        validateManagedToolName(toolDetails.getName());
        tool.setName(toolDetails.getName());
        tool.setType(toolDetails.getType());
        tool.setDescription(toolDetails.getDescription());
        tool.setSqlTemplate(toolDetails.getSqlTemplate());
        tool.setAccuracyPercentage(toolDetails.getAccuracyPercentage());
        tool.setIsActive(toolDetails.getIsActive());
        tool.setAllowedRoles(toolDetails.getAllowedRoles());
        tool.setRequiredFields(toolDetails.getRequiredFields());
        tool.setRequiredRespFields(toolDetails.getRequiredRespFields());
        AITool savedTool = aiToolRepository.save(tool);
        reloadAiToolRegistry();
        return savedTool;
    }

    @Override
    @Transactional
    public void deleteTool(Long id) {
        getToolById(id);
        throw new RuntimeException("Core AI tools are fixed and cannot be deleted from tool management.");
    }

    @Override
    @Transactional
    public AITool toggleStatus(Long id) {
        AITool tool = getToolById(id);
        tool.setIsActive(!tool.getIsActive());
        AITool savedTool = aiToolRepository.save(tool);
        reloadAiToolRegistry();
        return savedTool;
    }

    @Override
    public List<AIToolTest> getLatestTests(Long id) {
        return aiToolTestRepository.findByToolIdOrderByCreatedAtDesc(id, PageRequest.of(0, 10));
    }

    @Override
    @Transactional
    public AIToolTest runTest(Long id, java.util.Map<String, Object> params) {
        AITool tool = getToolById(id);
        
        AIToolTestRequestDto requestDto = AIToolTestRequestDto.builder()
                .toolName(tool.getName())
                .toolType(tool.getType())
                .sqlTemplate(tool.getSqlTemplate())
                .requiredFields(tool.getRequiredFields())
                .requiredRespFields(tool.getRequiredRespFields())
                .params(params)
                .build();
                
        // Mặc định gọi đến AI Service đang mở cổng 8001
        String aiServiceUrl = aiServiceBaseUrl + "/api/chat/admin/test-tool";
        AIToolTestResponseDto responseDto = null;
        try {
            responseDto = restTemplate.postForObject(aiServiceUrl, requestDto, AIToolTestResponseDto.class);
        } catch (Exception e) {
            responseDto = AIToolTestResponseDto.builder()
                    .passed(false)
                    .message("Failed to connect to AI Service: " + e.getMessage())
                    .build();
        }
        
        AIToolTest testResult = AIToolTest.builder()
                .tool(tool)
                .isPassed(responseDto != null && Boolean.TRUE.equals(responseDto.getPassed()))
                .testQuery(tool.getSqlTemplate())
                .testResultSummary(responseDto != null ? responseDto.getMessage() : "Unknown error")
                .logs(responseDto != null ? responseDto.getLogs() : null)
                .executionTimeMs(responseDto != null ? responseDto.getExecutionTimeMs() : null)
                .build();
                
        aiToolTestRepository.save(testResult);
        
        // Recalculate accuracy based on last 10 tests
        long passedCount = aiToolTestRepository.countPassesInLastNTests(id, 10);
        long totalCount = aiToolTestRepository.countTotalInLastNTests(id, 10);
        
        if (totalCount > 0) {
            double newAccuracy = ((double) passedCount / totalCount) * 100.0;
            // Round to 1 decimal place
            newAccuracy = Math.round(newAccuracy * 10.0) / 10.0;
            tool.setAccuracyPercentage(newAccuracy);
            aiToolRepository.save(tool);
        }
        
        return testResult;
    }

    @Override
    public Map<String, Object> getFptuKnowledgeSource() {
        String knowledgeUrl = aiServiceBaseUrl + "/api/chat/admin/fptu-knowledge";
        try {
            Map response = restTemplate.getForObject(knowledgeUrl, Map.class);
            return response != null ? response : Map.of("success", false, "message", "No response from AI service");
        } catch (Exception e) {
            log.warn("Failed to load FPTU knowledge source: {}", e.getMessage());
            return Map.of("success", false, "message", "Failed to load FPTU knowledge source: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> updateFptuKnowledgeSource(String content) {
        String knowledgeUrl = aiServiceBaseUrl + "/api/chat/admin/fptu-knowledge";
        Map<String, Object> payload = new HashMap<>();
        payload.put("content", content);

        try {
            ResponseEntity<Map> responseEntity = restTemplate.exchange(
                    knowledgeUrl,
                    HttpMethod.PUT,
                    new HttpEntity<>(payload),
                    Map.class
            );
            Map body = responseEntity.getBody();
            return body != null ? body : Map.of("success", false, "message", "No response from AI service");
        } catch (Exception e) {
            log.warn("Failed to update FPTU knowledge source: {}", e.getMessage());
            return Map.of("success", false, "message", "Failed to update FPTU knowledge source: " + e.getMessage());
        }
    }

    private void validateManagedToolName(String toolName) {
        if (!AIToolInventory.isManagedTool(toolName)) {
            throw new RuntimeException("Tool is outside the approved core inventory: " + toolName);
        }
    }

    private void ensureManagedTool(AITool tool) {
        validateManagedToolName(tool.getName());
    }
}
