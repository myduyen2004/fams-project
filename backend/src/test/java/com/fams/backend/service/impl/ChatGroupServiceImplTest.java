package com.fams.backend.service.impl;

import com.fams.backend.dto.response.ChatGroupResponse;
import com.fams.backend.dto.response.ChatMessageResponse;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit Tests for ChatGroupServiceImpl
 * Covers: createGroupForClass, getMyGroups, getGroupById, existsByClassName,
 * getMessages, sendMessage, deleteMessage, markAsRead, toggleReaction
 */
@ExtendWith(MockitoExtension.class)
class ChatGroupServiceImplTest {

    @Mock
    private ChatGroupRepository chatGroupRepository;

    @Mock
    private ChatGroupMemberRepository chatGroupMemberRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ChatMessageReadRepository chatMessageReadRepository;

    @Mock
    private ChatMessageReactionRepository chatMessageReactionRepository;

    @InjectMocks
    private ChatGroupServiceImpl chatGroupService;

    private User lecturerUser;
    private User studentUser;
    private User studentUser2;
    private Course course;
    private ClassSection classSection;
    private ChatGroup chatGroup;
    private ChatMessage chatMessage;
    private ChatGroupMember lecturerMember;
    private ChatGroupMember studentMember;

    @BeforeEach
    void setUp() {
        lecturerUser = User.builder()
                .id(1L).code("GV001").username("lecturer01")
                .fullName("Tran Van B").email("bvt@fpt.edu.vn")
                .role(User.UserRole.LECTURER).status(User.UserStatus.ACTIVE)
                .build();

        studentUser = User.builder()
                .id(2L).code("SE170001").username("student01")
                .fullName("Nguyen Van A").email("anv@fpt.edu.vn")
                .role(User.UserRole.STUDENT).status(User.UserStatus.ACTIVE)
                .build();

        studentUser2 = User.builder()
                .id(3L).code("SE170002").username("student02")
                .fullName("Le Thi C").email("ltc@fpt.edu.vn")
                .role(User.UserRole.STUDENT).status(User.UserStatus.ACTIVE)
                .build();

        course = Course.builder()
                .id(1L).code("PRF192").name("Programming Fundamentals")
                .credits(3).numberOfSlots(45).status(Course.CourseStatus.ACTIVE)
                .build();

        classSection = ClassSection.builder()
                .className("SE18B01-PRF192").course(course)
                .lecturer(lecturerUser).maxStudents(30)
                .status(ClassSection.ClassStatus.ONGOING)
                .build();

        chatGroup = ChatGroup.builder()
                .id(1L).name("SE18B01-PRF192")
                .classSection(classSection).createdBy(lecturerUser)
                .type(ChatGroup.ChatGroupType.CLASS)
                .members(new ArrayList<>()).messages(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .build();

        lecturerMember = ChatGroupMember.builder()
                .id(1L).chatGroup(chatGroup).user(lecturerUser)
                .role(ChatGroupMember.MemberRole.ADMIN)
                .build();

        studentMember = ChatGroupMember.builder()
                .id(2L).chatGroup(chatGroup).user(studentUser)
                .role(ChatGroupMember.MemberRole.MEMBER)
                .build();

        chatMessage = ChatMessage.builder()
                .id(1L).chatGroup(chatGroup).sender(studentUser)
                .content("Hello everyone!").type(ChatMessage.MessageType.TEXT)
                .isDeleted(false).sentAt(LocalDateTime.now())
                .readReceipts(new ArrayList<>()).reactions(new ArrayList<>())
                .build();
    }

    private void mockSecurityContext(User user) {
        SecurityContext securityContext = mock(SecurityContext.class);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user.getUsername(), null,
                List.of());
        when(securityContext.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(securityContext);
        lenient().when(userRepository.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
    }

    // ==================== createGroupForClass ====================
    @Nested
    @DisplayName("createGroupForClass()")
    class CreateGroupForClassTests {

        @Test
        @DisplayName("UTCID01 - Normal: Create group with lecturer + students")
        void createGroup_success() {
            mockSecurityContext(lecturerUser);
            Enrollment enrollment = Enrollment.builder()
                    .student(studentUser).status(Enrollment.EnrollmentStatus.ENROLLED).build();

            when(chatGroupRepository.findByClassSectionClassName("SE18B01-PRF192")).thenReturn(Optional.empty());
            when(classSectionRepository.findByClassName("SE18B01-PRF192")).thenReturn(Optional.of(classSection));
            when(chatGroupRepository.save(any(ChatGroup.class))).thenReturn(chatGroup);
            when(chatGroupMemberRepository.save(any(ChatGroupMember.class))).thenReturn(lecturerMember);
            when(enrollmentRepository.findByClassSectionClassName("SE18B01-PRF192")).thenReturn(List.of(enrollment));
            when(chatMessageRepository.findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(1L))
                    .thenReturn(Optional.empty());
            when(chatGroupMemberRepository.findActiveMembersWithUser(1L))
                    .thenReturn(List.of(lecturerMember, studentMember));

            ChatGroupResponse result = chatGroupService.createGroupForClass("SE18B01-PRF192");

            assertNotNull(result);
            assertEquals(1L, result.getId());
            verify(chatGroupRepository).save(any(ChatGroup.class));
        }

        @Test
        @DisplayName("UTCID02 - Normal: Group already exists, return existing")
        void createGroup_alreadyExists() {
            when(chatGroupRepository.findByClassSectionClassName("SE18B01-PRF192")).thenReturn(Optional.of(chatGroup));
            when(chatMessageRepository.findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(1L))
                    .thenReturn(Optional.empty());
            when(chatGroupMemberRepository.findActiveMembersWithUser(1L)).thenReturn(List.of(lecturerMember));

            ChatGroupResponse result = chatGroupService.createGroupForClass("SE18B01-PRF192");

            assertNotNull(result);
            verify(chatGroupRepository, never()).save(any(ChatGroup.class));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Null className throws RuntimeException")
        void createGroup_nullClassName() {
            assertThrows(RuntimeException.class, () -> chatGroupService.createGroupForClass(null));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: Blank className throws RuntimeException")
        void createGroup_blankClassName() {
            assertThrows(RuntimeException.class, () -> chatGroupService.createGroupForClass("   "));
        }

        @Test
        @DisplayName("UTCID05 - Abnormal: Class not found throws RuntimeException")
        void createGroup_classNotFound() {
            when(chatGroupRepository.findByClassSectionClassName("UNKNOWN")).thenReturn(Optional.empty());
            when(classSectionRepository.findByClassName("UNKNOWN")).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class, () -> chatGroupService.createGroupForClass("UNKNOWN"));
        }

        @Test
        @DisplayName("UTCID06 - Normal: Create with explicit creatorUsername")
        void createGroup_withCreatorUsername() {
            Enrollment enrollment = Enrollment.builder()
                    .student(studentUser).status(Enrollment.EnrollmentStatus.ENROLLED).build();

            when(chatGroupRepository.findByClassSectionClassName("SE18B01-PRF192")).thenReturn(Optional.empty());
            when(classSectionRepository.findByClassName("SE18B01-PRF192")).thenReturn(Optional.of(classSection));
            when(userRepository.findByUsername("lecturer01")).thenReturn(Optional.of(lecturerUser));
            when(chatGroupRepository.save(any(ChatGroup.class))).thenReturn(chatGroup);
            when(chatGroupMemberRepository.save(any(ChatGroupMember.class))).thenReturn(lecturerMember);
            when(enrollmentRepository.findByClassSectionClassName("SE18B01-PRF192")).thenReturn(List.of(enrollment));
            when(chatMessageRepository.findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(1L))
                    .thenReturn(Optional.empty());
            when(chatGroupMemberRepository.findActiveMembersWithUser(1L)).thenReturn(List.of(lecturerMember));

            ChatGroupResponse result = chatGroupService.createGroupForClass("SE18B01-PRF192", "lecturer01");

            assertNotNull(result);
            verify(chatGroupRepository).save(any(ChatGroup.class));
        }

        @Test
        @DisplayName("UTCID07 - Abnormal: creatorUsername not found throws RuntimeException")
        void createGroup_creatorNotFound() {
            when(chatGroupRepository.findByClassSectionClassName("SE18B01-PRF192")).thenReturn(Optional.empty());
            when(classSectionRepository.findByClassName("SE18B01-PRF192")).thenReturn(Optional.of(classSection));
            when(userRepository.findByUsername("unknown_user")).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class,
                    () -> chatGroupService.createGroupForClass("SE18B01-PRF192", "unknown_user"));
        }

        @Test
        @DisplayName("UTCID08 - Boundary: Class has no enrolled students")
        void createGroup_noEnrollments() {
            mockSecurityContext(lecturerUser);
            when(chatGroupRepository.findByClassSectionClassName("SE18B01-PRF192")).thenReturn(Optional.empty());
            when(classSectionRepository.findByClassName("SE18B01-PRF192")).thenReturn(Optional.of(classSection));
            when(chatGroupRepository.save(any(ChatGroup.class))).thenReturn(chatGroup);
            when(chatGroupMemberRepository.save(any(ChatGroupMember.class))).thenReturn(lecturerMember);
            when(enrollmentRepository.findByClassSectionClassName("SE18B01-PRF192")).thenReturn(List.of());
            when(chatMessageRepository.findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(1L))
                    .thenReturn(Optional.empty());
            when(chatGroupMemberRepository.findActiveMembersWithUser(1L)).thenReturn(List.of(lecturerMember));

            ChatGroupResponse result = chatGroupService.createGroupForClass("SE18B01-PRF192");

            assertNotNull(result);
            // Only lecturer added as member
        }

        @Test
        @DisplayName("UTCID09 - Boundary: DROPPED students are excluded")
        void createGroup_droppedStudentsExcluded() {
            mockSecurityContext(lecturerUser);
            Enrollment droppedEnrollment = Enrollment.builder()
                    .student(studentUser).status(Enrollment.EnrollmentStatus.DROPPED).build();

            when(chatGroupRepository.findByClassSectionClassName("SE18B01-PRF192")).thenReturn(Optional.empty());
            when(classSectionRepository.findByClassName("SE18B01-PRF192")).thenReturn(Optional.of(classSection));
            when(chatGroupRepository.save(any(ChatGroup.class))).thenReturn(chatGroup);
            when(chatGroupMemberRepository.save(any(ChatGroupMember.class))).thenReturn(lecturerMember);
            when(enrollmentRepository.findByClassSectionClassName("SE18B01-PRF192"))
                    .thenReturn(List.of(droppedEnrollment));
            when(chatMessageRepository.findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(1L))
                    .thenReturn(Optional.empty());
            when(chatGroupMemberRepository.findActiveMembersWithUser(1L)).thenReturn(List.of(lecturerMember));

            ChatGroupResponse result = chatGroupService.createGroupForClass("SE18B01-PRF192");

            assertNotNull(result);
            // studentUser should NOT be added because status is DROPPED
            verify(chatGroupMemberRepository, times(1)).save(any(ChatGroupMember.class)); // only lecturer
        }
    }

    // ==================== getMyGroups ====================
    @Nested
    @DisplayName("getMyGroups()")
    class GetMyGroupsTests {

        @Test
        @DisplayName("UTCID01 - Normal: Returns user's groups with unread count")
        void getMyGroups_success() {
            mockSecurityContext(studentUser);
            when(chatGroupRepository.findByMemberId(2L)).thenReturn(List.of(chatGroup));
            when(chatMessageReadRepository.countUnreadMessages(1L, 2L)).thenReturn(3L);
            when(chatMessageReadRepository.findFirstUnreadMessageId(1L, 2L)).thenReturn(Optional.of(5L));
            when(chatMessageRepository.findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(1L))
                    .thenReturn(Optional.empty());
            when(chatGroupMemberRepository.findActiveMembersWithUser(1L))
                    .thenReturn(List.of(lecturerMember, studentMember));

            List<ChatGroupResponse> result = chatGroupService.getMyGroups();

            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals(3, result.get(0).getUnreadCount());
            assertEquals(5L, result.get(0).getFirstUnreadMessageId());
        }

        @Test
        @DisplayName("UTCID02 - Boundary: User has no groups")
        void getMyGroups_noGroups() {
            mockSecurityContext(studentUser);
            when(chatGroupRepository.findByMemberId(2L)).thenReturn(List.of());

            List<ChatGroupResponse> result = chatGroupService.getMyGroups();

            assertNotNull(result);
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("UTCID03 - Boundary: Groups with zero unread messages")
        void getMyGroups_noUnread() {
            mockSecurityContext(studentUser);
            when(chatGroupRepository.findByMemberId(2L)).thenReturn(List.of(chatGroup));
            when(chatMessageReadRepository.countUnreadMessages(1L, 2L)).thenReturn(0L);
            when(chatMessageReadRepository.findFirstUnreadMessageId(1L, 2L)).thenReturn(Optional.empty());
            when(chatMessageRepository.findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(1L))
                    .thenReturn(Optional.empty());
            when(chatGroupMemberRepository.findActiveMembersWithUser(1L))
                    .thenReturn(List.of(lecturerMember, studentMember));

            List<ChatGroupResponse> result = chatGroupService.getMyGroups();

            assertEquals(1, result.size());
            assertEquals(0, result.get(0).getUnreadCount());
            assertNull(result.get(0).getFirstUnreadMessageId());
        }
    }

    // ==================== getGroupById ====================
    @Nested
    @DisplayName("getGroupById()")
    class GetGroupByIdTests {

        @Test
        @DisplayName("UTCID01 - Normal: Returns group detail with members")
        void getGroupById_success() {
            mockSecurityContext(studentUser);
            when(chatGroupRepository.findByIdWithClassSection(1L)).thenReturn(Optional.of(chatGroup));
            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 2L)).thenReturn(true);
            when(chatGroupMemberRepository.findActiveMembersWithUser(1L))
                    .thenReturn(List.of(lecturerMember, studentMember));
            when(chatMessageRepository.findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(1L))
                    .thenReturn(Optional.empty());

            ChatGroupResponse result = chatGroupService.getGroupById(1L);

            assertNotNull(result);
            assertEquals(1L, result.getId());
            assertEquals(2, result.getMembers().size());
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: Group not found throws RuntimeException")
        void getGroupById_notFound() {
            when(chatGroupRepository.findByIdWithClassSection(999L)).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class, () -> chatGroupService.getGroupById(999L));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: User not a member throws RuntimeException")
        void getGroupById_notAMember() {
            mockSecurityContext(studentUser2);
            when(chatGroupRepository.findByIdWithClassSection(1L)).thenReturn(Optional.of(chatGroup));
            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 3L)).thenReturn(false);

            assertThrows(RuntimeException.class, () -> chatGroupService.getGroupById(1L));
        }
    }

    // ==================== existsByClassName ====================
    @Nested
    @DisplayName("existsByClassName()")
    class ExistsByClassNameTests {

        @Test
        @DisplayName("UTCID01 - Normal: Returns true when group exists")
        void existsByClassName_true() {
            when(chatGroupRepository.existsByClassSectionClassName("SE18B01-PRF192")).thenReturn(true);

            assertTrue(chatGroupService.existsByClassName("SE18B01-PRF192"));
        }

        @Test
        @DisplayName("UTCID02 - Normal: Returns false when group does not exist")
        void existsByClassName_false() {
            when(chatGroupRepository.existsByClassSectionClassName("UNKNOWN")).thenReturn(false);

            assertFalse(chatGroupService.existsByClassName("UNKNOWN"));
        }
    }

    // ==================== getMessages ====================
    @Nested
    @DisplayName("getMessages()")
    class GetMessagesTests {

        @Test
        @DisplayName("UTCID01 - Normal: Returns paginated messages with read status")
        void getMessages_success() {
            mockSecurityContext(studentUser);
            Pageable pageable = PageRequest.of(0, 20);
            Page<ChatMessage> messagePage = new PageImpl<>(List.of(chatMessage), pageable, 1);

            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 2L)).thenReturn(true);
            when(chatMessageRepository.findByChatGroupIdOrderBySentAtDesc(1L, pageable)).thenReturn(messagePage);
            when(chatMessageReadRepository.findReadMessageIds(2L, 1L)).thenReturn(List.of(1L));
            when(chatMessageReactionRepository.findByMessageId(1L)).thenReturn(List.of());

            Page<ChatMessageResponse> result = chatGroupService.getMessages(1L, pageable);

            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
            assertTrue(result.getContent().get(0).getIsRead());
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: User not a member throws RuntimeException")
        void getMessages_notAMember() {
            mockSecurityContext(studentUser2);
            Pageable pageable = PageRequest.of(0, 20);
            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 3L)).thenReturn(false);

            assertThrows(RuntimeException.class, () -> chatGroupService.getMessages(1L, pageable));
        }

        @Test
        @DisplayName("UTCID03 - Boundary: No messages returns empty page")
        void getMessages_empty() {
            mockSecurityContext(studentUser);
            Pageable pageable = PageRequest.of(0, 20);
            Page<ChatMessage> emptyPage = new PageImpl<>(List.of(), pageable, 0);

            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 2L)).thenReturn(true);
            when(chatMessageRepository.findByChatGroupIdOrderBySentAtDesc(1L, pageable)).thenReturn(emptyPage);
            when(chatMessageReadRepository.findReadMessageIds(2L, 1L)).thenReturn(List.of());

            Page<ChatMessageResponse> result = chatGroupService.getMessages(1L, pageable);

            assertEquals(0, result.getTotalElements());
        }

        @Test
        @DisplayName("UTCID04 - Boundary: Own messages always marked as read")
        void getMessages_ownMessageAlwaysRead() {
            mockSecurityContext(studentUser);
            // chatMessage.sender = studentUser (id=2L) — same as current user
            Pageable pageable = PageRequest.of(0, 20);
            Page<ChatMessage> messagePage = new PageImpl<>(List.of(chatMessage), pageable, 1);

            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 2L)).thenReturn(true);
            when(chatMessageRepository.findByChatGroupIdOrderBySentAtDesc(1L, pageable)).thenReturn(messagePage);
            when(chatMessageReadRepository.findReadMessageIds(2L, 1L)).thenReturn(List.of()); // NOT in read list
            when(chatMessageReactionRepository.findByMessageId(1L)).thenReturn(List.of());

            Page<ChatMessageResponse> result = chatGroupService.getMessages(1L, pageable);

            assertTrue(result.getContent().get(0).getIsRead()); // still read because own message
            assertTrue(result.getContent().get(0).getIsOwn());
        }
    }

    // ==================== sendMessage ====================
    @Nested
    @DisplayName("sendMessage()")
    class SendMessageTests {

        @Test
        @DisplayName("UTCID01 - Normal: Send text message")
        void sendMessage_text_success() {
            mockSecurityContext(studentUser);
            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 2L)).thenReturn(true);
            when(chatGroupRepository.findById(1L)).thenReturn(Optional.of(chatGroup));
            when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(chatMessage);
            when(chatMessageReactionRepository.findByMessageId(any())).thenReturn(List.of());

            ChatMessageResponse result = chatGroupService.sendMessage(1L, "Hello!", "TEXT", null, null, null);

            assertNotNull(result);
            assertEquals("Hello everyone!", result.getContent());
            verify(chatMessageRepository).save(any(ChatMessage.class));
        }

        @Test
        @DisplayName("UTCID02 - Normal: Send message with replyTo")
        void sendMessage_withReply() {
            mockSecurityContext(studentUser);
            ChatMessage replyMessage = ChatMessage.builder()
                    .id(10L).chatGroup(chatGroup).sender(lecturerUser)
                    .content("Original msg").type(ChatMessage.MessageType.TEXT)
                    .isDeleted(false).sentAt(LocalDateTime.now())
                    .readReceipts(new ArrayList<>()).reactions(new ArrayList<>())
                    .build();

            ChatMessage savedMessage = ChatMessage.builder()
                    .id(2L).chatGroup(chatGroup).sender(studentUser)
                    .content("Reply msg").type(ChatMessage.MessageType.TEXT)
                    .replyTo(replyMessage).isDeleted(false).sentAt(LocalDateTime.now())
                    .readReceipts(new ArrayList<>()).reactions(new ArrayList<>())
                    .build();

            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 2L)).thenReturn(true);
            when(chatGroupRepository.findById(1L)).thenReturn(Optional.of(chatGroup));
            when(chatMessageRepository.findById(10L)).thenReturn(Optional.of(replyMessage));
            when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMessage);
            when(chatMessageReactionRepository.findByMessageId(any())).thenReturn(List.of());

            ChatMessageResponse result = chatGroupService.sendMessage(1L, "Reply msg", "TEXT", 10L, null, null);

            assertNotNull(result);
            assertEquals(10L, result.getReplyToId());
        }

        @Test
        @DisplayName("UTCID03 - Normal: Send file message")
        void sendMessage_file() {
            mockSecurityContext(studentUser);
            ChatMessage fileMessage = ChatMessage.builder()
                    .id(3L).chatGroup(chatGroup).sender(studentUser)
                    .type(ChatMessage.MessageType.FILE)
                    .attachmentUrl("https://cloud.example.com/file.pdf")
                    .attachmentName("report.pdf")
                    .isDeleted(false).sentAt(LocalDateTime.now())
                    .readReceipts(new ArrayList<>()).reactions(new ArrayList<>())
                    .build();

            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 2L)).thenReturn(true);
            when(chatGroupRepository.findById(1L)).thenReturn(Optional.of(chatGroup));
            when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(fileMessage);
            when(chatMessageReactionRepository.findByMessageId(any())).thenReturn(List.of());

            ChatMessageResponse result = chatGroupService.sendMessage(
                    1L, null, "FILE", null, "https://cloud.example.com/file.pdf", "report.pdf");

            assertNotNull(result);
            assertEquals("FILE", result.getType());
            assertEquals("report.pdf", result.getAttachmentName());
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: User not a member throws RuntimeException")
        void sendMessage_notAMember() {
            mockSecurityContext(studentUser2);
            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 3L)).thenReturn(false);

            assertThrows(RuntimeException.class,
                    () -> chatGroupService.sendMessage(1L, "Hello", "TEXT", null, null, null));
        }

        @Test
        @DisplayName("UTCID05 - Abnormal: Group not found throws RuntimeException")
        void sendMessage_groupNotFound() {
            mockSecurityContext(studentUser);
            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(999L, 2L)).thenReturn(true);
            when(chatGroupRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class,
                    () -> chatGroupService.sendMessage(999L, "Hello", "TEXT", null, null, null));
        }

        @Test
        @DisplayName("UTCID06 - Boundary: Null type defaults to TEXT")
        void sendMessage_nullTypeDefaultsText() {
            mockSecurityContext(studentUser);
            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 2L)).thenReturn(true);
            when(chatGroupRepository.findById(1L)).thenReturn(Optional.of(chatGroup));
            when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(chatMessage);
            when(chatMessageReactionRepository.findByMessageId(any())).thenReturn(List.of());

            ChatMessageResponse result = chatGroupService.sendMessage(1L, "Hello", null, null, null, null);

            assertNotNull(result);
            verify(chatMessageRepository).save(any(ChatMessage.class));
        }

        @Test
        @DisplayName("UTCID07 - Boundary: Invalid type defaults to TEXT")
        void sendMessage_invalidType() {
            mockSecurityContext(studentUser);
            when(chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(1L, 2L)).thenReturn(true);
            when(chatGroupRepository.findById(1L)).thenReturn(Optional.of(chatGroup));
            when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(chatMessage);
            when(chatMessageReactionRepository.findByMessageId(any())).thenReturn(List.of());

            // "INVALID_TYPE" should fallback to TEXT
            ChatMessageResponse result = chatGroupService.sendMessage(1L, "Hello", "INVALID_TYPE", null, null, null);

            assertNotNull(result);
        }
    }

    // ==================== deleteMessage ====================
    @Nested
    @DisplayName("deleteMessage()")
    class DeleteMessageTests {

        @Test
        @DisplayName("UTCID01 - Normal: Owner deletes own message")
        void deleteMessage_success() {
            mockSecurityContext(studentUser);
            when(chatMessageRepository.findById(1L)).thenReturn(Optional.of(chatMessage));
            when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(chatMessage);
            when(chatMessageReactionRepository.findByMessageId(any())).thenReturn(List.of());

            ChatMessageResponse result = chatGroupService.deleteMessage(1L, 1L);

            assertNotNull(result);
            assertTrue(chatMessage.getIsDeleted());
            verify(chatMessageRepository).save(chatMessage);
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: Message not found throws RuntimeException")
        void deleteMessage_msgNotFound() {
            mockSecurityContext(studentUser);
            when(chatMessageRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class, () -> chatGroupService.deleteMessage(1L, 999L));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Message belongs to different group throws RuntimeException")
        void deleteMessage_wrongGroup() {
            mockSecurityContext(studentUser);
            ChatGroup otherGroup = ChatGroup.builder().id(99L).build();
            ChatMessage otherMsg = ChatMessage.builder()
                    .id(5L).chatGroup(otherGroup).sender(studentUser)
                    .content("Other").type(ChatMessage.MessageType.TEXT)
                    .isDeleted(false).readReceipts(new ArrayList<>()).reactions(new ArrayList<>())
                    .build();

            when(chatMessageRepository.findById(5L)).thenReturn(Optional.of(otherMsg));

            assertThrows(RuntimeException.class, () -> chatGroupService.deleteMessage(1L, 5L));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: Non-owner cannot delete throws RuntimeException")
        void deleteMessage_notOwner() {
            mockSecurityContext(lecturerUser); // lecturerUser (id=1L) trying to delete studentUser's (id=2L) message
            when(chatMessageRepository.findById(1L)).thenReturn(Optional.of(chatMessage));

            assertThrows(RuntimeException.class, () -> chatGroupService.deleteMessage(1L, 1L));
        }
    }

    // ==================== markAsRead ====================
    @Nested
    @DisplayName("markAsRead()")
    class MarkAsReadTests {

        @Test
        @DisplayName("UTCID01 - Normal: Mark unread messages as read")
        void markAsRead_success() {
            ChatMessage unread1 = ChatMessage.builder().id(10L).chatGroup(chatGroup).sender(lecturerUser)
                    .content("Msg1").type(ChatMessage.MessageType.TEXT).isDeleted(false).build();
            ChatMessage unread2 = ChatMessage.builder().id(11L).chatGroup(chatGroup).sender(lecturerUser)
                    .content("Msg2").type(ChatMessage.MessageType.TEXT).isDeleted(false).build();

            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(studentUser));
            when(chatMessageRepository.findUnreadMessagesByGroupIdAndUserId(1L, 2L))
                    .thenReturn(List.of(unread1, unread2));
            when(chatMessageReadRepository.saveAll(anyList())).thenReturn(List.of());

            List<Long> result = chatGroupService.markAsRead(1L, "student01");

            assertNotNull(result);
            assertEquals(2, result.size());
            assertTrue(result.contains(10L));
            assertTrue(result.contains(11L));
            verify(chatMessageReadRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("UTCID02 - Boundary: No unread messages returns empty list")
        void markAsRead_noUnread() {
            when(userRepository.findByUsername("student01")).thenReturn(Optional.of(studentUser));
            when(chatMessageRepository.findUnreadMessagesByGroupIdAndUserId(1L, 2L)).thenReturn(List.of());

            List<Long> result = chatGroupService.markAsRead(1L, "student01");

            assertNotNull(result);
            assertTrue(result.isEmpty());
            verify(chatMessageReadRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Username not found throws RuntimeException")
        void markAsRead_userNotFound() {
            when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class, () -> chatGroupService.markAsRead(1L, "unknown"));
        }
    }

    // ==================== toggleReaction ====================
    @Nested
    @DisplayName("toggleReaction()")
    class ToggleReactionTests {

        @Test
        @DisplayName("UTCID01 - Normal: Add new reaction")
        void toggleReaction_addNew() {
            mockSecurityContext(studentUser);
            when(chatMessageRepository.findById(1L)).thenReturn(Optional.of(chatMessage));
            when(chatMessageReactionRepository.findByMessageAndUserAndEmoji(chatMessage, studentUser, "👍"))
                    .thenReturn(Optional.empty());
            when(chatMessageReactionRepository.save(any(ChatMessageReaction.class)))
                    .thenReturn(ChatMessageReaction.builder().id(1L).build());
            when(chatMessageReactionRepository.findByMessageId(1L)).thenReturn(List.of(
                    ChatMessageReaction.builder().emoji("👍").user(studentUser).build()));

            ChatMessageResponse result = chatGroupService.toggleReaction(1L, "👍");

            assertNotNull(result);
            verify(chatMessageReactionRepository).save(any(ChatMessageReaction.class));
            verify(chatMessageReactionRepository, never()).delete(any());
        }

        @Test
        @DisplayName("UTCID02 - Normal: Remove existing reaction (toggle off)")
        void toggleReaction_removeExisting() {
            mockSecurityContext(studentUser);
            ChatMessageReaction existingReaction = ChatMessageReaction.builder()
                    .id(1L).message(chatMessage).user(studentUser).emoji("👍").build();

            when(chatMessageRepository.findById(1L)).thenReturn(Optional.of(chatMessage));
            when(chatMessageReactionRepository.findByMessageAndUserAndEmoji(chatMessage, studentUser, "👍"))
                    .thenReturn(Optional.of(existingReaction));
            when(chatMessageReactionRepository.findByMessageId(1L)).thenReturn(List.of());

            ChatMessageResponse result = chatGroupService.toggleReaction(1L, "👍");

            assertNotNull(result);
            verify(chatMessageReactionRepository).delete(existingReaction);
            verify(chatMessageReactionRepository, never()).save(any());
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Null emoji throws RuntimeException")
        void toggleReaction_nullEmoji() {
            assertThrows(RuntimeException.class, () -> chatGroupService.toggleReaction(1L, null));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: Empty emoji throws RuntimeException")
        void toggleReaction_emptyEmoji() {
            assertThrows(RuntimeException.class, () -> chatGroupService.toggleReaction(1L, "   "));
        }

        @Test
        @DisplayName("UTCID05 - Abnormal: Message not found throws RuntimeException")
        void toggleReaction_msgNotFound() {
            mockSecurityContext(studentUser);
            when(chatMessageRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class, () -> chatGroupService.toggleReaction(999L, "👍"));
        }
    }
}
