package com.fams.backend.service;

import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.fams.backend.dto.response.ExamGradeOverviewResponse;

import java.io.IOException;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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

        @InjectMocks
        private ExamGradeService examGradeService;

        @Test
        void publishGrades_Success() {
                // Arrange
                String courseCode = "PRN211";
                String semesterCode = "SP24";
                Long userId = 1L;

                Course course = new Course();
                course.setCode(courseCode);

                User publisher = new User();
                publisher.setId(userId);
                publisher.setFullName("Test User");

                ClassSection classSection1 = new ClassSection();
                classSection1.setClassName("SE1801-PRN211");
                classSection1.setGradesPublished(false);

                ClassSection classSection2 = new ClassSection();
                classSection2.setClassName("SE1802-PRN211");
                classSection2.setGradesPublished(true); // Already published

                Enrollment enrollment1 = new Enrollment();
                enrollment1.setClassSection(classSection1);

                Enrollment enrollment2 = new Enrollment();
                enrollment2.setClassSection(classSection2);

                when(courseRepository.findByCode(courseCode)).thenReturn(Optional.of(course));
                when(userRepository.findById(userId)).thenReturn(Optional.of(publisher));
                when(enrollmentRepository.findByCourseAndSemester(courseCode, semesterCode))
                                .thenReturn(Arrays.asList(enrollment1, enrollment2));

                // Act
                Map<String, Object> result = examGradeService.publishGrades(courseCode, semesterCode, "EXAM", userId);

                // Assert
                assertTrue((Boolean) result.get("success"));
                assertEquals(1, result.get("publishedClasses")); // Only classSection1 should be updated

                verify(classSectionRepository, times(1)).save(classSection1);
                verify(classSectionRepository, never()).save(classSection2);

                assertTrue(classSection1.getGradesPublished());
                assertNotNull(classSection1.getGradesPublishedAt());
                assertEquals(publisher, classSection1.getGradesPublishedBy());
        }

        @Test
        void publishGrades_CourseNotFound() {
                // Arrange
                String courseCode = "NONEXISTENT";
                String semesterCode = "SP24";
                Long userId = 1L;

                when(courseRepository.findByCode(courseCode)).thenReturn(Optional.empty());

                // Act & Assert
                RuntimeException exception = assertThrows(RuntimeException.class,
                                () -> examGradeService.publishGrades(courseCode, semesterCode, "EXAM", userId));
                assertTrue(exception.getMessage().contains("Course not found"));
        }

        @Test
        void publishGrades_UserNotFound() {
                // Arrange
                String courseCode = "PRN211";
                String semesterCode = "SP24";
                Long userId = 999L;

                Course course = new Course();
                when(courseRepository.findByCode(courseCode)).thenReturn(Optional.of(course));
                when(userRepository.findById(userId)).thenReturn(Optional.empty());

                // Act & Assert
                RuntimeException exception = assertThrows(RuntimeException.class,
                                () -> examGradeService.publishGrades(courseCode, semesterCode, "EXAM", userId));
                assertTrue(exception.getMessage().contains("User not found"));
        }

        @Test
        void getExamGradeOverview_Success() {
                // Arrange
                String courseCode = "PRN211";
                String semesterCode = "SP24";
                String type = "EXAM";

                Course course = new Course();
                course.setId(1L);
                course.setName("Java Web");
                course.setCode(courseCode);

                Semester semester = new Semester();
                semester.setName("Spring 2024");
                semester.setCode(semesterCode);

                when(courseRepository.findByCode(courseCode)).thenReturn(Optional.of(course));
                when(semesterRepository.findByCode(semesterCode)).thenReturn(Optional.of(semester));

                GradeComponent gc1 = new GradeComponent();
                gc1.setId(1L);
                gc1.setName("Midterm");
                gc1.setType(GradeComponent.GradeType.MID_TERM);
                gc1.setWeight(0.3);

                GradeComponent gc2 = new GradeComponent();
                gc2.setId(2L);
                gc2.setName("Final");
                gc2.setType(GradeComponent.GradeType.FINAL_EXAM);
                gc2.setWeight(0.7);

                when(gradeComponentRepository.findByCourseIdOrderById(1L)).thenReturn(Arrays.asList(gc1, gc2));

                ClassSection classSection = new ClassSection();
                classSection.setClassName("SE1801");

                User student = new User();
                student.setFullName("Nguyen Van A");

                Enrollment enrollment = new Enrollment();
                enrollment.setId(100L);
                enrollment.setStudentCode("SE123456");
                enrollment.setStudent(student);
                enrollment.setClassSection(classSection);

                when(enrollmentRepository.findByCourseAndSemester(courseCode, semesterCode))
                                .thenReturn(Collections.singletonList(enrollment));

                StudentGrade sg1 = new StudentGrade();
                sg1.setEnrollment(enrollment);
                sg1.setGradeComponent(gc1);
                sg1.setScore(8.0);

                StudentGrade sg2 = new StudentGrade();
                sg2.setEnrollment(enrollment);
                sg2.setGradeComponent(gc2);
                sg2.setScore(9.0);

                when(studentGradeRepository.findByEnrollmentIdIn(anyList()))
                                .thenReturn(Arrays.asList(sg1, sg2));

                // Act
                ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(courseCode, semesterCode,
                                type);

                // Assert
                assertNotNull(response);
                assertEquals(courseCode, response.getCourseCode());
                assertEquals(1, response.getTotalStudents());
                assertEquals(8.7, response.getAverageGrade()); // (8*0.3 + 9*0.7) = 2.4 + 6.3 = 8.7
                assertEquals(100.0, response.getPassRate());
                assertFalse(response.getGradesPublished());
        }

        @Test
        void getExamGradeOverview_ResitType() {
                // Arrange
                String courseCode = "PRN211";
                String semesterCode = "SP24";
                String type = "RESIT";

                Course course = new Course();
                course.setId(1L);
                when(courseRepository.findByCode(courseCode)).thenReturn(Optional.of(course));
                Semester semester = new Semester();
                when(semesterRepository.findByCode(semesterCode)).thenReturn(Optional.of(semester));

                GradeComponent gcResit = new GradeComponent();
                gcResit.setId(3L);
                gcResit.setName("Resit");
                gcResit.setType(GradeComponent.GradeType.RESIT);
                gcResit.setWeight(1.0);

                when(gradeComponentRepository.findByCourseIdOrderById(1L))
                                .thenReturn(Collections.singletonList(gcResit));
                when(enrollmentRepository.findByCourseAndSemester(anyString(), anyString()))
                                .thenReturn(Collections.emptyList());
                when(studentGradeRepository.findByEnrollmentIdIn(anyList())).thenReturn(Collections.emptyList());

                // Act
                ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(courseCode, semesterCode,
                                type);

                // Assert
                assertNotNull(response);
                assertEquals(0, response.getTotalStudents());
                // Verify only RESIT components are marked editable
                assertTrue(response.getGradeComponents().get(0).getIsEditable());
        }

        @Test
        void previewExamGradeImport_Success() throws IOException {
                // Arrange
                String courseCode = "PRN211";
                String semesterCode = "SP24";
                String type = "EXAM";

                Course course = new Course();
                course.setId(1L);
                when(courseRepository.findByCode(courseCode)).thenReturn(Optional.of(course));

                GradeComponent gc1 = new GradeComponent();
                gc1.setId(1L);
                gc1.setName("Midterm");
                gc1.setType(GradeComponent.GradeType.MID_TERM);
                gc1.setWeight(0.3);

                when(gradeComponentRepository.findByCourseIdOrderById(1L)).thenReturn(Collections.singletonList(gc1));

                ClassSection classSection = new ClassSection();
                classSection.setGradesPublished(false);
                classSection.setResitGradesPublished(false);

                Enrollment enrollment = new Enrollment();
                enrollment.setId(100L);
                enrollment.setStudentCode("SE123456");
                enrollment.setClassSection(classSection);
                when(enrollmentRepository.findByCourseAndSemester(courseCode, semesterCode))
                                .thenReturn(Collections.singletonList(enrollment));

                // Create a mock Excel file
                org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                                "file",
                                "grades.xlsx",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                createExcelContent());

                // Act
                Map<String, Object> result = examGradeService.previewExamGradeImport(courseCode, semesterCode, type,
                                file);

                // Assert
                assertNotNull(result);
                List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("rows");
                assertEquals(1, rows.size());
                assertEquals("SE123456", rows.get(0).get("studentCode"));
                assertEquals("VALID", rows.get(0).get("status"));
        }

        @Test
        void importExamGradesFromExcel_Success() throws IOException {
                // Arrange
                String courseCode = "PRN211";
                String semesterCode = "SP24";
                String type = "EXAM";
                Long userId = 1L;

                Course course = new Course();
                course.setId(1L);
                when(courseRepository.findByCode(courseCode)).thenReturn(Optional.of(course));

                User user = new User();
                when(userRepository.findById(userId)).thenReturn(Optional.of(user));

                GradeComponent gc1 = new GradeComponent();
                gc1.setId(1L);
                gc1.setName("Midterm");
                gc1.setType(GradeComponent.GradeType.MID_TERM);
                when(gradeComponentRepository.findByCourseIdOrderById(1L)).thenReturn(Collections.singletonList(gc1));

                ClassSection classSection = new ClassSection();
                classSection.setGradesPublished(false);
                classSection.setResitGradesPublished(false);

                Enrollment enrollment = new Enrollment();
                enrollment.setId(100L);
                enrollment.setStudentCode("SE123456");
                enrollment.setClassSection(classSection);
                when(enrollmentRepository.findByCourseAndSemester(courseCode, semesterCode))
                                .thenReturn(Collections.singletonList(enrollment));

                when(studentGradeRepository.findByEnrollmentIdAndGradeComponentId(100L, 1L))
                                .thenReturn(Optional.empty());

                org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                                "file",
                                "grades.xlsx",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                createExcelContent());

                // Act
                Map<String, Object> result = examGradeService.importExamGradesFromExcel(courseCode, semesterCode, type,
                                file,
                                userId);

                // Assert
                assertTrue((Boolean) result.get("success"));
                assertEquals(1, result.get("imported"));
                verify(studentGradeRepository, times(1)).save(any(StudentGrade.class));
        }

        // Helper to create valid Excel content
        private byte[] createExcelContent() throws IOException {
                try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
                        org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Grades");
                        org.apache.poi.ss.usermodel.Row header = sheet.createRow(0);
                        header.createCell(0).setCellValue("STT");
                        header.createCell(1).setCellValue("MSSV");
                        header.createCell(2).setCellValue("Name");
                        header.createCell(3).setCellValue("Class");
                        header.createCell(4).setCellValue("Midterm"); // Matches component name

                        org.apache.poi.ss.usermodel.Row row = sheet.createRow(1);
                        row.createCell(0).setCellValue("1");
                        row.createCell(1).setCellValue("SE123456");
                        row.createCell(2).setCellValue("Nguyen Van A");
                        row.createCell(3).setCellValue("SE1801");
                        row.createCell(4).setCellValue(8.5);

                        java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                        workbook.write(bos);
                        return bos.toByteArray();
                }
        }
}
