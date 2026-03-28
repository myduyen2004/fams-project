package com.fams.backend.service;

import com.fams.backend.dto.timetable.TimetableDTO;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook; // For large data handling
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ExcelExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public void exportStudentScheduleToExcel(
            HttpServletResponse response,
            List<TimetableDTO.TimetableSlotDTO> slots,
            String studentName,
            String semesterName) throws IOException {

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) { // Keep 100 rows in memory
            Sheet sheet = workbook.createSheet("Schedule");
            ((org.apache.poi.xssf.streaming.SXSSFSheet) sheet).trackAllColumnsForAutoSizing();

            // 2. Define Styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle normalStyle = createNormalStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle statusPresent = createStatusStyle(workbook, IndexedColors.GREEN);
            CellStyle statusAbsent = createStatusStyle(workbook, IndexedColors.RED);
            CellStyle statusFuture = createStatusStyle(workbook, IndexedColors.GREY_50_PERCENT);
            CellStyle titleStyle = createTitleStyle(workbook);

            // 3. Create Title & Info Headers
            createTitleRow(sheet, titleStyle, studentName, semesterName);

            // 4. Create Table Header (Row 6 -> Index 5)
            String[] columns = { "No.", "Date", "Day", "Slot", "Class/Course", "Room", "Lecturer", "Status" };
            Row headerRow = sheet.createRow(5);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // 5. Populate Data
            int rowIdx = 6;
            int serialNo = 1;

            for (TimetableDTO.TimetableSlotDTO slot : slots) {
                Row row = sheet.createRow(rowIdx++);

                // No.
                createCell(row, 0, String.valueOf(serialNo++), normalStyle);

                // Date
                String dateStr = slot.getDate() != null ? slot.getDate().format(DATE_FORMATTER) : "";
                createCell(row, 1, dateStr, normalStyle);

                // Day
                String dayStr = getDayName(slot.getDayOfWeek());
                createCell(row, 2, dayStr, normalStyle);

                // Slot
                String slotStr = String.format("Slot %d (%s-%s)",
                        slot.getSlotNumber(),
                        slot.getStartTime() != null ? slot.getStartTime().toString() : "",
                        slot.getEndTime() != null ? slot.getEndTime().toString() : "");
                createCell(row, 3, slotStr, normalStyle);

                // Class/Course
                String classStr = (slot.getClassName() != null ? slot.getClassName() : "") +
                        (slot.getCourseCode() != null ? "\n(" + slot.getCourseCode() + ")" : "");
                createCell(row, 4, classStr, normalStyle);

                // Room
                createCell(row, 5, slot.getRoomCode(), normalStyle);

                // Lecturer
                createCell(row, 6, slot.getLecturerName(), normalStyle);

                // Status logic matching Frontend & User Constraints
                String statusText = "";
                CellStyle statusStyle = normalStyle;

                if (slot.getAttendanceStatus() != null) {
                    if ("PRESENT".equalsIgnoreCase(slot.getAttendanceStatus())) {
                        statusText = "Có mặt";
                        statusStyle = statusPresent;
                    } else if ("ABSENT".equalsIgnoreCase(slot.getAttendanceStatus())) {
                        statusText = "Vắng mặt";
                        statusStyle = statusAbsent;
                    }
                }

                if (statusText.isEmpty()) {
                    if ("CANCELLED".equalsIgnoreCase(slot.getStatus())) {
                        statusText = "Đã hủy";
                        statusStyle = statusFuture; // Or create a cancelled style
                    } else {
                        // Default for SCHEDULED, COMPLETED (without attendance) -> Chưa diễn ra
                        statusText = "Chưa diễn ra";
                        statusStyle = statusFuture;
                    }
                }

                createCell(row, 7, statusText, statusStyle);
            }

            // 6. Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // 7. Write to Output Stream
            ServletOutputStream outputStream = response.getOutputStream();
            workbook.write(outputStream);
            outputStream.close();
        }
    }

    public void exportLecturerScheduleToExcel(
            HttpServletResponse response,
            List<TimetableDTO.TimetableSlotDTO> slots,
            String lecturerName,
            String semesterName) throws IOException {

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) { // Keep 100 rows in memory
            Sheet sheet = workbook.createSheet("Lecturer Schedule");
            ((org.apache.poi.xssf.streaming.SXSSFSheet) sheet).trackAllColumnsForAutoSizing();

            // 2. Define Styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle normalStyle = createNormalStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle statusFuture = createStatusStyle(workbook, IndexedColors.GREY_50_PERCENT);
            CellStyle titleStyle = createTitleStyle(workbook);

            // 3. Create Title & Info Headers
            createLecturerTitleRow(sheet, titleStyle, lecturerName, semesterName);

            // 4. Create Table Header (Row 6 -> Index 5)
            String[] columns = { "No.", "Date", "Day", "Slot", "Class/Course", "Room", "Status" };
            Row headerRow = sheet.createRow(5);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // 5. Populate Data
            int rowIdx = 6;
            int serialNo = 1;

            for (TimetableDTO.TimetableSlotDTO slot : slots) {
                Row row = sheet.createRow(rowIdx++);

                // No.
                createCell(row, 0, String.valueOf(serialNo++), normalStyle);

                // Date
                String dateStr = slot.getDate() != null ? slot.getDate().format(DATE_FORMATTER) : "";
                createCell(row, 1, dateStr, normalStyle);

                // Day
                String dayStr = getDayName(slot.getDayOfWeek());
                createCell(row, 2, dayStr, normalStyle);

                // Slot
                String slotStr = String.format("Slot %d (%s-%s)",
                        slot.getSlotNumber(),
                        slot.getStartTime() != null ? slot.getStartTime().toString() : "",
                        slot.getEndTime() != null ? slot.getEndTime().toString() : "");
                createCell(row, 3, slotStr, normalStyle);

                // Class/Course
                String classStr = (slot.getClassName() != null ? slot.getClassName() : "") +
                        (slot.getCourseCode() != null ? "\n(" + slot.getCourseCode() + ")" : "");
                createCell(row, 4, classStr, normalStyle);

                // Room
                createCell(row, 5, slot.getRoomCode(), normalStyle);

                // Status logic
                String statusText = "";
                CellStyle statusStyle = normalStyle;

                if ("CANCELLED".equalsIgnoreCase(slot.getStatus())) {
                    statusText = "Đã hủy";
                    statusStyle = statusFuture;
                } else {
                    statusText = "Chưa diễn ra";
                    statusStyle = statusFuture;
                }

                createCell(row, 6, statusText, statusStyle);
            }

            // 6. Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // 7. Write to Output Stream
            ServletOutputStream outputStream = response.getOutputStream();
            workbook.write(outputStream);
            outputStream.close();
        }
    }

    private void createLecturerTitleRow(Sheet sheet, CellStyle titleStyle, String lecturerName, String semesterName) {
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Lecturer Schedule Report");
        titleCell.setCellStyle(titleStyle);

        Row semesterRow = sheet.createRow(2);
        semesterRow.createCell(0).setCellValue("Semester:");
        semesterRow.createCell(1).setCellValue(semesterName);

        Row lecturerRow = sheet.createRow(3);
        lecturerRow.createCell(0).setCellValue("Lecturer:");
        lecturerRow.createCell(1).setCellValue(lecturerName);
    }

    private void createCell(Row row, int colIndex, String value, CellStyle style) {
        Cell cell = row.createCell(colIndex);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private String getDayName(int dayOfWeek) {
        return switch (dayOfWeek) {
            case 1 -> "Mon";
            case 2 -> "Tue";
            case 3 -> "Wed";
            case 4 -> "Thu";
            case 5 -> "Fri";
            case 6 -> "Sat";
            case 7 -> "Sun";
            default -> "";
        };
    }

    // --- Styling Helpers ---

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createNormalStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true); // Allow newlines
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        return createNormalStyle(workbook);
    }

    private CellStyle createStatusStyle(Workbook workbook, IndexedColors color) {
        CellStyle style = createNormalStyle(workbook);
        Font font = workbook.createFont();
        font.setColor(color.getIndex());
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        font.setColor(IndexedColors.ORANGE.getIndex()); // Attempt Orange
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        return style;
    }

    private void createTitleRow(Sheet sheet, CellStyle titleStyle, String studentName, String semesterName) {
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Student Schedule Report");
        titleCell.setCellStyle(titleStyle);

        Row semesterRow = sheet.createRow(2);
        semesterRow.createCell(0).setCellValue("Semester:");
        semesterRow.createCell(1).setCellValue(semesterName);

        Row studentRow = sheet.createRow(3);
        studentRow.createCell(0).setCellValue("Student:");
        studentRow.createCell(1).setCellValue(studentName);
    }
}
