import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:solar_icons/solar_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/schedule_request_controller.dart';
import '../utils/request_type_labels.dart';
import '../widgets/request_status_badge.dart';
import '../models/schedule_request_model.dart';

/// Screen displaying schedule request details
class ScheduleRequestDetailScreen extends StatefulWidget {
  const ScheduleRequestDetailScreen({super.key});

  @override
  State<ScheduleRequestDetailScreen> createState() => _ScheduleRequestDetailScreenState();
}

class _ScheduleRequestDetailScreenState extends State<ScheduleRequestDetailScreen> {
  late ScheduleRequestController controller;
  late int requestId;

  @override
  void initState() {
    super.initState();
    controller = Get.find<ScheduleRequestController>();
    requestId = int.tryParse(Get.parameters['id'] ?? '') ?? 0;
    controller.fetchRequestDetail(requestId);
  }

  @override
  void dispose() {
    controller.clearSelectedRequest();
    super.dispose();
  }

  String _formatDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'Không có';
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('dd/MM/yyyy HH:mm').format(date);
    } catch (e) {
      return dateString;
    }
  }

  String _formatDateOnly(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'Không có';
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('dd/MM/yyyy').format(date);
    } catch (e) {
      return dateString;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark 
              ? Theme.of(context).scaffoldBackgroundColor 
              : null,
          gradient: Theme.of(context).brightness == Brightness.dark 
              ? null 
              : const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFFFEF3DE),
                    Colors.white,
                  ],
                  stops: [0.0, 0.3],
                ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Custom Header
              _buildHeader(context),
              
              Expanded(
                child: Obx(() {
                  if (controller.isLoadingDetail.value) {
                    return const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFFF36F21),
                      ),
                    );
                  }

                  final request = controller.selectedRequest.value;
                  if (request == null) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, size: 64, color: Colors.grey),
                          const SizedBox(height: 16),
                          const Text(
                            'Không tìm thấy yêu cầu',
                            style: TextStyle(fontSize: 16, color: Colors.grey),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => Get.back(),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF36F21),
                            ),
                            child: const Text('Quay lại', style: TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    );
                  }

                  return SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: EdgeInsets.fromLTRB(16.w, 8.h, 16.w, 30.h),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // General Info Section
                        _SectionCard(
                          title: 'Thông tin chung',
                          trailing: Container(
                            padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDBEAFE),
                              borderRadius: BorderRadius.circular(20.r),
                            ),
                            child: Text(
                              RequestTypeLabels.getLabel(request.type),
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF2563EB),
                              ),
                            ),
                          ),
                          child: Column(
                            children: [
                              _InfoRow(label: 'Lớp học', value: request.className),
                              _InfoRow(label: 'Ngày tạo', value: _formatDate(request.createdAt)),
                            ],
                          ),
                        ),
                        SizedBox(height: 16.h),

                        // Change Details Section
                        _SectionCard(
                          title: 'Chi tiết thay đổi',
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Ban đầu section
                              Text(
                                'BAN ĐẦU',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.grey[500],
                                  letterSpacing: 1.0,
                                ),
                              ),
                              SizedBox(height: 12.h),
                              _InfoRow(
                                label: 'Ngày:',
                                value: _formatDateOnly(request.originalDate),
                              ),
                              _InfoRow(
                                label: 'Slot:',
                                value: request.originalSlotNumber != null
                                    ? 'Slot ${request.originalSlotNumber}'
                                    : 'Không có',
                              ),
                              _InfoRow(
                                label: 'Phòng:',
                                value: request.originalRoomName ?? 'Không có',
                              ),
                              Padding(
                                padding: EdgeInsets.symmetric(vertical: 16.h),
                                child: Divider(color: Colors.grey.withOpacity(0.1)),
                              ),
                              // Yêu cầu đổi sang section
                              Text(
                                'YÊU CẦU ĐỔI SANG',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFFF36F21),
                                  letterSpacing: 1.0,
                                ),
                              ),
                              SizedBox(height: 12.h),
                              _InfoRow(
                                label: 'Ngày:',
                                value: _formatDateOnly(request.requestedDate),
                              ),
                              _InfoRow(
                                label: 'Slot:',
                                value: request.requestedSlotNumber != null
                                    ? 'Slot ${request.requestedSlotNumber}'
                                    : 'Không đổi',
                              ),
                              _InfoRow(
                                label: 'Phòng:',
                                value: request.requestedRoomName ?? 'Không đổi',
                              ),
                            ],
                          ),
                        ),
                        SizedBox(height: 16.h),

                        // Content & Documents Section
                        _SectionCard(
                          title: 'Nội dung & Tài liệu',
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'LÝ DO THAY ĐỔI',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.grey[500],
                                  letterSpacing: 1.0,
                                ),
                              ),
                              SizedBox(height: 12.h),
                              Container(
                                width: double.infinity,
                                padding: EdgeInsets.all(16.w),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).brightness == Brightness.dark 
                                    ? Colors.white.withOpacity(0.05) 
                                    : const Color(0xFFF9FAFB),
                                  borderRadius: BorderRadius.circular(12.r),
                                  border: Border.all(color: Colors.grey.withOpacity(0.1)),
                                ),
                                child: Text(
                                  request.reason,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 14.sp,
                                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.9),
                                    height: 1.5,
                                  ),
                                ),
                              ),
                              SizedBox(height: 24.h),
                              _buildAttachments(request.file),
                            ],
                          ),
                        ),
                        SizedBox(height: 16.h),

                        // Status & Approval Section
                        _SectionCard(
                          title: 'Trạng thái & Phê duyệt',
                          child: Column(
                            children: [
                              // Status Badge (centered)
                              Container(
                                width: double.infinity,
                                padding: EdgeInsets.all(24.w),
                                decoration: BoxDecoration(
                                  color: _getStatusBackgroundColor(request.status).withOpacity(0.5),
                                  borderRadius: BorderRadius.circular(20.r),
                                  border: Border.all(color: _getStatusBackgroundColor(request.status)),
                                ),
                                child: Column(
                                  children: [
                                    Text(
                                      'TRẠNG THÁI HIỆN TẠI',
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 10.sp,
                                        fontWeight: FontWeight.w800,
                                        color: const Color(0xFFF36F21),
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                    SizedBox(height: 16.h),
                                    RequestStatusBadge(
                                      status: request.status,
                                      label: request.statusLabel,
                                    ),
                                    if (request.status == 'PENDING') ...[
                                      SizedBox(height: 20.h),
                                      SizedBox(
                                        width: double.infinity,
                                        child: Obx(() => ElevatedButton(
                                          onPressed: controller.isRevoking.value 
                                              ? null 
                                              : () => _showRevokeConfirmation(context, request.id),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.white,
                                            foregroundColor: Colors.red[700],
                                            elevation: 0,
                                            side: BorderSide(color: Colors.red.withOpacity(0.2)),
                                            padding: EdgeInsets.symmetric(vertical: 14.h),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(12.r),
                                            ),
                                          ),
                                          child: controller.isRevoking.value
                                              ? SizedBox(
                                                  height: 20.h,
                                                  width: 20.h,
                                                  child: const CircularProgressIndicator(strokeWidth: 2),
                                                )
                                              : Row(
                                                  mainAxisAlignment: MainAxisAlignment.center,
                                                  children: [
                                                    Icon(SolarIconsOutline.closeCircle, size: 18.sp),
                                                    SizedBox(width: 8.w),
                                                    Text('Thu hồi đơn', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700)),
                                                  ],
                                                ),
                                        )),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              SizedBox(height: 24.h),
                              _InfoRow(
                                label: 'Người phê duyệt',
                                value: request.approverName ?? 'Chưa có thông tin',
                              ),
                              _InfoRow(
                                label: 'Thời gian phê duyệt',
                                value: request.approvedAt != null
                                    ? _formatDate(request.approvedAt)
                                    : 'Chưa có thông tin',
                              ),
                              Padding(
                                padding: EdgeInsets.symmetric(vertical: 16.h),
                                child: Divider(color: Colors.grey.withOpacity(0.1)),
                              ),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  'GHI CHÚ PHÊ DUYỆT',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 10.sp,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.grey[500],
                                    letterSpacing: 1.0,
                                  ),
                                ),
                              ),
                              SizedBox(height: 12.h),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  request.approverNote ?? 'Yêu cầu đang chờ quản lý xem xét và phê duyệt.',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 14.sp,
                                    color: Colors.grey[600],
                                    fontStyle: FontStyle.italic,
                                    height: 1.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 8.h),
      child: Row(
        children: [
          InkWell(
            onTap: () => Get.back(),
            borderRadius: BorderRadius.circular(12.r),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(SolarIconsOutline.altArrowLeft, color: AppColors.primaryOrange, size: 28.sp),
                SizedBox(width: 4.w),
                Text(
                  'Quay lại',
                  style: GoogleFonts.plusJakartaSans(
                    color: AppColors.primaryOrange,
                    fontWeight: FontWeight.w600,
                    fontSize: 16.sp,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: 16.w),
          Text(
            'Chi tiết Yêu cầu',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18.sp,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  void _showRevokeConfirmation(BuildContext context, int requestId) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.r)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        child: Container(
          padding: EdgeInsets.all(24.w),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(24.r),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: EdgeInsets.all(16.w),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  shape: BoxShape.circle,
                ),
                child: Icon(SolarIconsOutline.danger, color: Colors.red[600], size: 32.sp),
              ),
              SizedBox(height: 20.h),
              Text(
                'Xác nhận thu hồi',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.w800,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              SizedBox(height: 12.h),
              Text(
                'Bạn có chắc chắn muốn thu hồi đơn yêu cầu này? Hành động này không thể hoàn tác.',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14.sp,
                  color: Colors.grey[600],
                  height: 1.5,
                ),
              ),
              SizedBox(height: 24.h),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.pop(context),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.symmetric(vertical: 14.h),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                      ),
                      child: Text(
                        'Hủy bỏ',
                        style: GoogleFonts.plusJakartaSans(
                          fontWeight: FontWeight.w700,
                          color: Colors.grey[600],
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 12.w),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        controller.revokeRequest(requestId);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red[600],
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: EdgeInsets.symmetric(vertical: 14.h),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                      ),
                      child: Text(
                        'Thu hồi',
                        style: GoogleFonts.plusJakartaSans(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAttachments(String? file) {
    List<String> fileUrls = [];
    if (file != null && file.isNotEmpty) {
      try {
        if (file.startsWith('[')) {
          // Parse JSON array
          final parsed = file.substring(1, file.length - 1).split(',');
          fileUrls = parsed.map((e) => e.trim().replaceAll('"', '')).toList();
        } else {
          fileUrls = [file];
        }
      } catch (e) {
        fileUrls = [file];
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'TÀI LIỆU ĐÍNH KÈM (${fileUrls.length})',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: Colors.grey,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        if (fileUrls.isEmpty)
          Text(
            'Không có file đính kèm',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[50],
              fontStyle: FontStyle.italic,
            ),
          )
        else
          ...fileUrls.map((url) => _FileCard(url: url)),
      ],
    );
  }

  Color _getStatusBackgroundColor(String status) {
    switch (status) {
      case 'APPROVED':
        return const Color(0xFFDCFCE7);
      case 'REJECTED':
        return const Color(0xFFFEE2E2);
      default:
        return const Color(0xFFFFF7ED);
    }
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget? trailing;
  final Widget child;

  const _SectionCard({
    required this.title,
    this.trailing,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.04),
            blurRadius: 16.r,
            offset: Offset(0, 8.h),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.w800,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          SizedBox(height: 16.h),
          child,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: 12.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120.w,
            child: Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13.sp,
                color: Colors.grey[500],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14.sp,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FileCard extends StatelessWidget {
  final String url;

  const _FileCard({required this.url});

  String _getFileName() {
    try {
      final decoded = Uri.decodeComponent(url);
      return decoded.split('/').last.split('?').first;
    } catch (e) {
      return url.split('/').last;
    }
  }

  String _getExtension() {
    final name = _getFileName();
    return name.split('.').last.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      child: InkWell(
        onTap: () async {
          final uri = Uri.parse(url);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        },
        borderRadius: BorderRadius.circular(12.r),
        child: Container(
          padding: EdgeInsets.all(16.w),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(12.r),
            border: Border.all(color: Colors.grey.withOpacity(0.1)),
          ),
          child: Row(
            children: [
              Container(
                padding: EdgeInsets.all(10.w),
                decoration: BoxDecoration(
                  color: AppColors.primaryOrange.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10.r),
                ),
                child: Icon(
                  SolarIconsOutline.documentText,
                  color: AppColors.primaryOrange,
                  size: 24.sp,
                ),
              ),
              SizedBox(width: 16.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _getFileName(),
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: 4.h),
                    Text(
                      '${_getExtension()} File',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12.sp,
                        color: Colors.grey[500],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                SolarIconsOutline.import,
                color: Colors.grey[400],
                size: 20.sp,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
