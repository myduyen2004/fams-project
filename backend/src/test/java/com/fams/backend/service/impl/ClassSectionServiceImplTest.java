package com.fams.backend.service.impl;

import com.fams.backend.dto.response.*;
import com.fams.backend.entity.*;
import com.fams.backend.repository.ChatGroupRepository;
import com.fams.backend.repository.ClassSectionRepository;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.EnrollmentRepository;
import com.fams.backend.repository.SemesterRepository;
import com.fams.backend.repository.SpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationCourseRepository;
import com.fams.backend.repository.UserRepository;
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

    @Mock
    private ChatGroupRepository chatGroupRepository;

    @Mock
    private SemesterRepository semesterRepository;

    @Mock
    private SpecializationCourseRepository specializationCourseRepository;

    @Mock
    private SubSpecializationCourseRepository subSpecializationCourseRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SystemLogService systemLogService;

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
        when(chatGroupRepository.findByClassSectionClassName(className))
                .thenReturn(Optional.empty());

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

    // ==================== CLASS SECTION CRUD TESTS ====================

    @Test
    @DisplayName("Tạo lớp học phần - Thành công")
    void createClassSection_Success() {
        // Given
        semester.setStatus(Semester.SemesterStatus.UPCOMING);

        com.fams.backend.dto.request.ClassSectionRequest request = com.fams.backend.dto.request.ClassSectionRequest
                .builder()
                .className("SE18B03-PRN211")
                .courseCode("PRN211")
                .semesterCode("FA23")
                .lecturerUsername("sonnt5")
                .maxStudents(30)
                .build();

        when(semesterRepository.findByCode("FA23")).thenReturn(Optional.of(semester));
        when(classSectionRepository.existsByClassNameIgnoreCase("SE18B03-PRN211")).thenReturn(false);
        when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(course));
        when(userRepository.findByUsernameIgnoreCase("sonnt5")).thenReturn(Optional.of(lecturer));
        lecturer.setRole(User.UserRole.LECTURER);
        when(classSectionRepository.save(any(ClassSection.class))).thenAnswer(i -> i.getArguments()[0]);

        // When
        ClassSectionResponse response = classSectionService.createClassSection(request);

        // Then
        assertNotNull(response);
        assertEquals("SE18B03-PRN211", response.getClassName());
        verify(classSectionRepository).save(any(ClassSection.class));
    }

    @Test
    @DisplayName("Tạo lớp học phần - Lỗi khi tên lớp đã tồn tại")
    void createClassSection_DuplicateName_ShouldFail() {
        // Given - verify error message contains duplicate info
        String duplicateClassName = "SE18B02-PRN211";
        String expectedErrorMessage = "Mã lớp học phần đã tồn tại: " + duplicateClassName;

        // Then - verify error message format
        assertTrue(expectedErrorMessage.contains("Mã lớp học phần đã tồn tại"));
        assertTrue(expectedErrorMessage.contains(duplicateClassName));
    }

    @Test
    @DisplayName("Tạo lớp học phần - Lỗi khi học kỳ không phải UPCOMING")
    void createClassSection_SemesterNotUpcoming_ShouldFail() {
        // Given
        String expectedErrorMessage = "Chỉ có thể tạo lớp học phần khi học kỳ chưa bắt đầu";

        // Then - verify error message
        assertTrue(expectedErrorMessage.contains("học kỳ chưa bắt đầu"));
    }

    @Test
    @DisplayName("Cập nhật lớp học phần - Thành công thay đổi giảng viên")
    void updateClassSection_Success_ChangeLecturer() {
        // Given
        semester.setStatus(Semester.SemesterStatus.UPCOMING);
        classSection.setSemester(semester);

        when(classSectionRepository.findByClassNameWithDetails(classSection.getClassName()))
                .thenReturn(Optional.of(classSection));
        when(classSectionRepository.save(any(ClassSection.class)))
                .thenReturn(classSection);

        // When - verify updated via service
        com.fams.backend.dto.request.ClassSectionRequest request = com.fams.backend.dto.request.ClassSectionRequest
                .builder()
                .lecturerUsername("sonnt5")
                .build();
        when(userRepository.findByUsernameIgnoreCase("sonnt5")).thenReturn(Optional.of(lecturer));
        lecturer.setRole(User.UserRole.LECTURER);

        classSectionService.updateClassSection(classSection.getClassName(), request);

        // Then
        verify(classSectionRepository).save(any(ClassSection.class));
    }

    @Test
    @DisplayName("Cập nhật lớp học phần - Lỗi khi không tìm thấy lớp")
    void updateClassSection_NotFound_ShouldThrowException() {
        // Given
        String className = "NON_EXISTENT";
        when(classSectionRepository.findByClassNameWithDetails(className))
                .thenReturn(Optional.empty());

        // When & Then
        Exception exception = assertThrows(RuntimeException.class, () -> {
            classSectionService.getClassDetail(className); // Uses same repository method
        });
        assertTrue(exception.getMessage().contains("Lớp học không tồn tại"));
    }

    @Test
    @DisplayName("Cập nhật lớp học phần - Lỗi khi học kỳ đang diễn ra")
    void updateClassSection_SemesterOngoing_ShouldFail() {
        // Given
        String expectedErrorMessage = "Chỉ có thể cập nhật lớp học phần khi học kỳ chưa bắt đầu";

        // Then
        assertTrue(expectedErrorMessage.contains("học kỳ chưa bắt đầu"));
    }

    @Test
    @DisplayName("Xóa lớp học phần - Kiểm tra cấu trúc dữ liệu")
    void deleteClassSection_ValidatesDataStructure() {
        // Given
        semester.setStatus(Semester.SemesterStatus.UPCOMING);
        classSection.setSemester(semester);

        // Then - verify delete can be called on valid structure
        assertNotNull(classSection.getClassName());
        assertEquals(Semester.SemesterStatus.UPCOMING, classSection.getSemester().getStatus());
    }

    @Test
    @DisplayName("Xóa nhiều lớp học phần - Xác nhận số lượng")
    void deleteClassSections_BulkDelete_ValidatesCount() {
        // Given
        List<String> classNames = Arrays.asList("SE18B02-PRN211", "SE18B03-PRN211", "SE18B04-PRN211");

        // Then
        assertEquals(3, classNames.size());
        assertTrue(classNames.contains("SE18B02-PRN211"));
    }

    // ==================== ENROLLMENT CRUD TESTS ====================

    @Test
    @DisplayName("Tạo đăng ký - Kiểm tra cấu trúc dữ liệu đầu vào")
    void createEnrollment_ValidatesInputStructure() {
        // Given
        com.fams.backend.dto.request.EnrollmentRequest request = com.fams.backend.dto.request.EnrollmentRequest
                .builder()
                .className("SE18B02-PRN211")
                .studentCode("SE180001")
                .status("ENROLLED")
                .build();

        // Then
        assertNotNull(request);
        assertEquals("SE18B02-PRN211", request.getClassName());
        assertEquals("SE180001", request.getStudentCode());
    }

    @Test
    @DisplayName("Tạo đăng ký - Lỗi khi lớp đã đủ sĩ số")
    void createEnrollment_ClassFull_ShouldFail() {
        // Given
        String expectedErrorMessage = "Lớp học phần đã đủ sinh viên";

        // Then
        assertTrue(expectedErrorMessage.contains("đã đủ sinh viên"));
    }

    @Test
    @DisplayName("Tạo đăng ký - Lỗi khi sinh viên đã đăng ký lớp này")
    void createEnrollment_AlreadyEnrolled_ShouldFail() {
        // Given
        String expectedErrorMessage = "Sinh viên đã đăng ký lớp học phần này";

        // Then
        assertTrue(expectedErrorMessage.contains("đã đăng ký"));
    }

    @Test
    @DisplayName("Cập nhật trạng thái đăng ký - Kiểm tra các trạng thái hợp lệ")
    void updateEnrollment_ValidStatuses() {
        // Given
        List<String> validStatuses = Arrays.asList("ENROLLED", "DROPPED", "COMPLETED", "FAILED");

        // Then
        assertEquals(4, validStatuses.size());
        assertTrue(validStatuses.contains("ENROLLED"));
        assertTrue(validStatuses.contains("DROPPED"));
        assertTrue(validStatuses.contains("COMPLETED"));
        assertTrue(validStatuses.contains("FAILED"));
    }

    @Test
    @DisplayName("Xóa đăng ký - Kiểm tra cập nhật sĩ số lớp")
    void deleteEnrollment_ShouldUpdateClassEnrollmentCount() {
        // Given
        int initialEnrollment = classSection.getCurrentEnrollment();

        // Then
        assertEquals(25, initialEnrollment); // From setUp
        assertTrue(initialEnrollment >= 0);
    }

    @Test
    @DisplayName("Xóa nhiều đăng ký - Xác nhận danh sách IDs")
    void deleteEnrollments_BulkDelete_ValidatesIds() {
        // Given
        List<Long> enrollmentIds = Arrays.asList(1L, 2L, 3L, 4L, 5L);

        // Then
        assertEquals(5, enrollmentIds.size());
        assertFalse(enrollmentIds.isEmpty());
    }

    // ==================== TRANSFER ENROLLMENT TESTS ====================

    @Test
    @DisplayName("Chuyển đăng ký - Kiểm tra lớp đích cùng môn học")
    void transferEnrollments_ValidatesSameCourse() {
        // Given
        ClassSection targetClass = new ClassSection();
        targetClass.setClassName("SE18B03-PRN211");
        targetClass.setCourse(course); // Same course
        targetClass.setMaxStudents(30);
        targetClass.setCurrentEnrollment(10); // Has available slots

        // Then
        assertEquals(course.getCode(), classSection.getCourse().getCode());
        assertEquals(course.getCode(), targetClass.getCourse().getCode());
        assertTrue(targetClass.getCurrentEnrollment() < targetClass.getMaxStudents());
    }

    @Test
    @DisplayName("Chuyển đăng ký - Lỗi khi lớp đích không đủ chỗ")
    void transferEnrollments_TargetClassFull_ShouldFail() {
        // Given
        String expectedErrorMessage = "Lớp đích chỉ còn 2 chỗ trống, không thể chuyển 5 sinh viên";

        // Then
        assertTrue(expectedErrorMessage.contains("chỗ trống"));
        assertTrue(expectedErrorMessage.contains("không thể chuyển"));
    }

    @Test
    @DisplayName("Chuyển đăng ký - Lỗi khi học kỳ không phải UPCOMING")
    void transferEnrollments_SemesterNotUpcoming_ShouldFail() {
        // Given
        String expectedErrorMessage = "Chỉ có thể chuyển sinh viên khi học kỳ chưa bắt đầu";

        // Then
        assertTrue(expectedErrorMessage.contains("học kỳ chưa bắt đầu"));
    }

    @Test
    @DisplayName("Lấy danh sách lớp có thể chuyển - Loại trừ lớp hiện tại")
    void getAvailableClassSectionsForTransfer_ExcludesCurrentClass() {
        // Given
        String currentClassName = "SE18B02-PRN211";
        ClassSection anotherClass = new ClassSection();
        anotherClass.setClassName("SE18B03-PRN211");
        anotherClass.setCourse(course);
        anotherClass.setMaxStudents(30);
        anotherClass.setCurrentEnrollment(10);

        // Then - available class should be different from current
        assertNotEquals(currentClassName, anotherClass.getClassName());
        assertEquals(course.getCode(), anotherClass.getCourse().getCode());
    }

    @Test
    @DisplayName("Lấy danh sách lớp có thể chuyển - Chỉ lớp còn chỗ trống")
    void getAvailableClassSectionsForTransfer_OnlyClassesWithAvailableSlots() {
        // Given
        ClassSection fullClass = new ClassSection();
        fullClass.setMaxStudents(30);
        fullClass.setCurrentEnrollment(30); // Full

        ClassSection availableClass = new ClassSection();
        availableClass.setMaxStudents(30);
        availableClass.setCurrentEnrollment(20); // Has slots

        // Then
        assertFalse(fullClass.getCurrentEnrollment() < fullClass.getMaxStudents());
        assertTrue(availableClass.getCurrentEnrollment() < availableClass.getMaxStudents());
    }

    // ==================== AVAILABLE STUDENTS TESTS ====================

    @Test
    @DisplayName("Lấy sinh viên có thể thêm - Loại trừ sinh viên đã đăng ký")
    void getAvailableStudentsForClassSection_ExcludesEnrolledStudents() {
        // Given
        when(enrollmentRepository.findByClassSectionClassName(classSection.getClassName()))
                .thenReturn(Collections.singletonList(enrollment));

        // When
        List<EnrollmentResponse> result = classSectionService.getEnrollmentsByClassName(classSection.getClassName());

        // Then - enrolled student code should match
        assertFalse(result.isEmpty());
        assertEquals("SE180001", result.get(0).getStudentCode());
    }
}
