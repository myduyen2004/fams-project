package com.fams.backend.service;

import com.fams.backend.dto.response.StudentMyGradeResponse;
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
 * Unit tests for StudentGradeService
 *
 * Tests cover:
 * 1. Visibility rules per role (Student/Lecturer/Academic Staff)
 * 2. Average grade calculation (with and without Resit)
 * 3. Resit replacing Final Exam in course average
 * 4. Grade Overview permissions (Academic Staff hide if not submitted)
 */
@ExtendWith(MockitoExtension.class)
public class StudentGradeServiceTest {

    @Mock
    private StudentGradeRepository studentGradeRepository;
    @Mock
    private ClassSectionRepository classSectionRepository;
    @Mock
    private GradeComponentRepository gradeComponentRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StudentGradeService studentGradeService;

    // ─── Shared fixtures ───────────────────────────────────────────────────────

    private User student;
    private Course course;
    private Semester semester;
    private ClassSection classSection;
    private Enrollment enrollment;

    private GradeComponent gcQuiz; // 20% – component grade
    private GradeComponent gcFinal; // 80% – exam grade (FINAL_EXAM)
    private GradeComponent gcResit; // 80% – resit (references gcFinal)

    @BeforeEach
    void setUp() {
        student = User.builder()
                .id(1L).fullName("Nguyen Van A").code("ST001").build();

        course = Course.builder()
                .id(1L).name("Java Programming").code("JAVA101").build();

        semester = Semester.builder()
                .id(1L).name("Spring 2024").code("SP24").build();

        classSection = ClassSection.builder()
                .className("JAVA-CLASS")
                .course(course).semester(semester)
                .gradesSubmitted(false)
                .gradesPublished(false)
                .resitGradesPublished(false)
                .build();

        enrollment = Enrollment.builder()
                .id(1L).student(student).studentCode("ST001")
                .classSection(classSection)
                .status(Enrollment.EnrollmentStatus.ENROLLED)
                .build();

        gcQuiz = GradeComponent.builder()
                .id(1L).name("Quiz 1")
                .type(GradeComponent.GradeType.QUIZ)
                .weight(20.0).isRequired(true).isResit(false).build();

        gcFinal = GradeComponent.builder()
                .id(2L).name("Final Exam")
                .type(GradeComponent.GradeType.FINAL_EXAM)
                .weight(80.0).isRequired(true).isResit(false).build();

        gcResit = GradeComponent.builder()
                .id(3L).name("Resit")
                .type(GradeComponent.GradeType.RESIT)
                .weight(80.0).isRequired(false).isResit(true)
                .referenceComponent(gcFinal) // Resit replaces Final Exam
                .build();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 1. getStudentGrades – Visibility rules
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("getStudentGrades – Visibility (Student view)")
    class StudentGradeVisibility {

        @Test
        @DisplayName("SV không thấy điểm thành phần khi GV chưa nộp")
        void shouldHideComponentGradesWhenNotSubmitted() {
            // gradesSubmitted = false → quiz score hidden
            mockStudentSetup(false, false, false,
                    Arrays.asList(gcQuiz, gcFinal),
                    Map.of(gcQuiz.getId(), 8.0));

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            // Quiz belongs to regular category → not yet submitted → must be null
            response.getGradeCategories().stream()
                    .flatMap(c -> c.getItems().stream())
                    .filter(i -> "Quiz 1".equals(i.getItemName()))
                    .forEach(item -> {
                        assertNull(item.getValue(), "Quiz score phải là null khi chưa submitted");
                        assertFalse(item.getIsPublished(), "isPublished phải là false");
                    });
        }

        @Test
        @DisplayName("SV thấy điểm thành phần sau khi GV nộp")
        void shouldShowComponentGradesAfterSubmitted() {
            // gradesSubmitted = true → quiz score visible
            mockStudentSetup(true, false, false,
                    Arrays.asList(gcQuiz, gcFinal),
                    Map.of(gcQuiz.getId(), 8.0));

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            response.getGradeCategories().stream()
                    .flatMap(c -> c.getItems().stream())
                    .filter(i -> "Quiz 1".equals(i.getItemName()))
                    .forEach(item -> {
                        assertNotNull(item.getValue(), "Quiz score phải hiển thị sau khi submitted");
                        assertEquals(8.0, item.getValue());
                    });
        }

        @Test
        @DisplayName("SV không thấy điểm thi (FE) khi Academic chưa công bố")
        void shouldHideExamGradesWhenNotPublished() {
            // gradesPublished = false → FE score hidden
            mockStudentSetup(true, false, false,
                    Arrays.asList(gcQuiz, gcFinal),
                    Map.of(gcQuiz.getId(), 8.0, gcFinal.getId(), 4.0));

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            response.getGradeCategories().stream()
                    .flatMap(c -> c.getItems().stream())
                    .filter(i -> "Final Exam".equals(i.getItemName()))
                    .forEach(item -> {
                        assertNull(item.getValue(), "FE score phải null khi chưa published");
                    });
        }

        @Test
        @DisplayName("SV thấy điểm thi (FE) sau khi Academic công bố")
        void shouldShowExamGradesAfterPublished() {
            // gradesPublished = true → FE score visible
            mockStudentSetup(true, true, false,
                    Arrays.asList(gcQuiz, gcFinal),
                    Map.of(gcQuiz.getId(), 8.0, gcFinal.getId(), 4.0));

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            response.getGradeCategories().stream()
                    .flatMap(c -> c.getItems().stream())
                    .filter(i -> "Final Exam".equals(i.getItemName()))
                    .forEach(item -> {
                        assertEquals(4.0, item.getValue(), "FE score phải hiển thị sau khi published");
                    });
        }

        @Test
        @DisplayName("SV không thấy điểm thi lại khi Academic chưa công bố Resit")
        void shouldHideResitGradesWhenNotPublished() {
            // resitGradesPublished = false → Resit hidden
            mockStudentSetup(true, true, false,
                    Arrays.asList(gcQuiz, gcFinal, gcResit),
                    Map.of(gcQuiz.getId(), 8.0, gcFinal.getId(), 3.0, gcResit.getId(), 6.5));

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            response.getGradeCategories().stream()
                    .flatMap(c -> c.getItems().stream())
                    .filter(i -> "Resit".equals(i.getItemName()))
                    .forEach(item -> {
                        assertNull(item.getValue(), "Resit score phải null khi chưa resitPublished");
                    });
        }

        @Test
        @DisplayName("SV thấy điểm thi lại sau khi Academic công bố Resit")
        void shouldShowResitGradesAfterPublished() {
            // resitGradesPublished = true → Resit visible
            mockStudentSetup(true, true, true,
                    Arrays.asList(gcQuiz, gcFinal, gcResit),
                    Map.of(gcQuiz.getId(), 8.0, gcFinal.getId(), 3.0, gcResit.getId(), 6.5));

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            response.getGradeCategories().stream()
                    .flatMap(c -> c.getItems().stream())
                    .filter(i -> "Resit".equals(i.getItemName()))
                    .forEach(item -> {
                        assertEquals(6.5, item.getValue(), "Resit score phải hiển thị sau khi resitPublished");
                    });
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. getStudentGrades – Average grade calculation
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("getStudentGrades – Tính điểm trung bình")
    class StudentGradeAverage {

        @Test
        @DisplayName("Điểm TB chính xác khi chỉ có Quiz + FE (không có Resit)")
        void shouldCalculateAverageWithoutResit() {
            // Quiz=8.0 (20%), FE=4.0 (80%)
            // Expected avg = (8*20 + 4*80) / 100 = (160+320)/100 = 480/100 = 4.8
            mockStudentSetup(true, true, false,
                    Arrays.asList(gcQuiz, gcFinal),
                    Map.of(gcQuiz.getId(), 8.0, gcFinal.getId(), 4.0));

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            assertNotNull(response.getCourseAverage());
            assertEquals(4.8, response.getCourseAverage(), 0.05, "Điểm TB phải là 4.8");
            assertEquals("FAILED", response.getCourseStatus());
        }

        @Test
        @DisplayName("Điểm TB tính theo Resit (thay thế FE) khi Resit được công bố")
        void shouldReplaceFeWithResitInAverage() {
            // Quiz=8.0 (20%), FE=3.0 (80%) → avg would be 4.0 WITHOUT resit
            // Resit=6.5 (80%) replaces FE → avg = (8*20 + 6.5*80) / 100 = (160+520)/100 =
            // 6.8
            mockStudentSetup(true, true, true,
                    Arrays.asList(gcQuiz, gcFinal, gcResit),
                    Map.of(gcQuiz.getId(), 8.0, gcFinal.getId(), 3.0, gcResit.getId(), 6.5));

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            assertNotNull(response.getCourseAverage());
            assertEquals(6.8, response.getCourseAverage(), 0.05,
                    "Resit phải thay thế FE: avg = (8*20 + 6.5*80)/100 = 6.8");
            assertEquals("PASSED", response.getCourseStatus());
        }

        @Test
        @DisplayName("Khi Resit chưa công bố, FE vẫn được dùng trong tính TB")
        void shouldUseFeWhenResitNotPublished() {
            // Resit exists but not published → FE used for average
            // Quiz=8.0 (20%), FE=3.0 (80%) → avg = 4.0
            mockStudentSetup(true, true, false,
                    Arrays.asList(gcQuiz, gcFinal, gcResit),
                    Map.of(gcQuiz.getId(), 8.0, gcFinal.getId(), 3.0, gcResit.getId(), 6.5));

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            assertNotNull(response.getCourseAverage());
            assertEquals(4.0, response.getCourseAverage(), 0.05,
                    "Khi Resit chưa công bố, FE phải được dùng trong tính TB");
            assertEquals("FAILED", response.getCourseStatus());
        }

        @Test
        @DisplayName("Điểm TB là null khi chưa có điểm nào hợp lệ")
        void shouldReturnNullAverageWhenNoGrades() {
            mockStudentSetup(false, false, false,
                    Arrays.asList(gcQuiz, gcFinal),
                    Map.of());

            StudentMyGradeResponse response = studentGradeService.getStudentGrades(1L, "JAVA-CLASS");

            assertNull(response.getCourseAverage(), "Điểm TB phải null khi không có điểm nào");
            assertEquals("PENDING", response.getCourseStatus());
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. getGradeOverview – Academic Staff permissions
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("getGradeOverview – Phân quyền theo vai trò")
    class GradeOverviewPermissions {

        @Test
        @DisplayName("Academic Staff không thấy điểm khi GV chưa nộp (gradesSubmitted=false)")
        void academicStaff_shouldHideGradesWhenNotSubmitted() {
            // gradesSubmitted = false and caller is ACADEMIC_STAFF → grades hidden
            classSection.setGradesSubmitted(false);
            when(classSectionRepository.findByClassName("JAVA-CLASS"))
                    .thenReturn(Optional.of(classSection));
            when(gradeComponentRepository.findByCourseIdOrderById(1L))
                    .thenReturn(Arrays.asList(gcQuiz, gcFinal));

            Enrollment e = enrollment;
            when(enrollmentRepository.findByClassSectionClassName("JAVA-CLASS"))
                    .thenReturn(Collections.singletonList(e));
            when(studentGradeRepository.findByEnrollmentIdIn(anyList()))
                    .thenReturn(Arrays.asList(
                            makeGrade(e, gcQuiz, 8.0),
                            makeGrade(e, gcFinal, 5.0)));

            var response = studentGradeService.getGradeOverview("JAVA-CLASS", "ACADEMIC_STAFF");

            assertFalse(response.getStudentGrades().isEmpty());
            response.getStudentGrades().forEach(row -> {
                assertTrue(row.getGrades().isEmpty() || row.getGrades().values().stream().allMatch(Objects::isNull),
                        "Academic Staff không được thấy điểm khi chưa nộp");
                assertNull(row.getFinalGrade());
            });
        }

        @Test
        @DisplayName("Academic Staff thấy điểm sau khi GV đã nộp (gradesSubmitted=true)")
        void academicStaff_shouldSeeGradesAfterSubmitted() {
            classSection.setGradesSubmitted(true);
            when(classSectionRepository.findByClassName("JAVA-CLASS"))
                    .thenReturn(Optional.of(classSection));
            when(gradeComponentRepository.findByCourseIdOrderById(1L))
                    .thenReturn(Arrays.asList(gcQuiz, gcFinal));

            Enrollment e = enrollment;
            when(enrollmentRepository.findByClassSectionClassName("JAVA-CLASS"))
                    .thenReturn(Collections.singletonList(e));
            when(studentGradeRepository.findByEnrollmentIdIn(anyList()))
                    .thenReturn(Arrays.asList(
                            makeGrade(e, gcQuiz, 8.0),
                            makeGrade(e, gcFinal, 5.0)));

            var response = studentGradeService.getGradeOverview("JAVA-CLASS", "ACADEMIC_STAFF");

            assertFalse(response.getStudentGrades().isEmpty());
            response.getStudentGrades().forEach(row -> {
                assertNotNull(row.getFinalGrade(), "Academic Staff phải thấy điểm sau khi submitted");
            });
        }

        @Test
        @DisplayName("Giảng viên luôn thấy điểm bất kể trạng thái nộp")
        void lecturer_shouldAlwaysSeeGrades() {
            classSection.setGradesSubmitted(false); // Even if not submitted
            when(classSectionRepository.findByClassName("JAVA-CLASS"))
                    .thenReturn(Optional.of(classSection));
            when(gradeComponentRepository.findByCourseIdOrderById(1L))
                    .thenReturn(Arrays.asList(gcQuiz, gcFinal));

            Enrollment e = enrollment;
            when(enrollmentRepository.findByClassSectionClassName("JAVA-CLASS"))
                    .thenReturn(Collections.singletonList(e));
            when(studentGradeRepository.findByEnrollmentIdIn(anyList()))
                    .thenReturn(Arrays.asList(makeGrade(e, gcQuiz, 8.0)));

            var response = studentGradeService.getGradeOverview("JAVA-CLASS", "LECTURER");

            assertFalse(response.getStudentGrades().isEmpty());
            response.getStudentGrades().forEach(row -> {
                assertFalse(row.getGrades().isEmpty(), "Giảng viên phải thấy điểm kể cả khi chưa submitted");
            });
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Sets up common mocks for getStudentGrades
     */
    private void mockStudentSetup(boolean submitted, boolean published, boolean resitPublished,
            List<GradeComponent> components, Map<Long, Double> scores) {
        classSection.setGradesSubmitted(submitted);
        classSection.setGradesPublished(published);
        classSection.setResitGradesPublished(resitPublished);

        when(classSectionRepository.findByClassName("JAVA-CLASS"))
                .thenReturn(Optional.of(classSection));
        when(enrollmentRepository.findByClassSectionClassName("JAVA-CLASS"))
                .thenReturn(Collections.singletonList(enrollment));
        when(gradeComponentRepository.findByCourseIdOrderById(1L))
                .thenReturn(components);

        List<StudentGrade> grades = new ArrayList<>();
        for (Map.Entry<Long, Double> entry : scores.entrySet()) {
            GradeComponent gc = components.stream()
                    .filter(c -> c.getId().equals(entry.getKey()))
                    .findFirst().orElseThrow();
            grades.add(makeGrade(enrollment, gc, entry.getValue()));
        }
        when(studentGradeRepository.findByEnrollmentIdIn(anyList())).thenReturn(grades);
    }

    private StudentGrade makeGrade(Enrollment e, GradeComponent gc, double score) {
        return StudentGrade.builder()
                .id((long) (Math.random() * 1000))
                .enrollment(e)
                .gradeComponent(gc)
                .score(score)
                .attempt(1)
                .build();
    }
}
