package com.fams.backend.service;

import com.fams.backend.dto.request.MajorRequest;
import com.fams.backend.dto.response.MajorResponse;
import com.fams.backend.entity.Major;

import com.fams.backend.repository.MajorRepository;
import com.fams.backend.repository.StudentProfileRepository;
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

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MajorServiceTest {

    @Mock
    private MajorRepository majorRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @InjectMocks
    private MajorService majorService;

    private Major activeMajor;
    private MajorRequest majorRequest;

    @BeforeEach
    void setUp() {
        activeMajor = Major.builder()
                .id(1L)
                .code("SE")
                .name("Software Engineering")
                .description("Description")
                .programDuration("9 ky")
                .status(Major.MajorStatus.ACTIVE)
                .specializations(Collections.emptyList())
                .build();

        majorRequest = MajorRequest.builder()
                .code("SE")
                .name("Software Engineering")
                .description("Description")
                .programDuration("9 ky")
                .build();
    }

    @Test
    @DisplayName("Get Majors: Success with filters")
    void getMajors_Success() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        Page<Major> majorPage = new PageImpl<>(List.of(activeMajor));
        when(majorRepository.searchMajors(anyString(), any(), any(Pageable.class))).thenReturn(majorPage);
        when(studentProfileRepository.existsByMajorId(1L)).thenReturn(false);

        // Act
        Page<MajorResponse> result = majorService.getMajors("SE", Major.MajorStatus.ACTIVE, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("SE", result.getContent().get(0).getCode());
        verify(majorRepository).searchMajors("SE", Major.MajorStatus.ACTIVE, pageable);
    }

    @Test
    @DisplayName("Create Major: Success")
    void createMajor_Success() {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.existsByName("Software Engineering")).thenReturn(false);
        when(majorRepository.save(any(Major.class))).thenReturn(activeMajor);

        // Act
        Major result = majorService.createMajor(majorRequest);

        // Assert
        assertNotNull(result);
        assertEquals("SE", result.getCode());
        verify(majorRepository).save(any(Major.class));
    }

    @Test
    @DisplayName("Create Major: Fail duplicate code")
    void createMajor_FailDuplicateCode() {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> majorService.createMajor(majorRequest));
        assertTrue(exception.getMessage().contains("Mã ngành đã tồn tại"));
    }

    @Test
    @DisplayName("Create Major: Fail duplicate name")
    void createMajor_FailDuplicateName() {
        // Arrange
        when(majorRepository.existsByCode("SE")).thenReturn(false);
        when(majorRepository.existsByName("Software Engineering")).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> majorService.createMajor(majorRequest));
        assertTrue(exception.getMessage().contains("Tên ngành đã tồn tại"));
    }

    @Test
    @DisplayName("Update Major: Success")
    void updateMajor_Success() {
        // Arrange
        when(majorRepository.findById(1L)).thenReturn(Optional.of(activeMajor));
        when(majorRepository.save(any(Major.class))).thenReturn(activeMajor);

        // Act
        Major result = majorService.updateMajor(1L, majorRequest);

        // Assert
        assertNotNull(result);
        assertEquals("SE", result.getCode());
    }

    @Test
    @DisplayName("Update Major: Fail not found")
    void updateMajor_FailNotFound() {
        // Arrange
        when(majorRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> majorService.updateMajor(1L, majorRequest));
        assertTrue(exception.getMessage().contains("Không tìm thấy ngành"));
    }

    @Test
    @DisplayName("Update Status: Success")
    void updateStatus_Success() {
        // Arrange
        when(majorRepository.findById(1L)).thenReturn(Optional.of(activeMajor));
        when(majorRepository.save(any(Major.class))).thenReturn(activeMajor);

        // Act
        Major result = majorService.updateStatus(1L, Major.MajorStatus.INACTIVE);

        // Assert
        assertNotNull(result);
        assertEquals(Major.MajorStatus.INACTIVE, result.getStatus());
    }

    @Test
    @DisplayName("Delete Major: Success")
    void deleteMajor_Success() {
        // Arrange
        when(studentProfileRepository.existsByMajorId(1L)).thenReturn(false);

        // Act
        majorService.deleteMajor(1L);

        // Assert
        verify(majorRepository).deleteById(1L);
    }

    @Test
    @DisplayName("Delete Major: Fail has students")
    void deleteMajor_FailHasStudents() {
        // Arrange
        when(studentProfileRepository.existsByMajorId(1L)).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> majorService.deleteMajor(1L));
        assertTrue(exception.getMessage().contains("đã có sinh viên theo học"));
    }

    @Test
    @DisplayName("Get Major Detail: Success")
    void getMajor_Success() {
        // Arrange
        when(majorRepository.findById(1L)).thenReturn(Optional.of(activeMajor));
        when(studentProfileRepository.existsByMajorId(1L)).thenReturn(false);

        // Act
        MajorResponse result = majorService.getMajor(1L);

        // Assert
        assertNotNull(result);
        assertEquals("SE", result.getCode());
        assertTrue(result.isCanDelete());
    }
}
