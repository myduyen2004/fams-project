package com.fams.backend.service.impl;

import com.fams.backend.dto.StudentImportDTO;
import com.fams.backend.dto.request.StudentUpdateRequest;
import com.fams.backend.dto.response.StudentResponse;
import com.fams.backend.entity.*;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.*;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit Tests for StudentServiceImpl
 * Covers: getAllStudents, getStudentById, updateStudent,
 *         exportStudents, previewImportStudents, saveImportedStudents, importStudents
 */
@ExtendWith(MockitoExtension.class)
class StudentServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private MajorRepository majorRepository;

    @Mock
    private SpecializationRepository specializationRepository;

    @Mock
    private SubSpecializationRepository subSpecializationRepository;

    @Mock
    private SystemLogService systemLogService;

    @InjectMocks
    private StudentServiceImpl studentService;

    private User studentUser;
    private User lecturerUser;
    private StudentProfile studentProfile;
    private Major major;
    private Specialization specialization;
    private SubSpecialization subSpecialization;

    @BeforeEach
    void setUp() {
        major = new Major();
        major.setId(1L);
        major.setName("Software Engineering");
        major.setCode("SE");

        specialization = new Specialization();
        specialization.setId(1L);
        specialization.setName("Web Development");
        specialization.setCode("WD");
        specialization.setMajor(major);

        subSpecialization = new SubSpecialization();
        subSpecialization.setId(1L);
        subSpecialization.setName("Full Stack");
        subSpecialization.setCode("FS");
        subSpecialization.setSpecialization(specialization);

        studentUser = new User();
        studentUser.setId(1L);
        studentUser.setCode("SE170001");
        studentUser.setUsername("student01");
        studentUser.setFullName("Nguyen Van A");
        studentUser.setEmail("anv@fpt.edu.vn");
        studentUser.setPhone("0901234567");
        studentUser.setRole(User.UserRole.STUDENT);
        studentUser.setStatus(User.UserStatus.ACTIVE);

        studentProfile = StudentProfile.builder()
                .userId(1L)
                .user(studentUser)
                .major(major)
                .specialization(specialization)
                .subSpecialization(subSpecialization)
                .course("K17")
                .gpa(3.5)
                .build();
        studentUser.setStudentProfile(studentProfile);

        lecturerUser = new User();
        lecturerUser.setId(2L);
        lecturerUser.setRole(User.UserRole.LECTURER);
    }

    // ==================== getAllStudents ====================
    @Nested
    @DisplayName("getAllStudents()")
    class GetAllStudentsTests {

        @Test
        @DisplayName("UTCID01 - Normal: Returns paginated students with no filters")
        void getAllStudents_success_noFilters() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(studentUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(studentProfileRepository.findAllById(List.of(1L))).thenReturn(List.of(studentProfile));

            Page<StudentResponse> result = studentService.getAllStudents(null, null, null, null, null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
            assertEquals("SE170001", result.getContent().get(0).getCode());
            assertEquals("Nguyen Van A", result.getContent().get(0).getFullName());
        }

        @Test
        @DisplayName("UTCID02 - Normal: Returns students filtered by search keyword")
        void getAllStudents_success_withSearchFilter() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(studentUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(studentProfileRepository.findAllById(List.of(1L))).thenReturn(List.of(studentProfile));

            Page<StudentResponse> result = studentService.getAllStudents("Nguyen", null, null, null, null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("UTCID03 - Normal: Returns empty page when no match")
        void getAllStudents_success_emptyResult() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> emptyPage = new PageImpl<>(List.of(), pageable, 0);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(emptyPage);

            Page<StudentResponse> result = studentService.getAllStudents("nonexistent", null, null, null, null, pageable);

            assertNotNull(result);
            assertEquals(0, result.getTotalElements());
        }

        @Test
        @DisplayName("UTCID04 - Normal: Returns students filtered by status ACTIVE")
        void getAllStudents_withStatusFilter() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(studentUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(studentProfileRepository.findAllById(List.of(1L))).thenReturn(List.of(studentProfile));

            Page<StudentResponse> result = studentService.getAllStudents(null, "ACTIVE", null, null, null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("UTCID05 - Boundary: INACTIVE status filter returns empty")
        void getAllStudents_inactiveStatusFilter() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> emptyPage = new PageImpl<>(List.of(), pageable, 0);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(emptyPage);

            Page<StudentResponse> result = studentService.getAllStudents(null, "INACTIVE", null, null, null, pageable);

            assertNotNull(result);
            assertEquals(0, result.getTotalElements());
        }

        @Test
        @DisplayName("UTCID06 - Boundary: Students without profile")
        void getAllStudents_studentsWithoutProfile() {
            User userNoProfile = new User();
            userNoProfile.setId(3L);
            userNoProfile.setCode("SE170003");
            userNoProfile.setFullName("No Profile Student");
            userNoProfile.setEmail("np@fpt.edu.vn");
            userNoProfile.setRole(User.UserRole.STUDENT);
            userNoProfile.setStatus(User.UserStatus.ACTIVE);

            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(userNoProfile), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(studentProfileRepository.findAllById(List.of(3L))).thenReturn(List.of());

            Page<StudentResponse> result = studentService.getAllStudents(null, null, null, null, null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
            assertNull(result.getContent().get(0).getMajor());
        }

        @Test
        @DisplayName("UTCID07 - Abnormal: Invalid status string handled gracefully")
        void getAllStudents_invalidStatusFilter() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(studentUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(studentProfileRepository.findAllById(List.of(1L))).thenReturn(List.of(studentProfile));

            Page<StudentResponse> result = studentService.getAllStudents(null, "INVALID_STATUS", null, null, null, pageable);

            assertNotNull(result);
        }
    }

    // ==================== getStudentById ====================
    @Nested
    @DisplayName("getStudentById()")
    class GetStudentByIdTests {

        @Test
        @DisplayName("UTCID01 - Normal: Found student returns StudentResponse")
        void getStudentById_success() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(studentUser));
            when(studentProfileRepository.findById(1L)).thenReturn(Optional.of(studentProfile));

            StudentResponse result = studentService.getStudentById(1L);

            assertNotNull(result);
            assertEquals(1L, result.getId());
            assertEquals("SE170001", result.getCode());
            assertEquals("Nguyen Van A", result.getFullName());
            assertEquals("Software Engineering", result.getMajor());
            assertEquals(3.5, result.getGpa());
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: ID not found throws NotFoundException")
        void getStudentById_notFound() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(NotFoundException.class, () -> studentService.getStudentById(999L));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Null ID throws IllegalArgumentException")
        void getStudentById_nullId() {
            assertThrows(IllegalArgumentException.class, () -> studentService.getStudentById(null));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: User is not a student throws NotFoundException")
        void getStudentById_notAStudent() {
            when(userRepository.findById(2L)).thenReturn(Optional.of(lecturerUser));

            assertThrows(NotFoundException.class, () -> studentService.getStudentById(2L));
        }

        @Test
        @DisplayName("UTCID05 - Boundary: Student without profile returns null profile fields")
        void getStudentById_noProfile() {
            User userNoProfile = new User();
            userNoProfile.setId(3L);
            userNoProfile.setCode("SE170003");
            userNoProfile.setFullName("No Profile Student");
            userNoProfile.setEmail("np@fpt.edu.vn");
            userNoProfile.setRole(User.UserRole.STUDENT);
            userNoProfile.setStatus(User.UserStatus.ACTIVE);

            when(userRepository.findById(3L)).thenReturn(Optional.of(userNoProfile));
            when(studentProfileRepository.findById(3L)).thenReturn(Optional.empty());

            StudentResponse result = studentService.getStudentById(3L);

            assertNotNull(result);
            assertEquals("SE170003", result.getCode());
            assertNull(result.getMajor());
            assertNull(result.getGpa());
        }
    }

    // ==================== updateStudent ====================
    @Nested
    @DisplayName("updateStudent()")
    class UpdateStudentTests {

        @Test
        @DisplayName("UTCID01 - Normal: Update fullName, phone, dob successfully")
        void updateStudent_success_basicFields() {
            StudentUpdateRequest request = StudentUpdateRequest.builder()
                    .fullName("Nguyen Van B")
                    .phone("0999999999")
                    .build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(studentUser));
            when(userRepository.save(any(User.class))).thenReturn(studentUser);

            StudentResponse result = studentService.updateStudent(1L, request, null);

            assertNotNull(result);
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("UTCID02 - Normal: Update major/specialization/subSpecialization successfully")
        void updateStudent_success_academicFields() {
            // Clear existing academic fields to ensure change is detected
            studentProfile.setMajor(null);
            studentProfile.setSpecialization(null);
            studentProfile.setSubSpecialization(null);

            StudentUpdateRequest request = StudentUpdateRequest.builder()
                    .major("Software Engineering")
                    .specialization("Web Development")
                    .subSpecialization("Full Stack")
                    .build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(studentUser));
            when(majorRepository.findByName("Software Engineering")).thenReturn(Optional.of(major));
            when(specializationRepository.findByNameAndMajor("Web Development", major))
                    .thenReturn(Optional.of(specialization));
            when(subSpecializationRepository.findByNameAndSpecialization("Full Stack", specialization))
                    .thenReturn(Optional.of(subSpecialization));
            when(userRepository.save(any(User.class))).thenReturn(studentUser);

            StudentResponse result = studentService.updateStudent(1L, request, null);

            assertNotNull(result);
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Null ID throws BadRequestException")
        void updateStudent_nullId() {
            StudentUpdateRequest request = StudentUpdateRequest.builder().fullName("Test").build();

            assertThrows(BadRequestException.class, () -> studentService.updateStudent(null, request, null));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: Student not found throws NotFoundException")
        void updateStudent_studentNotFound() {
            StudentUpdateRequest request = StudentUpdateRequest.builder().fullName("Test").build();
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(NotFoundException.class, () -> studentService.updateStudent(999L, request, null));
        }

        @Test
        @DisplayName("UTCID05 - Abnormal: User is not a student throws NotFoundException")
        void updateStudent_notAStudent() {
            StudentUpdateRequest request = StudentUpdateRequest.builder().fullName("Test").build();
            when(userRepository.findById(2L)).thenReturn(Optional.of(lecturerUser));

            assertThrows(NotFoundException.class, () -> studentService.updateStudent(2L, request, null));
        }

        @Test
        @DisplayName("UTCID06 - Abnormal: Invalid major throws BadRequestException")
        void updateStudent_invalidMajor() {
            StudentUpdateRequest request = StudentUpdateRequest.builder()
                    .major("Nonexistent Major")
                    .build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(studentUser));
            when(majorRepository.findByName("Nonexistent Major")).thenReturn(Optional.empty());

            assertThrows(BadRequestException.class, () -> studentService.updateStudent(1L, request, null));
        }

        @Test
        @DisplayName("UTCID07 - Abnormal: Specialization without major throws BadRequestException")
        void updateStudent_specWithoutMajor() {
            // Clear existing major & spec first
            studentProfile.setMajor(null);
            studentProfile.setSpecialization(null);

            StudentUpdateRequest request = StudentUpdateRequest.builder()
                    .major("")
                    .specialization("Web Development")
                    .build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(studentUser));

            assertThrows(BadRequestException.class, () -> studentService.updateStudent(1L, request, null));
        }

        @Test
        @DisplayName("UTCID08 - Boundary: No changes detected, save skipped")
        void updateStudent_noChanges() {
            StudentUpdateRequest request = StudentUpdateRequest.builder()
                    .fullName("Nguyen Van A") // same as existing
                    .build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(studentUser));

            StudentResponse result = studentService.updateStudent(1L, request, null);

            assertNotNull(result);
            verify(userRepository, never()).save(any(User.class));
        }
    }

    // ==================== exportStudents ====================
    @Nested
    @DisplayName("exportStudents()")
    class ExportStudentsTests {

        @Test
        @DisplayName("UTCID01 - Normal: Export all students returns valid byte array")
        void exportStudents_success() {
            studentUser.setStudentProfile(studentProfile);
            when(userRepository.findAllStudentsWithProfiles()).thenReturn(List.of(studentUser));

            byte[] result = studentService.exportStudents(null, null, null, null);

            assertNotNull(result);
            assertTrue(result.length > 0);
            verify(systemLogService).logStudentExported();
        }

        @Test
        @DisplayName("UTCID02 - Normal: Export with status filter")
        void exportStudents_withStatusFilter() {
            studentUser.setStudentProfile(studentProfile);
            when(userRepository.findAllStudentsWithProfiles()).thenReturn(List.of(studentUser));

            byte[] result = studentService.exportStudents(null, null, null, "ACTIVE");

            assertNotNull(result);
            assertTrue(result.length > 0);
        }

        @Test
        @DisplayName("UTCID03 - Normal: Export with major filter")
        void exportStudents_withMajorFilter() {
            studentUser.setStudentProfile(studentProfile);
            when(userRepository.findAllStudentsWithProfiles()).thenReturn(List.of(studentUser));

            byte[] result = studentService.exportStudents("Software Engineering", null, null, null);

            assertNotNull(result);
            assertTrue(result.length > 0);
        }

        @Test
        @DisplayName("UTCID04 - Boundary: Export with no students returns header-only Excel")
        void exportStudents_emptyData() {
            when(userRepository.findAllStudentsWithProfiles()).thenReturn(List.of());

            byte[] result = studentService.exportStudents(null, null, null, null);

            assertNotNull(result);
            assertTrue(result.length > 0);
        }

        @Test
        @DisplayName("UTCID05 - Normal: Export filters out non-matching status")
        void exportStudents_statusFilterExcludes() {
            studentUser.setStudentProfile(studentProfile);
            when(userRepository.findAllStudentsWithProfiles()).thenReturn(List.of(studentUser));

            byte[] result = studentService.exportStudents(null, null, null, "LOCKED");

            assertNotNull(result);
            // Should still return a valid Excel file (just header, no data rows)
        }
    }

    // ==================== previewImportStudents ====================
    @Nested
    @DisplayName("previewImportStudents()")
    class PreviewImportStudentsTests {

        private MultipartFile createExcelFile(String[][] data) throws Exception {
            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet("Students");

            // Header row
            Row headerRow = sheet.createRow(0);
            String[] headers = {"STT", "Mã SV", "Họ và tên", "Email", "Số điện thoại", "Ngành", "Chuyên ngành", "Combo", "Khóa", "GPA"};
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

            // Data rows
            for (int r = 0; r < data.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < data[r].length; c++) {
                    if (data[r][c] != null) {
                        row.createCell(c).setCellValue(data[r][c]);
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
            return new MockMultipartFile("file", "students.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }

        @Test
        @DisplayName("UTCID01 - Normal: Valid student code found and validated")
        void previewImport_success() throws Exception {
            String[][] data = {{"1", "SE170001", "Nguyen Van A", "anv@fpt.edu.vn", "0901234567", "Software Engineering", "", "", "K17", "3.5"}};
            MultipartFile file = createExcelFile(data);

            when(userRepository.findByCodeInIgnoreCase(anyCollection())).thenReturn(List.of(studentUser));
            when(majorRepository.findAll()).thenReturn(List.of(major));
            when(specializationRepository.findAll()).thenReturn(List.of(specialization));
            when(subSpecializationRepository.findAll()).thenReturn(List.of(subSpecialization));

            List<StudentImportDTO> result = studentService.previewImportStudents(file);

            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("VALID", result.get(0).getStatus());
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: Student code not found in DB")
        void previewImport_codeNotFound() throws Exception {
            String[][] data = {{"1", "UNKNOWN01", "", "", "", "", "", "", "", ""}};
            MultipartFile file = createExcelFile(data);

            when(userRepository.findByCodeInIgnoreCase(anyCollection())).thenReturn(List.of());
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());
            when(subSpecializationRepository.findAll()).thenReturn(List.of());

            List<StudentImportDTO> result = studentService.previewImportStudents(file);

            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Không tìm thấy"));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Duplicate code in file")
        void previewImport_duplicateCode() throws Exception {
            String[][] data = {
                    {"1", "SE170001", "Nguyen Van A", "anv@fpt.edu.vn", "", "", "", "", "", ""},
                    {"2", "SE170001", "Duplicate", "dup@fpt.edu.vn", "", "", "", "", "", ""}
            };
            MultipartFile file = createExcelFile(data);

            when(userRepository.findByCodeInIgnoreCase(anyCollection())).thenReturn(List.of(studentUser));
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());
            when(subSpecializationRepository.findAll()).thenReturn(List.of());

            List<StudentImportDTO> result = studentService.previewImportStudents(file);

            assertEquals(2, result.size());
            assertEquals("ERROR", result.get(1).getStatus());
            assertTrue(result.get(1).getErrorMessage().contains("trùng"));
        }

        @Test
        @DisplayName("UTCID04 - Boundary: Empty file returns empty list")
        void previewImport_emptyFile() throws Exception {
            String[][] data = {};
            MultipartFile file = createExcelFile(data);

            List<StudentImportDTO> result = studentService.previewImportStudents(file);

            assertNotNull(result);
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("UTCID05 - Abnormal: Invalid major in file")
        void previewImport_invalidMajor() throws Exception {
            String[][] data = {{"1", "SE170001", "Nguyen Van A", "anv@fpt.edu.vn", "0901234567", "Nonexistent Major", "", "", "K17", "3.5"}};
            MultipartFile file = createExcelFile(data);

            when(userRepository.findByCodeInIgnoreCase(anyCollection())).thenReturn(List.of(studentUser));
            when(majorRepository.findAll()).thenReturn(List.of(major));
            when(specializationRepository.findAll()).thenReturn(List.of());
            when(subSpecializationRepository.findAll()).thenReturn(List.of());

            List<StudentImportDTO> result = studentService.previewImportStudents(file);

            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Ngành học không tồn tại"));
        }

        @Test
        @DisplayName("UTCID06 - Abnormal: User is not a student")
        void previewImport_notAStudent() throws Exception {
            String[][] data = {{"1", "LEC001", "", "", "", "", "", "", "", ""}};
            MultipartFile file = createExcelFile(data);

            lecturerUser.setCode("LEC001");
            when(userRepository.findByCodeInIgnoreCase(anyCollection())).thenReturn(List.of(lecturerUser));
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());
            when(subSpecializationRepository.findAll()).thenReturn(List.of());

            List<StudentImportDTO> result = studentService.previewImportStudents(file);

            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("không phải là Sinh viên"));
        }

        @Test
        @DisplayName("UTCID07 - Abnormal: Name mismatch between Excel and DB")
        void previewImport_nameMismatch() throws Exception {
            String[][] data = {{"1", "SE170001", "Wrong Name", "anv@fpt.edu.vn", "0901234567", "", "", "", "", ""}};
            MultipartFile file = createExcelFile(data);

            when(userRepository.findByCodeInIgnoreCase(anyCollection())).thenReturn(List.of(studentUser));
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());
            when(subSpecializationRepository.findAll()).thenReturn(List.of());

            List<StudentImportDTO> result = studentService.previewImportStudents(file);

            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Tên không trùng khớp"));
        }
    }

    // ==================== saveImportedStudents ====================
    @Nested
    @DisplayName("saveImportedStudents()")
    class SaveImportedStudentsTests {

        @Test
        @DisplayName("UTCID01 - Normal: Save new student profile successfully")
        void saveImported_createNewProfile() {
            User userNoProfile = new User();
            userNoProfile.setId(3L);
            userNoProfile.setCode("SE170003");
            userNoProfile.setRole(User.UserRole.STUDENT);

            StudentImportDTO dto = StudentImportDTO.builder()
                    .rowNumber(2)
                    .code("SE170003")
                    .major("Software Engineering")
                    .course("K17")
                    .gpa(3.5)
                    .status("VALID")
                    .build();

            when(userRepository.findByCodeInIgnoreCase(anyList())).thenReturn(List.of(userNoProfile));
            when(studentProfileRepository.findAllById(anyList())).thenReturn(List.of());
            when(majorRepository.findAll()).thenReturn(List.of(major));
            when(specializationRepository.findAll()).thenReturn(List.of(specialization));
            when(subSpecializationRepository.findAll()).thenReturn(List.of(subSpecialization));
            when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(i -> i.getArguments()[0]);

            Map<String, Object> result = studentService.saveImportedStudents(List.of(dto));

            assertEquals(1, result.get("created"));
            assertEquals(0, result.get("updated"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID02 - Normal: Update existing student profile successfully")
        void saveImported_updateExistingProfile() {
            StudentImportDTO dto = StudentImportDTO.builder()
                    .rowNumber(2)
                    .code("SE170001")
                    .major("Software Engineering")
                    .course("K18")
                    .gpa(3.8)
                    .status("VALID")
                    .build();

            when(userRepository.findByCodeInIgnoreCase(anyList())).thenReturn(List.of(studentUser));
            when(studentProfileRepository.findAllById(anyList())).thenReturn(List.of(studentProfile));
            when(majorRepository.findAll()).thenReturn(List.of(major));
            when(specializationRepository.findAll()).thenReturn(List.of(specialization));
            when(subSpecializationRepository.findAll()).thenReturn(List.of(subSpecialization));

            Map<String, Object> result = studentService.saveImportedStudents(List.of(dto));

            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("updated"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Skip ERROR status DTOs")
        void saveImported_skipErrors() {
            StudentImportDTO errorDto = StudentImportDTO.builder()
                    .rowNumber(2)
                    .code("UNKNOWN")
                    .status("ERROR")
                    .errorMessage("Không tìm thấy")
                    .build();

            Map<String, Object> result = studentService.saveImportedStudents(List.of(errorDto));

            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("updated"));
            assertEquals(1, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID04 - Boundary: Empty list returns zeros")
        void saveImported_emptyList() {
            Map<String, Object> result = studentService.saveImportedStudents(List.of());

            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("updated"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID05 - Abnormal: User not found during save")
        void saveImported_userNotFoundDuringSave() {
            StudentImportDTO dto = StudentImportDTO.builder()
                    .rowNumber(2)
                    .code("MISSING01")
                    .status("VALID")
                    .build();

            when(userRepository.findByCodeInIgnoreCase(anyList())).thenReturn(List.of());
            when(studentProfileRepository.findAllById(anyList())).thenReturn(List.of());
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());
            when(subSpecializationRepository.findAll()).thenReturn(List.of());

            Map<String, Object> result = studentService.saveImportedStudents(List.of(dto));

            assertEquals(1, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID06 - Boundary: No field changes detected, not counted as update")
        void saveImported_noChanges() {
            StudentImportDTO dto = StudentImportDTO.builder()
                    .rowNumber(2)
                    .code("SE170001")
                    .major("Software Engineering")
                    .specialization("Web Development")
                    .subSpecialization("Full Stack")
                    .course("K17")
                    .gpa(3.5)
                    .status("VALID")
                    .build();

            when(userRepository.findByCodeInIgnoreCase(anyList())).thenReturn(List.of(studentUser));
            when(studentProfileRepository.findAllById(anyList())).thenReturn(List.of(studentProfile));
            when(majorRepository.findAll()).thenReturn(List.of(major));
            when(specializationRepository.findAll()).thenReturn(List.of(specialization));
            when(subSpecializationRepository.findAll()).thenReturn(List.of(subSpecialization));

            Map<String, Object> result = studentService.saveImportedStudents(List.of(dto));

            // No changes → nothing to update
            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("updated"));
        }
    }

    // ==================== importStudents ====================
    @Nested
    @DisplayName("importStudents()")
    class ImportStudentsTests {

        @Test
        @DisplayName("UTCID01 - Normal: importStudents calls preview then save")
        void importStudents_success() throws Exception {
            // Create a valid Excel file
            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet("Students");
            Row headerRow = sheet.createRow(0);
            String[] headers = {"STT", "Mã SV", "Họ và tên", "Email", "Số điện thoại", "Ngành", "Chuyên ngành", "Combo", "Khóa", "GPA"};
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }
            Row dataRow = sheet.createRow(1);
            dataRow.createCell(1).setCellValue("SE170001");
            dataRow.createCell(2).setCellValue("Nguyen Van A");
            dataRow.createCell(3).setCellValue("anv@fpt.edu.vn");

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
            MultipartFile file = new MockMultipartFile("file", "students.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());

            when(userRepository.findByCodeInIgnoreCase(anyCollection())).thenReturn(List.of(studentUser));
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());
            when(subSpecializationRepository.findAll()).thenReturn(List.of());
            when(studentProfileRepository.findAllById(anyList())).thenReturn(List.of(studentProfile));

            Map<String, Object> result = studentService.importStudents(file);

            assertNotNull(result);
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: Invalid file throws RuntimeException")
        void importStudents_invalidFile() {
            MultipartFile invalidFile = new MockMultipartFile("file", "bad.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "invalid data".getBytes());

            assertThrows(RuntimeException.class, () -> studentService.importStudents(invalidFile));
        }
    }
}
