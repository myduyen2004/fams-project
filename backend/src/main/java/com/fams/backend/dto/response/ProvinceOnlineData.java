package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProvinceOnlineData {
    private String provinceName;
    private Integer onlineCount;
    private Double latitude;
    private Double longitude;
    private List<String> usernames;
}
