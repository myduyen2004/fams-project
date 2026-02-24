package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupResponse {
    private Long id;
    private String name;
    private String className;
    private String type;
    private String lecturerName;
    private Integer memberCount;
    private LocalDateTime createdAt;
    private LastMessageDTO lastMessage;
    private Integer unreadCount;
    private Long firstUnreadMessageId;
    private List<ChatMemberDTO> members;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LastMessageDTO {
        private String senderName;
        private String content;
        private String type;
        private LocalDateTime sentAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMemberDTO {
        private Long userId;
        private String fullName;
        private String avatar;
        private String role;
        private String memberRole;
    }
}
