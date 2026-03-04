package com.fams.backend.dto.request;

import com.fams.backend.entity.AcademicRequest.AcademicRequestType;
import lombok.Data;

/**
 * Request DTO for creating an academic request
 */
@Data
public class CreateAcademicRequestDTO {

    // Loại yêu cầu (bắt buộc)
    private AcademicRequestType requestType;

    // Tiêu đề yêu cầu (chỉ bắt buộc cho loại OTHERS)
    private String requestTitle;

    // Học kỳ liên quan (ID)
    private Long semesterId;

    // Môn học liên quan (ID) - cho RETAKE_COURSE, OVERLOAD_STUDY, GRADE_APPEAL
    private Long courseId;

    // Lớp học phần hiện tại (className) - cho CHANGE_CLASS, GRADE_APPEAL
    private String classSectionId;

    // Lớp muốn chuyển đến - cho CHANGE_CLASS
    private String toClassName;

    // Ngành muốn chuyển - cho CHANGE_MAJOR
    private String toMajor;

    // Chuyên ngành muốn chuyển - cho CHANGE_MAJOR
    private String toSpecialization;

    // Chuyên ngành hẹp muốn chuyển - cho CHANGE_SPECIALIZATION
    private String toSubSpecialization;

    // Lý do (bắt buộc)
    private String reason;

    // Ghi chú thêm (tùy chọn)
    private String note;
}
