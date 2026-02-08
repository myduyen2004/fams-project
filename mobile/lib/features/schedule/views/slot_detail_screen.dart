import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/app_background.dart';
import '../models/schedule_model.dart';
import '../../lecturer/models/class_section_model.dart';
import '../../lecturer/views/student_list_screen.dart';
import '../../lecturer/controllers/class_list_controller.dart';
import '../../face_attendance/views/face_attendance_view.dart';

class SlotDetailScreen extends StatelessWidget {
  final TimetableSlot slot;

  const SlotDetailScreen({super.key, required this.slot});

  @override
  Widget build(BuildContext context) {
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
                      _buildDocumentsCard(),
                      const SizedBox(height: 30), // Spacing for button
                    ],
                  ),
                ),
              ),
              _buildBottomButton(),
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
            onPressed: () => Get.back(),
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.orange),
          ),
          Text(
            'Chi tiết Slot dạy',
            style: GoogleFonts.roboto(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.more_horiz_rounded, color: Colors.orange),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'SLOT ${slot.slotNumber ?? 1}',
                      style: GoogleFonts.roboto(
                        color: const Color(0xFFFF6B00),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      slot.courseCode ?? 'COURSE',
                      style: GoogleFonts.roboto(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF2D3436),
                        height: 1.0,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      slot.courseName ?? 'Môn học',
                      style: GoogleFonts.roboto(
                        fontSize: 15,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          
          Row(
            children: [
              Expanded(child: _buildSimpleDetail('PHÒNG HỌC', slot.roomCode ?? 'Online')),
              const SizedBox(width: 16),
              Expanded(child: _buildSimpleDetail('LỚP HỌC', slot.className ?? 'Unknown')),
            ],
          ),
          const SizedBox(height: 24),
          _buildSimpleDetail('THỜI GIAN', '${_formatTime(slot.startTime)} - ${_formatTime(slot.endTime)}', subValue: '(2h 15m)'),
          const SizedBox(height: 24),
          _buildSimpleDetail('GIẢNG VIÊN', slot.lecturerName ?? 'Unknown'),
        ],
      ),
    );
  }

  Widget _buildSimpleDetail(String label, String value, {String? subValue}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.roboto(
            fontSize: 11,
            color: Colors.grey[400],
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            Flexible(
              child: Text(
                value,
                style: GoogleFonts.roboto(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF2D3436),
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
            if (subValue != null) ...[
              const SizedBox(width: 6),
              Text(
                subValue,
                style: GoogleFonts.roboto(
                  fontSize: 14,
                  color: Colors.grey[500],
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }


  Widget _buildContentCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
         boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Nội dung bài học',
            style: GoogleFonts.roboto(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF2D3436),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Giới thiệu về các nguyên tắc kế toán cơ bản, cách lập bảng cân đối kế toán và báo cáo kết quả hoạt động kinh doanh. Sinh viên cần chuẩn bị trước chương 1 và chương 2 trong giáo trình.',
            style: GoogleFonts.roboto(
              fontSize: 14,
              color: Colors.grey[600],
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
         boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Tài liệu đính kèm',
                style: GoogleFonts.roboto(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF2D3436),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE0B2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '3 FILES',
                  style: GoogleFonts.roboto(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFFFF6B00),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildFileItem(icon: Icons.picture_as_pdf_rounded, name: 'Slide_Chapter_1.pdf', size: '2.4 MB', color: const Color(0xFFFFEBEE), iconColor: Colors.red),
          const SizedBox(height: 10),
          _buildFileItem(icon: Icons.article_rounded, name: 'Exercises_W1.docx', size: '1.1 MB', color: const Color(0xFFE3F2FD), iconColor: Colors.blue),
        ],
      ),
    );
  }

  Widget _buildFileItem({required IconData icon, required String name, required String size, required Color color, required Color iconColor}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.roboto(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                Text(
                  size,
                  style: GoogleFonts.roboto(
                    fontSize: 12,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.download_rounded, color: Color(0xFFFF6B00)),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomButton() {
    return Container(
      padding: const EdgeInsets.all(20),
      color: Colors.transparent, // Background handles it? no, SafeArea wrapper.
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Face Attendance Button
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: () {
                if (slot.id != null) {
                  Get.to(() => FaceAttendanceView(slotId: slot.id!));
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange, // Use orange for consistency
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 5,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.face_retouching_natural, color: Colors.white),
                  const SizedBox(width: 10),
                  Text(
                    'Quét mặt điểm danh',
                    style: GoogleFonts.roboto(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Lecturer Button (Student List)
          SizedBox(
            width: double.infinity,
            height: 56,
        child: ElevatedButton(
          onPressed: () {
            // Create dummy ClassSection to navigate
            final classSection = ClassSection(
              className: slot.className ?? '',
              courseCode: slot.courseCode ?? '',
              courseName: slot.courseName ?? '',
              semesterCode: '',
              semesterName: '',
              status: 'ONGOING',
            );
            
            // Ensure controller is ready (it should be persistent or lazy put)
            if (!Get.isRegistered<ClassListController>()) {
              Get.put(ClassListController());
            }
            // Populate student list
            Get.find<ClassListController>().selectClass(classSection);
            
            Get.to(() => StudentListScreen(classSection: classSection));
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFF6B00),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            elevation: 5,
            shadowColor: const Color(0xFFFF6B00).withOpacity(0.4),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.list_alt_rounded, color: Colors.white),
              const SizedBox(width: 10),
              Text(
                'Danh sách sinh viên',
                style: GoogleFonts.roboto(
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
}
