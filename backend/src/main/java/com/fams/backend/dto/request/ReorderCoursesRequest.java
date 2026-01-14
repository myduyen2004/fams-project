package com.fams.backend.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class ReorderCoursesRequest {
    private List<Long> courseIds; // Danh sách course IDs theo thứ tự mới
}
