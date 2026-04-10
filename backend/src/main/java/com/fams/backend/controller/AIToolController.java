package com.fams.backend.controller;

import com.fams.backend.entity.AITool;
import com.fams.backend.entity.AIToolTest;
import com.fams.backend.service.AIToolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/ai-tools")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AIToolController {

    private final AIToolService aiToolService;

    @GetMapping
    public ResponseEntity<List<AITool>> getAllTools() {
        return ResponseEntity.ok(aiToolService.getAllTools());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AITool> getToolById(@PathVariable Long id) {
        return ResponseEntity.ok(aiToolService.getToolById(id));
    }

    @PostMapping
    public ResponseEntity<AITool> createTool(@RequestBody AITool tool) {
        return ResponseEntity.ok(aiToolService.createTool(tool));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AITool> updateTool(@PathVariable Long id, @RequestBody AITool tool) {
        return ResponseEntity.ok(aiToolService.updateTool(id, tool));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTool(@PathVariable Long id) {
        aiToolService.deleteTool(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<AITool> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(aiToolService.toggleStatus(id));
    }

    @GetMapping("/{id}/tests")
    public ResponseEntity<List<AIToolTest>> getLatestTests(@PathVariable Long id) {
        return ResponseEntity.ok(aiToolService.getLatestTests(id));
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<AIToolTest> runTest(@PathVariable Long id, @RequestBody(required = false) java.util.Map<String, Object> params) {
        return ResponseEntity.ok(aiToolService.runTest(id, params));
    }
}
