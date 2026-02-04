import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/api_constants.dart';
import '../models/class_section_model.dart';

class StudentDetailScreen extends StatelessWidget {
  final Enrollment student;

  const StudentDetailScreen({super.key, required this.student});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFFFE0B2), // Orange 100 - Warmer orange tone
              Color(0xFFF7EDE4), // Cream Base
            ],
            stops: [0.0, 0.4],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Custom Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildCircleButton(
                    icon: Icons.chevron_left,
                    onTap: () => Get.back(),
                  ),
                  Text(
                    'Hồ Sơ Sinh Viên',
                    style: GoogleFonts.roboto(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  _buildCircleButton(
                    icon: Icons.edit,
                    onTap: () {}, // View only for now
                  ),
                ],
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 10),
                    // Avatar & Name Section
                    _buildProfileSection(),
                    
                    const SizedBox(height: 30),
                    
                    // Personal Info
                    _buildSectionTitle('Thông tin cá nhân'),
                    const SizedBox(height: 12),
                    _buildPersonalInfoCard(),

                    const SizedBox(height: 24),

                    // Academic Info
                    _buildSectionTitle('Thông tin đào tạo'),
                    const SizedBox(height: 12),
                    _buildAcademicInfoCard(),
                    
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _buildCircleButton({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(icon, color: const Color(0xFFEF7623), size: 20),
      ),
    );
  }

  Widget _buildProfileSection() {
    return Column(
      children: [
        Stack(
          children: [
            Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 4),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: ClipOval(
                child: _buildAvatarImage(student.avatar),
              ),
            ),
            Positioned(
              right: 2,
              bottom: 2,
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFFEF7623),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: const Icon(Icons.check, color: Colors.white, size: 18),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          student.studentName,
          style: GoogleFonts.roboto(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        Text(
          'MSSV: ${student.studentCode}',
          style: GoogleFonts.roboto(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: const Color(0xFFEF7623),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildBadge('ĐANG HỌC', const Color(0xFFE8F5E9), const Color(0xFF4CAF50)),
            // Removed Year Badge as requested
          ],
        ),
      ],
    );
  }

  Widget _buildBadge(String text, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: GoogleFonts.roboto(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title,
        style: GoogleFonts.roboto(
          fontSize: 17,
          fontWeight: FontWeight.bold,
          color: Colors.black87,
        ),
      ),
    );
  }

  Widget _buildPersonalInfoCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildInfoRow(
            icon: Icons.email_outlined,
            title: 'Email',
            value: student.email,
            isEmail: true,
          ),
          _buildDivider(),
          _buildInfoRow(
            icon: Icons.phone_outlined,
            title: 'Số điện thoại',
            value: student.phone,
          ),
          _buildDivider(),
          _buildInfoRow(
            icon: Icons.calendar_today_outlined,
            title: 'Ngày sinh',
            value: student.dob,
          ),
        ],
      ),
    );
  }

  Widget _buildAcademicInfoCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildInfoRow(
            icon: Icons.business_outlined,
            title: 'Ngành',
            value: student.major,
          ),
          _buildDivider(),
          _buildInfoRow(
            icon: Icons.school_outlined,
            title: 'Chuyên ngành',
            value: student.specialization,
          ),
           _buildDivider(),
          _buildInfoRow(
            icon: Icons.class_outlined,
            title: 'Chuyên ngành hẹp',
            value: student.subSpecialization, 
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required String? value, // Make nullable
    bool isEmail = false,
  }) {
    // If value is null or empty, display "Chưa cập nhật"
    final displayValue = (value == null || value.isEmpty) ? "Chưa cập nhật" : value;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF3E0),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: const Color(0xFFEF7623), size: 22),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.roboto(
                  fontSize: 12,
                  color: Colors.grey[500],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                displayValue,
                style: GoogleFonts.roboto(
                  fontSize: 14, 
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
                maxLines: isEmail ? 2 : 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Divider(color: Colors.grey[100], height: 1),
    );
  }

  Widget _buildAvatarImage(String? avatarUrl) {
    if (avatarUrl == null || avatarUrl.isEmpty) {
      return Container(
        color: const Color(0xFFFFE0B2),
        child: const Icon(Icons.person, color: Color(0xFFEF7623), size: 50),
      );
    }
    
    String fullUrl = avatarUrl;
    if (!avatarUrl.startsWith('http')) {
      fullUrl = '${ApiConstants.baseUrl}$avatarUrl';
    }

    return Image.network(
      fullUrl,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        color: const Color(0xFFFFE0B2),
        child: const Icon(Icons.person, color: Color(0xFFEF7623), size: 50),
      ),
    );
  }
}
