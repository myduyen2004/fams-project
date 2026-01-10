package com.fams.backend.service;

import com.fams.backend.dto.MajorDTO;
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
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class MajorService {

    private final MajorRepository majorRepository;

    public Page<Major> getMajors(String keyword, Major.MajorStatus status, Pageable pageable) {
        return majorRepository.searchMajors(keyword, status, pageable);
    }

    public Major createMajor(MajorDTO majorDTO) {
        if (majorRepository.existsByCode(majorDTO.getCode())) {
            throw new IllegalArgumentException("Mã ngành đã tồn tại: " + majorDTO.getCode());
        }
        if (majorRepository.existsByName(majorDTO.getName())) {
            throw new IllegalArgumentException("Tên ngành đã tồn tại: " + majorDTO.getName());
        }

        Major major = Major.builder()
                .code(majorDTO.getCode())
                .name(majorDTO.getName())
                .description(majorDTO.getDescription())
                .programDuration(majorDTO.getProgramDuration())
                .status(Major.MajorStatus.ACTIVE)
                .build();

        return majorRepository.save(major);
    }

    public Major getMajor(Long id) {
        return majorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành với mã ngành: " + id));
    }

    public Major updateStatus(Long id, Major.MajorStatus status) {
        Major major = getMajor(id);
        major.setStatus(status);
        return majorRepository.save(major);
    }

    @Transactional
    public List<Major> importMajors(MultipartFile file) throws IOException {
        log.info("Importing majors from file: {}", file.getOriginalFilename());
        List<Major> majorsToSave = new ArrayList<>();
        List<String> validationErrors = new ArrayList<>();
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

                // Validate required fields
                if (code.isEmpty()) {
                    validationErrors.add("Dòng " + currentRowNum + ": Mã ngành không được để trống");
                    rowNumber++;
                    continue;
                }
                if (name.isEmpty()) {
                    validationErrors.add("Dòng " + currentRowNum + ": Tên ngành không được để trống");
                    rowNumber++;
                    continue;
                }

                // Check duplicate in file
                if (seenCodes.contains(code.toLowerCase())) {
                    validationErrors.add("Dòng " + currentRowNum + ": Mã ngành '" + code + "' bị trùng trong file");
                    rowNumber++;
                    continue;
                }
                seenCodes.add(code.toLowerCase());

                // Check duplicate in database
                if (majorRepository.existsByCode(code)) {
                    validationErrors
                            .add("Dòng " + currentRowNum + ": Mã ngành '" + code + "' đã tồn tại trong hệ thống");
                    rowNumber++;
                    continue;
                }

                // Parse status
                Major.MajorStatus status = Major.MajorStatus.ACTIVE;
                if (!statusStr.isEmpty()) {
                    try {
                        status = Major.MajorStatus.valueOf(statusStr.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid status '{}' at row {}, defaulting to ACTIVE", statusStr, currentRowNum);
                    }
                }

                Major major = Major.builder()
                        .code(code)
                        .name(name)
                        .description(description.isEmpty() ? null : description)
                        .programDuration(programDuration.isEmpty() ? "9 Kỳ" : programDuration)
                        .status(status)
                        .build();

                majorsToSave.add(major);
                rowNumber++;
            }

            if (!validationErrors.isEmpty()) {
                throw new IllegalArgumentException("Dữ liệu không hợp lệ:\n" + String.join("\n", validationErrors));
            }

            if (!majorsToSave.isEmpty()) {
                List<Major> saved = majorRepository.saveAll(majorsToSave);
                log.info("Imported {} majors successfully", saved.size());
                return saved;
            }

            return new ArrayList<>();
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
