import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart' hide TextDirection;
import '../../../core/constants/app_colors.dart';
import '../models/schedule_model.dart';
import '../models/assignment_submission_model.dart';
import '../services/schedule_service.dart';
import '../../lecturer/models/class_section_model.dart';
import '../../lecturer/views/student_list_screen.dart';
import '../../lecturer/controllers/class_list_controller.dart';
import '../../face_attendance/views/face_attendance_view.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../face_recognition/views/face_registration_view.dart';
import '../controllers/schedule_controller.dart';
import 'lecturer_info_screen.dart';
import 'assignment_detail_screen.dart';
import '../../lecturer/views/slot_attendance_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:solar_icons/solar_icons.dart';

class SlotDetailScreen extends StatefulWidget {
  final TimetableSlot slot;

  const SlotDetailScreen({super.key, required this.slot});

  @override
  State<SlotDetailScreen> createState() => _SlotDetailScreenState();
}

class _SlotDetailScreenState extends State<SlotDetailScreen> {
  late bool _hasCheckedIn;
  final ScheduleService _scheduleService = ScheduleService();
  AssignmentSubmissionResponse? _submission;
  bool _isLoadingSubmission = false;

  @override
  void initState() {
    super.initState();
    _hasCheckedIn = widget.slot.attendanceStatus == 'PRESENT';
    _fetchSubmissionIfAvailable();
  }

  Future<void> _fetchSubmissionIfAvailable() async {
    final authController = Get.find<AuthController>();
    final isLecturer = authController.currentUser.value?.isLecturer ?? false;
    if (!isLecturer && widget.slot.assignmentId != null) {
      setState(() => _isLoadingSubmission = true);
      try {
        final data = await _scheduleService.getStudentSubmission(widget.slot.assignmentId!);
        if (data != null) {
          setState(() {
            _submission = AssignmentSubmissionResponse.fromJson(data);
          });
        }
      } catch (e) {
        debugPrint('[SlotDetail] Error fetching submission: $e');
      } finally {
        setState(() => _isLoadingSubmission = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authController = Get.find<AuthController>();
    final isLecturer = authController.currentUser.value?.isLecturer ?? false;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark ? Theme.of(context).scaffoldBackgroundColor : null,
          gradient: Theme.of(context).brightness == Brightness.dark ? null : const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFFEF3DE),
              Colors.white,
            ],
            stops: [0.0, 0.4],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(context, isLecturer),
              Expanded(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 4.h),
                  child: Column(
                    children: [
                      _buildInfoCard(),
                      12.verticalSpace,
                      _buildContentCard(),
                      12.verticalSpace,
                      if (_hasCheckedIn) _buildSuccessCard(),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context, bool isLecturer) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 10.h),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            onPressed: () {
              Get.back(result: _hasCheckedIn != (widget.slot.attendanceStatus == 'PRESENT'));
            },
            icon: Icon(Icons.arrow_back_ios_new_rounded, color: const Color(0xFFFF6B00), size: 22.r),
          ),
          Text(
            isLecturer ? 'Chi tiết Slot dạy' : 'Chi tiết Slot học',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18.sp,
              fontWeight: FontWeight.w800,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(width: 48), // Spacer to keep title centered
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24.r),
        border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? Colors.transparent : Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.04),
            blurRadius: 15.r,
            offset: Offset(0, 4.h),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 6.h),
                decoration: BoxDecoration(
                  color: AppColors.primaryOrange.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16.r),
                ),
                child: Text(
                  'SLOT ${widget.slot.slotNumber}',
                  style: GoogleFonts.plusJakartaSans(
                    color: AppColors.primaryOrange,
                    fontWeight: FontWeight.bold,
                    fontSize: 10.sp, 
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              _buildSmallAttendanceButton(),
            ],
          ),
          12.verticalSpace,
          Text(
            widget.slot.courseCode ?? 'N/A',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 20.sp, 
              fontWeight: FontWeight.w900,
              color: Theme.of(context).colorScheme.onSurface,
              height: 1.1,
            ),
          ),
          2.verticalSpace,
          Text(
            widget.slot.courseName ?? 'N/A',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13.sp, 
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              fontWeight: FontWeight.w400,
            ),
          ),
          16.verticalSpace,
          
          Divider(height: 1, color: Theme.of(context).brightness == Brightness.dark ? Colors.grey[800] : const Color(0xFFF1F5F9)),
          8.verticalSpace,

          // Timeline Details
          Padding(
            padding: EdgeInsets.only(left: 4.w),
            child: Column(
              children: [
                // Room Row
                _buildTimelineItem(
                  icon: SolarIconsOutline.home2,
                  title: 'Phòng ${widget.slot.roomCode ?? 'Online'}',
                  isFirst: true,
                ),
                // Class Row
                _buildTimelineItem(
                  icon: SolarIconsOutline.usersGroupRounded,
                  title: 'Lớp ${_formatClassName(widget.slot.className)}',
                  onTap: () {
                    final classSection = widget.slot.classSection;
                    if (classSection != null) {
                      if (!Get.isRegistered<ClassListController>()) {
                        Get.put(ClassListController());
                      }
                      Get.find<ClassListController>().selectClass(classSection);
                      
                      final authController = Get.find<AuthController>();
                      final isLecturer = authController.currentUser.value?.isLecturer ?? false;
                      
                      if (isLecturer) {
                        Get.to(() => SlotAttendanceScreen(slot: widget.slot));
                      } else {
                        Get.to(() => StudentListScreen(classSection: classSection));
                      }
                    }
                  },
                ),
                // Time Row
                _buildTimelineItem(
                  icon: SolarIconsOutline.clockCircle,
                  title: '${_formatTime(widget.slot.startTime)} - ${_formatTime(widget.slot.endTime)}',
                  subtitle: '(2h 15m)',
                ),
                // Lecturer Row
                _buildTimelineItem(
                  icon: SolarIconsOutline.user,
                  title: 'Giảng viên ${widget.slot.lecturerName ?? 'N/A'}',
                  isLast: true,
                  onTap: () {
                    if (widget.slot.lecturerId != null) {
                      Get.to(() => LecturerInfoScreen(lecturerId: widget.slot.lecturerId!));
                    }
                  },
                ),
              ],
            ),
          ),
          
          _buildFaceGuidance(scheduleController: Get.find<ScheduleController>()),
        ],
      ),
    );
  }

  Widget _buildFaceGuidance({required ScheduleController scheduleController}) {
    final authController = Get.find<AuthController>();
    final user = authController.currentUser.value;
    final isLecturer = user?.isLecturer ?? false;
    if (isLecturer) return const SizedBox.shrink();

    final hasFace = user?.hasFaceRegistered ?? false;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!hasFace)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              '* Cần đăng ký khuôn mặt mới có thể điểm danh bằng khuôn mặt',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11.sp,
                fontStyle: FontStyle.italic,
                color: AppColors.orange600,
              ),
            ),
          ),
        if (!_hasCheckedIn)
          Obx(() {
            final config = scheduleController.attendanceConfig.value;
            final start = _getSlotDateTime(widget.slot.startTime);
            if (start == null) return const SizedBox.shrink();
            
            final threshold = widget.slot.absentThresholdMinutes ?? config.absentThresholdMinutes;
            final deadline = start.add(Duration(minutes: threshold));
            final now = scheduleController.currentTime.value;
            final isPastDeadline = now.isAfter(deadline);
            final isBeforeStart = now.isBefore(start);

            if (isBeforeStart || isPastDeadline) {
              return Padding(
                padding: EdgeInsets.only(top: 12.h),
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12.r),
                  ),
                  child: Row(
                    children: [
                      Icon(SolarIconsOutline.infoCircle, color: Colors.red, size: 14.r),
                      8.horizontalSpace,
                      Expanded(
                        child: Text(
                          isBeforeStart ? "Chưa đến giờ điểm danh" : "Đã quá thời gian điểm danh",
                          style: GoogleFonts.plusJakartaSans(
                            color: Colors.red,
                            fontSize: 12.sp,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }
            return const SizedBox.shrink();
          }),
      ],
    );
  }

  Widget _buildTimelineItem({
    required IconData icon,
    required String title,
    String? subtitle,
    bool isFirst = false,
    bool isLast = false,
    VoidCallback? onTap,
  }) {
    return IntrinsicHeight(
      child: Row(
        children: [
          Column(
            children: [
              Container(
                width: 1.5.w,
                height: 8.h,
                color: isFirst ? Colors.transparent : AppColors.primaryOrange.withOpacity(0.3),
              ),
              Container(
                padding: EdgeInsets.all(7.r),
                decoration: BoxDecoration(
                  color: AppColors.primaryOrange.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: AppColors.primaryOrange, size: 16.sp),
              ),
              Expanded(
                child: Container(
                  width: 1.5.w,
                  color: isLast ? Colors.transparent : AppColors.primaryOrange.withOpacity(0.3),
                ),
              ),
            ],
          ),
          16.horizontalSpace,
          Expanded(
            child: GestureDetector(
              onTap: onTap,
              behavior: HitTestBehavior.opaque,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  12.verticalSpace,
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w700,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                      ),
                      if (onTap != null)
                        Icon(Icons.arrow_forward_ios_rounded, size: 12.r, color: const Color(0xFF94A3B8)),
                    ],
                  ),
                  if (subtitle != null) ...[
                    2.verticalSpace,
                    Text(
                      subtitle,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11.sp,
                        color: const Color(0xFF64748B),
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                  12.verticalSpace,
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContentCard() {
    final authController = Get.find<AuthController>();
    final isLecturer = authController.currentUser.value?.isLecturer ?? false;
    final hasAssignment = widget.slot.assignmentId != null || widget.slot.assignmentTitle != null;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24.r),
        border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? Colors.transparent : Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.04),
            blurRadius: 15.r,
            offset: Offset(0, 4.h),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  hasAssignment ? (isLecturer ? 'Bài tập đã giao' : 'Bài tập được giao') : 'Nội dung bài học',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w900,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
              if (hasAssignment) ...[
                12.horizontalSpace,
                InkWell(
                  onTap: () {
                    Get.to(() => AssignmentDetailScreen(slot: widget.slot, submission: _submission, isLecturer: isLecturer), transition: Transition.rightToLeft);
                  },
                  borderRadius: BorderRadius.circular(8.r),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                    decoration: BoxDecoration(
                      color: AppColors.primaryOrange.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: AppColors.primaryOrange),
                    ),
                    child: Text(
                      'Chi tiết',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryOrange,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          12.verticalSpace,
          if (hasAssignment) ...[
            Text(
              widget.slot.assignmentTitle ?? 'Bài tập tuần',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14.sp,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF334155),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            8.verticalSpace,
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'HẠN NỘP',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 9.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                      2.verticalSpace,
                      Text(
                        DateFormat('dd/MM/yyyy').format(widget.slot.assignmentDueDate ?? widget.slot.date),
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13.sp,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isLecturer)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'TRẠNG THÁI',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 9.sp,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF94A3B8),
                          ),
                        ),
                        2.verticalSpace,
                        _isLoadingSubmission 
                          ? SizedBox(height: 12.h, width: 12.w, child: const CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryOrange))
                          : Text(
                              _submission != null && _submission!.status != 'NOT_SUBMITTED' 
                                ? _getTaskStatusText(_submission!.status) 
                                : 'Chưa nộp',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13.sp,
                                fontWeight: FontWeight.w800,
                                color: _submission != null && _submission!.status != 'NOT_SUBMITTED' 
                                  ? const Color(0xFF10B981) 
                                  : const Color(0xFFEF4444),
                              ),
                            ),
                      ],
                    ),
                  ),
              ],
            ),
          ] else ...[
            Text(
              'Không có bài học hoặc bài tập cho buổi này.',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13.sp,
                color: const Color(0xFF64748B),
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _getTaskStatusText(String? status) {
    if (status == null) return 'Không xác định';
    switch (status) {
      case 'SUBMITTED': return 'Đã nộp';
      case 'LATE_SUBMITTED': return 'Nộp trễ';
      case 'NOT_SUBMITTED': return 'Chưa nộp';
      default: return 'Chưa nộp';
    }
  }

  Widget _buildSuccessCard() {
    String timeStr = widget.slot.checkInTime != null 
        ? DateFormat('HH:mm - dd/MM/yyyy').format(widget.slot.checkInTime!)
        : DateFormat('HH:mm - dd/MM/yyyy').format(DateTime.now());

    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(vertical: 24.h),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        border: Border.all(color: const Color(0xFFE8F5E9), width: 1.5.w),
      ),
      child: Column(
        children: [
          Container(
            padding: EdgeInsets.all(12.r),
            decoration: const BoxDecoration(color: Color(0xFFE8F5E9), shape: BoxShape.circle),
            child: Icon(Icons.check_circle_rounded, color: const Color(0xFF27AE60), size: 32.r),
          ),
          12.verticalSpace,
          Text(
            'Điểm danh thành công',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18.sp,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF27AE60),
            ),
          ),
          4.verticalSpace,
          Text(
            'HOÀN TẤT LÚC $timeStr',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11.sp,
              color: const Color(0xFF94A3B8),
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSmallAttendanceButton() {
    return Obx(() {
      final authController = Get.find<AuthController>();
      final user = authController.currentUser.value;
      if (user == null || (user.isLecturer ?? false)) return const SizedBox.shrink();

      final scheduleController = Get.find<ScheduleController>();
      final now = scheduleController.currentTime.value;
      final start = _getSlotDateTime(widget.slot.startTime);
      if (start == null) return const SizedBox.shrink();
      
      if (_hasCheckedIn) return _buildStatusChip('Đã điểm danh', const Color(0xFF27AE60), Icons.check_circle_rounded);

      if (now.isBefore(start)) return _buildStatusChip('Chưa đến giờ', const Color(0xFF94A3B8), Icons.access_time_rounded);

      final threshold = widget.slot.absentThresholdMinutes ?? scheduleController.attendanceConfig.value.absentThresholdMinutes;
      if (now.isAfter(start.add(Duration(minutes: threshold)))) return _buildStatusChip('Vắng', const Color(0xFFEF4444), Icons.cancel_rounded);

      final hasFace = user.hasFaceRegistered ?? false;
      return ElevatedButton(
        onPressed: () async {
          if (!scheduleController.attendanceConfig.value.faceRecognitionEnabled) {
            Get.snackbar('Thông báo', 'Quản trị viên chưa cho phép điểm danh bằng khuôn mặt.', snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red.withOpacity(0.9), colorText: Colors.white);
            return;
          }
          if (hasFace) {
            if (widget.slot.id != null) {
              final result = await Get.to(() => FaceAttendanceView(slotId: widget.slot.id!));
              if (result == true) { setState(() => _hasCheckedIn = true); scheduleController.fetchSchedule(); }
            }
          } else { Get.to(() => const FaceRegistrationView()); }
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: hasFace ? AppColors.primaryOrange : const Color(0xFF334155),
          padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 0),
          minimumSize: Size(0, 30.h),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
          elevation: 1,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(hasFace ? Icons.camera_alt_rounded : Icons.face_retouching_natural_rounded, color: Colors.white, size: 12.r),
            6.horizontalSpace,
            Text(hasFace ? 'Điểm danh' : 'Đăng ký', style: GoogleFonts.plusJakartaSans(fontSize: 11.sp, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        ),
      );
    });
  }

  Widget _buildStatusChip(String text, Color color, IconData icon) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
      decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(10.r), border: Border.all(color: color.withOpacity(0.3), width: 1.w)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 12.r),
          4.horizontalSpace,
          Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 11.sp, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  DateTime? _getSlotDateTime(String? timeStr) {
    if (timeStr == null) return null;
    try {
      final parts = timeStr.split(':');
      return DateTime(widget.slot.date.year, widget.slot.date.month, widget.slot.date.day, int.parse(parts[0]), int.parse(parts[1]));
    } catch (e) { return null; }
  }

  String _formatTime(String? time) {
    if (time == null) return 'N/A';
    final parts = time.split(':');
    return parts.length >= 2 ? "${parts[0]}:${parts[1]}" : time;
  }

  String _formatClassName(String? className) {
    if (className == null) return 'N/A';
    final parts = className.split('-');
    return parts.isNotEmpty ? parts[0] : className;
  }
}

extension on TimetableSlot {
  ClassSection? get classSection {
    final controller = Get.find<ScheduleController>();
    return ClassSection(
      className: className ?? '',
      courseCode: courseCode ?? '',
      courseName: courseName ?? '',
      semesterCode: controller.selectedSemester.value?.code ?? '',
      semesterName: controller.selectedSemester.value?.name ?? '',
      status: 'ONGOING', // Default status for viewing student list
    );
  }
}
