package com.fams.backend.service.impl;

import com.fams.backend.dto.request.CourseRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.entity.Course;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.SpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationRepository;
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

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceImplTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private SpecializationCourseRepository specializationCourseRepository;

    @Mock
    private SubSpecializationCourseRepository subSpecializationCourseRepository;

    @Mock
    private SubSpecializationRepository subSpecializationRepository;

    @Mock
    private SystemLogService systemLogService;

    @InjectMocks
    private CourseServiceImpl courseService;

    private Course activeCourse;
    private CourseRequest courseRequest;

    @BeforeEach
    void setUp() {
        activeCourse = Course.builder()
                .id(1L)
                .code("PRF192")
                .name("Programming Fundamentals")
                .description("Introduction to programming")
                .credits(3)
                .numberOfSlots(45)
                .status(Course.CourseStatus.ACTIVE)
                .build();

        courseRequest = CourseRequest.builder()
                .code("PRF192")
                .name("Programming Fundamentals")
                .description("Introduction to programming")
                .credits(3)
                .numberOfSlots(45)
                .build();
    }

    @Test
    @DisplayName("Get Courses: Success with pagination and filters")
    void getCourses_Success() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        Page<Course> coursePage = new PageImpl<>(List.of(activeCourse));
        when(courseRepository.findBySearch(any(), any(), any(Pageable.class))).thenReturn(coursePage);
        when(subSpecializationCourseRepository.existsByCourseId(1L)).thenReturn(false);

        // Act
        Page<CourseResponse> result = courseService.getCourses("PRF", Course.CourseStatus.ACTIVE, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("PRF192", result.getContent().get(0).getCode());
        assertTrue(result.getContent().get(0).isCanDelete());
    }

    @Test
    @DisplayName("Create Course: Success")
    void createCourse_Success() {
        // Arrange
        when(courseRepository.existsByCode("PRF192")).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenReturn(activeCourse);
        when(subSpecializationCourseRepository.existsByCourseId(1L)).thenReturn(false);

        // Act
        CourseResponse result = courseService.createCourse(courseRequest);

        // Assert
        assertNotNull(result);
        assertEquals("PRF192", result.getCode());
        assertEquals("Programming Fundamentals", result.getName());
        verify(courseRepository).save(any(Course.class));
    }

    @Test
    @DisplayName("Update Course: Success")
    void updateCourse_Success() {
        // Arrange
        when(courseRepository.findById(1L)).thenReturn(Optional.of(activeCourse));
        when(courseRepository.findByCode("PRF192")).thenReturn(Optional.of(activeCourse));
        when(courseRepository.save(any(Course.class))).thenReturn(activeCourse);
        when(subSpecializationCourseRepository.existsByCourseId(1L)).thenReturn(false);

        // Act
        CourseResponse result = courseService.updateCourse(1L, courseRequest);

        // Assert
        assertNotNull(result);
        assertEquals("PRF192", result.getCode());
        verify(courseRepository).save(any(Course.class));
    }

    @Test
    @DisplayName("Delete Course: Success when not in use")
    void deleteCourse_Success() {
        // Arrange
        when(courseRepository.findById(1L)).thenReturn(Optional.of(activeCourse));
        when(subSpecializationCourseRepository.existsByCourseId(1L)).thenReturn(false);
        when(specializationCourseRepository.existsByCourseId(1L)).thenReturn(false);

        // Act
        courseService.deleteCourse(1L);

        // Assert
        verify(courseRepository).deleteById(1L);
    }

    @Test
    @DisplayName("Update Status: Success")
    void updateStatus_Success() {
        // Arrange
        when(courseRepository.findById(1L)).thenReturn(Optional.of(activeCourse));
        when(courseRepository.save(any(Course.class))).thenReturn(activeCourse);
        when(subSpecializationCourseRepository.existsByCourseId(1L)).thenReturn(false);

        // Act
        CourseResponse result = courseService.updateStatus(1L, Course.CourseStatus.INACTIVE);

        // Assert
        assertNotNull(result);
        verify(courseRepository).save(any(Course.class));
    }

    @Test
    @DisplayName("Update Status: Course not found throws IllegalArgumentException")
    void updateStatus_NotFound() {
        // Arrange
        when(courseRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(IllegalArgumentException.class,
                () -> courseService.updateStatus(999L, Course.CourseStatus.INACTIVE));
        verify(courseRepository, never()).save(any(Course.class));
    }

    @Test
    @DisplayName("Update Status: ACTIVE to INACTIVE")
    void updateStatus_ActiveToInactive() {
        // Arrange
        when(courseRepository.findById(1L)).thenReturn(Optional.of(activeCourse));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> {
            Course c = (Course) i.getArguments()[0];
            assertEquals(Course.CourseStatus.INACTIVE, c.getStatus());
            return c;
        });
        when(subSpecializationCourseRepository.existsByCourseId(1L)).thenReturn(false);

        // Act
        CourseResponse result = courseService.updateStatus(1L, Course.CourseStatus.INACTIVE);

        // Assert
        assertNotNull(result);
        verify(systemLogService).logCourseStatusChanged("PRF192", "INACTIVE");
    }

    @Test
    @DisplayName("Update Status: INACTIVE to ACTIVE")
    void updateStatus_InactiveToActive() {
        // Arrange
        Course inactiveCourse = Course.builder()
                .id(2L)
                .code("MAE101")
                .name("Mathematics")
                .credits(3)
                .numberOfSlots(30)
                .status(Course.CourseStatus.INACTIVE)
                .build();

        when(courseRepository.findById(2L)).thenReturn(Optional.of(inactiveCourse));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> {
            Course c = (Course) i.getArguments()[0];
            assertEquals(Course.CourseStatus.ACTIVE, c.getStatus());
            return c;
        });
        when(subSpecializationCourseRepository.existsByCourseId(2L)).thenReturn(false);

        // Act
        CourseResponse result = courseService.updateStatus(2L, Course.CourseStatus.ACTIVE);

        // Assert
        assertNotNull(result);
        verify(systemLogService).logCourseStatusChanged("MAE101", "ACTIVE");
    }

    @Test
    @DisplayName("Update Status: Same status (no-op save)")
    void updateStatus_SameStatus() {
        // Arrange
        when(courseRepository.findById(1L)).thenReturn(Optional.of(activeCourse));
        when(courseRepository.save(any(Course.class))).thenReturn(activeCourse);
        when(subSpecializationCourseRepository.existsByCourseId(1L)).thenReturn(false);

        // Act
        CourseResponse result = courseService.updateStatus(1L, Course.CourseStatus.ACTIVE);

        // Assert
        assertNotNull(result);
        verify(courseRepository).save(any(Course.class));
    }
}
