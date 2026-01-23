package com.fams.backend.service.impl;

import com.fams.backend.dto.request.SubSpecializationRequest;
import com.fams.backend.dto.response.SubSpecializationResponse;
import com.fams.backend.entity.Specialization;
import com.fams.backend.entity.SubSpecialization;
import com.fams.backend.repository.*;
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
class SubSpecializationServiceImplTest {

    @Mock
    private SubSpecializationRepository subSpecializationRepository;

    @Mock
    private SubSpecializationCourseRepository subSpecializationCourseRepository;

    @Mock
    private SpecializationRepository specializationRepository;

    @Mock
    private SpecializationCourseRepository specializationCourseRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @InjectMocks
    private SubSpecializationServiceImpl subSpecializationService;

    private Specialization specialization;
    private SubSpecialization activeSubSpec;
    private SubSpecializationRequest subSpecRequest;

    @BeforeEach
    void setUp() {
        specialization = Specialization.builder()
                .id(1L)
                .code("SE-JS")
                .name("JavaScript Fullstack")
                .build();

        activeSubSpec = SubSpecialization.builder()
                .id(1L)
                .code("SE-JS-REACT")
                .name("ReactJS Development")
                .description("Frontend with ReactJS")
                .status(SubSpecialization.SubSpecializationStatus.ACTIVE)
                .specialization(specialization)
                .build();

        subSpecRequest = SubSpecializationRequest.builder()
                .code("SE-JS-REACT")
                .name("ReactJS Development")
                .description("Frontend with ReactJS")
                .specializationId(1L)
                .build();
    }

    @Test
    @DisplayName("Get SubSpecializations: Success with pagination")
    void getSubSpecializationsBySpecialization_Success() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        Page<SubSpecialization> subSpecPage = new PageImpl<>(List.of(activeSubSpec));
        when(subSpecializationRepository.findBySpecializationIdAndSearch(eq(1L), any(), any(), any(Pageable.class)))
                .thenReturn(subSpecPage);
        when(subSpecializationCourseRepository.sumCreditsBySubSpecializationId(1L)).thenReturn(0);
        when(subSpecializationCourseRepository.countBySubSpecializationId(1L)).thenReturn(0L);
        when(studentProfileRepository.existsBySubSpecializationId(1L)).thenReturn(false);

        // Act
        Page<SubSpecializationResponse> result = subSpecializationService.getSubSpecializationsBySpecialization(
                1L, "REACT", SubSpecialization.SubSpecializationStatus.ACTIVE, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("SE-JS-REACT", result.getContent().get(0).getCode());
    }

    @Test
    @DisplayName("Create SubSpecialization: Success")
    void createSubSpecialization_Success() {
        // Arrange
        when(subSpecializationRepository.existsByCode("SE-JS-REACT")).thenReturn(false);
        when(specializationRepository.findById(1L)).thenReturn(Optional.of(specialization));
        when(subSpecializationRepository.save(any(SubSpecialization.class))).thenReturn(activeSubSpec);
        when(subSpecializationCourseRepository.sumCreditsBySubSpecializationId(1L)).thenReturn(0);
        when(subSpecializationCourseRepository.countBySubSpecializationId(1L)).thenReturn(0L);
        when(studentProfileRepository.existsBySubSpecializationId(1L)).thenReturn(false);

        // Act
        SubSpecializationResponse result = subSpecializationService.createSubSpecialization(subSpecRequest);

        // Assert
        assertNotNull(result);
        assertEquals("SE-JS-REACT", result.getCode());
        verify(subSpecializationRepository).save(any(SubSpecialization.class));
    }

    @Test
    @DisplayName("Update SubSpecialization: Success")
    void updateSubSpecialization_Success() {
        // Arrange
        when(subSpecializationRepository.findById(1L)).thenReturn(Optional.of(activeSubSpec));
        when(subSpecializationRepository.save(any(SubSpecialization.class))).thenReturn(activeSubSpec);
        when(subSpecializationCourseRepository.sumCreditsBySubSpecializationId(1L)).thenReturn(0);
        when(subSpecializationCourseRepository.countBySubSpecializationId(1L)).thenReturn(0L);
        when(studentProfileRepository.existsBySubSpecializationId(1L)).thenReturn(false);

        // Act
        SubSpecializationResponse result = subSpecializationService.updateSubSpecialization(1L, subSpecRequest);

        // Assert
        assertNotNull(result);
        assertEquals("SE-JS-REACT", result.getCode());
    }

    @Test
    @DisplayName("Delete SubSpecialization: Success when no students")
    void deleteSubSpecialization_Success() {
        // Arrange
        when(studentProfileRepository.existsBySubSpecializationId(1L)).thenReturn(false);

        // Act
        subSpecializationService.deleteSubSpecialization(1L);

        // Assert
        verify(subSpecializationRepository).deleteById(1L);
    }

    @Test
    @DisplayName("Update Status: Success")
    void updateStatus_Success() {
        // Arrange
        when(subSpecializationRepository.findById(1L)).thenReturn(Optional.of(activeSubSpec));
        when(subSpecializationRepository.save(any(SubSpecialization.class))).thenReturn(activeSubSpec);
        when(subSpecializationCourseRepository.sumCreditsBySubSpecializationId(1L)).thenReturn(0);
        when(subSpecializationCourseRepository.countBySubSpecializationId(1L)).thenReturn(0L);
        when(studentProfileRepository.existsBySubSpecializationId(1L)).thenReturn(false);

        // Act
        SubSpecializationResponse result = subSpecializationService.updateStatus(1L,
                SubSpecialization.SubSpecializationStatus.INACTIVE);

        // Assert
        assertNotNull(result);
        verify(subSpecializationRepository).save(any(SubSpecialization.class));
    }
}
