package com.fams.backend.service.impl;

import com.fams.backend.dto.CourseImportDTO;
import com.fams.backend.dto.request.CourseRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.entity.Course;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.SpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationRepository;
import com.fams.backend.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final SpecializationCourseRepository specializationCourseRepository;
    private final SubSpecializationCourseRepository subSpecializationCourseRepository;
    private final SubSpecializationRepository subSpecializationRepository;

    @Override
    public Page<CourseResponse> getCourses(String keyword, Course.CourseStatus status, Pageable pageable) {
        Page<Course> courses = courseRepository.findBySearch(keyword, status, pageable);
        return courses.map(this::convertToResponse);
    }

    @Override
    public CourseResponse getCourse(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        return convertToResponse(course);
    }

    @Override
    @Transactional
    public CourseResponse createCourse(CourseRequest request) {
        String code = request.getCode().toUpperCase();
        if (courseRepository.existsByCode(code)) {
            throw new IllegalArgumentException("Mã môn học đã tồn tại: " + code);
        }

        Course course = Course.builder()
                .code(code)
                .name(request.getName())
                .description(request.getDescription())
                .credits(request.getCredits())
                .numberOfSlots(request.getNumberOfSlots())
                .isCalculatedInGpa(request.getIsCalculatedInGpa() != null ? request.getIsCalculatedInGpa() : true)
                .status(Course.CourseStatus.ACTIVE)
                .build();

        return convertToResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse updateCourse(Long id, CourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        String code = request.getCode().toUpperCase();

        // Check code uniqueness
        courseRepository.findByCode(code).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("Mã môn học đã tồn tại: " + code);
            }
        });

        course.setCode(code);
        course.setName(request.getName());
        course.setDescription(request.getDescription());
        course.setCredits(request.getCredits());
        course.setNumberOfSlots(request.getNumberOfSlots());
        course.setIsCalculatedInGpa(request.getIsCalculatedInGpa() != null ? request.getIsCalculatedInGpa() : true);

        return convertToResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse updateStatus(Long id, Course.CourseStatus status) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        course.setStatus(status);
        return convertToResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse updateGpaStatus(Long id, Boolean isCalculatedInGpa) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        course.setIsCalculatedInGpa(isCalculatedInGpa);
        return convertToResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public void deleteCourse(Long id) {
        if (subSpecializationCourseRepository.existsByCourseId(id)) {
            throw new IllegalArgumentException("Không thể xóa môn học đang được sử dụng trong chương trình đào tạo");
        }
        if (specializationCourseRepository.existsByCourseId(id)) {
            throw new IllegalArgumentException("Không thể xóa môn học đang được sử dụng trong chương trình đào tạo");
        }
        courseRepository.deleteById(id);
    }

    @Override
    public List<CourseResponse> searchCourses(String keyword, int limit) {
        return courseRepository.searchCourses(keyword, PageRequest.of(0, limit))
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseResponse> searchCoursesNotInSpecialization(Long specId, String keyword, int limit) {
        return courseRepository.searchCoursesNotInSpecialization(specId, keyword, PageRequest.of(0, limit))
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseResponse> searchCoursesNotInSubSpecialization(Long subSpecId, String keyword, int limit) {
        Long specId = subSpecializationRepository.findById(subSpecId)
                .map(ss -> ss.getSpecialization().getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyên ngành hẹp"));
        return courseRepository
                .searchCoursesNotInSubSpecialization(subSpecId, specId, keyword, PageRequest.of(0, limit))
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    private CourseResponse convertToResponse(Course course) {
        boolean canDelete = !subSpecializationCourseRepository.existsByCourseId(course.getId());
        List<CourseResponse.PrerequisiteDTO> prerequisites = course.getPrerequisites().stream()
                .map(p -> CourseResponse.PrerequisiteDTO.builder()
                        .id(p.getId())
                        .code(p.getCode())
                        .name(p.getName())
                        .build())
                .collect(Collectors.toList());
        return CourseResponse.builder()
                .id(course.getId())
                .code(course.getCode())
                .name(course.getName())
                .description(course.getDescription())
                .credits(course.getCredits())
                .numberOfSlots(course.getNumberOfSlots())
                .totalWeight(course.getTotalWeight())
                .status(course.getStatus())
                .isCalculatedInGpa(course.getIsCalculatedInGpa())
                .canDelete(canDelete)
                .prerequisites(prerequisites)
                .build();
    }

    // ==================== PREREQUISITE METHODS ====================

    @Override
    public List<CourseResponse.PrerequisiteDTO> getPrerequisites(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        return course.getPrerequisites().stream()
                .map(p -> CourseResponse.PrerequisiteDTO.builder()
                        .id(p.getId())
                        .code(p.getCode())
                        .name(p.getName())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<CourseResponse.PrerequisiteDTO> addPrerequisite(Long courseId, Long prereqId) {
        if (courseId.equals(prereqId)) {
            throw new IllegalArgumentException("Môn học không thể là tiên quyết của chính nó");
        }
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        Course prereq = courseRepository.findById(prereqId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn tiên quyết"));

        boolean alreadyExists = course.getPrerequisites().stream()
                .anyMatch(p -> p.getId().equals(prereqId));
        if (alreadyExists) {
            throw new IllegalArgumentException("Môn học này đã là tiên quyết");
        }

        boolean prereqHasCourseAsPrereq = prereq.getPrerequisites().stream()
                .anyMatch(p -> p.getId().equals(courseId));
        if (prereqHasCourseAsPrereq) {
            throw new IllegalArgumentException(
                    "Không thể thêm: Môn này đang có môn hiện tại là tiên quyết (Tránh vòng lặp)");
        }

        course.getPrerequisites().add(prereq);
        courseRepository.save(course);

        return getPrerequisites(courseId);
    }

    @Override
    @Transactional
    public List<CourseResponse.PrerequisiteDTO> removePrerequisite(Long courseId, Long prereqId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        course.getPrerequisites().removeIf(p -> p.getId().equals(prereqId));
        courseRepository.save(course);
        return getPrerequisites(courseId);
    }

    // ==================== IMPORT/EXPORT METHODS ====================

    @Override
    public List<CourseImportDTO> previewImportCourses(MultipartFile file) {
        List<CourseImportDTO> previewList = new ArrayList<>();

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

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

                // Read cells: A=Code, B=Name, C=Credits, D=Slots, E=Description, F=Calculated
                // in GPA, G=Status
                String code = getCellValueAsString(currentRow.getCell(0));
                String name = getCellValueAsString(currentRow.getCell(1));
                Integer credits = getCellValueAsInteger(currentRow.getCell(2));
                Integer slots = getCellValueAsInteger(currentRow.getCell(3));
                String description = getCellValueAsString(currentRow.getCell(4));
                String isCalculatedStr = getCellValueAsString(currentRow.getCell(5));
                String statusValue = getCellValueAsString(currentRow.getCell(6));

                Boolean isCalculatedInGpa = true;
                if (isCalculatedStr != null && !isCalculatedStr.trim().isEmpty()) {
                    isCalculatedInGpa = "YES".equalsIgnoreCase(isCalculatedStr.trim())
                            || "TRUE".equalsIgnoreCase(isCalculatedStr.trim())
                            || "CÓ".equalsIgnoreCase(isCalculatedStr.trim())
                            || "1".equals(isCalculatedStr.trim());
                }

                // Skip completely empty rows (all cells are empty)
                boolean isEmptyRow = (code == null || code.trim().isEmpty())
                        && (name == null || name.trim().isEmpty())
                        && credits == null
                        && slots == null;
                if (isEmptyRow) {
                    rowNumber++;
                    continue;
                }

                CourseImportDTO dto = CourseImportDTO.builder()
                        .rowNumber(currentRowNum)
                        .code(code != null ? code.trim() : "")
                        .name(name != null ? name.trim() : null)
                        .credits(credits)
                        .numberOfSlots(slots)
                        .description(description)
                        .isCalculatedInGpa(isCalculatedInGpa)
                        .statusValue(statusValue != null ? statusValue.trim().toUpperCase() : "ACTIVE")
                        .status("VALID")
                        .build();

                // Validate
                List<String> errors = new ArrayList<>();
                List<String> warnings = new ArrayList<>();

                // Check if code is empty
                if (dto.getCode() == null || dto.getCode().isEmpty()) {
                    errors.add("Mã môn học không được để trống");
                }
                if (dto.getName() == null || dto.getName().isEmpty()) {
                    errors.add("Tên môn học không được để trống");
                }
                if (dto.getCredits() == null || dto.getCredits() <= 0) {
                    errors.add("Số tín chỉ phải > 0");
                }
                if (dto.getNumberOfSlots() == null || dto.getNumberOfSlots() <= 0) {
                    errors.add("Số slot phải > 0");
                }

                // Check status value - if invalid, show warning and auto set to ACTIVE
                if (dto.getStatusValue() != null && !dto.getStatusValue().isEmpty()) {
                    if (!dto.getStatusValue().equals("ACTIVE") && !dto.getStatusValue().equals("INACTIVE")) {
                        warnings.add("Trạng thái không hợp lệ, tự động đặt là ACTIVE");
                        dto.setStatusValue("ACTIVE");
                    }
                } else {
                    dto.setStatusValue("ACTIVE");
                }

                // Only check duplicate and database if code is not empty
                if (code != null && !code.trim().isEmpty()) {
                    // Check duplicate in file
                    if (seenCodes.contains(code.toLowerCase())) {
                        errors.add("Mã môn học bị trùng trong file");
                    } else {
                        seenCodes.add(code.toLowerCase());
                    }

                    // Check if code exists in database - if exists, it's an error
                    Optional<Course> existingCourse = courseRepository.findByCode(code);
                    if (existingCourse.isPresent()) {
                        errors.add("Mã môn học đã tồn tại trong hệ thống");
                    }
                }

                // Set status and messages
                if (!errors.isEmpty()) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage(String.join("; ", errors));
                } else if (!warnings.isEmpty()) {
                    dto.setStatus("WARNING");
                    dto.setWarningMessage(String.join("; ", warnings));
                }

                previewList.add(dto);
                rowNumber++;
            }

        } catch (Exception e) {
            log.error("Error previewing import file", e);
            throw new RuntimeException("Lỗi khi đọc file Excel: " + e.getMessage());
        }

        return previewList;
    }

    @Override
    @Transactional(noRollbackFor = Exception.class)
    public Map<String, Object> saveImportedCourses(List<CourseImportDTO> dtos) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int createdCount = 0;
        int failedCount = 0;

        // Check if there are any ERROR rows - if yes, reject entire import
        List<CourseImportDTO> errorRows = dtos.stream()
                .filter(dto -> "ERROR".equals(dto.getStatus()))
                .toList();

        if (!errorRows.isEmpty()) {
            for (CourseImportDTO errorDto : errorRows) {
                errors.add("Dòng " + errorDto.getRowNumber() + ": " + errorDto.getErrorMessage());
            }
            result.put("created", 0);
            result.put("failed", errorRows.size());
            result.put("errors", errors);
            result.put("message", "Không thể import vì có " + errorRows.size()
                    + " dòng lỗi. Vui lòng sửa tất cả lỗi trước khi import.");
            return result;
        }

        for (CourseImportDTO dto : dtos) {
            try {
                // Double check - course code should not exist
                if (courseRepository.existsByCode(dto.getCode())) {
                    failedCount++;
                    errors.add("Dòng " + dto.getRowNumber() + ": Mã môn học đã tồn tại");
                    continue;
                }

                Course.CourseStatus courseStatus = "INACTIVE".equals(dto.getStatusValue())
                        ? Course.CourseStatus.INACTIVE
                        : Course.CourseStatus.ACTIVE;

                // Create new course only
                Course course = Course.builder()
                        .code(dto.getCode())
                        .name(dto.getName())
                        .credits(dto.getCredits())
                        .numberOfSlots(dto.getNumberOfSlots())
                        .description(dto.getDescription())
                        .isCalculatedInGpa(dto.getIsCalculatedInGpa() != null ? dto.getIsCalculatedInGpa() : true)
                        .status(courseStatus)
                        .build();
                courseRepository.save(course);
                createdCount++;
                log.info("Created course: {}", dto.getCode());
            } catch (Exception e) {
                failedCount++;
                errors.add("Dòng " + dto.getRowNumber() + ": " + e.getMessage());
                log.error("Error saving course at row {}: {}", dto.getRowNumber(), e.getMessage());
            }
        }

        result.put("created", createdCount);
        result.put("failed", failedCount);
        result.put("errors", errors);
        return result;
    }

    @Override
    public byte[] exportCourses(String status) {
        try {
            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet("Danh sách Môn học");

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

            // Create header row
            String[] headers = { "Code", "Name", "Credits", "Slots", "Description", "Calculated in GPA", "Status" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Get data
            List<Course> courses = courseRepository.findAll();
            if (status != null && !status.isEmpty()) {
                Course.CourseStatus filterStatus = Course.CourseStatus.valueOf(status);
                courses = courses.stream()
                        .filter(c -> c.getStatus() == filterStatus)
                        .collect(Collectors.toList());
            }

            // Sort by code
            courses.sort(Comparator.comparing(Course::getCode));

            int rowNum = 1;
            for (Course course : courses) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(course.getCode());
                row.createCell(1).setCellValue(course.getName() != null ? course.getName() : "");
                row.createCell(2).setCellValue(course.getCredits() != null ? course.getCredits() : 0);
                row.createCell(3).setCellValue(course.getNumberOfSlots() != null ? course.getNumberOfSlots() : 0);
                row.createCell(4).setCellValue(course.getDescription() != null ? course.getDescription() : "");
                row.createCell(5).setCellValue(Boolean.TRUE.equals(course.getIsCalculatedInGpa()) ? "Yes" : "No");
                row.createCell(6).setCellValue(course.getStatus() != null ? course.getStatus().name() : "ACTIVE");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error exporting courses", e);
            throw new RuntimeException("Lỗi khi xuất file Excel", e);
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().toString();
                }
                // Return as integer string if it's a whole number
                double numValue = cell.getNumericCellValue();
                if (numValue == Math.floor(numValue)) {
                    return String.valueOf((long) numValue);
                }
                return String.valueOf(numValue);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            default:
                return null;
        }
    }

    private Integer getCellValueAsInteger(Cell cell) {
        if (cell == null) {
            return null;
        }
        try {
            switch (cell.getCellType()) {
                case NUMERIC:
                    return (int) cell.getNumericCellValue();
                case STRING:
                    String value = cell.getStringCellValue().trim();
                    if (value.isEmpty()) {
                        return null;
                    }
                    return Integer.parseInt(value);
                default:
                    return null;
            }
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @Override
    public byte[] getImportTemplate() {
        try {
            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet("Template Import Môn học");

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

            // Create header row
            String[] headers = { "Code", "Name", "Credits", "Slots", "Description", "Calculated in GPA", "Status" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Add sample data rows
            String[][] sampleData = {
                    { "PRF192", "Programming Fundamentals with C", "3", "30", "Nhập môn lập trình với ngôn ngữ C.",
                            "Yes", "ACTIVE" },
                    { "MAE101", "Mathematics for Engineering", "3", "30", "Toán đại cương dành cho khối kỹ thuật.",
                            "Yes", "ACTIVE" },
                    { "PRO192", "Object-Oriented Programming", "3", "30", "Lập trình hướng đối tượng với Java.",
                            "Yes", "ACTIVE" },
                    { "VNR202", "Giáo dục quốc phòng", "0", "0", "Giáo dục quốc phòng an ninh", "No", "ACTIVE" }
            };

            for (int i = 0; i < sampleData.length; i++) {
                Row row = sheet.createRow(i + 1);
                for (int j = 0; j < sampleData[i].length; j++) {
                    row.createCell(j).setCellValue(sampleData[i][j]);
                }
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Add instruction sheet
            Sheet instructionSheet = workbook.createSheet("Hướng dẫn");
            String[] instructions = {
                    "HƯỚNG DẪN IMPORT MÔN HỌC",
                    "",
                    "1. Sheet 'Template Import Môn học' chứa mẫu dữ liệu để import.",
                    "2. Các cột bắt buộc: Code, Name, Credits, Slots",
                    "3. Cột Status: ACTIVE (đang mở) hoặc INACTIVE (ngừng đào tạo). Nếu để trống hoặc không hợp lệ sẽ tự động đặt là ACTIVE.",
                    "4. Cột Calculated in GPA: Yes/Có/True hoặc No/Không/False. Xác định môn học có tính điểm GPA hay không.",
                    "5. Cột Description: Mô tả môn học (không bắt buộc).",
                    "6. Mã môn học (Code) phải là duy nhất, không được trùng với môn đã có trong hệ thống.",
                    "",
                    "Lưu ý: Xóa các dòng mẫu trước khi nhập dữ liệu thực tế."
            };
            for (int i = 0; i < instructions.length; i++) {
                Row row = instructionSheet.createRow(i);
                Cell cell = row.createCell(0);
                cell.setCellValue(instructions[i]);
                if (i == 0) {
                    CellStyle titleStyle = workbook.createCellStyle();
                    Font titleFont = workbook.createFont();
                    titleFont.setBold(true);
                    titleFont.setFontHeightInPoints((short) 14);
                    titleStyle.setFont(titleFont);
                    cell.setCellStyle(titleStyle);
                }
            }
            instructionSheet.setColumnWidth(0, 80 * 256);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating import template", e);
            throw new RuntimeException("Lỗi khi tạo file template", e);
        }
    }
}
