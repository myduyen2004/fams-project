package com.fams.backend.service;

import com.fams.backend.entity.Major;
import com.fams.backend.repository.MajorRepository;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportMajorsTest {

    @Mock
    private MajorRepository majorRepository;

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
        when(majorRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        List<Major> result = majorService.importMajors(validExcelFile);

        // Assert
        assertEquals(2, result.size());
        assertEquals("SE", result.get(0).getCode());
        assertEquals("AI", result.get(1).getCode());
        verify(majorRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("UTCID02: Import thất bại khi mã ngành để trống")
    void importMajors_EmptyCode_ThrowsException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> majorService.importMajors(emptyCodeExcelFile));
        assertTrue(exception.getMessage().contains("Mã ngành không được để trống"));
    }

    @Test
    @DisplayName("UTCID03: Import thất bại khi tên ngành để trống")
    void importMajors_EmptyName_ThrowsException() {
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> majorService.importMajors(emptyNameExcelFile));
        assertTrue(exception.getMessage().contains("Tên ngành không được để trống"));
    }

    @Test
    @DisplayName("UTCID04: Import thất bại khi mã ngành bị trùng trong file")
    void importMajors_DuplicateCodeInFile_ThrowsException() {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(false);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> majorService.importMajors(duplicateCodeExcelFile));
        assertTrue(exception.getMessage().contains("bị trùng trong file"));
    }

    @Test
    @DisplayName("UTCID05: Import thất bại khi mã ngành đã tồn tại trong database")
    void importMajors_CodeExistsInDatabase_ThrowsException() {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> majorService.importMajors(validExcelFile));
        assertTrue(exception.getMessage().contains("đã tồn tại trong hệ thống"));
    }

    @Test
    @DisplayName("UTCID06: Import file chỉ có header trả về danh sách rỗng")
    void importMajors_OnlyHeader_ReturnsEmptyList() throws IOException {
        // Act
        List<Major> result = majorService.importMajors(onlyHeaderExcelFile);

        // Assert
        assertTrue(result.isEmpty());
        verify(majorRepository, never()).saveAll(anyList());
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
        when(majorRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        List<Major> result = majorService.importMajors(invalidStatusFile);

        // Assert
        assertEquals(1, result.size());
        assertEquals(Major.MajorStatus.ACTIVE, result.get(0).getStatus());
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
        when(majorRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        List<Major> result = majorService.importMajors(emptyDurationFile);

        // Assert
        assertEquals(1, result.size());
        assertEquals("9 Kỳ", result.get(0).getProgramDuration());
    }
}
