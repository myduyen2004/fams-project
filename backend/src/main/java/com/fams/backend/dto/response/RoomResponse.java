package com.fams.backend.dto.response;

import com.fams.backend.entity.Room.RoomStatus;
import com.fams.backend.entity.Room.RoomType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RoomResponse {
    private Long id;
    private String code;
    private String name;
    private Integer capacity;
    private String building;
    private String description;
    private Integer floor;
    private RoomType type;
    private RoomStatus status;
    private Integer gridRow;
    private Integer gridCol;
    private Integer gridRowSpan;
    private Integer gridColSpan;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
