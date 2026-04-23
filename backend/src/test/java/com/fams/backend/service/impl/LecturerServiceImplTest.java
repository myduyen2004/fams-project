package com.fams.backend.service.impl;

import com.fams.backend.dto.request.LecturerUpdateRequest;
import com.fams.backend.dto.response.LecturerResponse;
import com.fams.backend.entity.LecturerProfile;
import com.fams.backend.entity.User;
import com.fams.backend.repository.LecturerProfileRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.repository.MajorRepository;
import com.fams.backend.repository.SpecializationRepository;
import com.fams.backend.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LecturerServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LecturerProfileRepository lecturerProfileRepository;

    @Mock
    private MajorRepository majorRepository;

    @Mock
    private SpecializationRepository specializationRepository;

    @Mock
    private UserSessionRepository userSessionRepository;

    @Mock
    private SystemLogService systemLogService;

    @InjectMocks
    private LecturerServiceImpl lecturerService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void updateLecturer_shouldUpdateProfileFields_andNotUpdateUser() {
        // Arrange
        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        user.setFullName("Old Name");
        user.setRole(User.UserRole.LECTURER);

        LecturerProfile profile = new LecturerProfile();
        profile.setUserId(userId);
        profile.setUser(user);
        profile.setDepartment("Old Dept");

        LecturerUpdateRequest request = LecturerUpdateRequest.builder()
                .fullName("New Name") // Should come from request, but ignored by logic
                .department("New Dept")
                .expertise("New Exp")
                .bio("New Bio")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(lecturerProfileRepository.findByUser(user)).thenReturn(Optional.of(profile));
        when(lecturerProfileRepository.save(any(LecturerProfile.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        lecturerService.updateLecturer(userId, request, null);

        // Assert
        // 1. Verify Profile is updated
        ArgumentCaptor<LecturerProfile> profileCaptor = ArgumentCaptor.forClass(LecturerProfile.class);
        verify(lecturerProfileRepository).save(profileCaptor.capture());
        LecturerProfile savedProfile = profileCaptor.getValue();
        assertEquals("New Dept", savedProfile.getDepartment());
        assertEquals("New Exp", savedProfile.getExpertise());
        assertEquals("New Bio", savedProfile.getBio());

        // 2. Verify User is NOT updated in DB (userRepository.save not called)
        verify(userRepository, never()).save(any(User.class));

        // 3. Verify User object in memory still has old name (because we didn't set it)
        assertEquals("Old Name", user.getFullName());
    }

    @Test
    void updateLecturer_shouldCreateProfile_ifNotExists() {
        // Arrange
        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        user.setRole(User.UserRole.LECTURER);

        LecturerUpdateRequest request = LecturerUpdateRequest.builder()
                .department("New Dept")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(lecturerProfileRepository.findByUser(user)).thenReturn(Optional.empty());
        when(lecturerProfileRepository.save(any(LecturerProfile.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        lecturerService.updateLecturer(userId, request, null);

        // Assert
        ArgumentCaptor<LecturerProfile> profileCaptor = ArgumentCaptor.forClass(LecturerProfile.class);
        verify(lecturerProfileRepository).save(profileCaptor.capture());
        LecturerProfile savedProfile = profileCaptor.getValue();
        assertEquals("New Dept", savedProfile.getDepartment());
        assertEquals(user, savedProfile.getUser());
    }
}
