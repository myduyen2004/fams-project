import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/app_background.dart';
import '../controllers/academic_request_controller.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../models/academic_request_model.dart';
import '../widgets/academic_request_status_badge.dart';
import 'package:solar_icons/solar_icons.dart';

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
                // Row: type label + status badge
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
                // Title
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
                // Footer: dates
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

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.all(20.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40.w,
                height: 4.h,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2.r),
                ),
              ),
            ),
            SizedBox(height: 16.h),
            Row(
              children: [
                Expanded(
                  child: Text(
                    request.requestTitle,
                    style: TextStyle(
                      fontSize: 17.sp,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
                AcademicRequestStatusBadge(status: request.status, label: request.statusLabel),
              ],
            ),
            SizedBox(height: 4.h),
            Text(request.requestTypeLabel,
                style: TextStyle(fontSize: 13.sp, color: Colors.grey[600])),
            Divider(height: 24.h),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    if (request.semesterName != null)
                      _DetailRow('Học kỳ', request.semesterName!),
                    if (request.courseName != null)
                      _DetailRow('Môn học', '${request.courseCode ?? ''} - ${request.courseName}'),
                    if (request.className != null)
                      _DetailRow('Lớp học phần', request.className!),
                    if (request.toClassName != null)
                      _DetailRow('Lớp muốn chuyển', request.toClassName!),
                    if (request.toMajor != null)
                      _DetailRow('Ngành muốn chuyển', request.toMajor!),
                    if (request.toSpecialization != null)
                      _DetailRow('Chuyên ngành', request.toSpecialization!),
                    if (request.toSubSpecialization != null)
                      _DetailRow('Chuyên ngành hẹp', request.toSubSpecialization!),
                    if (request.reason != null)
                      _DetailRow('Lý do', request.reason!),
                    if (request.note != null && request.note!.isNotEmpty)
                      _DetailRow('Ghi chú', request.note!),
                    if (request.dueDate != null)
                      _DetailRow('Hạn nộp', request.dueDate!),
                    _DetailRow('Ngày tạo', request.createdAt.split('T').first),
                    if (request.approverName != null)
                      _DetailRow('Người xét duyệt', request.approverName!),
                    if (request.approvedAt != null)
                      _DetailRow('Ngày xét duyệt', request.approvedAt!.split('T').first),
                    if (request.approverNote != null && request.approverNote!.isNotEmpty)
                      _DetailRow('Ghi chú người duyệt', request.approverNote!),
                    if (request.fileUrl != null && request.fileUrl!.isNotEmpty)
                      Padding(
                        padding: EdgeInsets.symmetric(vertical: 6.h),
                        child: Row(
                          children: [
                            Icon(SolarIconsOutline.paperclip, size: 16.sp, color: AppColors.primaryOrange),
                            SizedBox(width: 8.w),
                            Text('File đính kèm: ', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.sp)),
                            Expanded(
                              child: Text('Có file đính kèm',
                                  style: TextStyle(color: AppColors.primaryOrange, fontSize: 13.sp)),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            // Cancel button if PENDING
            if (request.status == 'PENDING') ...[
              SizedBox(height: 12.h),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: Icon(SolarIconsOutline.closeCircle, color: Colors.red, size: 18.sp),
                  label: Text('Thu hồi yêu cầu', style: TextStyle(color: Colors.red, fontSize: 14.sp)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                    padding: EdgeInsets.symmetric(vertical: 14.h),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                  ),
                  onPressed: () {
                    Get.back();
                    Get.dialog(
                      AlertDialog(
                        title: const Text('Xác nhận thu hồi'),
                        content: const Text('Bạn có chắc muốn thu hồi yêu cầu này?'),
                        actions: [
                          TextButton(onPressed: () => Get.back(), child: const Text('Hủy')),
                          TextButton(
                            onPressed: () {
                              Get.back();
                              controller.cancelRequest(request.id);
                            },
                            child: const Text('Thu hồi', style: TextStyle(color: Colors.red)),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 6.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 150.w,
            child: Text(label,
                style: TextStyle(fontSize: 13.sp, color: Colors.grey[600], fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Text(value,
                style: TextStyle(fontSize: 13.sp, color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.w600)),
          ),
        ],
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
