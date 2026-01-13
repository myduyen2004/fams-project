package com.fams.backend.service;

import com.fams.backend.dto.MajorImportDTO;
import com.fams.backend.dto.request.MajorRequest;
import com.fams.backend.dto.response.MajorResponse;
import com.fams.backend.entity.Major;
import com.fams.backend.repository.MajorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MajorService {

    private final MajorRepository majorRepository;
    private final com.fams.backend.repository.StudentProfileRepository studentProfileRepository;

    public Page<MajorResponse> getMajors(String keyword, Major.MajorStatus status, Pageable pageable) {
        Page<Major> majors = majorRepository.searchMajors(keyword, status, pageable);
        return majors.map(this::convertToResponse);
    }

    @Transactional
    public Major createMajor(MajorRequest request) {
        if (majorRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Mã ngành đã tồn tại: " + request.getCode());
        }
        if (majorRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Tên ngành đã tồn tại: " + request.getName());
        }

        Major major = Major.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .programDuration(request.getProgramDuration())
                .status(Major.MajorStatus.ACTIVE)
                .build();

        return majorRepository.save(major);
    }

    @Transactional
    public Major updateMajor(Long id, MajorRequest request) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành với mã ngành: " + id));

        if (!major.getCode().equals(request.getCode()) && majorRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Mã ngành đã tồn tại: " + request.getCode());
        }
        if (!major.getName().equals(request.getName()) && majorRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Tên ngành đã tồn tại: " + request.getName());
        }

        major.setCode(request.getCode());
        major.setName(request.getName());
        major.setDescription(request.getDescription());
        major.setProgramDuration(request.getProgramDuration());

        return majorRepository.save(major);
    }

    public MajorResponse getMajor(Long id) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành với mã ngành: " + id));
        return convertToResponse(major);
    }

    @Transactional
    public Major updateStatus(Long id, Major.MajorStatus status) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành với mã ngành: " + id));
        major.setStatus(status);
        return majorRepository.save(major);
    }

    @Transactional
    public void deleteMajor(Long id) {
        if (studentProfileRepository.existsByMajorId(id)) {
            throw new IllegalArgumentException("Không thể xóa ngành này vì đã có sinh viên theo học.");
        }
        majorRepository.deleteById(id);
    }

    private MajorResponse convertToResponse(Major major) {
        boolean canDelete = !studentProfileRepository.existsByMajorId(major.getId());
        return MajorResponse.builder()
                .id(major.getId())
                .code(major.getCode())
                .name(major.getName())
                .description(major.getDescription())
                .programDuration(major.getProgramDuration())
                .status(major.getStatus())
                .canDelete(canDelete)
                .numberOfSpecializations(major.getSpecializations() != null ? major.getSpecializations().size() : 0)
                .build();
    }

    @Transactional
    public Map<String, Object> importMajors(MultipartFile file) {
        log.info("Importing majors from file: {}", file.getOriginalFilename());
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int createdCount = 0;
        int failedCount = 0;

        Set<String> seenCodes = new HashSet<>();
        int rowNumber = 0;

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                int currentRowNum = rowNumber + 1;

                // Skip header row
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                String code = getCellValue(currentRow.getCell(0));
                String name = getCellValue(currentRow.getCell(1));
                String description = getCellValue(currentRow.getCell(2));
                String programDuration = getCellValue(currentRow.getCell(3));
                String statusStr = getCellValue(currentRow.getCell(4));

                // Skip empty rows
                if (code.isEmpty() && name.isEmpty()) {
                    rowNumber++;
                    continue;
                }

                // Validate required fields
                if (code.isEmpty()) {
                    errors.add("Dòng " + currentRowNum + ": Mã ngành không được để trống");
                    failedCount++;
                    rowNumber++;
                    continue;
                }
                if (name.isEmpty()) {
                    errors.add("Dòng " + currentRowNum + ": Tên ngành không được để trống");
                    failedCount++;
                    rowNumber++;
                    continue;
                }

                // Check duplicate in file
                if (seenCodes.contains(code.toLowerCase())) {
                    errors.add("Dòng " + currentRowNum + ": Mã ngành '" + code + "' bị trùng trong file");
                    failedCount++;
                    rowNumber++;
                    continue;
                }
                seenCodes.add(code.toLowerCase());

                // Check if major exists in database - treat as error
                if (majorRepository.existsByCode(code)) {
                    errors.add("Dòng " + currentRowNum + ": Mã ngành '" + code + "' đã tồn tại trong hệ thống");
                    failedCount++;
                    rowNumber++;
                    continue;
                }

                try {
                    // Parse status
                    Major.MajorStatus status = Major.MajorStatus.ACTIVE;
                    if (!statusStr.isEmpty()) {
                        try {
                            status = Major.MajorStatus.valueOf(statusStr.toUpperCase());
                        } catch (IllegalArgumentException e) {
                            log.warn("Invalid status '{}' at row {}, defaulting to ACTIVE", statusStr, currentRowNum);
                        }
                    }

                    // CREATE new major only
                    Major major = Major.builder()
                            .code(code)
                            .name(name)
                            .description(description.isEmpty() ? null : description)
                            .programDuration(programDuration.isEmpty() ? "9 Kỳ" : programDuration)
                            .status(status)
                            .build();
                    majorRepository.save(major);
                    createdCount++;
                    log.info("Created major: {} - {}", code, name);
                } catch (Exception e) {
                    errors.add("Dòng " + currentRowNum + ": Lỗi khi xử lý: " + e.getMessage());
                    failedCount++;
                    log.error("Error processing major at row {}: {}", currentRowNum, e.getMessage());
                }

                rowNumber++;
            }
        } catch (Exception e) {
            log.error("Error processing import file", e);
            throw new RuntimeException("Lỗi khi xử lý file import: " + e.getMessage());
        }

        result.put("created", createdCount);
        result.put("failed", failedCount);
        result.put("errors", errors);
        log.info("Import majors completed: created={}, failed={}", createdCount, failedCount);
        return result;
    }

    public List<MajorImportDTO> previewImportMajors(MultipartFile file) {
        log.info("Preview import majors from file: {}", file.getOriginalFilename());
        List<MajorImportDTO> previewList = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            int rowNumber = 0;
            Set<String> seenCodes = new HashSet<>();

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                int currentRowNum = rowNumber + 1;

                // Skip header row
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                String code = getCellValue(currentRow.getCell(0));
                String name = getCellValue(currentRow.getCell(1));
                String description = getCellValue(currentRow.getCell(2));
                String programDuration = getCellValue(currentRow.getCell(3));
                String statusStr = getCellValue(currentRow.getCell(4));

                // Skip completely empty rows
                if (code.isEmpty() && name.isEmpty()) {
                    rowNumber++;
                    continue;
                }

                MajorImportDTO dto = MajorImportDTO.builder()
                        .rowNumber(currentRowNum)
                        .code(code)
                        .name(name)
                        .description(description)
                        .programDuration(programDuration.isEmpty() ? "9 Kỳ" : programDuration)
                        .statusStr("ACTIVE") // Default to ACTIVE
                        .status("VALID")
                        .build();

                // Validate status and set warning if invalid
                if (!statusStr.isEmpty()) {
                    try {
                        Major.MajorStatus.valueOf(statusStr.toUpperCase());
                        dto.setStatusStr(statusStr.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        dto.setWarningMessage("Trạng thái '" + statusStr + "' không hợp lệ, sẽ sử dụng ACTIVE");
                    }
                }

                // Validate required fields
                if (code.isEmpty()) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Mã ngành không được để trống");
                    previewList.add(dto);
                    rowNumber++;
                    continue;
                }
                if (name.isEmpty()) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Tên ngành không được để trống");
                    previewList.add(dto);
                    rowNumber++;
                    continue;
                }

                // Check duplicate in file
                if (seenCodes.contains(code.toLowerCase())) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Mã ngành '" + code + "' bị trùng trong file");
                    previewList.add(dto);
                    rowNumber++;
                    continue;
                }
                seenCodes.add(code.toLowerCase());

                // Check if major exists in database - treat as error
                if (majorRepository.existsByCode(code)) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Mã ngành '" + code + "' đã tồn tại trong hệ thống");
                    previewList.add(dto);
                    rowNumber++;
                    continue;
                }

                previewList.add(dto);
                rowNumber++;
            }
        } catch (Exception e) {
            log.error("Error previewing import file", e);
            throw new RuntimeException("Lỗi khi đọc file: " + e.getMessage());
        }

        return previewList;
    }

    @Transactional
    public Map<String, Object> saveImportedMajors(List<MajorImportDTO> dtos) {
        log.info("Saving {} imported majors", dtos.size());
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int createdCount = 0;
        int updatedCount = 0;
        int failedCount = 0;

        for (MajorImportDTO dto : dtos) {
            // Skip invalid entries
            if ("ERROR".equals(dto.getStatus())) {
                failedCount++;
                errors.add("Dòng " + dto.getRowNumber() + ": " + dto.getErrorMessage());
                continue;
            }

            try {
                String code = dto.getCode();
                String name = dto.getName();
                String description = dto.getDescription();
                String programDuration = dto.getProgramDuration();
                String statusStr = dto.getStatusStr();

                // Parse status
                Major.MajorStatus status = Major.MajorStatus.ACTIVE;
                if (statusStr != null && !statusStr.isEmpty()) {
                    try {
                        status = Major.MajorStatus.valueOf(statusStr.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        // Keep default ACTIVE
                    }
                }

                // Check if major already exists - treat as error
                if (majorRepository.existsByCode(code)) {
                    errors.add("Dòng " + dto.getRowNumber() + ": Mã ngành '" + code + "' đã tồn tại trong hệ thống");
                    failedCount++;
                    continue;
                }

                // CREATE new major only
                Major major = Major.builder()
                        .code(code)
                        .name(name)
                        .description(description == null || description.isEmpty() ? null : description)
                        .programDuration(
                                programDuration == null || programDuration.isEmpty() ? "9 Kỳ" : programDuration)
                        .status(status)
                        .build();
                majorRepository.save(major);
                createdCount++;
                log.info("Created major: {} - {}", code, name);
            } catch (Exception e) {
                errors.add("Dòng " + dto.getRowNumber() + ": Lỗi khi lưu - " + e.getMessage());
                failedCount++;
                log.error("Error saving major at row {}: {}", dto.getRowNumber(), e.getMessage());
            }
        }

        result.put("created", createdCount);
        result.put("failed", failedCount);
        result.put("errors", errors);
        log.info("Save imported majors completed: created={}, failed={}", createdCount, failedCount);
        return result;
    }

    public byte[] exportMajorTemplate() {
        try {
            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet("Template Import Ngành");

            // Style cho header
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_ORANGE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Header row
            Row headerRow = sheet.createRow(0);
            String[] headers = { "Mã ngành", "Tên ngành", "Mô tả", "Thời gian đào tạo", "Trạng thái" };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Sample data row
            Row sampleRow = sheet.createRow(1);
            sampleRow.createCell(0).setCellValue("SE");
            sampleRow.createCell(1).setCellValue("Kỹ thuật phần mềm");
            sampleRow.createCell(2).setCellValue("Ngành đào tạo kỹ sư phần mềm");
            sampleRow.createCell(3).setCellValue("9 Kỳ");
            sampleRow.createCell(4).setCellValue("ACTIVE");

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error exporting major template", e);
            throw new RuntimeException("Lỗi khi tạo file template", e);
        }
    }

    private String getCellValue(Cell cell) {
        if (cell == null) {
            return "";
        }
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().toString();
                }
                return String.valueOf((int) cell.getNumericCellValue());
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            default:
                return "";
        }
    }
}
