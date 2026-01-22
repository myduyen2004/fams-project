package com.fams.backend.service.impl;

import com.fams.backend.dto.response.ClassSectionResponse;
import com.fams.backend.dto.response.EnrollmentResponse;
import com.fams.backend.dto.response.LecturerOptionResponse;
import com.fams.backend.entity.ClassSection;
import com.fams.backend.entity.Enrollment;
import com.fams.backend.entity.User;
import com.fams.backend.repository.ClassSectionRepository;
import com.fams.backend.repository.EnrollmentRepository;
import com.fams.backend.service.ClassSectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing class sections.
 * 
 * Note: Import functionality has been moved to StagingImportService
 * for better performance with large files (streaming + staging tables).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ClassSectionServiceImpl implements ClassSectionService {

    private final ClassSectionRepository classSectionRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<ClassSectionResponse> getClassSectionsBySemester(
            String semesterCode,
            String search,
            String status,
            Long lecturerId,
            Pageable pageable) {

        // Convert status from string to enum if provided
        String statusValue = null;
        if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                ClassSection.ClassStatus.valueOf(status.toUpperCase());
                statusValue = status.toUpperCase();
            } catch (IllegalArgumentException e) {
                // Invalid status, ignore it
            }
        }

        Page<ClassSection> classSections = classSectionRepository.findBySemesterCodeWithFilters(
                semesterCode,
                search,
                statusValue,
                lecturerId,
                pageable);

        return classSections.map(this::convertToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LecturerOptionResponse> getLecturersBySemester(String semesterCode) {
        List<ClassSection> classSections = classSectionRepository.findAll();

        Map<Long, LecturerOptionResponse> lecturerMap = new LinkedHashMap<>();

        classSections.stream()
                .filter(cs -> cs.getSemester().getCode().equals(semesterCode))
                .filter(cs -> cs.getLecturer() != null)
                .forEach(cs -> {
                    User lecturer = cs.getLecturer();
                    if (!lecturerMap.containsKey(lecturer.getId())) {
                        lecturerMap.put(lecturer.getId(), LecturerOptionResponse.builder()
                                .id(lecturer.getId())
                                .fullName(lecturer.getFullName())
                                .username(lecturer.getUsername())
                                .build());
                    }
                });

        return new ArrayList<>(lecturerMap.values());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEnrollmentsByClassName(String className) {
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);

        return enrollments.stream()
                .map(this::convertToEnrollmentResponse)
                .collect(Collectors.toList());
    }

    // ==================== TEMPLATE METHODS ====================

    @Override
    public byte[] getImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet dataSheet = workbook.createSheet("Template Import Lớp học phần");

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);

            // Create headers
            Row headerRow = dataSheet.createRow(0);
            String[] headers = { "Class Name", "Course Code", "Lecturer Code", "Max Students" };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Sample row
            Row sampleRow = dataSheet.createRow(1);
            sampleRow.createCell(0).setCellValue("SE18B02-PRN211");
            sampleRow.createCell(1).setCellValue("PRN211");
            sampleRow.createCell(2).setCellValue("sonnt5");
            sampleRow.createCell(3).setCellValue(30);

            for (int i = 0; i < headers.length; i++) {
                dataSheet.autoSizeColumn(i);
            }

            // Create instruction sheet
            Sheet instructionSheet = workbook.createSheet("Hướng dẫn");
            String[] instructions = {
                    "HƯỚNG DẪN IMPORT LỚP HỌC PHẦN",
                    "",
                    "1. Class Name: Mã lớp học phần (bắt buộc, không được trùng)",
                    "   Ví dụ: SE18B02-PRN211",
                    "",
                    "2. Course Code: Mã môn học (bắt buộc, phải tồn tại trong hệ thống)",
                    "   Ví dụ: PRN211",
                    "",
                    "3. Lecturer Code: Username của giảng viên (không bắt buộc)",
                    "   Ví dụ: sonnt5",
                    "",
                    "4. Max Students: Số lượng sinh viên tối đa (mặc định 30 nếu để trống)",
                    "",
                    "LƯU Ý:",
                    "- Không được xóa dòng tiêu đề",
                    "- Mã lớp học phần không được trùng trong file và trong hệ thống"
            };
            for (int i = 0; i < instructions.length; i++) {
                Row row = instructionSheet.createRow(i);
                row.createCell(0).setCellValue(instructions[i]);
            }
            instructionSheet.setColumnWidth(0, 60 * 256);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            log.error("Error creating import template", e);
            throw new RuntimeException("Lỗi khi tạo file template: " + e.getMessage());
        }
    }

    @Override
    public byte[] getEnrollmentImportTemplate(String semesterCode) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Danh sách đăng ký");

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);

            // Create header row
            Row headerRow = sheet.createRow(0);
            String[] headers = { "MSSV", "Mã lớp + Mã môn" };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Sample rows
            Row sampleRow1 = sheet.createRow(1);
            sampleRow1.createCell(0).setCellValue("SE180001");
            sampleRow1.createCell(1).setCellValue("SE18B02-PRN211");

            Row sampleRow2 = sheet.createRow(2);
            sampleRow2.createCell(0).setCellValue("SE180002");
            sampleRow2.createCell(1).setCellValue("SE18B02-PRN211");

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Create instruction sheet
            Sheet instructionSheet = workbook.createSheet("Hướng dẫn");
            String[] instructions = {
                    "HƯỚNG DẪN IMPORT ĐĂNG KÝ HỌC",
                    "",
                    "1. MSSV: Mã số sinh viên (bắt buộc, phải tồn tại trong hệ thống)",
                    "   Ví dụ: SE180001",
                    "",
                    "2. Mã lớp: Mã lớp học phần (bắt buộc, phải tồn tại trong học kỳ này)",
                    "   Ví dụ: SE18B02-PRN211",
                    "",
                    "LƯU Ý:",
                    "- Không được xóa dòng tiêu đề",
                    "- Một sinh viên không thể đăng ký cùng một lớp học phần hai lần",
                    "- Kiểm tra danh sách lớp học phần ở sheet 'Danh sách lớp học phần'"
            };
            for (int i = 0; i < instructions.length; i++) {
                Row row = instructionSheet.createRow(i);
                row.createCell(0).setCellValue(instructions[i]);
            }
            instructionSheet.setColumnWidth(0, 60 * 256);

            // Create class list sheet for reference
            Sheet classListSheet = workbook.createSheet("Danh sách lớp học phần");
            Row classHeaderRow = classListSheet.createRow(0);
            Cell classCell0 = classHeaderRow.createCell(0);
            classCell0.setCellValue("Mã lớp");
            classCell0.setCellStyle(headerStyle);
            Cell classCell1 = classHeaderRow.createCell(1);
            classCell1.setCellValue("Môn học");
            classCell1.setCellStyle(headerStyle);
            Cell classCell2 = classHeaderRow.createCell(2);
            classCell2.setCellValue("Số SV hiện tại / Tối đa");
            classCell2.setCellStyle(headerStyle);

            List<ClassSection> allClassSections = classSectionRepository.findBySemesterCode(semesterCode);

            int classRowNum = 1;
            for (ClassSection cs : allClassSections) {
                Row classRow = classListSheet.createRow(classRowNum++);
                classRow.createCell(0).setCellValue(cs.getClassName());
                classRow.createCell(1).setCellValue(cs.getCourse().getName());
                classRow.createCell(2).setCellValue(cs.getCurrentEnrollment() + " / " + cs.getMaxStudents());
            }
            for (int i = 0; i < 3; i++) {
                classListSheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            log.error("Error creating enrollment import template", e);
            throw new RuntimeException("Lỗi khi tạo file template: " + e.getMessage());
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    private EnrollmentResponse convertToEnrollmentResponse(Enrollment enrollment) {
        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .className(enrollment.getClassSection().getClassName())
                .studentCode(enrollment.getStudentCode())
                .studentName(enrollment.getStudent().getFullName())
                .status(enrollment.getStatus().name())
                .build();
    }

    private ClassSectionResponse convertToResponse(ClassSection classSection) {
        return ClassSectionResponse.builder()
                .className(classSection.getClassName())
                .courseCode(classSection.getCourse().getCode())
                .courseName(classSection.getCourse().getName())
                .semesterCode(classSection.getSemester().getCode())
                .lecturerName(classSection.getLecturer() != null ? classSection.getLecturer().getFullName() : null)
                .enrollmentInfo(classSection.getCurrentEnrollment() + " / " + classSection.getMaxStudents())
                .slots(classSection.getNumberOfSlots())
                .status(classSection.getStatus().name())
                .build();
    }
}
