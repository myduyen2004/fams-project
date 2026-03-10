import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart' hide TextDirection;
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/app_background.dart';
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
import 'package:flutter_screenutil/flutter_screenutil.dart';

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

    // Only fetch submission for student and if assignment exists
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
      body: AppBackground(
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(context, isLecturer),
              Expanded(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 10.h),
                  child: Column(
                    children: [
                      _buildInfoCard(),
                      16.verticalSpace,
                      _buildContentCard(),
                      16.verticalSpace,
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
              // If we checked in, trigger a refresh in the parent when going back
              Get.back(result: _hasCheckedIn != (widget.slot.attendanceStatus == 'PRESENT'));
            },
            icon: Icon(Icons.arrow_back_ios_new_rounded, color: const Color(0xFFFF6B00), size: 24.r),
          ),
          Text(
            isLecturer ? 'Chi tiết Slot dạy' : 'Chi tiết Slot học',
            style: GoogleFonts.inter(
              fontSize: 20.sp,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF2D3436),
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.more_horiz_rounded, color: const Color(0xFF636E72), size: 24.r),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 20.r,
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
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 6.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF4E6),
                  borderRadius: BorderRadius.circular(20.r),
                ),
                child: Text(
                  'SLOT ${widget.slot.slotNumber}',
                  style: GoogleFonts.inter(
                    color: const Color(0xFFFF922B),
                    fontWeight: FontWeight.bold,
                    fontSize: 12.sp,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              _buildSmallAttendanceButton(),
            ],
          ),
          16.verticalSpace,
          Text(
            widget.slot.courseCode ?? 'N/A',
            style: GoogleFonts.inter(
              fontSize: 32.sp,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF1E293B),
              height: 1.1,
            ),
          ),
          4.verticalSpace,
          Text(
            widget.slot.courseName ?? 'N/A',
            style: GoogleFonts.inter(
              fontSize: 16.sp,
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w400,
            ),
          ),
          24.verticalSpace,
          
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          20.verticalSpace,

          Row(
            children: [
              Expanded(child: _buildSimpleDetail('PHÒNG HỌC', widget.slot.roomCode ?? 'Online')),
              const SizedBox(width: 16),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    final classSection = widget.slot.classSection;
                    if (classSection != null) {
                      if (!Get.isRegistered<ClassListController>()) {
                        Get.put(ClassListController());
                      }
                      Get.find<ClassListController>().selectClass(classSection);
                      Get.to(() => StudentListScreen(classSection: classSection));
                    }
                  },
                  child: Container(
                    color: Colors.transparent,
                    child: _buildSimpleDetail(
                      'LỚP HỌC', 
                      _formatClassName(widget.slot.className),
                      extra: Icon(Icons.arrow_forward_ios_rounded, size: 12.r, color: const Color(0xFF94A3B8)),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _buildSimpleDetail(
                  'THỜI GIAN', 
                  '${_formatTime(widget.slot.startTime)} - ${_formatTime(widget.slot.endTime)}', 
                  extra: Text(
                    '(2h 15m)',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (widget.slot.lecturerId != null) {
                      Get.to(() => LecturerInfoScreen(lecturerId: widget.slot.lecturerId!));
                    }
                  },
                  child: Container(
                    color: Colors.transparent, // Ensure whole area is clickable
                    child: _buildSimpleDetail(
                      'GIẢNG VIÊN', 
                      widget.slot.lecturerName ?? 'N/A',
                      extra: const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Color(0xFF94A3B8)),
                    ),
                  ),
                ),
              ),
            ],
          ),
          
          // User Registration Guidance & Time Warning (Students only)
          Obx(() {
            final authController = Get.find<AuthController>();
            final user = authController.currentUser.value;
            final isLecturer = user?.isLecturer ?? false;
            
            if (isLecturer) return const SizedBox.shrink();

            final hasFace = user?.hasFaceRegistered ?? false;
            final isDuringTime = _isDuringSlotTime();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!hasFace)
                  Padding(
                    padding: const EdgeInsets.only(top: 20),
                    child: Text(
                      '* Cần đăng ký khuôn mặt mới có thể điểm danh bằng khuôn mặt',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontStyle: FontStyle.italic,
                        color: AppColors.orange600,
                      ),
                    ),
                  ),
                if (!_hasCheckedIn && !isDuringTime)
                  Padding(
                    padding: EdgeInsets.only(top: 16.h),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12.r),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.info_outline, color: Colors.red, size: 16.r),
                          8.horizontalSpace,
                          Expanded(
                            child: Text(
                              _getTimeStatusMessage(),
                              style: GoogleFonts.inter(
                                color: Colors.red,
                                fontSize: 13.sp,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildSimpleDetail(String label, String value, {Widget? extra}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11.sp,
            color: const Color(0xFF94A3B8),
            fontWeight: FontWeight.bold,
            letterSpacing: 0.8,
          ),
        ),
        8.verticalSpace,
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Flexible(
              child: Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF334155),
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (extra != null) ...[
              8.horizontalSpace,
              extra,
            ],
          ],
        ),
      ],
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(32.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 20.r,
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
                  style: GoogleFonts.inter(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF1E293B),
                  ),
                ),
              ),
              if (hasAssignment) ...[
                12.horizontalSpace,
                InkWell(
                  onTap: () {
                    Get.to(
                      () => AssignmentDetailScreen(
                        slot: widget.slot,
                        submission: _submission,
                        isLecturer: isLecturer,
                      ),
                      transition: Transition.rightToLeft,
                    );
                  },
                  borderRadius: BorderRadius.circular(8.r),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: AppColors.primaryOrange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: AppColors.primaryOrange),
                    ),
                    child: Text(
                      'Chi tiết',
                      style: GoogleFonts.inter(
                        fontSize: 13.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryOrange,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          16.verticalSpace,
          if (hasAssignment) ...[
            Text(
              widget.slot.assignmentTitle ?? 'Bài tập tuần',
              style: GoogleFonts.inter(
                fontSize: 15.sp,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF334155),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            12.verticalSpace,
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'HẠN NỘP',
                        style: GoogleFonts.inter(
                          fontSize: 10.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                      4.verticalSpace,
                      Text(
                        DateFormat('dd/MM/yyyy').format(widget.slot.assignmentDueDate ?? widget.slot.date),
                        style: GoogleFonts.inter(
                          fontSize: 14.sp,
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
                          style: GoogleFonts.inter(
                            fontSize: 10.sp,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF94A3B8),
                          ),
                        ),
                        4.verticalSpace,
                        _isLoadingSubmission 
                          ? SizedBox(height: 14.h, width: 14.w, child: const CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryOrange))
                          : Text(
                              _submission != null && _submission!.status != 'NOT_SUBMITTED' 
                                ? _getTaskStatusText(_submission!.status) 
                                : 'Chưa nộp',
                              style: GoogleFonts.inter(
                                fontSize: 14.sp,
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
              style: GoogleFonts.inter(
                fontSize: 14,
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
      case 'SUBMITTED':
        return 'Đã nộp';
      case 'LATE_SUBMITTED':
        return 'Nộp trễ';
      case 'NOT_SUBMITTED':
        return 'Chưa nộp';
      default:
        return 'Chưa nộp';
    }
  }


  Widget _buildSuccessCard() {
    String timeStr = 'N/A';
    if (widget.slot.checkInTime != null) {
      timeStr = DateFormat('HH:mm - dd/MM/yyyy').format(widget.slot.checkInTime!);
    } else if (_hasCheckedIn) {
      // If we just checked in, show current time
      timeStr = DateFormat('HH:mm - dd/MM/yyyy').format(DateTime.now());
    }

    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(vertical: 32.h),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32.r),
        border: Border.all(color: const Color(0xFFE8F5E9), width: 2.w),
      ),
      child: Column(
        children: [
          Container(
            padding: EdgeInsets.all(16.r),
            decoration: const BoxDecoration(
              color: Color(0xFFE8F5E9),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.check_circle_rounded,
              color: const Color(0xFF27AE60),
              size: 40.r,
            ),
          ),
          16.verticalSpace,
          Text(
            'Điểm danh thành công',
            style: GoogleFonts.inter(
              fontSize: 20.sp,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF27AE60),
            ),
          ),
          8.verticalSpace,
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.access_time_filled_rounded, size: 16.r, color: const Color(0xFF94A3B8)),
              6.horizontalSpace,
              Text(
                'HOÀN TẤT LÚC $timeStr',
                style: GoogleFonts.inter(
                  fontSize: 12.sp,
                  color: const Color(0xFF94A3B8),
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
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

      final hasFace = user.hasFaceRegistered ?? false;
      final scheduleController = Get.find<ScheduleController>();
      final config = scheduleController.attendanceConfig.value;
      final faceEnabled = config.faceRecognitionEnabled;
      final threshold = config.absentThresholdMinutes;
      
      if (_hasCheckedIn) {
        return _buildStatusChip('Đã điểm danh', const Color(0xFF27AE60), Icons.check_circle_rounded);
      }

      final now = DateTime.now();
      final start = _getSlotDateTime(widget.slot.startTime);
      
      if (start == null) return const SizedBox.shrink();

      // If before start time
      if (now.isBefore(start)) {
        return _buildStatusChip('Chưa đến giờ', const Color(0xFF94A3B8), Icons.access_time_rounded);
      }

      // Check if past the attendance threshold
      final lateDeadline = start.add(Duration(minutes: threshold));
      if (now.isAfter(lateDeadline)) {
        return _buildStatusChip('Vắng', const Color(0xFFEF4444), Icons.cancel_rounded);
      }

      // Within attendance window - Show Button
      return ElevatedButton(
        onPressed: () async {
          if (!faceEnabled) {
            Get.snackbar(
              'Thông báo',
              'Quản trị viên chưa cho phép điểm danh bằng khuôn mặt cho hệ thống này.',
              snackPosition: SnackPosition.BOTTOM,
              backgroundColor: Colors.red.withOpacity(0.9),
              colorText: Colors.white,
              icon: const Icon(Icons.lock_outline_rounded, color: Colors.white),
            );
            return;
          }

          if (hasFace) {
            if (widget.slot.id != null) {
              final result = await Get.to(() => FaceAttendanceView(slotId: widget.slot.id!));
              if (result == true) {
                setState(() => _hasCheckedIn = true);
                if (Get.isRegistered<ScheduleController>()) {
                  Get.find<ScheduleController>().fetchSchedule();
                }
              }
            }
          } else {
            Get.to(() => const FaceRegistrationView());
          }
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: hasFace ? AppColors.primaryOrange : const Color(0xFF334155),
          padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 0),
          minimumSize: Size(0, 32.h),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12.r),
          ),
          elevation: 2,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              hasFace ? Icons.camera_alt_rounded : Icons.face_retouching_natural_rounded, 
              color: Colors.white, 
              size: 14.r,
            ),
            6.horizontalSpace,
            Text(
              hasFace ? 'Điểm danh' : 'Đăng ký khuôn mặt',
              style: GoogleFonts.inter(
                fontSize: 12.sp,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildStatusChip(String text, Color color, IconData icon) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: color.withOpacity(0.5), width: 1.w),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14.r),
          6.horizontalSpace,
          Text(
            text,
            style: GoogleFonts.inter(
              fontSize: 12.sp,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  DateTime? _getSlotDateTime(String? timeStr) {
    if (timeStr == null) return null;
    try {
      final parts = timeStr.split(':');
      if (parts.length < 2) return null;
      return DateTime(
        widget.slot.date.year,
        widget.slot.date.month,
        widget.slot.date.day,
        int.parse(parts[0]),
        int.parse(parts[1]),
      );
    } catch (e) {
      return null;
    }
  }

  String _formatTime(String? time) {
    if (time == null) return 'N/A';
    final parts = time.split(':');
    if (parts.length >= 2) {
      return "${parts[0]}:${parts[1]}";
    }
    return time;
  }

  bool _isDuringSlotTime() {
    final now = DateTime.now();
    final start = _getSlotDateTime(widget.slot.startTime);
    final end = _getSlotDateTime(widget.slot.endTime);
    
    if (start == null || end == null) return false;
    
    return now.isAfter(start) && now.isBefore(end);
  }

  String _getTimeStatusMessage() {
    final now = DateTime.now();
    if (!_isSameDay(now, widget.slot.date)) {
      return "Không đúng ngày điểm danh";
    }
    
    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
    if (timeStr.compareTo(widget.slot.startTime!) < 0) {
      return "Chưa đến giờ học";
    } else {
      return "Buổi học đã kết thúc";
    }
  }

  bool _isSameDay(DateTime d1, DateTime d2) {
    return d1.year == d2.year && d1.month == d2.month && d1.day == d2.day;
  }

  String _formatClassName(String? className) {
    if (className == null) return 'N/A';
    final parts = className.split('-');
    return parts.isNotEmpty ? parts[0] : className;
  }
}

extension on TimetableSlot {
  ClassSection? get classSection {
    return ClassSection(
      className: className ?? '',
      courseCode: courseCode ?? '',
      courseName: courseName ?? '',
      semesterCode: '',
      semesterName: '',
      status: 'ONGOING',
    );
  }
}
