import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/student_grade_controller.dart';
import '../models/student_grade_model.dart';

/// Screen 2: Detailed grade breakdown for a specific course/class
/// Redesigned to have a table-like layout similar to the web version.
class GradeDetailScreen extends StatelessWidget {
  const GradeDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<StudentGradeController>();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Chi tiết điểm',
          style: GoogleFonts.inter(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: AppColors.primaryOrange,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Get.back(),
        ),
      ),
      body: Obx(() {
        if (controller.isLoadingDetail.value) {
          return const Center(
            child: CircularProgressIndicator(color: AppColors.primaryOrange),
          );
        }

        final detail = controller.gradeDetail.value;
        if (detail == null) {
          return _buildErrorView(controller);
        }

        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildCourseHeader(detail),
              _buildSummaryHeader(detail),
              const SizedBox(height: 16),
              _buildGradeTable(detail, controller),
              const SizedBox(height: 40),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildCourseHeader(StudentGradeDetailResponse detail) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
      decoration: const BoxDecoration(
        color: Colors.white,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primaryOrange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              detail.courseCode,
              style: GoogleFonts.inter(
                color: AppColors.primaryOrange,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            detail.className,
            style: GoogleFonts.inter(
              color: Colors.grey.shade800,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGradeTable(
      StudentGradeDetailResponse detail, StudentGradeController controller) {
    final sortedCategories =
        controller.sortedCategories(detail.gradeCategories);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // Table Header
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFFF9F43), Color(0xFFE25314)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: _headerText('Mục điểm'),
                ),
                Expanded(
                  flex: 1,
                  child: _headerText('Trọng số', align: TextAlign.center),
                ),
                Expanded(
                  flex: 1,
                  child: _headerText('Điểm', align: TextAlign.center),
                ),
                Expanded(
                  flex: 2,
                  child: _headerText('Ghi chú'),
                ),
              ],
            ),
          ),

          // Table Content
          ...sortedCategories.map((category) {
            return Column(
              children: [
                // Category Row (Sub-header)
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                  color: Colors.grey.shade50,
                  child: Text(
                    category.categoryName.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                // Item Rows
                ...controller.sortedItems(category.items).map((item) {
                  final isTotal = item.itemName == 'Total';
                  return Container(
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: Colors.grey.shade100),
                      ),
                      color: isTotal ? Colors.orange.shade50.withOpacity(0.3) : null,
                    ),
                    padding:
                        const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: Text(
                            isTotal ? 'Tổng' : item.itemName,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
                              fontStyle: isTotal ? FontStyle.italic : null,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 1,
                          child: Text(
                            '${item.weight.toInt()}%',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 1,
                          child: Text(
                            controller.formatGrade(item.value, item.isPublished),
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: _getGradeColor(item),
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 2,
                          child: Text(
                            item.comment ?? '-',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _headerText(String text, {TextAlign align = TextAlign.left}) {
    return Text(
      text.toUpperCase(),
      textAlign: align,
      style: GoogleFonts.inter(
        color: Colors.white,
        fontSize: 11,
        fontWeight: FontWeight.bold,
        letterSpacing: 0.5,
      ),
    );
  }

  Color _getGradeColor(GradeItem item) {
    if (!item.isPublished) return Colors.grey.shade400;
    if (item.value != null && item.value! < 5) return Colors.red.shade600;
    return AppColors.textPrimary;
  }

  Widget _buildSummaryHeader(StudentGradeDetailResponse detail) {
    final status = detail.courseStatus;
    final statusColor = status == 'PASSED'
        ? Colors.green.shade600
        : status == 'FAILED'
            ? Colors.red.shade600
            : Colors.orange.shade600;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'TỔNG ĐIỂM MÔN HỌC',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade700,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      'TRUNG BÌNH',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      detail.courseAverage?.toStringAsFixed(1) ?? '-',
                      style: GoogleFonts.inter(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              Container(height: 40, width: 1, color: Colors.grey.shade200),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      'TRẠNG THÁI',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      status,
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView(StudentGradeController controller) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 60, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            'Không thể tải dữ liệu điểm',
            style: GoogleFonts.inter(fontSize: 16, color: Colors.grey),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => controller.fetchCourses(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryOrange,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Thử lại', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
