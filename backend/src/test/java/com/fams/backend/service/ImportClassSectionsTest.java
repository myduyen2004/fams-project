package com.fams.backend.service;

import com.fams.backend.dto.ClassSectionImportDTO;
import com.fams.backend.entity.ClassSection;
import com.fams.backend.entity.Course;
import com.fams.backend.entity.Semester;
import com.fams.backend.entity.User;
import com.fams.backend.repository.ClassSectionRepository;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.EnrollmentRepository;
import com.fams.backend.repository.SemesterRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.impl.ClassSectionServiceImpl;
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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Import Class Sections Tests")
class ImportClassSectionsTest {

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private SemesterRepository semesterRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private ClassSectionServiceImpl classSectionService;

    private Semester testSemester;
    private Course testCourse;
    private Course inactiveCourse;
    private User testLecturer;
    private User nonLecturerUser;

    @BeforeEach
    void setUp() {
        // Create test semester
        testSemester = Semester.builder()
                .id(1L)
                .code("SP2024")
                .name("Spring 2024")
                .status(Semester.SemesterStatus.ONGOING)
                .build();

        // Create test course (active)
        testCourse = Course.builder()
                .id(1L)
                .code("PRN211")
                .name("Basic Cross-Platform Application Programming With .NET")
                .credits(3)
                .numberOfSlots(45)
                .status(Course.CourseStatus.ACTIVE)
                .build();

        // Create inactive course
        inactiveCourse = Course.builder()
                .id(2L)
                .code("OLD101")
                .name("Old Course")
                .credits(3)
                .numberOfSlots(30)
                .status(Course.CourseStatus.INACTIVE)
                .build();

        // Create test lecturer
        testLecturer = User.builder()
                .id(1L)
                .username("sonnt5")
                .fullName("Nguyễn Thành Sơn")
                .role(User.UserRole.LECTURER)
                .status(User.UserStatus.ACTIVE)
                .build();

        // Create non-lecturer user
        nonLecturerUser = User.builder()
                .id(2L)
                .username("student01")
                .fullName("Student User")
                .role(User.UserRole.STUDENT)
                .status(User.UserStatus.ACTIVE)
                .build();
    }

    // ==================== PREVIEW TESTS ====================

    @Nested
    @DisplayName("Preview Import Tests")
    class PreviewImportTests {

        @Test
        @DisplayName("Should preview valid class sections successfully")
        void previewValidClassSections() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-PRN211", "PRN211", "sonnt5", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(userRepository.findByUsernameIgnoreCase("sonnt5")).thenReturn(Optional.of(testLecturer));
            when(classSectionRepository.existsByClassNameIgnoreCase(anyString())).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("VALID", result.get(0).getStatus());
            assertEquals("SE18B02-PRN211", result.get(0).getClassName());
            assertEquals("PRN211", result.get(0).getCourseCode());
            assertEquals("sonnt5", result.get(0).getLecturerCode());
            assertEquals(30, result.get(0).getMaxStudents());
            assertEquals("Basic Cross-Platform Application Programming With .NET", result.get(0).getCourseName());
            assertEquals("Nguyễn Thành Sơn", result.get(0).getLecturerName());
        }

        @Test
        @DisplayName("Should return error when semester not found")
        void previewWithInvalidSemester() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-PRN211", "PRN211", "sonnt5", 30 }
            });

            when(semesterRepository.findByCode("INVALID")).thenReturn(Optional.empty());

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> classSectionService.previewImportClassSections("INVALID", file));
            assertEquals("Không tìm thấy học kỳ: INVALID", exception.getMessage());
        }

        @Test
        @DisplayName("Should return error for empty class name")
        void previewWithEmptyClassName() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "", "PRN211", "sonnt5", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Mã lớp học phần không được để trống"));
        }

        @Test
        @DisplayName("Should return error for empty course code")
        void previewWithEmptyCourseCode() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-PRN211", "", "sonnt5", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.existsByClassNameIgnoreCase(anyString())).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Mã môn học không được để trống"));
        }

        @Test
        @DisplayName("Should return error for non-existent course")
        void previewWithNonExistentCourse() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-XXX999", "XXX999", "sonnt5", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("XXX999")).thenReturn(Optional.empty());
            when(classSectionRepository.existsByClassNameIgnoreCase(anyString())).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Không tìm thấy môn học: XXX999"));
        }

        @Test
        @DisplayName("Should return error for inactive course")
        void previewWithInactiveCourse() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-OLD101", "OLD101", "sonnt5", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("OLD101")).thenReturn(Optional.of(inactiveCourse));
            when(classSectionRepository.existsByClassNameIgnoreCase(anyString())).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Môn học đã ngừng đào tạo"));
        }

        @Test
        @DisplayName("Should return error for non-existent lecturer")
        void previewWithNonExistentLecturer() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-PRN211", "PRN211", "invaliduser", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(userRepository.findByUsernameIgnoreCase("invaliduser")).thenReturn(Optional.empty());
            when(classSectionRepository.existsByClassNameIgnoreCase(anyString())).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Không tìm thấy giảng viên: invaliduser"));
        }

        @Test
        @DisplayName("Should return error when user is not a lecturer")
        void previewWithNonLecturerUser() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-PRN211", "PRN211", "student01", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(userRepository.findByUsernameIgnoreCase("student01")).thenReturn(Optional.of(nonLecturerUser));
            when(classSectionRepository.existsByClassNameIgnoreCase(anyString())).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("không phải là giảng viên"));
        }

        @Test
        @DisplayName("Should return error for duplicate class name in file")
        void previewWithDuplicateClassNameInFile() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-PRN211", "PRN211", "sonnt5", 30 },
                    { "SE18B02-PRN211", "PRN211", "sonnt5", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(userRepository.findByUsernameIgnoreCase("sonnt5")).thenReturn(Optional.of(testLecturer));
            when(classSectionRepository.existsByClassNameIgnoreCase("SE18B02-PRN211")).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(2, result.size());
            assertEquals("VALID", result.get(0).getStatus());
            assertEquals("ERROR", result.get(1).getStatus());
            assertTrue(result.get(1).getErrorMessage().contains("Mã lớp học phần bị trùng trong file"));
        }

        @Test
        @DisplayName("Should return error for existing class name in database")
        void previewWithExistingClassNameInDatabase() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "EXISTING-CLASS", "PRN211", "sonnt5", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(userRepository.findByUsernameIgnoreCase("sonnt5")).thenReturn(Optional.of(testLecturer));
            when(classSectionRepository.existsByClassNameIgnoreCase("EXISTING-CLASS")).thenReturn(true);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Mã lớp học phần đã tồn tại trong hệ thống"));
        }

        @Test
        @DisplayName("Should return error for invalid max students")
        void previewWithInvalidMaxStudents() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-PRN211", "PRN211", "sonnt5", 0 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(userRepository.findByUsernameIgnoreCase("sonnt5")).thenReturn(Optional.of(testLecturer));
            when(classSectionRepository.existsByClassNameIgnoreCase(anyString())).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Số lượng sinh viên tối đa phải > 0"));
        }

        @Test
        @DisplayName("Should preview class section without lecturer (optional)")
        void previewWithoutLecturer() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-PRN211", "PRN211", "", 30 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(classSectionRepository.existsByClassNameIgnoreCase(anyString())).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("VALID", result.get(0).getStatus());
            assertNull(result.get(0).getLecturerName());
        }

        @Test
        @DisplayName("Should skip empty rows in Excel file")
        void previewShouldSkipEmptyRows() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "Class Name", "Course Code", "Lecturer Code", "Max Students" },
                    { "SE18B02-PRN211", "PRN211", "sonnt5", 30 },
                    { "", "", "", null }, // Empty row
                    { "SE18B03-PRN211", "PRN211", "sonnt5", 25 }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(userRepository.findByUsernameIgnoreCase("sonnt5")).thenReturn(Optional.of(testLecturer));
            when(classSectionRepository.existsByClassNameIgnoreCase(anyString())).thenReturn(false);

            // Act
            List<ClassSectionImportDTO> result = classSectionService.previewImportClassSections("SP2024", file);

            // Assert
            assertEquals(2, result.size());
            assertEquals("SE18B02-PRN211", result.get(0).getClassName());
            assertEquals("SE18B03-PRN211", result.get(1).getClassName());
        }
    }

    // ==================== SAVE TESTS ====================

    @Nested
    @DisplayName("Save Import Tests")
    class SaveImportTests {

        @Test
        @DisplayName("Should save valid class sections successfully")
        void saveValidClassSections() {
            // Arrange
            List<ClassSectionImportDTO> dtos = List.of(
                    ClassSectionImportDTO.builder()
                            .rowNumber(2)
                            .className("SE18B02-PRN211")
                            .courseCode("PRN211")
                            .lecturerCode("sonnt5")
                            .maxStudents(30)
                            .status("VALID")
                            .build());

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.existsByClassNameIgnoreCase("SE18B02-PRN211")).thenReturn(false);
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(userRepository.findByUsernameIgnoreCase("sonnt5")).thenReturn(Optional.of(testLecturer));
            when(classSectionRepository.saveAll(any())).thenReturn(new ArrayList<>());

            // Act
            Map<String, Object> result = classSectionService.saveImportedClassSections("SP2024", dtos);

            // Assert
            assertEquals(1, result.get("created"));
            assertEquals(0, result.get("failed"));
            verify(classSectionRepository, times(1)).saveAll(any());
        }

        @Test
        @DisplayName("Should not save when there are error rows")
        void saveWithErrorRows() {
            // Arrange
            List<ClassSectionImportDTO> dtos = List.of(
                    ClassSectionImportDTO.builder()
                            .rowNumber(2)
                            .className("SE18B02-PRN211")
                            .courseCode("PRN211")
                            .status("ERROR")
                            .errorMessage("Some error")
                            .build());

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));

            // Act
            Map<String, Object> result = classSectionService.saveImportedClassSections("SP2024", dtos);

            // Assert
            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("failed"));
            verify(classSectionRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("Should reject when class name already exists during save")
        void saveWithExistingClassName() {
            // Arrange
            List<ClassSectionImportDTO> dtos = List.of(
                    ClassSectionImportDTO.builder()
                            .rowNumber(2)
                            .className("EXISTING-CLASS")
                            .courseCode("PRN211")
                            .lecturerCode("sonnt5")
                            .maxStudents(30)
                            .status("VALID")
                            .build());

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.existsByClassNameIgnoreCase("EXISTING-CLASS")).thenReturn(true);

            // Act
            Map<String, Object> result = classSectionService.saveImportedClassSections("SP2024", dtos);

            // Assert
            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("failed"));
            List<String> errors = (List<String>) result.get("errors");
            assertTrue(errors.get(0).contains("Mã lớp học phần đã tồn tại trong hệ thống"));
        }

        @Test
        @DisplayName("Should reject when course is inactive during save")
        void saveWithInactiveCourse() {
            // Arrange
            List<ClassSectionImportDTO> dtos = List.of(
                    ClassSectionImportDTO.builder()
                            .rowNumber(2)
                            .className("SE18B02-OLD101")
                            .courseCode("OLD101")
                            .lecturerCode("sonnt5")
                            .maxStudents(30)
                            .status("VALID")
                            .build());

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.existsByClassNameIgnoreCase("SE18B02-OLD101")).thenReturn(false);
            when(courseRepository.findByCode("OLD101")).thenReturn(Optional.of(inactiveCourse));

            // Act
            Map<String, Object> result = classSectionService.saveImportedClassSections("SP2024", dtos);

            // Assert
            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("failed"));
            List<String> errors = (List<String>) result.get("errors");
            assertTrue(errors.get(0).contains("Môn học đã ngừng đào tạo"));
        }

        @Test
        @DisplayName("Should save class section without lecturer")
        void saveWithoutLecturer() {
            // Arrange
            List<ClassSectionImportDTO> dtos = List.of(
                    ClassSectionImportDTO.builder()
                            .rowNumber(2)
                            .className("SE18B02-PRN211")
                            .courseCode("PRN211")
                            .lecturerCode(null)
                            .maxStudents(30)
                            .status("VALID")
                            .build());

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.existsByClassNameIgnoreCase("SE18B02-PRN211")).thenReturn(false);
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(classSectionRepository.saveAll(any())).thenReturn(new ArrayList<>());

            // Act
            Map<String, Object> result = classSectionService.saveImportedClassSections("SP2024", dtos);

            // Assert
            assertEquals(1, result.get("created"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("Should use default max students when not provided")
        void saveWithDefaultMaxStudents() {
            // Arrange
            List<ClassSectionImportDTO> dtos = List.of(
                    ClassSectionImportDTO.builder()
                            .rowNumber(2)
                            .className("SE18B02-PRN211")
                            .courseCode("PRN211")
                            .lecturerCode("sonnt5")
                            .maxStudents(null) // No max students
                            .status("VALID")
                            .build());

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.existsByClassNameIgnoreCase("SE18B02-PRN211")).thenReturn(false);
            when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(testCourse));
            when(userRepository.findByUsernameIgnoreCase("sonnt5")).thenReturn(Optional.of(testLecturer));
            when(classSectionRepository.saveAll(any())).thenReturn(new ArrayList<>());

            // Act
            Map<String, Object> result = classSectionService.saveImportedClassSections("SP2024", dtos);

            // Assert
            assertEquals(1, result.get("created"));
            assertEquals(0, result.get("failed"));
        }
    }

    // ==================== TEMPLATE TESTS ====================

    @Nested
    @DisplayName("Template Generation Tests")
    class TemplateTests {

        @Test
        @DisplayName("Should generate import template successfully")
        void generateImportTemplate() {
            // Act
            byte[] template = classSectionService.getImportTemplate();

            // Assert
            assertNotNull(template);
            assertTrue(template.length > 0);
        }
    }

    // ==================== HELPER METHODS ====================

    private MultipartFile createExcelFile(Object[][] data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("ClassSections");
            for (int i = 0; i < data.length; i++) {
                Row row = sheet.createRow(i);
                for (int j = 0; j < data[i].length; j++) {
                    Cell cell = row.createCell(j);
                    if (data[i][j] instanceof String) {
                        cell.setCellValue((String) data[i][j]);
                    } else if (data[i][j] instanceof Integer) {
                        cell.setCellValue((Integer) data[i][j]);
                    } else if (data[i][j] instanceof Double) {
                        cell.setCellValue((Double) data[i][j]);
                    }
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
}
