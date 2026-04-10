package com.fams.backend.service;

import com.fams.backend.dto.response.ExamGradeOverviewResponse;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ExamGradeService
 *
 * Tests cover:
 * 1. Visibility rules per role (ACADEMIC_STAFF / LECTURER / STUDENT)
 * 2. Average grade calculation (with and without Resit)
 * 3. Resit replacing Final Exam in finalGrade
 * 4. publishGrades – status update logic
 * 5. Import guards for Resit (exam must be published; student must have avg <
 * 5.0)
 */
@ExtendWith(MockitoExtension.class)
public class ExamGradeServiceTest {

        @Mock
        private StudentGradeRepository studentGradeRepository;
        @Mock
        private GradeComponentRepository gradeComponentRepository;
        @Mock
        private EnrollmentRepository enrollmentRepository;
        @Mock
        private CourseRepository courseRepository;
        @Mock
        private SemesterRepository semesterRepository;
        @Mock
        private UserRepository userRepository;
        @Mock
        private ClassSectionRepository classSectionRepository;
        @Mock
        private NotificationService notificationService;

        @InjectMocks
        private ExamGradeService examGradeService;

        // ─── Shared fixtures ───────────────────────────────────────────────────────

        private Course course;
        private Semester semester;
        private ClassSection classSection;
        private User student;
        private Enrollment enrollment;

        private GradeComponent gcMid; // MID_TERM 30%
        private GradeComponent gcFinal; // FINAL_EXAM 70%
        private GradeComponent gcResit; // RESIT 70%, references gcFinal

        @BeforeEach
        void setUp() {
                course = new Course();
                course.setId(1L);
                course.setCode("PRN211");
                course.setName("C# Programming");

                semester = new Semester();
                semester.setId(1L);
                semester.setCode("SP24");
                semester.setName("Spring 2024");

                classSection = new ClassSection();
                classSection.setClassName("SE1801");
                classSection.setGradesPublished(false);
                classSection.setResitGradesPublished(false);
                classSection.setGradesSubmitted(true);

                student = new User();
                student.setId(1L);
                student.setFullName("Nguyen Van A");
                student.setCode("ST001");

                enrollment = new Enrollment();
                enrollment.setId(1L);
                enrollment.setStudent(student);
                enrollment.setStudentCode("ST001");
                enrollment.setClassSection(classSection);
                enrollment.setStatus(Enrollment.EnrollmentStatus.ENROLLED);

                gcMid = new GradeComponent();
                gcMid.setId(1L);
                gcMid.setName("Midterm");
                gcMid.setType(GradeComponent.GradeType.MID_TERM);
                gcMid.setWeight(30.0);
                gcMid.setIsResit(false);

                gcFinal = new GradeComponent();
                gcFinal.setId(2L);
                gcFinal.setName("Final Exam");
                gcFinal.setType(GradeComponent.GradeType.FINAL_EXAM);
                gcFinal.setWeight(70.0);
                gcFinal.setIsResit(false);

                gcResit = new GradeComponent();
                gcResit.setId(3L);
                gcResit.setName("Resit");
                gcResit.setType(GradeComponent.GradeType.RESIT);
                gcResit.setWeight(70.0);
                gcResit.setIsResit(true);
                gcResit.setReferenceComponent(gcFinal);
        }

        // ══════════════════════════════════════════════════════════════════════════
        // 1. getExamGradeOverview – Visibility per role
        // ══════════════════════════════════════════════════════════════════════════

        @Nested
        @DisplayName("getExamGradeOverview – Hiển thị theo vai trò")
        class ExamGradeVisibility {

                @Test
                @DisplayName("Academic Staff luôn thấy điểm thi dù chưa công bố")
                void academicStaff_shouldAlwaysSeeGrades() {
                        classSection.setGradesPublished(false);
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal),
                                        Map.of(gcMid.getId(), 7.0, gcFinal.getId(), 4.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "ACADEMIC_STAFF");

                        assertFalse(response.getStudentGrades().isEmpty());
                        assertNotNull(response.getStudentGrades().get(0).getFinalGrade(),
                                        "Academic Staff phải thấy điểm dù chưa công bố");
                }

                @Test
                @DisplayName("Giảng viên KHÔNG thấy điểm thi khi chưa công bố")
                void lecturer_shouldNotSeeGradesBeforePublished() {
                        classSection.setGradesPublished(false);
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal),
                                        Map.of(gcMid.getId(), 7.0, gcFinal.getId(), 4.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "LECTURER");

                        assertFalse(response.getStudentGrades().isEmpty());
                        response.getStudentGrades().forEach(row -> assertNull(row.getFinalGrade(),
                                        "Giảng viên không được thấy điểm thi khi chưa công bố"));
                }

                @Test
                @DisplayName("Giảng viên thấy điểm thi sau khi Academic công bố")
                void lecturer_shouldSeeGradesAfterPublished() {
                        classSection.setGradesPublished(true);
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal),
                                        Map.of(gcMid.getId(), 7.0, gcFinal.getId(), 4.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "LECTURER");

                        assertFalse(response.getStudentGrades().isEmpty());
                        response.getStudentGrades().forEach(row -> assertNotNull(row.getFinalGrade(),
                                        "Giảng viên phải thấy điểm sau khi công bố"));
                }

                @Test
                @DisplayName("Sinh viên KHÔNG thấy điểm thi khi chưa công bố")
                void student_shouldNotSeeGradesBeforePublished() {
                        classSection.setGradesPublished(false);
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal),
                                        Map.of(gcMid.getId(), 7.0, gcFinal.getId(), 4.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "STUDENT");

                        response.getStudentGrades().forEach(row -> assertNull(row.getFinalGrade(),
                                        "Sinh viên không được thấy điểm khi chưa công bố"));
                }

                @Test
                @DisplayName("Sinh viên thấy điểm thi sau khi Academic công bố")
                void student_shouldSeeGradesAfterPublished() {
                        classSection.setGradesPublished(true);
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal),
                                        Map.of(gcMid.getId(), 7.0, gcFinal.getId(), 4.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "STUDENT");

                        response.getStudentGrades().forEach(row -> assertNotNull(row.getFinalGrade()));
                }
        }

        // ══════════════════════════════════════════════════════════════════════════
        // 2. getExamGradeOverview – Average grade calculation
        // ══════════════════════════════════════════════════════════════════════════

        @Nested
        @DisplayName("getExamGradeOverview – Tính điểm trung bình")
        class ExamGradeAverage {

                @Test
                @DisplayName("Điểm TB chính xác với Mid + FE (không có Resit)")
                void shouldCalculateAverageCorrectly_noResit() {
                        // Mid=7.0 (30%), FE=4.0 (70%) → avg = (7*30 + 4*70) / 100 = (210+280)/100 = 4.9
                        classSection.setGradesPublished(true);
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal),
                                        Map.of(gcMid.getId(), 7.0, gcFinal.getId(), 4.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "ACADEMIC_STAFF");

                        assertFalse(response.getStudentGrades().isEmpty());
                        Double finalGrade = response.getStudentGrades().get(0).getFinalGrade();
                        assertNotNull(finalGrade);
                        assertEquals(4.9, finalGrade, 0.05, "Điểm TB phải là 4.9");
                }

                @Test
                @DisplayName("Điểm TB tính theo Resit (thay thế FE) khi Resit được công bố")
                void shouldReplaceFeWithResitInAverage_whenResitPublished() {
                        // Mid=7.0 (30%), FE=3.0 (70%) → Without resit: avg = (7*30+3*70)/100 = 4.2
                        // Resit=6.0 (70%) replaces FE → avg = (7*30 + 6*70) / 100 = (210+420)/100 = 6.3
                        classSection.setGradesPublished(true);
                        classSection.setResitGradesPublished(true);
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal, gcResit),
                                        Map.of(gcMid.getId(), 7.0, gcFinal.getId(), 3.0, gcResit.getId(), 6.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "ACADEMIC_STAFF");

                        assertFalse(response.getStudentGrades().isEmpty());
                        Double finalGrade = response.getStudentGrades().get(0).getFinalGrade();
                        assertNotNull(finalGrade);
                        assertEquals(6.3, finalGrade, 0.05,
                                        "Resit phải thay thế FE: avg = (7*30 + 6*70)/100 = 6.3");
                        assertEquals("PASSED", response.getStudentGrades().get(0).getStatus());
                }

                @Test
                @DisplayName("Khi Resit chưa công bố, FE vẫn được dùng trong tính TB")
                void shouldUseFEWhenResitNotPublished() {
                        // Resit exists but not published → FE used
                        // Mid=7.0 (30%), FE=3.0 (70%) → avg = 4.2
                        classSection.setGradesPublished(true);
                        classSection.setResitGradesPublished(false);
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal, gcResit),
                                        Map.of(gcMid.getId(), 7.0, gcFinal.getId(), 3.0, gcResit.getId(), 6.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "ACADEMIC_STAFF");

                        Double finalGrade = response.getStudentGrades().get(0).getFinalGrade();
                        assertNotNull(finalGrade);
                        assertEquals(4.2, finalGrade, 0.05,
                                        "Khi Resit chưa công bố, FE phải được dùng cho TB");
                        assertEquals("FAILED", response.getStudentGrades().get(0).getStatus());
                }

                @Test
                @DisplayName("Loại điểm RESIT trong getExamGradeOverview kiểu RESIT")
                void shouldHandleResitType() {
                        when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(course));
                        when(semesterRepository.findByCode("SP24")).thenReturn(Optional.of(semester));
                        when(gradeComponentRepository.findByCourseIdOrderById(1L))
                                        .thenReturn(Collections.singletonList(gcResit));
                        when(enrollmentRepository.findByCourseAndSemester(anyString(), anyString()))
                                        .thenReturn(Collections.emptyList());
                        when(studentGradeRepository.findByEnrollmentIdIn(anyList()))
                                        .thenReturn(Collections.emptyList());

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "RESIT", "ACADEMIC_STAFF");

                        assertNotNull(response);
                        assertEquals(0, response.getTotalStudents());
                        assertTrue(response.getGradeComponents().get(0).getIsEditable(),
                                        "Resit component phải là editable");
                }
        }

        // ══════════════════════════════════════════════════════════════════════════
        // 3. publishGrades
        // ══════════════════════════════════════════════════════════════════════════

        @Nested
        @DisplayName("publishGrades")
        class PublishGrades {

                @Test
                @DisplayName("Công bố thành công – chỉ cập nhật lớp chưa công bố")
                void publishGrades_Success() {
                        Long userId = 10L;
                        User publisher = new User();
                        publisher.setId(userId);
                        publisher.setFullName("Admin");

                        ClassSection cs1 = new ClassSection();
                        cs1.setClassName("SE1801");
                        cs1.setGradesPublished(false);
                        ClassSection cs2 = new ClassSection();
                        cs2.setClassName("SE1802");
                        cs2.setGradesPublished(true); // Already published

                        Enrollment e1 = new Enrollment();
                        e1.setClassSection(cs1);
                        Enrollment e2 = new Enrollment();
                        e2.setClassSection(cs2);

                        when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(course));
                        when(userRepository.findById(userId)).thenReturn(Optional.of(publisher));
                        when(enrollmentRepository.findByCourseAndSemester("PRN211", "SP24"))
                                        .thenReturn(Arrays.asList(e1, e2));

                        Map<String, Object> result = examGradeService.publishGrades("PRN211", "SP24", "EXAM", userId);

                        assertTrue((Boolean) result.get("success"));
                        assertEquals(1, result.get("publishedClasses"), "Chỉ 1 lớp được cập nhật");
                        verify(classSectionRepository, times(1)).save(cs1);
                        verify(classSectionRepository, never()).save(cs2);
                        assertTrue(cs1.getGradesPublished());
                        assertNotNull(cs1.getGradesPublishedAt());
                }

                @Test
                @DisplayName("Ném lỗi khi không tìm thấy môn học")
                void publishGrades_CourseNotFound() {
                        when(courseRepository.findByCode("NONEXISTENT")).thenReturn(Optional.empty());

                        RuntimeException ex = assertThrows(RuntimeException.class,
                                        () -> examGradeService.publishGrades("NONEXISTENT", "SP24", "EXAM", 1L));
                        assertTrue(ex.getMessage().contains("Course not found"));
                }

                @Test
                @DisplayName("Công bố Resit – chỉ cập nhật resitGradesPublished")
                void publishResitGrades_Success() {
                        Long userId = 10L;
                        User publisher = new User();
                        publisher.setId(userId);
                        publisher.setFullName("Admin");

                        ClassSection cs = new ClassSection();
                        cs.setClassName("SE1801");
                        cs.setResitGradesPublished(false);

                        Enrollment e = new Enrollment();
                        e.setClassSection(cs);

                        when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(course));
                        when(userRepository.findById(userId)).thenReturn(Optional.of(publisher));
                        when(enrollmentRepository.findByCourseAndSemester("PRN211", "SP24"))
                                        .thenReturn(Collections.singletonList(e));

                        Map<String, Object> result = examGradeService.publishGrades("PRN211", "SP24", "RESIT", userId);

                        assertTrue((Boolean) result.get("success"));
                        assertTrue(cs.getResitGradesPublished(), "resitGradesPublished phải là true");
                        assertNotNull(cs.getResitGradesPublishedAt());
                }
        }

        // ══════════════════════════════════════════════════════════════════════════
        // 4. getExamGradeOverview – Stats (pass rate / average)
        // ══════════════════════════════════════════════════════════════════════════

        @Nested
        @DisplayName("getExamGradeOverview – Thống kê (pass rate, average)")
        class ExamGradeStats {

                @Test
                @DisplayName("Pass rate 100% khi tất cả SV có điểm TB >= 5.0")
                void shouldCalculatePassRate100() {
                        classSection.setGradesPublished(true);
                        // Mid=7.0 (30%), FE=8.0 (70%) → avg = (7*30+8*70)/100 = 7.7
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal),
                                        Map.of(gcMid.getId(), 7.0, gcFinal.getId(), 8.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "ACADEMIC_STAFF");

                        assertEquals(100.0, response.getPassRate(), 0.1);
                }

                @Test
                @DisplayName("Pass rate 0% khi tất cả SV có điểm TB < 5.0")
                void shouldCalculatePassRate0() {
                        classSection.setGradesPublished(true);
                        // Mid=3.0 (30%), FE=2.0 (70%) → avg = (3*30+2*70)/100 = 2.3
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal),
                                        Map.of(gcMid.getId(), 3.0, gcFinal.getId(), 2.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "ACADEMIC_STAFF");

                        assertEquals(0.0, response.getPassRate(), 0.1);
                }

                @Test
                @DisplayName("averageGrade được tổng hợp đúng từ toàn bộ SV")
                void shouldCalculateAverageGradeForAllStudents() {
                        classSection.setGradesPublished(true);
                        // Mid=6.0, FE=8.0 → avg = (6*30+8*70)/100 = 7.4
                        setupExamOverviewMocks(Arrays.asList(gcMid, gcFinal),
                                        Map.of(gcMid.getId(), 6.0, gcFinal.getId(), 8.0));

                        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(
                                        "PRN211", "SP24", "EXAM", "ACADEMIC_STAFF");

                        assertEquals(7.4, response.getAverageGrade(), 0.1);
                }
        }

        // ──────────────────────────────────────────────────────────────────────────
        // Helpers
        // ──────────────────────────────────────────────────────────────────────────

        /**
         * Set up standard mocks for getExamGradeOverview calls
         */
        private void setupExamOverviewMocks(List<GradeComponent> components,
                        Map<Long, Double> scores) {
                when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(course));
                when(semesterRepository.findByCode("SP24")).thenReturn(Optional.of(semester));
                when(gradeComponentRepository.findByCourseIdOrderById(1L)).thenReturn(components);
                when(enrollmentRepository.findByCourseAndSemester(anyString(), anyString()))
                                .thenReturn(Collections.singletonList(enrollment));

                List<StudentGrade> grades = new ArrayList<>();
                for (Map.Entry<Long, Double> entry : scores.entrySet()) {
                        GradeComponent gc = components.stream()
                                        .filter(c -> c.getId().equals(entry.getKey()))
                                        .findFirst().orElseThrow();
                        StudentGrade sg = new StudentGrade();
                        sg.setEnrollment(enrollment);
                        sg.setGradeComponent(gc);
                        sg.setScore(entry.getValue());
                        grades.add(sg);
                }
                when(studentGradeRepository.findByEnrollmentIdIn(anyList())).thenReturn(grades);

                // ══════════════════════════════════════════════════════════════════════════
                // 5. isEligibleForResit – Guards
                // ══════════════════════════════════════════════════════════════════════════

                @Nested
                @DisplayName("isEligibleForResit – Kiểm tra điều kiện thi lại")
                class IsEligibleForResit {

                        @Test
                        @DisplayName("Không đủ điều kiện nếu điểm thi (EXAM) chưa công bố")
                        void shouldNotBeEligibleIfExamNotPublished() {
                                classSection.setGradesPublished(false);

                                boolean eligible = examGradeService.isEligibleForResit(enrollment, "PRN211");

                                assertFalse(eligible, "Phải trả về false nếu điểm thi chưa công bố");
                        }

                        @Test
                        @DisplayName("Không đủ điều kiện nếu điểm thi lại (RESIT) đã công bố")
                        void shouldNotBeEligibleIfResitAlreadyPublished() {
                                classSection.setGradesPublished(true);
                                classSection.setResitGradesPublished(true);

                                boolean eligible = examGradeService.isEligibleForResit(enrollment, "PRN211");

                                assertFalse(eligible, "Phải trả về false nếu điểm thi lại đã công bố");
                        }

                        @Test
                        @DisplayName("Không đủ điều kiện nếu điểm TB hiện tại đã đạt (>= 5.0)")
                        void shouldNotBeEligibleIfAverageAlreadyPassed() {
                                classSection.setGradesPublished(true);
                                classSection.setResitGradesPublished(false);

                                when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(course));
                                when(gradeComponentRepository.findByCourseIdOrderById(1L))
                                                .thenReturn(Arrays.asList(gcMid, gcFinal));
                                // Mid=6, Final=4 -> Avg= (6*30 + 4*70)/100 = (180+280)/100 = 4.6 (FAILED)
                                // Mid=7, Final=5 -> Avg= (7*30 + 5*70)/100 = (210+350)/100 = 5.6 (PASSED)
                                when(studentGradeRepository.findByEnrollmentIdIn(anyList()))
                                                .thenReturn(Arrays.asList(
                                                                StudentGrade.builder().gradeComponent(gcMid).score(7.0)
                                                                                .build(),
                                                                StudentGrade.builder().gradeComponent(gcFinal)
                                                                                .score(5.0).build()));

                                boolean eligible = examGradeService.isEligibleForResit(enrollment, "PRN211");

                                assertFalse(eligible, "Sinh viên đã đạt môn (5.6) không được thi lại");
                        }

                        @Test
                        @DisplayName("Đủ điều kiện nếu điểm thi đã công bố và TB < 5.0")
                        void shouldBeEligibleIfExamPublishedAndAverageFailed() {
                                classSection.setGradesPublished(true);
                                classSection.setResitGradesPublished(false);

                                when(courseRepository.findByCode("PRN211")).thenReturn(Optional.of(course));
                                when(gradeComponentRepository.findByCourseIdOrderById(1L))
                                                .thenReturn(Arrays.asList(gcMid, gcFinal));
                                // Mid=4, Final=3 -> Avg= (4*30 + 3*70)/100 = (120+210)/100 = 3.3 (FAILED)
                                when(studentGradeRepository.findByEnrollmentIdIn(anyList()))
                                                .thenReturn(Arrays.asList(
                                                                StudentGrade.builder().gradeComponent(gcMid).score(4.0)
                                                                                .build(),
                                                                StudentGrade.builder().gradeComponent(gcFinal)
                                                                                .score(3.0).build()));

                                boolean eligible = examGradeService.isEligibleForResit(enrollment, "PRN211");

                                assertTrue(eligible, "Sinh viên chưa đạt môn (3.3) phải được thi lại");
                        }
                }
        }
}