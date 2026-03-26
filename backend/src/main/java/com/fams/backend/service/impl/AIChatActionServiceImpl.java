package com.fams.backend.service.impl;

import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.AIChatActionService;
import com.fams.backend.service.NotificationService;
import com.fams.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIChatActionServiceImpl implements AIChatActionService {

    private final UserService userService;
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
    private final com.fams.backend.service.RoomService roomService;
    private final com.fams.backend.service.SemesterService semesterService;
    private final com.fams.backend.repository.SpecializationRepository specializationRepository;

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
                case "DELETE_USER":
                    return handleDeleteUser(params);
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
                case "CREATE_ROOM":
                    return handleCreateRoom(params);
                case "CREATE_SEMESTER":
                    return handleCreateSemester(params);
                case "CREATE_SUB_SPECIALIZATION":
                    return handleCreateSubSpecialization(params);
                case "CREATE_CLASS":
                    return handleCreateClass(params);
                default:
                    log.warn("Unknown AI action type: {}", type);
                    return null;
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

    private String handleCreateNotification(Map<String, Object> params) {
        return "❌ Chức năng tạo thông báo thủ công đã bị tắt. Vui lòng dùng module Tin tức (/news).";
    }

    private String handleSendEmail(Map<String, Object> params) {
        String recipientEmail = extractString(params, "recipient_email");
        String subject = extractString(params, "subject");
        String content = extractString(params, "content");

        if (recipientEmail == null || recipientEmail.isEmpty()) {
            String code = extractString(params, "code");
            if (code == null)
                code = extractString(params, "recipient_code");

            if (code != null) {
                User user = userRepository.findByCode(code.toUpperCase()).orElse(null);
                if (user != null) {
                    recipientEmail = user.getEmail();
                } else {
                    return "❌ Không tìm thấy user với mã: " + code + " để gửi email.";
                }
            } else {
                return "❌ Thiếu địa chỉ email hoặc mã người nhận.";
            }
        }

        try {
            emailService.sendEmail(recipientEmail, subject != null ? subject : "Thông báo FAMS", content);
            return "✅ Đã gửi email thành công tới: " + recipientEmail;
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

    private String handleCreateSpecialization(Map<String, Object> params) {
        try {
            String majorCode = extractString(params, "major_code");
            return majorRepository.findByCode(majorCode.toUpperCase())
                    .map(major -> {
                        try {
                            com.fams.backend.dto.request.SpecializationRequest request = com.fams.backend.dto.request.SpecializationRequest
                                    .builder()
                                    .majorId(major.getId())
                                    .code(extractString(params, "spec_code"))
                                    .name(extractString(params, "spec_name"))
                                    .status(com.fams.backend.entity.Specialization.SpecializationStatus.ACTIVE)
                                    .build();
                            specializationService.createSpecialization(request);
                            return "✅ Đã tạo thành công chuyên ngành **" + request.getName() + "** cho ngành **"
                                    + major.getName() + "**";
                        } catch (Exception e) {
                            return "❌ Lỗi: " + e.getMessage();
                        }
                    })
                    .orElse("❌ Không tìm thấy ngành với mã: " + majorCode);
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
            String specCode = extractString(params, "spec_code");
            return specializationRepository.findByCode(specCode.toUpperCase())
                    .map(spec -> {
                        try {
                            com.fams.backend.dto.request.SubSpecializationRequest request = com.fams.backend.dto.request.SubSpecializationRequest
                                    .builder()
                                    .specializationId(spec.getId())
                                    .code(extractString(params, "sub_code"))
                                    .name(extractString(params, "sub_name"))
                                    .description(extractString(params, "description"))
                                    .build();
                            subSpecializationService.createSubSpecialization(request);
                            return "✅ Đã tạo thành công chuyên ngành hẹp **" + request.getName()
                                    + "** cho chuyên ngành **"
                                    + spec.getName() + "**";
                        } catch (Exception e) {
                            return "❌ Lỗi: " + e.getMessage();
                        }
                    })
                    .orElse("❌ Không tìm thấy chuyên ngành với mã: " + specCode);
        } catch (Exception e) {
            return "❌ Lỗi: " + e.getMessage();
        }
    }

    private String handleCreateClass(Map<String, Object> params) {
        try {
            com.fams.backend.dto.request.ClassSectionRequest request = com.fams.backend.dto.request.ClassSectionRequest
                    .builder()
                    .className(extractString(params, "class_name"))
                    .courseCode(extractString(params, "course_code"))
                    .semesterCode(extractString(params, "semester_code"))
                    .lecturerUsername(extractString(params, "lecturer_code"))
                    .numberOfSlots(extractInt(params, 30, "number_of_slots"))
                    .maxStudents(extractInt(params, 30, "max_students"))
                    .build();
            classSectionService.createClassSection(request);
            return "✅ Đã tạo thành công lớp học phần: **" + request.getClassName() + "**";
        } catch (Exception e) {
            return "❌ Lỗi: " + e.getMessage();
        }
    }
}
