package com.fams.backend.service.impl;

import com.fams.backend.dto.AIToolTestRequestDto;
import com.fams.backend.dto.AIToolTestResponseDto;
import com.fams.backend.entity.AITool;
import com.fams.backend.entity.AIToolTest;
import com.fams.backend.repository.AIToolRepository;
import com.fams.backend.repository.AIToolTestRepository;
import com.fams.backend.service.AIToolService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;

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
        return aiToolRepository.findAll();
    }

    @Override
    public AITool getToolById(Long id) {
        return aiToolRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("AI Tool not found with id: " + id));
    }

    @Override
    @Transactional
    public AITool createTool(AITool tool) {
        AITool savedTool = aiToolRepository.save(tool);
        reloadAiToolRegistry();
        return savedTool;
    }

    @Override
    @Transactional
    public AITool updateTool(Long id, AITool toolDetails) {
        AITool tool = getToolById(id);
        tool.setName(toolDetails.getName());
        tool.setType(toolDetails.getType());
        tool.setDescription(toolDetails.getDescription());
        tool.setSqlTemplate(toolDetails.getSqlTemplate());
        tool.setAccuracyPercentage(toolDetails.getAccuracyPercentage());
        tool.setIsActive(toolDetails.getIsActive());
        tool.setAllowedRoles(toolDetails.getAllowedRoles());
        tool.setRequiredFields(toolDetails.getRequiredFields());
        AITool savedTool = aiToolRepository.save(tool);
        reloadAiToolRegistry();
        return savedTool;
    }

    @Override
    @Transactional
    public void deleteTool(Long id) {
        AITool tool = getToolById(id);
        aiToolRepository.delete(tool);
        reloadAiToolRegistry();
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
}
