package com.fams.backend.service;

import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.impl.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit Test for the loadUserByUsername() function in AuthService
 */
@ExtendWith(MockitoExtension.class)
class LoadUserByUsernameTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AuthService authService;

    @Test
    void whenUsernameExists_thenReturnUserDetails() {
        User user = new User();
        user.setUsername("admin");
        user.setPassword("pass");
        user.setRole(User.UserRole.ADMIN);

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        UserDetails userDetails = authService.loadUserByUsername("admin");

        assertNotNull(userDetails);
        assertEquals("admin", userDetails.getUsername());
    }

    @Test
    void whenUsernameDoesNotExist_thenThrowUsernameNotFoundException() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> authService.loadUserByUsername("unknown"));
    }
}
