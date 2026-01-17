package com.fams.backend.dto.request;

import com.fams.backend.entity.Room.RoomStatus;
import com.fams.backend.entity.Room.RoomType;
import lombok.Data;

@Data
public class RoomRequest {
    private String code;
    private String name;
    private Integer capacity;
    private String building;
    private Integer floor;
    private RoomType type;
    private RoomStatus status;
    private Integer gridRow;
    private Integer gridCol;
    private Integer gridRowSpan;
    private Integer gridColSpan;
}
