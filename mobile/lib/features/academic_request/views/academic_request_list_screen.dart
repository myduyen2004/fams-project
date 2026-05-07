import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/academic_request_controller.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../models/academic_request_model.dart';
import '../widgets/academic_request_status_badge.dart';
import 'package:solar_icons/solar_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

/// Screen showing the student's academic request list
class AcademicRequestListScreen extends StatelessWidget {
  const AcademicRequestListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.isRegistered<AcademicRequestController>()
        ? Get.find<AcademicRequestController>()
        : Get.put(AcademicRequestController());

    return Container(
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
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Column(
            children: [
              _buildHeader(context, controller),
              _buildFilterBar(context, controller),
              Expanded(
                child: Obx(() {
                  if (controller.isLoading.value && controller.requests.isEmpty) {
                    return const Center(
                      child: CircularProgressIndicator(color: AppColors.primaryOrange),
                    );
                  }
                  if (controller.requests.isEmpty) {
                    return _buildEmptyState(controller);
                  }
                  return RefreshIndicator(
                    onRefresh: controller.refreshList,
                    color: AppColors.primaryOrange,
                    child: ListView.builder(
                      padding: EdgeInsets.fromLTRB(16.w, 8.h, 16.w, 100.h),
                      physics: const BouncingScrollPhysics(),
                      itemCount: controller.requests.length,
                      itemBuilder: (context, index) {
                        final req = controller.requests[index];
                        return _AcademicRequestCard(
                          request: req,
                          onTap: () => _showDetailSheet(context, req, controller),
                        );
                      },
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

  Widget _buildHeader(BuildContext context, AcademicRequestController controller) {
    return Padding(
      padding: EdgeInsets.fromLTRB(16.w, 20.h, 16.w, 12.h),
      child: Row(
        children: [
          IconButton(
            icon: Icon(SolarIconsOutline.altArrowLeft, size: 24.sp),
            onPressed: () => Get.back(),
            color: const Color(0xFF1E2A3A),
          ),
          SizedBox(width: 8.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Yêu Cầu Học Thuật',
                  style: TextStyle(
                    fontSize: 20.sp,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF1E2A3A),
                    letterSpacing: -0.5,
                  ),
                ),
                Obx(() => Text(
                  '${controller.totalElements.value} yêu cầu',
                  style: TextStyle(fontSize: 13.sp, color: Colors.grey[600], fontWeight: FontWeight.w500),
                )),
              ],
            ),
          ),
          // Small Create Button next to Title row
          ElevatedButton.icon(
            onPressed: () => Get.toNamed('/student/academic-requests/create'),
            icon: Icon(SolarIconsOutline.addCircle, color: Colors.white, size: 16.sp),
            label: Text('Tạo', style: TextStyle(color: Colors.white, fontSize: 12.sp, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryOrange,
              padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
              minimumSize: Size(0, 36.h),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(BuildContext context, AcademicRequestController controller) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Obx(() => Row(
          children: [
            _FilterChip(label: 'Tất cả', isSelected: controller.statusFilter.value == '',
                onTap: () => controller.changeStatusFilter('')),
            SizedBox(width: 8.w),
            _FilterChip(label: 'Chờ xử lý', color: Colors.amber,
                isSelected: controller.statusFilter.value == 'PENDING',
                onTap: () => controller.changeStatusFilter('PENDING')),
            SizedBox(width: 8.w),
            _FilterChip(label: 'Đã duyệt', color: Colors.green,
                isSelected: controller.statusFilter.value == 'APPROVED',
                onTap: () => controller.changeStatusFilter('APPROVED')),
            SizedBox(width: 8.w),
            _FilterChip(label: 'Từ chối', color: Colors.red,
                isSelected: controller.statusFilter.value == 'REJECTED',
                onTap: () => controller.changeStatusFilter('REJECTED')),
            SizedBox(width: 8.w),
            _FilterChip(label: 'Đã hủy', color: Colors.grey,
                isSelected: controller.statusFilter.value == 'CANCELLED',
                onTap: () => controller.changeStatusFilter('CANCELLED')),
          ],
        )),
      ),
    );
  }

  Widget _buildEmptyState(AcademicRequestController controller) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(40.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 80.sp, color: Colors.grey[300]),
            SizedBox(height: 16.h),
            Text(
              controller.statusFilter.value.isNotEmpty
                  ? 'Không có yêu cầu nào với trạng thái này'
                  : 'Chưa có yêu cầu nào.\nNhấn "Tạo yêu cầu" để bắt đầu!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15.sp, color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }

  void _showDetailSheet(
      BuildContext context, AcademicRequest req, AcademicRequestController controller) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (_) => _DetailSheet(request: req, controller: controller),
    );
  }
}

// ─── Request Card ─────────────────────────────────────────────────────────────

class _AcademicRequestCard extends StatelessWidget {
  final AcademicRequest request;
  final VoidCallback onTap;

  const _AcademicRequestCard({required this.request, required this.onTap});

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      return DateFormat('dd/MM/yyyy').format(DateTime.parse(dateStr));
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.05),
            blurRadius: 10.r,
            offset: Offset(0, 4.h),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: EdgeInsets.all(16.w),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 5.h),
                      decoration: BoxDecoration(
                        color: AppColors.primaryOrange.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(8.r),
                      ),
                      child: Text(
                        request.requestTypeLabel,
                        style: TextStyle(
                          fontSize: 11.sp,
                          color: AppColors.primaryOrange,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const Spacer(),
                    AcademicRequestStatusBadge(
                      status: request.status,
                      label: request.statusLabel,
                    ),
                  ],
                ),
                SizedBox(height: 10.h),
                Text(
                  request.requestTitle,
                  style: TextStyle(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 8.h),
                Row(
                  children: [
                    Icon(Icons.calendar_today_rounded, size: 12.sp, color: Colors.grey[500]),
                    SizedBox(width: 4.w),
                    Text(
                      'Ngày tạo: ${_formatDate(request.createdAt)}',
                      style: TextStyle(fontSize: 12.sp, color: Colors.grey[500]),
                    ),
                    if (request.dueDate != null) ...[
                      SizedBox(width: 12.w),
                      Icon(Icons.timer_outlined, size: 12.sp, color: Colors.grey[500]),
                      SizedBox(width: 4.w),
                      Text(
                        'Hạn: ${request.dueDate}',
                        style: TextStyle(fontSize: 12.sp, color: Colors.grey[500]),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


// ─── Detail Bottom Sheet ──────────────────────────────────────────────────────

class _DetailSheet extends StatelessWidget {
  final AcademicRequest request;
  final AcademicRequestController controller;

  const _DetailSheet({required this.request, required this.controller});

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

  @override
  Widget build(BuildContext context) {
    const Color textMain = Color(0xFF1E2A3A);

    return Container(
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
        borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                margin: EdgeInsets.only(top: 12.h, bottom: 12.h),
                width: 40.w,
                height: 4.h,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2.r),
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(16.w, 4.h, 16.w, 12.h),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(SolarIconsOutline.altArrowLeft, color: textMain, size: 24.sp),
                    onPressed: () => Get.back(),
                  ),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Chi tiết Yêu cầu',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 20.sp,
                            fontWeight: FontWeight.w800,
                            color: textMain,
                          ),
                        ),
                        Text(
                          'Thông tin đơn từ học vụ',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w500,
                            color: textMain.withOpacity(0.6),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(width: 48.w), // Balance for back button
                ],
              ),
            ),
            Divider(color: Colors.grey.withOpacity(0.1)),
            Flexible(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.fromLTRB(16.w, 8.h, 16.w, 30.h),
                child: Column(
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
                          request.requestTypeLabel,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 11.sp,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF2563EB),
                          ),
                        ),
                      ),
                      child: Column(
                        children: [
                          if (request.semesterName != null)
                            _InfoRow(label: 'Học kỳ', value: request.semesterName!),
                          if (request.courseName != null && request.courseName!.trim().isNotEmpty)
                            _InfoRow(label: 'Môn học', value: '${request.courseCode ?? ''} - ${request.courseName}'),
                          _InfoRow(label: 'Ngày tạo', value: request.createdAt.split('T').first),
                        ],
                      ),
                    ),
                    SizedBox(height: 16.h),

                    // Detail Requirement Section
                    if (request.className != null || request.toClassName != null || request.toMajor != null || request.toSpecialization != null || request.toSubSpecialization != null)
                      _SectionCard(
                        title: 'Chi tiết yêu cầu',
                        child: Column(
                          children: [
                            if (request.className != null && request.className!.trim().isNotEmpty)
                              _InfoRow(label: 'Lớp học phần', value: request.className!),
                            if (request.toClassName != null && request.toClassName!.trim().isNotEmpty)
                              _InfoRow(label: 'Lớp muốn chuyển', value: request.toClassName!),
                            if (request.toMajor != null && request.toMajor!.trim().isNotEmpty)
                              _InfoRow(label: 'Ngành muốn chuyển', value: request.toMajor!),
                            if (request.toSpecialization != null && request.toSpecialization!.trim().isNotEmpty)
                              _InfoRow(label: 'Chuyên ngành', value: request.toSpecialization!),
                            if (request.toSubSpecialization != null && request.toSubSpecialization!.trim().isNotEmpty)
                              _InfoRow(label: 'Chuyên ngành hẹp', value: request.toSubSpecialization!),
                          ],
                        ),
                      ),
                    if (request.className != null || request.toClassName != null || request.toMajor != null || request.toSpecialization != null || request.toSubSpecialization != null)
                      SizedBox(height: 16.h),

                    // Content & Documents Section
                    _SectionCard(
                      title: 'Nội dung & Tài liệu',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'LÝ DO / NỘI DUNG',
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
                                : const Color(0xFFFFFFFF),
                              borderRadius: BorderRadius.circular(12.r),
                              border: Border.all(color: Colors.grey.withOpacity(0.1)),
                            ),
                            child: Text(
                              (request.reason == null || request.reason!.trim().isEmpty) ? 'Không có nội dung' : request.reason!,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 14.sp,
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.9),
                                height: 1.5,
                              ),
                            ),
                          ),
                          if (request.note != null && request.note!.isNotEmpty) ...[
                            SizedBox(height: 16.h),
                            Text(
                              'GHI CHÚ',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 10.sp,
                                fontWeight: FontWeight.w800,
                                color: Colors.grey[500],
                                letterSpacing: 1.0,
                              ),
                            ),
                            SizedBox(height: 12.h),
                            Text(
                              request.note!,
                              style: GoogleFonts.plusJakartaSans(fontSize: 14.sp, color: Colors.grey[600]),
                            ),
                          ],
                          SizedBox(height: 24.h),
                          _buildAttachments(context, request.fileUrl),
                        ],
                      ),
                    ),
                    SizedBox(height: 16.h),

                    // Status & Approval Section
                    _SectionCard(
                      title: 'Trạng thái & Phê duyệt',
                      child: Column(
                        children: [
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
                                AcademicRequestStatusBadge(
                                  status: request.status,
                                  label: request.statusLabel,
                                ),
                                if (request.status == 'PENDING') ...[
                                  SizedBox(height: 20.h),
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton(
                                      onPressed: () {
                                        Get.back();
                                        _showRevokeConfirmation(context, request.id);
                                      },
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
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(SolarIconsOutline.closeCircle, size: 18.sp),
                                          SizedBox(width: 8.w),
                                          Text('Thu hồi đơn', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700)),
                                        ],
                                      ),
                                    ),
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
                                ? request.approvedAt!.split('T').first
                                : 'Chưa có thông tin',
                          ),
                          if (request.approverNote != null && request.approverNote!.isNotEmpty) ...[
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
                                request.approverNote!,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 14.sp,
                                  color: Colors.grey[600],
                                  fontStyle: FontStyle.italic,
                                  height: 1.5,
                                ),
                              ),
                            ),
                          ]
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttachments(BuildContext context, String? file) {
    List<String> fileUrls = [];
    if (file != null && file.isNotEmpty) {
      try {
        if (file.startsWith('[')) {
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
          style: GoogleFonts.plusJakartaSans(
            fontSize: 10.sp,
            fontWeight: FontWeight.w800,
            color: Colors.grey[500],
            letterSpacing: 1.0,
          ),
        ),
        SizedBox(height: 12.h),
        if (fileUrls.isEmpty)
          Text(
            'Không có file đính kèm',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14.sp,
              color: Colors.grey[400],
              fontStyle: FontStyle.italic,
            ),
          )
        else
          ...fileUrls.map((url) => _FileCard(url: url)),
      ],
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
                'Bạn có chắc chắn muốn thu hồi yêu cầu này? Hành động này không thể hoàn tác.',
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
                        controller.cancelRequest(requestId);
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
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget? trailing;
  final Widget child;

  const _SectionCard({required this.title, this.trailing, required this.child});

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
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w800,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
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
  final bool justify;

  const _InfoRow({required this.label, required this.value, this.justify = false});

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
              textAlign: justify ? TextAlign.justify : TextAlign.left,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14.sp,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
                height: 1.4,
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
                SolarIconsOutline.download,
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

class _FilterChip extends StatelessWidget {
  final String label;
  final Color? color;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
        decoration: BoxDecoration(
          color: isSelected ? (color ?? AppColors.primaryOrange) : Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(
            color: isSelected ? (color ?? AppColors.primaryOrange) : (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF333333) : Colors.grey[300]!),
            width: 1.5.w,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.sp,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.white : Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}
