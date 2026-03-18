package com.fams.backend.service.impl;

import com.fams.backend.dto.request.CreateScheduleRequest;
import com.fams.backend.dto.response.ScheduleRequestResponse;
import com.fams.backend.entity.ClassSection;
import com.fams.backend.entity.ScheduleRequest;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.repository.RoomRepository;
import com.fams.backend.repository.ScheduleRequestRepository;
import com.fams.backend.repository.SlotTypeRepository;
import com.fams.backend.repository.TimetableSlotRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.ScheduleRequestService;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ScheduleRequestServiceImpl implements ScheduleRequestService {

    private final ScheduleRequestRepository scheduleRequestRepository;
    private final UserRepository userRepository;
    private final com.fams.backend.service.NotificationService notificationService;
    private final TimetableSlotRepository timetableSlotRepository;
    private final RoomRepository roomRepository;
    private final SlotTypeRepository slotTypeRepository;
    private final com.fams.backend.repository.EnrollmentRepository enrollmentRepository;

    @Override
    public ScheduleRequestResponse createRequest(CreateScheduleRequest request, Long requesterId) {
        log.info("Creating schedule request for user {}", requesterId);

        // 1. Get Requester & Original Slot
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (request.getOriginalSlotId() == null) {
            throw new BadRequestException("Original slot ID is required");
        }
        com.fams.backend.entity.TimetableSlot originalSlot = timetableSlotRepository
                .findById(request.getOriginalSlotId())
                .orElseThrow(() -> new BadRequestException("Original slot not found"));

        // 2. Validate Requester (Optional strict check)
        // Ensure requester is related to the class/slot if needed

        // 3. Initialize Target
        com.fams.backend.entity.TimetableSlot requestedSlot = null;
        com.fams.backend.entity.Room requestedRoom = null;
        com.fams.backend.entity.SlotType requestedSlotType = null;

        // 4. Handle based on Type
        if (request.getType() != ScheduleRequest.RequestType.CANCEL) {
            // Validate inputs for rescheduling/swap/room_change
            if (request.getRequestedDate() == null) {
                // If date not provided for Room Change, assume same date?
                // Actually frontend logic often sends date. If not, fallback to original date?
                // Let's assume passed in request or fallback to original.
                if (request.getType() == ScheduleRequest.RequestType.ROOM_CHANGE
                        && request.getRequestedDate() == null) {
                    request.setRequestedDate(originalSlot.getDate());
                } else if (request.getRequestedDate() == null) {
                    throw new BadRequestException("Requested date is required for this request type");
                }
            }
            LocalDate targetDate = request.getRequestedDate();

            Long targetRoomId = request.getRequestedRoomId() != null ? request.getRequestedRoomId()
                    : originalSlot.getRoom().getId();
            Integer targetSlotIndex;
            // requestedSlotType reassignment

            // Get semester ID from original slot
            Long semesterId = originalSlot.getClassSection().getSemester().getId();

            if (request.getRequestedSlotTypeId() != null) {
                // requestedSlotTypeId is actually the slot INDEX (1-4), not the SlotType ID
                targetSlotIndex = request.getRequestedSlotTypeId().intValue();
                requestedSlotType = slotTypeRepository
                        .findBySemesterIdAndSlotIndex(semesterId, targetSlotIndex)
                        .orElseThrow(() -> new BadRequestException("Slot Type not found for slot " + targetSlotIndex));
            } else {
                // If not requested, use original slot number
                targetSlotIndex = originalSlot.getSlotNumber();
                // Find corresponding SlotType if checking duration etc (optional)
                requestedSlotType = slotTypeRepository
                        .findBySemesterIdAndSlotIndex(semesterId, targetSlotIndex)
                        .orElseThrow(() -> new BadRequestException("Original Slot Type not found"));
            }

            requestedRoom = roomRepository.findById(targetRoomId)
                    .orElseThrow(() -> new BadRequestException("Room not found"));

            // Check Conflicts - chỉ kiểm tra, không tạo slot mới
            // Lấy ID của slot gốc để loại trừ khi kiểm tra conflict
            Long originalSlotId = originalSlot.getId();

            // a. Room Conflict (loại trừ slot gốc)
            boolean roomBusy = timetableSlotRepository.existsByRoomIdAndDateAndSlotNumberExcludingSlot(
                    requestedRoom.getId(), targetDate, targetSlotIndex,
                    com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.CANCELLED,
                    originalSlotId);
            if (roomBusy) {
                throw new BadRequestException("Phòng học đã có lớp học khác vào khung giờ này.");
            }

            // b. Lecturer Conflict (loại trừ slot gốc)
            boolean lecturerBusy = timetableSlotRepository.existsByLecturerIdAndDateAndSlotNumberExcludingSlot(
                    originalSlot.getClassSection().getLecturer().getId(), targetDate, targetSlotIndex,
                    com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.CANCELLED,
                    originalSlotId);
            if (lecturerBusy) {
                throw new BadRequestException("Giảng viên đã có lịch dạy vào khung giờ này.");
            }

            // c. Class Conflict (loại trừ slot gốc)
            boolean classBusy = timetableSlotRepository.existsByClassNameAndDateAndSlotNumberExcludingSlot(
                    originalSlot.getClassSection().getClassName(), targetDate, targetSlotIndex,
                    com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.CANCELLED,
                    originalSlotId);
            if (classBusy) {
                throw new BadRequestException("Lớp học đã có lịch học vào khung giờ này.");
            }

            // d. Pending Request Conflict - Check if there's already a PENDING request for
            // same room/date/slot
            boolean pendingConflict = scheduleRequestRepository
                    .existsByRequestedRoomIdAndRequestedDateAndRequestedSlotNumberAndStatus(
                            requestedRoom.getId(), targetDate, targetSlotIndex,
                            ScheduleRequest.RequestStatus.PENDING);
            if (pendingConflict) {
                throw new BadRequestException("Đã có yêu cầu đang chờ duyệt cho phòng/ngày/slot này.");
            }

            // e. Student Conflict - Check if any students in the class have schedule
            // conflicts
            String className = originalSlot.getClassSection().getClassName();
            long studentConflictCount = timetableSlotRepository.countStudentConflicts(
                    className, targetDate, targetSlotIndex);
            if (studentConflictCount > 0) {
                throw new BadRequestException(
                        String.format("Có %d sinh viên trong lớp bị trùng lịch học vào khung giờ này.",
                                studentConflictCount));
            }

            // KHÔNG tạo TimetableSlot mới ở đây
            // TimetableSlot sẽ được tạo khi yêu cầu được APPROVED
            requestedSlot = null;
        }

        // 5. Create Request
        ScheduleRequest scheduleRequest = new ScheduleRequest();
        scheduleRequest.setRequester(requester);
        scheduleRequest.setClassSection(originalSlot.getClassSection());
        scheduleRequest.setOriginalSlot(originalSlot);
        scheduleRequest.setRequestedSlot(requestedSlot);
        scheduleRequest.setRequestedRoom(requestedRoom);
        scheduleRequest.setType(request.getType());
        scheduleRequest.setReason(request.getReason());
        scheduleRequest.setFile(request.getFile()); // Lưu URL file từ Cloudinary
        scheduleRequest.setRequestedDate(request.getRequestedDate()); // Lưu ngày yêu cầu thay đổi
        scheduleRequest.setRequestedSlotNumber(
                request.getRequestedSlotTypeId() != null ? request.getRequestedSlotTypeId().intValue() : null); // Lưu
                                                                                                                // slot
                                                                                                                // number
                                                                                                                // yêu
                                                                                                                // cầu
        scheduleRequest.setStatus(ScheduleRequest.RequestStatus.PENDING);
        scheduleRequest.setCreatedAt(LocalDateTime.now());

        ScheduleRequest savedRequest = scheduleRequestRepository.save(scheduleRequest);

        // 6. Send notification to Academic Staff
        sendNotificationToAcademicStaff(savedRequest);

        return mapToResponse(savedRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ScheduleRequestResponse> getRequests(
            String search,
            String role,
            String reason,
            ScheduleRequest.RequestStatus status,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable) {
        log.info("Fetching schedule requests with filters");
        Specification<ScheduleRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Explicit left joins to avoid implicit inner joins
            Join<ScheduleRequest, User> requesterJoin = root.join("requester", JoinType.LEFT);
            Join<ScheduleRequest, ClassSection> classJoin = root.join("classSection", JoinType.LEFT);

            if (search != null && !search.trim().isEmpty()) {
                String likeSearch = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(requesterJoin.get("fullName")), likeSearch),
                        cb.like(cb.lower(requesterJoin.get("code")), likeSearch),
                        cb.like(cb.lower(classJoin.get("className")), likeSearch)));
            }

            if (role != null && !role.trim().isEmpty()) {
                predicates.add(cb.equal(requesterJoin.get("role"), User.UserRole.valueOf(role.trim().toUpperCase())));
            }

            if (reason != null && !reason.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("reason")), "%" + reason.trim().toLowerCase() + "%"));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }

            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate.atTime(LocalTime.MAX)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return scheduleRequestRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    @Override
    public ScheduleRequestResponse updateRequestStatus(Long id, ScheduleRequest.RequestStatus status, String note,
            Long approverId) {
        log.info("Updating schedule request {} to status {}", id, status);
        if (id == null) {
            throw new BadRequestException("Request ID must not be null");
        }
        // Use findByIdWithSlots to load originalSlot and slotType for approval
        // processing
        ScheduleRequest request = scheduleRequestRepository.findByIdWithSlots(id)
                .orElseThrow(() -> new BadRequestException("Request not found"));

        if (request.getStatus() != ScheduleRequest.RequestStatus.PENDING) {
            throw new BadRequestException("Only pending requests can be updated");
        }

        User approver = userRepository.findById(approverId)
                .orElseThrow(() -> new BadRequestException("Approver not found"));

        request.setStatus(status);
        request.setApprover(approver);
        request.setApprovedAt(LocalDateTime.now());
        request.setApproverNote(note);

        // Xử lý tạo TimetableSlot mới khi APPROVED
        if (status == ScheduleRequest.RequestStatus.APPROVED) {
            handleApprovedRequest(request);
        }

        ScheduleRequest savedRequest = scheduleRequestRepository.saveAndFlush(request);

        // Log system activity
        String className = savedRequest.getClassSection() != null ? savedRequest.getClassSection().getClassName()
                : "N/A";
        if (status == ScheduleRequest.RequestStatus.APPROVED) {
            systemLogService.logScheduleRequestApproved(savedRequest.getId(), approver.getFullName(), className);
        } else if (status == ScheduleRequest.RequestStatus.REJECTED) {
            systemLogService.logScheduleRequestRejected(savedRequest.getId(), approver.getFullName(), className);
        }

        // Gửi thông báo đến người yêu cầu sau khi cập nhật trạng thái
        sendNotificationAsync(savedRequest, status, note);

        ScheduleRequestResponse response = mapToResponse(savedRequest);
        return response;
    }

    /**
     * Xử lý khi yêu cầu được APPROVED:
     * - Tạo TimetableSlot mới với thông tin từ request
     * - Cập nhật slot cũ → RESCHEDULED
     */
    private void handleApprovedRequest(ScheduleRequest request) {
        log.info("handleApprovedRequest called for request ID: {}, type: {}", request.getId(), request.getType());

        if (request.getType() != ScheduleRequest.RequestType.RESCHEDULE
                && request.getType() != ScheduleRequest.RequestType.ROOM_CHANGE) {
            log.info("Request type {} is not RESCHEDULE or ROOM_CHANGE, skipping slot creation", request.getType());
            return;
        }

        com.fams.backend.entity.TimetableSlot originalSlot = request.getOriginalSlot();
        if (originalSlot == null) {
            log.warn("Original slot is null for request ID: {}, cannot create new slot", request.getId());
            return;
        }

        log.info("Original slot ID: {}, creating new slot...", originalSlot.getId());

        // 1. Tạo TimetableSlot mới
        com.fams.backend.entity.TimetableSlot newSlot = com.fams.backend.entity.TimetableSlot.builder()
                .classSection(request.getClassSection())
                .room(request.getRequestedRoom())
                .date(request.getRequestedDate())
                .slotNumber(request.getRequestedSlotNumber())
                .dayOfWeek(request.getRequestedDate().getDayOfWeek().getValue())
                .slotType(originalSlot.getSlotType())
                .status(com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.SCHEDULED)
                .build();
        com.fams.backend.entity.TimetableSlot savedNewSlot = timetableSlotRepository.save(newSlot);
        log.info("Created new TimetableSlot with ID: {}", savedNewSlot.getId());

        // 2. Liên kết với ScheduleRequest
        request.setRequestedSlot(savedNewSlot);

        // 3. Cập nhật slot cũ → RESCHEDULED (giữ lại lịch sử)
        originalSlot.setStatus(com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.RESCHEDULED);
        originalSlot.setNote("Đã đổi lịch theo yêu cầu #" + request.getId());
        timetableSlotRepository.save(originalSlot);
        log.info("Marked original slot {} as RESCHEDULED", originalSlot.getId());

        // 4. Gửi thông báo đến tất cả sinh viên trong lớp
        sendNotificationToStudentsInClass(request);
    }

    /**
     * Gửi thông báo đến tất cả sinh viên trong lớp khi lịch học thay đổi
     */
    private void sendNotificationToStudentsInClass(ScheduleRequest request) {
        try {
            String className = request.getClassSection() != null ? request.getClassSection().getClassName() : null;
            if (className == null) {
                log.warn("Cannot send notification to students: className is null for request {}", request.getId());
                return;
            }

            List<Long> studentIds = enrollmentRepository.findEnrolledStudentIdsByClassName(className);
            if (studentIds.isEmpty()) {
                log.info("No enrolled students found for class {}", className);
                return;
            }

            String title = "Lịch học lớp " + className + " đã thay đổi";

            // Format dates as dd-MM-yyyy
            java.time.format.DateTimeFormatter dateFormatter = java.time.format.DateTimeFormatter
                    .ofPattern("dd-MM-yyyy");
            String originalDateFormatted = request.getOriginalSlot() != null
                    ? request.getOriginalSlot().getDate().format(dateFormatter)
                    : "N/A";
            String requestedDateFormatted = request.getRequestedDate() != null
                    ? request.getRequestedDate().format(dateFormatter)
                    : "N/A";
            String roomName = request.getRequestedRoom() != null ? request.getRequestedRoom().getName() : "Không đổi";
            Integer slotNumber = request.getRequestedSlotNumber();

            String content = String.format(
                    "Dear em,<br>Buổi học ngày %s đã được đổi sang ngày %s, Slot %d, Phòng %s. " +
                            "Em lưu ý kiểm tra và cập nhật thêm thông tin ở trang thời khóa biểu.<br>" +
                            "Thân mến,<br>Phòng đào tạo",
                    originalDateFormatted, requestedDateFormatted, slotNumber != null ? slotNumber : 0, roomName);

            for (Long studentId : studentIds) {
                com.fams.backend.dto.request.NotificationRequest notifRequest = com.fams.backend.dto.request.NotificationRequest
                        .builder()
                        .title(title)
                        .content(content)
                        .type(com.fams.backend.entity.Notification.NotificationType.SCHEDULE)
                        .targetType(com.fams.backend.entity.Notification.TargetType.USER)
                        .status(com.fams.backend.entity.Notification.NotificationStatus.SENT)
                        .recipientId(studentId)
                        .build();
                notificationService.createNotification(notifRequest);
            }

            log.info("Sent schedule change notification to {} students in class {}", studentIds.size(), className);
        } catch (Exception e) {
            log.error("Error sending notification to students: {}", e.getMessage(), e);
        }
    }

    /**
     * Send notification to all Academic Staff when a new request is created
     */
    private void sendNotificationToAcademicStaff(ScheduleRequest request) {
        try {
            List<User> academicStaffs = userRepository.findByRole(User.UserRole.ACADEMIC_STAFF)
                    .orElse(new ArrayList<>());

            if (academicStaffs.isEmpty()) {
                log.info("No Academic Staff found to notify");
                return;
            }

            String requesterName = request.getRequester().getFullName();
            String className = request.getClassSection() != null ? request.getClassSection().getClassName() : "N/A";
            String typeLabel = getTypeLabel(request.getType());

            String title = "Yêu cầu thay đổi lịch mới từ " + requesterName;
            String content = String.format("Giảng viên %s đã gửi yêu cầu %s cho lớp %s. Vui lòng kiểm tra và xử lý.",
                    requesterName, typeLabel, className);

            int count = 0;
            for (User staff : academicStaffs) {
                com.fams.backend.dto.request.NotificationRequest notifRequest = com.fams.backend.dto.request.NotificationRequest
                        .builder()
                        .title(title)
                        .content(content)
                        .type(com.fams.backend.entity.Notification.NotificationType.SYSTEM)
                        .targetType(com.fams.backend.entity.Notification.TargetType.USER)
                        .status(com.fams.backend.entity.Notification.NotificationStatus.SENT)
                        .recipientId(staff.getId())
                        .build();
                notificationService.createNotification(notifRequest);
                count++;
            }
            log.info("Sent notification to {} Academic Staff members", count);
        } catch (Exception e) {
            log.error("Error sending notification to Academic Staff: {}", e.getMessage(), e);
        }
    }

    @Override
    public void revokeRequest(Long requestId, Long lecturerId) {
        log.info("Revoking schedule request {} by user {}", requestId, lecturerId);

        ScheduleRequest request = scheduleRequestRepository.findById(requestId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn yêu cầu"));

        if (!request.getRequester().getId().equals(lecturerId)) {
            throw new BadRequestException("Bạn không có quyền thu hồi đơn này");
        }

        if (request.getStatus() != ScheduleRequest.RequestStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể thu hồi đơn đang ở trạng thái chờ duyệt");
        }

        request.setStatus(ScheduleRequest.RequestStatus.REVOKED);
        scheduleRequestRepository.save(request);

        sendRevokeNotificationToAcademicStaff(request);
    }

    private void sendRevokeNotificationToAcademicStaff(ScheduleRequest request) {
        try {
            List<User> academicStaffs = userRepository.findByRole(User.UserRole.ACADEMIC_STAFF)
                    .orElse(new ArrayList<>());

            if (academicStaffs.isEmpty()) {
                log.info("No Academic Staff found to notify about revocation");
                return;
            }

            String requesterName = request.getRequester().getFullName();
            String className = request.getClassSection() != null ? request.getClassSection().getClassName() : "N/A";
            String title = "Đơn yêu cầu thay đổi lịch đã bị thu hồi";
            String hiddenStatusMarker = "<span style=\"display:none;\">Đã thu hồi</span>";
            String content = hiddenStatusMarker + String.format(
                    "Hệ thống ghi nhận Giảng viên %s đã thu hồi đơn yêu cầu %s cho lớp %s.",
                    requesterName, getTypeLabel(request.getType()), className);

            int count = 0;
            for (User staff : academicStaffs) {
                com.fams.backend.dto.request.NotificationRequest notifRequest = com.fams.backend.dto.request.NotificationRequest
                        .builder()
                        .title(title)
                        .content(content)
                        .type(com.fams.backend.entity.Notification.NotificationType.SYSTEM)
                        .targetType(com.fams.backend.entity.Notification.TargetType.USER)
                        .status(com.fams.backend.entity.Notification.NotificationStatus.SENT)
                        .recipientId(staff.getId())
                        .build();
                notificationService.createNotification(notifRequest);
                count++;
            }

            log.info("Sent revocation notification to {} Academic Staff members", count);
        } catch (Exception e) {
            log.error("Error sending revocation notification to Academic Staff: {}", e.getMessage(), e);
        }
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    protected void sendNotificationAsync(ScheduleRequest savedRequest, ScheduleRequest.RequestStatus status,
            String note) {
        try {
            String statusVN = status == ScheduleRequest.RequestStatus.APPROVED ? "Đã duyệt" : "Từ chối";
            String className = savedRequest.getClassSection() != null ? savedRequest.getClassSection().getClassName()
                    : "";
            String title = "Yêu cầu thay đổi lịch học lớp " + className;
            // Hidden status marker for frontend detection (not visible to user)
            String hiddenStatusMarker = "<span style=\"display:none;\">" + statusVN + "</span>";
            String content;
            if (status == ScheduleRequest.RequestStatus.APPROVED) {
                StringBuilder contentBuilder = new StringBuilder();
                contentBuilder.append(hiddenStatusMarker);
                contentBuilder.append("Dear Giảng Viên,<br/>");
                contentBuilder.append(
                        "Phòng đào tạo đã chấp nhận đơn yêu cầu thay đổi lịch học của giảng viên. Vui lòng cập nhật lịch dạy chi tiết ở trang thời khóa biểu.<br/>");
                contentBuilder.append("Thân mến");

                if (note != null && !note.isEmpty()) {
                    contentBuilder.append("<br/><br/><strong>Ghi chú từ admin:</strong><br/>").append(note);
                }
                content = contentBuilder.toString();
            } else {
                if (note != null && !note.isEmpty()) {
                    // Chỉ hiển thị ghi chú của người duyệt
                    content = hiddenStatusMarker + note;
                } else {
                    // Không có ghi chú, chỉ lưu hidden status marker
                    content = hiddenStatusMarker;
                }
            }

            com.fams.backend.dto.request.NotificationRequest notifRequest = com.fams.backend.dto.request.NotificationRequest
                    .builder()
                    .title(title)
                    .content(content)
                    .type(com.fams.backend.entity.Notification.NotificationType.SCHEDULE)
                    .targetType(com.fams.backend.entity.Notification.TargetType.USER)
                    .status(com.fams.backend.entity.Notification.NotificationStatus.SENT)
                    .recipientId(savedRequest.getRequester().getId())
                    .build();

            notificationService.createNotification(notifRequest);
            log.info("Notification sent to requester {}", savedRequest.getRequester().getId());
        } catch (Exception e) {
            log.error("Failed to send notification for request {}, but status was updated successfully",
                    savedRequest.getId(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportRequests(String search, String role, String reason, ScheduleRequest.RequestStatus status,
            LocalDate startDate, LocalDate endDate) {
        log.info("Exporting schedule requests with filters: search={}, role={}, status={}", search, role, status);

        Specification<ScheduleRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Fetch joins to avoid N+1
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("requester", JoinType.LEFT);
                root.fetch("classSection", JoinType.LEFT);
            }

            Join<ScheduleRequest, User> requesterJoin = root.join("requester", JoinType.LEFT);
            Join<ScheduleRequest, ClassSection> classJoin = root.join("classSection", JoinType.LEFT);

            if (search != null && !search.trim().isEmpty()) {
                String likeSearch = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(requesterJoin.get("fullName")), likeSearch),
                        cb.like(cb.lower(requesterJoin.get("code")), likeSearch),
                        cb.like(cb.lower(classJoin.get("className")), likeSearch)));
            }

            if (role != null && !role.trim().isEmpty()) {
                try {
                    predicates
                            .add(cb.equal(requesterJoin.get("role"), User.UserRole.valueOf(role.trim().toUpperCase())));
                } catch (Exception e) {
                    log.error("Invalid role prefix: {}", role);
                }
            }

            if (reason != null && !reason.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("reason")), "%" + reason.trim().toLowerCase() + "%"));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }

            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate.atTime(LocalTime.MAX)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<ScheduleRequest> requests = scheduleRequestRepository.findAll(spec);
        log.info("Found {} requests to export", requests.size());

        try {
            org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Danh sách yêu cầu");

            // Style for header
            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.LIGHT_ORANGE.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);

            // Headers
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "STT", "Mã người gửi", "Họ tên", "Vai trò", "Loại yêu cầu", "Lớp / Nhóm", "Lý do", "Ngày gửi",
                    "Trạng thái"
            };
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 1;
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter
                    .ofPattern("dd/MM/yyyy HH:mm");
            for (ScheduleRequest request : requests) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(rowNum - 1);

                User requester = request.getRequester();
                row.createCell(1).setCellValue(requester != null ? requester.getCode() : "");
                row.createCell(2).setCellValue(requester != null ? requester.getFullName() : "");

                String roleStr = "";
                if (requester != null && requester.getRole() != null) {
                    roleStr = requester.getRole() == User.UserRole.LECTURER ? "Giảng viên" : "Sinh viên";
                }
                row.createCell(3).setCellValue(roleStr);

                row.createCell(4).setCellValue(request.getType() != null ? getTypeLabel(request.getType()) : "");
                row.createCell(5).setCellValue(
                        request.getClassSection() != null ? request.getClassSection().getClassName() : "N/A");
                row.createCell(6).setCellValue(request.getReason() != null ? request.getReason() : "");
                row.createCell(7)
                        .setCellValue(request.getCreatedAt() != null ? request.getCreatedAt().format(formatter) : "");
                row.createCell(8).setCellValue(request.getStatus() != null ? getStatusLabel(request.getStatus()) : "");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                try {
                    sheet.autoSizeColumn(i);
                } catch (Exception e) {
                    // Headless environment might fail
                }
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error creating excel file", e);
            throw new RuntimeException("Lỗi khi tạo file Excel", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getRequestStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("pending", scheduleRequestRepository.countByStatus(ScheduleRequest.RequestStatus.PENDING));
        stats.put("processed", scheduleRequestRepository.count() - stats.get("pending"));
        return stats;
    }

    @Override
    @Transactional(readOnly = true)
    public ScheduleRequestResponse getRequestById(Long id) {
        return scheduleRequestRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new BadRequestException("Request not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ScheduleRequestResponse> getRequestsByRequester(Long requesterId, Pageable pageable) {
        return scheduleRequestRepository.findByRequesterId(requesterId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.fams.backend.dto.response.ClassSlotResponse> getSlotsForClass(String className, Long lecturerId) {
        log.info("Fetching slots for class {} and lecturer {}", className, lecturerId);
        List<com.fams.backend.entity.TimetableSlot> slots = timetableSlotRepository
                .findByClassSectionClassNameAndClassSectionLecturerIdOrderByDateAscSlotNumberAsc(className, lecturerId);

        return slots.stream().map(slot -> com.fams.backend.dto.response.ClassSlotResponse.builder()
                .id(slot.getId())
                .slotNumber(slot.getSlotNumber())
                .roomId(slot.getRoom().getId())
                .roomName(slot.getRoom().getName())
                .date(slot.getDate())
                .dayOfWeek(slot.getDayOfWeek())
                .build())
                .collect(java.util.stream.Collectors.toList());
    }

    private ScheduleRequestResponse mapToResponse(ScheduleRequest request) {
        User requester = request.getRequester();
        ScheduleRequestResponse response = ScheduleRequestResponse.builder()
                .id(request.getId())
                .requesterId(requester.getId())
                .requesterName(requester.getFullName())
                .requesterCode(requester.getCode())
                .requesterAvatar(requester.getAvatar())
                .requesterRole(requester.getRole().name())
                .className(request.getClassSection() != null ? request.getClassSection().getClassName() : "N/A")
                .type(request.getType().name())
                .typeLabel(getTypeLabel(request.getType()))
                .reason(request.getReason())
                .status(request.getStatus().name())
                .statusLabel(getStatusLabel(request.getStatus()))
                .approverName(request.getApprover() != null ? request.getApprover().getFullName() : null)
                .createdAt(request.getCreatedAt())
                .approvedAt(request.getApprovedAt())
                .approverNote(request.getApproverNote())
                .originalSlotId(request.getOriginalSlot() != null ? request.getOriginalSlot().getId() : null)
                .originalSlotNumber(
                        request.getOriginalSlot() != null ? request.getOriginalSlot().getSlotNumber() : null)
                .originalSlotInfo(request.getOriginalSlot() != null ? formatSlotInfo(request.getOriginalSlot()) : null)
                .requestedSlotId(request.getRequestedSlot() != null ? request.getRequestedSlot().getId() : null)
                .requestedSlotNumber(
                        request.getRequestedSlotNumber() != null ? request.getRequestedSlotNumber()
                                : (request.getRequestedSlot() != null ? request.getRequestedSlot().getSlotNumber()
                                        : null))
                .requestedSlotInfo(
                        request.getRequestedSlotNumber() != null ? "Slot " + request.getRequestedSlotNumber()
                                : (request.getRequestedSlot() != null ? formatSlotInfo(request.getRequestedSlot())
                                        : null))
                .requestedRoomName(request.getRequestedRoom() != null ? request.getRequestedRoom().getName() : null)
                .requestedDate(request.getRequestedSlot() != null ? request.getRequestedSlot().getDate()
                        : request.getRequestedDate())
                .originalDate(request.getOriginalSlot() != null ? request.getOriginalSlot().getDate() : null)
                .originalRoomName(request.getOriginalSlot() != null && request.getOriginalSlot().getRoom() != null
                        ? request.getOriginalSlot().getRoom().getName()
                        : null)
                .requesterEmail(requester.getEmail())
                .file(request.getFile())
                .build();

        if (requester.getRole() == User.UserRole.STUDENT && requester.getStudentProfile() != null) {
            response.setRequesterMajor(requester.getStudentProfile().getMajor().getName());
        } else if (requester.getRole() == User.UserRole.LECTURER && requester.getLecturerProfile() != null) {
            response.setRequesterMajor(requester.getLecturerProfile().getDepartment());
        }

        return response;
    }

    private String formatSlotInfo(com.fams.backend.entity.TimetableSlot slot) {
        if (slot == null)
            return null;

        String[] daysOfWeek = { "", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật" };
        String dayName = slot.getDayOfWeek() >= 1 && slot.getDayOfWeek() <= 7
                ? daysOfWeek[slot.getDayOfWeek()]
                : "Thứ " + slot.getDayOfWeek();

        String slotTypeName = "Slot " + slot.getSlotNumber();
        String roomName = slot.getRoom() != null ? slot.getRoom().getName() : "";

        java.time.format.DateTimeFormatter dateFormatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String dateStr = slot.getDate() != null ? slot.getDate().format(dateFormatter) : "";

        return String.format("%s, %s - %s%s",
                dayName,
                dateStr,
                slotTypeName,
                roomName.isEmpty() ? "" : " - Phòng " + roomName);
    }

    private String getTypeLabel(ScheduleRequest.RequestType type) {
        switch (type) {
            case RESCHEDULE:
                return "Đổi lịch";
            case CANCEL:
                return "Hủy buổi học";
            case SWAP:
                return "Đổi slot với giảng viên khác";
            case ROOM_CHANGE:
                return "Đổi phòng";
            default:
                return type.name();
        }
    }

    private String getStatusLabel(ScheduleRequest.RequestStatus status) {
        switch (status) {
            case PENDING:
                return "Đang chờ duyệt";
            case APPROVED:
                return "Đã duyệt";
            case REJECTED:
                return "Đã từ chối";
            case REVOKED:
                return "Đã thu hồi";
            default:
                return status.name();
        }
    }
}
