package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPermissionResponse {
    private Long id;
    private Long userId;
    private String userFullName;
    private String userCode;
    private String permission;
    private String permissionLabel;
    private String grantedByName;
    private LocalDateTime grantedAt;
}
