package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    private String content;
    private String type; // TEXT, IMAGE, FILE
    private Long replyToId;
    private String attachmentUrl;
    private String attachmentName;
}
