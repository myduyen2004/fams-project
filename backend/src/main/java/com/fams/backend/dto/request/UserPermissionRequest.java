package com.fams.backend.dto.request;

import lombok.Data;

@Data
public class UserPermissionRequest {
    private Long userId;
    private String permission;
}
