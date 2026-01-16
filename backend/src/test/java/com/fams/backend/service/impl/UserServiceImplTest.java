package com.fams.backend.service.impl;

import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.dto.response.UserResponse;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.ImportJobRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.EmailService;
import com.fams.backend.service.UploadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import com.fams.backend.entity.ImportJob;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private UploadService uploadService;
    @Mock
    private EmailService emailService;
    @Mock
    private SystemLogService systemLogService;
    @Mock
    private ImportJobRepository importJobRepository;
    @Mock
    private AsyncImportService asyncImportService;

    @InjectMocks
    private UserServiceImpl userService;

    private User activeUser;
    private User inactiveUser;
    private UserRequest userRequest;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .id(1L)
                .fullName("Nguyễn Văn A")
                .email("test@example.com")
                .code("SE123456")
                .username("SE123456")
                .role(User.UserRole.STUDENT)
                .status(User.UserStatus.ACTIVE)
                .dob(LocalDate.of(2000, 1, 15))
                .build();

        inactiveUser = User.builder()
                .id(2L)
                .fullName("Trần Thị B")
                .email("inactive@example.com")
                .code("SE654321")
                .role(User.UserRole.LECTURER)
                .status(User.UserStatus.INACTIVE)
                .dob(LocalDate.of(1995, 5, 20))
                .build();

        userRequest = new UserRequest();
        userRequest.setFullName("Nguyễn Văn A");
        userRequest.setEmail("newuser@example.com");
        userRequest.setCode("SE999999");
        userRequest.setRole(User.UserRole.STUDENT);
        userRequest.setDob(LocalDate.of(2000, 1, 15));

        // Mock Security Context
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication authentication = mock(Authentication.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("admin");
        SecurityContextHolder.setContext(securityContext);

        ReflectionTestUtils.setField(userService, "asyncImportService", asyncImportService);
    }

    // ==================== FE-22: getAllUsers() ====================
    @Nested
    @DisplayName("FE-22: getAllUsers() Tests")
    class GetAllUsersTests {

        private Pageable pageable;

        @BeforeEach
        void setUpPagination() {
            pageable = PageRequest.of(0, 10);
        }

        @Test
        @DisplayName("UTCID01 (Normal): userRepo.findAll returns 10 users")
        void getAllUsers_Returns10Users_Success() {
            List<User> users = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                users.add(User.builder().id((long) i).fullName("User " + i).email("user" + i + "@test.com").build());
            }
            Page<User> page = new PageImpl<>(users, pageable, 10);
            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);

            Page<UserResponse> result = userService.getAllUsers(null, null, null, pageable);

            assertNotNull(result);
            assertEquals(10, result.getTotalElements());
            verify(userRepository).findAll(any(Specification.class), eq(pageable));
        }

        @Test
        @DisplayName("UTCID02 (Boundary): userRepo.findAll returns Empty Page")
        void getAllUsers_ReturnsEmptyPage() {
            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(Page.empty());

            Page<UserResponse> result = userService.getAllUsers(null, null, null, pageable);

            assertNotNull(result);
            assertEquals(0, result.getTotalElements());
            assertTrue(result.getContent().isEmpty());
            verify(userRepository).findAll(any(Specification.class), eq(pageable));
        }

        @Test
        @DisplayName("UTCID03 (Normal): Filter by ACTIVE status")
        void getAllUsers_FilterByActiveStatus() {
            Page<User> page = new PageImpl<>(List.of(activeUser), pageable, 1);
            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);

            Page<UserResponse> result = userService.getAllUsers(null, null, "ACTIVE", pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
            verify(userRepository).findAll(any(Specification.class), eq(pageable));
        }

        @Test
        @DisplayName("UTCID04 (Normal): Filter by Role STUDENT")
        void getAllUsers_FilterByRoleStudent() {
            Page<User> page = new PageImpl<>(List.of(activeUser), pageable, 1);
            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);

            Page<UserResponse> result = userService.getAllUsers(null, "STUDENT", null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
            verify(userRepository).findAll(any(Specification.class), eq(pageable));
        }

        @Test
        @DisplayName("UTCID05 (Normal): Search 'Nguyen'")
        void getAllUsers_SearchNguyen() {
            User nguyen = User.builder().id(1L).fullName("Nguyen Van A").email("nguyen@test.com").build();
            Page<User> page = new PageImpl<>(List.of(nguyen), pageable, 1);
            when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);

            Page<UserResponse> result = userService.getAllUsers("Nguyen", null, null, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
            verify(userRepository).findAll(any(Specification.class), eq(pageable));
        }

        @Test
        @DisplayName("UTCID06 (Abnormal): userRepo.findAll throws Persistence Exception")
        void getAllUsers_ThrowsPersistenceException() {
            when(userRepository.findAll(any(Specification.class), eq(pageable)))
                    .thenThrow(new RuntimeException("Database error"));

            assertThrows(RuntimeException.class, () -> userService.getAllUsers(null, null, null, pageable));
            verify(userRepository).findAll(any(Specification.class), eq(pageable));
        }
    }

    // ==================== FE-23: getUserById() ====================
    @Nested
    @DisplayName("FE-23: getUserById() Tests")
    class GetUserByIdTests {

        @Test
        @DisplayName("UTCID01 (Normal): userRepo.findById returns User - Valid ID = 1")
        void getUserById_ValidId_ReturnsUser() {
            // Mock: userRepo.findById(id) returns User
            when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));

            // Input: Valid ID = 1
            UserResponse result = userService.getUserById(1L);

            // Confirm: Return UserResponse
            assertNotNull(result);
            assertEquals(activeUser.getId(), result.getId());
        }

        @Test
        @DisplayName("UTCID02 (Abnormal): userRepo.findById returns Empty - Invalid ID = 999")
        void getUserById_InvalidId_ThrowsNotFoundException() {
            // Mock: userRepo.findById(id) returns Empty
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Input: Invalid ID = 999
            // Confirm: Throw NotFoundException with message
            NotFoundException ex = assertThrows(NotFoundException.class,
                    () -> userService.getUserById(999L));
            assertTrue(ex.getMessage().contains("999"));
        }

        @Test
        @DisplayName("UTCID03 (Abnormal): Input null - Throw NotFoundException")
        void getUserById_NullId_ThrowsNotFoundException() {
            // Mock: findById(null) returns Empty
            when(userRepository.findById(null)).thenReturn(Optional.empty());

            // Input: null
            // Confirm: Throw NotFoundException
            assertThrows(NotFoundException.class, () -> userService.getUserById(null));
        }

        @Test
        @DisplayName("UTCID04 (Abnormal): Negative ID = -1 - Throw NotFoundException")
        void getUserById_NegativeId_ThrowsNotFoundException() {
            // Mock: findById(-1) returns Empty
            when(userRepository.findById(-1L)).thenReturn(Optional.empty());

            // Input: Negative ID = -1
            // Confirm: Throw NotFoundException
            assertThrows(NotFoundException.class, () -> userService.getUserById(-1L));
        }

        @Test
        @DisplayName("UTCID05 (Abnormal): Repository throws Timeout Exception - Valid ID = 1")
        void getUserById_TimeoutException_ThrowsRuntimeException() {
            // Mock: Repository throws Timeout Exception
            when(userRepository.findById(1L)).thenThrow(new RuntimeException("Timeout"));

            // Input: Valid ID = 1
            // Confirm: Throw RuntimeException
            assertThrows(RuntimeException.class, () -> userService.getUserById(1L));
        }
    }

    // ==================== FE-24: createUser() ====================
    @Nested
    @DisplayName("FE-24: createUser() Tests")
    class CreateUserTests {

        @Test
        @DisplayName("UTCID01 (Normal): Create with avatar - uploadService returns URL")
        void createUser_WithAvatar_Success() {
            // Mock: existsByEmail=false, existsByCode=false, uploadFile returns URL
            MultipartFile avatar = mock(MultipartFile.class);
            when(avatar.isEmpty()).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.existsByCode(anyString())).thenReturn(false);
            when(uploadService.uploadFile(avatar)).thenReturn("http://avatar.url/img.jpg");
            when(userRepository.save(any(User.class))).thenReturn(activeUser);

            // Input: Valid UserRequest, avatar exists
            UserResponse result = userService.createUser(userRequest, avatar);

            // Confirm: Call save, logUserCreated, uploadFile
            assertNotNull(result);
            verify(userRepository).save(any(User.class));
            verify(systemLogService).logUserCreated(eq("admin"), any(), any());
            verify(uploadService).uploadFile(avatar);
        }

        @Test
        @DisplayName("UTCID02 (Normal): Create without avatar - avatar is null")
        void createUser_WithoutAvatar_Success() {
            // Mock: existsByEmail=false, existsByCode=false
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.existsByCode(anyString())).thenReturn(false);
            when(userRepository.save(any(User.class))).thenReturn(activeUser);

            // Input: Valid UserRequest, avatar is null
            UserResponse result = userService.createUser(userRequest, null);

            // Confirm: Call save, logUserCreated
            assertNotNull(result);
            verify(userRepository).save(any(User.class));
            verify(systemLogService).logUserCreated(eq("admin"), any(), any());
        }

        @Test
        @DisplayName("UTCID03 (Abnormal): existsByEmail returns true - Throw BadRequestException")
        void createUser_EmailExists_ThrowsBadRequest() {
            // Mock: existsByEmail returns true
            when(userRepository.existsByEmail(userRequest.getEmail())).thenReturn(true);

            // Input: Valid UserRequest
            // Confirm: Throw BadRequestException
            assertThrows(BadRequestException.class, () -> userService.createUser(userRequest, null));
        }

        @Test
        @DisplayName("UTCID04 (Abnormal): existsByCode returns true - Throw BadRequestException")
        void createUser_CodeExists_ThrowsBadRequest() {
            // Mock: existsByEmail=false, existsByCode returns true
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.existsByCode(userRequest.getCode())).thenReturn(true);

            // Input: Valid UserRequest
            // Confirm: Throw BadRequestException
            assertThrows(BadRequestException.class, () -> userService.createUser(userRequest, null));
        }
    }

    // ==================== FE-25: updateUser() ====================
    @Nested
    @DisplayName("FE-25: updateUser() Tests")
    class UpdateUserTests {

        @Test
        @DisplayName("UTCID01 (Abnormal): userRepo.findById returns Empty - Throw NotFoundException")
        void updateUser_NotFound_ThrowsNotFoundException() {
            // Mock: findById returns Empty
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Confirm: Throw NotFoundException
            assertThrows(NotFoundException.class, () -> userService.updateUser(999L, userRequest, null));
        }

        @Test
        @DisplayName("UTCID02 (Normal): Update with avatar - uploadService called")
        void updateUser_WithAvatar_Success() {
            // Mock: findById returns User, existsByEmail=false
            MultipartFile avatar = mock(MultipartFile.class);
            when(avatar.isEmpty()).thenReturn(false);
            when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(uploadService.uploadFile(avatar)).thenReturn("new_url");
            when(userRepository.save(any(User.class))).thenReturn(activeUser);

            // Confirm: uploadFile and save called
            userService.updateUser(1L, userRequest, avatar);

            verify(uploadService).uploadFile(avatar);
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("UTCID03 (Abnormal): existsByEmail returns true for different user - Throw BadRequestException")
        void updateUser_EmailExists_ThrowsBadRequest() {
            // Mock: findById returns User, existsByEmail returns true (different user)
            userRequest.setEmail("other@example.com");
            activeUser.setEmail("original@example.com");
            when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));
            when(userRepository.existsByEmail("other@example.com")).thenReturn(true);

            // Confirm: Throw BadRequestException
            assertThrows(BadRequestException.class, () -> userService.updateUser(1L, userRequest, null));
        }

        @Test
        @DisplayName("UTCID04 (Normal): Update without avatar - save called")
        void updateUser_WithoutAvatar_Success() {
            // Mock: findById returns User, existsByEmail=false
            when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.save(any(User.class))).thenReturn(activeUser);

            userService.updateUser(1L, userRequest, null);

            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("UTCID05 (Normal): Update status to LOCKED")
        void updateUser_BlockAccount_Success() {
            // Mock: findById returns User, existsByEmail=false
            userRequest.setStatus(User.UserStatus.LOCKED);
            when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.save(any(User.class))).thenReturn(activeUser);

            userService.updateUser(1L, userRequest, null);

            assertEquals(User.UserStatus.LOCKED, activeUser.getStatus());
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("UTCID06 (Normal): existsByEmail=false - Update all fields")
        void updateUser_AllFields_Success() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(activeUser));
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.save(any(User.class))).thenReturn(activeUser);

            userService.updateUser(1L, userRequest, null);

            verify(userRepository).save(any(User.class));
        }
    }

    // ==================== FE-26: deleteUser() ====================
    @Nested
    @DisplayName("FE-26: deleteUser() Tests")
    class DeleteUserTests {

        @Test
        @DisplayName("UTCID01 (Normal): existsById=true, Valid ID=1 - Delete success")
        void deleteUser_ValidId_Success() {
            // Mock: existsById returns True
            when(userRepository.existsById(1L)).thenReturn(true);

            // Input: Valid ID = 1
            userService.deleteUser(1L);

            // Confirm: deleteById called
            verify(userRepository).deleteById(1L);
        }

        @Test
        @DisplayName("UTCID02 (Abnormal): existsById=false - Throw NotFoundException")
        void deleteUser_NotFound_ThrowsNotFoundException() {
            // Mock: existsById returns False
            when(userRepository.existsById(999L)).thenReturn(false);

            // Confirm: Throw NotFoundException
            assertThrows(NotFoundException.class, () -> userService.deleteUser(999L));
        }

        @Test
        @DisplayName("UTCID03 (Abnormal): deleteById throws Data Error")
        void deleteUser_DataError_ThrowsException() {
            // Mock: existsById=true, deleteById throws error
            when(userRepository.existsById(1L)).thenReturn(true);
            doThrow(new RuntimeException("Data integrity violation")).when(userRepository).deleteById(1L);

            // Confirm: Throw RuntimeException
            assertThrows(RuntimeException.class, () -> userService.deleteUser(1L));
        }

        @Test
        @DisplayName("UTCID04 (Boundary): Admin self-delete attempt")
        void deleteUser_AdminSelfDelete_Exists() {
            // Mock: existsById returns True (admin ID)
            when(userRepository.existsById(1L)).thenReturn(true);

            // Note: Current implementation doesn't check self-delete
            // This test verifies the call goes through
            userService.deleteUser(1L);

            verify(userRepository).deleteById(1L);
        }
    }

    // ==================== FE-27: activateUsers() ====================
    @Nested
    @DisplayName("FE-27: activateUsers() Tests")
    class ActivateUsersTests {

        @Test
        @DisplayName("UTCID01 (Normal): userRepo.findAllById returns 3 INACTIVE users")
        void activateUsers_3InactiveUsers_Success() {
            // Mock: findAllById returns 3 INACTIVE users, passwordEncoder.encode success
            User user1 = User.builder().id(1L).fullName("User One").code("U001").email("u1@test.com")
                    .status(User.UserStatus.INACTIVE).dob(LocalDate.of(2000, 1, 1)).build();
            User user2 = User.builder().id(2L).fullName("User Two").code("U002").email("u2@test.com")
                    .status(User.UserStatus.INACTIVE).dob(LocalDate.of(2000, 2, 2)).build();
            User user3 = User.builder().id(3L).fullName("User Three").code("U003").email("u3@test.com")
                    .status(User.UserStatus.INACTIVE).dob(LocalDate.of(2000, 3, 3)).build();
            List<User> users = List.of(user1, user2, user3);

            when(userRepository.findAllById(anyList())).thenReturn(users);
            when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");

            userService.activateUsers(List.of(1L, 2L, 3L));

            // Confirm: set status to ACTIVE, generate password, call saveAll
            assertEquals(User.UserStatus.ACTIVE, user1.getStatus());
            assertEquals(User.UserStatus.ACTIVE, user2.getStatus());
            assertEquals(User.UserStatus.ACTIVE, user3.getStatus());
            verify(emailService, times(3)).sendAccountInfo(any(), any(), any(), any());
            verify(passwordEncoder, times(3)).encode(anyString());
            verify(userRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("UTCID02 (Boundary): userRepo.findAllById returns 0 users")
        void activateUsers_EmptyList_NoAction() {
            // Mock: findAllById returns 0 users
            when(userRepository.findAllById(anyList())).thenReturn(List.of());

            userService.activateUsers(List.of(999L));

            // Confirm: no email sent, saveAll still called with empty list
            verify(emailService, never()).sendAccountInfo(any(), any(), any(), any());
            verify(userRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("UTCID03 (Boundary): userRepo.findAllById returns ACTIVE users - Skip")
        void activateUsers_AlreadyActive_Skips() {
            // Mock: findAllById returns ACTIVE users
            List<User> users = List.of(activeUser);
            when(userRepository.findAllById(anyList())).thenReturn(users);

            userService.activateUsers(List.of(1L));

            // Confirm: no email, no password generation for already active users
            verify(emailService, never()).sendAccountInfo(any(), any(), any(), any());
        }

        @Test
        @DisplayName("UTCID04 (Abnormal): emailService.sendAccountInfo throws error")
        void activateUsers_EmailServiceThrows_StillSaves() {
            // Mock: findAllById returns INACTIVE, email throws error
            when(userRepository.findAllById(anyList())).thenReturn(List.of(inactiveUser));
            when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");
            doThrow(new RuntimeException("Email error")).when(emailService).sendAccountInfo(any(), any(), any(), any());

            // Confirm: throws exception (email error propagates)
            assertThrows(RuntimeException.class, () -> userService.activateUsers(List.of(2L)));

            // Status should still be set to ACTIVE before email was called
            assertEquals(User.UserStatus.ACTIVE, inactiveUser.getStatus());
            verify(passwordEncoder).encode(anyString());
        }
    }

    // ==================== FE-33: updateMyProfile() ====================
    @Nested
    @DisplayName("FE-33: updateMyProfile() Tests")
    class UpdateMyProfileTests {

        @Test
        @DisplayName("UTCID01 (Normal): ACADEMIC_STAFF user - Avatar upload allowed")
        void updateMyProfile_AcademicStaff_WithAvatar_Success() {
            // Mock: User is ACADEMIC_STAFF
            User staff = User.builder()
                    .id(10L)
                    .username("staff01")
                    .role(User.UserRole.ACADEMIC_STAFF)
                    .build();
            com.fams.backend.dto.request.UpdateProfileRequest request = new com.fams.backend.dto.request.UpdateProfileRequest();
            request.setPhone("0123456789");
            request.setDob(LocalDate.of(1990, 5, 15));

            MultipartFile avatar = mock(MultipartFile.class);
            when(avatar.isEmpty()).thenReturn(false);

            when(userRepository.findByUsername("staff01")).thenReturn(Optional.of(staff));
            when(uploadService.uploadFile(avatar)).thenReturn("http://avatar.url/staff.jpg");
            when(userRepository.save(any(User.class))).thenReturn(staff);

            // Input: UpdateProfileRequest with Phone/DOB, Avatar file
            userService.updateMyProfile("staff01", request, avatar);

            // Confirm: uploadService.uploadFile called (Staff can upload)
            verify(uploadService).uploadFile(avatar);
            // Confirm: userRepo.save called
            verify(userRepository).save(any(User.class));
            // Confirm: Avatar URL set
            assertEquals("http://avatar.url/staff.jpg", staff.getAvatar());
        }

        @Test
        @DisplayName("UTCID02 (Boundary): STUDENT user - Avatar upload skipped")
        void updateMyProfile_Student_AvatarSkipped() {
            // Mock: User is STUDENT
            User student = User.builder()
                    .id(20L)
                    .username("student01")
                    .role(User.UserRole.STUDENT)
                    .build();
            com.fams.backend.dto.request.UpdateProfileRequest request = new com.fams.backend.dto.request.UpdateProfileRequest();
            request.setPhone("0987654321");
            request.setDob(LocalDate.of(2000, 1, 10));

            MultipartFile avatar = mock(MultipartFile.class);

            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(student));
            when(userRepository.save(any(User.class))).thenReturn(student);

            // Input: UpdateProfileRequest with Phone/DOB, Avatar file
            userService.updateMyProfile("student01", request, avatar);

            // Confirm: uploadService.uploadFile NOT called (Student cannot upload)
            verify(uploadService, never()).uploadFile(any());
            // Confirm: userRepo.save called
            verify(userRepository).save(any(User.class));
            // Confirm: Avatar remains null
            assertNull(student.getAvatar());
        }
    }

    // ==================== FE-30: importZipAsync() & getImportJobStatus()
    // ====================
    @Nested
    @DisplayName("FE-30: Async Import Job Tests")
    class AsyncImportJobTests {

        @Test
        @DisplayName("UTCID01 (Normal): No active job - Create job success")
        void importZipAsync_Success() {
            when(importJobRepository.existsByStatusIn(anyList())).thenReturn(false);
            byte[] bytes = "test content".getBytes();
            String filename = "test.zip";

            String result = userService.importZipAsync(bytes, filename, "APPEND");

            assertNotNull(result);
            verify(importJobRepository).save(any(ImportJob.class));
            verify(asyncImportService).processZipImportAsync(eq(result), eq(bytes), eq(filename), eq("APPEND"),
                    anyString());
        }

        @Test
        @DisplayName("UTCID02 (Abnormal): Active job exists - Throw BadRequestException")
        void importZipAsync_ActiveJobExists_ThrowsException() {
            when(importJobRepository.existsByStatusIn(anyList())).thenReturn(true);
            byte[] bytes = "test content".getBytes();

            assertThrows(BadRequestException.class, () -> userService.importZipAsync(bytes, "test.zip", "APPEND"));
        }

        @Test
        @DisplayName("UTCID03 (Abnormal): Repo save fails - Throw Exception")
        void importZipAsync_SaveFails_ThrowsException() {
            when(importJobRepository.existsByStatusIn(anyList())).thenReturn(false);
            when(importJobRepository.save(any())).thenThrow(new RuntimeException("DB error"));
            byte[] bytes = "test content".getBytes();

            assertThrows(RuntimeException.class, () -> userService.importZipAsync(bytes, "test.zip", "APPEND"));
        }

        @Test
        @DisplayName("UTCID04 (Boundary): getImportJobStatus - Job Found")
        void getImportJobStatus_Success() {
            String jobId = "uuid-123";
            ImportJob job = ImportJob.builder()
                    .jobId(jobId)
                    .type(ImportJob.ImportType.ZIP_FULL)
                    .status(ImportJob.JobStatus.PROCESSING)
                    .processedRecords(10)
                    .totalRecords(100)
                    .build();
            when(importJobRepository.findByJobId(jobId)).thenReturn(Optional.of(job));

            com.fams.backend.dto.response.ImportJobResponse result = userService.getImportJobStatus(jobId);

            assertNotNull(result);
            assertEquals(jobId, result.getJobId());
            assertEquals("PROCESSING", result.getStatus());
        }

        @Test
        @DisplayName("UTCID05 (Abnormal): getImportJobStatus - Job Not Found")
        void getImportJobStatus_NotFound() {
            String jobId = "non-existent";
            when(importJobRepository.findByJobId(jobId)).thenReturn(Optional.empty());

            assertThrows(NotFoundException.class, () -> userService.getImportJobStatus(jobId));
        }
    }

    // ==================== cleanupStuckJobs() ====================
    @Nested
    @DisplayName("Cleanup Stuck Jobs Tests")
    class CleanupStuckJobsTests {

        @Test
        @DisplayName("UTCID01 (Normal): Found 3 stuck jobs - Cancel all")
        void cleanupStuckJobs_Success() {
            ImportJob job1 = ImportJob.builder().status(ImportJob.JobStatus.PENDING).build();
            ImportJob job2 = ImportJob.builder().status(ImportJob.JobStatus.PROCESSING).build();
            List<ImportJob> stuckJobs = Arrays.asList(job1, job2);
            when(importJobRepository.findByStatusIn(anyList())).thenReturn(stuckJobs);

            userService.cleanupStuckJobs();

            assertEquals(ImportJob.JobStatus.CANCELLED, job1.getStatus());
            assertEquals(ImportJob.JobStatus.CANCELLED, job2.getStatus());
            assertNotNull(job1.getCompletedAt());
            verify(importJobRepository).saveAll(stuckJobs);
        }

        @Test
        @DisplayName("UTCID02 (Boundary): No stuck jobs found")
        void cleanupStuckJobs_NoStuckJobs() {
            when(importJobRepository.findByStatusIn(anyList())).thenReturn(Collections.emptyList());

            userService.cleanupStuckJobs();

            verify(importJobRepository).saveAll(Collections.emptyList());
        }

        @Test
        @DisplayName("UTCID03 (Abnormal): Repository update fails")
        void cleanupStuckJobs_UpdateFails_ThrowsException() {
            ImportJob job1 = ImportJob.builder().status(ImportJob.JobStatus.PENDING).build();
            when(importJobRepository.findByStatusIn(anyList())).thenReturn(List.of(job1));
            when(importJobRepository.saveAll(anyList())).thenThrow(new RuntimeException("DB error"));

            assertThrows(RuntimeException.class, () -> userService.cleanupStuckJobs());
        }
    }

    // ==================== previewImportFile() ====================
    @Nested
    @DisplayName("Preview Import Tests")
    class PreviewImportTests {

        @Test
        @DisplayName("UTCID01 (Normal): Valid Excel with 5 rows")
        void previewImportFile_ValidExcel_Success() throws Exception {
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet();
                Row header = sheet.createRow(0);
                header.createCell(0).setCellValue("Full Name");
                header.createCell(1).setCellValue("Code");
                header.createCell(4).setCellValue("Email");

                for (int i = 1; i <= 5; i++) {
                    Row row = sheet.createRow(i);
                    row.createCell(0).setCellValue("User " + i);
                    row.createCell(1).setCellValue("CODE" + i);
                    row.createCell(4).setCellValue("user" + i + "@test.com");
                }

                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                workbook.write(bos);
                byte[] content = bos.toByteArray();
                MultipartFile file = new MockMultipartFile("users.xlsx", "users.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content);

                when(userRepository.findAllCodes()).thenReturn(Collections.emptySet());
                when(userRepository.findAllEmails()).thenReturn(Collections.emptySet());

                com.fams.backend.dto.response.PreviewImportResponse result = userService.previewImportFile(file);

                assertNotNull(result);
                assertEquals(5, result.getTotalRows());
                assertEquals(5, result.getValidRows());
                assertEquals(0, result.getErrorRows());
                assertEquals("valid", result.getPreviewData().get(0).getStatus());
            }
        }

        @Test
        @DisplayName("UTCID02 (Abnormal): Excel with missing code/email")
        void previewImportFile_MissingRequiredFields_Error() throws Exception {
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet();
                sheet.createRow(0); // Header
                Row row1 = sheet.createRow(1);
                row1.createCell(0).setCellValue("User 1");

                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                workbook.write(bos);
                MultipartFile file = new MockMultipartFile("users.xlsx", "users.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bos.toByteArray());

                com.fams.backend.dto.response.PreviewImportResponse result = userService.previewImportFile(file);

                assertNotNull(result);
                assertEquals(1, result.getTotalRows());
                assertEquals(1, result.getErrorRows());
                assertEquals("error", result.getPreviewData().get(0).getStatus());
                assertTrue(result.getPreviewData().get(0).getErrorMessage().contains("Thiếu mã số"));
            }
        }

        @Test
        @DisplayName("UTCID03 (Abnormal): Excel with invalid email format")
        void previewImportFile_InvalidEmailFormat() {
            // Placeholder for UTCID03
        }

        @Test
        @DisplayName("UTCID04 (Abnormal): Duplicate codes in file")
        void previewImportFile_DuplicateCodesInFile() throws Exception {
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet();
                sheet.createRow(0); // Header
                Row row1 = sheet.createRow(1);
                row1.createCell(1).setCellValue("CODE1");
                row1.createCell(4).setCellValue("user1@test.com");
                Row row2 = sheet.createRow(2);
                row2.createCell(1).setCellValue("CODE1");
                row2.createCell(4).setCellValue("user2@test.com");

                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                workbook.write(bos);
                MultipartFile file = new MockMultipartFile("users.xlsx", "users.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bos.toByteArray());

                when(userRepository.findAllCodes()).thenReturn(Collections.emptySet());
                when(userRepository.findAllEmails()).thenReturn(Collections.emptySet());

                com.fams.backend.dto.response.PreviewImportResponse result = userService.previewImportFile(file);

                assertEquals(2, result.getTotalRows());
                assertEquals(1, result.getErrorRows());
                assertEquals("error", result.getPreviewData().get(1).getStatus());
                assertTrue(result.getPreviewData().get(1).getErrorMessage().contains("trùng lặp trong file"));
            }
        }

        @Test
        @DisplayName("UTCID05 (Abnormal): Existing code in system")
        void previewImportFile_ExistingCodeInSystem() throws Exception {
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet();
                sheet.createRow(0); // Header
                Row row1 = sheet.createRow(1);
                row1.createCell(1).setCellValue("EXISTING");
                row1.createCell(4).setCellValue("user@test.com");

                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                workbook.write(bos);
                MultipartFile file = new MockMultipartFile("users.xlsx", "users.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bos.toByteArray());

                when(userRepository.findAllCodes()).thenReturn(Set.of("EXISTING"));
                when(userRepository.findAllEmails()).thenReturn(Collections.emptySet());

                com.fams.backend.dto.response.PreviewImportResponse result = userService.previewImportFile(file);

                assertEquals(1, result.getTotalRows());
                assertEquals(1, result.getErrorRows());
                assertEquals("error", result.getPreviewData().get(0).getStatus());
                assertTrue(result.getPreviewData().get(0).getErrorMessage().contains("đã tồn tại"));
            }
        }
    }
}
