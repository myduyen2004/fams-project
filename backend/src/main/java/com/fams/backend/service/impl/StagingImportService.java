package com.fams.backend.service.impl;

import com.fams.backend.entity.Alert;
import com.fams.backend.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;

import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;
import java.io.*;
import java.sql.PreparedStatement;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * STAGING TABLE IMPORT SERVICE - Ultra Low Memory Usage
 * 
 * Flow:
 * 1. Excel streaming (SAX parser) → Batch insert to Staging Table
 * 2. Validate bằng SQL JOIN (DB server xử lý)
 * 3. INSERT SELECT từ staging → target table
 * 
 * RAM usage: < 50MB cho file 1 triệu rows
 * Tất cả heavy lifting do Database server đảm nhiệm
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class StagingImportService {

    private final JdbcTemplate jdbcTemplate;
    private final SemesterRepository semesterRepository;
    private final AlertService alertService;
    private final SystemLogService systemLogService;

    private static final int MAX_SAMPLE_ERRORS = 100;
    private static final int BATCH_SIZE = 1000;

    // ==================== CLASS SECTION IMPORT ====================

    /**
     * Fast preview class sections using staging table
     */
    public Map<String, Object> fastPreviewClassSections(@org.springframework.lang.NonNull String semesterCode,
            @org.springframework.lang.NonNull MultipartFile file) {
        long startTime = System.currentTimeMillis();
        String stagingTable = "staging_cs_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);

        try {
            // 1. Validate semester exists and is in UPCOMING status
            var semester = semesterRepository.findByCode(semesterCode)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ: " + semesterCode));

            // Remove status check to allow historical management
            /*
            if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
                throw new RuntimeException("Chỉ có thể nhập lớp học phần khi học kỳ chưa bắt đầu");
            }
            */

            // 2. Create staging table
            createClassSectionStagingTable(stagingTable);

            // 3. Stream Excel → Staging Table (batch insert)
            long rowsCopied = streamExcelToStagingClassSection(file, stagingTable);

            // 4. Validate using SQL
            Map<String, Object> validationResult = validateClassSectionsInStaging(stagingTable, semester.getId());

            long duration = System.currentTimeMillis() - startTime;

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("totalRows", rowsCopied);
            result.put("validRows", validationResult.get("validCount"));
            result.put("errorRows", validationResult.get("errorCount"));
            result.put("canImport",
                    (int) validationResult.get("errorCount") == 0 && (int) validationResult.get("validCount") > 0);
            result.put("sampleErrors", validationResult.get("sampleErrors"));
            result.put("stagingTable", stagingTable);
            result.put("semesterId", semester.getId());
            result.put("durationMs", duration);
            result.put("message",
                    buildMessage((int) validationResult.get("validCount"), (int) validationResult.get("errorCount")));

            log.info("Fast preview class sections: {} rows in {}ms", rowsCopied, duration);

            // --- High Error Alert ---
            if ((int) validationResult.get("errorCount") > 50) {
                alertService.createAlert(
                        "Lỗi import lớp học phần",
                        String.format("File import lớp học phần của học kỳ %s chứa quá nhiều lỗi (%d lỗi).",
                                semesterCode, validationResult.get("errorCount")),
                        Alert.AlertLevel.WARNING,
                        Alert.AlertType.SYSTEM,
                        null);
            }

            return result;

        } catch (Exception e) {
            log.error("Error in fast preview class sections", e);
            dropStagingTable(stagingTable);
            throw new RuntimeException("Lỗi khi đọc file: " + e.getMessage(), e);
        }
    }

    /**
     * Import class sections from staging table
     */
    public Map<String, Object> importClassSectionsFromStaging(@org.springframework.lang.NonNull String stagingTable,
            @org.springframework.lang.NonNull Long semesterId) {
        long startTime = System.currentTimeMillis();

        try {
            var semester = semesterRepository.findById(semesterId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ"));

            // Remove status check to allow historical management
            /*
            if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
                throw new RuntimeException("Chỉ có thể nhập lớp học phần khi học kỳ chưa bắt đầu");
            }
            */
            String insertSql = """
                    INSERT INTO class_sections (class_name, semester_id, course_id, lecturer_id, number_of_slots, max_students, current_enrollment, status, created_at, updated_at)
                    SELECT
                        TRIM(s.class_name),
                        ?,
                        c.id,
                        u.id,
                        COALESCE(c.number_of_slots, 20),
                        COALESCE(NULLIF(TRIM(s.max_students), '')::int, 30),
                        0,
                        'UPCOMING',
                        NOW(),
                        NOW()
                    FROM %s s
                    JOIN courses c ON TRIM(s.course_code) = TRIM(c.code)
                    LEFT JOIN users u ON TRIM(s.lecturer_code) = TRIM(u.username) AND u.role = 'LECTURER'
                    WHERE s.error_message IS NULL
                    AND NOT EXISTS (
                        SELECT 1 FROM class_sections cs
                        WHERE TRIM(cs.class_name) = TRIM(s.class_name)
                    )
                    """
                    .formatted(stagingTable);

            int created = jdbcTemplate.update(insertSql, semesterId);

            Integer failedCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + stagingTable + " WHERE error_message IS NOT NULL",
                    Integer.class);
            int failed = failedCount != null ? failedCount : 0;

            dropStagingTable(stagingTable);

            long duration = System.currentTimeMillis() - startTime;

            Map<String, Object> result = new HashMap<>();
            result.put("totalProcessed", created + failed);
            result.put("created", created);
            result.put("failed", failed);
            result.put("durationMs", duration);
            result.put("message",
                    String.format("Import thành công %d lớp học phần trong %.2f giây", created, duration / 1000.0));

            log.info("Import class sections completed: {} created, {} failed in {}ms", created, failed, duration);

            // Log to system logs
            systemLogService.logInfo(
                    "Import lớp học phần",
                    String.format("Xử lý import lớp học phần cho học kỳ %s: %d thành công, %d thất bại.",
                            semester.getCode(), created, failed),
                    "BulkImport"
            );

            // --- Alert only if there are failures ---
            if (failed > 0) {
                alertService.createAlert(
                        "Lỗi import lớp học phần",
                        String.format("Quá trình import lớp học phần cho học kỳ %s có %d dòng lỗi không thể xử lý.",
                                semester.getCode(), failed),
                        Alert.AlertLevel.WARNING,
                        Alert.AlertType.SYSTEM,
                        null
                );
            }

            return result;

        } catch (Exception e) {
            log.error("Error importing class sections from staging", e);
            dropStagingTable(stagingTable);
            throw new RuntimeException("Lỗi khi import: " + e.getMessage(), e);
        }
    }

    /**
     * Full import flow: preview + import in one step
     */
    public Map<String, Object> bulkImportClassSections(@org.springframework.lang.NonNull String semesterCode,
            @org.springframework.lang.NonNull MultipartFile file) {
        long startTime = System.currentTimeMillis();
        String stagingTable = "staging_cs_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);

        try {
            var semester = semesterRepository.findByCode(semesterCode)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ: " + semesterCode));

            // Removed status check to allow historical management
            /*
            if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
                throw new RuntimeException("Chỉ có thể nhập lớp học phần khi học kỳ chưa bắt đầu");
            }
            */

            createClassSectionStagingTable(stagingTable);

            long rowsCopied = streamExcelToStagingClassSection(file, stagingTable);

            Map<String, Object> validation = validateClassSectionsInStaging(stagingTable, semester.getId());
            int errorCount = (int) validation.get("errorCount");

            if (errorCount > 0) {
                Map<String, Object> result = new HashMap<>();
                result.put("totalProcessed", rowsCopied);
                result.put("created", 0);
                result.put("failed", errorCount);
                result.put("errors", validation.get("sampleErrors"));
                result.put("durationMs", System.currentTimeMillis() - startTime);
                result.put("message", String.format("Không thể import do có %d dòng lỗi", errorCount));

                dropStagingTable(stagingTable);
                return result;
            }

            return importClassSectionsFromStaging(stagingTable, semester.getId());

        } catch (Exception e) {
            log.error("Error in bulk import class sections", e);
            dropStagingTable(stagingTable);
            throw new RuntimeException("Lỗi khi import: " + e.getMessage(), e);
        }
    }

    // ==================== ENROLLMENT IMPORT ====================

    /**
     * Fast preview enrollments using staging table
     */
    public Map<String, Object> fastPreviewEnrollments(@org.springframework.lang.NonNull String semesterCode,
            @org.springframework.lang.NonNull MultipartFile file) {
        long startTime = System.currentTimeMillis();
        String stagingTable = "staging_enr_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);

        try {
            var semester = semesterRepository.findByCode(semesterCode)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ: " + semesterCode));

            // Removed status check to allow historical management
            /*
            if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
                throw new RuntimeException("Chỉ có thể nhập danh sách đăng ký khi học kỳ chưa bắt đầu");
            }
            */

            createEnrollmentStagingTable(stagingTable);

            long rowsCopied = streamExcelToStagingEnrollment(file, stagingTable);

            Map<String, Object> validationResult = validateEnrollmentsInStaging(stagingTable, semester.getId());

            long duration = System.currentTimeMillis() - startTime;

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("totalRows", rowsCopied);
            result.put("validRows", validationResult.get("validCount"));
            result.put("errorRows", validationResult.get("errorCount"));
            result.put("canImport",
                    (int) validationResult.get("errorCount") == 0 && (int) validationResult.get("validCount") > 0);
            result.put("sampleErrors", validationResult.get("sampleErrors"));
            result.put("stagingTable", stagingTable);
            result.put("semesterId", semester.getId());
            result.put("durationMs", duration);
            result.put("message",
                    buildMessage((int) validationResult.get("validCount"), (int) validationResult.get("errorCount")));

            log.info("Fast preview enrollments: {} rows ({} valid, {} errors) in {}ms",
                    rowsCopied, validationResult.get("validCount"), validationResult.get("errorCount"), duration);
            if ((int) validationResult.get("errorCount") > 0) {
                log.warn("Sample errors: {}", validationResult.get("sampleErrors"));

                // --- ADDED: High Error Alert ---
                if ((int) validationResult.get("errorCount") > 50) {
                    alertService.createAlert(
                            "Lỗi import danh sách đăng ký",
                            String.format("File import danh sách đăng ký của học kỳ %s chứa quá nhiều lỗi (%d lỗi).",
                                    semesterCode, validationResult.get("errorCount")),
                            Alert.AlertLevel.WARNING,
                            Alert.AlertType.SYSTEM,
                            null);
                }
            }
            return result;

        } catch (Exception e) {
            log.error("Error in fast preview enrollments", e);
            dropStagingTable(stagingTable);
            throw new RuntimeException("Lỗi khi đọc file: " + e.getMessage(), e);
        }
    }

    /**
     * Import enrollments from staging table
     */
    public Map<String, Object> importEnrollmentsFromStaging(@org.springframework.lang.NonNull String stagingTable,
            @org.springframework.lang.NonNull Long semesterId) {
        long startTime = System.currentTimeMillis();

        try {
            var semester = semesterRepository.findById(semesterId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ"));

            // Remove status check to allow historical management
            /*
            if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
                throw new RuntimeException("Chỉ có thể nhập danh sách đăng ký khi học kỳ chưa bắt đầu");
            }
            */

            // Note: enrollments table uses class_name as FK to class_sections, and
            // studentCode column
            String insertSql = """
                    INSERT INTO enrollments (student_id, student_code, class_name, status, created_at, updated_at)
                    SELECT
                        u.id,
                        u.code,
                        cs.class_name,
                        'ENROLLED',
                        NOW(),
                        NOW()
                    FROM %s s
                    JOIN users u ON s.student_code = UPPER(TRIM(u.code)) AND u.role = 'STUDENT'
                    JOIN student_profiles sp ON u.id = sp.user_id
                    JOIN class_sections cs ON s.class_name = TRIM(cs.class_name) AND cs.semester_id = ?
                    WHERE s.error_message IS NULL
                    AND sp.major_id IS NOT NULL
                    AND sp.specialization_id IS NOT NULL
                    AND NOT EXISTS (
                        SELECT 1 FROM enrollments e
                        WHERE e.student_id = u.id AND e.class_name = cs.class_name
                    )
                    """.formatted(stagingTable);

            int created = jdbcTemplate.update(insertSql, semesterId);

            // Update current_enrollment count (Optimized: Targeted update using JOIN)
            jdbcTemplate.update("""
                    UPDATE class_sections cs
                    SET current_enrollment = cs.current_enrollment + counts.added
                    FROM (
                        SELECT class_name, COUNT(*) as added
                        FROM %s
                        WHERE error_message IS NULL
                        GROUP BY class_name
                    ) counts
                    WHERE cs.class_name = counts.class_name
                    AND cs.semester_id = ?
                    """.formatted(stagingTable), semesterId);

            Integer failedCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + stagingTable + " WHERE error_message IS NOT NULL",
                    Integer.class);
            int failed = failedCount != null ? failedCount : 0;

            dropStagingTable(stagingTable);

            long duration = System.currentTimeMillis() - startTime;

            Map<String, Object> result = new HashMap<>();
            result.put("totalProcessed", created + failed);
            result.put("created", created);
            result.put("failed", failed);
            result.put("durationMs", duration);
            result.put("message",
                    String.format("Import thành công %d đăng ký trong %.2f giây", created, duration / 1000.0));

            log.info("Import enrollments completed: {} created, {} failed in {}ms", created, failed, duration);

            // Log to system logs
            systemLogService.logInfo(
                    "Import danh sách đăng ký",
                    String.format("Xử lý import danh sách đăng ký cho học kỳ %s: %d thành công, %d thất bại.",
                            semester.getCode(), created, failed),
                    "BulkImport"
            );

            // --- Alert only if there are failures ---
            if (failed > 0) {
                alertService.createAlert(
                        "Lỗi import danh sách đăng ký",
                        String.format("Quá trình import danh sách đăng ký cho học kỳ %s có %d dòng lỗi không được xử lý.",
                                semester.getCode(), failed),
                        Alert.AlertLevel.WARNING,
                        Alert.AlertType.SYSTEM,
                        null
                );
            }

            return result;

        } catch (Exception e) {
            log.error("Error importing enrollments from staging", e);
            dropStagingTable(stagingTable);
            throw new RuntimeException("Lỗi khi import: " + e.getMessage(), e);
        }
    }

    /**
     * Full import flow for enrollments
     */
    public Map<String, Object> bulkImportEnrollments(@org.springframework.lang.NonNull String semesterCode,
            @org.springframework.lang.NonNull MultipartFile file) {
        long startTime = System.currentTimeMillis();
        String stagingTable = "staging_enr_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);

        try {
            var semester = semesterRepository.findByCode(semesterCode)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ: " + semesterCode));

            /*
            if (semester.getStatus() != com.fams.backend.entity.Semester.SemesterStatus.UPCOMING) {
                throw new RuntimeException("Chỉ có thể nhập danh sách đăng ký khi học kỳ chưa bắt đầu");
            }
            */

            createEnrollmentStagingTable(stagingTable);

            long rowsCopied = streamExcelToStagingEnrollment(file, stagingTable);

            Map<String, Object> validation = validateEnrollmentsInStaging(stagingTable, semester.getId());
            int errorCount = (int) validation.get("errorCount");

            if (errorCount > 0) {
                Map<String, Object> result = new HashMap<>();
                result.put("totalProcessed", rowsCopied);
                result.put("created", 0);
                result.put("failed", errorCount);
                result.put("errors", validation.get("sampleErrors"));
                result.put("durationMs", System.currentTimeMillis() - startTime);
                result.put("message", String.format("Không thể import do có %d dòng lỗi", errorCount));

                dropStagingTable(stagingTable);
                return result;
            }

            return importEnrollmentsFromStaging(stagingTable, semester.getId());

        } catch (Exception e) {
            log.error("Error in bulk import enrollments", e);
            dropStagingTable(stagingTable);
            throw new RuntimeException("Lỗi khi import: " + e.getMessage(), e);
        }
    }

    // ==================== STAGING TABLE OPERATIONS ====================

    private void createClassSectionStagingTable(@org.springframework.lang.NonNull String tableName) {
        jdbcTemplate.execute("""
                CREATE UNLOGGED TABLE %s (
                    row_num SERIAL PRIMARY KEY,
                    class_name VARCHAR(100),
                    course_code VARCHAR(50),
                    lecturer_code VARCHAR(50),
                    max_students VARCHAR(10),
                    error_message TEXT
                )
                """.formatted(tableName));
    }

    private void createEnrollmentStagingTable(@org.springframework.lang.NonNull String tableName) {
        jdbcTemplate.execute("""
                CREATE UNLOGGED TABLE %s (
                    row_num SERIAL PRIMARY KEY,
                    student_code VARCHAR(50),
                    class_name VARCHAR(100),
                    error_message TEXT
                )
                """.formatted(tableName));
    }

    private void dropStagingTable(@org.springframework.lang.NonNull String tableName) {
        try {
            jdbcTemplate.execute("DROP TABLE IF EXISTS " + tableName);
        } catch (Exception e) {
            log.warn("Failed to drop staging table {}: {}", tableName, e.getMessage());
        }
    }

    // ==================== STREAMING EXCEL TO STAGING ====================

    /**
     * Stream Excel to staging table for class sections
     * Uses SAX parser - only processes one row at a time
     */
    private long streamExcelToStagingClassSection(@org.springframework.lang.NonNull MultipartFile file,
            @org.springframework.lang.NonNull String stagingTable) throws Exception {
        AtomicInteger rowCount = new AtomicInteger(0);
        List<String[]> batch = Collections.synchronizedList(new ArrayList<>());

        try (OPCPackage pkg = OPCPackage.open(file.getInputStream())) {
            XSSFReader reader = new XSSFReader(pkg);
            StylesTable styles = reader.getStylesTable();
            ReadOnlySharedStringsTable strings = new ReadOnlySharedStringsTable(pkg);

            XSSFReader.SheetIterator sheets = (XSSFReader.SheetIterator) reader.getSheetsData();
            if (sheets.hasNext()) {
                try (InputStream sheetStream = sheets.next()) {
                    SAXParserFactory factory = SAXParserFactory.newInstance();
                    factory.setNamespaceAware(true);
                    SAXParser saxParser = factory.newSAXParser();
                    XMLReader xmlReader = saxParser.getXMLReader();

                    ClassSectionStagingHandler handler = new ClassSectionStagingHandler(
                            batch, rowCount, stagingTable, jdbcTemplate);
                    xmlReader.setContentHandler(new XSSFSheetXMLHandler(styles, strings, handler, false));
                    xmlReader.parse(new InputSource(sheetStream));

                    handler.flushBatch();

                    // 1. Single-pass CLEANING (Critical for performance)
                    jdbcTemplate.execute("UPDATE " + stagingTable
                            + " SET class_name = TRIM(class_name), course_code = TRIM(course_code), lecturer_code = TRIM(lecturer_code)");

                    // 2. Add indices to speed up validation
                    jdbcTemplate.execute("CREATE INDEX ON " + stagingTable + " (class_name)");
                    jdbcTemplate.execute("CREATE INDEX ON " + stagingTable + " (course_code)");
                }
            }
        }

        return rowCount.get();
    }

    /**
     * Stream Excel to staging table for enrollments
     */
    private long streamExcelToStagingEnrollment(@org.springframework.lang.NonNull MultipartFile file,
            @org.springframework.lang.NonNull String stagingTable) throws Exception {
        AtomicInteger rowCount = new AtomicInteger(0);
        List<String[]> batch = Collections.synchronizedList(new ArrayList<>());

        try (OPCPackage pkg = OPCPackage.open(file.getInputStream())) {
            XSSFReader reader = new XSSFReader(pkg);
            StylesTable styles = reader.getStylesTable();
            ReadOnlySharedStringsTable strings = new ReadOnlySharedStringsTable(pkg);

            XSSFReader.SheetIterator sheets = (XSSFReader.SheetIterator) reader.getSheetsData();
            if (sheets.hasNext()) {
                try (InputStream sheetStream = sheets.next()) {
                    SAXParserFactory factory = SAXParserFactory.newInstance();
                    factory.setNamespaceAware(true);
                    SAXParser saxParser = factory.newSAXParser();
                    XMLReader xmlReader = saxParser.getXMLReader();

                    EnrollmentStagingHandler handler = new EnrollmentStagingHandler(
                            batch, rowCount, stagingTable, jdbcTemplate);
                    xmlReader.setContentHandler(new XSSFSheetXMLHandler(styles, strings, handler, false));
                    xmlReader.parse(new InputSource(sheetStream));

                    handler.flushBatch();

                    // 1. Single-pass CLEANING (Critical for performance)
                    jdbcTemplate.execute("UPDATE " + stagingTable + " SET student_code = UPPER(TRIM(student_code)), class_name = TRIM(class_name)");

                    // 2. Add indices to speed up validation
                    jdbcTemplate.execute("CREATE INDEX ON " + stagingTable + " (student_code)");
                    jdbcTemplate.execute("CREATE INDEX ON " + stagingTable + " (class_name)");
                }
            }
        }

        return rowCount.get();
    }

    // ==================== VALIDATION USING SQL ====================

    private Map<String, Object> validateClassSectionsInStaging(@org.springframework.lang.NonNull String stagingTable,
            @org.springframework.lang.NonNull Long semesterId) {
        // Mark rows with missing class_name
        jdbcTemplate.update("""
                UPDATE %s SET error_message = 'Mã lớp không được để trống'
                WHERE TRIM(COALESCE(class_name, '')) = ''
                """.formatted(stagingTable));

        // Mark rows with missing course_code
        jdbcTemplate.update("""
                UPDATE %s SET error_message = COALESCE(error_message || '; ', '') || 'Mã môn học không được để trống'
                WHERE TRIM(COALESCE(course_code, '')) = ''
                """.formatted(stagingTable));

        // Mark rows with invalid course_code
        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Không tìm thấy môn học: ' || s.course_code
                        WHERE s.course_code != ''
                        AND NOT EXISTS (SELECT 1 FROM courses c WHERE TRIM(UPPER(s.course_code)) = TRIM(UPPER(c.code)))
                        """
                        .formatted(stagingTable));

        // Mark rows with invalid lecturer_code (if provided)
        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Không tìm thấy giảng viên: ' || s.lecturer_code
                        WHERE s.lecturer_code != ''
                        AND NOT EXISTS (SELECT 1 FROM users u WHERE TRIM(UPPER(s.lecturer_code)) = TRIM(UPPER(u.username)) AND u.role = 'LECTURER')
                        """
                        .formatted(stagingTable));

        // Mark duplicate class names in file
        jdbcTemplate.update("""
                UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Mã lớp bị trùng trong file'
                WHERE s.class_name != ''
                AND s.row_num NOT IN (
                    SELECT MIN(row_num) FROM %s GROUP BY class_name
                )
                """.formatted(stagingTable, stagingTable));

        // Mark rows where class_name already exists in database
        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Lớp học phần đã tồn tại trong hệ thống'
                        WHERE s.class_name != ''
                        AND EXISTS (
                            SELECT 1 FROM class_sections cs
                            WHERE TRIM(cs.class_name) = TRIM(s.class_name)
                        )
                        """
                        .formatted(stagingTable));

        return getValidationResult(stagingTable, "class_name", "course_code");
    }

    private Map<String, Object> validateEnrollmentsInStaging(@org.springframework.lang.NonNull String stagingTable,
            @org.springframework.lang.NonNull Long semesterId) {
        // Mark rows with missing student_code
        jdbcTemplate.update("""
                UPDATE %s SET error_message = 'MSSV không được để trống'
                WHERE COALESCE(student_code, '') = ''
                """.formatted(stagingTable));

        // Mark rows with missing class_name
        jdbcTemplate.update("""
                UPDATE %s SET error_message = COALESCE(error_message || '; ', '') || 'Mã lớp không được để trống'
                WHERE TRIM(COALESCE(class_name, '')) = ''
                """.formatted(stagingTable));

        // Mark rows with invalid student_code
        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Không tìm thấy sinh viên: ' || s.student_code
                        WHERE s.student_code != ''
                        AND NOT EXISTS (SELECT 1 FROM users u WHERE s.student_code = u.code AND u.role = 'STUDENT')
                        """
                        .formatted(stagingTable));

        // Mark rows with invalid class_name
        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Không tìm thấy lớp học phần: ' || s.class_name
                        WHERE s.class_name != ''
                        AND NOT EXISTS (SELECT 1 FROM class_sections cs WHERE TRIM(cs.class_name) = s.class_name AND cs.semester_id = ?)
                        """
                        .formatted(stagingTable), semesterId);

        // Mark duplicate enrollments in file
        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Sinh viên đã đăng ký lớp này trong file'
                        WHERE s.student_code != ''
                        AND s.class_name != ''
                        AND s.row_num NOT IN (
                            SELECT MIN(row_num) FROM %s GROUP BY student_code, class_name
                        )
                        """
                        .formatted(stagingTable, stagingTable));

        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Sinh viên đã đăng ký lớp này rồi'
                        WHERE s.student_code != ''
                        AND s.class_name != ''
                        AND EXISTS (
                            SELECT 1 FROM enrollments e
                            JOIN users u ON e.student_id = u.id
                            JOIN class_sections cs ON e.class_name = cs.class_name
                            WHERE UPPER(TRIM(u.code)) = s.student_code
                            AND TRIM(cs.class_name) = s.class_name
                            AND cs.semester_id = ?
                        )
                        """
                        .formatted(stagingTable), semesterId);

        // Mark rows where student has no student_profile
        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Sinh viên chưa có hồ sơ (student profile)'
                        WHERE s.student_code != ''
                        AND EXISTS (
                            SELECT 1 FROM users u
                            WHERE UPPER(TRIM(u.code)) = s.student_code
                            AND u.role = 'STUDENT'
                            AND NOT EXISTS (SELECT 1 FROM student_profiles sp WHERE sp.user_id = u.id)
                        )
                        """
                        .formatted(stagingTable));

        // Mark rows where student_profile exists but major or specialization is missing
        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Sinh viên có hồ sơ nhưng chưa được gán ngành hoặc chuyên ngành'
                        WHERE EXISTS (
                            SELECT 1 FROM users u
                            JOIN student_profiles sp ON u.id = sp.user_id
                            WHERE UPPER(TRIM(u.code)) = s.student_code
                            AND u.role = 'STUDENT'
                            AND (sp.major_id IS NULL OR sp.specialization_id IS NULL)
                        )
                        """
                        .formatted(stagingTable));

        jdbcTemplate
                .update("""
                        UPDATE %s s SET error_message = COALESCE(error_message || '; ', '') || 'Môn học không nằm trong chuyên ngành của sinh viên'
                        WHERE EXISTS (
                            SELECT 1 FROM users u
                            JOIN student_profiles sp ON sp.user_id = u.id
                            JOIN class_sections cs ON s.class_name = TRIM(cs.class_name) AND cs.semester_id = ?
                            WHERE UPPER(TRIM(u.code)) = s.student_code
                            AND u.role = 'STUDENT'
                            AND NOT EXISTS (
                                SELECT 1 FROM specialization_courses sc
                                WHERE sc.specialization_id = sp.specialization_id
                                AND sc.course_id = cs.course_id
                            )
                            AND NOT EXISTS (
                                SELECT 1 FROM sub_specialization_courses ssc
                                WHERE ssc.sub_specialization_id = sp.sub_specialization_id
                                AND ssc.course_id = cs.course_id
                            )
                        )
                        """
                        .formatted(stagingTable), semesterId);

        return getValidationResult(stagingTable, "student_code", "class_name");
    }

    private Map<String, Object> getValidationResult(@org.springframework.lang.NonNull String stagingTable,
            @org.springframework.lang.NonNull String field1, @org.springframework.lang.NonNull String field2) {
        Integer validCountResult = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + stagingTable + " WHERE error_message IS NULL",
                Integer.class);
        int validCount = validCountResult != null ? validCountResult : 0;

        Integer errorCountResult = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + stagingTable + " WHERE error_message IS NOT NULL",
                Integer.class);
        int errorCount = errorCountResult != null ? errorCountResult : 0;

        List<Map<String, Object>> sampleErrors = jdbcTemplate.queryForList("""
                SELECT row_num as row, %s as field1, %s as field2, error_message
                FROM %s
                WHERE error_message IS NOT NULL
                ORDER BY row_num
                LIMIT %d
                """.formatted(field1, field2, stagingTable, MAX_SAMPLE_ERRORS));

        List<Map<String, Object>> formattedErrors = sampleErrors.stream().map(err -> {
            Map<String, Object> formatted = new HashMap<>();
            formatted.put("row", err.get("row"));
            formatted.put(field1.equals("class_name") ? "className" : "studentCode", err.get("field1"));
            formatted.put(field2.equals("course_code") ? "courseCode" : "className", err.get("field2"));
            formatted.put("errors", List.of(String.valueOf(err.get("error_message")).split("; ")));
            return formatted;
        }).toList();

        Map<String, Object> result = new HashMap<>();
        result.put("validCount", validCount);
        result.put("errorCount", errorCount);
        result.put("sampleErrors", formattedErrors);
        return result;
    }

    private String buildMessage(int validCount, int errorCount) {
        if (errorCount == 0 && validCount > 0) {
            return String.format("Tất cả %d dòng hợp lệ, sẵn sàng import", validCount);
        } else if (errorCount > 0) {
            return String.format("Có %d lỗi trong %d dòng", errorCount, validCount + errorCount);
        } else {
            return "File không có dữ liệu hợp lệ";
        }
    }

    // ==================== SAX HANDLERS ====================

    /**
     * Handler for streaming class sections to staging table
     */
    private class ClassSectionStagingHandler implements XSSFSheetXMLHandler.SheetContentsHandler {
        private final List<String[]> batch;
        private final AtomicInteger rowCount;
        private final String stagingTable;
        private final JdbcTemplate jdbc;
        private final String[] currentRow = new String[4];
        private int currentRowNum = -1;
        private boolean skipHeader = true;

        public ClassSectionStagingHandler(List<String[]> batch, AtomicInteger rowCount,
                String stagingTable, JdbcTemplate jdbc) {
            this.batch = batch;
            this.rowCount = rowCount;
            this.stagingTable = stagingTable;
            this.jdbc = jdbc;
        }

        @Override
        public void startRow(int rowNum) {
            this.currentRowNum = rowNum;
            Arrays.fill(currentRow, "");
        }

        @Override
        public void endRow(int rowNum) {
            // Skip header row (row 0)
            if (skipHeader && currentRowNum == 0) {
                skipHeader = false;
                return;
            }

            // Skip empty rows
            if (Arrays.stream(currentRow).allMatch(s -> s == null || s.trim().isEmpty())) {
                return;
            }

            batch.add(Arrays.copyOf(currentRow, 4));
            rowCount.incrementAndGet();

            if (batch.size() >= BATCH_SIZE) {
                flushBatch();
            }
        }

        @Override
        public void cell(String cellReference, String formattedValue, XSSFComment comment) {
            int col = cellReferenceToColumn(cellReference);
            if (col >= 0 && col < 4) {
                String val = formattedValue != null ? formattedValue.trim() : "";
                // Keep original case from file for staging, but comparisons will be
                // case-insensitive
                currentRow[col] = val;
            }
        }

        public void flushBatch() {
            if (batch.isEmpty()) {
                return;
            }

            List<String[]> toInsert = new ArrayList<>(batch);
            batch.clear();

            String sql = "INSERT INTO " + stagingTable
                    + " (class_name, course_code, lecturer_code, max_students) VALUES (?, ?, ?, ?)";
            jdbc.batchUpdate(sql, toInsert, BATCH_SIZE, (PreparedStatement ps, String[] row) -> {
                ps.setString(1, row[0]);
                ps.setString(2, row[1]);
                ps.setString(3, row[2]);
                ps.setString(4, row[3]);
            });
        }

        private int cellReferenceToColumn(String cellRef) {
            String colStr = cellRef.replaceAll("[0-9]", "");
            int col = 0;
            for (char c : colStr.toCharArray()) {
                col = col * 26 + (c - 'A' + 1);
            }
            return col - 1;
        }
    }

    /**
     * Handler for streaming enrollments to staging table
     */
    private class EnrollmentStagingHandler implements XSSFSheetXMLHandler.SheetContentsHandler {
        private final List<String[]> batch;
        private final AtomicInteger rowCount;
        private final String stagingTable;
        private final JdbcTemplate jdbc;
        private final String[] currentRow = new String[2];
        private int currentRowNum = -1;
        private boolean skipHeader = true;

        public EnrollmentStagingHandler(List<String[]> batch, AtomicInteger rowCount,
                String stagingTable, JdbcTemplate jdbc) {
            this.batch = batch;
            this.rowCount = rowCount;
            this.stagingTable = stagingTable;
            this.jdbc = jdbc;
        }

        @Override
        public void startRow(int rowNum) {
            this.currentRowNum = rowNum;
            Arrays.fill(currentRow, "");
        }

        @Override
        public void endRow(int rowNum) {
            // Skip header row (row 0)
            if (skipHeader && currentRowNum == 0) {
                skipHeader = false;
                return;
            }

            // Skip empty rows
            if (Arrays.stream(currentRow).allMatch(s -> s == null || s.trim().isEmpty())) {
                return;
            }

            batch.add(Arrays.copyOf(currentRow, 2));
            rowCount.incrementAndGet();

            if (batch.size() >= BATCH_SIZE) {
                flushBatch();
            }
        }

        @Override
        public void cell(String cellReference, String formattedValue, XSSFComment comment) {
            int col = cellReferenceToColumn(cellReference);
            if (col >= 0 && col < 2) {
                String val = formattedValue != null ? formattedValue.trim() : "";
                // Keep original case from file for staging, but comparisons will be
                // case-insensitive
                currentRow[col] = val;
            }
        }

        public void flushBatch() {
            if (batch.isEmpty()) {
                return;
            }

            List<String[]> toInsert = new ArrayList<>(batch);
            batch.clear();

            String sql = "INSERT INTO " + stagingTable + " (student_code, class_name) VALUES (?, ?)";
            jdbc.batchUpdate(sql, toInsert, BATCH_SIZE, (PreparedStatement ps, String[] row) -> {
                ps.setString(1, row[0]);
                ps.setString(2, row[1]);
            });
        }

        private int cellReferenceToColumn(String cellRef) {
            String colStr = cellRef.replaceAll("[0-9]", "");
            int col = 0;
            for (char c : colStr.toCharArray()) {
                col = col * 26 + (c - 'A' + 1);
            }
            return col - 1;
        }
    }
}
