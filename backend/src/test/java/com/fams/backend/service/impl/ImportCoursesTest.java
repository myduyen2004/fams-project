package com.fams.backend.service.impl;

import com.fams.backend.dto.CourseImportDTO;
import com.fams.backend.entity.Course;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.SpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationRepository;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit Test for Import Courses functionality
 * Test Cases: UTCID01 - UTCID06
 */
@ExtendWith(MockitoExtension.class)
class ImportCoursesTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private SpecializationCourseRepository specializationCourseRepository;

    @Mock
    private SubSpecializationCourseRepository subSpecializationCourseRepository;

    @Mock
    private SubSpecializationRepository subSpecializationRepository;

    @InjectMocks
    private CourseServiceImpl courseService;

    private Course existingCourse;

    @BeforeEach
    void setUp() {
        existingCourse = Course.builder()
                .id(1L)
                .code("PRF192")
                .name("Programming Fundamentals")
                .credits(3)
                .numberOfSlots(30)
                .fixedSemester(1)
                .status(Course.CourseStatus.ACTIVE)
                .build();
    }

    /**
     * Helper: Create mock Excel file with data rows
     */
    private MultipartFile createExcelFile(String[][] dataRows) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Courses");

            // Header row
            Row headerRow = sheet.createRow(0);
            String[] headers = { "Code", "Name", "Credits", "Slots", "Semester", "Description", "Status" };
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

            // Data rows
            for (int i = 0; i < dataRows.length; i++) {
                Row row = sheet.createRow(i + 1);
                for (int j = 0; j < dataRows[i].length; j++) {
                    Cell cell = row.createCell(j);
                    String value = dataRows[i][j];
                    if (value != null && !value.isEmpty()) {
                        if (j >= 2 && j <= 4) {
                            try {
                                cell.setCellValue(Double.parseDouble(value));
                            } catch (NumberFormatException e) {
                                cell.setCellValue(value);
                            }
                        } else {
                            cell.setCellValue(value);
                        }
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return new MockMultipartFile("file", "courses.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    new ByteArrayInputStream(out.toByteArray()));
        }
    }

    // ==================== PREVIEW IMPORT TESTS ====================

    @Nested
    @DisplayName("previewImportCourses() Tests")
    class PreviewImportCoursesTests {

        @Test
        @DisplayName("UTCID01: Mã môn học trống - Trả về ERROR")
        void UTCID01_EmptyCode_ReturnsError() throws IOException {
            // Arrange
            String[][] data = { { "", "Test Course", "3", "30", "1", "Description", "ACTIVE" } };
            MultipartFile file = createExcelFile(data);

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Mã môn học không được để trống"));
        }

        @Test
        @DisplayName("UTCID02: Tên môn học trống - Trả về ERROR")
        void UTCID02_EmptyName_ReturnsError() throws IOException {
            // Arrange
            String[][] data = { { "MAE101", "", "3", "30", "1", "Description", "ACTIVE" } };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode("MAE101")).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Tên môn học không được để trống"));
        }

        @Test
        @DisplayName("UTCID03: Mã môn học trùng trong file - Trả về ERROR")
        void UTCID03_DuplicateCodeInFile_ReturnsError() throws IOException {
            // Arrange
            String[][] data = {
                    { "MAE101", "Course 1", "3", "30", "1", "Desc 1", "ACTIVE" },
                    { "MAE101", "Course 2", "3", "30", "2", "Desc 2", "ACTIVE" }
            };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode("MAE101")).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals(2, result.size());
            assertEquals("VALID", result.get(0).getStatus());
            assertEquals("ERROR", result.get(1).getStatus());
            assertTrue(result.get(1).getErrorMessage().contains("Mã môn học bị trùng trong file"));
        }

        @Test
        @DisplayName("UTCID04: Mã môn học đã tồn tại trong hệ thống - Trả về ERROR")
        void UTCID04_CodeExistsInDatabase_ReturnsError() throws IOException {
            // Arrange
            String[][] data = { { "PRF192", "New Course", "3", "30", "1", "Description", "ACTIVE" } };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode("PRF192")).thenReturn(Optional.of(existingCourse));

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Mã môn học đã tồn tại trong hệ thống"));
        }

        @Test
        @DisplayName("UTCID05: Trạng thái không hợp lệ - Trả về WARNING và tự động đặt ACTIVE")
        void UTCID05_InvalidStatus_ReturnsWarningAndDefaultsToActive() throws IOException {
            // Arrange
            String[][] data = { { "MAE101", "Test Course", "3", "30", "1", "Description", "XYZ" } };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode("MAE101")).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("WARNING", result.get(0).getStatus());
            assertEquals("ACTIVE", result.get(0).getStatusValue());
            assertTrue(result.get(0).getWarningMessage().contains("Trạng thái không hợp lệ, tự động đặt là ACTIVE"));
        }

        @Test
        @DisplayName("UTCID06: Dữ liệu hợp lệ với ACTIVE - Trả về VALID")
        void UTCID06_ValidDataWithActive_ReturnsValid() throws IOException {
            // Arrange
            String[][] data = { { "MAE101", "Mathematics", "3", "30", "1", "Math description", "ACTIVE" } };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode("MAE101")).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals(1, result.size());
            CourseImportDTO dto = result.get(0);
            assertEquals("VALID", dto.getStatus());
            assertEquals("MAE101", dto.getCode());
            assertEquals("Mathematics", dto.getName());
            assertEquals(3, dto.getCredits());
            assertEquals(30, dto.getNumberOfSlots());
            assertEquals(1, dto.getFixedSemester());
            assertEquals("ACTIVE", dto.getStatusValue());
            assertNull(dto.getErrorMessage());
            assertNull(dto.getWarningMessage());
        }

        @Test
        @DisplayName("UTCID06b: Dữ liệu hợp lệ với INACTIVE - Trả về VALID")
        void UTCID06b_ValidDataWithInactive_ReturnsValid() throws IOException {
            // Arrange
            String[][] data = { { "MAE101", "Mathematics", "3", "30", "1", "Description", "INACTIVE" } };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode("MAE101")).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("VALID", result.get(0).getStatus());
            assertEquals("INACTIVE", result.get(0).getStatusValue());
        }

        @Test
        @DisplayName("Số tín chỉ không hợp lệ - Trả về ERROR")
        void InvalidCredits_ReturnsError() throws IOException {
            // Arrange
            String[][] data = { { "MAE101", "Course", "0", "30", "1", "Desc", "ACTIVE" } };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode("MAE101")).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Số tín chỉ phải > 0"));
        }

        @Test
        @DisplayName("Số slot không hợp lệ - Trả về ERROR")
        void InvalidSlots_ReturnsError() throws IOException {
            // Arrange
            String[][] data = { { "MAE101", "Course", "3", "0", "1", "Desc", "ACTIVE" } };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode("MAE101")).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Số slot phải > 0"));
        }

        @Test
        @DisplayName("Kỳ học ngoài phạm vi 1-9 - Trả về ERROR")
        void InvalidSemester_ReturnsError() throws IOException {
            // Arrange
            String[][] data = { { "MAE101", "Course", "3", "30", "10", "Desc", "ACTIVE" } };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode("MAE101")).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Kỳ học phải từ 1-9"));
        }

        @Test
        @DisplayName("Nhiều lỗi trong một dòng - Gộp tất cả thông báo lỗi")
        void MultipleErrors_CombinesMessages() throws IOException {
            // Arrange
            String[][] data = { { "", "", "0", "0", "10", "Desc", "ACTIVE" } };
            MultipartFile file = createExcelFile(data);

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals("ERROR", result.get(0).getStatus());
            String errorMsg = result.get(0).getErrorMessage();
            assertTrue(errorMsg.contains("Mã môn học không được để trống"));
            assertTrue(errorMsg.contains("Tên môn học không được để trống"));
            assertTrue(errorMsg.contains("Số tín chỉ phải > 0"));
            assertTrue(errorMsg.contains("Số slot phải > 0"));
            assertTrue(errorMsg.contains("Kỳ học phải từ 1-9"));
        }

        @Test
        @DisplayName("File rỗng (chỉ có header) - Trả về danh sách rỗng")
        void EmptyFile_ReturnsEmptyList() throws IOException {
            // Arrange
            String[][] data = {};
            MultipartFile file = createExcelFile(data);

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Bỏ qua dòng trống - Chỉ xử lý dòng có dữ liệu")
        void SkipsEmptyRows() throws IOException {
            // Arrange
            String[][] data = {
                    { "MAE101", "Course 1", "3", "30", "1", "Desc", "ACTIVE" },
                    { "", "", "", "", "", "", "" },
                    { "MAE102", "Course 2", "3", "30", "2", "Desc", "ACTIVE" }
            };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode(anyString())).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals(2, result.size());
            assertEquals("MAE101", result.get(0).getCode());
            assertEquals("MAE102", result.get(1).getCode());
        }

        @Test
        @DisplayName("Kiểm tra trùng không phân biệt hoa thường")
        void CaseInsensitiveDuplicateCheck() throws IOException {
            // Arrange
            String[][] data = {
                    { "MAE101", "Course 1", "3", "30", "1", "Desc", "ACTIVE" },
                    { "mae101", "Course 2", "3", "30", "2", "Desc", "ACTIVE" }
            };
            MultipartFile file = createExcelFile(data);
            when(courseRepository.findByCode(anyString())).thenReturn(Optional.empty());

            // Act
            List<CourseImportDTO> result = courseService.previewImportCourses(file);

            // Assert
            assertEquals(2, result.size());
            assertEquals("VALID", result.get(0).getStatus());
            assertEquals("ERROR", result.get(1).getStatus());
            assertTrue(result.get(1).getErrorMessage().contains("Mã môn học bị trùng trong file"));
        }
    }

    // ==================== SAVE IMPORT TESTS ====================

    @Nested
    @DisplayName("saveImportedCourses() Tests")
    class SaveImportedCoursesTests {

        @Test
        @DisplayName("Lưu thành công - Tạo môn học và trả về số lượng đúng")
        void SaveSuccess_CreatesCoursesAndReturnsCounts() {
            // Arrange
            List<CourseImportDTO> dtos = Arrays.asList(
                    CourseImportDTO.builder()
                            .rowNumber(2).code("MAE101").name("Mathematics")
                            .credits(3).numberOfSlots(30).fixedSemester(1)
                            .statusValue("ACTIVE").status("VALID").build(),
                    CourseImportDTO.builder()
                            .rowNumber(3).code("PRO192").name("Programming")
                            .credits(3).numberOfSlots(30).fixedSemester(2)
                            .statusValue("INACTIVE").status("VALID").build());
            when(courseRepository.existsByCode(anyString())).thenReturn(false);
            when(courseRepository.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));

            // Act
            Map<String, Object> result = courseService.saveImportedCourses(dtos);

            // Assert
            assertEquals(2, result.get("created"));
            assertEquals(0, result.get("failed"));
            assertTrue(((List<?>) result.get("errors")).isEmpty());
            verify(courseRepository, times(2)).save(any(Course.class));
        }

        @Test
        @DisplayName("Bỏ qua dòng ERROR - Không lưu dòng có lỗi")
        void SkipsErrorRows() {
            // Arrange
            List<CourseImportDTO> dtos = Arrays.asList(
                    CourseImportDTO.builder()
                            .rowNumber(2).code("MAE101").name("Valid")
                            .credits(3).numberOfSlots(30).fixedSemester(1)
                            .statusValue("ACTIVE").status("VALID").build(),
                    CourseImportDTO.builder()
                            .rowNumber(3).code("").name("Invalid")
                            .credits(3).numberOfSlots(30).fixedSemester(1)
                            .statusValue("ACTIVE").status("ERROR")
                            .errorMessage("Mã môn học không được để trống").build());
            when(courseRepository.existsByCode("MAE101")).thenReturn(false);
            when(courseRepository.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));

            // Act
            Map<String, Object> result = courseService.saveImportedCourses(dtos);

            // Assert
            assertEquals(1, result.get("created"));
            assertEquals(1, result.get("failed"));
            verify(courseRepository, times(1)).save(any(Course.class));
        }

        @Test
        @DisplayName("Xử lý dòng WARNING - Vẫn lưu môn học")
        void ProcessesWarningRows() {
            // Arrange
            List<CourseImportDTO> dtos = Arrays.asList(
                    CourseImportDTO.builder()
                            .rowNumber(2).code("MAE101").name("Course")
                            .credits(3).numberOfSlots(30).fixedSemester(1)
                            .statusValue("ACTIVE").status("WARNING")
                            .warningMessage("Trạng thái không hợp lệ, tự động đặt là ACTIVE").build());
            when(courseRepository.existsByCode("MAE101")).thenReturn(false);
            when(courseRepository.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));

            // Act
            Map<String, Object> result = courseService.saveImportedCourses(dtos);

            // Assert
            assertEquals(1, result.get("created"));
            assertEquals(0, result.get("failed"));
            verify(courseRepository).save(any(Course.class));
        }

        @Test
        @DisplayName("Double check ngăn trùng lặp - Lỗi nếu code đã tồn tại khi lưu")
        void DoubleCheckPreventsDuplicate() {
            // Arrange
            List<CourseImportDTO> dtos = Arrays.asList(
                    CourseImportDTO.builder()
                            .rowNumber(2).code("MAE101").name("Course")
                            .credits(3).numberOfSlots(30).fixedSemester(1)
                            .statusValue("ACTIVE").status("VALID").build());
            when(courseRepository.existsByCode("MAE101")).thenReturn(true);

            // Act
            Map<String, Object> result = courseService.saveImportedCourses(dtos);

            // Assert
            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("failed"));
            List<String> errors = (List<String>) result.get("errors");
            assertTrue(errors.get(0).contains("Mã môn học đã tồn tại"));
            verify(courseRepository, never()).save(any(Course.class));
        }

        @Test
        @DisplayName("Mapping status đúng - INACTIVE được lưu là INACTIVE")
        void CorrectStatusMapping() {
            // Arrange
            List<CourseImportDTO> dtos = Arrays.asList(
                    CourseImportDTO.builder()
                            .rowNumber(2).code("MAE101").name("Inactive Course")
                            .credits(3).numberOfSlots(30).fixedSemester(1)
                            .statusValue("INACTIVE").status("VALID").build());
            when(courseRepository.existsByCode("MAE101")).thenReturn(false);
            when(courseRepository.save(any(Course.class))).thenAnswer(inv -> {
                Course course = inv.getArgument(0);
                assertEquals(Course.CourseStatus.INACTIVE, course.getStatus());
                return course;
            });

            // Act
            Map<String, Object> result = courseService.saveImportedCourses(dtos);

            // Assert
            assertEquals(1, result.get("created"));
            verify(courseRepository).save(any(Course.class));
        }

        @Test
        @DisplayName("Xử lý exception khi lưu - Đếm là failed")
        void HandlesExceptionDuringSave() {
            // Arrange
            List<CourseImportDTO> dtos = Arrays.asList(
                    CourseImportDTO.builder()
                            .rowNumber(2).code("MAE101").name("Course")
                            .credits(3).numberOfSlots(30).fixedSemester(1)
                            .statusValue("ACTIVE").status("VALID").build());
            when(courseRepository.existsByCode("MAE101")).thenReturn(false);
            when(courseRepository.save(any(Course.class))).thenThrow(new RuntimeException("Database error"));

            // Act
            Map<String, Object> result = courseService.saveImportedCourses(dtos);

            // Assert
            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("failed"));
            List<String> errors = (List<String>) result.get("errors");
            assertTrue(errors.get(0).contains("Database error"));
        }

        @Test
        @DisplayName("Danh sách rỗng - Trả về số đếm bằng 0")
        void EmptyList_ReturnsZeroCounts() {
            // Arrange
            List<CourseImportDTO> dtos = Collections.emptyList();

            // Act
            Map<String, Object> result = courseService.saveImportedCourses(dtos);

            // Assert
            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("failed"));
            assertTrue(((List<?>) result.get("errors")).isEmpty());
            verify(courseRepository, never()).save(any(Course.class));
        }
    }

    // ==================== GET IMPORT TEMPLATE TESTS ====================

    @Nested
    @DisplayName("getImportTemplate() Tests")
    class GetImportTemplateTests {

        @Test
        @DisplayName("Tạo template - Trả về file Excel hợp lệ với headers và dữ liệu mẫu")
        void ReturnsValidExcelTemplate() throws IOException {
            // Act
            byte[] templateBytes = courseService.getImportTemplate();

            // Assert
            assertNotNull(templateBytes);
            assertTrue(templateBytes.length > 0);

            try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(templateBytes))) {
                // Check data sheet
                Sheet dataSheet = workbook.getSheetAt(0);
                assertEquals("Template Import Môn học", dataSheet.getSheetName());

                // Check headers
                Row headerRow = dataSheet.getRow(0);
                assertEquals("Code", headerRow.getCell(0).getStringCellValue());
                assertEquals("Name", headerRow.getCell(1).getStringCellValue());
                assertEquals("Credits", headerRow.getCell(2).getStringCellValue());
                assertEquals("Slots", headerRow.getCell(3).getStringCellValue());
                assertEquals("Semester", headerRow.getCell(4).getStringCellValue());
                assertEquals("Description", headerRow.getCell(5).getStringCellValue());
                assertEquals("Status", headerRow.getCell(6).getStringCellValue());

                // Check sample data
                Row sampleRow = dataSheet.getRow(1);
                assertNotNull(sampleRow);

                // Check instruction sheet
                Sheet instructionSheet = workbook.getSheet("Hướng dẫn");
                assertNotNull(instructionSheet);
            }
        }
    }

    // ==================== EXPORT COURSES TESTS ====================

    @Nested
    @DisplayName("exportCourses() Tests")
    class ExportCoursesTests {

        @Test
        @DisplayName("Export tất cả - Xuất toàn bộ môn học")
        void ExportAllCourses() throws IOException {
            // Arrange
            List<Course> courses = Arrays.asList(
                    Course.builder().id(1L).code("MAE101").name("Math")
                            .credits(3).numberOfSlots(30).fixedSemester(1)
                            .status(Course.CourseStatus.ACTIVE).build(),
                    Course.builder().id(2L).code("PRO192").name("Programming")
                            .credits(3).numberOfSlots(30).fixedSemester(2)
                            .status(Course.CourseStatus.INACTIVE).build());
            when(courseRepository.findAll()).thenReturn(courses);

            // Act
            byte[] result = courseService.exportCourses(null);

            // Assert
            assertNotNull(result);
            try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(result))) {
                Sheet sheet = workbook.getSheetAt(0);
                assertEquals(3, sheet.getPhysicalNumberOfRows()); // Header + 2 rows
            }
        }

        @Test
        @DisplayName("Export theo filter ACTIVE - Chỉ xuất môn đang mở")
        void ExportFilterByActive() throws IOException {
            // Arrange
            List<Course> courses = Arrays.asList(
                    Course.builder().id(1L).code("MAE101").name("Math")
                            .credits(3).numberOfSlots(30).fixedSemester(1)
                            .status(Course.CourseStatus.ACTIVE).build(),
                    Course.builder().id(2L).code("PRO192").name("Programming")
                            .credits(3).numberOfSlots(30).fixedSemester(2)
                            .status(Course.CourseStatus.INACTIVE).build());
            when(courseRepository.findAll()).thenReturn(courses);

            // Act
            byte[] result = courseService.exportCourses("ACTIVE");

            // Assert
            assertNotNull(result);
            try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(result))) {
                Sheet sheet = workbook.getSheetAt(0);
                assertEquals(2, sheet.getPhysicalNumberOfRows()); // Header + 1 active
                assertEquals("MAE101", sheet.getRow(1).getCell(0).getStringCellValue());
            }
        }
    }
}
