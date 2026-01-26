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
            Long targetSlotTypeId = request.getRequestedSlotTypeId() != null ? request.getRequestedSlotTypeId()
                    : originalSlot.getSlotType().getId();

            requestedRoom = roomRepository.findById(targetRoomId)
                    .orElseThrow(() -> new BadRequestException("Room not found"));

            requestedSlotType = slotTypeRepository.findById(targetSlotTypeId)
                    .orElseThrow(() -> new BadRequestException("Slot Type not found"));

            // Check Conflicts
            // a. Room Conflict
            boolean roomBusy = timetableSlotRepository.existsByRoomIdAndDateAndSlotTypeIdAndStatusNot(
                    requestedRoom.getId(), targetDate, requestedSlotType.getId(),
                    com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.CANCELLED);
            if (roomBusy) {
                throw new BadRequestException("Phòng học đã có lớp học khác vào khung giờ này.");
            }

            // b. Lecturer Conflict
            boolean lecturerBusy = timetableSlotRepository
                    .existsByClassSectionLecturerIdAndDateAndSlotTypeIdAndStatusNot(
                            originalSlot.getClassSection().getLecturer().getId(), targetDate, requestedSlotType.getId(),
                            com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.CANCELLED);
            if (lecturerBusy) {
                throw new BadRequestException("Giảng viên đã có lịch dạy vào khung giờ này.");
            }

            // c. Class Conflict
            boolean classBusy = timetableSlotRepository.existsByClassSectionClassNameAndDateAndSlotTypeIdAndStatusNot(
                    originalSlot.getClassSection().getClassName(), targetDate, requestedSlotType.getId(),
                    com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.CANCELLED);
            if (classBusy) {
                throw new BadRequestException("Lớp học đã có lịch học vào khung giờ này.");
            }

            // Create NEW Slot (Strict Requirement)
            com.fams.backend.entity.TimetableSlot newSlot = new com.fams.backend.entity.TimetableSlot();
            newSlot.setClassSection(originalSlot.getClassSection());
            newSlot.setRoom(requestedRoom);
            newSlot.setSlotType(requestedSlotType);
            newSlot.setDate(targetDate);
            newSlot.setDayOfWeek(targetDate.getDayOfWeek().getValue());
            newSlot.setSlotNumber(requestedSlotType.getSlotIndex());
            newSlot.setStatus(com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.SCHEDULED);

            requestedSlot = timetableSlotRepository.save(newSlot);
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
        scheduleRequest.setStatus(ScheduleRequest.RequestStatus.PENDING);
        scheduleRequest.setCreatedAt(LocalDateTime.now());

        return mapToResponse(scheduleRequestRepository.save(scheduleRequest));
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
        ScheduleRequest request = scheduleRequestRepository.findById(id)
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

        ScheduleRequest savedRequest = scheduleRequestRepository.saveAndFlush(request);

        ScheduleRequestResponse response = mapToResponse(savedRequest);
        return response;
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    protected void sendNotificationAsync(ScheduleRequest savedRequest, ScheduleRequest.RequestStatus status,
            String note) {
        try {
            String statusVN = status == ScheduleRequest.RequestStatus.APPROVED ? "được Duyệt" : "bị Từ chối";
            String title = "Cập nhật trạng thái yêu cầu thay đổi lịch học";
            String content = String.format("Yêu cầu thay đổi lịch học cho lớp %s của bạn đã %s.",
                    savedRequest.getClassSection() != null ? savedRequest.getClassSection().getClassName() : "",
                    statusVN);
            if (note != null && !note.isEmpty()) {
                content += "\nPhản hồi từ người duyệt: " + note;
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
                        request.getRequestedSlot() != null ? request.getRequestedSlot().getSlotNumber() : null)
                .requestedSlotInfo(
                        request.getRequestedSlot() != null ? formatSlotInfo(request.getRequestedSlot()) : null)
                .requestedRoomName(request.getRequestedRoom() != null ? request.getRequestedRoom().getName() : null)
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

        String slotTypeName = slot.getSlotType() != null ? slot.getSlotType().getName()
                : "Slot " + slot.getSlotNumber();
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
            default:
                return status.name();
        }
    }
}
