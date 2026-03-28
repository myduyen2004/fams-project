package com.fams.backend.service;

import com.fams.backend.entity.Major;
import com.fams.backend.dto.request.SpecializationRequest;
import com.fams.backend.dto.response.SpecializationResponse;
import com.fams.backend.entity.Specialization;
import com.fams.backend.repository.SpecializationRepository;
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
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class SpecializationService {
    private final SpecializationRepository specializationRepository;
    private final com.fams.backend.repository.MajorRepository majorRepository;
    private final com.fams.backend.repository.StudentProfileRepository studentProfileRepository;

    public Page<SpecializationResponse> getSpecializationsByMajor(Long majorId, String keyword,
            Specialization.SpecializationStatus status, Pageable pageable) {
        Page<Specialization> specializations = specializationRepository.findByMajorIdAndSearch(majorId, keyword, status,
                pageable);
        return specializations.map(this::convertToResponse);
    }

    public SpecializationResponse getSpecialization(Long id) {
        Specialization specialization = specializationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyên ngành"));
        return convertToResponse(specialization);
    }

    @org.springframework.transaction.annotation.Transactional
    public SpecializationResponse updateStatus(Long id, Specialization.SpecializationStatus status) {
        Specialization specialization = specializationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyên ngành"));
        specialization.setStatus(status);
        return convertToResponse(specializationRepository.save(specialization));
    }

    @org.springframework.transaction.annotation.Transactional
    public SpecializationResponse createSpecialization(
            SpecializationRequest request) {
        if (specializationRepository.findByCode(request.getCode()).isPresent()) {
            throw new IllegalArgumentException("Mã chuyên ngành đã tồn tại: " + request.getCode());
        }
        if (specializationRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Tên chuyên ngành đã tồn tại: " + request.getName());
        }

        com.fams.backend.entity.Major major = majorRepository.findById(request.getMajorId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành"));

        Specialization specialization = Specialization.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : Specialization.SpecializationStatus.ACTIVE)
                .major(major)
                .build();

        return convertToResponse(specializationRepository.save(specialization));
    }
    @org.springframework.transaction.annotation.Transactional
    public SpecializationResponse updateSpecialization(Long id, SpecializationRequest request) {
        Specialization specialization = specializationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyên ngành"));

        validateRequest(request, id);

        specialization.setCode(request.getCode());
        specialization.setName(request.getName());
        specialization.setDescription(request.getDescription());
        if (request.getStatus() != null) {
            specialization.setStatus(request.getStatus());
        }

        return convertToResponse(specializationRepository.save(specialization));
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteSpecialization(Long id) {
        if (studentProfileRepository.existsBySpecializationId(id)) {
            throw new IllegalArgumentException("Không thể xóa chuyên ngành đã có sinh viên theo học");
        }
        specializationRepository.deleteById(id);
    }
    private void validateRequest(SpecializationRequest request, Long excludeId) {
        specializationRepository.findByCode(request.getCode())
                .ifPresent(existing -> {
                    if (excludeId == null || !existing.getId().equals(excludeId)) {
                        throw new IllegalArgumentException("Mã chuyên ngành đã tồn tại: " + request.getCode());
                    }
                });

        // Note: existsByName doesn't support exclusion easily unless we add custom
        // query or just fetch.
        // For simplicity assuming name uniqueness is global or per major? Typically
        // global codes, names maybe duplicates allowed?
        // Reuse existsByName but careful. Ideally strictly check.
        // Let's rely on code uniqueness mostly. Name check might conflict if updating
        // same entity.
        // skipping name check for update to avoid complexity or implementing findByName
        // and comparing IDs.
        if (excludeId == null && specializationRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Tên chuyên ngành đã tồn tại: " + request.getName());
        }
    }

    private SpecializationResponse convertToResponse(Specialization specialization) {
        boolean canDelete = !studentProfileRepository.existsBySpecializationId(specialization.getId());
        return SpecializationResponse.builder()
                .id(specialization.getId())
                .code(specialization.getCode())
                .name(specialization.getName())
                .description(specialization.getDescription())
                .totalCredits(specialization.getTotalCredits())
                .status(specialization.getStatus())
                .canDelete(canDelete)
                .build();
    }
    @Transactional
    public List<Specialization> importSpecializations(Long majorId, MultipartFile file) throws IOException {
        log.info("Importing specializations from file: {} for major: {}", file.getOriginalFilename(), majorId);

        Major major = majorRepository.findById(majorId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ngành với ID: " + majorId));

        List<Specialization> specializationsToSave = new ArrayList<>();
        List<String> validationErrors = new ArrayList<>();
        Set<String> seenCodes = new HashSet<>();
        int rowNumber = 0;
        int skippedRows = 0;

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

                // Column A: major code
                String majorCode = getCellValue(currentRow.getCell(0));
                // Column B: specialization code
                String code = getCellValue(currentRow.getCell(1));
                // Column C: specialization name
                String name = getCellValue(currentRow.getCell(2));
                // Column D: description
                String description = getCellValue(currentRow.getCell(3));
                // Column E: totalCredits (skip - calculated field)
                // Column F: status
                String statusStr = getCellValue(currentRow.getCell(5));

                // Skip rows that don't match the current major
                if (!majorCode.equalsIgnoreCase(major.getCode())) {
                    skippedRows++;
                    rowNumber++;
                    continue;
                }

                // Validate required fields
                if (code.isEmpty()) {
                    validationErrors.add("Dòng " + currentRowNum + ": Mã chuyên ngành không được để trống");
                    rowNumber++;
                    continue;
                }
                if (name.isEmpty()) {
                    validationErrors.add("Dòng " + currentRowNum + ": Tên chuyên ngành không được để trống");
                    rowNumber++;
                    continue;
                }

                // Check duplicate in file
                if (seenCodes.contains(code.toLowerCase())) {
                    validationErrors
                            .add("Dòng " + currentRowNum + ": Mã chuyên ngành '" + code + "' bị trùng trong file");
                    rowNumber++;
                    continue;
                }
                seenCodes.add(code.toLowerCase());

                // Check duplicate in database
                if (specializationRepository.findByCode(code).isPresent()) {
                    validationErrors.add(
                            "Dòng " + currentRowNum + ": Mã chuyên ngành '" + code + "' đã tồn tại trong hệ thống");
                    rowNumber++;
                    continue;
                }

                // Parse status
                Specialization.SpecializationStatus status = Specialization.SpecializationStatus.ACTIVE;
                if (!statusStr.isEmpty()) {
                    try {
                        status = Specialization.SpecializationStatus.valueOf(statusStr.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid status '{}' at row {}, defaulting to ACTIVE", statusStr, currentRowNum);
                    }
                }

                Specialization specialization = Specialization.builder()
                        .code(code)
                        .name(name)
                        .description(description.isEmpty() ? null : description)
                        .status(status)
                        .major(major)
                        .build();

                specializationsToSave.add(specialization);
                rowNumber++;
            }

            if (!validationErrors.isEmpty()) {
                throw new RuntimeException("Dữ liệu không hợp lệ:\n" + String.join("\n", validationErrors));
            }

            if (skippedRows > 0) {
                log.info("Skipped {} rows with different major code", skippedRows);
            }

            // Kiểm tra nếu không có dữ liệu hợp lệ để import
            if (specializationsToSave.isEmpty()) {
                if (skippedRows > 0) {
                    throw new RuntimeException("Không có chuyên ngành nào được import. " +
                            "Tất cả " + skippedRows + " dòng đều có mã ngành không khớp với ngành hiện tại ('"
                            + major.getCode() + "').");
                } else {
                    throw new RuntimeException("File không chứa dữ liệu chuyên ngành hợp lệ.");
                }
            }

            List<Specialization> saved = specializationRepository.saveAll(specializationsToSave);
            log.info("Imported {} specializations successfully", saved.size());
            return saved;
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
