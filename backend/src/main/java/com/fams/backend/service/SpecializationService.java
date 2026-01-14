package com.fams.backend.service;

import com.fams.backend.dto.SpecializationImportDTO;
import com.fams.backend.dto.request.ReorderCoursesRequest;
import com.fams.backend.dto.request.SpecializationRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.dto.response.SpecializationResponse;
import com.fams.backend.entity.Course;
import com.fams.backend.entity.Major;
import com.fams.backend.entity.Specialization;
import com.fams.backend.entity.SpecializationCourse;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.SpecializationCourseRepository;
import com.fams.backend.repository.SpecializationRepository;
import com.fams.backend.repository.SubSpecializationCourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class SpecializationService {
    private final SpecializationRepository specializationRepository;
    private final com.fams.backend.repository.MajorRepository majorRepository;
    private final com.fams.backend.repository.StudentProfileRepository studentProfileRepository;
    private final SpecializationCourseRepository specializationCourseRepository;
    private final SubSpecializationCourseRepository subSpecializationCourseRepository;
    private final CourseRepository courseRepository;

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

    // ========== Course Management ==========

    public List<CourseResponse> getCourses(Long specId) {
        List<SpecializationCourse> courses = specializationCourseRepository
                .findBySpecializationIdOrderByOrderIndexAsc(specId);
        return courses.stream()
                .map(this::convertCourseToResponse)
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional
    public CourseResponse addCourse(Long specId, Long courseId, Integer semester) {
        log.info("Request to add course {} to specialization {} with semester {}", courseId, specId, semester);
        try {
            Specialization spec = specializationRepository.findById(specId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyên ngành"));
            Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));

            if (specializationCourseRepository.existsBySpecializationIdAndCourseId(specId, courseId)) {
                log.warn("Course {} already exists in specialization {}", courseId, specId);
                throw new IllegalArgumentException("Môn học đã tồn tại trong chuyên ngành");
            }

            // Check if course exists in any sub-specialization
            if (subSpecializationCourseRepository.existsBySpecializationIdAndCourseId(specId, courseId)) {
                log.warn("Course {} already exists in a sub-specialization of specialization {}", courseId, specId);
                throw new IllegalArgumentException(
                        "Môn học đã tồn tại trong chuyên ngành hẹp, không thể thêm vào chuyên ngành cha");
            }

            Integer maxOrder = specializationCourseRepository.findMaxOrderIndexBySpecializationId(specId);
            int nextOrder = (maxOrder != null) ? maxOrder + 1 : 0;

            Integer actualSemester = (semester != null) ? semester : 1;

            SpecializationCourse sc = SpecializationCourse.builder()
                    .specialization(spec)
                    .course(course)
                    .orderIndex(nextOrder)
                    .semester(actualSemester)
                    .build();

            specializationCourseRepository.save(sc);
            log.info("Successfully added course {} to specialization {}", courseId, specId);
            return convertCourseToResponse(sc);
        } catch (Exception e) {
            log.error("Error adding course to specialization: ", e);
            throw e;
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void removeCourse(Long specId, Long courseId) {
        specializationCourseRepository.deleteBySpecializationIdAndCourseId(specId, courseId);
    }

    @org.springframework.transaction.annotation.Transactional
    public void reorderCourses(Long specId, ReorderCoursesRequest request) {
        List<Long> courseIds = request.getCourseIds();
        for (int i = 0; i < courseIds.size(); i++) {
            SpecializationCourse sc = specializationCourseRepository
                    .findBySpecializationIdAndCourseId(specId, courseIds.get(i))
                    .orElseThrow(() -> new IllegalArgumentException("Môn học không tồn tại trong chuyên ngành"));
            sc.setOrderIndex(i);
            specializationCourseRepository.save(sc);
        }
    }

    // ========== Private Methods ==========

    private void validateRequest(SpecializationRequest request, Long excludeId) {
        specializationRepository.findByCode(request.getCode())
                .ifPresent(existing -> {
                    if (excludeId == null || !existing.getId().equals(excludeId)) {
                        throw new IllegalArgumentException("Mã chuyên ngành đã tồn tại: " + request.getCode());
                    }
                });

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

    // ========== Import Specializations with Preview ==========

    public List<SpecializationImportDTO> previewImportSpecializations(Long majorId, MultipartFile file)
            throws IOException {
        log.info("Preview import specializations from file: {} for major: {}", file.getOriginalFilename(), majorId);

        Major major = majorRepository.findById(majorId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ngành với ID: " + majorId));

        List<SpecializationImportDTO> previewList = new ArrayList<>();

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

                // Read columns according to Excel structure:
                // A: major code, B: specialization code, C: name, D: description, E: status
                String majorCode = getCellValue(currentRow.getCell(0));
                String code = getCellValue(currentRow.getCell(1));
                String name = getCellValue(currentRow.getCell(2));
                String description = getCellValue(currentRow.getCell(3));
                String statusStr = getCellValue(currentRow.getCell(4));

                // Skip completely empty rows
                if (code.isEmpty() && name.isEmpty()) {
                    rowNumber++;
                    continue;
                }

                // Skip rows that don't match the current major
                if (!majorCode.equalsIgnoreCase(major.getCode())) {
                    rowNumber++;
                    continue;
                }

                SpecializationImportDTO dto = SpecializationImportDTO.builder()
                        .rowNumber(currentRowNum)
                        .majorCode(majorCode)
                        .code(code)
                        .name(name)
                        .description(description)
                        .statusStr("ACTIVE") // Default to ACTIVE
                        .status("VALID")
                        .build();

                // Validate status and set warning if invalid
                if (!statusStr.isEmpty()) {
                    try {
                        Specialization.SpecializationStatus.valueOf(statusStr.toUpperCase());
                        dto.setStatusStr(statusStr.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        dto.setWarningMessage("Trạng thái '" + statusStr + "' không hợp lệ, sẽ sử dụng ACTIVE");
                    }
                }

                // Validate required fields
                if (code.isEmpty()) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Mã chuyên ngành không được để trống");
                    previewList.add(dto);
                    rowNumber++;
                    continue;
                }
                if (name.isEmpty()) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Tên chuyên ngành không được để trống");
                    previewList.add(dto);
                    rowNumber++;
                    continue;
                }

                // Check duplicate in file
                if (seenCodes.contains(code.toLowerCase())) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Mã chuyên ngành '" + code + "' bị trùng trong file");
                    previewList.add(dto);
                    rowNumber++;
                    continue;
                }
                seenCodes.add(code.toLowerCase());

                // Check if specialization exists in database - treat as error
                if (specializationRepository.existsByCode(code)) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Mã chuyên ngành '" + code + "' đã tồn tại trong hệ thống");
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
    public Map<String, Object> saveImportedSpecializations(Long majorId, List<SpecializationImportDTO> dtos) {
        log.info("Saving {} imported specializations for major {}", dtos.size(), majorId);

        Major major = majorRepository.findById(majorId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ngành với ID: " + majorId));

        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int createdCount = 0;
        int failedCount = 0;

        for (SpecializationImportDTO dto : dtos) {
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
                String statusStr = dto.getStatusStr();

                // Double check - skip if already exists
                if (specializationRepository.existsByCode(code)) {
                    failedCount++;
                    errors.add("Dòng " + dto.getRowNumber() + ": Mã chuyên ngành '" + code
                            + "' đã tồn tại trong hệ thống");
                    continue;
                }

                // Parse status
                Specialization.SpecializationStatus status = Specialization.SpecializationStatus.ACTIVE;
                if (statusStr != null && !statusStr.isEmpty()) {
                    try {
                        status = Specialization.SpecializationStatus.valueOf(statusStr.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        // Keep default ACTIVE
                    }
                }

                Specialization specialization = Specialization.builder()
                        .code(code)
                        .name(name)
                        .description(description == null || description.isEmpty() ? null : description)
                        .status(status)
                        .major(major)
                        .build();
                specializationRepository.save(specialization);
                createdCount++;
                log.info("Created specialization: {} - {}", code, name);
            } catch (Exception e) {
                failedCount++;
                errors.add("Dòng " + dto.getRowNumber() + ": Lỗi khi lưu: " + e.getMessage());
                log.error("Error saving specialization at row {}: {}", dto.getRowNumber(), e.getMessage());
            }
        }

        result.put("created", createdCount);
        result.put("failed", failedCount);
        result.put("errors", errors);
        log.info("Save imported specializations completed: created={}, failed={}", createdCount, failedCount);
        return result;
    }

    public byte[] exportSpecializationTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Template");

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Create header row - matching Excel structure
            Row headerRow = sheet.createRow(0);
            String[] headers = { "major code", "specialization code", "specialization name", "description", "status" };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 6000);
            }

            // Create example row
            Row exampleRow = sheet.createRow(1);
            exampleRow.createCell(0).setCellValue("SE");
            exampleRow.createCell(1).setCellValue("SE-WEB");
            exampleRow.createCell(2).setCellValue("Web Development");
            exampleRow.createCell(3).setCellValue("Phát triển ứng dụng Web (Full-stack, Frontend, Backend).");
            exampleRow.createCell(4).setCellValue("ACTIVE");

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
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

    private CourseResponse convertCourseToResponse(SpecializationCourse sc) {
        Course course = sc.getCourse();
        return CourseResponse.builder()
                .id(course.getId())
                .code(course.getCode())
                .name(course.getName())
                .description(course.getDescription())
                .credits(course.getCredits())
                .numberOfSlots(course.getNumberOfSlots())
                .fixedSemester(course.getFixedSemester())
                .semester(sc.getSemester())
                .status(course.getStatus())
                .orderIndex(sc.getOrderIndex())
                .canDelete(true)
                .build();
    }
}
