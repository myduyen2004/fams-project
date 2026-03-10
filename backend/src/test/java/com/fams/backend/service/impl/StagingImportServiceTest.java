package com.fams.backend.service.impl;

import com.fams.backend.entity.Semester;
import com.fams.backend.repository.SemesterRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for StagingImportService
 * Tests the staging table import functionality for class sections and
 * enrollments.
 */
@ExtendWith(MockitoExtension.class)
class StagingImportServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private SemesterRepository semesterRepository;

    @InjectMocks
    private StagingImportService stagingImportService;

    private Semester testSemester;

    @BeforeEach
    void setUp() {
        testSemester = Semester.builder()
                .id(1L)
                .code("SP2024")
                .name("Spring 2024")
                .startDate(LocalDate.of(2024, 1, 15))
                .endDate(LocalDate.of(2024, 5, 15))
                .build();
    }

    // ==================== HELPER METHODS ====================

    private MockMultipartFile createClassSectionExcelFile(List<String[]> rows) throws Exception {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Sheet1");

            // Header row
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("Class Name");
            headerRow.createCell(1).setCellValue("Course Code");
            headerRow.createCell(2).setCellValue("Lecturer Code");
            headerRow.createCell(3).setCellValue("Max Students");

            // Data rows
            for (int i = 0; i < rows.size(); i++) {
                Row row = sheet.createRow(i + 1);
                String[] data = rows.get(i);
                for (int j = 0; j < data.length; j++) {
                    row.createCell(j).setCellValue(data[j]);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "class_sections.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray());
        }
    }

    private MockMultipartFile createEnrollmentExcelFile(List<String[]> rows) throws Exception {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Sheet1");

            // Header row
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("MSSV");
            headerRow.createCell(1).setCellValue("Class Name");

            // Data rows
            for (int i = 0; i < rows.size(); i++) {
                Row row = sheet.createRow(i + 1);
                String[] data = rows.get(i);
                for (int j = 0; j < data.length; j++) {
                    row.createCell(j).setCellValue(data[j]);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "enrollments.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray());
        }
    }

    private List<String[]> classSectionRows(String[]... rows) {
        return Arrays.asList(rows);
    }

    private List<String[]> enrollmentRows(String[]... rows) {
        return Arrays.asList(rows);
    }

    // ==================== CLASS SECTION TESTS ====================

    @Nested
    @DisplayName("Fast Preview Class Sections Tests")
    class FastPreviewClassSectionsTests {

        @Test
        @DisplayName("Should throw exception when semester not found")
        void shouldThrowExceptionWhenSemesterNotFound() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("INVALID")).thenReturn(Optional.empty());
            MockMultipartFile file = createClassSectionExcelFile(
                    classSectionRows(new String[] { "CS101-01", "CS101", "lecturer1", "30" }));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> stagingImportService.fastPreviewClassSections("INVALID", file));

            assertTrue(exception.getMessage().contains("Không tìm thấy học kỳ"));
        }

        @Test
        @DisplayName("Should process valid class sections file")
        void shouldProcessValidClassSectionsFile() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));

            // Mock staging table operations
            doNothing().when(jdbcTemplate).execute(anyString());
            when(jdbcTemplate.update(anyString())).thenReturn(0); // For validation updates without params
            when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(2, 0);
            when(jdbcTemplate.queryForList(anyString())).thenReturn(Collections.emptyList());

            MockMultipartFile file = createClassSectionExcelFile(classSectionRows(
                    new String[] { "CS101-01", "CS101", "lecturer1", "30" },
                    new String[] { "CS102-01", "CS102", "lecturer2", "25" }));

            // Act
            Map<String, Object> result = stagingImportService.fastPreviewClassSections("SP2024", file);

            // Assert
            assertNotNull(result);
            assertTrue((Boolean) result.get("success"));
            assertEquals(2L, result.get("totalRows"));
            assertNotNull(result.get("stagingTable"));
            assertNotNull(result.get("durationMs"));
        }

        @Test
        @DisplayName("Should handle empty file gracefully")
        void shouldHandleEmptyFile() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            doNothing().when(jdbcTemplate).execute(anyString());
            when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(0, 0);
            when(jdbcTemplate.queryForList(anyString())).thenReturn(Collections.emptyList());

            MockMultipartFile file = createClassSectionExcelFile(Collections.emptyList());

            // Act
            Map<String, Object> result = stagingImportService.fastPreviewClassSections("SP2024", file);

            // Assert
            assertNotNull(result);
            assertEquals(0L, result.get("totalRows"));
            assertFalse((Boolean) result.get("canImport"));
        }
    }

    @Nested
    @DisplayName("Bulk Import Class Sections Tests")
    class BulkImportClassSectionsTests {

        @Test
        @DisplayName("Should throw exception when semester not found")
        void shouldThrowExceptionWhenSemesterNotFound() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("INVALID")).thenReturn(Optional.empty());
            MockMultipartFile file = createClassSectionExcelFile(
                    classSectionRows(new String[] { "CS101-01", "CS101", "lecturer1", "30" }));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> stagingImportService.bulkImportClassSections("INVALID", file));

            assertTrue(exception.getMessage().contains("Không tìm thấy học kỳ"));
        }

        @Test
        @DisplayName("Should not import when validation has errors")
        void shouldNotImportWhenValidationHasErrors() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            doNothing().when(jdbcTemplate).execute(anyString());
            when(jdbcTemplate.update(anyString())).thenReturn(0); // For validation updates without params
            when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(0, 2); // 0 valid, 2 errors

            List<Map<String, Object>> errorList = new ArrayList<>();
            Map<String, Object> error = new HashMap<>();
            error.put("row", 1);
            error.put("field1", "CS101-01");
            error.put("field2", "INVALID");
            error.put("error_message", "Không tìm thấy môn học");
            errorList.add(error);
            when(jdbcTemplate.queryForList(anyString())).thenReturn(errorList);

            MockMultipartFile file = createClassSectionExcelFile(
                    classSectionRows(new String[] { "CS101-01", "INVALID", "lecturer1", "30" }));

            // Act
            Map<String, Object> result = stagingImportService.bulkImportClassSections("SP2024", file);

            // Assert
            assertNotNull(result);
            assertEquals(0, result.get("created"));
            assertTrue((int) result.get("failed") > 0);
            assertNotNull(result.get("errors"));
        }
    }

    // ==================== ENROLLMENT TESTS ====================

    @Nested
    @DisplayName("Fast Preview Enrollments Tests")
    class FastPreviewEnrollmentsTests {

        @Test
        @DisplayName("Should throw exception when semester not found")
        void shouldThrowExceptionWhenSemesterNotFound() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("INVALID")).thenReturn(Optional.empty());
            MockMultipartFile file = createEnrollmentExcelFile(
                    enrollmentRows(new String[] { "SE180001", "CS101-01" }));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> stagingImportService.fastPreviewEnrollments("INVALID", file));

            assertTrue(exception.getMessage().contains("Không tìm thấy học kỳ"));
        }

        @Test
        @DisplayName("Should process valid enrollments file")
        void shouldProcessValidEnrollmentsFile() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            doNothing().when(jdbcTemplate).execute(anyString());
            when(jdbcTemplate.update(anyString())).thenReturn(0); // For validation updates without params
            when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(0);
            when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(3, 0);
            when(jdbcTemplate.queryForList(anyString())).thenReturn(Collections.emptyList());

            MockMultipartFile file = createEnrollmentExcelFile(enrollmentRows(
                    new String[] { "SE180001", "CS101-01" },
                    new String[] { "SE180002", "CS101-01" },
                    new String[] { "SE180003", "CS102-01" }));

            // Act
            Map<String, Object> result = stagingImportService.fastPreviewEnrollments("SP2024", file);

            // Assert
            assertNotNull(result);
            assertTrue((Boolean) result.get("success"));
            assertEquals(3L, result.get("totalRows"));
        }
    }

    @Nested
    @DisplayName("Bulk Import Enrollments Tests")
    class BulkImportEnrollmentsTests {

        @Test
        @DisplayName("Should throw exception when semester not found")
        void shouldThrowExceptionWhenSemesterNotFound() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("INVALID")).thenReturn(Optional.empty());
            MockMultipartFile file = createEnrollmentExcelFile(
                    enrollmentRows(new String[] { "SE180001", "CS101-01" }));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> stagingImportService.bulkImportEnrollments("INVALID", file));

            assertTrue(exception.getMessage().contains("Không tìm thấy học kỳ"));
        }
    }

    // ==================== IMPORT FROM STAGING TESTS ====================

    @Nested
    @DisplayName("Import From Staging Table Tests")
    class ImportFromStagingTests {

        @Test
        @DisplayName("Should import class sections from staging table")
        void shouldImportClassSectionsFromStaging() {
            // Arrange
            String stagingTable = "staging_cs_test123";
            when(jdbcTemplate.update(anyString(), eq(1L))).thenReturn(5);
            when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);
            testSemester.setStatus(com.fams.backend.entity.Semester.SemesterStatus.UPCOMING);
            when(semesterRepository.findById(1L)).thenReturn(Optional.of(testSemester));
            doNothing().when(jdbcTemplate).execute(anyString());

            // Act
            Map<String, Object> result = stagingImportService.importClassSectionsFromStaging(stagingTable, 1L);

            // Assert
            assertNotNull(result);
            assertEquals(5, result.get("created"));
            assertEquals(0, result.get("failed"));
            assertNotNull(result.get("message"));
        }

        @Test
        @DisplayName("Should import enrollments from staging table")
        void shouldImportEnrollmentsFromStaging() {
            // Arrange
            String stagingTable = "staging_enr_test123";
            when(jdbcTemplate.update(anyString(), eq(1L))).thenReturn(10);
            when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);
            testSemester.setStatus(com.fams.backend.entity.Semester.SemesterStatus.UPCOMING);
            when(semesterRepository.findById(1L)).thenReturn(Optional.of(testSemester));
            doNothing().when(jdbcTemplate).execute(anyString());

            // Act
            Map<String, Object> result = stagingImportService.importEnrollmentsFromStaging(stagingTable, 1L);

            // Assert
            assertNotNull(result);
            assertEquals(10, result.get("created"));
            assertEquals(0, result.get("failed"));
        }
    }

    // ==================== EDGE CASES ====================

    @Nested
    @DisplayName("Edge Cases Tests")
    class EdgeCasesTests {

        @Test
        @DisplayName("Should handle file with only header row")
        void shouldHandleFileWithOnlyHeader() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            doNothing().when(jdbcTemplate).execute(anyString());
            when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(0, 0);
            when(jdbcTemplate.queryForList(anyString())).thenReturn(Collections.emptyList());

            // Create file with only header
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet("Sheet1");
                Row headerRow = sheet.createRow(0);
                headerRow.createCell(0).setCellValue("Class Name");
                headerRow.createCell(1).setCellValue("Course Code");
                headerRow.createCell(2).setCellValue("Lecturer Code");
                headerRow.createCell(3).setCellValue("Max Students");

                ByteArrayOutputStream out = new ByteArrayOutputStream();
                workbook.write(out);
                MockMultipartFile file = new MockMultipartFile(
                        "file", "test.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        out.toByteArray());

                // Act
                Map<String, Object> result = stagingImportService.fastPreviewClassSections("SP2024", file);

                // Assert
                assertNotNull(result);
                assertEquals(0L, result.get("totalRows"));
                assertFalse((Boolean) result.get("canImport"));
            }
        }

        @Test
        @DisplayName("Should handle rows with empty cells")
        void shouldHandleRowsWithEmptyCells() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            doNothing().when(jdbcTemplate).execute(anyString());
            when(jdbcTemplate.update(anyString())).thenReturn(0); // For validation updates without params
            when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(1, 1);

            List<Map<String, Object>> errorList = new ArrayList<>();
            Map<String, Object> error = new HashMap<>();
            error.put("row", 1);
            error.put("field1", "");
            error.put("field2", "");
            error.put("error_message", "Mã lớp không được để trống");
            errorList.add(error);
            when(jdbcTemplate.queryForList(anyString())).thenReturn(errorList);

            MockMultipartFile file = createClassSectionExcelFile(
                    classSectionRows(new String[] { "", "", "", "" })); // All empty

            // Act
            Map<String, Object> result = stagingImportService.fastPreviewClassSections("SP2024", file);

            // Assert
            assertNotNull(result);
            // Empty rows should be skipped or marked as errors
        }

        @Test
        @DisplayName("Should handle large max_students value as string")
        void shouldHandleLargeMaxStudentsValue() throws Exception {
            // Arrange
            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            doNothing().when(jdbcTemplate).execute(anyString());
            when(jdbcTemplate.update(anyString())).thenReturn(0); // For validation updates without params
            when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(1, 0);
            when(jdbcTemplate.queryForList(anyString())).thenReturn(Collections.emptyList());

            MockMultipartFile file = createClassSectionExcelFile(
                    classSectionRows(new String[] { "CS101-01", "CS101", "lecturer1", "999" }));

            // Act
            Map<String, Object> result = stagingImportService.fastPreviewClassSections("SP2024", file);

            // Assert
            assertNotNull(result);
            assertTrue((Boolean) result.get("success"));
        }
    }
}
