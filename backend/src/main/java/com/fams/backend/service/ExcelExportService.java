package com.fams.backend.service;

import com.fams.backend.dto.attendance.AttendanceDTO;
import com.fams.backend.dto.timetable.TimetableDTO;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook; // For large data handling
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

                String statusText = getStudentScheduleStatusLabel(slot);
                CellStyle statusStyle = normalStyle;

                if ("Đã hủy".equals(statusText)) {
                    statusStyle = statusAbsent;
                } else if ("Có mặt".equals(statusText)) {
                    statusStyle = statusPresent;
                } else if ("Vắng mặt".equals(statusText)) {
                    statusStyle = statusAbsent;
                } else {
                    statusStyle = statusFuture;
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
            CellStyle statusPresent = createStatusStyle(workbook, IndexedColors.GREEN);
            CellStyle statusAbsent = createStatusStyle(workbook, IndexedColors.RED);
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

                String statusText = getLecturerScheduleStatusLabel(slot);
                CellStyle statusStyle = normalStyle;

                if ("Đã hủy".equals(statusText)) {
                    statusStyle = statusAbsent;
                } else if ("Đang diễn ra".equals(statusText)) {
                    statusStyle = statusPresent;
                } else {
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

    public void exportClassAttendanceReportToExcel(
            HttpServletResponse response,
            AttendanceDTO.ClassAttendanceReportResponse report) throws IOException {

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            Sheet sheet = workbook.createSheet("Attendance Report");
            ((org.apache.poi.xssf.streaming.SXSSFSheet) sheet).trackAllColumnsForAutoSizing();

            // 2. Define Styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle normalStyle = createNormalStyle(workbook);
            CellStyle statusStyleP = createStatusStyle(workbook, IndexedColors.GREEN);
            CellStyle statusStyleA = createStatusStyle(workbook, IndexedColors.RED);
            CellStyle statusStyleE = createStatusStyle(workbook, IndexedColors.ORANGE);
            CellStyle titleStyle = createTitleStyle(workbook);

            // 3. Create Title Row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Class Attendance Report");
            titleCell.setCellStyle(titleStyle);

            Row infoRow1 = sheet.createRow(2);
            infoRow1.createCell(0).setCellValue("Class:");
            infoRow1.createCell(1).setCellValue(report.getClassName());
            infoRow1.createCell(3).setCellValue("Course:");
            infoRow1.createCell(4).setCellValue(report.getCourseCode() + " - " + report.getCourseName());

            Row infoRow2 = sheet.createRow(3);
            infoRow2.createCell(0).setCellValue("Semester:");
            infoRow2.createCell(1).setCellValue(report.getSemesterName());
            infoRow2.createCell(3).setCellValue("Export Date:");
            infoRow2.createCell(4).setCellValue(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));

            // 4. Create Table Header
            List<String> columns = new java.util.ArrayList<>(List.of("No.", "Student Code", "Student Name"));
            for (AttendanceDTO.SlotInfo slot : report.getSlots()) {
                columns.add("Slot " + slot.getSlotIndex());
            }
            columns.add("Absent %");

            Row headerRow = sheet.createRow(5);
            for (int i = 0; i < columns.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns.get(i));
                cell.setCellStyle(headerStyle);
            }

            // 5. Populate Data
            int rowIdx = 6;
            int serialNo = 1;

            for (AttendanceDTO.StudentReport student : report.getStudentReports()) {
                Row row = sheet.createRow(rowIdx++);

                createCell(row, 0, String.valueOf(serialNo++), normalStyle);
                createCell(row, 1, student.getStudentCode(), normalStyle);
                createCell(row, 2, student.getStudentName(), normalStyle);

                int colIdx = 3;
                for (AttendanceDTO.AttendanceDetail detail : student.getAttendanceDetails()) {
                    String status = detail.getStatus();
                    CellStyle currentStatusStyle = normalStyle;
                    if ("P".equals(status)) currentStatusStyle = statusStyleP;
                    else if ("A".equals(status)) currentStatusStyle = statusStyleA;
                    else if ("E".equals(status)) currentStatusStyle = statusStyleE;

                    createCell(row, colIdx++, status != null ? status : "-", currentStatusStyle);
                }

                // Absent %
                createCell(row, colIdx, String.format("%.2f%%", student.getAbsentPercentage()),
                        student.getAbsentPercentage() >= 20 ? statusStyleA : normalStyle);
            }

            // 6. Set Fixed Column Widths
            sheet.setColumnWidth(0, 1500); // No.
            sheet.setColumnWidth(1, 4000); // Student Code
            sheet.setColumnWidth(2, 9000); // Student Name

            for (int i = 3; i < columns.size() - 1; i++) {
                sheet.setColumnWidth(i, 2000); // Slot columns (narrow and equal)
            }
            sheet.setColumnWidth(columns.size() - 1, 3000); // Absent %

            // 7. Write to Output Stream
            ServletOutputStream outputStream = response.getOutputStream();
            workbook.write(outputStream);
            outputStream.flush();
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

    private String getStudentScheduleStatusLabel(TimetableDTO.TimetableSlotDTO slot) {
        if (slot == null) {
            return "Chưa điểm danh";
        }

        if ("CANCELLED".equalsIgnoreCase(slot.getStatus())) {
            return "Đã hủy";
        }

        if ("PRESENT".equalsIgnoreCase(slot.getAttendanceStatus())) {
            return "Có mặt";
        }
        if ("ABSENT".equalsIgnoreCase(slot.getAttendanceStatus())) {
            return "Vắng mặt";
        }
        if ("EXCUSED".equalsIgnoreCase(slot.getAttendanceStatus())) {
            return "Có phép";
        }

        LocalDate slotDate = slot.getDate();
        LocalTime startTime = slot.getStartTime();
        if (slotDate != null && startTime != null) {
            int thresholdMinutes = slot.getAbsentThresholdMinutes() != null ? slot.getAbsentThresholdMinutes() : 15;
            LocalDateTime attendanceDeadline = LocalDateTime.of(slotDate, startTime).plusMinutes(thresholdMinutes);
            if (LocalDateTime.now().isBefore(attendanceDeadline)) {
                return "Chưa điểm danh";
            }
            return "Vắng mặt";
        }

        return "Chưa điểm danh";
    }

    private String getLecturerScheduleStatusLabel(TimetableDTO.TimetableSlotDTO slot) {
        if (slot == null) {
            return "Chưa diễn ra";
        }

        if ("CANCELLED".equalsIgnoreCase(slot.getStatus())) {
            return "Đã hủy";
        }

        LocalDate slotDate = slot.getDate();
        if (slotDate == null) {
            return "Chưa diễn ra";
        }

        LocalDate today = LocalDate.now();
        if (slotDate.isBefore(today)) {
            return "Đã kết thúc";
        }

        if (slotDate.isEqual(today) && slot.getStartTime() != null && slot.getEndTime() != null) {
            LocalTime now = LocalTime.now();
            if (!now.isBefore(slot.getEndTime())) {
                return "Đã kết thúc";
            }
            if (!now.isBefore(slot.getStartTime())) {
                return "Đang diễn ra";
            }
        }

        return "Chưa diễn ra";
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
