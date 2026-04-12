package com.fams.backend.service.impl;

import com.fams.backend.entity.AttendanceConfig;
import com.fams.backend.repository.AttendanceConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceConfigServiceImplTest {

    @Mock
    private AttendanceConfigRepository configRepository;

    @Mock
    private SystemLogService systemLogService;

    @InjectMocks
    private AttendanceConfigServiceImpl attendanceConfigService;

    private static final String DEFAULT_CONFIG_KEY = "SYSTEM_CONFIG";

    // =========================================================================
    // 1. Get Existing Configuration Tests (5 Cases)
    // =========================================================================

    @Test
    void testGetExistingConfig_Success() {
        AttendanceConfig existingConfig = AttendanceConfig.builder()
                .configKey(DEFAULT_CONFIG_KEY).manualEnabled(false).absentThresholdMinutes(15).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existingConfig));

        AttendanceConfig result = attendanceConfigService.getConfig();
        assertEquals(15, result.getAbsentThresholdMinutes());
        assertFalse(result.getManualEnabled());
        verify(configRepository, never()).save(any());
    }

    @Test
    void testGetExistingConfig_VerifyCheckMinAttendance() {
        AttendanceConfig existingConfig = AttendanceConfig.builder()
                .configKey(DEFAULT_CONFIG_KEY).minAttendancePercentage(75.0).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existingConfig));

        AttendanceConfig result = attendanceConfigService.getConfig();
        assertEquals(75.0, result.getMinAttendancePercentage());
    }

    @Test
    void testGetExistingConfig_VerifyFaceRecognition() {
        AttendanceConfig existingConfig = AttendanceConfig.builder()
                .configKey(DEFAULT_CONFIG_KEY).faceRecognitionEnabled(false).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existingConfig));

        AttendanceConfig result = attendanceConfigService.getConfig();
        assertFalse(result.getFaceRecognitionEnabled());
    }

    @Test
    void testGetExistingConfig_VerifyWifiEnabled() {
        AttendanceConfig existingConfig = AttendanceConfig.builder()
                .configKey(DEFAULT_CONFIG_KEY).wifiLocationEnabled(false).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existingConfig));

        AttendanceConfig result = attendanceConfigService.getConfig();
        assertFalse(result.getWifiLocationEnabled());
    }

    @Test
    void testGetExistingConfig_DatabaseThrowsException() {
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenThrow(new RuntimeException("DB Connection failed"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> attendanceConfigService.getConfig());
        assertEquals("DB Connection failed", ex.getMessage());
    }

    // =========================================================================
    // 2. Create Default Configuration Fallback Tests (5 Cases)
    // =========================================================================

    @Test
    void testCreateDefaultConfig_WhenNotFound_SaveIsCalled() {
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.empty());
        
        AttendanceConfig defaultSaved = AttendanceConfig.builder().configKey(DEFAULT_CONFIG_KEY).manualEnabled(true).build();
        when(configRepository.save(any(AttendanceConfig.class))).thenReturn(defaultSaved);

        attendanceConfigService.getConfig();
        verify(configRepository, times(1)).save(any(AttendanceConfig.class));
    }

    @Test
    void testCreateDefaultConfig_VerifyDefaultValuesMatched() {
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.empty());
        
        ArgumentCaptor<AttendanceConfig> captor = ArgumentCaptor.forClass(AttendanceConfig.class);
        when(configRepository.save(captor.capture())).thenAnswer(i -> i.getArguments()[0]);

        AttendanceConfig result = attendanceConfigService.getConfig();
        
        assertEquals(30, result.getAbsentThresholdMinutes());
        assertEquals(80.0, result.getMinAttendancePercentage());
        assertEquals(5, result.getMaxAttempts());
    }

    @Test
    void testCreateDefaultConfig_VerifyTogglesTrueByDefault() {
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.empty());
        when(configRepository.save(any(AttendanceConfig.class))).thenAnswer(i -> i.getArguments()[0]);

        AttendanceConfig result = attendanceConfigService.getConfig();
        
        assertTrue(result.getManualEnabled());
        assertTrue(result.getFaceRecognitionEnabled());
        assertTrue(result.getWifiLocationEnabled());
    }

    @Test
    void testCreateDefaultConfig_CheckSystemKey() {
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.empty());
        when(configRepository.save(any(AttendanceConfig.class))).thenAnswer(i -> i.getArguments()[0]);

        AttendanceConfig result = attendanceConfigService.getConfig();
        assertEquals("SYSTEM_CONFIG", result.getConfigKey());
    }

    @Test
    void testCreateDefaultConfig_SaveThrowsException() {
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.empty());
        when(configRepository.save(any(AttendanceConfig.class))).thenThrow(new RuntimeException("Unable to create default config"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> attendanceConfigService.getConfig());
        assertEquals("Unable to create default config", ex.getMessage());
    }

    // =========================================================================
    // 3. Update Configuration Tests (5 Cases)
    // =========================================================================

    @Test
    void testUpdateConfig_SuccessFieldsCopied() {
        AttendanceConfig existingConfig = AttendanceConfig.builder().configKey(DEFAULT_CONFIG_KEY).absentThresholdMinutes(20).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existingConfig));
        when(configRepository.save(any(AttendanceConfig.class))).thenAnswer(i -> i.getArguments()[0]);

        AttendanceConfig newParams = AttendanceConfig.builder()
                .manualEnabled(false).absentThresholdMinutes(45).minAttendancePercentage(90.0)
                .faceRecognitionEnabled(true).maxAttempts(10).wifiLocationEnabled(false).build();

        AttendanceConfig result = attendanceConfigService.updateConfig(newParams);
        
        assertEquals(45, result.getAbsentThresholdMinutes());
        assertEquals(90.0, result.getMinAttendancePercentage());
        assertEquals(10, result.getMaxAttempts());
        assertFalse(result.getManualEnabled());
        assertFalse(result.getWifiLocationEnabled());
        verify(systemLogService).logAttendanceConfigUpdated();
    }

    @Test
    void testUpdateConfig_KeyAndIDPreserved() {
        AttendanceConfig existingConfig = AttendanceConfig.builder().id(99L).configKey(DEFAULT_CONFIG_KEY).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existingConfig));
        when(configRepository.save(any(AttendanceConfig.class))).thenAnswer(i -> i.getArguments()[0]);

        AttendanceConfig attackPayload = AttendanceConfig.builder().id(111L).configKey("HACKED_KEY").build();

        AttendanceConfig result = attendanceConfigService.updateConfig(attackPayload);
        
        assertEquals(99L, result.getId());
        assertEquals(DEFAULT_CONFIG_KEY, result.getConfigKey());
    }

    @Test
    void testUpdateConfig_TriggersDefaultCreationIfNotFound() {
        // Find is empty first -> creates default -> then updates it
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.empty());
        
        AttendanceConfig defaultConfig = AttendanceConfig.builder().id(1L).configKey(DEFAULT_CONFIG_KEY).build();
        // Mock the intermediate default save inside getConfig()
        when(configRepository.save(any(AttendanceConfig.class))).thenReturn(defaultConfig);

        AttendanceConfig newParams = AttendanceConfig.builder().minAttendancePercentage(100.0).build();

        attendanceConfigService.updateConfig(newParams);

        // Verification: Save is called twice (1 for default, 1 for update)
        verify(configRepository, times(2)).save(any(AttendanceConfig.class));
    }

    @Test
    void testUpdateConfig_NullFieldsThrowExceptionDuringCopy() {
        AttendanceConfig existingConfig = AttendanceConfig.builder().configKey(DEFAULT_CONFIG_KEY).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existingConfig));

        AttendanceConfig invalidPayload = new AttendanceConfig(); // All null
        
        // Expected NullPointerException since primitive double/int unboxing or strict sets shouldn't be null
        assertThrows(NullPointerException.class, () -> attendanceConfigService.updateConfig(invalidPayload));
        verify(systemLogService, never()).logAttendanceConfigUpdated();
    }

    @Test
    void testUpdateConfig_ExceptionDuringSaveFailsLogUpdate() {
        AttendanceConfig existingConfig = AttendanceConfig.builder().configKey(DEFAULT_CONFIG_KEY).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existingConfig));
        
        when(configRepository.save(any(AttendanceConfig.class))).thenThrow(new RuntimeException("Save Failed"));

        AttendanceConfig validPayload = AttendanceConfig.builder().absentThresholdMinutes(20).minAttendancePercentage(50.0).build();

        assertThrows(RuntimeException.class, () -> attendanceConfigService.updateConfig(validPayload));
        
        // Log service should never be called when save fails
        verify(systemLogService, never()).logAttendanceConfigUpdated();
    }

    // =========================================================================
    // 4. Reset Configuration Tests (5 Cases)
    // =========================================================================

    @Test
    void testResetConfig_ExistingIsDeletedAndRecreated() {
        AttendanceConfig existing = AttendanceConfig.builder().id(5L).configKey(DEFAULT_CONFIG_KEY).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existing)).thenReturn(Optional.empty());
        when(configRepository.save(any(AttendanceConfig.class))).thenAnswer(i -> i.getArguments()[0]);

        AttendanceConfig result = attendanceConfigService.resetConfig();

        verify(configRepository).delete(existing);
        verify(configRepository).save(any(AttendanceConfig.class));
        verify(systemLogService).logAttendanceConfigUpdated();
        assertEquals(30, result.getAbsentThresholdMinutes());
    }

    @Test
    void testResetConfig_WhenNotExists() {
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.empty());
        when(configRepository.save(any(AttendanceConfig.class))).thenAnswer(i -> i.getArguments()[0]);

        AttendanceConfig result = attendanceConfigService.resetConfig();

        verify(configRepository, never()).delete(any());
        verify(configRepository).save(any(AttendanceConfig.class));
        assertTrue(result.getManualEnabled());
    }

    @Test
    void testResetConfig_DeleteThrowsException() {
        AttendanceConfig existing = AttendanceConfig.builder().id(5L).configKey(DEFAULT_CONFIG_KEY).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existing));
        doThrow(new RuntimeException("Delete failed")).when(configRepository).delete(existing);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> attendanceConfigService.resetConfig());
        assertEquals("Delete failed", ex.getMessage());
        verify(configRepository, never()).save(any());
    }

    @Test
    void testResetConfig_SaveThrowsExceptionDuringRecreation() {
        AttendanceConfig existing = AttendanceConfig.builder().id(5L).configKey(DEFAULT_CONFIG_KEY).build();
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.of(existing)).thenReturn(Optional.empty());
        when(configRepository.save(any(AttendanceConfig.class))).thenThrow(new RuntimeException("Save default failed"));

        assertThrows(RuntimeException.class, () -> attendanceConfigService.resetConfig());
        verify(configRepository).delete(existing);
        verify(systemLogService, never()).logAttendanceConfigUpdated();
    }

    @Test
    void testResetConfig_VerifiesAuditLog() {
        when(configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)).thenReturn(Optional.empty());
        when(configRepository.save(any(AttendanceConfig.class))).thenAnswer(i -> i.getArguments()[0]);

        attendanceConfigService.resetConfig();
        verify(systemLogService, times(1)).logAttendanceConfigUpdated();
    }
}
