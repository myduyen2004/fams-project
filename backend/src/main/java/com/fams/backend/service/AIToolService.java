package com.fams.backend.service;

import com.fams.backend.entity.AITool;
import com.fams.backend.entity.AIToolTest;
import java.util.List;
import java.util.Map;

public interface AIToolService {
    List<AITool> getAllTools();
    AITool getToolById(Long id);
    AITool createTool(AITool tool);
    AITool updateTool(Long id, AITool tool);
    void deleteTool(Long id);
    AITool toggleStatus(Long id);
    List<AIToolTest> getLatestTests(Long id);
    AIToolTest runTest(Long id, java.util.Map<String, Object> params);
    Map<String, Object> getFptuKnowledgeSource();
    Map<String, Object> updateFptuKnowledgeSource(String content);
}
