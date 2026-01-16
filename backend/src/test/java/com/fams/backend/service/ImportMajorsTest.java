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
import java.util.ArrayList;
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

    // ============== Tests for Preview Import ==============

    @Test
    @DisplayName("UTCID01: Preview import trả về danh sách DTO hợp lệ")
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
    @DisplayName("UTCID02: Preview import với mã ngành đã tồn tại trả về ERROR")
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
    @DisplayName("UTCID03: Preview import với status không hợp lệ có warningMessage")
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
    @DisplayName("UTCID04: Preview import với mã ngành trùng trong file")
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

    @Test
    @DisplayName("UTCID05: Preview import với mã ngành trống trả về ERROR")
    void previewImportMajors_EmptyCode_ReturnsError() throws IOException {
        // Act
        List<MajorImportDTO> result = majorService.previewImportMajors(emptyCodeExcelFile);

        // Assert
        assertEquals(1, result.size());
        assertEquals("ERROR", result.get(0).getStatus());
        assertTrue(result.get(0).getErrorMessage().contains("Mã ngành không được để trống"));
    }

    @Test
    @DisplayName("UTCID06: Preview import với tên ngành trống trả về ERROR")
    void previewImportMajors_EmptyName_ReturnsError() throws IOException {
        // Act
        List<MajorImportDTO> result = majorService.previewImportMajors(emptyNameExcelFile);

        // Assert
        assertEquals(1, result.size());
        assertEquals("ERROR", result.get(0).getStatus());
        assertTrue(result.get(0).getErrorMessage().contains("Tên ngành không được để trống"));
    }

    @Test
    @DisplayName("UTCID07: Preview import file chỉ có header trả về danh sách rỗng")
    void previewImportMajors_OnlyHeader_ReturnsEmptyList() throws IOException {
        // Act
        List<MajorImportDTO> result = majorService.previewImportMajors(onlyHeaderExcelFile);

        // Assert
        assertEquals(0, result.size());
    }

    // ============== Tests for Save Imported Majors ==============

    @Test
    @DisplayName("UTCID08: Save imported majors thành công")
    void saveImportedMajors_Success() {
        // Arrange
        List<MajorImportDTO> dtos = new ArrayList<>();
        dtos.add(MajorImportDTO.builder()
                .rowNumber(2)
                .code("SE")
                .name("Software Engineering")
                .description("Kỹ thuật phần mềm")
                .programDuration("9 Kỳ")
                .statusStr("ACTIVE")
                .status("VALID")
                .build());
        dtos.add(MajorImportDTO.builder()
                .rowNumber(3)
                .code("AI")
                .name("Artificial Intelligence")
                .description("Trí tuệ nhân tạo")
                .programDuration("9 Kỳ")
                .statusStr("ACTIVE")
                .status("VALID")
                .build());

        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.existsByCode("AI")).thenReturn(false);
        when(majorRepository.save(any(Major.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Map<String, Object> result = majorService.saveImportedMajors(dtos);

        // Assert
        assertEquals(2, result.get("created"));
        assertEquals(0, result.get("failed"));
        verify(majorRepository, times(2)).save(any(Major.class));
    }

    @Test
    @DisplayName("UTCID09: Save imported majors bỏ qua các entry có ERROR")
    void saveImportedMajors_SkipsErrorEntries() {
        // Arrange
        List<MajorImportDTO> dtos = new ArrayList<>();
        dtos.add(MajorImportDTO.builder()
                .rowNumber(2)
                .code("SE")
                .name("Software Engineering")
                .status("ERROR")
                .errorMessage("Mã ngành đã tồn tại")
                .build());
        dtos.add(MajorImportDTO.builder()
                .rowNumber(3)
                .code("AI")
                .name("Artificial Intelligence")
                .programDuration("9 Kỳ")
                .statusStr("ACTIVE")
                .status("VALID")
                .build());

        when(majorRepository.existsByCode("AI")).thenReturn(false);
        when(majorRepository.save(any(Major.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Map<String, Object> result = majorService.saveImportedMajors(dtos);

        // Assert
        assertEquals(1, result.get("created"));
        assertEquals(1, result.get("failed"));
        verify(majorRepository, times(1)).save(any(Major.class));
    }

    @Test
    @DisplayName("UTCID10: Save imported majors thất bại khi mã ngành đã tồn tại trong DB")
    void saveImportedMajors_CodeExistsInDB_ReturnsError() {
        // Arrange
        List<MajorImportDTO> dtos = new ArrayList<>();
        dtos.add(MajorImportDTO.builder()
                .rowNumber(2)
                .code("SE")
                .name("Software Engineering")
                .programDuration("9 Kỳ")
                .statusStr("ACTIVE")
                .status("VALID")
                .build());

        when(majorRepository.existsByCode("SE")).thenReturn(true);

        // Act
        Map<String, Object> result = majorService.saveImportedMajors(dtos);

        // Assert
        assertEquals(0, result.get("created"));
        assertEquals(1, result.get("failed"));
        @SuppressWarnings("unchecked")
        List<String> errors = (List<String>) result.get("errors");
        assertTrue(errors.stream().anyMatch(e -> e.contains("đã tồn tại trong hệ thống")));
        verify(majorRepository, never()).save(any(Major.class));
    }

    @Test
    @DisplayName("UTCID11: Save imported majors với status không hợp lệ sẽ mặc định là ACTIVE")
    void saveImportedMajors_InvalidStatus_DefaultsToActive() {
        // Arrange
        List<MajorImportDTO> dtos = new ArrayList<>();
        dtos.add(MajorImportDTO.builder()
                .rowNumber(2)
                .code("SE")
                .name("Software Engineering")
                .programDuration("9 Kỳ")
                .statusStr("INVALID_STATUS")
                .status("VALID")
                .build());

        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.save(any(Major.class))).thenAnswer(invocation -> {
            Major savedMajor = invocation.getArgument(0);
            assertEquals(Major.MajorStatus.ACTIVE, savedMajor.getStatus());
            return savedMajor;
        });

        // Act
        Map<String, Object> result = majorService.saveImportedMajors(dtos);

        // Assert
        assertEquals(1, result.get("created"));
        verify(majorRepository, times(1)).save(any(Major.class));
    }

    @Test
    @DisplayName("UTCID12: Save imported majors với programDuration trống sẽ mặc định là '9 Kỳ'")
    void saveImportedMajors_EmptyProgramDuration_DefaultsTo9Ky() {
        // Arrange
        List<MajorImportDTO> dtos = new ArrayList<>();
        dtos.add(MajorImportDTO.builder()
                .rowNumber(2)
                .code("SE")
                .name("Software Engineering")
                .programDuration("")
                .statusStr("ACTIVE")
                .status("VALID")
                .build());

        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.save(any(Major.class))).thenAnswer(invocation -> {
            Major savedMajor = invocation.getArgument(0);
            assertEquals("9 Kỳ", savedMajor.getProgramDuration());
            return savedMajor;
        });

        // Act
        Map<String, Object> result = majorService.saveImportedMajors(dtos);

        // Assert
        assertEquals(1, result.get("created"));
        verify(majorRepository, times(1)).save(any(Major.class));
    }

    // ============== Tests for Export Major Template ==============

    @Test
    @DisplayName("UTCID13: Export template trả về file Excel hợp lệ với headers")
    void exportMajorTemplate_ReturnsValidExcelWithHeaders() throws IOException {
        // Act
        byte[] templateBytes = majorService.exportMajorTemplate();

        // Assert
        assertNotNull(templateBytes);
        assertTrue(templateBytes.length > 0);

        // Verify Excel content
        try (Workbook workbook = new XSSFWorkbook(new java.io.ByteArrayInputStream(templateBytes))) {
            Sheet sheet = workbook.getSheetAt(0);
            assertNotNull(sheet);

            // Verify header row
            Row headerRow = sheet.getRow(0);
            assertNotNull(headerRow);
            assertEquals("Mã ngành", headerRow.getCell(0).getStringCellValue());
            assertEquals("Tên ngành", headerRow.getCell(1).getStringCellValue());
            assertEquals("Mô tả", headerRow.getCell(2).getStringCellValue());
            assertEquals("Thời gian đào tạo", headerRow.getCell(3).getStringCellValue());
            assertEquals("Trạng thái", headerRow.getCell(4).getStringCellValue());
        }
    }

    @Test
    @DisplayName("UTCID14: Export template chứa dữ liệu mẫu")
    void exportMajorTemplate_ContainsSampleData() throws IOException {
        // Act
        byte[] templateBytes = majorService.exportMajorTemplate();

        // Assert
        try (Workbook workbook = new XSSFWorkbook(new java.io.ByteArrayInputStream(templateBytes))) {
            Sheet sheet = workbook.getSheetAt(0);

            // Verify sample data row
            Row sampleRow = sheet.getRow(1);
            assertNotNull(sampleRow);
            assertEquals("SE", sampleRow.getCell(0).getStringCellValue());
            assertEquals("Kỹ thuật phần mềm", sampleRow.getCell(1).getStringCellValue());
            assertEquals("Ngành đào tạo kỹ sư phần mềm", sampleRow.getCell(2).getStringCellValue());
            assertEquals("9 Kỳ", sampleRow.getCell(3).getStringCellValue());
            assertEquals("ACTIVE", sampleRow.getCell(4).getStringCellValue());
        }
    }

    @Test
    @DisplayName("UTCID15: Export template có đúng 5 cột")
    void exportMajorTemplate_HasCorrectNumberOfColumns() throws IOException {
        // Act
        byte[] templateBytes = majorService.exportMajorTemplate();

        // Assert
        try (Workbook workbook = new XSSFWorkbook(new java.io.ByteArrayInputStream(templateBytes))) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            // Count non-null cells in header row
            int columnCount = 0;
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null && !cell.getStringCellValue().isEmpty()) {
                    columnCount++;
                }
            }
            assertEquals(5, columnCount);
        }
    }
}
