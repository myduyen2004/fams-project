import 'dart:io';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/foundation.dart';
import 'package:excel/excel.dart';
import 'package:archive/archive.dart';
import 'package:pdfx/pdfx.dart';
import '../../../core/services/api_service.dart';
import '../../../core/constants/api_constants.dart';

/// Enum representing supported file types for preview
enum FileType { excel, csv, zip, code, pdf, word, powerpoint, image, unknown }

/// Data class for ZIP file entries
class ZipFileEntry {
  final String name;
  final int size;
  final bool isFile;

  ZipFileEntry({required this.name, required this.size, required this.isFile});

  String get formattedSize {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

/// Central service for Deep-Content Vision file preview system.
/// Handles file type detection, download, and content extraction.
class FilePreviewService {

  // ─── File Type Detection ────────────────────────────────────────────

  static FileType getFileType(String fileName) {
    final ext = _getExtension(fileName);
    switch (ext) {
      case 'xlsx':
      case 'xls':
        return FileType.excel;
      case 'csv':
        return FileType.csv;
      case 'zip':
      case 'rar':
      case '7z':
        return FileType.zip;
      case 'js':
      case 'py':
      case 'html':
      case 'css':
      case 'dart':
      case 'java':
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'c':
      case 'cpp':
      case 'h':
      case 'sql':
      case 'sh':
      case 'bat':
      case 'md':
      case 'txt':
        return FileType.code;
      case 'pdf':
        return FileType.pdf;
      case 'doc':
      case 'docx':
        return FileType.word;
      case 'ppt':
      case 'pptx':
        return FileType.powerpoint;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'bmp':
      case 'svg':
        return FileType.image;
      default:
        return FileType.unknown;
    }
  }

  static String _getExtension(String fileName) {
    if (!fileName.contains('.')) return '';
    return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
  }

  // ─── Download ───────────────────────────────────────────────────────

  /// Downloads a file to temp directory and returns the File.
  /// Uses caching: if already downloaded, returns cached file.
  static Future<File?> downloadToTemp(String url, String fileName) async {
    try {
      final dir = await getTemporaryDirectory();
      final safeFileName = fileName.replaceAll(RegExp(r'[^\w\s\.-]'), '_');
      final filePath = '${dir.path}/preview_$safeFileName';
      final file = File(filePath);

      // Use cache if exists and is recent (< 5 min)
      if (await file.exists()) {
        final lastModified = await file.lastModified();
        if (DateTime.now().difference(lastModified).inMinutes < 5) {
          return file;
        }
      }

      // Ensure absolute URL
      String downloadUrl = url;
      if (!url.startsWith('http')) {
        downloadUrl = '${ApiConstants.baseUrl}$url';
      }
      
      await ApiService().download(
        downloadUrl, 
        filePath,
        options: Options(
          extra: {'ignoreUnauthorized': true},
        ),
      );
      return File(filePath);
    } catch (e) {
      rethrow;
    }
  }

  // ─── Excel Extraction ───────────────────────────────────────────────

  /// Reads an Excel file and returns the first sheet's data as a grid.
  /// Returns up to [maxRows] rows.
  static Future<List<List<String>>?> extractExcelData(
    File file, {
    int maxRows = 10,
  }) async {
    try {
      final bytes = await file.readAsBytes();
      final excel = Excel.decodeBytes(bytes);

      if (excel.tables.isEmpty) return null;

      // Get first sheet
      final sheetName = excel.tables.keys.first;
      final sheet = excel.tables[sheetName];
      if (sheet == null || sheet.rows.isEmpty) return null;

      final List<List<String>> result = [];
      final rowCount = sheet.rows.length > maxRows ? maxRows : sheet.rows.length;

      for (int i = 0; i < rowCount; i++) {
        final row = sheet.rows[i];
        result.add(
          row.map((cell) => cell?.value?.toString() ?? '').toList(),
        );
      }

      return result.isEmpty ? null : result;
    } catch (e) {
      print('FilePreviewService: Excel parse error: $e');
      return null;
    }
  }

  /// Returns the name of the first sheet in the Excel file.
  static Future<String?> getExcelSheetName(File file) async {
    try {
      final bytes = await file.readAsBytes();
      final excel = Excel.decodeBytes(bytes);
      return excel.tables.keys.isNotEmpty ? excel.tables.keys.first : null;
    } catch (e) {
      return null;
    }
  }

  // ─── ZIP Extraction ─────────────────────────────────────────────────

  /// Reads a ZIP file and returns its contents list.
  static Future<List<ZipFileEntry>?> extractZipContents(
    File file, {
    int maxEntries = 5,
  }) async {
    try {
      final bytes = await file.readAsBytes();
      final archive = ZipDecoder().decodeBytes(bytes);

      final entries = archive
          .where((f) => !f.name.startsWith('__MACOSX') && !f.name.startsWith('.'))
          .take(maxEntries)
          .map((f) => ZipFileEntry(
                name: f.name,
                size: f.size,
                isFile: f.isFile,
              ))
          .toList();

      return entries.isEmpty ? null : entries;
    } catch (e) {
      print('FilePreviewService: ZIP parse error: $e');
      return null;
    }
  }

  /// Scans a ZIP for an image file and extracts its bytes.
  /// Priority: .jpg, .png, .jpeg
  static Future<Uint8List?> extractZipImage(File file) async {
    try {
      final bytes = await file.readAsBytes();
      final archive = ZipDecoder().decodeBytes(bytes);

      final imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      final imageFile = archive.firstWhere(
        (f) =>
            f.isFile &&
            imageExtensions.any((ext) => f.name.toLowerCase().endsWith(ext)),
        orElse: () => ArchiveFile('', 0, []),
      );

      if (imageFile.name.isNotEmpty && imageFile.size > 0) {
        return Uint8List.fromList(imageFile.content as List<int>);
      }
      return null;
    } catch (e) {
      print('FilePreviewService: ZIP image extract error: $e');
      return null;
    }
  }

  /// Scans a ZIP for a text file (README, notes, etc.) and extracts its content.
  static Future<String?> extractZipTextFile(File file) async {
    try {
      final bytes = await file.readAsBytes();
      final archive = ZipDecoder().decodeBytes(bytes);

      final textFiles = ['readme.md', 'readme.txt', 'index.html', 'note.txt', 'notes.txt'];
      final textFile = archive.firstWhere(
        (f) => f.isFile && textFiles.contains(f.name.toLowerCase()),
        orElse: () => ArchiveFile('', 0, []),
      );

      if (textFile.name.isNotEmpty && textFile.size > 0) {
        final content = String.fromCharCodes(textFile.content as List<int>);
        // Return first 10 lines
        final lines = content.split('\n');
        return lines.take(10).join('\n');
      }
      return null;
    } catch (e) {
      print('FilePreviewService: ZIP text extract error: $e');
      return null;
    }
  }

  // ─── Code / Text Extraction ─────────────────────────────────────────

  /// Reads a text/code file and returns its first [maxLines] lines.
  static Future<String?> extractTextContent(
    File file, {
    int maxLines = 20,
  }) async {
    try {
      final content = await file.readAsString();
      final lines = content.split('\n');
      return lines.take(maxLines).join('\n');
    } catch (e) {
      print('FilePreviewService: Text read error: $e');
      return null;
    }
  }

  // ─── CSV Extraction ─────────────────────────────────────────────────

  /// Parses a CSV file into grid data.
  static Future<List<List<String>>?> extractCsvData(
    File file, {
    int maxRows = 10,
  }) async {
    try {
      final content = await file.readAsString();
      final lines = content.split('\n').where((l) => l.trim().isNotEmpty).toList();
      final rowCount = lines.length > maxRows ? maxRows : lines.length;

      final List<List<String>> result = [];
      for (int i = 0; i < rowCount; i++) {
        // Simple CSV split (handles basic cases)
        result.add(lines[i].split(',').map((c) => c.trim()).toList());
      }

      return result.isEmpty ? null : result;
    } catch (e) {
      print('FilePreviewService: CSV parse error: $e');
      return null;
    }
  }

  // ─── PDF Extraction ─────────────────────────────────────────────────

  /// Renders the first page of a PDF file as an image.
  static Future<Uint8List?> renderPdfThumbnail(File file) async {
    try {
      final document = await PdfDocument.openFile(file.path);
      final page = await document.getPage(1); // Page 1
      final pageImage = await page.render(
        width: page.width * 2, // Double width for better quality
        height: page.height * 2,
        format: PdfPageImageFormat.jpeg,
        quality: 80,
      );
      await page.close();
      await document.close();
      return pageImage?.bytes;
    } catch (e) {
      print('FilePreviewService: PDF render error: $e');
      return null;
    }
  }
}
