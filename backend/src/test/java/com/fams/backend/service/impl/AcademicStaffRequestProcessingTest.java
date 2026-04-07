package com.fams.backend.service.impl;

import com.fams.backend.dto.response.AcademicRequestResponse;
import com.fams.backend.entity.*;
import com.fams.backend.entity.AcademicRequest.AcademicRequestType;
import com.fams.backend.entity.AcademicRequest.RequestStatus;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.repository.*;
import com.fams.backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: Chức năng Academic Staff xử lý đơn yêu cầu (Approve/Reject Request)")
public class AcademicStaffRequestProcessingTest {

    @Mock
    private AcademicRequestRepository academicRequestRepository;
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
    private ClassSectionRepository classSectionRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private TimetableSlotRepository timetableSlotRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AcademicRequestServiceImpl academicRequestService;

    private User staff;
    private User student;
    private StudentProfile profile;
    private AcademicRequest pendingRequest;

    @BeforeEach
    void setUp() {
        staff = User.builder()
                .id(2L)
                .fullName("Cán bộ quản lý")
                .role(User.UserRole.ACADEMIC_STAFF)
                .build();

        student = User.builder()
                .id(1L)
                .fullName("Nguyen Van Sinh Vien")
                .code("SE123456")
                .role(User.UserRole.STUDENT)
                .build();

        profile = new StudentProfile();
        student.setStudentProfile(profile);

        pendingRequest = AcademicRequest.builder()
                .id(100L)
                .student(student)
                .requestType(AcademicRequestType.OTHERS)
                .status(RequestStatus.PENDING)
                .build();
    }

    @Nested
    @DisplayName("Tests cho chức năng Cập nhật trạng thái (Update Request Status)")
    class UpdateStatusTests {

        @Test
        @DisplayName("Nên cập nhật thành APPROVED và gửi thông báo cho sinh viên")
        void updateStatus_ApprovedSuccess() {
            // Arrange
            when(academicRequestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(staff));
            when(academicRequestRepository.save(any(AcademicRequest.class))).thenReturn(pendingRequest);

            // Act
            AcademicRequestResponse response = academicRequestService.updateRequestStatus(
                    100L, RequestStatus.APPROVED, "Lý do hợp lệ", 2L);

            // Assert
            assertEquals("APPROVED", response.getStatus());
            assertEquals(staff.getFullName(), response.getApproverName());
            assertEquals("Lý do hợp lệ", response.getApproverNote());
            assertNotNull(response.getApprovedAt());
            verify(notificationService).notifyStudentRequestStatusChange(any());
        }

        @Test
        @DisplayName("Nên cập nhật thành REJECTED và lưu lời nhắn từ chối")
        void updateStatus_RejectedSuccess() {
            // Arrange
            when(academicRequestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(staff));
            when(academicRequestRepository.save(any(AcademicRequest.class))).thenReturn(pendingRequest);

            // Act
            AcademicRequestResponse response = academicRequestService.updateRequestStatus(
                    100L, RequestStatus.REJECTED, "Hô sơ thiếu minh chứng", 2L);

            // Assert
            assertEquals("REJECTED", response.getStatus());
            assertEquals("Hô sơ thiếu minh chứng", response.getApproverNote());
        }

        @Test
        @DisplayName("Nên ném lỗi khi ID yêu cầu không tồn tại")
        void updateStatus_RequestNotFound() {
            // Arrange
            when(academicRequestRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> academicRequestService.updateRequestStatus(999L, RequestStatus.APPROVED, "Note", 2L));
            assertEquals("Request not found", exception.getMessage());
        }

        @Test
        @DisplayName("Nên ném lỗi khi người duyệt không tồn tại")
        void updateStatus_ApproverNotFound() {
            // Arrange
            when(academicRequestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            // Act & Assert
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> academicRequestService.updateRequestStatus(100L, RequestStatus.APPROVED, "Note", 99L));
            assertEquals("Approver not found", exception.getMessage());
        }

        @Test
        @DisplayName("Nên ném lỗi khi yêu cầu đã được xử lý từ trước")
        void updateStatus_AlreadyProcessed() {
            // Arrange
            pendingRequest.setStatus(RequestStatus.APPROVED);
            when(academicRequestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));

            // Act & Assert
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> academicRequestService.updateRequestStatus(100L, RequestStatus.REJECTED, "Note", 2L));
            assertEquals("Only pending requests can be approved/rejected", exception.getMessage());
        }
    }

    @Nested
    @DisplayName("Tests cho logic xử lý Đổi chuyên ngành (Change Major)")
    class ProcessMajorChangeTests {

        @Test
        @DisplayName("Nên cập nhật Major trong StudentProfile khi đơn đổi ngành được duyệt")
        void processMajorChange_Success() {
            // Arrange
            Major newMajor = new Major();
            newMajor.setId(5L);
            newMajor.setName("Kinh tế");

            pendingRequest.setRequestType(AcademicRequestType.CHANGE_MAJOR);
            pendingRequest.setToMajor("Kinh tế");

            when(academicRequestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(staff));
            when(majorRepository.findByNameIgnoreCase("Kinh tế")).thenReturn(Optional.of(newMajor));
            when(academicRequestRepository.save(any(AcademicRequest.class))).thenReturn(pendingRequest);

            // Act
            academicRequestService.updateRequestStatus(100L, RequestStatus.APPROVED, "OK", 2L);

            // Assert
            assertEquals(newMajor, profile.getMajor());
            verify(studentProfileRepository).saveAndFlush(profile);
        }
    }

    @Nested
    @DisplayName("Tests cho logic xử lý Đổi lớp (Change Class)")
    class ProcessClassChangeTests {

        @Test
        @DisplayName("Nên chuyển Enrollment sang lớp mới khi đơn đổi lớp được duyệt")
        void processClassTransfer_Success() {
            // Arrange
            ClassSection sourceClass = new ClassSection();
            sourceClass.setClassName("SE1801");
            sourceClass.setCurrentEnrollment(20);

            ClassSection targetClass = new ClassSection();
            targetClass.setClassName("SE1802");
            targetClass.setMaxStudents(30);
            targetClass.setCurrentEnrollment(10);
            targetClass.setSemester(new Semester());

            Enrollment enrollment = Enrollment.builder().student(student).classSection(sourceClass).build();

            pendingRequest.setRequestType(AcademicRequestType.CHANGE_CLASS);
            pendingRequest.setClassSection(sourceClass);
            pendingRequest.setToClassName("SE1802");

            when(academicRequestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(staff));
            when(classSectionRepository.findById("SE1802")).thenReturn(Optional.of(targetClass));
            when(enrollmentRepository.findByClassSection_ClassNameAndStudent_Id("SE1801", 1L))
                    .thenReturn(Optional.of(enrollment));
            when(academicRequestRepository.save(any(AcademicRequest.class))).thenReturn(pendingRequest);

            // Act
            academicRequestService.updateRequestStatus(100L, RequestStatus.APPROVED, "OK", 2L);

            // Assert
            verify(enrollmentRepository).delete(enrollment);
            verify(enrollmentRepository).save(any(Enrollment.class));
            assertEquals(19, sourceClass.getCurrentEnrollment());
            assertEquals(11, targetClass.getCurrentEnrollment());
        }
    }
}
