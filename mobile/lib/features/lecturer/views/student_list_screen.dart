import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/class_list_controller.dart';
import '../models/class_section_model.dart';
import '../../../core/constants/api_constants.dart';
import 'student_detail_screen.dart';

class StudentListScreen extends StatefulWidget {
  final ClassSection classSection;

  const StudentListScreen({super.key, required this.classSection});

  @override
  State<StudentListScreen> createState() => _StudentListScreenState();
}

class _StudentListScreenState extends State<StudentListScreen> {
  final ClassListController controller = Get.find<ClassListController>();
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    // Reset search when entering screen
    controller.searchStudents('');
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7EDE4),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            _buildHeader(),

            // Student Count
            _buildStudentCountHeader(),

            // Student List
            Expanded(
              child: Obx(() {
                if (controller.isLoading.value && controller.students.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFFEF7623)),
                  );
                }

                if (controller.errorMessage.value.isNotEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          controller.errorMessage.value,
                          style: GoogleFonts.inter(color: Colors.red),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => controller.fetchStudents(
                            widget.classSection.className,
                          ),
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  );
                }

                if (controller.filteredStudents.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 48,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _isSearching ? 'Không tìm thấy sinh viên nào' : 'Chưa có sinh viên',
                          style: GoogleFonts.inter(
                            color: Colors.grey[600],
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () =>
                      controller.fetchStudents(widget.classSection.className),
                  color: const Color(0xFFEF7623),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: controller.filteredStudents.length,
                    itemBuilder: (context, index) {
                      return _buildStudentCard(
                        controller.filteredStudents[index],
                        index + 1,
                      );
                    },
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Get.back(),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: const Icon(Icons.arrow_back, color: Colors.black87),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: _isSearching 
              ? Container(
                  height: 46,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    autofocus: true,
                    onChanged: (val) => controller.searchStudents(val),
                    decoration: InputDecoration(
                      hintText: 'Tìm tên hoặc mã SV...',
                      hintStyle: GoogleFonts.inter(color: Colors.grey[400], fontSize: 14),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.close, color: Colors.grey),
                        onPressed: () {
                          _searchController.clear();
                          controller.searchStudents('');
                        },
                      ),
                    ),
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _extractClassCode(widget.classSection.className),
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.classSection.courseCode} - ${widget.classSection.courseName}',
                      style: GoogleFonts.roboto(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Colors.grey[600],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  ),
          ),
          const SizedBox(width: 16),
          GestureDetector(
            onTap: () {
              setState(() {
                _isSearching = !_isSearching;
                if (!_isSearching) {
                  _searchController.clear();
                  controller.searchStudents('');
                }
              });
            },
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: _isSearching ? const Color(0xFFEF7623) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Icon(
                _isSearching ? Icons.close : Icons.search,
                color: _isSearching ? Colors.white : const Color(0xFFEF7623),
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Chat Group Button
          Obx(() {
            final classSection = controller.selectedClass.value;
            if (classSection == null) return const SizedBox.shrink();

            final chatGroup = controller.getChatGroupForClass(classSection);
            final hasGroup = chatGroup != null;
            return GestureDetector(
              onTap: () {
                if (hasGroup) {
                  controller.goToChat(chatGroup.id);
                } else {
                  controller.createGroupChat(classSection);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: hasGroup
                      ? const Color(0xFF4CAF50)
                      : const Color(0xFFEF7623).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: hasGroup
                      ? null
                      : Border.all(color: const Color(0xFFEF7623), width: 1),
                  boxShadow: hasGroup
                      ? [
                          BoxShadow(
                            color: Colors.green.withOpacity(0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  children: [
                    Icon(
                      hasGroup ? Icons.chat_rounded : Icons.chat_outlined,
                      color: hasGroup ? Colors.white : const Color(0xFFEF7623),
                      size: 18,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      hasGroup ? 'Vào nhóm' : 'Tạo nhóm',
                      style: GoogleFonts.roboto(
                        color: hasGroup
                            ? Colors.white
                            : const Color(0xFFEF7623),
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildStudentCountHeader() {
    return Obx(() => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'TẤT CẢ SINH VIÊN',
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          Text(
            '${controller.filteredStudents.length} Sinh viên',
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: const Color(0xFFEF7623),
            ),
          ),
        ],
        ),
      ),
    );
  }

  Widget _buildStudentCard(Enrollment student, int index) {
    return GestureDetector(
      onTap: () => Get.to(() => StudentDetailScreen(student: student)),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Number Badge
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  '$index',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[700],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Avatar with Online Badge
            Stack(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFFF7EDE4),
                    border: Border.all(
                      color: const Color(0xFFEF7623).withOpacity(0.3),
                      width: 2,
                    ),
                  ),
                  child: ClipOval(child: _buildAvatarImage(student.avatar)),
                ),
                // Blinking Online Badge
                const Positioned(right: 0, bottom: 0, child: _OnlineBadge()),
              ],
            ),
            const SizedBox(width: 14),

            // Student Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    student.studentName,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    student.studentCode,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),

            const Icon(Icons.chevron_right, color: Color(0xFFEF7623)),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarImage(String? avatarUrl) {
    if (avatarUrl == null || avatarUrl.isEmpty) {
      return _buildAvatarPlaceholder();
    }

    String fullUrl = avatarUrl;
    if (!avatarUrl.startsWith('http')) {
      fullUrl = '${ApiConstants.baseUrl}$avatarUrl';
    }

    return Image.network(
      fullUrl,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => _buildAvatarPlaceholder(),
    );
  }

  Widget _buildAvatarPlaceholder() {
    return Container(
      color: const Color(0xFFFFE0B2),
      child: const Icon(Icons.person, color: Color(0xFFEF7623), size: 28),
    );
  }

  String _extractClassCode(String className) {
    if (className.contains('-')) {
      return className.split('-').first;
    }
    return className;
  }
}

class _OnlineBadge extends StatefulWidget {
  const _OnlineBadge();

  @override
  State<_OnlineBadge> createState() => _OnlineBadgeState();
}

class _OnlineBadgeState extends State<_OnlineBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: const Color(0xFF4CAF50),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [
              // Inner solid glow
              BoxShadow(
                color: Colors.green.withOpacity(0.6),
                blurRadius: 2,
                spreadRadius: 0,
              ),
              // Breathing outer blur ("blur blur mờ mờ nháy")
              BoxShadow(
                color: Colors.green.withOpacity(
                  0.4 * (1 - _animation.value * 0.5),
                ),
                blurRadius: 4 + (_animation.value * 6), // 4 -> 10
                spreadRadius: 1 + (_animation.value * 3), // 1 -> 4
              ),
            ],
          ),
        );
      },
    );
  }
}
