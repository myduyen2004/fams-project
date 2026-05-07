package com.fams.backend.service.impl;

import com.fams.backend.dto.request.CreateAcademicRequestDTO;
import com.fams.backend.dto.request.CreateScheduleRequest;
import com.fams.backend.dto.request.EnrollmentRequest;
import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.service.UserNotificationService;
import com.fams.backend.entity.AcademicRequest.AcademicRequestType;
import com.fams.backend.entity.Enrollment;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.ScheduleRequest;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.repository.EnrollmentRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.AIChatActionService;
import com.fams.backend.service.AcademicRequestService;
import com.fams.backend.service.NotificationService;
import com.fams.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIChatActionServiceImpl implements AIChatActionService {
    private static final Pattern CLASS_NAME_PATTERN = Pattern.compile(
            "\\b([A-Z]{2,}\\d{2,}[A-Z\\d]*_[A-Z0-9]+|[A-Z]{2,}\\d{2,}[A-Z\\d]*-[A-Z]{2,4}\\d{3,4})\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern COURSE_CODE_PATTERN = Pattern.compile("\\b([A-Z]{2,6}\\d{2,4})\\b");
    private static final Pattern STUDENT_CODE_PATTERN = Pattern.compile("\\b((?:SE|HE|IA)\\d{5,6})\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern LECTURER_CODE_PATTERN = Pattern.compile("\\b(GV\\d{2,6})\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern REASON_PATTERN = Pattern.compile("(?:vì|do|lý do)\\s+(.+)$",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private final UserService userService;
    private final AcademicRequestService academicRequestService;
    private final NotificationService notificationService;
    private final com.fams.backend.service.EmailService emailService;
    private final UserRepository userRepository;
    private final com.fams.backend.repository.CourseRepository courseRepository;
    private final com.fams.backend.repository.MajorRepository majorRepository;
    private final com.fams.backend.service.CourseService courseService;
    private final com.fams.backend.service.MajorService majorService;
    private final com.fams.backend.service.SpecializationService specializationService;
    private final com.fams.backend.service.SubSpecializationService subSpecializationService;
    private final com.fams.backend.service.ClassSectionService classSectionService;
    private final com.fams.backend.service.ChatGroupService chatGroupService;
    private final com.fams.backend.service.RoomService roomService;
    private final com.fams.backend.service.SemesterService semesterService;
    private final com.fams.backend.repository.SemesterRepository semesterRepository;
    private final com.fams.backend.repository.SpecializationRepository specializationRepository;
    private final com.fams.backend.repository.SubSpecializationRepository subSpecializationRepository;
    private final com.fams.backend.repository.ScheduleRequestRepository scheduleRequestRepository;
    private final com.fams.backend.repository.ClassSectionRepository classSectionRepository;
    private final com.fams.backend.repository.RoomRepository roomRepository;
    private final com.fams.backend.service.ScheduleRequestService scheduleRequestService;
    private final EnrollmentRepository enrollmentRepository;
    private final com.fams.backend.repository.TimetableSlotRepository timetableSlotRepository;
    private final com.fams.backend.service.AttendanceService attendanceService;
    private final com.fams.backend.service.LecturerService lecturerService;
    private final com.fams.backend.service.StudentService studentService;
    private final UserNotificationService userNotificationService;

    
    @Override
    public String handleAction(Map<String, Object> action) {
        if (action == null)
            return null;

        try {
            String type = ((String) action.getOrDefault("type", "")).toUpperCase();
            Map<String, Object> params = (Map<String, Object>) action.get("params");
            log.info("Handling AI action: {} with params: {}", type, params);

            switch (type) {
                case "CREATE_USER":
                    return handleCreateUser(params);
                case "UPDATE_USER":
                    return handleUpdateUser(params);
                case "ACTIVATE_USER":
                    return handleActivateUser(params);
                case "CREATE_NOTIFICATION":
                    return handleCreateNotification(params);
                case "SEND_EMAIL":
                    return handleSendEmail(params);
                case "CREATE_COURSE":
                    return handleCreateCourse(params);
                case "UPDATE_COURSE":
                    return handleUpdateCourse(params);
                case "CREATE_MAJOR":
                    return handleCreateMajor(params);
                case "UPDATE_MAJOR":
                    return handleUpdateMajor(params);
                case "CREATE_SPECIALIZATION":
                    return handleCreateSpecialization(params);
                case "ASSIGN_COURSE_TO_SPECIALIZATION":
                    return handleAssignCourseToSpecialization(params);
                case "CREATE_ROOM":
                    return handleCreateRoom(params);
                case "CREATE_SEMESTER":
                    return handleCreateSemester(params);
                case "CREATE_SUB_SPECIALIZATION":
                    return handleCreateSubSpecialization(params);
                case "ASSIGN_COURSE_TO_SUB_SPECIALIZATION":
                    return handleAssignCourseToSubSpecialization(params);
                case "CREATE_CLASS":
                    return handleCreateClass(params);
                case "UPDATE_CLASS":
                    return handleUpdateClass(params);
                case "ADD_STUDENT_TO_CLASS":
                    return handleAddStudentToClass(params);
                case "REMOVE_STUDENT_FROM_CLASS":
                    return handleRemoveStudentFromClass(params);
                case "CREATE_SCHEDULE_REQUEST":
                    return handleCreateScheduleRequest(params);
                case "UPDATE_ATTENDANCE_MANUALLY":
                    return handleUpdateAttendanceManually(params);
                case "UPDATE_LECTURER_INFO":
                    return handleUpdateLecturerInfo(params);
                case "UPDATE_ROOM":
                    return handleUpdateRoom(params);
                case "UPDATE_SEMESTER":
                    return handleUpdateSemester(params);
                case "UPDATE_SPECIALIZATION":
                    return handleUpdateSpecialization(params);
                case "UPDATE_STUDENT_INFO":
                    return handleUpdateStudentInfo(params);
                case "UPDATE_SUB_SPECIALIZATION":
                    return handleUpdateSubSpecialization(params);
                case "DELETE_COURSE":
                case "DELETE_MAJOR":
                case "DELETE_ROOM":
                case "DELETE_SEMESTER":
                case "DELETE_SPECIALIZATION":
                case "DELETE_SUB_SPECIALIZATION":
                case "DELETE_CLASS":
                case "DELETE_USER":
                    return "❌ Chức năng xóa hiện không còn được hỗ trợ trong chatbot. Vui lòng thực hiện trên màn hình quản trị chuyên dụng.";
                case "APPROVE_SCHEDULE_REQUEST":
                    return handleUpdateScheduleRequestStatus(params, ScheduleRequest.RequestStatus.APPROVED);
                case "REJECT_SCHEDULE_REQUEST":
                    return handleUpdateScheduleRequestStatus(params, ScheduleRequest.RequestStatus.REJECTED);
                case "CREATE_GROUP_CHAT":
                    return handleCreateGroupChat(params);
                case "CREATE_ACADEMIC_REQUEST":
                    return handleCreateAcademicRequest(params);
                case "IMPORT_COMPONENT_GRADES":
                    return "ℹ️ Chức năng nhập điểm thành phần cần tải file Excel trên màn hình quản lý điểm, hiện chưa hỗ trợ thực thi trực tiếp trong chat.";
                case "EXPORT_ATTENDANCE_STATS":
                    return "ℹ️ Chức năng xuất thống kê điểm danh cần thực hiện trên màn hình điểm danh để tạo file tải về.";
                case "EXPORT_EXCEL":
                    return "ℹ️ Chức năng xuất Excel cần thực hiện trên màn hình dữ liệu tương ứng để tạo file tải về.";
                default:
                    log.warn("Unknown AI action type: {}", type);
                    return "❌ Action chưa được hỗ trợ: " + type;
            }
        } catch (Exception e) {
            log.error("Failed to handle AI action: {}", e.getMessage(), e);
            return "❌ Lỗi thực hiện yêu cầu: " + e.getMessage();
        }
    }

    // ── Helper Extraction Methods ────────────────────────────────────────────
    private String extractString(Map<String, Object> params, String... keys) {
        for (String key : keys) {
            Object val = params.get(key);
            if (val != null)
                return val.toString().trim();
        }
        return null;
    }

    private Integer extractInt(Map<String, Object> params, Integer defaultValue, String... keys) {
        for (String key : keys) {
            Object val = params.get(key);
            if (val == null)
                continue;
            if (val instanceof Number)
                return ((Number) val).intValue();
            try {
                return Integer.parseInt(val.toString());
            } catch (Exception e) {
                // next key
            }
        }
        return defaultValue;
    }

    private Long extractLong(Map<String, Object> params, String... keys) {
        Integer intValue = extractInt(params, null, keys);
        return intValue != null ? intValue.longValue() : null;
    }

    private Double extractDouble(Map<String, Object> params, String... keys) {
        for (String key : keys) {
            Object val = params.get(key);
            if (val == null) {
                continue;
            }
            if (val instanceof Number) {
                return ((Number) val).doubleValue();
            }
            try {
                return Double.parseDouble(val.toString().trim());
            } catch (Exception ignored) {
                // try next key
            }
        }
        return null;
    }

    private LocalDate extractDate(Map<String, Object> params, String... keys) {
        for (String key : keys) {
            String val = extractString(params, key);
            if (val == null)
                continue;
            try {
                return LocalDate.parse(val);
            } catch (Exception e) {
                log.warn("Invalid date format for key {}: {}", key, val);
            }
        }
        return null;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private String handleCreateUser(Map<String, Object> params) {
        try {
            String code = extractString(params, "code", "user_code");
            UserRequest userReq = UserRequest.builder()
                    .fullName(extractString(params, "full_name", "name"))
                    .code(code)
                    .email(extractString(params, "email"))
                    .dob(extractDate(params, "dob", "birthday"))
                    .username(code)
                    .role(User.UserRole.valueOf(extractString(params, "role").toUpperCase()))
                    .status(User.UserStatus.ACTIVE)
                    .build();
            userService.createUser(userReq, null);
            return "✅ Đã tạo thành công người dùng: **" + userReq.getFullName() + "** (" + code + ")";
        } catch (Exception e) {
            return "❌ Lỗi khi tạo người dùng: " + e.getMessage();
        }
    }

    private String handleUpdateUser(Map<String, Object> params) {
        String code = extractString(params, "code", "user_code");
        if (code == null)
            return "❌ Thiếu mã số người dùng để cập nhật.";

        User user = userRepository.findByCode(code).orElse(null);
        if (user == null)
            return "❌ Không tìm thấy người dùng có mã số: " + code;

        try {
            String fullName = params.containsKey("full_name") ? extractString(params, "full_name") : user.getFullName();
            String email = params.containsKey("email") ? extractString(params, "email") : user.getEmail();
            LocalDate dob = params.containsKey("dob") ? extractDate(params, "dob") : user.getDob();
            String phone = params.containsKey("phone") ? extractString(params, "phone") : user.getPhone();

            User.UserStatus status = user.getStatus();
            if (params.containsKey("status")) {
                status = User.UserStatus.valueOf(extractString(params, "status").toUpperCase());
            }

            UserRequest userReq = UserRequest.builder()
                    .code(user.getCode())
                    .username(user.getUsername())
                    .fullName(fullName)
                    .email(email)
                    .dob(dob)
                    .phone(phone)
                    .role(user.getRole())
                    .status(status)
                    .build();

            userService.updateUser(user.getId(), userReq, null);
            return "✅ Đã cập nhật thành công thông tin người dùng: **" + user.getFullName() + "**";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật người dùng: " + e.getMessage();
        }
    }

    private String handleDeleteUser(Map<String, Object> params) {
        String code = extractString(params, "code", "user_code");
        if (code == null)
            return "❌ Thiếu mã số người dùng để xóa.";

        return userRepository.findByCode(code.toUpperCase())
                .map(u -> {
                    userService.deleteUser(u.getId());
                    return "✅ Đã xóa thành công người dùng có mã số: **" + code + "**";
                })
                .orElse("❌ Không tìm thấy người dùng có mã số: " + code);
    }

    private String handleActivateUser(Map<String, Object> params) {
        String code = normalizeCode(extractString(params, "code", "user_code"));
        if (code == null || code.isBlank()) {
            return "❌ Thiếu mã người dùng để kích hoạt.";
        }
        User user = userRepository.findByCodeIgnoreCase(code)
                .orElse(null);
        if (user == null) {
            return "❌ Không tìm thấy người dùng có mã: " + code;
        }
        try {
            userService.activateUsers(List.of(user.getId()));
            return "✅ Đã kích hoạt tài khoản **" + user.getCode() + " - " + user.getFullName() + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi kích hoạt tài khoản: " + e.getMessage();
        }
    }

    private String handleCreateNotification(Map<String, Object> params) {
        String title = extractString(params, "title");
        String content = extractString(params, "content", "message", "body");
        String targetTypeStr = extractString(params, "target_type");
        String roleTarget = normalizeRoleValue(extractString(params, "role", "recipient_role", "target_role"));
        String recipientCode = extractString(params, "recipient_code");
        String className = extractString(params, "class_name", "target_class_name", "targetClassName");
        String originalMessage = extractString(params, "originalMessage", "original_message", "message");
        String requesterUsername = extractString(params, "requesterUsername", "requester_username");

        Notification.TargetType targetType = null;
        if (className != null && !className.isBlank()) {
            className = className.trim().toUpperCase();
            targetType = Notification.TargetType.CLASS;
        }
        final String normalizedClassName = className;
        if (targetTypeStr != null) {
            try {
                targetType = Notification.TargetType.valueOf(targetTypeStr.toUpperCase());
            } catch (Exception e) {
                log.warn("Invalid target type: {}", targetTypeStr);
            }
        }
        if ((targetType == null || targetType == Notification.TargetType.ALL) && roleTarget != null) {
            try {
                targetType = Notification.TargetType.valueOf(roleTarget);
            } catch (Exception e) {
                log.warn("Invalid role target for notification: {}", roleTarget);
            }
        }
        if (targetType == null && originalMessage != null) {
            String normalizedMessage = originalMessage.toLowerCase();
            if (normalizedMessage.contains("sinh viên") || normalizedMessage.contains("sinh vien")) {
                targetType = Notification.TargetType.STUDENT;
            } else if (normalizedMessage.contains("giảng viên") || normalizedMessage.contains("giang vien")) {
                targetType = Notification.TargetType.LECTURER;
            } else if (normalizedMessage.contains("đào tạo") || normalizedMessage.contains("dao tao")) {
                targetType = Notification.TargetType.ACADEMIC_STAFF;
            } else if (normalizedMessage.contains("admin") || normalizedMessage.contains("quản trị")) {
                targetType = Notification.TargetType.ADMIN;
            } else if (normalizedMessage.contains("toàn trường") || normalizedMessage.contains("tat ca")) {
                targetType = Notification.TargetType.ALL;
            }
        }
        if (targetType == null) {
            targetType = Notification.TargetType.ALL;
        }

        User requester = null;
        if (requesterUsername != null && !requesterUsername.isBlank()) {
            requester = userRepository.findByUsername(requesterUsername).orElse(null);
        }

        if (requester != null && requester.getRole() == User.UserRole.LECTURER) {
            if (targetType != Notification.TargetType.CLASS || normalizedClassName == null
                    || normalizedClassName.isBlank()) {
                return "❌ Giảng viên chỉ được gửi thông báo cho lớp mình đang giảng dạy.";
            }
            var classSection = classSectionRepository.findByClassNameWithDetails(normalizedClassName)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học: " + normalizedClassName));
            if (classSection.getLecturer() == null
                    || !requester.getId().equals(classSection.getLecturer().getId())) {
                return "❌ Bạn chỉ được gửi thông báo cho lớp mình đang giảng dạy.";
            }
        }

        if (content == null || content.isBlank()) {
            return "❌ Thiếu nội dung thông báo.";
        }

        String finalTitle = title != null ? title
                : (normalizedClassName != null ? "Thông báo lớp " + normalizedClassName : "Thông báo hệ thống");

        if (targetType == Notification.TargetType.USER && recipientCode != null) {
            User recipient = userRepository.findByCode(recipientCode.toUpperCase()).orElse(null);
            if (recipient != null) {
                userNotificationService.createNotification(recipient, finalTitle, content, Notification.NotificationType.SYSTEM, null, requester);
            } else {
                return "❌ Không tìm thấy người nhận có mã: " + recipientCode;
            }
        } else if (targetType == Notification.TargetType.CLASS && normalizedClassName != null) {
            List<User> recipients = resolveClassRecipients(normalizedClassName);
            if (recipients.isEmpty()) {
                return "❌ Không tìm thấy sinh viên trong lớp: " + normalizedClassName;
            }
            userNotificationService.createBatchNotification(recipients, finalTitle, content, Notification.NotificationType.SYSTEM, null);
        } else if (targetType == Notification.TargetType.STUDENT
                || targetType == Notification.TargetType.LECTURER
                || targetType == Notification.TargetType.ACADEMIC_STAFF
                || targetType == Notification.TargetType.ADMIN) {
            User.UserRole targetRole = switch (targetType) {
                case STUDENT -> User.UserRole.STUDENT;
                case LECTURER -> User.UserRole.LECTURER;
                case ACADEMIC_STAFF -> User.UserRole.ACADEMIC_STAFF;
                case ADMIN -> User.UserRole.ADMIN;
                default -> null;
            };
            List<User> recipients = targetRole == null
                    ? List.of()
                    : userRepository.findByRole(targetRole).orElse(List.of()).stream()
                            .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                            .toList();
            if (recipients.isEmpty()) {
                return "❌ Không tìm thấy người nhận phù hợp cho nhóm đã chọn.";
            }
            userNotificationService.createBatchNotification(
                    recipients,
                    finalTitle,
                    content,
                    Notification.NotificationType.SYSTEM,
                    null);
        } else if (targetType == Notification.TargetType.ALL) {
            List<User> recipients = userRepository.findAll().stream()
                    .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                    .toList();
            userNotificationService.createBatchNotification(recipients, finalTitle, content, Notification.NotificationType.SYSTEM, null);
        } else {
            return "❌ Chưa hỗ trợ gửi thông báo cho đối tượng này qua AI Chat.";
        }

        String audienceLabel = normalizedClassName != null
                ? " cho lớp **" + normalizedClassName + "**"
                : switch (targetType) {
                    case STUDENT -> " cho **toàn bộ sinh viên**";
                    case LECTURER -> " cho **toàn bộ giảng viên**";
                    case ACADEMIC_STAFF -> " cho **toàn bộ nhân viên đào tạo**";
                    case ADMIN -> " cho **toàn bộ quản trị viên**";
                    case ALL -> " cho **toàn trường**";
                    default -> "";
                };

        return "✅ Đã gửi thông báo thành công"
                + audienceLabel
                + ": **" + finalTitle + "**";
    }

    private List<User> resolveClassRecipients(String className) {
        return enrollmentRepository.findByClassSectionClassName(className)
                .stream()
                .map(com.fams.backend.entity.Enrollment::getStudent)
                .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                .toList();
    }

    private String handleSendEmail(Map<String, Object> params) {
        try {
            User requester = resolveRequester(params);
            if (requester == null) {
                return "❌ Không xác định được người gửi email.";
            }

            String content = resolveEmailContent(params);
            if (content == null || content.isBlank()) {
                return "❌ Thiếu nội dung email. Vui lòng nêu rõ nội dung cần gửi.";
            }

            LinkedHashMap<String, User> recipients = resolveEmailRecipients(requester, params);
            if (recipients.isEmpty()) {
                return "❌ Không tìm thấy người nhận phù hợp để gửi email.";
            }

            String subject = resolveEmailSubject(params, requester, recipients);
            String senderName = requester.getFullName() != null && !requester.getFullName().isBlank()
                    ? requester.getFullName()
                    : requester.getUsername();
            String senderEmail = requester.getEmail();

            int delivered = 0;
            for (User recipient : recipients.values()) {
                if (recipient.getEmail() == null || recipient.getEmail().isBlank()) {
                    continue;
                }
                emailService.sendEmail(
                        recipient.getEmail(),
                        subject,
                        content,
                        senderName,
                        senderEmail);
                delivered++;
            }

            if (delivered == 0) {
                return "❌ Không có người nhận hợp lệ có email để gửi.";
            }

            return "✅ Đã gửi email thành công tới " + delivered + " người nhận"
                    + resolveEmailAudienceLabel(requester, params, recipients)
                    + ".";
        } catch (Exception e) {
            return "❌ Gửi email thất bại: " + e.getMessage();
        }
    }

    private String handleCreateCourse(Map<String, Object> params) {
        try {
            com.fams.backend.dto.request.CourseRequest request = com.fams.backend.dto.request.CourseRequest.builder()
                    .code(extractString(params, "code", "course_code"))
                    .name(extractString(params, "name", "course_name"))
                    .credits(extractInt(params, 3, "credits", "course_credits"))
                    .numberOfSlots(extractInt(params, 30, "number_of_slots", "slots"))
                    .description(extractString(params, "description"))
                    .build();
            courseService.createCourse(request);
            return "✅ Đã tạo thành công môn học: **" + request.getName() + "**";
        } catch (Exception e) {
            return "❌ Lỗi: " + e.getMessage();
        }
    }

    private String handleUpdateCourse(Map<String, Object> params) {
        String code = extractString(params, "code", "course_code");
        if (code == null)
            return "❌ Thiếu mã môn học để cập nhật.";

        return courseRepository.findByCode(code.toUpperCase())
                .map(course -> {
                    try {
                        com.fams.backend.dto.request.CourseRequest req = com.fams.backend.dto.request.CourseRequest
                                .builder()
                                .code(course.getCode())
                                .name(params.containsKey("name") ? extractString(params, "name") : course.getName())
                                .credits(extractInt(params, course.getCredits(), "credits", "course_credits"))
                                .description(params.containsKey("description") ? extractString(params, "description")
                                        : course.getDescription())
                                .build();
                        courseService.updateCourse(course.getId(), req);
                        return "✅ Đã cập nhật thành công môn học: **" + course.getCode() + "**";
                    } catch (Exception e) {
                        return "❌ Lỗi cập nhật: " + e.getMessage();
                    }
                })
                .orElse("❌ Không tìm thấy môn học mã: " + code);
    }

    private String handleCreateMajor(Map<String, Object> params) {
        try {
            com.fams.backend.dto.request.MajorRequest request = com.fams.backend.dto.request.MajorRequest.builder()
                    .code(extractString(params, "code", "major_code"))
                    .name(extractString(params, "name", "major_name"))
                    .description(extractString(params, "description"))
                    .programDuration(extractString(params, "program_duration", "duration") != null
                            ? extractString(params, "program_duration", "duration")
                            : "9 kỳ")
                    .build();
            majorService.createMajor(request);
            return "✅ Đã tạo thành công ngành học: **" + request.getName() + "**";
        } catch (Exception e) {
            return "❌ Lỗi: " + e.getMessage();
        }
    }

    private String handleUpdateMajor(Map<String, Object> params) {
        String code = extractString(params, "code", "major_code");
        if (code == null)
            return "❌ Thiếu mã ngành để cập nhật.";

        return majorRepository.findByCode(code.toUpperCase())
                .map(major -> {
                    try {
                        com.fams.backend.dto.request.MajorRequest req = com.fams.backend.dto.request.MajorRequest
                                .builder()
                                .code(major.getCode())
                                .name(params.containsKey("name") ? extractString(params, "name") : major.getName())
                                .description(params.containsKey("description") ? extractString(params, "description")
                                        : major.getDescription())
                                .programDuration(params.containsKey("program_duration")
                                        ? extractString(params, "program_duration")
                                        : major.getProgramDuration())
                                .build();
                        majorService.updateMajor(major.getId(), req);
                        return "✅ Đã cập nhật thành công ngành học: **" + major.getName() + "**";
                    } catch (Exception e) {
                        return "❌ Lỗi cập nhật: " + e.getMessage();
                    }
                })
                .orElse("❌ Không tìm thấy ngành mã: " + code);
    }

    /**
     * @param params
     * @return
     */
    private String handleCreateSpecialization(Map<String, Object> params) {
        try {
            String majorCode = normalizeCode(extractString(params, "major_code"));
            String majorName = extractString(params, "major_name", "name");
            Optional<com.fams.backend.entity.Major> majorOpt = findMajor(majorCode, majorName);
            if (majorOpt.isEmpty()) {
                return "❌ Không tìm thấy ngành phù hợp để tạo chuyên ngành.";
            }
            com.fams.backend.entity.Major major = majorOpt.get();
            com.fams.backend.dto.request.SpecializationRequest request = com.fams.backend.dto.request.SpecializationRequest
                    .builder()
                    .majorId(major.getId())
                    .code(normalizeCode(extractString(params, "spec_code", "specialization_code")))
                    .name(extractString(params, "spec_name", "specialization_name"))
                    .status(com.fams.backend.entity.Specialization.SpecializationStatus.ACTIVE)
                    .build();
            specializationService.createSpecialization(request);
            return "✅ Đã tạo thành công chuyên ngành **" + request.getName() + "** cho ngành **"
                    + major.getName() + "**";
        } catch (Exception e) {
            return "❌ Lỗi: " + e.getMessage();
        }
    }

    private String handleCreateRoom(Map<String, Object> params) {
        try {
            com.fams.backend.dto.request.RoomRequest request = new com.fams.backend.dto.request.RoomRequest();
            request.setName(extractString(params, "name"));
            request.setCapacity(extractInt(params, 30, "capacity", "room_capacity"));
            request.setStatus(com.fams.backend.entity.Room.RoomStatus.ACTIVE);
            roomService.createRoom(request);
            return "✅ Đã thêm phòng học mới: **" + request.getName() + "**";
        } catch (Exception e) {
            return "❌ Lỗi: " + e.getMessage();
        }
    }

    private String handleCreateSemester(Map<String, Object> params) {
        try {
            com.fams.backend.dto.response.SemesterResponse request = com.fams.backend.dto.response.SemesterResponse
                    .builder()
                    .code(extractString(params, "code"))
                    .name(extractString(params, "name"))
                    .startDate(extractString(params, "start_date"))
                    .endDate(extractString(params, "end_date"))
                    .status("UPCOMING")
                    .build();
            semesterService.createSemester(request);
            return "✅ Đã tạo thành công học kỳ mới: **" + request.getName() + "**";
        } catch (Exception e) {
            return "❌ Lỗi: " + e.getMessage();
        }
    }

    private String handleCreateSubSpecialization(Map<String, Object> params) {
        try {
            String specCode = normalizeCode(extractString(params, "spec_code", "specialization_code"));
            String specName = extractString(params, "specialization_name", "spec_name");
            Optional<com.fams.backend.entity.Specialization> specOpt = findSpecialization(specCode, specName);
            if (specOpt.isEmpty()) {
                return "❌ Không tìm thấy chuyên ngành phù hợp để tạo chuyên ngành hẹp.";
            }
            com.fams.backend.entity.Specialization spec = specOpt.get();
            com.fams.backend.dto.request.SubSpecializationRequest request = com.fams.backend.dto.request.SubSpecializationRequest
                    .builder()
                    .specializationId(spec.getId())
                    .code(normalizeCode(extractString(params, "sub_code", "sub_specialization_code")))
                    .name(extractString(params, "sub_name", "sub_specialization_name"))
                    .description(extractString(params, "description"))
                    .build();
            subSpecializationService.createSubSpecialization(request);
            return "✅ Đã tạo thành công chuyên ngành hẹp **" + request.getName()
                    + "** cho chuyên ngành **"
                    + spec.getName() + "**";
        } catch (Exception e) {
            return "❌ Lỗi: " + e.getMessage();
        }
    }

    private String handleCreateClass(Map<String, Object> params) {
        try {
            String className = normalizeClassName(extractString(params, "class_name"));
            String courseCode = normalizeCode(extractString(params, "course_code"));
            String lecturerCode = normalizeCode(extractString(params, "lecturer_code"));
             String lecturerUsername = null;
            if (lecturerCode != null) {
                Optional<User> lecturerOpt = userRepository.findByCodeIgnoreCase(lecturerCode);
                if (lecturerOpt.isEmpty()) {
                    return "❌ Không tìm thấy giảng viên có mã: " + lecturerCode;
                }
                lecturerUsername = lecturerOpt.get().getUsername();
            }
            com.fams.backend.dto.request.ClassSectionRequest request = com.fams.backend.dto.request.ClassSectionRequest
                    .builder()
                    .className(extractString(params, "class_name"))
                    .courseCode(extractString(params, "course_code"))
                    .semesterCode(extractString(params, "semester_code"))
                    .lecturerUsername(lecturerUsername)
                    .numberOfSlots(extractInt(params, 30, "number_of_slots"))
                    .maxStudents(extractInt(params, 30, "max_students"))
                    .build();
            classSectionService.createClassSection(request);
            return "✅ Đã tạo thành công lớp học phần: **" + request.getClassName() + "**";
        } catch (Exception e) {
            return "❌ Lỗi: " + e.getMessage();
        }
    }

    private String handleUpdateClass(Map<String, Object> params) {
        try {
            String className = normalizeClassName(extractString(params, "class_name"));
            if (className == null || className.isBlank()) {
                return "❌ Thiếu mã lớp học phần để cập nhật.";
            }

            com.fams.backend.entity.ClassSection existing = classSectionRepository.findByClassNameWithDetails(className)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy lớp học phần: " + className));

            String lecturerCode = normalizeCode(extractString(params, "lecturer_code"));
            String lecturerUsername = existing.getLecturer() != null ? existing.getLecturer().getUsername() : "";
            if (lecturerCode != null && !lecturerCode.isBlank()) {
                User lecturer = userRepository.findByCodeIgnoreCase(lecturerCode)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy giảng viên có mã: " + lecturerCode));
                lecturerUsername = lecturer.getUsername();
            }

            String semesterCode = normalizeCode(extractString(params, "semester_code"));
            if (semesterCode != null
                    && existing.getSemester() != null
                    && existing.getSemester().getCode() != null
                    && !existing.getSemester().getCode().equalsIgnoreCase(semesterCode)) {
                return "❌ Chức năng cập nhật lớp trong chatbot hiện chưa hỗ trợ chuyển lớp sang học kỳ khác. Vui lòng cập nhật trên màn hình quản lý lớp.";
            }

            com.fams.backend.dto.request.ClassSectionRequest request = com.fams.backend.dto.request.ClassSectionRequest
                    .builder()
                    .className(existing.getClassName())
                    .courseCode(existing.getCourse() != null ? existing.getCourse().getCode() : null)
                    .semesterCode(existing.getSemester() != null ? existing.getSemester().getCode() : null)
                    .lecturerUsername(lecturerUsername)
                    .numberOfSlots(existing.getNumberOfSlots())
                    .maxStudents(existing.getMaxStudents())
                    .build();

            classSectionService.updateClassSection(existing.getClassName(), request);
            return "✅ Đã cập nhật thông tin lớp học phần **" + existing.getClassName() + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật lớp học phần: " + e.getMessage();
        }
    }

    private String handleAddStudentToClass(Map<String, Object> params) {
        try {
            String className = normalizeClassName(extractString(params, "class_name"));
            String studentCode = normalizeCode(extractString(params, "student_code"));
            if (className == null || studentCode == null) {
                return "❌ Cần đủ mã lớp và mã sinh viên để thêm vào lớp.";
            }
            EnrollmentRequest request = EnrollmentRequest.builder()
                    .className(className)
                    .studentCode(studentCode)
                    .status("ENROLLED")
                    .build();
            classSectionService.createEnrollment(request);
            return "✅ Đã thêm sinh viên **" + studentCode + "** vào lớp **" + className + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi thêm sinh viên vào lớp: " + e.getMessage();
        }
    }

    private String handleRemoveStudentFromClass(Map<String, Object> params) {
        try {
            String className = normalizeClassName(extractString(params, "class_name"));
            String studentCode = normalizeCode(extractString(params, "student_code"));
            if (className == null || studentCode == null) {
                return "❌ Cần đủ mã lớp và mã sinh viên để xóa khỏi lớp.";
            }
            Enrollment enrollment = enrollmentRepository
                    .findByClassSection_ClassNameAndStudentCode(className, studentCode)
                    .orElseThrow(() -> new BadRequestException(
                            "Không tìm thấy đăng ký của sinh viên " + studentCode + " trong lớp " + className));
            classSectionService.deleteEnrollment(enrollment.getId());
            return "✅ Đã xóa sinh viên **" + studentCode + "** khỏi lớp **" + className + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi xóa sinh viên khỏi lớp: " + e.getMessage();
        }
    }

    private String handleAssignCourseToSpecialization(Map<String, Object> params) {
        try {
            String specCode = normalizeCode(extractString(params, "specialization_code", "spec_code"));
            String specName = extractString(params, "specialization_name", "spec_name");
            String courseCode = normalizeCode(extractString(params, "course_code", "code"));
            String courseName = extractString(params, "course_name", "name");
            Integer semester = extractInt(params, 1, "semester");

            com.fams.backend.entity.Specialization specialization = findSpecialization(specCode, specName)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy chuyên ngành phù hợp."));
            com.fams.backend.entity.Course course = findCourse(courseCode, courseName)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy môn học phù hợp."));

            specializationService.addCourse(specialization.getId(), course.getId(), semester);
            return "✅ Đã gán môn **" + course.getCode() + " - " + course.getName()
                    + "** vào chuyên ngành **" + specialization.getCode() + " - " + specialization.getName() + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi gán môn vào chuyên ngành: " + e.getMessage();
        }
    }

    private String handleAssignCourseToSubSpecialization(Map<String, Object> params) {
        try {
            String subCode = normalizeCode(extractString(params, "sub_specialization_code", "sub_code"));
            String subName = extractString(params, "sub_specialization_name", "sub_name");
            String courseCode = normalizeCode(extractString(params, "course_code", "code"));
            String courseName = extractString(params, "course_name", "name");
            Integer semester = extractInt(params, 1, "semester");

            com.fams.backend.entity.SubSpecialization subSpecialization = findSubSpecialization(subCode, subName)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy chuyên ngành hẹp phù hợp."));
            com.fams.backend.entity.Course course = findCourse(courseCode, courseName)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy môn học phù hợp."));

            subSpecializationService.addCourse(subSpecialization.getId(), course.getId(), semester);
            return "✅ Đã gán môn **" + course.getCode() + " - " + course.getName()
                    + "** vào chuyên ngành hẹp **" + subSpecialization.getCode() + " - " + subSpecialization.getName()
                    + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi gán môn vào chuyên ngành hẹp: " + e.getMessage();
        }
    }

    private String handleDeleteCourse(Map<String, Object> params) {
        try {
            com.fams.backend.entity.Course course = findCourse(
                    normalizeCode(extractString(params, "code", "course_code")),
                    extractString(params, "name", "course_name"))
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy môn học phù hợp để xóa."));
            courseService.deleteCourse(course.getId());
            return "✅ Đã xóa môn học **" + course.getCode() + " - " + course.getName() + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi xóa môn học: " + e.getMessage();
        }
    }

    private String handleDeleteMajor(Map<String, Object> params) {
        try {
            com.fams.backend.entity.Major major = findMajor(
                    normalizeCode(extractString(params, "code", "major_code")),
                    extractString(params, "name", "major_name"))
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy ngành phù hợp để xóa."));
            majorService.deleteMajor(major.getId());
            return "✅ Đã xóa ngành **" + major.getCode() + " - " + major.getName() + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi xóa ngành: " + e.getMessage();
        }
    }

    private String handleDeleteRoom(Map<String, Object> params) {
        try {
            String roomName = extractString(params, "room_name", "name");
            if (roomName == null || roomName.isBlank()) {
                return "❌ Thiếu tên phòng để xóa.";
            }
            com.fams.backend.entity.Room room = roomRepository.findAll().stream()
                    .filter(item -> item.getName() != null && item.getName().equalsIgnoreCase(roomName.trim()))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy phòng phù hợp để xóa."));
            roomService.deleteRoom(room.getId());
            return "✅ Đã xóa phòng **" + room.getName() + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi xóa phòng: " + e.getMessage();
        }
    }

    private String handleDeleteSemester(Map<String, Object> params) {
        try {
            String semesterCode = normalizeCode(extractString(params, "semester_code", "code"));
            if (semesterCode == null) {
                return "❌ Thiếu mã học kỳ để xóa.";
            }
            semesterService.deleteSemester(semesterCode);
            return "✅ Đã xóa học kỳ **" + semesterCode + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi xóa học kỳ: " + e.getMessage();
        }
    }

    private String handleDeleteSpecialization(Map<String, Object> params) {
        try {
            com.fams.backend.entity.Specialization specialization = findSpecialization(
                    normalizeCode(extractString(params, "code", "specialization_code", "spec_code")),
                    extractString(params, "name", "specialization_name", "spec_name"))
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy chuyên ngành phù hợp để xóa."));
            specializationService.deleteSpecialization(specialization.getId());
            return "✅ Đã xóa chuyên ngành **" + specialization.getCode() + " - " + specialization.getName() + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi xóa chuyên ngành: " + e.getMessage();
        }
    }

    private String handleDeleteSubSpecialization(Map<String, Object> params) {
        try {
            com.fams.backend.entity.SubSpecialization subSpecialization = findSubSpecialization(
                    normalizeCode(extractString(params, "code", "sub_specialization_code", "sub_code")),
                    extractString(params, "name", "sub_specialization_name", "sub_name"))
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy chuyên ngành hẹp phù hợp để xóa."));
            subSpecializationService.deleteSubSpecialization(subSpecialization.getId());
            return "✅ Đã xóa chuyên ngành hẹp **" + subSpecialization.getCode() + " - " + subSpecialization.getName()
                    + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi xóa chuyên ngành hẹp: " + e.getMessage();
        }
    }

    private String handleDeleteClass(Map<String, Object> params) {
        try {
            String className = normalizeClassName(extractString(params, "class_name"));
            if (className == null) {
                return "❌ Thiếu mã lớp để xóa.";
            }
            classSectionService.deleteClassSection(className);
            return "✅ Đã xóa lớp học phần **" + className + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi xóa lớp học phần: " + e.getMessage();
        }
    }

    private String handleUpdateScheduleRequestStatus(Map<String, Object> params, ScheduleRequest.RequestStatus status) {
        try {
            Long requestId = extractInt(params, null, "request_id", "id") != null
                    ? extractInt(params, null, "request_id", "id").longValue()
                    : null;
            if (requestId == null) {
                return "❌ Thiếu mã yêu cầu đổi lịch.";
            }
            User approver = resolveRequester(params);
            if (approver == null) {
                return "❌ Không xác định được người duyệt yêu cầu đổi lịch.";
            }
            scheduleRequestService.updateRequestStatus(
                    requestId,
                    status,
                    extractString(params, "note", "approver_note", "reason"),
                    approver.getId());
            return "✅ Đã " + (status == ScheduleRequest.RequestStatus.APPROVED ? "duyệt" : "từ chối")
                    + " yêu cầu đổi lịch số **" + requestId + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật yêu cầu đổi lịch: " + e.getMessage();
        }
    }

    private String handleCreateScheduleRequest(Map<String, Object> params) {
        try {
            User requester = resolveRequester(params);
            if (requester == null) {
                return "❌ Không xác định được giảng viên tạo yêu cầu đổi lịch.";
            }
            if (requester.getRole() != User.UserRole.LECTURER) {
                return "❌ Chỉ giảng viên mới được tạo yêu cầu đổi lịch trong chatbot.";
            }

            Long originalSlotId = extractLong(params, "original_slot_id");
            if (originalSlotId == null) {
                String className = normalizeClassName(extractString(params, "class_name"));
                LocalDate originalDate = extractDate(params, "original_date", "date");
                Integer originalSlotNumber = extractInt(params, null, "original_slot_number", "slot_number");
                if (className == null || originalDate == null || originalSlotNumber == null) {
                    return "❌ Thiếu thông tin slot gốc. Vui lòng cung cấp class_name, original_date và original_slot_number hoặc original_slot_id.";
                }
                originalSlotId = timetableSlotRepository
                        .findByClassSectionClassNameAndDateAndSlotNumber(className, originalDate, originalSlotNumber)
                        .map(com.fams.backend.entity.TimetableSlot::getId)
                        .orElse(null);
                if (originalSlotId == null) {
                    return "❌ Không tìm thấy slot gốc của lớp **" + className + "** vào ngày **" + originalDate
                            + "** slot **" + originalSlotNumber + "**.";
                }
            }

            CreateScheduleRequest request = new CreateScheduleRequest();
            request.setOriginalSlotId(originalSlotId);
            request.setType(ScheduleRequest.RequestType.RESCHEDULE);
            request.setReason(extractString(params, "reason"));
            request.setRequestedDate(extractDate(params, "requested_date"));

            Long requestedSlotId = extractLong(params, "requested_slot_id");
            Integer requestedSlotNumber = extractInt(params, null, "requested_slot_number");
            if (requestedSlotId != null && requestedSlotNumber == null) {
                com.fams.backend.entity.TimetableSlot requestedSlot = timetableSlotRepository.findById(requestedSlotId)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy slot yêu cầu: " + requestedSlotId));
                request.setRequestedDate(requestedSlot.getDate());
                request.setRequestedSlotTypeId(
                        requestedSlot.getSlotNumber() != null ? requestedSlot.getSlotNumber().longValue() : null);
            } else if (requestedSlotNumber != null) {
                request.setRequestedSlotTypeId(requestedSlotNumber.longValue());
            }

            if (request.getRequestedDate() == null || request.getRequestedSlotTypeId() == null) {
                return "❌ Thiếu thông tin slot muốn đổi. Vui lòng cung cấp requested_date và requested_slot_number hoặc requested_slot_id.";
            }

            com.fams.backend.dto.response.ScheduleRequestResponse response = scheduleRequestService
                    .createRequest(request, requester.getId());
            return "✅ Đã tạo yêu cầu đổi lịch thành công cho lớp **"
                    + response.getClassName() + "** (Mã yêu cầu: **" + response.getId() + "**, trạng thái: **"
                    + response.getStatus() + "**).";
        } catch (Exception e) {
            return "❌ Lỗi khi tạo yêu cầu đổi lịch: " + e.getMessage();
        }
    }

    private String handleUpdateAttendanceManually(Map<String, Object> params) {
        try {
            User requester = resolveRequester(params);
            if (requester == null) {
                return "❌ Không xác định được giảng viên cập nhật điểm danh.";
            }
            if (requester.getRole() != User.UserRole.LECTURER) {
                return "❌ Chỉ giảng viên mới được cập nhật điểm danh trong chatbot.";
            }

            Long sessionId = extractLong(params, "session_id");
            String studentCode = normalizeCode(extractString(params, "student_code"));
            String rawStatus = normalizeCode(extractString(params, "status"));
            if (sessionId == null || studentCode == null || rawStatus == null) {
                return "❌ Thiếu session_id, student_code hoặc status để cập nhật điểm danh.";
            }
            if ("LATE".equalsIgnoreCase(rawStatus)) {
                return "❌ Hệ thống điểm danh hiện chỉ hỗ trợ trạng thái PRESENT, ABSENT hoặc EXCUSED.";
            }

            User student = userRepository.findByCodeIgnoreCase(studentCode)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy sinh viên có mã: " + studentCode));

            com.fams.backend.dto.attendance.AttendanceDTO.ManualAttendanceRequest request = com.fams.backend.dto.attendance.AttendanceDTO.ManualAttendanceRequest
                    .builder()
                    .sessionId(sessionId)
                    .studentId(student.getId())
                    .status(rawStatus)
                    .note(extractString(params, "note", "reason"))
                    .build();

            attendanceService.updateManualAttendance(requester.getId(), request);
            return "✅ Đã cập nhật điểm danh của sinh viên **" + studentCode + "** trong session **" + sessionId
                    + "** thành **" + rawStatus + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật điểm danh thủ công: " + e.getMessage();
        }
    }

    private String handleUpdateLecturerInfo(Map<String, Object> params) {
        try {
            String lecturerCode = normalizeCode(extractString(params, "lecturer_code"));
            if (lecturerCode == null || lecturerCode.isBlank()) {
                return "❌ Thiếu mã giảng viên để cập nhật.";
            }
            User lecturer = userRepository.findByCodeIgnoreCase(lecturerCode)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy giảng viên có mã: " + lecturerCode));
            if (lecturer.getRole() != User.UserRole.LECTURER) {
                return "❌ Người dùng **" + lecturerCode + "** không phải giảng viên.";
            }

            com.fams.backend.dto.request.LecturerUpdateRequest request = com.fams.backend.dto.request.LecturerUpdateRequest
                    .builder()
                    .department(extractString(params, "department"))
                    .expertise(extractString(params, "expertise"))
                    .bio(extractString(params, "bio"))
                    .build();

            lecturerService.updateLecturer(lecturer.getId(), request, null);
            return "✅ Đã cập nhật hồ sơ giảng viên **" + lecturerCode + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật hồ sơ giảng viên: " + e.getMessage();
        }
    }

    private String handleUpdateRoom(Map<String, Object> params) {
        try {
            String roomLookup = extractString(params, "room_name", "name", "code", "room_code");
            if (roomLookup == null || roomLookup.isBlank()) {
                return "❌ Thiếu mã hoặc tên phòng để cập nhật.";
            }
            com.fams.backend.entity.Room room = findRoom(roomLookup)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy phòng học phù hợp: " + roomLookup));

            com.fams.backend.dto.request.RoomRequest request = new com.fams.backend.dto.request.RoomRequest();
            request.setCode(room.getCode());
            request.setName(room.getName());
            request.setCapacity(extractInt(params, room.getCapacity(), "capacity", "room_capacity"));
            request.setBuilding(room.getBuilding());
            request.setDescription(room.getDescription());
            request.setFloor(room.getFloor());
            request.setType(room.getType());
            request.setGridRow(room.getGridRow());
            request.setGridCol(room.getGridCol());
            request.setGridRowSpan(room.getGridRowSpan());
            request.setGridColSpan(room.getGridColSpan());
            request.setStatus(params.containsKey("status")
                    ? com.fams.backend.entity.Room.RoomStatus.valueOf(extractString(params, "status").toUpperCase())
                    : room.getStatus());

            roomService.updateRoom(room.getId(), request);
            return "✅ Đã cập nhật thông tin phòng **" + room.getName() + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật phòng học: " + e.getMessage();
        }
    }

    private String handleUpdateSemester(Map<String, Object> params) {
        try {
            String semesterCode = normalizeCode(extractString(params, "semester_code", "code"));
            if (semesterCode == null || semesterCode.isBlank()) {
                return "❌ Thiếu mã học kỳ để cập nhật.";
            }
            com.fams.backend.dto.response.SemesterResponse current = semesterService.getSemesterByCode(semesterCode);
            com.fams.backend.dto.response.SemesterResponse request = com.fams.backend.dto.response.SemesterResponse
                    .builder()
                    .code(current.getCode())
                    .name(extractString(params, "name") != null ? extractString(params, "name") : current.getName())
                    .startDate(extractString(params, "start_date") != null ? extractString(params, "start_date")
                            : current.getStartDate())
                    .endDate(extractString(params, "end_date") != null ? extractString(params, "end_date")
                            : current.getEndDate())
                    .status(current.getStatus())
                    .build();
            semesterService.updateSemester(semesterCode, request);
            return "✅ Đã cập nhật học kỳ **" + semesterCode + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật học kỳ: " + e.getMessage();
        }
    }

    private String handleUpdateSpecialization(Map<String, Object> params) {
        try {
            String code = normalizeCode(extractString(params, "code", "specialization_code", "spec_code"));
            if (code == null || code.isBlank()) {
                return "❌ Thiếu mã chuyên ngành để cập nhật.";
            }
            com.fams.backend.entity.Specialization specialization = specializationRepository.findByCode(code)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy chuyên ngành có mã: " + code));
            com.fams.backend.dto.request.SpecializationRequest request = com.fams.backend.dto.request.SpecializationRequest
                    .builder()
                    .code(code)
                    .name(extractString(params, "name", "specialization_name", "spec_name") != null
                            ? extractString(params, "name", "specialization_name", "spec_name")
                            : specialization.getName())
                    .description(extractString(params, "description") != null
                            ? extractString(params, "description")
                            : specialization.getDescription())
                    .majorId(specialization.getMajor() != null ? specialization.getMajor().getId() : null)
                    .status(params.containsKey("status")
                            ? com.fams.backend.entity.Specialization.SpecializationStatus
                                    .valueOf(extractString(params, "status").toUpperCase())
                            : specialization.getStatus())
                    .build();
            specializationService.updateSpecialization(specialization.getId(), request);
            return "✅ Đã cập nhật chuyên ngành **" + code + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật chuyên ngành: " + e.getMessage();
        }
    }

    private String handleUpdateStudentInfo(Map<String, Object> params) {
        try {
            String studentCode = normalizeCode(extractString(params, "student_code"));
            if (studentCode == null || studentCode.isBlank()) {
                return "❌ Thiếu mã sinh viên để cập nhật.";
            }
            User student = userRepository.findByCodeIgnoreCase(studentCode)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy sinh viên có mã: " + studentCode));
            if (student.getRole() != User.UserRole.STUDENT) {
                return "❌ Người dùng **" + studentCode + "** không phải sinh viên.";
            }

            String majorCode = normalizeCode(extractString(params, "major_code"));
            String majorName = extractString(params, "major_name");
            if ((majorName == null || majorName.isBlank()) && majorCode != null && !majorCode.isBlank()) {
                majorName = findMajor(majorCode, null)
                        .map(com.fams.backend.entity.Major::getName)
                        .orElse(null);
            }
            if (majorName == null || majorName.isBlank()) {
                return "❌ Thiếu ngành mới để cập nhật cho sinh viên.";
            }

            com.fams.backend.dto.request.StudentUpdateRequest request = com.fams.backend.dto.request.StudentUpdateRequest
                    .builder()
                    .major(majorName)
                    .specialization(extractString(params, "specialization_name", "spec_name"))
                    .subSpecialization(extractString(params, "sub_specialization_name", "sub_name"))
                    .gpa(extractDouble(params, "gpa"))
                    .phone(extractString(params, "phone"))
                    .fullName(extractString(params, "full_name"))
                    .build();

            if (params.containsKey("status")) {
                request.setStatus(User.UserStatus.valueOf(extractString(params, "status").toUpperCase()));
            }

            studentService.updateStudent(student.getId(), request, null);
            return "✅ Đã cập nhật thông tin sinh viên **" + studentCode + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật thông tin sinh viên: " + e.getMessage();
        }
    }

    private String handleUpdateSubSpecialization(Map<String, Object> params) {
        try {
            String code = normalizeCode(extractString(params, "code", "sub_specialization_code", "sub_code"));
            if (code == null || code.isBlank()) {
                return "❌ Thiếu mã chuyên ngành hẹp để cập nhật.";
            }
            com.fams.backend.entity.SubSpecialization subSpecialization = subSpecializationRepository.findByCode(code)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy chuyên ngành hẹp có mã: " + code));

            com.fams.backend.dto.request.SubSpecializationRequest request = com.fams.backend.dto.request.SubSpecializationRequest
                    .builder()
                    .code(code)
                    .name(extractString(params, "name", "sub_specialization_name", "sub_name") != null
                            ? extractString(params, "name", "sub_specialization_name", "sub_name")
                            : subSpecialization.getName())
                    .description(extractString(params, "description") != null
                            ? extractString(params, "description")
                            : subSpecialization.getDescription())
                    .specializationId(subSpecialization.getSpecialization() != null
                            ? subSpecialization.getSpecialization().getId()
                            : null)
                    .build();
            subSpecializationService.updateSubSpecialization(subSpecialization.getId(), request);
            return "✅ Đã cập nhật chuyên ngành hẹp **" + code + "**.";
        } catch (Exception e) {
            return "❌ Lỗi khi cập nhật chuyên ngành hẹp: " + e.getMessage();
        }
    }

    private String handleCreateGroupChat(Map<String, Object> params) {
        try {
            String className = extractString(params, "class_name", "className");
            String requesterUsername = extractString(params, "requesterUsername", "requester_username");
            if (className == null || className.isBlank()) {
                return "❌ Thiếu mã lớp để tạo nhóm chat.";
            }
            className = className.trim().toUpperCase();
            final String normalizedClassName = className;

            User requester = null;
            if (requesterUsername != null && !requesterUsername.isBlank()) {
                requester = userRepository.findByUsername(requesterUsername).orElse(null);
            }
            if (requester != null && requester.getRole() == User.UserRole.LECTURER) {
                var classSection = classSectionRepository.findByClassNameWithDetails(normalizedClassName)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học: " + normalizedClassName));
                if (classSection.getLecturer() == null
                        || !requester.getId().equals(classSection.getLecturer().getId())) {
                    return "❌ Bạn chỉ được tạo nhóm chat cho lớp mình đang giảng dạy.";
                }
            }

            com.fams.backend.dto.response.ChatGroupResponse response = chatGroupService.createGroupForClass(
                    normalizedClassName,
                    requesterUsername);
            return "✅ Đã tạo thành công nhóm chat cho lớp **" + normalizedClassName + "**"
                    + (response != null && response.getId() != null ? " (ID: " + response.getId() + ")" : "");
        } catch (Exception e) {
            return "❌ Lỗi khi tạo nhóm chat lớp: " + e.getMessage();
        }
    }

    private String handleCreateAcademicRequest(Map<String, Object> params) {
        try {
            User requester = resolveRequester(params);
            if (requester == null) {
                return "❌ Không xác định được sinh viên gửi đơn.";
            }
            if (requester.getRole() != User.UserRole.STUDENT) {
                return "❌ Chỉ sinh viên mới được tạo đơn yêu cầu học vụ trong chat.";
            }

            String originalMessage = extractString(params, "originalMessage", "original_message", "message");
            AcademicRequestType requestType = resolveAcademicRequestType(params, originalMessage);
            if (requestType == null) {
                return "❌ Chưa xác định được loại đơn học vụ. Vui lòng nêu rõ: tạm nghỉ, học lại, đổi lớp, học vượt, miễn điểm danh, phúc khảo, chuyển ngành hoặc đổi chuyên ngành.";
            }

            String reason = extractString(params, "reason");
            if (reason == null || reason.isBlank()) {
                reason = inferReason(originalMessage);
            }

            List<String> classNames = extractClassNames(originalMessage);
            String className = normalizeClassName(
                    extractString(params, "class_name", "classSectionId", "class_section_id"));
            if ((className == null || className.isBlank()) && !classNames.isEmpty()) {
                className = classNames.get(0);
            }

            String toClassName = normalizeClassName(
                    extractString(params, "to_class_name", "toClassName", "target_class_name"));
            if ((toClassName == null || toClassName.isBlank()) && classNames.size() >= 2) {
                toClassName = classNames.get(1);
            }

            String courseCode = normalizeCode(extractString(params, "course_code", "code"));
            if ((courseCode == null || courseCode.isBlank()) && className != null && className.contains("-")) {
                courseCode = className.substring(className.lastIndexOf('-') + 1).toUpperCase();
            }
            if (courseCode == null || courseCode.isBlank()) {
                courseCode = inferCourseCode(originalMessage);
            }

            String toMajor = extractString(params, "to_major", "major_name", "major_code");
            String toSpecialization = extractString(params, "to_specialization", "specialization_name",
                    "specialization_code");
            String toSubSpecialization = extractString(
                    params,
                    "to_sub_specialization",
                    "sub_specialization_name",
                    "sub_specialization_code",
                    "sub_name",
                    "sub_code");

            CreateAcademicRequestDTO request = new CreateAcademicRequestDTO();
            request.setRequestType(requestType);
            request.setReason(reason);
            request.setNote(extractString(params, "note"));

            if (requestType == AcademicRequestType.OTHERS) {
                String requestTitle = extractString(params, "request_title", "requestTitle", "title", "subject");
                if (requestTitle == null || requestTitle.isBlank()) {
                    requestTitle = "Đơn yêu cầu học vụ khác";
                }
                request.setRequestTitle(requestTitle);
            }

            if (className != null && !className.isBlank()) {
                request.setClassSectionId(className);
                Optional<com.fams.backend.entity.ClassSection> classSectionOpt = classSectionRepository
                        .findByClassNameWithDetails(className);
                if (classSectionOpt.isPresent()) {
                    com.fams.backend.entity.ClassSection classSection = classSectionOpt.get();
                    if (classSection.getSemester() != null) {
                        request.setSemesterId(classSection.getSemester().getId());
                    }
                    if ((courseCode == null || courseCode.isBlank()) && classSection.getCourse() != null) {
                        request.setCourseId(classSection.getCourse().getId());
                    }
                }
            }

            if ((requestType == AcademicRequestType.RETAKE_COURSE || requestType == AcademicRequestType.OVERLOAD_STUDY)
                    && (request.getCourseId() == null)) {
                if (courseCode != null && !courseCode.isBlank()) {
                    final String normalizedCourseCode = courseCode;
                    courseRepository.findByCode(normalizedCourseCode)
                            .ifPresent(course -> request.setCourseId(course.getId()));
                }
            }

            if (request.getSemesterId() == null) {
                List<com.fams.backend.entity.Semester> activeSemesters = semesterRepository.findActiveSemesters();
                if (!activeSemesters.isEmpty()) {
                    request.setSemesterId(activeSemesters.get(0).getId());
                }
            }

            if (requestType == AcademicRequestType.CHANGE_CLASS && toClassName != null && !toClassName.isBlank()) {
                request.setToClassName(toClassName);
            }
            if (requestType == AcademicRequestType.CHANGE_MAJOR && toMajor != null && !toMajor.isBlank()) {
                request.setToMajor(toMajor);
                if (toSpecialization != null && !toSpecialization.isBlank()) {
                    request.setToSpecialization(toSpecialization);
                }
            }
            if (requestType == AcademicRequestType.CHANGE_SPECIALIZATION
                    && toSubSpecialization != null && !toSubSpecialization.isBlank()) {
                request.setToSubSpecialization(toSubSpecialization);
            }

            com.fams.backend.dto.response.AcademicRequestResponse response = academicRequestService.createRequest(
                    request,
                    null,
                    requester.getId());

            return "✅ Đã tạo đơn học vụ thành công: **"
                    + (response.getRequestTitle() != null ? response.getRequestTitle() : requestType.getDefaultTitle())
                    + "** (Mã đơn: **" + response.getId() + "**, trạng thái: **"
                    + response.getStatusLabel() + "**).";
        } catch (BadRequestException e) {
            return "❌ Không thể tạo đơn học vụ: " + e.getMessage();
        } catch (Exception e) {
            return "❌ Lỗi khi tạo đơn học vụ: " + e.getMessage();
        }
    }

    private User resolveRequester(Map<String, Object> params) {
        String requesterUsername = extractString(params, "requesterUsername", "requester_username");
        if (requesterUsername != null && !requesterUsername.isBlank()) {
            return userRepository.findByUsernameWithProfiles(requesterUsername).orElse(null);
        }

        Integer requesterUserId = extractInt(params, null, "requesterUserId", "requester_user_id");
        if (requesterUserId != null) {
            return userRepository.findById(requesterUserId.longValue()).orElse(null);
        }

        String requesterCode = normalizeCode(extractString(params, "requesterCode", "requester_code"));
        if (requesterCode != null && !requesterCode.isBlank()) {
            return userRepository.findByCodeIgnoreCase(requesterCode).orElse(null);
        }

        return null;
    }

    private LinkedHashMap<String, User> resolveEmailRecipients(User requester, Map<String, Object> params) {
        LinkedHashMap<String, User> recipients = new LinkedHashMap<>();
        String originalMessage = extractString(params, "originalMessage", "original_message", "message");
        String className = normalizeClassName(
                extractString(params, "class_name", "target_class_name", "targetClassName"));
        if ((className == null || className.isBlank()) && originalMessage != null) {
            className = inferClassName(originalMessage);
        }

        String studentCode = normalizeCode(extractString(params, "student_code", "recipient_code", "code"));
        String lecturerCode = normalizeCode(extractString(params, "lecturer_code", "recipient_code", "code"));
        if (originalMessage != null) {
            if (studentCode == null || studentCode.isBlank()) {
                studentCode = inferStudentCode(originalMessage);
            }
            if (lecturerCode == null || lecturerCode.isBlank()) {
                lecturerCode = inferLecturerCode(originalMessage);
            }
        }

        String roleTarget = normalizeRoleValue(extractString(params, "role", "recipient_role", "target_role"));
        String targetType = normalizeTargetType(extractString(params, "target_type"));
        String recipientEmail = extractString(params, "recipient_email");
        String courseCode = normalizeCode(extractString(params, "course_code"));
        if ((courseCode == null || courseCode.isBlank()) && originalMessage != null) {
            courseCode = inferCourseCode(originalMessage);
        }

        if (originalMessage != null) {
            String originalLower = originalMessage.toLowerCase();
            if (targetType == null) {
                if (originalLower.contains("toàn trường")) {
                    targetType = "ALL";
                } else if (originalLower.contains("toàn bộ giảng viên")
                        || originalLower.contains("tat ca giang vien")) {
                    targetType = "ROLE";
                    roleTarget = "LECTURER";
                } else if (originalLower.contains("toàn bộ sinh viên") || originalLower.contains("tat ca sinh vien")) {
                    targetType = "ROLE";
                    roleTarget = "STUDENT";
                }
            }
        }

        if (requester.getRole() == User.UserRole.LECTURER) {
            if (className != null && !className.isBlank()) {
                Optional<com.fams.backend.entity.ClassSection> classSectionOpt = classSectionRepository
                        .findByClassNameWithDetails(className);
                if (classSectionOpt.isEmpty()) {
                    throw new BadRequestException("Không tìm thấy lớp học: " + className);
                }
                var classSection = classSectionOpt.get();
                if (classSection.getLecturer() == null
                        || !requester.getId().equals(classSection.getLecturer().getId())) {
                    throw new BadRequestException("Giảng viên chỉ được gửi email cho lớp mình đang giảng dạy.");
                }
                addStudentsOfClass(recipients, className);
                return recipients;
            }

            if (studentCode != null && !studentCode.isBlank()) {
                Optional<User> studentOpt = userRepository.findByCodeIgnoreCase(studentCode);
                if (studentOpt.isEmpty()) {
                    throw new BadRequestException("Không tìm thấy sinh viên mã: " + studentCode);
                }
                User student = studentOpt.get();
                if (student.getRole() != User.UserRole.STUDENT || !isLecturerTeachingStudent(requester, student)) {
                    throw new BadRequestException("Bạn chỉ được gửi email cho sinh viên mình đang giảng dạy.");
                }
                addRecipient(recipients, student);
                return recipients;
            }

            if (courseCode != null && !courseCode.isBlank()) {
                addStudentsByLecturerCourse(recipients, requester, courseCode);
                if (!recipients.isEmpty()) {
                    return recipients;
                }
            }

            throw new BadRequestException("Giảng viên chỉ được gửi email cho lớp hoặc sinh viên mình đang giảng dạy.");
        }

        if (requester.getRole() == User.UserRole.STUDENT) {
            if (className != null && !className.isBlank()) {
                Optional<Enrollment> enrollmentOpt = enrollmentRepository
                        .findByClassSection_ClassNameAndStudent_Id(className, requester.getId());
                if (enrollmentOpt.isEmpty()) {
                    throw new BadRequestException(
                            "Bạn không thuộc lớp " + className + " nên không thể gửi email cho giảng viên lớp này.");
                }
                Enrollment enrollment = enrollmentOpt.get();
                User lecturer = enrollment.getClassSection().getLecturer();
                if (lecturer == null) {
                    throw new BadRequestException("Lớp " + className + " chưa có giảng viên phụ trách.");
                }
                addRecipient(recipients, lecturer);
                return recipients;
            }

            if (lecturerCode != null && !lecturerCode.isBlank()) {
                Optional<User> lecturerOpt = userRepository.findByCodeIgnoreCase(lecturerCode);
                if (lecturerOpt.isEmpty()) {
                    throw new BadRequestException("Không tìm thấy giảng viên mã: " + lecturerCode);
                }
                User lecturer = lecturerOpt.get();
                if (lecturer.getRole() != User.UserRole.LECTURER
                        || !isStudentLearningFromLecturer(requester, lecturer)) {
                    throw new BadRequestException("Sinh viên chỉ được gửi email cho giảng viên mình đang học.");
                }
                addRecipient(recipients, lecturer);
                return recipients;
            }

            if (courseCode != null && !courseCode.isBlank()) {
                addLecturersByStudentCourse(recipients, requester, courseCode);
                if (!recipients.isEmpty()) {
                    return recipients;
                }
            }

            throw new BadRequestException("Sinh viên chỉ được gửi email cho giảng viên của lớp/môn mình đang học.");
        }

        if (requester.getRole() == User.UserRole.ACADEMIC_STAFF || requester.getRole() == User.UserRole.ADMIN) {
            if (className != null && !className.isBlank()) {
                addStudentsOfClass(recipients, className);
                return recipients;
            }

            if ("ALL".equals(targetType)) {
                addUsersByRole(recipients, User.UserRole.STUDENT);
                addUsersByRole(recipients, User.UserRole.LECTURER);
                addUsersByRole(recipients, User.UserRole.ACADEMIC_STAFF);
                if (requester.getRole() == User.UserRole.ADMIN) {
                    addUsersByRole(recipients, User.UserRole.ADMIN);
                }
                recipients.remove(requester.getId() + "");
                return recipients;
            }

            if ("ROLE".equals(targetType) || roleTarget != null) {
                User.UserRole targetRole = parseUserRole(roleTarget);
                if (targetRole == null) {
                    throw new BadRequestException("Vai trò người nhận email không hợp lệ.");
                }
                addUsersByRole(recipients, targetRole);
                return recipients;
            }

            if (studentCode != null && !studentCode.isBlank()) {
                Optional<User> studentOpt = userRepository.findByCodeIgnoreCase(studentCode);
                if (studentOpt.isEmpty()) {
                    throw new BadRequestException("Không tìm thấy sinh viên mã: " + studentCode);
                }
                User student = studentOpt.get();
                addRecipient(recipients, student);
                return recipients;
            }

            if (lecturerCode != null && !lecturerCode.isBlank()) {
                Optional<User> lecturerOpt = userRepository.findByCodeIgnoreCase(lecturerCode);
                if (lecturerOpt.isEmpty()) {
                    throw new BadRequestException("Không tìm thấy giảng viên mã: " + lecturerCode);
                }
                User lecturer = lecturerOpt.get();
                addRecipient(recipients, lecturer);
                return recipients;
            }

            if (recipientEmail != null && !recipientEmail.isBlank()) {
                User recipient = userRepository.findByEmail(recipientEmail)
                        .orElseThrow(() -> new BadRequestException(
                                "Không tìm thấy tài khoản nội bộ với email: " + recipientEmail));
                addRecipient(recipients, recipient);
                return recipients;
            }
        }

        throw new BadRequestException("Không xác định được nhóm người nhận phù hợp để gửi email.");
    }

    private String resolveEmailAudienceLabel(User requester, Map<String, Object> params,
            LinkedHashMap<String, User> recipients) {
        String className = normalizeClassName(
                extractString(params, "class_name", "target_class_name", "targetClassName"));
        if (className != null && !className.isBlank()) {
            return " của lớp **" + className + "**";
        }

        String roleTarget = normalizeRoleValue(extractString(params, "role", "recipient_role", "target_role"));
        String targetType = normalizeTargetType(extractString(params, "target_type"));
        if ("ALL".equals(targetType)) {
            return " tới **toàn trường**";
        }
        if (roleTarget != null && !roleTarget.isBlank()) {
            if ("LECTURER".equals(roleTarget)) {
                return " tới **toàn bộ giảng viên**";
            }
            if ("STUDENT".equals(roleTarget)) {
                return " tới **toàn bộ sinh viên**";
            }
            if ("ACADEMIC_STAFF".equals(roleTarget)) {
                return " tới **toàn bộ nhân viên đào tạo**";
            }
        }
        if (recipients.size() == 1) {
            User onlyRecipient = recipients.values().iterator().next();
            return " tới **" + onlyRecipient.getFullName() + "**";
        }
        return "";
    }

    private String resolveEmailSubject(Map<String, Object> params, User requester,
            LinkedHashMap<String, User> recipients) {
        String subject = extractString(params, "subject", "title");
        if (subject != null && !subject.isBlank()) {
            return subject;
        }

        String className = normalizeClassName(
                extractString(params, "class_name", "target_class_name", "targetClassName"));
        if (className != null && !className.isBlank()) {
            return "FAMS | Thông báo tới lớp " + className;
        }

        String roleTarget = normalizeRoleValue(extractString(params, "role", "recipient_role", "target_role"));
        if ("LECTURER".equals(roleTarget)) {
            return "FAMS | Thông báo tới toàn bộ giảng viên";
        }
        if ("STUDENT".equals(roleTarget)) {
            return "FAMS | Thông báo tới toàn bộ sinh viên";
        }

        if (recipients.size() == 1) {
            User onlyRecipient = recipients.values().iterator().next();
            return "FAMS | Thư từ " + requester.getFullName() + " gửi tới " + onlyRecipient.getFullName();
        }

        return "FAMS | Thông báo từ " + requester.getFullName();
    }

    private String resolveEmailContent(Map<String, Object> params) {
        String content = extractString(params, "content", "message", "body", "email_content");
        if (content != null && !content.isBlank()) {
            return content;
        }

        String originalMessage = extractString(params, "originalMessage", "original_message");
        if (originalMessage == null || originalMessage.isBlank()) {
            return null;
        }

        Matcher matcher = Pattern.compile(
                "(?:rằng|rang|với nội dung|nội dung là|nội dung|về việc)\\s+(.+)$",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(originalMessage);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        return null;
    }

    private AcademicRequestType resolveAcademicRequestType(Map<String, Object> params, String originalMessage) {
        String rawType = normalizeCode(extractString(params, "request_type", "requestType", "type"));
        if (rawType != null && !rawType.isBlank()) {
            try {
                return AcademicRequestType.valueOf(rawType);
            } catch (Exception ignored) {
                // fall through to message inference
            }
        }

        String message = originalMessage != null ? originalMessage.toLowerCase() : "";
        if (message.contains("tạm nghỉ") || message.contains("bao luu") || message.contains("bảo lưu")) {
            return AcademicRequestType.PAUSE_SEMESTER;
        }
        if (message.contains("học lại") || message.contains("hoc lai")) {
            return AcademicRequestType.RETAKE_COURSE;
        }
        if (message.contains("đổi lớp") || message.contains("doi lop") || message.contains("chuyển lớp")
                || message.contains("chuyen lop")) {
            return AcademicRequestType.CHANGE_CLASS;
        }
        if (message.contains("học vượt") || message.contains("hoc vuot")) {
            return AcademicRequestType.OVERLOAD_STUDY;
        }
        if (message.contains("miễn điểm danh") || message.contains("mien diem danh") || message.contains("xin nghỉ")
                || message.contains("vắng có phép")) {
            return AcademicRequestType.ABSENT_REQUEST;
        }
        if (message.contains("phúc khảo") || message.contains("phuc khao") || message.contains("xem lại điểm")) {
            return AcademicRequestType.GRADE_APPEAL;
        }
        if (message.contains("chuyển ngành") || message.contains("chuyen nganh")) {
            return AcademicRequestType.CHANGE_MAJOR;
        }
        if (message.contains("chuyên ngành hẹp") || message.contains("chuyen nganh hep")
                || message.contains("đổi chuyên ngành") || message.contains("doi chuyen nganh")) {
            return AcademicRequestType.CHANGE_SPECIALIZATION;
        }
        if (message.contains("đơn") || message.contains("yeu cau") || message.contains("yêu cầu")) {
            return AcademicRequestType.OTHERS;
        }
        return null;
    }

    private void addStudentsOfClass(LinkedHashMap<String, User> recipients, String className) {
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);
        if (enrollments == null || enrollments.isEmpty()) {
            throw new BadRequestException("Không tìm thấy sinh viên nào trong lớp " + className + ".");
        }
        for (Enrollment enrollment : enrollments) {
            if (enrollment.getStudent() != null) {
                addRecipient(recipients, enrollment.getStudent());
            }
        }
        if (recipients.isEmpty()) {
            throw new BadRequestException("Lớp " + className + " không có người nhận email hợp lệ.");
        }
    }

    private void addStudentsByLecturerCourse(LinkedHashMap<String, User> recipients, User lecturer, String courseCode) {
        List<String> classNames = classSectionRepository.findDistinctClassNamesByLecturerId(lecturer.getId());
        for (String className : classNames) {
            classSectionRepository.findByClassNameWithDetails(className).ifPresent(classSection -> {
                if (classSection.getCourse() != null
                        && classSection.getCourse().getCode() != null
                        && courseCode.equalsIgnoreCase(classSection.getCourse().getCode())) {
                    List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);
                    for (Enrollment enrollment : enrollments) {
                        if (enrollment.getStudent() != null) {
                            addRecipient(recipients, enrollment.getStudent());
                        }
                    }
                }
            });
        }
    }

    private void addLecturersByStudentCourse(LinkedHashMap<String, User> recipients, User student, String courseCode) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudent_Id(student.getId());
        for (Enrollment enrollment : enrollments) {
            if (enrollment.getClassSection() == null || enrollment.getClassSection().getCourse() == null) {
                continue;
            }
            String classCourseCode = enrollment.getClassSection().getCourse().getCode();
            if (classCourseCode != null && classCourseCode.equalsIgnoreCase(courseCode)) {
                addRecipient(recipients, enrollment.getClassSection().getLecturer());
            }
        }
    }

    private void addUsersByRole(LinkedHashMap<String, User> recipients, User.UserRole role) {
        List<User> users = userRepository.findByRole(role).orElse(List.of());
        for (User user : users) {
            addRecipient(recipients, user);
        }
    }

    private void addRecipient(LinkedHashMap<String, User> recipients, User user) {
        if (user == null || user.getId() == null) {
            return;
        }
        if (user.getStatus() != User.UserStatus.ACTIVE) {
            return;
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        recipients.put(user.getId().toString(), user);
    }

    private boolean isLecturerTeachingStudent(User lecturer, User student) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudent_Id(student.getId());
        for (Enrollment enrollment : enrollments) {
            if (enrollment.getClassSection() != null
                    && enrollment.getClassSection().getLecturer() != null
                    && lecturer.getId().equals(enrollment.getClassSection().getLecturer().getId())) {
                return true;
            }
        }
        return false;
    }

    private boolean isStudentLearningFromLecturer(User student, User lecturer) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudent_Id(student.getId());
        for (Enrollment enrollment : enrollments) {
            if (enrollment.getClassSection() != null
                    && enrollment.getClassSection().getLecturer() != null
                    && lecturer.getId().equals(enrollment.getClassSection().getLecturer().getId())) {
                return true;
            }
        }
        return false;
    }

    private Optional<com.fams.backend.entity.Course> findCourse(String code, String name) {
        if (code != null && !code.isBlank()) {
            Optional<com.fams.backend.entity.Course> byCode = courseRepository.findByCode(code);
            if (byCode.isPresent()) {
                if (name == null || name.isBlank() || byCode.get().getName().equalsIgnoreCase(name.trim())) {
                    return byCode;
                }
                return Optional.empty();
            }
        }
        if (name != null && !name.isBlank()) {
            return courseRepository.findAll().stream()
                    .filter(course -> course.getName() != null && course.getName().equalsIgnoreCase(name.trim()))
                    .findFirst();
        }
        return Optional.empty();
    }

    private Optional<com.fams.backend.entity.Major> findMajor(String code, String name) {
        if (code != null && !code.isBlank()) {
            Optional<com.fams.backend.entity.Major> byCode = majorRepository.findByCode(code);
            if (byCode.isPresent()) {
                if (name == null || name.isBlank() || byCode.get().getName().equalsIgnoreCase(name.trim())) {
                    return byCode;
                }
                return Optional.empty();
            }
        }
        if (name != null && !name.isBlank()) {
            return majorRepository.findByNameIgnoreCase(name.trim());
        }
        return Optional.empty();
    }

    private Optional<com.fams.backend.entity.Specialization> findSpecialization(String code, String name) {
        if (code != null && !code.isBlank()) {
            Optional<com.fams.backend.entity.Specialization> byCode = specializationRepository.findByCode(code);
            if (byCode.isPresent()) {
                if (name == null || name.isBlank() || byCode.get().getName().equalsIgnoreCase(name.trim())) {
                    return byCode;
                }
                return Optional.empty();
            }
        }
        if (name != null && !name.isBlank()) {
            return specializationRepository.findByNameIgnoreCase(name.trim());
        }
        return Optional.empty();
    }

    private Optional<com.fams.backend.entity.SubSpecialization> findSubSpecialization(String code, String name) {
        if (code != null && !code.isBlank()) {
            Optional<com.fams.backend.entity.SubSpecialization> byCode = subSpecializationRepository.findByCode(code);
            if (byCode.isPresent()) {
                if (name == null || name.isBlank() || byCode.get().getName().equalsIgnoreCase(name.trim())) {
                    return byCode;
                }
                return Optional.empty();
            }
        }
        if (name != null && !name.isBlank()) {
            return subSpecializationRepository.findAll().stream()
                    .filter(sub -> sub.getName() != null && sub.getName().equalsIgnoreCase(name.trim()))
                    .findFirst();
        }
        return Optional.empty();
    }

    private Optional<com.fams.backend.entity.Room> findRoom(String lookup) {
        if (lookup == null || lookup.isBlank()) {
            return Optional.empty();
        }
        String normalized = lookup.trim();
        Optional<com.fams.backend.entity.Room> byCode = roomRepository.findByCode(normalized.toUpperCase());
        if (byCode.isPresent()) {
            return byCode;
        }
        return roomRepository.findAll().stream()
                .filter(room -> room.getName() != null && room.getName().equalsIgnoreCase(normalized))
                .findFirst();
    }

    private String inferClassName(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher matcher = CLASS_NAME_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).toUpperCase();
        }
        return null;
    }

    private List<String> extractClassNames(String text) {
        List<String> classNames = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return classNames;
        }
        Matcher matcher = CLASS_NAME_PATTERN.matcher(text);
        while (matcher.find()) {
            String className = matcher.group(1).toUpperCase();
            if (!classNames.contains(className)) {
                classNames.add(className);
            }
        }
        return classNames;
    }

    private String inferStudentCode(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher matcher = STUDENT_CODE_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).toUpperCase();
        }
        return null;
    }

    private String inferLecturerCode(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher matcher = LECTURER_CODE_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).toUpperCase();
        }
        return null;
    }

    private String inferCourseCode(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher matcher = COURSE_CODE_PATTERN.matcher(text);
        while (matcher.find()) {
            String value = matcher.group(1).toUpperCase();
            if (!value.startsWith("SE") && !value.startsWith("GV")) {
                return value;
            }
        }
        return null;
    }

    private String inferReason(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher matcher = REASON_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private String normalizeCode(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized.toUpperCase();
    }

    private String normalizeClassName(String value) {
        return normalizeCode(value);
    }

    private String normalizeRoleValue(String value) {
        String normalized = normalizeCode(value);
        if (normalized == null) {
            return null;
        }
        if ("GIANG_VIEN".equals(normalized) || "GIẢNG_VIÊN".equals(normalized)) {
            return "LECTURER";
        }
        if ("SINH_VIEN".equals(normalized) || "SINHVIEN".equals(normalized) || "HOC_SINH".equals(normalized)) {
            return "STUDENT";
        }
        if ("NHAN_VIEN_DAO_TAO".equals(normalized) || "ACADEMIC".equals(normalized) || "STAFF".equals(normalized)) {
            return "ACADEMIC_STAFF";
        }
        return normalized;
    }

    private String normalizeTargetType(String value) {
        String normalized = normalizeCode(value);
        if (normalized == null) {
            return null;
        }
        if ("TOAN_TRUONG".equals(normalized) || "SCHOOL".equals(normalized)) {
            return "ALL";
        }
        if ("LOP".equals(normalized)) {
            return "CLASS";
        }
        if ("VAI_TRO".equals(normalized)) {
            return "ROLE";
        }
        return normalized;
    }

    private User.UserRole parseUserRole(String role) {
        String normalized = normalizeRoleValue(role);
        if (normalized == null) {
            return null;
        }
        try {
            return User.UserRole.valueOf(normalized);
        } catch (Exception e) {
            return null;
        }
    }
}
