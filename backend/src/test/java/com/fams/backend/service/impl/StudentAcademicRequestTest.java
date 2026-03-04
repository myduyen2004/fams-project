package com.fams.backend.service.impl;

import com.fams.backend.dto.request.CreateAcademicRequestDTO;
import com.fams.backend.dto.response.AcademicRequestResponse;
import com.fams.backend.entity.*;
import com.fams.backend.entity.AcademicRequest.AcademicRequestType;
import com.fams.backend.entity.AcademicRequest.DeadlineRule;
import com.fams.backend.entity.AcademicRequest.RequestStatus;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.repository.*;
import com.fams.backend.service.NotificationService;
import com.fams.backend.service.UploadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: Chức năng Sinh viên tạo đơn yêu cầu (Student Academic Request)")
public class StudentAcademicRequestTest {

    @Mock
    private AcademicRequestRepository academicRequestRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SemesterRepository semesterRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private ClassSectionRepository classSectionRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private UploadService uploadService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private StudentProfileRepository studentProfileRepository;

    @InjectMocks
    private AcademicRequestServiceImpl academicRequestService;

    private User student;
    private Semester semester;
    private CreateAcademicRequestDTO createDTO;

    @BeforeEach
    void setUp() {
        student = User.builder()
                .id(1L)
                .fullName("Nguyen Van Sinh Vien")
                .code("SE123456")
                .role(User.UserRole.STUDENT)
                .build();

        semester = new Semester();
        semester.setId(1L);
        semester.setCode("SU24");
        semester.setStartDate(LocalDate.now().plusWeeks(10)); // Distant future to avoid deadline issues in tests

        createDTO = CreateAcademicRequestDTO.builder()
                .requestType(AcademicRequestType.CHANGE_MAJOR)
                .semesterId(1L)
                .toMajor("Software Engineering")
                .reason("Em muốn học code")
                .build();
    }

    @Nested
    @DisplayName("Tests cho chức năng Tạo yêu cầu (Create Request)")
    class CreateRequestTests {

        @Test
        @DisplayName("Nên tạo yêu cầu thành công khi dữ liệu hợp lệ")
        void createRequest_Success() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(student));
            when(semesterRepository.findById(1L)).thenReturn(Optional.of(semester));
            when(semesterRepository.findUpcomingSemesters()).thenReturn(java.util.Collections.singletonList(semester));
            when(academicRequestRepository.existsPendingRequest(any(), any(), any())).thenReturn(false);

            AcademicRequest savedRequest = AcademicRequest.builder()
                    .id(100L)
                    .student(student)
                    .requestType(AcademicRequestType.CHANGE_MAJOR)
                    .status(RequestStatus.PENDING)
                    .build();
            when(academicRequestRepository.save(any(AcademicRequest.class))).thenReturn(savedRequest);

            // Act
            AcademicRequestResponse response = academicRequestService.createRequest(createDTO, null, 1L);

            // Assert
            assertNotNull(response);
            assertEquals("PENDING", response.getStatus());
            assertEquals(student.getCode(), response.getStudentCode());
            verify(academicRequestRepository).save(any(AcademicRequest.class));
            verify(notificationService).notifyAcademicStaffNewRequest(any());
        }

        @Test
        @DisplayName("Nên ném lỗi BadRequestException khi sinh viên không tồn tại")
        void createRequest_StudentNotFound() {
            // Arrange
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            // Act & Assert
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> academicRequestService.createRequest(createDTO, null, 99L));
            assertEquals("Student not found", exception.getMessage());
        }

        @Test
        @DisplayName("Nên ném lỗi khi người tạo không phải là STUDENT")
        void createRequest_InvalidRole() {
            // Arrange
            student.setRole(User.UserRole.LECTURER);
            when(userRepository.findById(1L)).thenReturn(Optional.of(student));

            // Act & Assert
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> academicRequestService.createRequest(createDTO, null, 1L));
            assertEquals("Only students can create academic requests", exception.getMessage());
        }

        @Test
        @DisplayName("Nên ném lỗi khi đã có yêu cầu cùng loại đang chờ xử lý")
        void createRequest_DuplicatePending() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(student));
            when(semesterRepository.findById(1L)).thenReturn(Optional.of(semester));
            when(semesterRepository.findUpcomingSemesters()).thenReturn(java.util.Collections.singletonList(semester));
            when(academicRequestRepository.existsPendingRequest(1L, AcademicRequestType.CHANGE_MAJOR, 1L))
                    .thenReturn(true);

            // Act & Assert
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> academicRequestService.createRequest(createDTO, null, 1L));
            assertEquals("You already have a pending request of this type for this semester", exception.getMessage());
        }

        @Test
        @DisplayName("Nên ném lỗi khi quá hạn nộp đơn (Deadline passed)")
        void createRequest_PastDeadline() {
            // Arrange
            semester.setStartDate(LocalDate.now().minusWeeks(10)); // Semester started long ago
            when(userRepository.findById(1L)).thenReturn(Optional.of(student));
            when(semesterRepository.findById(1L)).thenReturn(Optional.of(semester));
            // Rule for CHANGE_MAJOR is 5TB (5 weeks before)
            // If semester starts in 2 weeks, and rule is 5 weeks before, deadline is
            // already passed

            when(semesterRepository.findUpcomingSemesters()).thenReturn(java.util.Collections.singletonList(semester));

            // Act & Assert
            assertThrows(BadRequestException.class,
                    () -> academicRequestService.createRequest(createDTO, null, 1L));
        }
    }

    @Nested
    @DisplayName("Tests cho chức năng Hủy yêu cầu (Cancel Request)")
    class CancelRequestTests {

        @Test
        @DisplayName("Nên hủy thành công khi đơn đang ở trạng thái PENDING")
        void cancelRequest_Success() {
            // Arrange
            AcademicRequest request = AcademicRequest.builder()
                    .id(100L)
                    .student(student)
                    .requestType(AcademicRequestType.OTHERS)
                    .status(RequestStatus.PENDING)
                    .build();
            when(academicRequestRepository.findById(100L)).thenReturn(Optional.of(request));
            when(academicRequestRepository.save(any(AcademicRequest.class))).thenReturn(request);

            // Act
            AcademicRequestResponse response = academicRequestService.cancelRequest(100L, 1L);

            // Assert
            assertEquals("CANCELLED", response.getStatus());
            verify(academicRequestRepository).save(request);
        }

        @Test
        @DisplayName("Nên ném lỗi khi hủy đơn không phải của mình")
        void cancelRequest_WrongOwner() {
            // Arrange
            AcademicRequest request = AcademicRequest.builder()
                    .id(100L)
                    .student(User.builder().id(2L).build()) // Different student
                    .status(RequestStatus.PENDING)
                    .build();
            when(academicRequestRepository.findById(100L)).thenReturn(Optional.of(request));

            // Act & Assert
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> academicRequestService.cancelRequest(100L, 1L));
            assertEquals("You can only cancel your own requests", exception.getMessage());
        }

        @Test
        @DisplayName("Nên ném lỗi khi đơn đã được xử lý (APPROVED/REJECTED)")
        void cancelRequest_AlreadyProcessed() {
            // Arrange
            AcademicRequest request = AcademicRequest.builder()
                    .id(100L)
                    .student(student)
                    .status(RequestStatus.APPROVED)
                    .build();
            when(academicRequestRepository.findById(100L)).thenReturn(Optional.of(request));

            // Act & Assert
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> academicRequestService.cancelRequest(100L, 1L));
            assertEquals("Only pending requests can be cancelled", exception.getMessage());
        }
    }
}
