package com.fams.backend.service;

import com.fams.backend.dto.SpecializationImportDTO;
import com.fams.backend.entity.Major;
import com.fams.backend.entity.Specialization;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.MajorRepository;
import com.fams.backend.repository.SpecializationCourseRepository;
import com.fams.backend.repository.SpecializationRepository;
import com.fams.backend.repository.StudentProfileRepository;
import com.fams.backend.repository.SubSpecializationCourseRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportSpecializationsTest {

        @Mock
        private SpecializationRepository specializationRepository;

        @Mock
        private MajorRepository majorRepository;

        @Mock
        private StudentProfileRepository studentProfileRepository;

        @Mock
        private SpecializationCourseRepository specializationCourseRepository;

        @Mock
        private SubSpecializationCourseRepository subSpecializationCourseRepository;

        @Mock
        private CourseRepository courseRepository;

        @InjectMocks
        private SpecializationService specializationService;

        private Major testMajor;
        private MultipartFile validExcelFile;
        private MultipartFile emptyCodeExcelFile;
        private MultipartFile emptyNameExcelFile;
        private MultipartFile duplicateCodeExcelFile;
        private MultipartFile onlyHeaderExcelFile;

        @BeforeEach
        void setUp() throws IOException {
                // Tạo Major test
                testMajor = Major.builder()
                                .id(1L)
                                .code("SE")
                                .name("Software Engineering")
                                .status(Major.MajorStatus.ACTIVE)
                                .build();

                // File Excel hợp lệ (cột: major_code, code, name, description, status)
                validExcelFile = createExcelFile(new String[][] {
                                { "major_code", "code", "name", "description", "status" },
                                { "SE", "SE-WEB", "Web Development", "Phát triển ứng dụng Web", "ACTIVE" },
                                { "SE", "SE-MOB", "Mobile App Development", "Phát triển ứng dụng di động", "ACTIVE" }
                });

                // File với mã chuyên ngành trống
                emptyCodeExcelFile = createExcelFile(new String[][] {
                                { "major_code", "code", "name", "description", "status" },
                                { "SE", "", "Web Development", "Mô tả", "ACTIVE" }
                });

                // File với tên chuyên ngành trống
                emptyNameExcelFile = createExcelFile(new String[][] {
                                { "major_code", "code", "name", "description", "status" },
                                { "SE", "SE-WEB", "", "Mô tả", "ACTIVE" }
                });

                // File với mã chuyên ngành trùng trong file
                duplicateCodeExcelFile = createExcelFile(new String[][] {
                                { "major_code", "code", "name", "description", "status" },
                                { "SE", "SE-WEB", "Web Development", "Mô tả 1", "ACTIVE" },
                                { "SE", "SE-WEB", "Web Development 2", "Mô tả 2", "ACTIVE" }
                });

                // File chỉ có header
                onlyHeaderExcelFile = createExcelFile(new String[][] {
                                { "major_code", "code", "name", "description", "status" }
                });
        }

        private MultipartFile createExcelFile(String[][] data) throws IOException {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Specializations");
                        for (int i = 0; i < data.length; i++) {
                                Row row = sheet.createRow(i);
                                for (int j = 0; j < data[i].length; j++) {
                                        Cell cell = row.createCell(j);
                                        cell.setCellValue(data[i][j]);
                                }
                        }
                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        workbook.write(out);
                        return new MockMultipartFile(
                                        "file",
                                        "specializations.xlsx",
                                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                        out.toByteArray());
                }
        }

        @Test
        @DisplayName("UTCID01: Import thành công với file Excel hợp lệ")
        void importSpecializations_Success() throws IOException {
                // Arrange
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
                when(specializationRepository.existsByCode("SE-WEB")).thenReturn(false);
                when(specializationRepository.existsByCode("SE-MOB")).thenReturn(false);
                when(specializationRepository.save(any(Specialization.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // Act
                Map<String, Object> result = specializationService.importSpecializations(1L, validExcelFile);

                // Assert
                assertEquals(2, result.get("created"));
                assertEquals(0, result.get("failed"));
                verify(specializationRepository, times(2)).save(any(Specialization.class));
        }

        @Test
        @DisplayName("UTCID02: Import thất bại khi không tìm thấy Major")
        void importSpecializations_MajorNotFound_ThrowsException() {
                // Arrange
                when(majorRepository.findById(999L)).thenReturn(Optional.empty());

                // Act & Assert
                RuntimeException exception = assertThrows(
                                RuntimeException.class,
                                () -> specializationService.importSpecializations(999L, validExcelFile));
                assertTrue(exception.getMessage().contains("Không tìm thấy ngành"));
        }

        @Test
        @DisplayName("UTCID03: Import với mã chuyên ngành để trống trả về lỗi")
        void importSpecializations_EmptyCode_ReturnsError() throws IOException {
                // Arrange
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));

                // Act
                Map<String, Object> result = specializationService.importSpecializations(1L, emptyCodeExcelFile);

                // Assert
                assertEquals(1, result.get("failed"));
                @SuppressWarnings("unchecked")
                List<String> errors = (List<String>) result.get("errors");
                assertTrue(errors.stream().anyMatch(e -> e.contains("Mã chuyên ngành không được để trống")));
        }

        @Test
        @DisplayName("UTCID04: Import với tên chuyên ngành để trống trả về lỗi")
        void importSpecializations_EmptyName_ReturnsError() throws IOException {
                // Arrange
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));

                // Act
                Map<String, Object> result = specializationService.importSpecializations(1L, emptyNameExcelFile);

                // Assert
                assertEquals(1, result.get("failed"));
                @SuppressWarnings("unchecked")
                List<String> errors = (List<String>) result.get("errors");
                assertTrue(errors.stream().anyMatch(e -> e.contains("Tên chuyên ngành không được để trống")));
        }

        @Test
        @DisplayName("UTCID05: Import với mã chuyên ngành bị trùng trong file")
        void importSpecializations_DuplicateCodeInFile_ReturnsError() throws IOException {
                // Arrange
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
                when(specializationRepository.existsByCode("SE-WEB")).thenReturn(false);
                when(specializationRepository.save(any(Specialization.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // Act
                Map<String, Object> result = specializationService.importSpecializations(1L, duplicateCodeExcelFile);

                // Assert
                assertEquals(1, result.get("created")); // First SE-WEB is created
                assertEquals(1, result.get("failed")); // Second SE-WEB fails as duplicate in file
                @SuppressWarnings("unchecked")
                List<String> errors = (List<String>) result.get("errors");
                assertTrue(errors.stream().anyMatch(e -> e.contains("bị trùng trong file")));
        }

        @Test
        @DisplayName("UTCID06: Import thất bại khi mã chuyên ngành đã tồn tại trong database")
        void importSpecializations_CodeExistsInDatabase_ReturnsError() throws IOException {
                // Arrange
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
                when(specializationRepository.existsByCode("SE-WEB")).thenReturn(true);
                when(specializationRepository.existsByCode("SE-MOB")).thenReturn(true);

                // Act
                Map<String, Object> result = specializationService.importSpecializations(1L, validExcelFile);

                // Assert
                assertEquals(0, result.get("created"));
                assertEquals(2, result.get("failed"));
                @SuppressWarnings("unchecked")
                List<String> errors = (List<String>) result.get("errors");
                assertTrue(errors.stream().anyMatch(e -> e.contains("đã tồn tại trong hệ thống")));
                verify(specializationRepository, never()).save(any(Specialization.class));
        }

        @Test
        @DisplayName("UTCID07: Import file chỉ có header trả về kết quả rỗng")
        void importSpecializations_OnlyHeader_ReturnsEmptyResult() throws IOException {
                // Arrange
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));

                // Act
                Map<String, Object> result = specializationService.importSpecializations(1L, onlyHeaderExcelFile);

                // Assert
                assertEquals(0, result.get("created"));
                assertEquals(0, result.get("failed"));
                verify(specializationRepository, never()).save(any(Specialization.class));
        }

        @Test
        @DisplayName("UTCID08: Import với status không hợp lệ sẽ mặc định là ACTIVE")
        void importSpecializations_InvalidStatus_DefaultsToActive() throws IOException {
                // Arrange
                MultipartFile invalidStatusFile = createExcelFile(new String[][] {
                                { "major_code", "code", "name", "description", "status" },
                                { "SE", "SE-WEB", "Web Development", "Mô tả", "INVALID_STATUS" }
                });
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
                when(specializationRepository.existsByCode("SE-WEB")).thenReturn(false);
                when(specializationRepository.save(any(Specialization.class))).thenAnswer(invocation -> {
                        Specialization savedSpec = invocation.getArgument(0);
                        assertEquals(Specialization.SpecializationStatus.ACTIVE, savedSpec.getStatus());
                        return savedSpec;
                });

                // Act
                Map<String, Object> result = specializationService.importSpecializations(1L, invalidStatusFile);

                // Assert
                assertEquals(1, result.get("created"));
                verify(specializationRepository, times(1)).save(any(Specialization.class));
        }

        // ============== Tests for Preview Import ==============

        @Test
        @DisplayName("UTCID09: Preview import trả về danh sách DTO hợp lệ")
        void previewImportSpecializations_Success() throws IOException {
                // Arrange
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
                when(specializationRepository.existsByCode("SE-WEB")).thenReturn(false);
                when(specializationRepository.existsByCode("SE-MOB")).thenReturn(false);

                // Act
                List<SpecializationImportDTO> result = specializationService.previewImportSpecializations(1L,
                                validExcelFile);

                // Assert
                assertEquals(2, result.size());
                assertEquals("VALID", result.get(0).getStatus());
                assertEquals("VALID", result.get(1).getStatus());
                assertEquals("SE-WEB", result.get(0).getCode());
                assertEquals("SE-MOB", result.get(1).getCode());
        }

        @Test
        @DisplayName("UTCID10: Preview import với mã chuyên ngành đã tồn tại trả về ERROR")
        void previewImportSpecializations_CodeExists_ReturnsError() throws IOException {
                // Arrange
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
                when(specializationRepository.existsByCode("SE-WEB")).thenReturn(true);
                when(specializationRepository.existsByCode("SE-MOB")).thenReturn(false);

                // Act
                List<SpecializationImportDTO> result = specializationService.previewImportSpecializations(1L,
                                validExcelFile);

                // Assert
                assertEquals(2, result.size());
                assertEquals("ERROR", result.get(0).getStatus());
                assertTrue(result.get(0).getErrorMessage().contains("đã tồn tại trong hệ thống"));
                assertEquals("VALID", result.get(1).getStatus());
        }

        @Test
        @DisplayName("UTCID11: Preview import với status không hợp lệ có warningMessage")
        void previewImportSpecializations_InvalidStatus_HasWarning() throws IOException {
                // Arrange
                MultipartFile invalidStatusFile = createExcelFile(new String[][] {
                                { "major_code", "code", "name", "description", "status" },
                                { "SE", "SE-WEB", "Web Development", "Mô tả", "INVALID_STATUS" }
                });
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
                when(specializationRepository.existsByCode("SE-WEB")).thenReturn(false);

                // Act
                List<SpecializationImportDTO> result = specializationService.previewImportSpecializations(1L,
                                invalidStatusFile);

                // Assert
                assertEquals(1, result.size());
                assertEquals("VALID", result.get(0).getStatus());
                assertEquals("ACTIVE", result.get(0).getStatusStr()); // Defaults to ACTIVE
                assertNotNull(result.get(0).getWarningMessage());
                assertTrue(result.get(0).getWarningMessage().contains("không hợp lệ"));
        }

        @Test
        @DisplayName("UTCID12: Preview import với mã chuyên ngành trùng trong file")
        void previewImportSpecializations_DuplicateCodeInFile_ReturnsError() throws IOException {
                // Arrange
                when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
                when(specializationRepository.existsByCode("SE-WEB")).thenReturn(false);

                // Act
                List<SpecializationImportDTO> result = specializationService.previewImportSpecializations(1L,
                                duplicateCodeExcelFile);

                // Assert
                assertEquals(2, result.size());
                assertEquals("VALID", result.get(0).getStatus());
                assertEquals("ERROR", result.get(1).getStatus());
                assertTrue(result.get(1).getErrorMessage().contains("bị trùng trong file"));
        }
}
