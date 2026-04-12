import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import '../../../core/constants/app_colors.dart';
import '../models/schedule_model.dart';
import '../models/assignment_submission_model.dart';
import '../services/file_preview_service.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class AssignmentDetailScreen extends StatefulWidget {
  final TimetableSlot slot;
  final AssignmentSubmissionResponse? submission;
  final bool isLecturer;

  const AssignmentDetailScreen({
    Key? key,
    required this.slot,
    this.submission,
    required this.isLecturer,
  }) : super(key: key);

  @override
  State<AssignmentDetailScreen> createState() => _AssignmentDetailScreenState();
}

class _AssignmentDetailScreenState extends State<AssignmentDetailScreen> {
  // Deep-Content Vision state
  bool _isLoadingPreview = true;
  FileType _fileType = FileType.unknown;
  List<List<String>>? _gridData;
  String? _textContent;
  List<ZipFileEntry>? _zipEntries;
  Uint8List? _zipImageBytes;
  Uint8List? _pdfThumbnailBytes;
  String? _sheetName;
  String? _previewErrorMsg;

  @override
  void initState() {
    super.initState();
    _loadPreviewData();
  }

  Future<void> _loadPreviewData() async {
    final fileName = widget.slot.assignmentReferenceName;
    final url = widget.slot.assignmentReferenceUrl;

    if (fileName == null || url == null || url.isEmpty) {
      setState(() => _isLoadingPreview = false);
      return;
    }

    _fileType = FilePreviewService.getFileType(fileName);

    File? file;
    try {
      file = await FilePreviewService.downloadToTemp(url, fileName);
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 401) {
        if (url.contains('cloudinary.com')) {
          _previewErrorMsg = 'Cloudinary PDF/ZIP delivery is restricted. Enable it in Security settings.';
        } else {
          _previewErrorMsg = 'Unauthorized access to file.';
        }
      } else {
        _previewErrorMsg = 'Failed to load preview.';
      }
      setState(() => _isLoadingPreview = false);
      return;
    }

    if (file == null) {
      setState(() => _isLoadingPreview = false);
      return;
    }

    switch (_fileType) {
      case FileType.excel:
        _gridData = await FilePreviewService.extractExcelData(file);
        _sheetName = await FilePreviewService.getExcelSheetName(file);
        break;
      case FileType.csv:
        _gridData = await FilePreviewService.extractCsvData(file);
        _sheetName = 'CSV Data';
        break;
      case FileType.zip:
        // Priority 1: Image inside ZIP
        _zipImageBytes = await FilePreviewService.extractZipImage(file);
        if (_zipImageBytes == null) {
          // Priority 2: Text file inside ZIP
          _textContent = await FilePreviewService.extractZipTextFile(file);
          if (_textContent == null) {
            // Priority 3: File listing
            _zipEntries = await FilePreviewService.extractZipContents(file);
          }
        }
        break;
      case FileType.code:
        _textContent = await FilePreviewService.extractTextContent(file);
        break;
      case FileType.pdf:
        _pdfThumbnailBytes = await FilePreviewService.renderPdfThumbnail(file);
        break;
      default:
        break;
    }

    if (mounted) {
      setState(() => _isLoadingPreview = false);
    }
  }

  // Helper to access widget fields cleanly
  TimetableSlot get slot => widget.slot;
  AssignmentSubmissionResponse? get submission => widget.submission;
  bool get isLecturer => widget.isLecturer;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(20.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildAssignmentInfo(),
            if (slot.assignmentReferenceUrl != null && slot.assignmentReferenceUrl!.isNotEmpty) ...[
              24.verticalSpace,
              _buildReferenceSection(),
            ],
            if (!isLecturer && slot.assignmentId != null) ...[
              24.verticalSpace,
              _buildSubmissionSection(),
            ],
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
      title: Text(
        'Chi tiết bài tập',
        style: GoogleFonts.plusJakartaSans(
          color: Theme.of(context).colorScheme.onSurface,
          fontSize: 18.sp,
          fontWeight: FontWeight.bold,
        ),
      ),
      leading: IconButton(
        icon: Icon(Icons.arrow_back_rounded, color: Theme.of(context).colorScheme.onSurface, size: 24.r),
        onPressed: () => Get.back(),
      ),
    );
  }

  Widget _buildSectionHeader(String title, {Widget? trailing}) {
    return Padding(
      padding: EdgeInsets.only(bottom: 12.h),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title.toUpperCase(),
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13.sp,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF64748B),
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  Widget _buildAssignmentInfo() {
    bool hasAttachment = slot.assignmentReferenceUrl != null && slot.assignmentReferenceUrl!.isNotEmpty;
    String imageUrl = hasAttachment ? slot.assignmentReferenceUrl! : '';
    bool isImageUrl = imageUrl.toLowerCase().endsWith('.png') || 
                      imageUrl.toLowerCase().endsWith('.jpg') || 
                      imageUrl.toLowerCase().endsWith('.jpeg');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(
          isLecturer ? 'BÀI TẬP ĐÃ GIAO' : 'BÀI TẬP ĐƯỢC GIAO',
          trailing: Container(
            padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
            decoration: BoxDecoration(
              color: const Color(0xFFFFEDD5),
              borderRadius: BorderRadius.circular(16.r),
            ),
            child: Text(
              'Đang diễn ra',
              style: GoogleFonts.plusJakartaSans(
                color: const Color(0xFFEA580C),
                fontSize: 12.sp,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(16.r),
            border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? Colors.transparent : const Color(0xFFE2E8F0)),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image Preview
              InkWell(
                onTap: () {
                  if (hasAttachment) {
                    _downloadAndOpenFile(imageUrl, slot.assignmentReferenceName ?? 'attachment');
                  } else {
                    Get.snackbar('Thông báo', 'Không có tệp đính kèm để xem trước.');
                  }
                },
                child: Container(
                  width: double.infinity,
                  clipBehavior: Clip.antiAlias,
                  decoration: const BoxDecoration(),
                  child: isImageUrl 
                    ? Image.network(
                        imageUrl, 
                        fit: BoxFit.cover, 
                        errorBuilder: (c,e,s) => _buildSmartPreview(hasAttachment ? slot.assignmentReferenceName : null)
                      )
                    : _buildSmartPreview(hasAttachment ? slot.assignmentReferenceName : null),
                ),
              ),
              Padding(
                padding: EdgeInsets.all(16.w),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      slot.assignmentTitle ?? 'Bài tập tuần',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    if (slot.assignmentDescription != null && slot.assignmentDescription!.isNotEmpty) ...[
                      8.verticalSpace,
                      Text(
                        slot.assignmentDescription!,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14.sp,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                    12.verticalSpace,
                    Row(
                      children: [
                        Icon(Icons.calendar_today_outlined, size: 16.r, color: const Color(0xFF64748B)),
                        6.horizontalSpace,
                        Text(
                          'Hạn nộp: ${DateFormat('dd/MM/yyyy').format(slot.assignmentDueDate ?? slot.date)}',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13.sp,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }



  // ─────────────────────────────────────────────────────────────────
  // Deep-Content Vision: Smart Preview System
  // ─────────────────────────────────────────────────────────────────

  /// Main router: decides which preview to render based on file type & loaded data
  Widget _buildSmartPreview(String? fileName) {
    if (fileName == null) return const SizedBox.shrink();

    // Loading state → skeleton
    if (_isLoadingPreview) return _buildLoadingPreview();

    // Route by file type and available data
    switch (_fileType) {
      case FileType.excel:
      case FileType.csv:
        if (_gridData != null) return _buildExcelPreview(_gridData!, _sheetName ?? 'Sheet1');
        break;
      case FileType.zip:
        if (_zipImageBytes != null) return _buildZipImagePreview(_zipImageBytes!);
        if (_textContent != null) return _buildZipTextPreview(_textContent!);
        if (_zipEntries != null) return _buildZipFileListPreview(_zipEntries!);
        break;
      case FileType.code:
        if (_textContent != null) return _buildCodePreview(_textContent!, fileName);
        break;
      case FileType.pdf:
        if (_pdfThumbnailBytes != null) return _buildPdfPreview(_pdfThumbnailBytes!);
        break;
      case FileType.image:
      default:
        break;
    }

    // Fallback for PDF, Word, PPT, or failed extraction
    return _buildGenericPreview(_fileType, fileName);
  }

  /// Skeleton loading animation — compact
  Widget _buildLoadingPreview() {
    return Container(
      width: double.infinity,
      height: 120.h,
      color: const Color(0xFFF8FAFC),
      child: Center(
        child: SizedBox(
          width: 20.r, height: 20.r,
          child: const CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF94A3B8)),
          ),
        ),
      ),
    );
  }

  /// Excel/CSV grid preview with real data + gradient fade
  Widget _buildExcelPreview(List<List<String>> data, String sheetName) {
    // Determine dynamic column widths
    final colCount = data.isNotEmpty ? data[0].length : 0;
    final Map<int, TableColumnWidth> columnWidths = {};
    for (int i = 0; i < colCount; i++) {
      if (i == 0) {
        columnWidths[i] = FixedColumnWidth(36.w);
      } else {
        columnWidths[i] = const FlexColumnWidth();
      }
    }

    return ClipRRect(
      child: Stack(
        children: [
          Container(
            width: double.infinity,
            color: Colors.white,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Sheet tab
                Container(
                  height: 22.h,
                  color: const Color(0xFFF1F5F9),
                  padding: EdgeInsets.symmetric(horizontal: 8.w),
                  child: Row(
                    children: [
                      Icon(Icons.grid_on_rounded, size: 11.r, color: const Color(0xFF10B981)),
                      6.horizontalSpace,
                      Text(
                        sheetName,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 9.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ),
                // Data grid — full bleed, compact & bold
                Table(
                  border: TableBorder.all(color: const Color(0xFFCBD5E1), width: 0.8),
                  columnWidths: columnWidths,
                  children: data.asMap().entries.map((entry) {
                    final int index = entry.key;
                    final List<String> row = entry.value;
                    final bool isHeader = index == 0;

                    return TableRow(
                      decoration: BoxDecoration(
                        color: isHeader
                            ? const Color(0xFFDCFCE7)
                            : (index.isEven ? const Color(0xFFF8FAFC) : Colors.white),
                      ),
                      children: row.map((cell) => Container(
                        padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 4.h),
                        child: Text(
                          cell,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10.sp,
                            fontWeight: isHeader ? FontWeight.w800 : FontWeight.w500,
                            color: isHeader ? const Color(0xFF166534) : const Color(0xFF334155),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      )).toList(),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          // Gradient fade at bottom 20%
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 40.h,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x00FFFFFF),
                    Color(0xCCFFFFFF),
                    Color(0xFFFFFFFF),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Code/text file preview with monospace font
  Widget _buildCodePreview(String content, String fileName) {
    final ext = fileName.split('.').last.toLowerCase();
    final langLabels = {
      'py': 'Python', 'js': 'JavaScript', 'dart': 'Dart', 'java': 'Java',
      'html': 'HTML', 'css': 'CSS', 'json': 'JSON', 'xml': 'XML',
      'sql': 'SQL', 'md': 'Markdown', 'txt': 'Text', 'yaml': 'YAML',
    };
    final langLabel = langLabels[ext] ?? ext.toUpperCase();

    return ClipRRect(
      child: Stack(
        children: [
          Container(
            width: double.infinity,
            color: const Color(0xFF1E293B),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Language tab
                Container(
                  height: 22.h,
                  color: const Color(0xFF334155),
                  padding: EdgeInsets.symmetric(horizontal: 10.w),
                  child: Row(
                    children: [
                      Icon(Icons.code_rounded, size: 11.r, color: const Color(0xFF38BDF8)),
                      6.horizontalSpace,
                      Text(
                        langLabel,
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 9.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                ),
                // Code content
                Padding(
                  padding: EdgeInsets.all(10.r),
                  child: Text(
                    content,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 9.sp,
                      height: 1.5,
                      color: const Color(0xFFE2E8F0),
                    ),
                    maxLines: 15,
                    overflow: TextOverflow.fade,
                  ),
                ),
              ],
            ),
          ),
          // Gradient fade
          Positioned(
            bottom: 0, left: 0, right: 0, height: 40.h,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x001E293B), Color(0xFF1E293B)],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// PDF preview: renders the first page image
  Widget _buildPdfPreview(Uint8List imageBytes) {
    return ClipRRect(
      child: Stack(
        children: [
          Container(
            width: double.infinity,
            constraints: BoxConstraints(maxHeight: 300.h),
            child: Image.memory(
              imageBytes,
              fit: BoxFit.cover,
              width: double.infinity,
              alignment: Alignment.topCenter,
            ),
          ),
          // Subtle badge at top right
          Positioned(
            top: 12.h,
            right: 12.w,
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.6),
                borderRadius: BorderRadius.circular(4.r),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.picture_as_pdf, color: Colors.white, size: 12.r),
                  4.horizontalSpace,
                  Text(
                    'Trang 1 • PDF',
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white,
                      fontSize: 10.sp,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Gradient fade at bottom
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 60.h,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.white.withOpacity(0),
                    Colors.white,
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// ZIP preview: renders an extracted image from inside the archive
  Widget _buildZipImagePreview(Uint8List imageBytes) {
    return ClipRRect(
      child: Stack(
        children: [
          Container(
            width: double.infinity,
            constraints: BoxConstraints(maxHeight: 250.h),
            child: Image.memory(
              imageBytes,
              fit: BoxFit.cover,
              width: double.infinity,
            ),
          ),
          // Gradient fade
          Positioned(
            bottom: 0, left: 0, right: 0, height: 50.h,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x00000000), Color(0x99000000)],
                ),
              ),
              alignment: Alignment.bottomLeft,
              padding: EdgeInsets.all(10.r),
              child: Row(
                children: [
                  Icon(Icons.folder_zip_rounded, size: 14.r, color: Colors.white70),
                  6.horizontalSpace,
                  Text(
                    'Ảnh từ tệp nén',
                    style: GoogleFonts.plusJakartaSans(fontSize: 10.sp, color: Colors.white70, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// ZIP preview: file listing when no image or text found
  Widget _buildZipFileListPreview(List<ZipFileEntry> entries) {
    return Container(
      width: double.infinity,
      color: const Color(0xFFF8FAFC),
      padding: EdgeInsets.all(12.r),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.folder_zip_rounded, size: 14.r, color: const Color(0xFFF59E0B)),
              6.horizontalSpace,
              Text(
                'Nội dung tệp nén',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11.sp,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF475569),
                ),
              ),
            ],
          ),
          8.verticalSpace,
          ...entries.map((entry) => Padding(
            padding: EdgeInsets.symmetric(vertical: 3.h),
            child: Row(
              children: [
                Icon(
                  entry.isFile ? Icons.insert_drive_file_outlined : Icons.folder_outlined,
                  size: 14.r,
                  color: const Color(0xFF64748B),
                ),
                8.horizontalSpace,
                Expanded(
                  child: Text(
                    entry.name,
                    style: GoogleFonts.plusJakartaSans(fontSize: 10.sp, color: const Color(0xFF334155)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  entry.formattedSize,
                  style: GoogleFonts.plusJakartaSans(fontSize: 9.sp, color: const Color(0xFF94A3B8)),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  /// ZIP preview: extracted text content (README, etc.)
  Widget _buildZipTextPreview(String content) {
    return ClipRRect(
      child: Stack(
        children: [
                Container(
                  width: double.infinity,
                  color: Colors.white,
                  padding: EdgeInsets.all(12.r),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.article_outlined, size: 14.r, color: const Color(0xFF3B82F6)),
                          6.horizontalSpace,
                          Text(
                            'README',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                      8.verticalSpace,
                      Text(
                        content,
                        style: GoogleFonts.plusJakartaSans(fontSize: 10.sp, height: 1.5, color: const Color(0xFF475569)),
                        maxLines: 10,
                        overflow: TextOverflow.fade,
                      ),
                    ],
                  ),
                ),
                Positioned(
                  bottom: 0, left: 0, right: 0, height: 30.h,
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Color(0x00FFFFFF), Color(0xFFFFFFFF)],
                      ),
                    ),
                  ),
                ),
        ],
      ),
    );
  }

  /// Generic fallback for PDF, Word, PPT — document-style icon preview
  Widget _buildGenericPreview(FileType type, String fileName) {
    return Container(
      width: double.infinity,
      height: 130.h,
      color: const Color(0xFFF8FAFC),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildDocFileIcon(type, size: 56.r),
          8.verticalSpace,
          Text(
            _previewErrorMsg ?? 'Nhấn để mở',
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10.sp,
              color: _previewErrorMsg != null ? Colors.redAccent : const Color(0xFF94A3B8),
            ),
          ),
          if (_previewErrorMsg != null) ...[
            4.verticalSpace,
            Text(
              'Tệp vẫn có thể tải về được bên dưới',
              style: GoogleFonts.plusJakartaSans(fontSize: 9.sp, color: const Color(0xFF94A3B8)),
            ),
          ],
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Document-style File Type Icon (W, X, P, PDF, TXT)
  // ─────────────────────────────────────────────────────────────────

  /// Builds a custom document icon with folded corner + colored label.
  /// Matches the standard file-type icon style (Word=W blue, Excel=X green, etc.)
  Widget _buildDocFileIcon(FileType type, {double size = 44}) {
    String label;
    Color accentColor;

    switch (type) {
      case FileType.word:
        label = 'W';
        accentColor = const Color(0xFF2B579A);
        break;
      case FileType.excel:
        label = 'X';
        accentColor = const Color(0xFF217346);
        break;
      case FileType.csv:
        label = 'X';
        accentColor = const Color(0xFF217346);
        break;
      case FileType.powerpoint:
        label = 'P';
        accentColor = const Color(0xFFD24726);
        break;
      case FileType.pdf:
        label = 'PDF';
        accentColor = const Color(0xFFE53935);
        break;
      case FileType.code:
        label = 'TXT';
        accentColor = const Color(0xFF78909C);
        break;
      case FileType.zip:
        label = 'ZIP';
        accentColor = const Color(0xFFF59E0B);
        break;
      default:
        label = '';
        accentColor = const Color(0xFF90A4AE);
        break;
    }

    final foldSize = size * 0.25;

    return SizedBox(
      width: size,
      height: size * 1.25,
      child: Stack(
        children: [
          // Page body
          Positioned.fill(
            child: CustomPaint(
              painter: _DocIconPainter(foldSize: foldSize),
            ),
          ),
          // Colored stripe at bottom-left for label
          if (label.isNotEmpty)
            Positioned(
              left: 0,
              bottom: size * 0.15,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: size * 0.1, vertical: size * 0.04),
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: BorderRadius.only(
                    topRight: Radius.circular(size * 0.06),
                    bottomRight: Radius.circular(size * 0.06),
                  ),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: size * 0.24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
          // Content lines decoration
          Positioned(
            top: size * 0.35,
            left: size * 0.18,
            right: size * 0.18,
            child: Column(
              children: List.generate(3, (i) => Container(
                height: 1.5,
                margin: EdgeInsets.only(bottom: size * 0.08, right: i == 2 ? size * 0.2 : 0),
                color: const Color(0xFFE0E0E0),
              )),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReferenceSection() {
    final fileName = slot.assignmentReferenceName ?? 'Tài liệu đính kèm';
    final url = slot.assignmentReferenceUrl!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('TÀI LIỆU ĐÍNH KÈM (1)'),
        InkWell(
          onTap: () => _downloadAndOpenFile(url, fileName),
          borderRadius: BorderRadius.circular(12.r),
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                _buildDocFileIcon(
                  FilePreviewService.getFileType(fileName),
                  size: 40.r,
                ),
                16.horizontalSpace,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fileName,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF1E293B),
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.download_rounded, color: const Color(0xFF94A3B8), size: 20.r),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSubmissionSection() {
    bool isSubmitted = submission != null && submission!.status != 'NOT_SUBMITTED';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(
          'BÀI TẬP ĐÃ NỘP',
          trailing: isSubmitted ? Row(
            children: [
              Icon(Icons.check_circle_rounded, size: 14.r, color: const Color(0xFF10B981)),
              4.horizontalSpace,
              Text(
                'Đã hoàn thành',
                style: GoogleFonts.plusJakartaSans(
                  color: const Color(0xFF10B981),
                  fontSize: 12.sp,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ) : null,
        ),
        if (isSubmitted)
          _buildSubmissionSuccess()
        else
          Container(
            padding: EdgeInsets.symmetric(vertical: 32.h),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16.r),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: EdgeInsets.all(12.r),
                  decoration: const BoxDecoration(
                    color: Color(0xFFF1F5F9),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.assignment_late_rounded, color: const Color(0xFF94A3B8), size: 24.r),
                ),
                16.horizontalSpace,
                Text(
                  'Chưa nộp bài',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 15.sp,
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildSubmissionSuccess() {
    String firstFileName = (submission!.fileNames != null && submission!.fileNames!.isNotEmpty) 
        ? submission!.fileNames!.first 
        : 'baitap.pdf'; // default fallback for visual
    
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(16.r),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 64.r,
                height: 64.r,
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2), // light pinkish background for pdf mostly
                  borderRadius: BorderRadius.circular(12.r),
                ),
                alignment: Alignment.center,
                child: _buildDocFileIcon(
                  FilePreviewService.getFileType(firstFileName),
                  size: 40.r,
                ),
              ),
              16.horizontalSpace,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      firstFileName,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF1E293B),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    4.verticalSpace,
                    if (submission!.submittedAt != null)
                      Text(
                        'Đã nộp: ${DateFormat('HH:mm - dd/MM/yyyy').format(submission!.submittedAt!)}',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12.sp,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          
          if (submission!.lecturerComment != null && submission!.lecturerComment!.isNotEmpty) ...[
            16.verticalSpace,
            Container(
              width: double.infinity,
              padding: EdgeInsets.all(12.r),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4E6),
                borderRadius: BorderRadius.circular(8.r),
                border: Border.all(color: const Color(0xFFFFD8A8)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.feedback_rounded, size: 16.r, color: const Color(0xFFFF922B)),
                      8.horizontalSpace,
                      Text(
                        'Phản hồi',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13.sp,
                          color: const Color(0xFFD97706),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  6.verticalSpace,
                  Text(
                    submission!.lecturerComment!,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14.sp,
                      color: const Color(0xFF92400E),
                    ),
                  ),
                ],
              ),
            ),
          ],
          
          16.verticalSpace,
          const Divider(color: Color(0xFFE2E8F0), height: 1),
          16.verticalSpace,
          
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    // Xem bài nộp action
                  },
                  style: OutlinedButton.styleFrom(
                    padding: EdgeInsets.symmetric(vertical: 12.h),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8.r),
                    ),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    'Xem bài nộp',
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFF334155),
                      fontWeight: FontWeight.w600,
                      fontSize: 13.sp,
                    ),
                  ),
                ),
              ),
              12.horizontalSpace,
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    // Chỉnh sửa action
                  },
                  style: OutlinedButton.styleFrom(
                    padding: EdgeInsets.symmetric(vertical: 12.h),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8.r),
                    ),
                    side: const BorderSide(color: Color(0xFFF97316), width: 1),
                  ),
                  child: Text(
                    'Chỉnh sửa',
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFFEA580C),
                      fontWeight: FontWeight.w600,
                      fontSize: 13.sp,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _downloadAndOpenFile(String url, String fileName) async {
    try {
      Get.snackbar(
        'Thông báo',
        'Đang tải tệp xuống...',
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 2),
      );
      
      String ext = '';
      if (!fileName.contains('.')) {
        final uri = Uri.parse(url);
        final path = uri.path;
        if (path.contains('.')) {
          ext = path.substring(path.lastIndexOf('.'));
        }
      }
      
      final safeFileName = fileName.replaceAll(RegExp(r'[^\w\s\.-]'), '') + ext;
      
      final directory = await getTemporaryDirectory();
      final filePath = '${directory.path}/$safeFileName';
      
      final dio = Dio();
      await dio.download(url, filePath);
      
      final result = await OpenFilex.open(filePath);
      if (result.type != ResultType.done) {
        Get.snackbar(
          'Lỗi',
          'Không thể mở tệp này. Đã lưu tại thư mục tạm.',
          snackPosition: SnackPosition.BOTTOM,
        );
      }
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Lỗi khi tải hoặc mở tệp: $e',
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }
}

/// CustomPainter that draws a document page with a folded corner.
class _DocIconPainter extends CustomPainter {
  final double foldSize;

  _DocIconPainter({required this.foldSize});

  @override
  void paint(Canvas canvas, Size size) {
    final pagePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = const Color(0xFFBDBDBD)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final foldPaint = Paint()
      ..color = const Color(0xFFE0E0E0)
      ..style = PaintingStyle.fill;

    // Page path with folded corner
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width - foldSize, 0)
      ..lineTo(size.width, foldSize)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    canvas.drawPath(path, pagePaint);
    canvas.drawPath(path, borderPaint);

    // Fold triangle
    final foldPath = Path()
      ..moveTo(size.width - foldSize, 0)
      ..lineTo(size.width - foldSize, foldSize)
      ..lineTo(size.width, foldSize)
      ..close();

    canvas.drawPath(foldPath, foldPaint);

    // Fold border
    final foldBorderPaint = Paint()
      ..color = const Color(0xFFBDBDBD)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;
    canvas.drawPath(foldPath, foldBorderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
