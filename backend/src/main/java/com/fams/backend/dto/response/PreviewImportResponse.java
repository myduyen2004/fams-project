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
public class PreviewImportResponse {
    private int totalRows;
    private int validRows;
    private int errorRows;
    private List<PreviewRow> previewData;
    private List<String> validationMessages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviewRow {
        private int rowNumber;
        private String fullName;
        private String code;
        private String role;
        private String dob;
        private String email;
        private String phone;
        private boolean hasImage;
        private String status; // "valid", "error", "warning"
        private String errorMessage;
    }
}
