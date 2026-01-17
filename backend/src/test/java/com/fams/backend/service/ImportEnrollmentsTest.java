package com.fams.backend.service;

import com.fams.backend.dto.EnrollmentImportDTO;
import com.fams.backend.entity.ClassSection;
import com.fams.backend.entity.Course;
import com.fams.backend.entity.Enrollment;
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
@DisplayName("Import Enrollments Tests")
class ImportEnrollmentsTest {

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
    private Semester otherSemester;
    private Course testCourse;
    private ClassSection testClassSection;
    private ClassSection fullClassSection;
    private User testStudent;
    private User testLecturer;

    @BeforeEach
    void setUp() {
        // Create test semester
        testSemester = Semester.builder()
                .id(1L)
                .code("SP2024")
                .name("Spring 2024")
                .status(Semester.SemesterStatus.ONGOING)
                .build();

        // Create other semester
        otherSemester = Semester.builder()
                .id(2L)
                .code("FA2023")
                .name("Fall 2023")
                .status(Semester.SemesterStatus.COMPLETED)
                .build();

        // Create test course
        testCourse = Course.builder()
                .id(1L)
                .code("PRN211")
                .name("Basic Cross-Platform Application Programming With .NET")
                .credits(3)
                .numberOfSlots(45)
                .status(Course.CourseStatus.ACTIVE)
                .build();

        // Create test class section
        testClassSection = ClassSection.builder()
                .className("SE18B02-PRN211")
                .course(testCourse)
                .semester(testSemester)
                .maxStudents(30)
                .currentEnrollment(10)
                .status(ClassSection.ClassStatus.UPCOMING)
                .build();

        // Create full class section
        fullClassSection = ClassSection.builder()
                .className("SE18B03-PRN211")
                .course(testCourse)
                .semester(testSemester)
                .maxStudents(30)
                .currentEnrollment(30)
                .status(ClassSection.ClassStatus.UPCOMING)
                .build();

        // Create test student
        testStudent = User.builder()
                .id(1L)
                .code("SE123456")
                .username("se123456")
                .fullName("Nguyễn Văn A")
                .role(User.UserRole.STUDENT)
                .build();

        // Create test lecturer (not a student)
        testLecturer = User.builder()
                .id(2L)
                .code("LECTURER01")
                .username("sonnt5")
                .fullName("Nguyễn Thành Sơn")
                .role(User.UserRole.LECTURER)
                .build();
    }

    // ==================== PREVIEW TESTS ====================

    @Nested
    @DisplayName("Preview Import Tests")
    class PreviewImportTests {

        @Test
        @DisplayName("Should preview valid enrollments successfully")
        void previewValidEnrollments() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "SE18B02-PRN211" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B02-PRN211"))
                    .thenReturn(Optional.of(testClassSection));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(anyString(), anyString()))
                    .thenReturn(false);
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211")).thenReturn(10L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("VALID", result.get(0).getStatus());
            assertEquals("SE123456", result.get(0).getStudentCode());
            assertEquals("SE18B02-PRN211", result.get(0).getClassName());
            assertEquals("Nguyễn Văn A", result.get(0).getStudentName());
            assertEquals("Basic Cross-Platform Application Programming With .NET", result.get(0).getCourseName());
        }

        @Test
        @DisplayName("Should return error when semester not found")
        void previewWithInvalidSemester() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "SE18B02-PRN211" }
            });

            when(semesterRepository.findByCode("INVALID")).thenReturn(Optional.empty());

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> classSectionService.previewImportEnrollments("INVALID", file));
            assertEquals("Không tìm thấy học kỳ: INVALID", exception.getMessage());
        }

        @Test
        @DisplayName("Should return error for empty student code")
        void previewWithEmptyStudentCode() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "", "SE18B02-PRN211" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B02-PRN211"))
                    .thenReturn(Optional.of(testClassSection));
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211")).thenReturn(10L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Mã sinh viên không được để trống"));
        }

        @Test
        @DisplayName("Should return error for empty class name")
        void previewWithEmptyClassName() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Mã lớp học phần không được để trống"));
        }

        @Test
        @DisplayName("Should return error for non-existent class section")
        void previewWithNonExistentClassSection() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "INVALID-CLASS" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("INVALID-CLASS"))
                    .thenReturn(Optional.empty());
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Không tìm thấy lớp học phần: INVALID-CLASS"));
        }

        @Test
        @DisplayName("Should return error when class section belongs to different semester")
        void previewWithClassSectionFromDifferentSemester() throws IOException {
            // Arrange
            ClassSection otherSemesterClassSection = ClassSection.builder()
                    .className("FA23-PRN211")
                    .course(testCourse)
                    .semester(otherSemester) // Different semester
                    .maxStudents(30)
                    .currentEnrollment(10)
                    .build();

            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "FA23-PRN211" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("FA23-PRN211"))
                    .thenReturn(Optional.of(otherSemesterClassSection));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(enrollmentRepository.countByClassSectionClassName("FA23-PRN211")).thenReturn(10L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("không thuộc học kỳ SP2024"));
        }

        @Test
        @DisplayName("Should return error for non-existent student")
        void previewWithNonExistentStudent() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "INVALID999", "SE18B02-PRN211" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B02-PRN211"))
                    .thenReturn(Optional.of(testClassSection));
            when(userRepository.findByCodeIgnoreCase("INVALID999")).thenReturn(Optional.empty());
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211")).thenReturn(10L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Không tìm thấy sinh viên: INVALID999"));
        }

        @Test
        @DisplayName("Should return error when user is not a student")
        void previewWithNonStudentUser() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "LECTURER01", "SE18B02-PRN211" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B02-PRN211"))
                    .thenReturn(Optional.of(testClassSection));
            when(userRepository.findByCodeIgnoreCase("LECTURER01")).thenReturn(Optional.of(testLecturer));
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211")).thenReturn(10L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("không phải là sinh viên"));
        }

        @Test
        @DisplayName("Should return error for duplicate enrollment in file")
        void previewWithDuplicateEnrollmentInFile() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "SE18B02-PRN211" },
                    { "SE123456", "SE18B02-PRN211" } // Duplicate
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B02-PRN211"))
                    .thenReturn(Optional.of(testClassSection));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(anyString(), anyString()))
                    .thenReturn(false);
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211")).thenReturn(10L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(2, result.size());
            assertEquals("VALID", result.get(0).getStatus());
            assertEquals("ERROR", result.get(1).getStatus());
            assertTrue(result.get(1).getErrorMessage().contains("Bản ghi bị trùng trong file"));
        }

        @Test
        @DisplayName("Should return error when student already enrolled")
        void previewWithExistingEnrollment() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "SE18B02-PRN211" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B02-PRN211"))
                    .thenReturn(Optional.of(testClassSection));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase("SE18B02-PRN211", "SE123456"))
                    .thenReturn(true);
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211")).thenReturn(10L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Sinh viên đã đăng ký lớp học phần này"));
        }

        @Test
        @DisplayName("Should return error when class is full")
        void previewWithFullClass() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "SE18B03-PRN211" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B03-PRN211"))
                    .thenReturn(Optional.of(fullClassSection));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(anyString(), anyString()))
                    .thenReturn(false);
            when(enrollmentRepository.countByClassSectionClassName("SE18B03-PRN211")).thenReturn(30L); // Full

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("đã đạt số lượng sinh viên tối đa"));
        }

        @Test
        @DisplayName("Should track pending count and return error when exceeding max students")
        void previewWithPendingCountExceedingMax() throws IOException {
            // Arrange - Class has 29/30 students, import 2 more
            ClassSection almostFullClass = ClassSection.builder()
                    .className("SE18B04-PRN211")
                    .course(testCourse)
                    .semester(testSemester)
                    .maxStudents(30)
                    .currentEnrollment(29)
                    .build();

            User student2 = User.builder()
                    .id(3L)
                    .code("SE123457")
                    .fullName("Nguyễn Văn B")
                    .role(User.UserRole.STUDENT)
                    .build();

            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "SE18B04-PRN211" },
                    { "SE123457", "SE18B04-PRN211" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B04-PRN211"))
                    .thenReturn(Optional.of(almostFullClass));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(userRepository.findByCodeIgnoreCase("SE123457")).thenReturn(Optional.of(student2));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(anyString(), anyString()))
                    .thenReturn(false);
            when(enrollmentRepository.countByClassSectionClassName("SE18B04-PRN211")).thenReturn(29L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(2, result.size());
            assertEquals("VALID", result.get(0).getStatus()); // First one should pass
            assertEquals("ERROR", result.get(1).getStatus()); // Second should fail (29+1 >= 30)
            assertTrue(result.get(1).getErrorMessage().contains("đã đạt số lượng sinh viên tối đa"));
        }

        @Test
        @DisplayName("Should skip empty rows in Excel file")
        void previewShouldSkipEmptyRows() throws IOException {
            // Arrange
            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "SE18B02-PRN211" },
                    { "", "" }, // Empty row
                    { "SE123457", "SE18B02-PRN211" }
            });

            User student2 = User.builder()
                    .id(3L)
                    .code("SE123457")
                    .fullName("Nguyễn Văn B")
                    .role(User.UserRole.STUDENT)
                    .build();

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B02-PRN211"))
                    .thenReturn(Optional.of(testClassSection));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(userRepository.findByCodeIgnoreCase("SE123457")).thenReturn(Optional.of(student2));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(anyString(), anyString()))
                    .thenReturn(false);
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211")).thenReturn(10L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(2, result.size());
            assertEquals("SE123456", result.get(0).getStudentCode());
            assertEquals("SE123457", result.get(1).getStudentCode());
        }

        @Test
        @DisplayName("Should support importing for multiple class sections")
        void previewMultipleClassSections() throws IOException {
            // Arrange
            ClassSection classSection2 = ClassSection.builder()
                    .className("SE18B05-PRN212")
                    .course(testCourse)
                    .semester(testSemester)
                    .maxStudents(30)
                    .currentEnrollment(5)
                    .build();

            MultipartFile file = createExcelFile(new Object[][] {
                    { "MSSV", "Mã lớp + Mã môn" },
                    { "SE123456", "SE18B02-PRN211" },
                    { "SE123456", "SE18B05-PRN212" }
            });

            when(semesterRepository.findByCode("SP2024")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findByClassNameWithDetails("SE18B02-PRN211"))
                    .thenReturn(Optional.of(testClassSection));
            when(classSectionRepository.findByClassNameWithDetails("SE18B05-PRN212"))
                    .thenReturn(Optional.of(classSection2));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(anyString(), anyString()))
                    .thenReturn(false);
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211")).thenReturn(10L);
            when(enrollmentRepository.countByClassSectionClassName("SE18B05-PRN212")).thenReturn(5L);

            // Act
            List<EnrollmentImportDTO> result = classSectionService.previewImportEnrollments("SP2024", file);

            // Assert
            assertEquals(2, result.size());
            assertEquals("VALID", result.get(0).getStatus());
            assertEquals("VALID", result.get(1).getStatus());
            assertEquals("SE18B02-PRN211", result.get(0).getClassName());
            assertEquals("SE18B05-PRN212", result.get(1).getClassName());
        }
    }

    // ==================== SAVE TESTS ====================

    @Nested
    @DisplayName("Save Import Tests")
    class SaveImportTests {

        @Test
        @DisplayName("Should save valid enrollments successfully")
        void saveValidEnrollments() {
            // Arrange
            List<EnrollmentImportDTO> dtos = List.of(
                    EnrollmentImportDTO.builder()
                            .rowNumber(2)
                            .studentCode("SE123456")
                            .className("SE18B02-PRN211")
                            .status("VALID")
                            .build());

            when(classSectionRepository.findById("SE18B02-PRN211")).thenReturn(Optional.of(testClassSection));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(anyString(), anyString()))
                    .thenReturn(false);
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211")).thenReturn(10L);
            when(enrollmentRepository.saveAll(any())).thenReturn(new ArrayList<>());

            // Act
            Map<String, Object> result = classSectionService.saveImportedEnrollments(dtos);

            // Assert
            assertEquals(1, result.get("created"));
            assertEquals(0, result.get("failed"));
            verify(enrollmentRepository, times(1)).saveAll(any());
            verify(classSectionRepository, times(1)).save(any());
        }

        @Test
        @DisplayName("Should not save when there are error rows")
        void saveWithErrorRows() {
            // Arrange
            List<EnrollmentImportDTO> dtos = List.of(
                    EnrollmentImportDTO.builder()
                            .rowNumber(2)
                            .studentCode("SE123456")
                            .className("SE18B02-PRN211")
                            .status("ERROR")
                            .errorMessage("Some error")
                            .build());

            // Act
            Map<String, Object> result = classSectionService.saveImportedEnrollments(dtos);

            // Assert
            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("failed"));
            verify(enrollmentRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("Should reject when enrollment already exists during save")
        void saveWithExistingEnrollment() {
            // Arrange
            List<EnrollmentImportDTO> dtos = List.of(
                    EnrollmentImportDTO.builder()
                            .rowNumber(2)
                            .studentCode("SE123456")
                            .className("SE18B02-PRN211")
                            .status("VALID")
                            .build());

            when(classSectionRepository.findById("SE18B02-PRN211")).thenReturn(Optional.of(testClassSection));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase("SE18B02-PRN211", "SE123456"))
                    .thenReturn(true);

            // Act
            Map<String, Object> result = classSectionService.saveImportedEnrollments(dtos);

            // Assert
            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("failed"));
            List<String> errors = (List<String>) result.get("errors");
            assertTrue(errors.get(0).contains("Sinh viên đã đăng ký lớp học phần này"));
        }

        @Test
        @DisplayName("Should reject when class is full during save")
        void saveWithFullClass() {
            // Arrange
            List<EnrollmentImportDTO> dtos = List.of(
                    EnrollmentImportDTO.builder()
                            .rowNumber(2)
                            .studentCode("SE123456")
                            .className("SE18B03-PRN211")
                            .status("VALID")
                            .build());

            when(classSectionRepository.findById("SE18B03-PRN211")).thenReturn(Optional.of(fullClassSection));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(anyString(), anyString()))
                    .thenReturn(false);
            when(enrollmentRepository.countByClassSectionClassName("SE18B03-PRN211")).thenReturn(30L); // Full

            // Act
            Map<String, Object> result = classSectionService.saveImportedEnrollments(dtos);

            // Assert
            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("failed"));
            List<String> errors = (List<String>) result.get("errors");
            assertTrue(errors.get(0).contains("đã đạt số lượng sinh viên tối đa"));
        }

        @Test
        @DisplayName("Should update current enrollment count after save")
        void saveUpdatesCurrentEnrollment() {
            // Arrange
            List<EnrollmentImportDTO> dtos = List.of(
                    EnrollmentImportDTO.builder()
                            .rowNumber(2)
                            .studentCode("SE123456")
                            .className("SE18B02-PRN211")
                            .status("VALID")
                            .build());

            when(classSectionRepository.findById("SE18B02-PRN211")).thenReturn(Optional.of(testClassSection));
            when(userRepository.findByCodeIgnoreCase("SE123456")).thenReturn(Optional.of(testStudent));
            when(enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(anyString(), anyString()))
                    .thenReturn(false);
            when(enrollmentRepository.countByClassSectionClassName("SE18B02-PRN211"))
                    .thenReturn(10L) // Before save
                    .thenReturn(11L); // After save
            when(enrollmentRepository.saveAll(any())).thenReturn(new ArrayList<>());

            // Act
            Map<String, Object> result = classSectionService.saveImportedEnrollments(dtos);

            // Assert
            assertEquals(1, result.get("created"));
            verify(classSectionRepository, times(1)).save(any());
        }
    }

    // ==================== TEMPLATE TESTS ====================

    @Nested
    @DisplayName("Template Generation Tests")
    class TemplateTests {

        @Test
        @DisplayName("Should generate enrollment import template successfully")
        void generateEnrollmentImportTemplate() {
            // Arrange
            when(classSectionRepository.findBySemesterCode("SP2024"))
                    .thenReturn(List.of(testClassSection));

            // Act
            byte[] template = classSectionService.getEnrollmentImportTemplate("SP2024");

            // Assert
            assertNotNull(template);
            assertTrue(template.length > 0);
        }

        @Test
        @DisplayName("Should generate template even when no class sections exist")
        void generateTemplateWithNoClassSections() {
            // Arrange
            when(classSectionRepository.findBySemesterCode("SP2024"))
                    .thenReturn(new ArrayList<>());

            // Act
            byte[] template = classSectionService.getEnrollmentImportTemplate("SP2024");

            // Assert
            assertNotNull(template);
            assertTrue(template.length > 0);
        }
    }

    // ==================== HELPER METHODS ====================

    private MultipartFile createExcelFile(Object[][] data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Enrollments");
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
                    "enrollments.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray());
        }
    }
}
