package com.fams.backend.service.impl;

import com.fams.backend.dto.response.*;
import com.fams.backend.entity.*;
import com.fams.backend.repository.ClassSectionRepository;
import com.fams.backend.repository.EnrollmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho ClassSectionServiceImpl")
public class ClassSectionServiceImplTest {

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private ClassSectionServiceImpl classSectionService;

    private ClassSection classSection;
    private Enrollment enrollment;
    private User student;
    private User lecturer;
    private Course course;
    private Semester semester;
    private StudentProfile studentProfile;
    private Major major;
    private Specialization specialization;

    @BeforeEach
    void setUp() {
        // Setup common test data
        semester = new Semester();
        semester.setCode("FA23");
        semester.setName("Fall 2023");

        course = new Course();
        course.setId(1L);
        course.setCode("PRN211");
        course.setName("C# Programming");

        lecturer = new User();
        lecturer.setId(10L);
        lecturer.setFullName("Nguyen Van A");
        lecturer.setUsername("sonnt5");

        classSection = new ClassSection();
        // classSection.setId(100L); // Entity uses className as ID
        classSection.setClassName("SE18B02-PRN211");
        classSection.setCourse(course);
        classSection.setSemester(semester);
        classSection.setLecturer(lecturer);
        classSection.setMaxStudents(30);
        classSection.setCurrentEnrollment(25);
        classSection.setStatus(ClassSection.ClassStatus.UPCOMING);

        major = new Major();
        major.setName("Software Engineering");

        specialization = new Specialization();
        specialization.setName("Ky Thuat Phan Mem");

        studentProfile = new StudentProfile();
        studentProfile.setMajor(major);
        studentProfile.setSpecialization(specialization);

        student = new User();
        student.setId(1000L);
        student.setCode("SE180001");
        student.setFullName("Tran Van B");
        student.setEmail("b@fpt.edu.vn");
        student.setPhone("0123456789");
        student.setStudentProfile(studentProfile);

        enrollment = new Enrollment();
        enrollment.setId(500L);
        enrollment.setClassSection(classSection);
        enrollment.setStudent(student);
        enrollment.setStudentCode("SE180001");
        enrollment.setStatus(Enrollment.EnrollmentStatus.ENROLLED);
    }

    @Test
    @DisplayName("Lấy danh sách lớp học phần theo học kỳ - Trả về trang kết quả thành công")
    void getClassSectionsBySemester_ShouldReturnPagedResponse() {
        // Given
        String semesterCode = "FA23";
        String search = "";
        String status = "UPCOMING";
        Long lecturerId = 10L;
        Pageable pageable = PageRequest.of(0, 10);
        Page<ClassSection> page = new PageImpl<>(Collections.singletonList(classSection));

        when(classSectionRepository.findBySemesterCodeWithFilters(
                eq(semesterCode), eq(search), eq("UPCOMING"), eq(lecturerId), eq(pageable))).thenReturn(page);

        // When
        Page<ClassSectionResponse> result = classSectionService.getClassSectionsBySemester(
                semesterCode, search, status, lecturerId, pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(classSection.getClassName(), result.getContent().get(0).getClassName());
        verify(classSectionRepository).findBySemesterCodeWithFilters(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Lấy danh sách lớp học phần - Status không hợp lệ sẽ bị bỏ qua")
    void getClassSectionsBySemester_WithInvalidStatus_ShouldIgnoreStatus() {
        // Given
        String semesterCode = "FA23";
        String status = "INVALID_STATUS";
        Pageable pageable = PageRequest.of(0, 10);
        Page<ClassSection> page = new PageImpl<>(Collections.singletonList(classSection));

        when(classSectionRepository.findBySemesterCodeWithFilters(
                eq(semesterCode), any(), eq(null), any(), eq(pageable))).thenReturn(page);

        // When
        classSectionService.getClassSectionsBySemester(semesterCode, null, status, null, pageable);

        // Then
        verify(classSectionRepository).findBySemesterCodeWithFilters(
                eq(semesterCode), any(), eq(null), any(), eq(pageable) // Expect null for invalid status
        );
    }

    @Test
    @DisplayName("Lấy danh sách giảng viên theo học kỳ - Trả về danh sách không trùng lặp")
    void getLecturersBySemester_ShouldReturnDistinctLecturers() {
        // Given
        ClassSection classSection2 = new ClassSection(); // Another class with same lecturer
        classSection2.setSemester(semester);
        classSection2.setLecturer(lecturer);

        when(classSectionRepository.findAll()).thenReturn(Arrays.asList(classSection, classSection2));

        // When
        List<LecturerOptionResponse> result = classSectionService.getLecturersBySemester(semester.getCode());

        // Then
        assertEquals(1, result.size()); // Should be distinct
        assertEquals(lecturer.getId(), result.get(0).getId());
        assertEquals(lecturer.getFullName(), result.get(0).getFullName());
    }

    @Test
    @DisplayName("Lấy danh sách sinh viên theo tên lớp - Trả về danh sách Enrollment đúng")
    void getEnrollmentsByClassName_ShouldReturnList() {
        // Given
        when(enrollmentRepository.findByClassSectionClassName(classSection.getClassName()))
                .thenReturn(Collections.singletonList(enrollment));

        // When
        List<EnrollmentResponse> result = classSectionService.getEnrollmentsByClassName(classSection.getClassName());

        // Then
        assertEquals(1, result.size());
        assertEquals(enrollment.getStudentCode(), result.get(0).getStudentCode());
        assertEquals(enrollment.getStudent().getFullName(), result.get(0).getStudentName());
    }

    @Test
    @DisplayName("Xem chi tiết lớp học - Thành công trả về thông tin đầy đủ")
    void getClassDetail_Success_ShouldReturnResponse() {
        // Given
        String className = classSection.getClassName();
        when(classSectionRepository.findByClassNameWithDetails(className))
                .thenReturn(Optional.of(classSection));
        when(enrollmentRepository.findByClassSectionClassName(className))
                .thenReturn(Collections.singletonList(enrollment));

        // When
        ClassDetailResponse result = classSectionService.getClassDetail(className);

        // Then
        assertNotNull(result);
        assertEquals(className, result.getClassName());
        assertEquals(course.getName(), result.getCourseName());
        assertEquals(1, result.getEnrollments().size());
        assertEquals(student.getCode(), result.getEnrollments().get(0).getStudentCode());
        assertEquals(specialization.getName(), result.getEnrollments().get(0).getMajorName());
    }

    @Test
    @DisplayName("Xem chi tiết lớp học - Lỗi RuntimeException khi không tìm thấy lớp (Not Found)")
    void getClassDetail_NotFound_ShouldThrowException() {
        // Given
        String className = "NON_EXISTENT";
        when(classSectionRepository.findByClassNameWithDetails(className))
                .thenReturn(Optional.empty());

        // When & Then
        Exception exception = assertThrows(RuntimeException.class, () -> {
            classSectionService.getClassDetail(className);
        });
        assertTrue(exception.getMessage().contains("Lớp học không tồn tại"));
    }

    @Test
    @DisplayName("Lấy tùy chọn môn học theo Giảng viên và Học kỳ - Trả về danh sách môn học")
    void getCourseOptionsByLecturerAndSemester_ShouldReturnCourses() {
        // Given
        Long lecturerId = 1L;
        String semesterCode = "FA23";
        when(classSectionRepository.findDistinctCoursesByLecturerAndSemester(semesterCode, lecturerId))
                .thenReturn(Collections.singletonList(course));

        // When
        List<CourseOptionResponse> result = classSectionService.getCourseOptionsByLecturerAndSemester(semesterCode,
                lecturerId);

        // Then
        assertEquals(1, result.size());
        assertEquals(course.getId(), result.get(0).getId());
        assertEquals(course.getCode(), result.get(0).getCode());
    }

    @Test
    @DisplayName("Tạo Template Import lớp học - Trả về file Excel hợp lệ")
    void getImportTemplate_ShouldReturnByteArray() {
        // When
        byte[] result = classSectionService.getImportTemplate();

        // Then
        assertNotNull(result);
        assertTrue(result.length > 0);
    }

    @Test
    @DisplayName("Tạo Template Import danh sách sinh viên - Trả về file Excel hợp lệ")
    void getEnrollmentImportTemplate_ShouldReturnByteArray() {
        // Given
        String semesterCode = "FA23";
        when(classSectionRepository.findBySemesterCode(semesterCode))
                .thenReturn(Collections.singletonList(classSection));

        // When
        byte[] result = classSectionService.getEnrollmentImportTemplate(semesterCode);

        // Then
        assertNotNull(result);
        assertTrue(result.length > 0);
    }
}
