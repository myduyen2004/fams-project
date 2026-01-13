package com.fams.backend.service;

import com.fams.backend.dto.MajorImportDTO;
import com.fams.backend.entity.Major;
import com.fams.backend.repository.MajorRepository;
import com.fams.backend.repository.StudentProfileRepository;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportMajorsTest {

    @Mock
    private MajorRepository majorRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @InjectMocks
    private MajorService majorService;

    private MultipartFile validExcelFile;
    private MultipartFile emptyCodeExcelFile;
    private MultipartFile emptyNameExcelFile;
    private MultipartFile duplicateCodeExcelFile;
    private MultipartFile onlyHeaderExcelFile;

    @BeforeEach
    void setUp() throws IOException {
        // Tạo file Excel hợp lệ
        validExcelFile = createExcelFile(new String[][] {
                { "code", "name", "description", "programDuration", "status" },
                { "SE", "Software Engineering", "Kỹ thuật phần mềm", "9 Kỳ", "ACTIVE" },
                { "AI", "Artificial Intelligence", "Trí tuệ nhân tạo", "9 Kỳ", "ACTIVE" }
        });

        // File với mã ngành trống
        emptyCodeExcelFile = createExcelFile(new String[][] {
                { "code", "name", "description", "programDuration", "status" },
                { "", "Software Engineering", "Mô tả", "9 Kỳ", "ACTIVE" }
        });

        // File với tên ngành trống
        emptyNameExcelFile = createExcelFile(new String[][] {
                { "code", "name", "description", "programDuration", "status" },
                { "SE", "", "Mô tả", "9 Kỳ", "ACTIVE" }
        });

        // File với mã ngành trùng trong file
        duplicateCodeExcelFile = createExcelFile(new String[][] {
                { "code", "name", "description", "programDuration", "status" },
                { "SE", "Software Engineering", "Mô tả 1", "9 Kỳ", "ACTIVE" },
                { "SE", "Software Engineering 2", "Mô tả 2", "9 Kỳ", "ACTIVE" }
        });

        // File chỉ có header
        onlyHeaderExcelFile = createExcelFile(new String[][] {
                { "code", "name", "description", "programDuration", "status" }
        });
    }

    private MultipartFile createExcelFile(String[][] data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Majors");
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
                    "majors.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray());
        }
    }

    @Test
    @DisplayName("UTCID01: Import thành công với file Excel hợp lệ")
    void importMajors_Success() throws IOException {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.existsByCode("AI")).thenReturn(false);
        when(majorRepository.save(any(Major.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Map<String, Object> result = majorService.importMajors(validExcelFile);

        // Assert
        assertEquals(2, result.get("created"));
        assertEquals(0, result.get("failed"));
        verify(majorRepository, times(2)).save(any(Major.class));
    }

    @Test
    @DisplayName("UTCID02: Import thất bại khi mã ngành để trống")
    void importMajors_EmptyCode_ReturnsError() throws IOException {
        // Act
        Map<String, Object> result = majorService.importMajors(emptyCodeExcelFile);

        // Assert
        assertEquals(1, result.get("failed"));
        @SuppressWarnings("unchecked")
        List<String> errors = (List<String>) result.get("errors");
        assertTrue(errors.stream().anyMatch(e -> e.contains("Mã ngành không được để trống")));
    }

    @Test
    @DisplayName("UTCID03: Import thất bại khi tên ngành để trống")
    void importMajors_EmptyName_ReturnsError() throws IOException {
        // Act
        Map<String, Object> result = majorService.importMajors(emptyNameExcelFile);

        // Assert
        assertEquals(1, result.get("failed"));
        @SuppressWarnings("unchecked")
        List<String> errors = (List<String>) result.get("errors");
        assertTrue(errors.stream().anyMatch(e -> e.contains("Tên ngành không được để trống")));
    }

    @Test
    @DisplayName("UTCID04: Import thất bại khi mã ngành bị trùng trong file")
    void importMajors_DuplicateCodeInFile_ReturnsError() throws IOException {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.save(any(Major.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Map<String, Object> result = majorService.importMajors(duplicateCodeExcelFile);

        // Assert
        assertEquals(1, result.get("created")); // First SE is created
        assertEquals(1, result.get("failed")); // Second SE fails as duplicate in file
        @SuppressWarnings("unchecked")
        List<String> errors = (List<String>) result.get("errors");
        assertTrue(errors.stream().anyMatch(e -> e.contains("bị trùng trong file")));
    }

    @Test
    @DisplayName("UTCID05: Import thất bại khi mã ngành đã tồn tại trong database")
    void importMajors_CodeExistsInDatabase_ReturnsError() throws IOException {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(true);
        when(majorRepository.existsByCode("AI")).thenReturn(true);

        // Act
        Map<String, Object> result = majorService.importMajors(validExcelFile);

        // Assert
        assertEquals(0, result.get("created"));
        assertEquals(2, result.get("failed"));
        @SuppressWarnings("unchecked")
        List<String> errors = (List<String>) result.get("errors");
        assertTrue(errors.stream().anyMatch(e -> e.contains("đã tồn tại trong hệ thống")));
        verify(majorRepository, never()).save(any(Major.class));
    }

    @Test
    @DisplayName("UTCID06: Import file chỉ có header trả về kết quả rỗng")
    void importMajors_OnlyHeader_ReturnsEmptyResult() throws IOException {
        // Act
        Map<String, Object> result = majorService.importMajors(onlyHeaderExcelFile);

        // Assert
        assertEquals(0, result.get("created"));
        assertEquals(0, result.get("failed"));
        verify(majorRepository, never()).save(any(Major.class));
    }

    @Test
    @DisplayName("UTCID07: Import với status không hợp lệ sẽ mặc định là ACTIVE")
    void importMajors_InvalidStatus_DefaultsToActive() throws IOException {
        // Arrange
        MultipartFile invalidStatusFile = createExcelFile(new String[][] {
                { "code", "name", "description", "programDuration", "status" },
                { "SE", "Software Engineering", "Mô tả", "9 Kỳ", "INVALID_STATUS" }
        });
        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.save(any(Major.class))).thenAnswer(invocation -> {
            Major savedMajor = invocation.getArgument(0);
            assertEquals(Major.MajorStatus.ACTIVE, savedMajor.getStatus());
            return savedMajor;
        });

        // Act
        Map<String, Object> result = majorService.importMajors(invalidStatusFile);

        // Assert
        assertEquals(1, result.get("created"));
        verify(majorRepository, times(1)).save(any(Major.class));
    }

    @Test
    @DisplayName("UTCID08: Import với programDuration trống sẽ mặc định là '9 Kỳ'")
    void importMajors_EmptyProgramDuration_DefaultsTo9Ky() throws IOException {
        // Arrange
        MultipartFile emptyDurationFile = createExcelFile(new String[][] {
                { "code", "name", "description", "programDuration", "status" },
                { "SE", "Software Engineering", "Mô tả", "", "ACTIVE" }
        });
        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.save(any(Major.class))).thenAnswer(invocation -> {
            Major savedMajor = invocation.getArgument(0);
            assertEquals("9 Kỳ", savedMajor.getProgramDuration());
            return savedMajor;
        });

        // Act
        Map<String, Object> result = majorService.importMajors(emptyDurationFile);

        // Assert
        assertEquals(1, result.get("created"));
        verify(majorRepository, times(1)).save(any(Major.class));
    }

    // ============== Tests for Preview Import ==============

    @Test
    @DisplayName("UTCID09: Preview import trả về danh sách DTO hợp lệ")
    void previewImportMajors_Success() throws IOException {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.existsByCode("AI")).thenReturn(false);

        // Act
        List<MajorImportDTO> result = majorService.previewImportMajors(validExcelFile);

        // Assert
        assertEquals(2, result.size());
        assertEquals("VALID", result.get(0).getStatus());
        assertEquals("VALID", result.get(1).getStatus());
        assertEquals("SE", result.get(0).getCode());
        assertEquals("AI", result.get(1).getCode());
    }

    @Test
    @DisplayName("UTCID10: Preview import với mã ngành đã tồn tại trả về ERROR")
    void previewImportMajors_CodeExists_ReturnsError() throws IOException {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(true);
        when(majorRepository.existsByCode("AI")).thenReturn(false);

        // Act
        List<MajorImportDTO> result = majorService.previewImportMajors(validExcelFile);

        // Assert
        assertEquals(2, result.size());
        assertEquals("ERROR", result.get(0).getStatus());
        assertTrue(result.get(0).getErrorMessage().contains("đã tồn tại trong hệ thống"));
        assertEquals("VALID", result.get(1).getStatus());
    }

    @Test
    @DisplayName("UTCID11: Preview import với status không hợp lệ có warningMessage")
    void previewImportMajors_InvalidStatus_HasWarning() throws IOException {
        // Arrange
        MultipartFile invalidStatusFile = createExcelFile(new String[][] {
                { "code", "name", "description", "programDuration", "status" },
                { "SE", "Software Engineering", "Mô tả", "9 Kỳ", "INVALID_STATUS" }
        });
        when(majorRepository.existsByCode("SE")).thenReturn(false);

        // Act
        List<MajorImportDTO> result = majorService.previewImportMajors(invalidStatusFile);

        // Assert
        assertEquals(1, result.size());
        assertEquals("VALID", result.get(0).getStatus());
        assertEquals("ACTIVE", result.get(0).getStatusStr()); // Defaults to ACTIVE
        assertNotNull(result.get(0).getWarningMessage());
        assertTrue(result.get(0).getWarningMessage().contains("không hợp lệ"));
    }

    @Test
    @DisplayName("UTCID12: Preview import với mã ngành trùng trong file")
    void previewImportMajors_DuplicateCodeInFile_ReturnsError() throws IOException {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(false);

        // Act
        List<MajorImportDTO> result = majorService.previewImportMajors(duplicateCodeExcelFile);

        // Assert
        assertEquals(2, result.size());
        assertEquals("VALID", result.get(0).getStatus());
        assertEquals("ERROR", result.get(1).getStatus());
        assertTrue(result.get(1).getErrorMessage().contains("bị trùng trong file"));
    }
}
