package com.fams.backend.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;

public class SampleDataGeneratorTest {

    @Test
    public void generateSampleZip() throws IOException {
        // 1. Create Excel
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Users");

        // Header
        Row headerRow = sheet.createRow(0);
        String[] columns = { "Họ và tên", "Mã số", "Vai trò", "Ngày sinh", "Email", "Số điện thoại" };
        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
        }

        // Data
        Object[][] data = {
                { "Nguyễn Văn A", "SE123456", "STUDENT", "01/01/2000", "nva@test.com", "0901234567" },
                { "Trần Thị B", "SS123456", "ACADEMIC_STAFF", "15/05/1995", "ttb@test.com", "0909876543" },
                { "Lê Văn C", "GV123456", "LECTURER", "20/11/1980", "lvc@test.com", "0912345678" }
        };

        int rowNum = 1;
        for (Object[] rowData : data) {
            Row row = sheet.createRow(rowNum++);
            for (int i = 0; i < rowData.length; i++) {
                row.createCell(i).setCellValue((String) rowData[i]);
            }
        }

        // Write Excel to temp file
        File excelFile = File.createTempFile("users", ".xlsx");
        try (FileOutputStream fos = new FileOutputStream(excelFile)) {
            workbook.write(fos);
        }
        workbook.close();

        // 2. Create Dummy Image
        File imageFile = File.createTempFile("SE123456", ".jpg");
        BufferedImage image = new BufferedImage(200, 200, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.ORANGE);
        g.fillRect(0, 0, 200, 200);
        g.setColor(Color.WHITE);
        g.drawString("SE123456", 50, 100);
        g.dispose();
        ImageIO.write(image, "jpg", imageFile);

        // 3. Zip them
        File zipFile = new File("sample_import.zip"); // Create in project root
        try (FileOutputStream fos = new FileOutputStream(zipFile);
                ZipOutputStream zos = new ZipOutputStream(fos)) {

            // Add Excel
            addToZip(excelFile, "users.xlsx", zos);

            // Add Image (renamed to match code)
            addToZip(imageFile, "SE123456.jpg", zos);
        }

        System.out.println("Sample ZIP created at: " + zipFile.getAbsolutePath());

        // Cleanup temp files
        excelFile.delete();
        imageFile.delete();
    }

    private void addToZip(File file, String fileName, ZipOutputStream zos) throws IOException {
        try (java.io.FileInputStream fis = new java.io.FileInputStream(file)) {
            ZipEntry zipEntry = new ZipEntry(fileName);
            zos.putNextEntry(zipEntry);

            byte[] bytes = new byte[1024];
            int length;
            while ((length = fis.read(bytes)) >= 0) {
                zos.write(bytes, 0, length);
            }
            zos.closeEntry();
        }
    }
}
