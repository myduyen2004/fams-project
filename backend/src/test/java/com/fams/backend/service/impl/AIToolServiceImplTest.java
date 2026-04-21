package com.fams.backend.service.impl;

import com.fams.backend.dto.AIToolTestResponseDto;
import com.fams.backend.entity.AITool;
import com.fams.backend.entity.AIToolTest;
import com.fams.backend.repository.AIToolRepository;
import com.fams.backend.repository.AIToolTestRepository;
import com.fams.backend.service.AIToolInventory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * High-Quality Unit Test Suite for AIToolServiceImpl.
 * Focused on the core 5 functions: getAllTools, getToolById, updateTool, toggleStatus, runTest.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AIToolServiceImpl Refined Test Suite")
class AIToolServiceImplTest {

    @Mock private AIToolRepository aiToolRepository;
    @Mock private AIToolTestRepository aiToolTestRepository;
    @Mock private RestTemplate restTemplate;

    @InjectMocks private AIToolServiceImpl aiToolService;

    private AITool managedTool;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiToolService, "aiServiceBaseUrl", "http://localhost:5000");
        ReflectionTestUtils.setField(aiToolService, "restTemplate", restTemplate);

        managedTool = AITool.builder()
                .id(1L)
                .name("get_class_schedule") // Managed core tool
                .type("SQL_TEMPLATE")
                .isActive(true)
                .accuracyPercentage(95.0)
                .build();
    }

    @Test
    @DisplayName("1. [getAllTools] - Nên lọc các tool không có trong AIToolInventory")
    void getAllTools_shouldFilterUnmanagedTools() {
        AITool rogueTool = AITool.builder().name("rogue_tool").build();
        when(aiToolRepository.findAllByOrderByNameAsc()).thenReturn(List.of(managedTool, rogueTool));

        List<AITool> result = aiToolService.getAllTools();

        assertEquals(1, result.size());
        assertEquals("get_class_schedule", result.get(0).getName());
        verify(aiToolRepository).findAllByOrderByNameAsc();
    }

    @Test
    @DisplayName("1.1 [getAllTools] - Trả về danh sách trống khi Repository rỗng")
    void getAllTools_shouldReturnEmptyList_WhenRepoIsEmpty() {
        when(aiToolRepository.findAllByOrderByNameAsc()).thenReturn(new ArrayList<>());
        List<AITool> result = aiToolService.getAllTools();
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("1.2 [getAllTools] - Trả về danh sách trống khi mọi tool đều không thuộc inventory")
    void getAllTools_shouldReturnEmptyList_WhenAllToolsAreUnmanaged() {
        AITool rogue1 = AITool.builder().name("rogue1").build();
        AITool rogue2 = AITool.builder().name("rogue2").build();
        when(aiToolRepository.findAllByOrderByNameAsc()).thenReturn(List.of(rogue1, rogue2));

        List<AITool> result = aiToolService.getAllTools();
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("2. [getToolById] - Thành công khi tìm thấy managed tool")
    void getToolById_shouldReturnTool_WhenFoundAndManaged() {
        when(aiToolRepository.findById(1L)).thenReturn(Optional.of(managedTool));

        AITool result = aiToolService.getToolById(1L);

        assertNotNull(result);
        assertEquals("get_class_schedule", result.getName());
    }

    @Test
    @DisplayName("2.1 [getToolById] - Ném exception khi không tìm thấy tool theo ID")
    void getToolById_shouldThrowException_WhenNotFound() {
        when(aiToolRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> aiToolService.getToolById(999L));
    }

    @Test
    @DisplayName("2.2 [getToolById] - Ném exception khi tool tồn tại nhưng không thuộc managed inventory")
    void getToolById_shouldThrowException_WhenFoundButNotManaged() {
        AITool rogueTool = AITool.builder().id(2L).name("rogue_tool").build();
        when(aiToolRepository.findById(2L)).thenReturn(Optional.of(rogueTool));
        assertThrows(RuntimeException.class, () -> aiToolService.getToolById(2L));
    }

    @Test
    @DisplayName("3. [updateTool] - Cập nhật thành công và reload registry")
    void updateTool_shouldUpdateAndReloadRegistry() {
        when(aiToolRepository.findById(1L)).thenReturn(Optional.of(managedTool));
        when(aiToolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AITool details = AITool.builder()
                .name("get_class_schedule")
                .isActive(false)
                .description("Updated")
                .build();

        AITool result = aiToolService.updateTool(1L, details);

        assertFalse(result.getIsActive());
        assertEquals("Updated", result.getDescription());
        verify(aiToolRepository).save(any());
        verify(restTemplate).postForObject(contains("reload-tools"), isNull(), any());
    }

    @Test
    @DisplayName("4. [toggleStatus] - Đảo trạng thái isActive thành công")
    void toggleStatus_shouldInvertIsActive() {
        when(aiToolRepository.findById(1L)).thenReturn(Optional.of(managedTool));
        when(aiToolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Initial: true -> Should become false
        AITool result = aiToolService.toggleStatus(1L);
        assertFalse(result.getIsActive());

        // Call again: false -> Should become true
        managedTool.setIsActive(false);
        AITool result2 = aiToolService.toggleStatus(1L);
        assertTrue(result2.getIsActive());

        verify(aiToolRepository, times(2)).save(any());
        verify(restTemplate, times(2)).postForObject(anyString(), any(), any());
    }

    @Nested
    @DisplayName("5. [runTest] - Accuracy & Integration Tests")
    class RunTestExperiments {

        @Test
        @DisplayName("runTest: Cập nhật Accuracy dựa trên 10 test gần nhất (Làm tròn 1 chữ số)")
        void runTest_shouldRecalculateAccuracyWithRounding() {
            when(aiToolRepository.findById(1L)).thenReturn(Optional.of(managedTool));
            
            AIToolTestResponseDto mockRes = AIToolTestResponseDto.builder()
                    .passed(true)
                    .message("Pass")
                    .build();
            when(restTemplate.postForObject(anyString(), any(), any())).thenReturn(mockRes);

            // Giả lập 6/10 test thành công -> 60.0%
            when(aiToolTestRepository.countPassesInLastNTests(eq(1L), eq(10))).thenReturn(6L);
            when(aiToolTestRepository.countTotalInLastNTests(eq(1L), eq(10))).thenReturn(10L);

            AIToolTest result = aiToolService.runTest(1L, new HashMap<>());

            assertTrue(result.getIsPassed());
            assertEquals(60.0, managedTool.getAccuracyPercentage());
            verify(aiToolTestRepository).save(any(AIToolTest.class));
            verify(aiToolRepository).save(managedTool);
        }

        @Test
        @DisplayName("runTest: Xử lý khi AI Service lỗi kết nối")
        void runTest_shouldHandleConnectionError() {
            when(aiToolRepository.findById(1L)).thenReturn(Optional.of(managedTool));
            when(restTemplate.postForObject(anyString(), any(), any()))
                    .thenThrow(new RuntimeException("Connection Refused"));

            AIToolTest result = aiToolService.runTest(1L, new HashMap<>());

            assertFalse(result.getIsPassed());
            assertTrue(result.getTestResultSummary().contains("Failed to connect"));
            verify(aiToolTestRepository).save(result);
        }
    }
}
