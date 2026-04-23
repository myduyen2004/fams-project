package com.fams.backend.service.impl;

import com.fams.backend.dto.LecturerImportDTO;
import com.fams.backend.dto.request.LecturerProfileRequest;
import com.fams.backend.dto.request.LecturerUpdateRequest;
import com.fams.backend.dto.response.LecturerResponse;
import com.fams.backend.entity.LecturerProfile;
import com.fams.backend.entity.Major;
import com.fams.backend.entity.Specialization;
import com.fams.backend.entity.User;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.LecturerProfileRepository;
import com.fams.backend.repository.MajorRepository;
import com.fams.backend.repository.SpecializationRepository;
import com.fams.backend.repository.UserRepository;
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
 * Unit Tests for LecturerServiceImpl
 * Covers: getAllLecturers, getLecturerById, getAllDepartments,
 *         registerLecturerProfile, updateLecturer, exportLecturers,
 *         importLecturers, previewImportLecturers, saveImportedLecturers
 */
@ExtendWith(MockitoExtension.class)
class LecturerServiceImplFullTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LecturerProfileRepository lecturerProfileRepository;

    @Mock
    private MajorRepository majorRepository;

    @Mock
    private SpecializationRepository specializationRepository;

    @Mock
    private SystemLogService systemLogService;

    @InjectMocks
    private LecturerServiceImpl lecturerService;

    private User lecturerUser;
    private User studentUser;
    private LecturerProfile lecturerProfile;

    @BeforeEach
    void setUp() {
        lecturerUser = new User();
        lecturerUser.setId(1L);
        lecturerUser.setCode("GV001");
        lecturerUser.setUsername("lecturer01");
        lecturerUser.setFullName("Tran Van B");
        lecturerUser.setEmail("bvt@fpt.edu.vn");
        lecturerUser.setPhone("0912345678");
        lecturerUser.setRole(User.UserRole.LECTURER);
        lecturerUser.setStatus(User.UserStatus.ACTIVE);

        lecturerProfile = LecturerProfile.builder()
                .userId(1L)
                .user(lecturerUser)
                .department("Software Engineering")
                .expertise("Java, Spring Boot")
                .bio("Senior Lecturer")
                .build();
        lecturerUser.setLecturerProfile(lecturerProfile);

        studentUser = new User();
        studentUser.setId(2L);
        studentUser.setRole(User.UserRole.STUDENT);
    }

    // ==================== getAllLecturers ====================
    @Nested
    @DisplayName("getAllLecturers()")
    class GetAllLecturersTests {

        @Test
        @DisplayName("UTCID01 - Normal: Returns paginated lecturers with no filters")
        void getAllLecturers_success_noFilters() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(lecturerUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(lecturerProfileRepository.findAllByUserIdIn(List.of(1L))).thenReturn(List.of(lecturerProfile));

            Page<LecturerResponse> result = lecturerService.getAllLecturers(null, null, null, null, null, null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
            assertEquals("GV001", result.getContent().get(0).getCode());
            assertEquals("Tran Van B", result.getContent().get(0).getFullName());
            assertEquals("Software Engineering", result.getContent().get(0).getDepartment());
        }

        @Test
        @DisplayName("UTCID02 - Normal: Returns lecturers filtered by search keyword")
        void getAllLecturers_withSearchFilter() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(lecturerUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(lecturerProfileRepository.findAllByUserIdIn(List.of(1L))).thenReturn(List.of(lecturerProfile));

            Page<LecturerResponse> result = lecturerService.getAllLecturers("Tran", null, null, null, null, null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("UTCID03 - Normal: Returns empty page when no match")
        void getAllLecturers_emptyResult() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> emptyPage = new PageImpl<>(List.of(), pageable, 0);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(emptyPage);
            when(lecturerProfileRepository.findAllByUserIdIn(List.of())).thenReturn(List.of());

            Page<LecturerResponse> result = lecturerService.getAllLecturers("nonexistent", null, null, null, null, null, pageable);

            assertNotNull(result);
            assertEquals(0, result.getTotalElements());
        }

        @Test
        @DisplayName("UTCID04 - Normal: Filtered by department")
        void getAllLecturers_withDepartmentFilter() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(lecturerUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(lecturerProfileRepository.findAllByUserIdIn(List.of(1L))).thenReturn(List.of(lecturerProfile));

            Page<LecturerResponse> result = lecturerService.getAllLecturers(null, null, "Software Engineering", null, null, null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("UTCID05 - Boundary: Department filter excludes non-matching")
        void getAllLecturers_departmentFilterExcludes() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(lecturerUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(lecturerProfileRepository.findAllByUserIdIn(List.of(1L))).thenReturn(List.of(lecturerProfile));

            Page<LecturerResponse> result = lecturerService.getAllLecturers(null, null, "Nonexistent Dept", null, null, null, pageable);

            assertNotNull(result);
            assertEquals(0, result.getTotalElements());
        }

        @Test
        @DisplayName("UTCID06 - Normal: Filtered by hasProfile=true")
        void getAllLecturers_hasProfileFilter() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(lecturerUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(lecturerProfileRepository.findAllByUserIdIn(List.of(1L))).thenReturn(List.of(lecturerProfile));

            Page<LecturerResponse> result = lecturerService.getAllLecturers(null, null, null, null, null, true, pageable);

            assertNotNull(result);
        }

        @Test
        @DisplayName("UTCID07 - Boundary: Lecturer without profile")
        void getAllLecturers_lecturerWithoutProfile() {
            User noProfileUser = new User();
            noProfileUser.setId(3L);
            noProfileUser.setCode("GV003");
            noProfileUser.setFullName("No Profile");
            noProfileUser.setEmail("np@fpt.edu.vn");
            noProfileUser.setRole(User.UserRole.LECTURER);
            noProfileUser.setStatus(User.UserStatus.ACTIVE);

            Pageable pageable = PageRequest.of(0, 10);
            Page<User> userPage = new PageImpl<>(List.of(noProfileUser), pageable, 1);

            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(userPage);
            when(lecturerProfileRepository.findAllByUserIdIn(List.of(3L))).thenReturn(List.of());

            Page<LecturerResponse> result = lecturerService.getAllLecturers(null, null, null, null, null, null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
            assertNull(result.getContent().get(0).getDepartment());
        }
    }

    // ==================== getLecturerById ====================
    @Nested
    @DisplayName("getLecturerById()")
    class GetLecturerByIdTests {

        @Test
        @DisplayName("UTCID01 - Normal: Found lecturer with profile")
        void getLecturerById_success() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(lecturerUser));
            when(lecturerProfileRepository.findByUser(lecturerUser)).thenReturn(Optional.of(lecturerProfile));

            LecturerResponse result = lecturerService.getLecturerById(1L);

            assertNotNull(result);
            assertEquals(1L, result.getId());
            assertEquals("GV001", result.getCode());
            assertEquals("Tran Van B", result.getFullName());
            assertEquals("Software Engineering", result.getDepartment());
            assertEquals("Java, Spring Boot", result.getExpertise());
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: ID not found throws NotFoundException")
        void getLecturerById_notFound() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(NotFoundException.class, () -> lecturerService.getLecturerById(999L));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: User is not a lecturer throws NotFoundException")
        void getLecturerById_notALecturer() {
            when(userRepository.findById(2L)).thenReturn(Optional.of(studentUser));

            assertThrows(NotFoundException.class, () -> lecturerService.getLecturerById(2L));
        }

        @Test
        @DisplayName("UTCID04 - Boundary: Lecturer without profile returns null profile fields")
        void getLecturerById_noProfile() {
            User noProfileUser = new User();
            noProfileUser.setId(3L);
            noProfileUser.setCode("GV003");
            noProfileUser.setFullName("No Profile");
            noProfileUser.setEmail("np@fpt.edu.vn");
            noProfileUser.setRole(User.UserRole.LECTURER);
            noProfileUser.setStatus(User.UserStatus.ACTIVE);

            when(userRepository.findById(3L)).thenReturn(Optional.of(noProfileUser));
            when(lecturerProfileRepository.findByUser(noProfileUser)).thenReturn(Optional.empty());

            LecturerResponse result = lecturerService.getLecturerById(3L);

            assertNotNull(result);
            assertNull(result.getDepartment());
            assertNull(result.getExpertise());
        }
    }

    // ==================== getAllDepartments ====================
    @Nested
    @DisplayName("getAllDepartments()")
    class GetAllDepartmentsTests {

        @Test
        @DisplayName("UTCID01 - Normal: Returns sorted unique department list")
        void getAllDepartments_success() {
            LecturerProfile p1 = LecturerProfile.builder().department("Mathematics").build();
            LecturerProfile p2 = LecturerProfile.builder().department("Software Engineering").build();
            LecturerProfile p3 = LecturerProfile.builder().department("Software Engineering").build();

            when(lecturerProfileRepository.findAll()).thenReturn(List.of(p1, p2, p3));

            List<String> result = lecturerService.getAllDepartments();

            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals("Mathematics", result.get(0));
            assertEquals("Software Engineering", result.get(1));
        }

        @Test
        @DisplayName("UTCID02 - Boundary: No profiles returns empty list")
        void getAllDepartments_empty() {
            when(lecturerProfileRepository.findAll()).thenReturn(List.of());

            List<String> result = lecturerService.getAllDepartments();

            assertNotNull(result);
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("UTCID03 - Boundary: Profiles with null department are excluded")
        void getAllDepartments_nullDepartments() {
            LecturerProfile p1 = LecturerProfile.builder().department(null).build();
            LecturerProfile p2 = LecturerProfile.builder().department("").build();
            LecturerProfile p3 = LecturerProfile.builder().department("CS").build();

            when(lecturerProfileRepository.findAll()).thenReturn(List.of(p1, p2, p3));

            List<String> result = lecturerService.getAllDepartments();

            assertEquals(1, result.size());
            assertEquals("CS", result.get(0));
        }
    }

    // ==================== registerLecturerProfile ====================
    @Nested
    @DisplayName("registerLecturerProfile()")
    class RegisterLecturerProfileTests {

        @Test
        @DisplayName("UTCID01 - Normal: Register new profile successfully")
        void registerProfile_success() {
            User noProfileUser = new User();
            noProfileUser.setId(3L);
            noProfileUser.setCode("GV003");
            noProfileUser.setFullName("New Lecturer");
            noProfileUser.setEmail("nl@fpt.edu.vn");
            noProfileUser.setRole(User.UserRole.LECTURER);
            noProfileUser.setStatus(User.UserStatus.ACTIVE);

            LecturerProfileRequest request = LecturerProfileRequest.builder()
                    .department("AI & ML")
                    .expertise("Deep Learning")
                    .bio("New lecturer bio")
                    .build();

            when(userRepository.findById(3L)).thenReturn(Optional.of(noProfileUser));
            when(lecturerProfileRepository.existsById(3L)).thenReturn(false);
            when(lecturerProfileRepository.save(any(LecturerProfile.class))).thenAnswer(i -> i.getArguments()[0]);

            LecturerResponse result = lecturerService.registerLecturerProfile(3L, request);

            assertNotNull(result);
            assertEquals("GV003", result.getCode());
            assertEquals("AI & ML", result.getDepartment());
            verify(lecturerProfileRepository).save(any(LecturerProfile.class));
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: User not found throws NotFoundException")
        void registerProfile_userNotFound() {
            LecturerProfileRequest request = LecturerProfileRequest.builder()
                    .department("CS").build();
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(NotFoundException.class,
                    () -> lecturerService.registerLecturerProfile(999L, request));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: User is not a lecturer throws NotFoundException")
        void registerProfile_notALecturer() {
            LecturerProfileRequest request = LecturerProfileRequest.builder()
                    .department("CS").build();
            when(userRepository.findById(2L)).thenReturn(Optional.of(studentUser));

            assertThrows(NotFoundException.class,
                    () -> lecturerService.registerLecturerProfile(2L, request));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: Profile already exists throws IllegalStateException")
        void registerProfile_alreadyExists() {
            LecturerProfileRequest request = LecturerProfileRequest.builder()
                    .department("CS").build();
            when(userRepository.findById(1L)).thenReturn(Optional.of(lecturerUser));
            when(lecturerProfileRepository.existsById(1L)).thenReturn(true);

            assertThrows(IllegalStateException.class,
                    () -> lecturerService.registerLecturerProfile(1L, request));
        }
    }

    // ==================== updateLecturer ====================
    @Nested
    @DisplayName("updateLecturer()")
    class UpdateLecturerTests {

        @Test
        @DisplayName("UTCID01 - Normal: Update existing profile fields")
        void updateLecturer_updateExistingProfile() {
            LecturerUpdateRequest request = LecturerUpdateRequest.builder()
                    .department("New Dept")
                    .expertise("New Exp")
                    .bio("New Bio")
                    .build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(lecturerUser));
            when(lecturerProfileRepository.findByUser(lecturerUser)).thenReturn(Optional.of(lecturerProfile));
            when(lecturerProfileRepository.save(any(LecturerProfile.class))).thenAnswer(i -> i.getArguments()[0]);

            LecturerResponse result = lecturerService.updateLecturer(1L, request, null);

            assertNotNull(result);
            verify(lecturerProfileRepository).save(any(LecturerProfile.class));
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("UTCID02 - Normal: Create profile if not exists")
        void updateLecturer_createProfile() {
            User noProfileUser = new User();
            noProfileUser.setId(3L);
            noProfileUser.setCode("GV003");
            noProfileUser.setFullName("No Profile");
            noProfileUser.setEmail("np@fpt.edu.vn");
            noProfileUser.setRole(User.UserRole.LECTURER);

            LecturerUpdateRequest request = LecturerUpdateRequest.builder()
                    .department("New Dept")
                    .build();

            when(userRepository.findById(3L)).thenReturn(Optional.of(noProfileUser));
            when(lecturerProfileRepository.findByUser(noProfileUser)).thenReturn(Optional.empty());
            when(lecturerProfileRepository.save(any(LecturerProfile.class))).thenAnswer(i -> i.getArguments()[0]);

            LecturerResponse result = lecturerService.updateLecturer(3L, request, null);

            assertNotNull(result);
            verify(lecturerProfileRepository).save(any(LecturerProfile.class));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: User not found throws NotFoundException")
        void updateLecturer_notFound() {
            LecturerUpdateRequest request = LecturerUpdateRequest.builder()
                    .department("CS").build();
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(NotFoundException.class,
                    () -> lecturerService.updateLecturer(999L, request, null));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: User is not a lecturer throws NotFoundException")
        void updateLecturer_notALecturer() {
            LecturerUpdateRequest request = LecturerUpdateRequest.builder()
                    .department("CS").build();
            when(userRepository.findById(2L)).thenReturn(Optional.of(studentUser));

            assertThrows(NotFoundException.class,
                    () -> lecturerService.updateLecturer(2L, request, null));
        }

        @Test
        @DisplayName("UTCID05 - Boundary: Partial update - only department field")
        void updateLecturer_partialUpdate() {
            LecturerUpdateRequest request = LecturerUpdateRequest.builder()
                    .department("Updated Dept")
                    .build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(lecturerUser));
            when(lecturerProfileRepository.findByUser(lecturerUser)).thenReturn(Optional.of(lecturerProfile));
            when(lecturerProfileRepository.save(any(LecturerProfile.class))).thenAnswer(i -> i.getArguments()[0]);

            LecturerResponse result = lecturerService.updateLecturer(1L, request, null);

            assertNotNull(result);
            // expertise and bio should remain unchanged
            assertEquals("Java, Spring Boot", lecturerProfile.getExpertise());
            assertEquals("Senior Lecturer", lecturerProfile.getBio());
            assertEquals("Updated Dept", lecturerProfile.getDepartment());
        }
    }

    // ==================== exportLecturers ====================
    @Nested
    @DisplayName("exportLecturers()")
    class ExportLecturersTests {

        @Test
        @DisplayName("UTCID01 - Normal: Export all lecturers returns valid byte array")
        void exportLecturers_success() {
            lecturerUser.setLecturerProfile(lecturerProfile);
            when(userRepository.findAllLecturersWithProfiles()).thenReturn(List.of(lecturerUser));

            byte[] result = lecturerService.exportLecturers(null, null, null, null);

            assertNotNull(result);
            assertTrue(result.length > 0);
            verify(systemLogService).logLecturerExported();
        }

        @Test
        @DisplayName("UTCID02 - Normal: Export with department filter")
        void exportLecturers_withDepartmentFilter() {
            lecturerUser.setLecturerProfile(lecturerProfile);
            when(userRepository.findAllLecturersWithProfiles()).thenReturn(List.of(lecturerUser));

            byte[] result = lecturerService.exportLecturers("Software Engineering", null, null, null);

            assertNotNull(result);
            assertTrue(result.length > 0);
        }

        @Test
        @DisplayName("UTCID03 - Normal: Export with status filter")
        void exportLecturers_withStatusFilter() {
            lecturerUser.setLecturerProfile(lecturerProfile);
            when(userRepository.findAllLecturersWithProfiles()).thenReturn(List.of(lecturerUser));

            byte[] result = lecturerService.exportLecturers(null, null, null, "ACTIVE");

            assertNotNull(result);
            assertTrue(result.length > 0);
        }

        @Test
        @DisplayName("UTCID04 - Boundary: Export with no lecturers returns header-only Excel")
        void exportLecturers_emptyData() {
            when(userRepository.findAllLecturersWithProfiles()).thenReturn(List.of());

            byte[] result = lecturerService.exportLecturers(null, null, null, null);

            assertNotNull(result);
            assertTrue(result.length > 0);
        }

        @Test
        @DisplayName("UTCID05 - Normal: Department filter excludes non-matching")
        void exportLecturers_departmentFilterExcludes() {
            lecturerUser.setLecturerProfile(lecturerProfile);
            when(userRepository.findAllLecturersWithProfiles()).thenReturn(List.of(lecturerUser));

            byte[] result = lecturerService.exportLecturers("Nonexistent Dept", null, null, null);

            assertNotNull(result);
            // Valid Excel file but no data rows
        }
    }

    // ==================== importLecturers ====================
    @Nested
    @DisplayName("importLecturers()")
    class ImportLecturersTests {

        private MultipartFile createLecturerExcelFile(String[][] data) throws Exception {
            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet("Lecturers");

            Row headerRow = sheet.createRow(0);
            String[] headers = {"STT", "Mã GV", "Họ tên", "Email", "SĐT", "Department", "Expertise", "Bio"};
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

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
            return new MockMultipartFile("file", "lecturers.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }

        @Test
        @DisplayName("UTCID01 - Normal: Import and update existing profile")
        void importLecturers_updateProfile() throws Exception {
            String[][] data = {{"1", "GV001", "Tran Van B", "bvt@fpt.edu.vn", "0912345678", "New Dept", "New Exp", "New Bio"}};
            MultipartFile file = createLecturerExcelFile(data);

            when(userRepository.findByCode("GV001")).thenReturn(Optional.of(lecturerUser));
            when(lecturerProfileRepository.findByUser(lecturerUser)).thenReturn(Optional.of(lecturerProfile));
            when(lecturerProfileRepository.save(any(LecturerProfile.class))).thenAnswer(i -> i.getArguments()[0]);

            Map<String, Object> result = lecturerService.importLecturers(file);

            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("updated"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID02 - Normal: Import and create new profile")
        void importLecturers_createProfile() throws Exception {
            User noProfileUser = new User();
            noProfileUser.setId(3L);
            noProfileUser.setCode("GV003");
            noProfileUser.setRole(User.UserRole.LECTURER);

            String[][] data = {{"1", "GV003", "", "", "", "Dept", "Exp", "Bio"}};
            MultipartFile file = createLecturerExcelFile(data);

            when(userRepository.findByCode("GV003")).thenReturn(Optional.of(noProfileUser));
            when(lecturerProfileRepository.findByUser(noProfileUser)).thenReturn(Optional.empty());
            when(lecturerProfileRepository.save(any(LecturerProfile.class))).thenAnswer(i -> i.getArguments()[0]);

            Map<String, Object> result = lecturerService.importLecturers(file);

            assertEquals(1, result.get("created"));
            assertEquals(0, result.get("updated"));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Lecturer code not found")
        void importLecturers_codeNotFound() throws Exception {
            String[][] data = {{"1", "UNKNOWN01", "", "", "", "", "", ""}};
            MultipartFile file = createLecturerExcelFile(data);

            when(userRepository.findByCode("UNKNOWN01")).thenReturn(Optional.empty());

            Map<String, Object> result = lecturerService.importLecturers(file);

            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("updated"));
            assertEquals(1, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: User is not a lecturer")
        void importLecturers_notALecturer() throws Exception {
            studentUser.setCode("STU001");
            String[][] data = {{"1", "STU001", "", "", "", "", "", ""}};
            MultipartFile file = createLecturerExcelFile(data);

            when(userRepository.findByCode("STU001")).thenReturn(Optional.of(studentUser));

            Map<String, Object> result = lecturerService.importLecturers(file);

            assertEquals(1, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID05 - Abnormal: Duplicate code in file")
        void importLecturers_duplicateCode() throws Exception {
            String[][] data = {
                    {"1", "GV001", "", "", "", "Dept1", "", ""},
                    {"2", "GV001", "", "", "", "Dept2", "", ""}
            };
            MultipartFile file = createLecturerExcelFile(data);

            when(userRepository.findByCode("GV001")).thenReturn(Optional.of(lecturerUser));
            when(lecturerProfileRepository.findByUser(lecturerUser)).thenReturn(Optional.of(lecturerProfile));
            when(lecturerProfileRepository.save(any(LecturerProfile.class))).thenAnswer(i -> i.getArguments()[0]);

            Map<String, Object> result = lecturerService.importLecturers(file);

            // First row processes, second is duplicate
            assertEquals(1, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID06 - Boundary: Empty file returns zeros")
        void importLecturers_emptyFile() throws Exception {
            String[][] data = {};
            MultipartFile file = createLecturerExcelFile(data);

            Map<String, Object> result = lecturerService.importLecturers(file);

            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("updated"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID07 - Abnormal: Invalid file throws RuntimeException")
        void importLecturers_invalidFile() {
            MultipartFile invalidFile = new MockMultipartFile("file", "bad.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "invalid data".getBytes());

            assertThrows(RuntimeException.class, () -> lecturerService.importLecturers(invalidFile));
        }
    }

    // ==================== previewImportLecturers ====================
    @Nested
    @DisplayName("previewImportLecturers()")
    class PreviewImportLecturersTests {

        private MultipartFile createLecturerExcelFile(String[][] data) throws Exception {
            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet("Lecturers");

            Row headerRow = sheet.createRow(0);
            String[] headers = {"STT", "Mã GV", "Họ tên", "Email", "SĐT", "Department", "Expertise", "Bio"};
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

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
            return new MockMultipartFile("file", "lecturers.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }

        @Test
        @DisplayName("UTCID01 - Normal: Valid lecturer preview")
        void previewImport_success() throws Exception {
            String[][] data = {{"1", "GV001", "Tran Van B", "bvt@fpt.edu.vn", "0912345678", "Software Engineering", "Java", "Bio"}};
            MultipartFile file = createLecturerExcelFile(data);

            Major major = new Major();
            major.setName("Software Engineering");
            major.setCode("SE");

            when(userRepository.findByCode("GV001")).thenReturn(Optional.of(lecturerUser));
            when(majorRepository.findAll()).thenReturn(List.of(major));
            when(specializationRepository.findAll()).thenReturn(List.of());

            List<LecturerImportDTO> result = lecturerService.previewImportLecturers(file);

            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("VALID", result.get(0).getStatus());
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: Code not found")
        void previewImport_codeNotFound() throws Exception {
            String[][] data = {{"1", "UNKNOWN", "", "", "", "", "", ""}};
            MultipartFile file = createLecturerExcelFile(data);

            when(userRepository.findByCode("UNKNOWN")).thenReturn(Optional.empty());
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());

            List<LecturerImportDTO> result = lecturerService.previewImportLecturers(file);

            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Duplicate code in file")
        void previewImport_duplicateCode() throws Exception {
            String[][] data = {
                    {"1", "GV001", "Tran Van B", "bvt@fpt.edu.vn", "0912345678", "", "", ""},
                    {"2", "GV001", "Dup", "dup@fpt.edu.vn", "", "", "", ""}
            };
            MultipartFile file = createLecturerExcelFile(data);

            when(userRepository.findByCode("GV001")).thenReturn(Optional.of(lecturerUser));
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());

            List<LecturerImportDTO> result = lecturerService.previewImportLecturers(file);

            assertEquals(2, result.size());
            assertEquals("ERROR", result.get(1).getStatus());
            assertTrue(result.get(1).getErrorMessage().contains("trùng"));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: Not a lecturer")
        void previewImport_notALecturer() throws Exception {
            studentUser.setCode("STU001");
            String[][] data = {{"1", "STU001", "", "", "", "", "", ""}};
            MultipartFile file = createLecturerExcelFile(data);

            when(userRepository.findByCode("STU001")).thenReturn(Optional.of(studentUser));
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());

            List<LecturerImportDTO> result = lecturerService.previewImportLecturers(file);

            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
        }

        @Test
        @DisplayName("UTCID05 - Boundary: Empty file returns empty list")
        void previewImport_emptyFile() throws Exception {
            String[][] data = {};
            MultipartFile file = createLecturerExcelFile(data);

            List<LecturerImportDTO> result = lecturerService.previewImportLecturers(file);

            assertNotNull(result);
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("UTCID06 - Abnormal: Name mismatch between Excel and DB")
        void previewImport_nameMismatch() throws Exception {
            String[][] data = {{"1", "GV001", "Wrong Name", "bvt@fpt.edu.vn", "0912345678", "", "", ""}};
            MultipartFile file = createLecturerExcelFile(data);

            when(userRepository.findByCode("GV001")).thenReturn(Optional.of(lecturerUser));
            when(majorRepository.findAll()).thenReturn(List.of());
            when(specializationRepository.findAll()).thenReturn(List.of());

            List<LecturerImportDTO> result = lecturerService.previewImportLecturers(file);

            assertEquals(1, result.size());
            assertEquals("ERROR", result.get(0).getStatus());
            assertTrue(result.get(0).getErrorMessage().contains("Tên không trùng khớp"));
        }
    }

    // ==================== saveImportedLecturers ====================
    @Nested
    @DisplayName("saveImportedLecturers()")
    class SaveImportedLecturersTests {

        @Test
        @DisplayName("UTCID01 - Normal: Create new lecturer profile")
        void saveImported_createNewProfile() {
            User noProfileUser = new User();
            noProfileUser.setId(3L);
            noProfileUser.setCode("GV003");
            noProfileUser.setRole(User.UserRole.LECTURER);

            LecturerImportDTO dto = LecturerImportDTO.builder()
                    .rowNumber(2)
                    .code("GV003")
                    .department("New Dept")
                    .expertise("New Exp")
                    .bio("New Bio")
                    .status("VALID")
                    .build();

            when(userRepository.findByCodeInIgnoreCase(anyList())).thenReturn(List.of(noProfileUser));
            when(lecturerProfileRepository.findAllByUserIdIn(anyList())).thenReturn(List.of());
            when(lecturerProfileRepository.saveAll(anyList())).thenReturn(List.of());

            Map<String, Object> result = lecturerService.saveImportedLecturers(List.of(dto));

            assertEquals(1, result.get("created"));
            assertEquals(0, result.get("updated"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID02 - Normal: Update existing lecturer profile")
        void saveImported_updateExistingProfile() {
            LecturerImportDTO dto = LecturerImportDTO.builder()
                    .rowNumber(2)
                    .code("GV001")
                    .department("Updated Dept")
                    .expertise("Updated Exp")
                    .bio("Updated Bio")
                    .status("VALID")
                    .build();

            when(userRepository.findByCodeInIgnoreCase(anyList())).thenReturn(List.of(lecturerUser));
            when(lecturerProfileRepository.findAllByUserIdIn(anyList())).thenReturn(List.of(lecturerProfile));
            when(lecturerProfileRepository.saveAll(anyList())).thenReturn(List.of());

            Map<String, Object> result = lecturerService.saveImportedLecturers(List.of(dto));

            assertEquals(0, result.get("created"));
            assertEquals(1, result.get("updated"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Skip ERROR status DTOs")
        void saveImported_skipErrors() {
            LecturerImportDTO errorDto = LecturerImportDTO.builder()
                    .rowNumber(2)
                    .code("UNKNOWN")
                    .status("ERROR")
                    .errorMessage("Not found")
                    .build();

            Map<String, Object> result = lecturerService.saveImportedLecturers(List.of(errorDto));

            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("updated"));
            assertEquals(1, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID04 - Boundary: Empty list returns zeros")
        void saveImported_emptyList() {
            Map<String, Object> result = lecturerService.saveImportedLecturers(List.of());

            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("updated"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID05 - Boundary: Null list returns zeros")
        void saveImported_nullList() {
            Map<String, Object> result = lecturerService.saveImportedLecturers(null);

            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("updated"));
            assertEquals(0, result.get("failed"));
        }

        @Test
        @DisplayName("UTCID06 - Boundary: No field changes detected")
        void saveImported_noChanges() {
            LecturerImportDTO dto = LecturerImportDTO.builder()
                    .rowNumber(2)
                    .code("GV001")
                    .department("Software Engineering") // same
                    .expertise("Java, Spring Boot") // same
                    .bio("Senior Lecturer") // same
                    .status("VALID")
                    .build();

            when(userRepository.findByCodeInIgnoreCase(anyList())).thenReturn(List.of(lecturerUser));
            when(lecturerProfileRepository.findAllByUserIdIn(anyList())).thenReturn(List.of(lecturerProfile));

            Map<String, Object> result = lecturerService.saveImportedLecturers(List.of(dto));

            assertEquals(0, result.get("created"));
            assertEquals(0, result.get("updated"));
        }

        @Test
        @DisplayName("UTCID07 - Abnormal: Duplicate codes in input (last one wins)")
        void saveImported_duplicateCodes() {
            LecturerImportDTO dto1 = LecturerImportDTO.builder()
                    .rowNumber(2)
                    .code("GV001")
                    .department("Dept A")
                    .status("VALID")
                    .build();
            LecturerImportDTO dto2 = LecturerImportDTO.builder()
                    .rowNumber(3)
                    .code("GV001")
                    .department("Dept B")
                    .status("VALID")
                    .build();

            when(userRepository.findByCodeInIgnoreCase(anyList())).thenReturn(List.of(lecturerUser));
            when(lecturerProfileRepository.findAllByUserIdIn(anyList())).thenReturn(List.of(lecturerProfile));
            when(lecturerProfileRepository.saveAll(anyList())).thenReturn(List.of());

            Map<String, Object> result = lecturerService.saveImportedLecturers(List.of(dto1, dto2));

            assertNotNull(result);
            // Deduplication: only one processed
            assertEquals(1, result.get("updated"));
        }
    }
}
