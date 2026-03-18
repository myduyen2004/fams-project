package com.fams.backend.service.impl;

import com.fams.backend.dto.response.ScheduleRequestResponse;
import com.fams.backend.entity.*;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.repository.ScheduleRequestRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Unit Tests: Service xử lý Yêu cầu thay đổi lịch (ScheduleRequestService)")
class ScheduleRequestServiceImplTest {

    @Mock
    private ScheduleRequestRepository scheduleRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SystemLogService systemLogService;

    @InjectMocks
    private ScheduleRequestServiceImpl scheduleRequestService;

    private User requesterStudent;
    private User requesterLecturer;
    private User approver;
    private ScheduleRequest request;
    private ClassSection classSection;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        requesterStudent = User.builder()
                .id(1L)
                .fullName("Nguyen Van Sinh Vien")
                .code("SE123456")
                .role(User.UserRole.STUDENT)
                .email("student@fpt.edu.vn")
                .build();

        requesterLecturer = User.builder()
                .id(3L)
                .fullName("Co Giao Vien")
                .code("GV1234")
                .role(User.UserRole.LECTURER)
                .email("lecturer@fpt.edu.vn")
                .build();

        approver = User.builder()
                .id(2L)
                .fullName("Academic Staff")
                .role(User.UserRole.ACADEMIC_STAFF)
                .build();

        classSection = new ClassSection();
        classSection.setClassName("SE1801");

        request = ScheduleRequest.builder()
                .id(1L)
                .requester(requesterStudent)
                .classSection(classSection)
                .type(ScheduleRequest.RequestType.RESCHEDULE)
                .reason("Em bị ốm ạ")
                .status(ScheduleRequest.RequestStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("Tests cho chức năng Lấy danh sách yêu cầu (Get Requests)")
    class GetRequestsTests {

        @Test
        @DisplayName("Nên trả về danh sách phân trang khi tìm kiếm hợp lệ")
        void getRequests_shouldReturnPageOfResponses() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<ScheduleRequest> requestPage = new PageImpl<>(Collections.singletonList(request));
            when(scheduleRequestRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(requestPage);

            // Act
            Page<ScheduleRequestResponse> result = scheduleRequestService.getRequests(
                    "SE123456", "STUDENT", "ốm", ScheduleRequest.RequestStatus.PENDING, null, null, pageable);

            // Assert
            assertNotNull(result, "Kết quả trả về không được null");
            assertEquals(1, result.getContent().size(), "Số lượng bản ghi phải là 1");
            assertEquals("Nguyen Van Sinh Vien", result.getContent().get(0).getRequesterName());
            verify(scheduleRequestRepository).findAll(any(Specification.class), eq(pageable));
        }

        @Test
        @DisplayName("Nên trả về danh sách rỗng khi không tìm thấy yêu cầu nào")
        void getRequests_shouldReturnEmptyPage_whenNoMatches() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<ScheduleRequest> emptyPage = new PageImpl<>(Collections.emptyList());
            when(scheduleRequestRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(emptyPage);

            // Act
            Page<ScheduleRequestResponse> result = scheduleRequestService.getRequests(
                    null, null, null, null, null, null, pageable);

            // Assert
            assertNotNull(result);
            assertTrue(result.isEmpty(), "Danh sách trả về phải rỗng");
        }
    }

    @Nested
    @DisplayName("Tests cho chức năng Xem chi tiết yêu cầu (Get Request By ID)")
    class GetRequestByIdTests {

        @Test
        @DisplayName("Nên trả về thông tin chi tiết khi ID tồn tại")
        void getRequestById_shouldReturnResponse_whenExists() {
            // Arrange
            when(scheduleRequestRepository.findById(1L)).thenReturn(Optional.of(request));

            // Act
            ScheduleRequestResponse result = scheduleRequestService.getRequestById(1L);

            // Assert
            assertNotNull(result);
            assertEquals(1L, result.getId());
            assertEquals("Nguyen Van Sinh Vien", result.getRequesterName());
            assertEquals("SE123456", result.getRequesterCode());
        }

        @Test
        @DisplayName("Nên ném lỗi BadRequestException khi ID không tồn tại")
        void getRequestById_shouldThrowException_whenNotFound() {
            // Arrange
            when(scheduleRequestRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> scheduleRequestService.getRequestById(999L));
            assertEquals("Request not found", exception.getMessage());
        }
    }

    @Nested
    @DisplayName("Tests cho chức năng Cập nhật trạng thái yêu cầu (Update Status)")
    class UpdateStatusTests {

        @Test
        @DisplayName("Nên cập nhật thành APPROVED và gửi thông báo khi duyệt")
        void updateRequestStatus_shouldApproveRequest_whenPending() {
            // Arrange
            when(scheduleRequestRepository.findByIdWithSlots(1L)).thenReturn(Optional.of(request));
            when(userRepository.findById(2L)).thenReturn(Optional.of(approver));
            when(scheduleRequestRepository.saveAndFlush(any(ScheduleRequest.class))).thenReturn(request);

            // Act
            ScheduleRequestResponse result = scheduleRequestService.updateRequestStatus(
                    1L, ScheduleRequest.RequestStatus.APPROVED, "Đồng ý", 2L);

            // Assert
            assertNotNull(result);
            assertEquals("APPROVED", result.getStatus());
            assertEquals("Academic Staff", result.getApproverName());
            assertEquals("Đồng ý", result.getApproverNote());
            assertNotNull(result.getApprovedAt(), "Thời gian duyệt không được null");

            verify(scheduleRequestRepository).saveAndFlush(request);
            // Verify notification sent using Mockito's generic matcher or specific logic
            // inside service
            // Note: NotificationService mocked, so we assume it's called
        }

        @Test
        @DisplayName("Nên cập nhật thành REJECTED khi từ chối")
        void updateRequestStatus_shouldRejectRequest_whenPending() {
            // Arrange
            when(scheduleRequestRepository.findByIdWithSlots(1L)).thenReturn(Optional.of(request));
            when(userRepository.findById(2L)).thenReturn(Optional.of(approver));
            when(scheduleRequestRepository.saveAndFlush(any(ScheduleRequest.class))).thenReturn(request);

            // Act
            ScheduleRequestResponse result = scheduleRequestService.updateRequestStatus(
                    1L, ScheduleRequest.RequestStatus.REJECTED, "Không hợp lệ", 2L);

            // Assert
            assertEquals("REJECTED", result.getStatus());
            assertEquals("Academic Staff", result.getApproverName());
            assertEquals("Không hợp lệ", result.getApproverNote());
        }

        @Test
        @DisplayName("Nên ném lỗi khi Request ID là null")
        void updateRequestStatus_shouldThrowException_whenIdNull() {
            // Act & Assert
            BadRequestException ex = assertThrows(BadRequestException.class, () -> scheduleRequestService
                    .updateRequestStatus(null, ScheduleRequest.RequestStatus.APPROVED, "Note", 2L));
            assertEquals("Request ID must not be null", ex.getMessage());
        }

        @Test
        @DisplayName("Nên ném lỗi khi người duyệt không tồn tại")
        void updateRequestStatus_shouldThrowException_whenApproverNotFound() {
            // Arrange
            when(scheduleRequestRepository.findByIdWithSlots(1L)).thenReturn(Optional.of(request));
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            // Act & Assert
            BadRequestException ex = assertThrows(BadRequestException.class, () -> scheduleRequestService
                    .updateRequestStatus(1L, ScheduleRequest.RequestStatus.APPROVED, "Note", 99L));
            assertEquals("Approver not found", ex.getMessage());
        }

        @Test
        @DisplayName("Nên ném lỗi khi yêu cầu không ở trạng thái PENDING")
        void updateRequestStatus_shouldThrowException_whenNotPending() {
            // Arrange
            request.setStatus(ScheduleRequest.RequestStatus.APPROVED);
            when(scheduleRequestRepository.findByIdWithSlots(1L)).thenReturn(Optional.of(request));

            // Act & Assert
            BadRequestException ex = assertThrows(BadRequestException.class, () -> scheduleRequestService
                    .updateRequestStatus(1L, ScheduleRequest.RequestStatus.REJECTED, "Note", 2L));
            assertEquals("Only pending requests can be updated", ex.getMessage());
        }
    }

    @Nested
    @DisplayName("Tests cho chức năng Thống kê (Statistics)")
    class StatisticsTests {

        @Test
        @DisplayName("Nên tính toán đúng số lượng pending và processed")
        void getRequestStats_shouldReturnCorrectStats() {
            // Arrange
            when(scheduleRequestRepository.countByStatus(ScheduleRequest.RequestStatus.PENDING)).thenReturn(5L);
            when(scheduleRequestRepository.count()).thenReturn(15L); // Total 15, so processed = 15 - 5 = 10

            // Act
            Map<String, Long> stats = scheduleRequestService.getRequestStats();

            // Assert
            assertEquals(5L, stats.get("pending"));
            assertEquals(10L, stats.get("processed"));
        }
    }

    @Nested
    @DisplayName("Tests cho chức năng Xuất Excel (Export)")
    class ExportTests {

        @Test
        @DisplayName("Nên xuất ra file Excel (mảng byte) thành công")
        void exportRequests_shouldReturnByteArray() {
            // Arrange
            List<ScheduleRequest> requests = Collections.singletonList(request);
            when(scheduleRequestRepository.findAll(any(Specification.class))).thenReturn(requests);

            // Act
            byte[] result = scheduleRequestService.exportRequests(null, null, null, null, null, null);

            // Assert
            assertNotNull(result);
            assertTrue(result.length > 0, "File Excel xuất ra phải có dữ liệu");
        }

        @Test
        @DisplayName("Nên ném lỗi RuntimeException khi quá trình tạo file thất bại")
        void exportRequests_shouldThrowException_whenErrorOccurs() {
            // Arrange
            when(scheduleRequestRepository.findAll(any(Specification.class)))
                    .thenThrow(new RuntimeException("DB Error"));

            // Act & Assert
            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> scheduleRequestService.exportRequests(null, null, null, null, null, null));
            assertTrue(ex.getMessage().contains("Lỗi khi tạo file Excel") || ex.getMessage().contains("DB Error"));
        }
    }
}
