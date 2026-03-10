package com.fams.backend.service.impl;

import com.fams.backend.dto.response.ChatGroupResponse;
import com.fams.backend.dto.response.ChatMessageResponse;
import com.fams.backend.dto.response.ReadReceiptDTO;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.ChatGroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatGroupServiceImpl implements ChatGroupService {

    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ClassSectionRepository classSectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final ChatMessageReadRepository chatMessageReadRepository;

    @Override
    @Transactional
    public ChatGroupResponse createGroupForClass(String className) {
        // Check if group already exists
        if (chatGroupRepository.existsByClassSectionClassName(className)) {
            throw new RuntimeException("Nhóm chat cho lớp này đã tồn tại");
        }

        // Get class section with lecturer
        ClassSection classSection = classSectionRepository.findByClassName(className)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học: " + className));

        User currentUser = getCurrentUser();

        // Format group name: [ClassCode]-[CourseCode] (e.g. SE18B01-PRF192)
        String classCode = classSection.getClassName();
        String courseCode = classSection.getCourse().getCode();
        String groupName = classCode;
        if (classCode.contains("-")) {
            groupName = classCode.split("-")[0] + "-" + courseCode;
        } else {
            groupName = classCode + "-" + courseCode;
        }

        // Create chat group
        ChatGroup chatGroup = ChatGroup.builder()
                .name(groupName)
                .classSection(classSection)
                .createdBy(currentUser)
                .type(ChatGroup.ChatGroupType.CLASS)
                .members(new ArrayList<>())
                .build();

        chatGroup = chatGroupRepository.save(chatGroup);

        // Add lecturer as ADMIN
        if (classSection.getLecturer() != null) {
            ChatGroupMember lecturerMember = ChatGroupMember.builder()
                    .chatGroup(chatGroup)
                    .user(classSection.getLecturer())
                    .role(ChatGroupMember.MemberRole.ADMIN)
                    .build();
            chatGroupMemberRepository.save(lecturerMember);
        }

        // Add all enrolled students as MEMBER
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);
        log.info("Found {} total enrollments for class {} in database", enrollments.size(), className);

        int studentCount = 0;
        for (Enrollment enrollment : enrollments) {
            String studentCode = enrollment.getStudent().getCode();
            Enrollment.EnrollmentStatus status = enrollment.getStatus();
            log.debug("Checking enrollment: student={}, status={}", studentCode, status);

            // Add students with ENROLLED or COMPLETED status
            if (status == Enrollment.EnrollmentStatus.ENROLLED || status == Enrollment.EnrollmentStatus.COMPLETED) {
                ChatGroupMember studentMember = ChatGroupMember.builder()
                        .chatGroup(chatGroup)
                        .user(enrollment.getStudent())
                        .role(ChatGroupMember.MemberRole.MEMBER)
                        .build();
                chatGroupMemberRepository.save(studentMember);
                studentCount++;
            }
        }

        log.info("Finished creating chat group for class {}. Added {} students as members.",
                className, studentCount);

        return convertToResponse(chatGroup);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatGroupResponse> getMyGroups() {
        User currentUser = getCurrentUser();
        List<ChatGroup> groups = chatGroupRepository.findByMemberId(currentUser.getId());
        return groups.stream()
                .map(g -> {
                    ChatGroupResponse resp = convertToResponse(g);
                    int unread = (int) chatMessageReadRepository.countUnreadMessages(g.getId(), currentUser.getId());
                    if (unread > 0) {
                        log.info("Group {} has {} unread messages for user {}", g.getId(), unread,
                                currentUser.getUsername());
                    }
                    resp.setUnreadCount(unread);
                    resp.setFirstUnreadMessageId(chatMessageReadRepository
                            .findFirstUnreadMessageId(g.getId(), currentUser.getId()).orElse(null));
                    return resp;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ChatGroupResponse getGroupById(Long groupId) {
        ChatGroup group = chatGroupRepository.findByIdWithClassSection(groupId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhóm chat"));

        // Check if current user is a member
        User currentUser = getCurrentUser();
        if (!chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(groupId, currentUser.getId())) {
            throw new RuntimeException("Bạn không phải thành viên của nhóm này");
        }

        ChatGroupResponse response = convertToResponse(group);

        // Load members
        List<ChatGroupMember> members = chatGroupMemberRepository.findActiveMembersWithUser(groupId);
        response.setMembers(mapMembers(members));

        return response;
    }

    @Override
    public boolean existsByClassName(String className) {
        return chatGroupRepository.existsByClassSectionClassName(className);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getMessages(Long groupId, Pageable pageable) {
        User currentUser = getCurrentUser();

        // Check membership
        if (!chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(groupId, currentUser.getId())) {
            throw new RuntimeException("Bạn không phải thành viên của nhóm này");
        }

        Page<ChatMessage> messages = chatMessageRepository.findByGroupIdWithSender(groupId, pageable);
        List<Long> readMessageIds = chatMessageReadRepository.findReadMessageIds(currentUser.getId(), groupId);

        return messages.map(msg -> {
            boolean isRead = readMessageIds.contains(msg.getId())
                    || msg.getSender().getId().equals(currentUser.getId());
            return convertToMessageResponse(msg, currentUser.getId(), isRead);
        });
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Long groupId, String content, String type, Long replyToId,
            String attachmentUrl, String attachmentName) {
        User currentUser = getCurrentUser();

        // Check membership
        if (!chatGroupMemberRepository.existsByChatGroupIdAndUserIdAndLeftAtIsNull(groupId, currentUser.getId())) {
            throw new RuntimeException("Bạn không phải thành viên của nhóm này");
        }

        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhóm chat"));

        ChatMessage.MessageType messageType = ChatMessage.MessageType.TEXT;
        try {
            if (type != null) {
                messageType = ChatMessage.MessageType.valueOf(type.toUpperCase());
            }
        } catch (Exception e) {
            // Default to TEXT
        }

        ChatMessage message = ChatMessage.builder()
                .chatGroup(group)
                .sender(currentUser)
                .content(content)
                .type(messageType)
                .attachmentUrl(attachmentUrl)
                .attachmentName(attachmentName)
                .build();

        if (replyToId != null) {
            chatMessageRepository.findById(replyToId).ifPresent(message::setReplyTo);
        }

        message = chatMessageRepository.save(message);

        log.info("User {} sent message to group {}", currentUser.getUsername(), groupId);

        return convertToMessageResponse(message, currentUser.getId(), true);
    }

    @Override
    @Transactional
    public ChatMessageResponse deleteMessage(Long groupId, Long messageId) {
        User currentUser = getCurrentUser();
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        if (!message.getChatGroup().getId().equals(groupId)) {
            throw new RuntimeException("Tin nhắn không thuộc nhóm này");
        }

        // Check permission: Only owner of message can delete
        boolean isOwner = message.getSender().getId().equals(currentUser.getId());

        if (!isOwner) {
            throw new RuntimeException("Bạn không có quyền xóa tin nhắn này");
        }

        message.setIsDeleted(true);
        message = chatMessageRepository.save(message);

        log.info("User {} deleted message {} in group {}", currentUser.getUsername(), messageId, groupId);

        return convertToMessageResponse(message, currentUser.getId(), true);
    }

    private ChatGroupResponse convertToResponse(ChatGroup group) {
        var lastMsgOpt = chatMessageRepository.findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(group.getId());

        String lecturerName = null;
        if (group.getClassSection() != null && group.getClassSection().getLecturer() != null) {
            lecturerName = group.getClassSection().getLecturer().getFullName();
        }

        List<ChatGroupResponse.ChatMemberDTO> members = mapMembers(
                chatGroupMemberRepository.findActiveMembersWithUser(group.getId()));

        String displayName = group.getName();
        if (group.getType() == ChatGroup.ChatGroupType.CLASS && group.getClassSection() != null) {
            String classCode = group.getClassSection().getClassName();
            String courseCode = group.getClassSection().getCourse().getCode();

            // Format: ClassCode-CourseCode (e.g. SE18B01-PRF192)
            // Ensure we don't duplicate the course code if it's already in the class name
            if (classCode.contains("-")) {
                String potentialClassPart = classCode.split("-")[0];
                displayName = potentialClassPart + "-" + courseCode;
            } else {
                displayName = classCode + "-" + courseCode;
            }
        }

        ChatGroupResponse response = ChatGroupResponse.builder()
                .id(group.getId())
                .name(displayName != null ? displayName : "Nhóm chưa đặt tên")
                .className(group.getClassSection() != null ? group.getClassSection().getClassName() : "")
                .type(group.getType() != null ? group.getType().name() : "CLASS")
                .lecturerName(lecturerName != null ? lecturerName : "")
                .memberCount(members.size())
                .members(members)
                .createdAt(group.getCreatedAt())
                .build();

        if (lastMsgOpt.isPresent()) {
            ChatMessage msg = lastMsgOpt.get();
            response.setLastMessage(ChatGroupResponse.LastMessageDTO.builder()
                    .senderName(msg.getSender().getFullName())
                    .content(msg.getContent())
                    .type(msg.getType().name())
                    .attachmentName(msg.getAttachmentName())
                    .sentAt(msg.getSentAt())
                    .build());
        }

        return response;
    }

    @Override
    @Transactional
    public List<Long> markAsRead(Long groupId, String username) {
        log.info("Marking messages in group {} as read for user {}", groupId, username);
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        List<ChatMessage> unreadMessages = chatMessageRepository.findUnreadMessagesByGroupIdAndUserId(groupId,
                currentUser.getId());

        log.info("Found {} unread messages for user {}", unreadMessages.size(), username);

        if (unreadMessages.isEmpty()) {
            return List.of();
        }

        List<ChatMessageRead> reads = unreadMessages.stream()
                .map(msg -> ChatMessageRead.builder()
                        .message(msg)
                        .user(currentUser)
                        .build())
                .collect(Collectors.toList());

        log.info("Saving {} read records for user {} in group {}", reads.size(), username, groupId);
        chatMessageReadRepository.saveAll(reads);
        log.info("Read records saved successfully");
        return unreadMessages.stream().map(ChatMessage::getId).collect(Collectors.toList());
    }

    private ChatMessageResponse convertToMessageResponse(ChatMessage message, Long currentUserId, boolean isRead) {
        ChatMessageResponse response = ChatMessageResponse.builder()
                .id(message.getId())
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getFullName())
                .senderAvatar(message.getSender().getAvatar())
                .senderRole(message.getSender().getRole().name())
                .content(message.getContent())
                .type(message.getType().name())
                .attachmentUrl(message.getAttachmentUrl())
                .attachmentName(message.getAttachmentName())
                .sentAt(message.getSentAt())
                .isOwn(message.getSender().getId().equals(currentUserId))
                .isDeleted(message.getIsDeleted())
                .isRead(isRead)
                .readers(message.getReadReceipts() != null ? message.getReadReceipts().stream()
                        .map(r -> ReadReceiptDTO.builder()
                                .userId(r.getUser().getId())
                                .fullName(r.getUser().getFullName())
                                .avatar(r.getUser().getAvatar())
                                .build())
                        .collect(Collectors.toList()) : new ArrayList<>())
                .build();

        if (message.getReplyTo() != null) {
            response.setReplyToId(message.getReplyTo().getId());

            String replyContent = message.getReplyTo().getContent();
            if (replyContent == null || replyContent.isEmpty()) {
                if (message.getReplyTo().getType() == ChatMessage.MessageType.IMAGE) {
                    replyContent = "🖼️ Hình ảnh";
                } else if (message.getReplyTo().getType() == ChatMessage.MessageType.FILE) {
                    replyContent = "📎 " + message.getReplyTo().getAttachmentName();
                }
            }
            response.setReplyToContent(replyContent);

            response.setReplyToAttachmentUrl(message.getReplyTo().getAttachmentUrl());
            response.setReplyToType(message.getReplyTo().getType().name());
            response.setReplyToSenderName(message.getReplyTo().getSender().getFullName());
        }

        return response;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
    }

    private List<ChatGroupResponse.ChatMemberDTO> mapMembers(List<ChatGroupMember> members) {
        return members.stream()
                .map(m -> {
                    String code = m.getUser().getCode();
                    if (code == null || code.trim().isEmpty()) {
                        code = m.getUser().getUsername();
                    }
                    String fullName = m.getUser().getFullName();
                    log.error("DEBUG: Mapping chat member: userId={}, fullName={}, code={}", m.getUser().getId(),
                            fullName, code);
                    return ChatGroupResponse.ChatMemberDTO.builder()
                            .userId(m.getUser().getId())
                            .code(code)
                            .fullName(fullName)
                            .avatar(m.getUser().getAvatar())
                            .role(m.getUser().getRole().name())
                            .memberRole(m.getRole().name())
                            .build();
                })
                .collect(Collectors.toList());
    }
}
