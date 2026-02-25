import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/app_background.dart';
import '../models/schedule_model.dart';
import '../../lecturer/models/class_section_model.dart';
import '../../lecturer/views/student_list_screen.dart';
import '../../lecturer/controllers/class_list_controller.dart';
import '../../face_attendance/views/face_attendance_view.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../face_recognition/views/face_registration_view.dart';
import '../controllers/schedule_controller.dart';

class SlotDetailScreen extends StatefulWidget {
  final TimetableSlot slot;

  const SlotDetailScreen({super.key, required this.slot});

  @override
  State<SlotDetailScreen> createState() => _SlotDetailScreenState();
}

class _SlotDetailScreenState extends State<SlotDetailScreen> {
  late bool _hasCheckedIn;

  @override
  void initState() {
    super.initState();
    _hasCheckedIn = widget.slot.attendanceStatus == 'PRESENT';
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
              _buildAppBar(context),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  child: Column(
                    children: [
                      _buildInfoCard(),
                      const SizedBox(height: 16),
                      _buildContentCard(),
                      const SizedBox(height: 16),
                      if (_hasCheckedIn) _buildSuccessCard(),
                    ],
                  ),
                ),
              ),
              _buildBottomButtons(isLecturer, _hasCheckedIn),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            onPressed: () {
              // If we checked in, trigger a refresh in the parent when going back
              Get.back(result: _hasCheckedIn != (widget.slot.attendanceStatus == 'PRESENT'));
            },
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFFFF6B00)),
          ),
          Text(
            'Chi tiết Slot dạy',
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF2D3436),
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.more_horiz_rounded, color: Color(0xFF636E72)),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF4E6),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'SLOT ${widget.slot.slotNumber}',
              style: GoogleFonts.inter(
                color: const Color(0xFFFF922B),
                fontWeight: FontWeight.bold,
                fontSize: 12,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            widget.slot.courseCode ?? 'N/A',
            style: GoogleFonts.inter(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF1E293B),
              height: 1.1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            widget.slot.courseName ?? 'N/A',
            style: GoogleFonts.inter(
              fontSize: 16,
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w400,
            ),
          ),
          const SizedBox(height: 32),
          
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 24),

          Row(
            children: [
              Expanded(child: _buildSimpleDetail('PHÒNG HỌC', widget.slot.roomCode ?? 'Online')),
              const SizedBox(width: 16),
              Expanded(child: _buildSimpleDetail('LỚP HỌC', widget.slot.className ?? 'N/A')),
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
              Expanded(child: _buildSimpleDetail('GIẢNG VIÊN', widget.slot.lecturerName ?? 'N/A')),
            ],
          ),
          
          // User Registration Guidance
          Obx(() {
            final authController = Get.find<AuthController>();
            final hasFace = authController.currentUser.value?.hasFaceRegistered ?? false;
            
            if (!hasFace) {
              return Padding(
                padding: const EdgeInsets.only(top: 20),
                child: Text(
                  '* Cần đăng ký khuôn mặt mới có thể điểm danh bằng khuôn mặt',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontStyle: FontStyle.italic,
                    color: AppColors.orange600,
                  ),
                ),
              );
            }
            return const SizedBox.shrink();
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
            fontSize: 11,
            color: const Color(0xFF94A3B8),
            fontWeight: FontWeight.bold,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Flexible(
              child: Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF334155),
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (extra != null) ...[
              const SizedBox(width: 8),
              extra,
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildContentCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Nội dung bài học',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Giới thiệu về các nguyên tắc kế toán cơ bản, cách lập bảng cân đối kế toán và báo cáo kết quả hoạt động kinh doanh. Sinh viên cần chuẩn bị trước chương 1 và chương 2 trong giáo trình.',
            style: GoogleFonts.inter(
              fontSize: 14,
              color: const Color(0xFF64748B),
              height: 1.6,
            ),
          ),
        ],
      ),
    );
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
      padding: const EdgeInsets.symmetric(vertical: 32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: const Color(0xFFE8F5E9), width: 2),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF27AE60),
              size: 40,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Điểm danh thành công',
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF27AE60),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.access_time_filled_rounded, size: 16, color: Color(0xFF94A3B8)),
              const SizedBox(width: 6),
              Text(
                'HOÀN TẤT LÚC $timeStr',
                style: GoogleFonts.inter(
                  fontSize: 12,
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

  Widget _buildBottomButtons(bool isLecturer, bool hasCheckedIn) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          Obx(() {
            final authController = Get.find<AuthController>();
            final hasFace = authController.currentUser.value?.hasFaceRegistered ?? false;
            
            final scheduleController = Get.find<ScheduleController>();
            final config = scheduleController.attendanceConfig.value;
            final faceEnabled = config.faceRecognitionEnabled;
            
            Color buttonColor;
            bool isDuringTime = _isDuringSlotTime();
            
            if (hasCheckedIn) {
              buttonColor = const Color(0xFF27AE60);
            } else if (!faceEnabled) {
              buttonColor = const Color(0xFF64748B); // Slate/Grey for admin disabled
            } else if (!isDuringTime) {
              buttonColor = const Color(0xFF94A3B8); // Grey for out of time
            } else {
              buttonColor = hasFace ? AppColors.primaryOrange : const Color(0xFF334155);
            }

            return Column(
              children: [
                if (!hasCheckedIn && !isDuringTime) ...[
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.info_outline, color: Colors.red, size: 16),
                          const SizedBox(width: 8),
                          Text(
                            _getTimeStatusMessage(),
                            style: GoogleFonts.inter(
                              color: Colors.red,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                Container(
                  width: double.infinity,
                  height: 58,
                  decoration: BoxDecoration(
                    color: buttonColor,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      if (hasCheckedIn || (isDuringTime))
                      BoxShadow(
                        color: buttonColor.withOpacity(0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                  onPressed: hasCheckedIn ? null : () async {
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

                      if (!isDuringTime) {
                        // Keep current behavior for out of time if needed, 
                        // but user specifically mentioned admin-disabled message.
                        return;
                      }

                      if (hasFace) {
                        if (widget.slot.id != null) {
                          final result = await Get.to(() => FaceAttendanceView(slotId: widget.slot.id!));
                          if (result == true) {
                            setState(() {
                              _hasCheckedIn = true;
                            });
                            // Also trigger a schedule refresh in background
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
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      disabledBackgroundColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          hasCheckedIn 
                            ? Icons.check_circle_rounded 
                            : (hasFace ? Icons.sentiment_satisfied_alt_rounded : Icons.face_retouching_natural_rounded), 
                          color: Colors.white, 
                          size: 24
                        ),
                        const SizedBox(width: 10),
                        Text(
                          hasCheckedIn 
                            ? 'Đã điểm danh' 
                            : (hasFace ? 'Bắt đầu điểm danh' : 'Đăng ký khuôn mặt'),
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          }),
          const SizedBox(height: 12),
          
          Container(
            width: double.infinity,
            height: 58,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: ElevatedButton(
              onPressed: () {
                final classSection = widget.slot.classSection;
                if (classSection != null) {
                  if (!Get.isRegistered<ClassListController>()) {
                    Get.put(ClassListController());
                  }
                  Get.find<ClassListController>().selectClass(classSection);
                  Get.to(() => StudentListScreen(classSection: classSection));
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.people_alt_rounded, color: Color(0xFF1E293B), size: 24),
                  const SizedBox(width: 10),
                  Text(
                    'Danh sách sinh viên',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1E293B),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
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
    return true; // TEMPORARILY ENABLED FOR TESTING
    /*
    if (widget.slot.startTime == null || widget.slot.endTime == null) return false;
    
    final now = DateTime.now();
    // Check Date
    if (!_isSameDay(now, widget.slot.date)) return false;
    
    // Check Time
    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
    return timeStr.compareTo(widget.slot.startTime!) >= 0 && timeStr.compareTo(widget.slot.endTime!) <= 0;
    */
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
