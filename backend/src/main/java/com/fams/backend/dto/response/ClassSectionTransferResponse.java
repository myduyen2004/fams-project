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
public class ClassSectionTransferResponse {
    private ClassSectionResponse classSection;
    private boolean hasConflict;
    private List<String> conflictDetails;
}
