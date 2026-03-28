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
public class ChatMessageResponse {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private String senderRole;
    private String content;
    private String type;
    private String attachmentUrl;
    private String attachmentName;
    private Long replyToId;
    private String replyToContent;
    private String replyToAttachmentUrl;
    private String replyToType;
    private String replyToSenderName;
    private LocalDateTime sentAt;
    private Boolean isOwn;
    private Boolean isDeleted;
    private Boolean isRead;
    private List<ReadReceiptDTO> readers;
    private List<MessageReactionDTO> reactions;
}
