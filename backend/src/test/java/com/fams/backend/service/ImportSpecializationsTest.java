package com.fams.backend.service;

import com.fams.backend.entity.Major;
import com.fams.backend.entity.Specialization;
import com.fams.backend.repository.MajorRepository;
import com.fams.backend.repository.SpecializationRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportSpecializationsTest {

    @Mock
    private SpecializationRepository specializationRepository;

    @Mock
    private MajorRepository majorRepository;

    @InjectMocks
    private SpecializationService specializationService;

    private Major testMajor;
    private MultipartFile validExcelFile;
    private MultipartFile emptyCodeExcelFile;
    private MultipartFile emptyNameExcelFile;
    private MultipartFile duplicateCodeExcelFile;
    private MultipartFile onlyHeaderExcelFile;
    private MultipartFile differentMajorCodeFile;

    @BeforeEach
    void setUp() throws IOException {
        // Tạo Major test
        testMajor = Major.builder()
                .id(1L)
                .code("SE")
                .name("Software Engineering")
                .status(Major.MajorStatus.ACTIVE)
                .build();

        // File Excel hợp lệ (cột: majorCode, code, name, description, totalCredits,
        // status)
        validExcelFile = createExcelFile(new String[][] {
                { "major code", "specialization code", "specialization name", "description", "totalCredits", "status" },
                { "SE", "SE-WEB", "Web Development", "Phát triển ứng dụng Web", "35", "ACTIVE" },
                { "SE", "SE-MOB", "Mobile App Development", "Phát triển ứng dụng di động", "35", "ACTIVE" }
        });

        // File với mã chuyên ngành trống
        emptyCodeExcelFile = createExcelFile(new String[][] {
                { "major code", "specialization code", "specialization name", "description", "totalCredits", "status" },
                { "SE", "", "Web Development", "Mô tả", "35", "ACTIVE" }
        });

        // File với tên chuyên ngành trống
        emptyNameExcelFile = createExcelFile(new String[][] {
                { "major code", "specialization code", "specialization name", "description", "totalCredits", "status" },
                { "SE", "SE-WEB", "", "Mô tả", "35", "ACTIVE" }
        });

        // File với mã chuyên ngành trùng trong file
        duplicateCodeExcelFile = createExcelFile(new String[][] {
                { "major code", "specialization code", "specialization name", "description", "totalCredits", "status" },
                { "SE", "SE-WEB", "Web Development", "Mô tả 1", "35", "ACTIVE" },
                { "SE", "SE-WEB", "Web Development 2", "Mô tả 2", "35", "ACTIVE" }
        });

        // File chỉ có header
        onlyHeaderExcelFile = createExcelFile(new String[][] {
                { "major code", "specialization code", "specialization name", "description", "totalCredits", "status" }
        });

        // File với major code khác
        differentMajorCodeFile = createExcelFile(new String[][] {
                { "major code", "specialization code", "specialization name", "description", "totalCredits", "status" },
                { "AI", "AI-ML", "Machine Learning", "Học máy", "35", "ACTIVE" },
                { "IA", "IA-NET", "Network Security", "Bảo mật mạng", "35", "ACTIVE" }
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
        when(specializationRepository.findByCode("SE-WEB")).thenReturn(Optional.empty());
        when(specializationRepository.findByCode("SE-MOB")).thenReturn(Optional.empty());
        when(specializationRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        List<Specialization> result = specializationService.importSpecializations(1L, validExcelFile);

        // Assert
        assertEquals(2, result.size());
        assertEquals("SE-WEB", result.get(0).getCode());
        assertEquals("SE-MOB", result.get(1).getCode());
        verify(specializationRepository, times(1)).saveAll(anyList());
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
    @DisplayName("UTCID03: Import thất bại khi mã chuyên ngành để trống")
    void importSpecializations_EmptyCode_ThrowsException() {
        // Arrange
        when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));

        // Act & Assert
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> specializationService.importSpecializations(1L, emptyCodeExcelFile));
        assertTrue(exception.getMessage().contains("Mã chuyên ngành không được để trống"));
    }

    @Test
    @DisplayName("UTCID04: Import thất bại khi tên chuyên ngành để trống")
    void importSpecializations_EmptyName_ThrowsException() {
        // Arrange
        when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));

        // Act & Assert
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> specializationService.importSpecializations(1L, emptyNameExcelFile));
        assertTrue(exception.getMessage().contains("Tên chuyên ngành không được để trống"));
    }

    @Test
    @DisplayName("UTCID05: Import thất bại khi mã chuyên ngành bị trùng trong file")
    void importSpecializations_DuplicateCodeInFile_ThrowsException() {
        // Arrange
        when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
        when(specializationRepository.findByCode("SE-WEB")).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> specializationService.importSpecializations(1L, duplicateCodeExcelFile));
        assertTrue(exception.getMessage().contains("bị trùng trong file"));
    }

    @Test
    @DisplayName("UTCID06: Import thất bại khi mã chuyên ngành đã tồn tại trong database")
    void importSpecializations_CodeExistsInDatabase_ThrowsException() {
        // Arrange
        Specialization existingSpec = Specialization.builder()
                .id(1L)
                .code("SE-WEB")
                .name("Existing Specialization")
                .build();
        when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
        when(specializationRepository.findByCode("SE-WEB")).thenReturn(Optional.of(existingSpec));

        // Act & Assert
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> specializationService.importSpecializations(1L, validExcelFile));
        assertTrue(exception.getMessage().contains("đã tồn tại trong hệ thống"));
    }

    @Test
    @DisplayName("UTCID07: Import file chỉ có header throws exception")
    void importSpecializations_OnlyHeader_ThrowsException() {
        // Arrange
        when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));

        // Act & Assert
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> specializationService.importSpecializations(1L, onlyHeaderExcelFile));
        assertTrue(exception.getMessage().contains("File không chứa dữ liệu chuyên ngành hợp lệ"));
        verify(specializationRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("UTCID08: Import throws exception khi tất cả dòng có major code khác")
    void importSpecializations_DifferentMajorCode_ThrowsException() {
        // Arrange
        when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));

        // Act & Assert
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> specializationService.importSpecializations(1L, differentMajorCodeFile));
        assertTrue(exception.getMessage().contains("Không có chuyên ngành nào được import"));
        assertTrue(exception.getMessage().contains("mã ngành không khớp"));
        verify(specializationRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("UTCID09: Import với status không hợp lệ sẽ mặc định là ACTIVE")
    void importSpecializations_InvalidStatus_DefaultsToActive() throws IOException {
        // Arrange
        MultipartFile invalidStatusFile = createExcelFile(new String[][] {
                { "major code", "specialization code", "specialization name", "description", "totalCredits", "status" },
                { "SE", "SE-WEB", "Web Development", "Mô tả", "35", "INVALID_STATUS" }
        });
        when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
        when(specializationRepository.findByCode("SE-WEB")).thenReturn(Optional.empty());
        when(specializationRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        List<Specialization> result = specializationService.importSpecializations(1L, invalidStatusFile);

        // Assert
        assertEquals(1, result.size());
        assertEquals(Specialization.SpecializationStatus.ACTIVE, result.get(0).getStatus());
    }

    @Test
    @DisplayName("UTCID10: Import file có cả dòng hợp lệ và dòng major code khác")
    void importSpecializations_MixedMajorCodes_OnlyImportsMatching() throws IOException {
        // Arrange
        MultipartFile mixedFile = createExcelFile(new String[][] {
                { "major code", "specialization code", "specialization name", "description", "totalCredits", "status" },
                { "SE", "SE-WEB", "Web Development", "Mô tả 1", "35", "ACTIVE" },
                { "AI", "AI-ML", "Machine Learning", "Mô tả 2", "35", "ACTIVE" },
                { "SE", "SE-MOB", "Mobile Development", "Mô tả 3", "35", "ACTIVE" }
        });
        when(majorRepository.findById(1L)).thenReturn(Optional.of(testMajor));
        when(specializationRepository.findByCode("SE-WEB")).thenReturn(Optional.empty());
        when(specializationRepository.findByCode("SE-MOB")).thenReturn(Optional.empty());
        when(specializationRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        List<Specialization> result = specializationService.importSpecializations(1L, mixedFile);

        // Assert
        assertEquals(2, result.size()); // Chỉ import 2 dòng có major code "SE"
        assertEquals("SE-WEB", result.get(0).getCode());
        assertEquals("SE-MOB", result.get(1).getCode());
    }
}
