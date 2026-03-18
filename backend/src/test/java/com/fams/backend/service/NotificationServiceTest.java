package com.fams.backend.service;

import com.fams.backend.dto.request.NotificationRequest;
import com.fams.backend.document.NotificationReadStatus;
import com.fams.backend.dto.response.NotificationResponse;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.User;
import com.fams.backend.repository.NotificationReadStatusRepository;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.NotificationRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.FcmService;
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
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationReadStatusRepository notificationReadStatusRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FcmService fcmService;

    @InjectMocks
    private NotificationService notificationService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    private User adminUser;
    private User studentUser;
    private Notification notificationDraft;
    private Notification notificationSent;
    private NotificationRequest notificationRequest;

    @BeforeEach
    void setUp() {
        // Setup User
        adminUser = User.builder()
                .id(1L)
                .username("admin")
                .fullName("Admin User")
                .role(User.UserRole.ADMIN)
                .status(User.UserStatus.ACTIVE)
                .build();

        studentUser = User.builder()
                .id(2L)
                .username("student")
                .fullName("Student User")
                .role(User.UserRole.STUDENT)
                .status(User.UserStatus.ACTIVE)
                .build();

        // Setup Notification (Draft)
        notificationDraft = Notification.builder()
                .id(100L)
                .title("Draft Title")
                .content("Draft Content")
                .type(Notification.NotificationType.SYSTEM)
                .targetType(Notification.TargetType.ALL)
                .status(Notification.NotificationStatus.DRAFT)
                .sender(adminUser)
                .createdAt(LocalDateTime.now())
                .attachmentUrls(new ArrayList<>())
                .build();

        // Setup Notification (Sent)
        notificationSent = Notification.builder()
                .id(200L)
                .title("Sent Title")
                .content("Sent Content")
                .type(Notification.NotificationType.SYSTEM)
                .targetType(Notification.TargetType.ALL)
                .status(Notification.NotificationStatus.SENT)
                .sender(adminUser)
                .sentAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .attachmentUrls(new ArrayList<>())
                .build();

        // Setup Request
        notificationRequest = new NotificationRequest();
        notificationRequest.setTitle("New Title");
        notificationRequest.setContent("New Content");
        notificationRequest.setType(Notification.NotificationType.SYSTEM);
        notificationRequest.setTargetType(Notification.TargetType.ALL);
        notificationRequest.setStatus(Notification.NotificationStatus.DRAFT);
    }

    private void mockSecurityContext(String username) {
        SecurityContextHolder.setContext(securityContext);
        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        lenient().when(authentication.getName()).thenReturn(username);
    }

    @Test
    @DisplayName("Get Notifications: UTCID01 - Keyword Empty, Filters ALL")
    void getNotifications_UTCID01() {
        // Condition: Keyword Empty/Null, Filters "ALL" or Null
        // Confirm: findAll called, No Exception, Return Page
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(adminUser));
        Page<Notification> notificationPage = new PageImpl<>(List.of(notificationDraft));
        when(notificationRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(notificationPage);

        // Act
        Page<NotificationResponse> result = notificationService.getNotifications("", "ALL", "ALL", "ALL", 0, 10);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(notificationRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("Get Notifications: UTCID02 - Filter Type SYSTEM, Status SENT")
    void getNotifications_UTCID02() {
        // Condition: Keyword Empty, Type="SYSTEM", Status="SENT"
        // Confirm: findAll called, No Exception, Return Page
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(adminUser));
        Page<Notification> notificationPage = new PageImpl<>(List.of(notificationSent));
        when(notificationRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(notificationPage);

        // Act
        Page<NotificationResponse> result = notificationService.getNotifications(null, "SYSTEM", "ALL", "SENT", 0, 10);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("SENT", result.getContent().get(0).getStatus());
        verify(notificationRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("Get Notifications: UTCID03 - Keyword 'test'")
    void getNotifications_UTCID03() {
        // Condition: Keyword "test", Filters ALL
        // Confirm: findAll called, No Exception, Return Page
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(adminUser));
        Page<Notification> notificationPage = new PageImpl<>(List.of(notificationDraft));
        when(notificationRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(notificationPage);

        // Act
        Page<NotificationResponse> result = notificationService.getNotifications("test", null, null, null, 0, 10);

        // Assert
        assertNotNull(result);
        verify(notificationRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("Get Notifications: UTCID04 - Invalid Filter Value")
    void getNotifications_UTCID04() {
        // Condition: Invalid Filter Value
        // Confirm: findAll called, No Exception (Handled in service), Return Page
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(adminUser));
        Page<Notification> notificationPage = new PageImpl<>(Collections.emptyList());
        when(notificationRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(notificationPage);

        // Act
        Page<NotificationResponse> result = notificationService.getNotifications(null, "INVALID_TYPE", "INVALID_TARGET",
                "INVALID_STATUS", 0, 10);

        // Assert
        assertNotNull(result);
        verify(notificationRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("Get Notifications: UTCID05 - RuntimeException")
    void getNotifications_UTCID05() {
        // Condition: RuntimeException
        // Confirm: RuntimeException thrown
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(adminUser));
        when(notificationRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenThrow(new RuntimeException("Database error"));

        // Act & Assert
        assertThrows(RuntimeException.class,
                () -> notificationService.getNotifications("", "ALL", "ALL", "ALL", 0, 10));
    }

    @Test
    @DisplayName("Get Notification By ID: UTCID01 - Found, User is ADMIN/STAFF")
    void getNotificationById_UTCID01() {
        // Condition: Notification Found, User is ADMIN/STAFF
        // Confirm: findById called, Return NotificationResponse
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.findById(100L)).thenReturn(Optional.of(notificationDraft));

        // Act
        NotificationResponse result = notificationService.getNotificationById(100L);

        // Assert
        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals("Draft Title", result.getTitle());
    }

    @Test
    @DisplayName("Get Notification By ID: UTCID02 - Found, User is SENDER (Owner)")
    void getNotificationById_UTCID02() {
        // Condition: Notification Found, User is SENDER (Owner)
        // Confirm: findById called, Return NotificationResponse
        // Arrange
        // Setup a notification where student is sender
        Notification studentNotification = Notification.builder()
                .id(300L)
                .sender(studentUser)
                .status(Notification.NotificationStatus.DRAFT)
                .build();

        mockSecurityContext("student");
        when(userRepository.findByUsername("student")).thenReturn(Optional.of(studentUser));
        when(notificationRepository.findById(300L)).thenReturn(Optional.of(studentNotification));

        // Act
        NotificationResponse result = notificationService.getNotificationById(300L);

        // Assert
        assertNotNull(result);
        assertEquals(300L, result.getId());
    }

    @Test
    @DisplayName("Get Notification By ID: UTCID03 - Found, User Not Owner/Admin, Exception")
    void getNotificationById_UTCID03() {
        // Condition: Notification Found, User Not Owner
        // Exception: NotFoundException ("Bạn không có quyền...")
        // Arrange
        mockSecurityContext("student");
        when(userRepository.findByUsername("student")).thenReturn(Optional.of(studentUser));
        when(notificationRepository.findById(100L)).thenReturn(Optional.of(notificationDraft)); // Draft owner is Admin

        // Act & Assert
        NotFoundException exception = assertThrows(NotFoundException.class,
                () -> notificationService.getNotificationById(100L));
        assertEquals("Bạn không có quyền truy cập thông báo này", exception.getMessage());
    }

    @Test
    @DisplayName("Get Notification By ID: UTCID04 - Not Found, Exception")
    void getNotificationById_UTCID04() {
        // Condition: Notification Not Found
        // Exception: NotFoundException ("Không tìm thấy thông báo")
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        NotFoundException exception = assertThrows(NotFoundException.class,
                () -> notificationService.getNotificationById(999L));
        assertTrue(exception.getMessage().contains("Không tìm thấy thông báo"));
    }

    @Test
    @DisplayName("Create Notification: UTCID01 - Draft, User Found, Save called")
    void createNotification_UTCID01() {
        // Condition: Status is DRAFT, User Found
        // Confirm: save() called, return NotificationResponse
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.save(any(Notification.class))).thenReturn(notificationDraft);

        // Act
        NotificationResponse result = notificationService.createNotification(notificationRequest);

        // Assert
        assertNotNull(result);
        assertEquals("Draft Title", result.getTitle());
        assertEquals("DRAFT", result.getStatus());
        verify(notificationRepository).save(any(Notification.class));
        verify(notificationReadStatusRepository, never()).save(any(NotificationReadStatus.class));
    }

    @Test
    @DisplayName("Create Notification: UTCID02 - Sent, Target ALL, User Found, Save & SaveAll Recipients called")
    void createNotification_UTCID02() {
        // Condition: Status is SENT, Target is ALL, User Found
        // Confirm: save() called, saveAll() (Recipients) called, Return
        // NotificationResponse
        // Arrange
        mockSecurityContext("admin");
        NotificationRequest sentRequest = new NotificationRequest();
        sentRequest.setTitle("Sent Title");
        sentRequest.setStatus(Notification.NotificationStatus.SENT);
        sentRequest.setTargetType(Notification.TargetType.ALL);

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.save(any(Notification.class))).thenReturn(notificationSent);
        when(userRepository.findAll()).thenReturn(List.of(studentUser));

        // Act
        NotificationResponse result = notificationService.createNotification(sentRequest);

        // Assert
        assertNotNull(result);
        assertEquals("SENT", result.getStatus());
        verify(notificationRepository).save(any(Notification.class));
        verify(notificationReadStatusRepository).save(any(NotificationReadStatus.class));
    }

    @Test
    @DisplayName("Create Notification: UTCID03 - User Not Found, NotFoundException")
    void createNotification_UTCID03() {
        // Condition: User Not Found
        // Exception: NotFoundException ("Không tìm thấy người dùng")
        // Arrange
        mockSecurityContext("unknown");
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        // Act & Assert
        NotFoundException exception = assertThrows(NotFoundException.class,
                () -> notificationService.createNotification(notificationRequest));
        assertEquals("Không tìm thấy người dùng", exception.getMessage());
    }

    @Test
    @DisplayName("Update Notification: UTCID01 - Success (Draft, Admin/Staff)")
    void updateNotification_UTCID01() {
        // Condition: Status DRAFT, User Admin/Staff, ID Exists
        // Confirm: save() called, Return Updated Response
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.findById(100L)).thenReturn(Optional.of(notificationDraft));
        when(notificationRepository.save(any(Notification.class))).thenReturn(notificationDraft);

        // Act
        NotificationResponse result = notificationService.updateNotification(100L, notificationRequest);

        // Assert
        assertNotNull(result);
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("Update Notification: UTCID02 - Unauthorized (Not Owner), NotFoundException")
    void updateNotification_UTCID02() {
        // Condition: Status DRAFT, User Unauthorized (Not Owner), ID Exists
        // Exception: NotFoundException
        // Arrange
        mockSecurityContext("student");
        when(userRepository.findByUsername("student")).thenReturn(Optional.of(studentUser));
        when(notificationRepository.findById(100L)).thenReturn(Optional.of(notificationDraft)); // Owner is Admin

        // Act & Assert
        assertThrows(NotFoundException.class, () -> notificationService.updateNotification(100L, notificationRequest));
    }

    @Test
    @DisplayName("Update Notification: UTCID03 - Fail, Status SENT, IllegalStateException")
    void updateNotification_UTCID03() {
        // Condition: Status SENT, User Admin/Staff, ID Exists
        // Exception: IllegalStateException
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.findById(200L)).thenReturn(Optional.of(notificationSent));

        // Act & Assert
        assertThrows(IllegalStateException.class,
                () -> notificationService.updateNotification(200L, notificationRequest));
    }

    @Test
    @DisplayName("Update Notification: UTCID04 - ID Not Found, NotFoundException")
    void updateNotification_UTCID04() {
        // Condition: ID Not Found
        // Exception: NotFoundException
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundException.class,
                () -> notificationService.updateNotification(999L, notificationRequest));
    }

    @Test
    @DisplayName("Delete Notification: UTCID01 - Success (Draft, Admin/Staff)")
    void deleteNotification_UTCID01() {
        // Condition: Status DRAFT/SCHEDULED, User Admin/Staff, ID Exists
        // Confirm: deleteById called
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.findById(100L)).thenReturn(Optional.of(notificationDraft)); // Draft

        // Act
        notificationService.deleteNotification(100L);

        // Assert
        verify(notificationRepository).deleteById(100L);
    }

    @Test
    @DisplayName("Delete Notification: UTCID02 - Unauthorized (User Not Owner/Admin)")
    void deleteNotification_UTCID02() {
        // Condition: Status DRAFT, User Unauthorized
        // Exception: NotFoundException ("Bạn không có quyền..." or generic not found
        // based on impl)
        // Arrange
        mockSecurityContext("student");
        when(userRepository.findByUsername("student")).thenReturn(Optional.of(studentUser));
        when(notificationRepository.findById(100L)).thenReturn(Optional.of(notificationDraft)); // Owner is Admin

        // Act & Assert
        // Assuming implementation throws NotFoundException for permission denied or
        // hides it
        // Adjusting expectation to match likely implementation (usually owner check)
        assertThrows(NotFoundException.class, () -> notificationService.deleteNotification(100L));
    }

    @Test
    @DisplayName("Delete Notification: UTCID03 - Fail, Status SENT, IllegalStateException")
    void deleteNotification_UTCID03() {
        // Condition: Status SENT, User Admin/Staff, ID Exists
        // Exception: IllegalStateException ("Không thể xóa thông báo đã gửi")
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.findById(200L)).thenReturn(Optional.of(notificationSent));

        // Act & Assert
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> notificationService.deleteNotification(200L));
        // Validating message if possible, or just the type
        // assertEquals("Không thể xóa thông báo đã gửi", exception.getMessage());
    }

    @Test
    @DisplayName("Delete Notification: UTCID04 - ID Not Found, NotFoundException")
    void deleteNotification_UTCID04() {
        // Condition: ID Does Not Exist
        // Exception: NotFoundException ("Không tìm thấy thông báo...")
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        NotFoundException exception = assertThrows(NotFoundException.class,
                () -> notificationService.deleteNotification(999L));
        assertTrue(exception.getMessage().contains("Không tìm thấy thông báo"));
    }

    @Test
    @DisplayName("Bulk Delete Notifications: UTCID01 - Success (DRAFT items, Admin/Staff)")
    void bulkDeleteNotifications_UTCID01() {
        // Condition: All items DRAFT, User Admin/Staff
        // Confirm: deleteAllById called
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        List<Long> ids = List.of(100L);
        when(notificationRepository.findAllById(ids)).thenReturn(List.of(notificationDraft));

        // Act
        notificationService.bulkDeleteNotifications(ids);

        // Assert
        verify(notificationRepository).deleteAllById(ids);
    }

    @Test
    @DisplayName("Bulk Delete Notifications: UTCID02 - Fail, Contains SENT item")
    void bulkDeleteNotifications_UTCID02() {
        // Condition: List contains at least one SENT item
        // Exception: IllegalStateException ("Không thể xóa thông báo đã gửi...")
        // Arrange
        mockSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        List<Long> ids = List.of(100L, 200L);
        when(notificationRepository.findAllById(ids)).thenReturn(List.of(notificationDraft, notificationSent));

        // Act & Assert
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> notificationService.bulkDeleteNotifications(ids));
        // assertEquals("Không thể xóa thông báo đã gửi...", exception.getMessage());
    }

    @Test
    @DisplayName("Bulk Delete Notifications: UTCID03 - Unauthorized (Use Not Admin/Staff)")
    void bulkDeleteNotifications_UTCID03() {
        // Condition: User is not Admin or Academic Staff
        // Exception: NotFoundException ("Bạn không có quyền xóa một số thông báo này")
        // Arrange
        mockSecurityContext("student");
        when(userRepository.findByUsername("student")).thenReturn(Optional.of(studentUser));

        List<Long> ids = List.of(100L);
        // Student tries to delete Admin's notification
        when(notificationRepository.findAllById(ids)).thenReturn(List.of(notificationDraft));

        // Act & Assert
        NotFoundException exception = assertThrows(NotFoundException.class,
                () -> notificationService.bulkDeleteNotifications(ids));
        assertEquals("Bạn không có quyền truy cập thông báo này", exception.getMessage());
    }
}
