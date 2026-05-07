import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/constants/app_colors.dart';
import '../controllers/face_attendance_controller.dart';

class FaceAttendanceView extends StatelessWidget {
  final int slotId;
  const FaceAttendanceView({super.key, required this.slotId});

  @override
  Widget build(BuildContext context) {
    // Initialize controller for this specific slot
    final controller = Get.put(FaceAttendanceController(slotId: slotId));

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Camera Preview
          Obx(() {
            // Trigger rebuild when state changes (e.g. lookingForFace)
            final state = controller.state.value;
            
            if (controller.cameraController != null &&
                controller.cameraController!.value.isInitialized) {
              return SizedBox.expand(
                child: FittedBox(
                  fit: BoxFit.cover,
                  child: SizedBox(
                    width: controller.cameraController!.value.previewSize!.height,
                    height: controller.cameraController!.value.previewSize!.width,
                    child: CameraPreview(controller.cameraController!),
                  ),
                ),
              );
            }
            return const Center(child: CircularProgressIndicator(color: AppColors.primaryOrange));
          }),
          
          // 2. Overlay Mask (Darken outside)
          _buildOverlayMask(),

          // 3. UI Content
          SafeArea(
            child: Column(
              children: [
                // Header
                _buildHeader(),
                
                const Spacer(),
                
                // Status & Instructions
                Obx(() => _buildStatusSection(controller)),
                
                const SizedBox(height: 40),
              ],
            ),
          ),
          
          // 4. Result/Loading Overlay
          Obx(() {
            if (controller.state.value == AttendanceState.verifying) {
              return Container(
                color: Colors.black54,
                child: const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: AppColors.primaryOrange),
                      SizedBox(height: 16),
                      Text(
                        'Đang xác thực...',
                        style: TextStyle(color: Colors.white, fontSize: 16),
                      )
                    ],
                  ),
                ),
              );
            }
            
            if (controller.state.value == AttendanceState.success) {
               return _buildResultOverlay(
                 isSuccess: true, 
                 message: controller.resultMessage,
                 onClose: () => Get.back(result: true), // Return success
               );
            }
            
            if (controller.state.value == AttendanceState.failure) {
              return _buildResultOverlay(
                 isSuccess: false, 
                 message: controller.resultMessage,
                 onClose: () => controller.retry(), // Retry
                 secondaryAction: () => Get.back(),
                 secondaryLabel: 'Thoát',
               );
            }
            
            return const SizedBox.shrink();
          }),
        ],
      ),
    );
  }

  Widget _buildOverlayMask() {
    return ColorFiltered(
      colorFilter: const ColorFilter.mode(
        Colors.black54,
        BlendMode.srcOut,
      ),
      child: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              color: Colors.transparent,
            ),
            child: const Center(
              // Defines the clear "hole"
              child: SizedBox(
                width: 300,
                height: 400,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.black,
                    shape: BoxShape.rectangle, // Or circle/oval
                    borderRadius: BorderRadius.all(Radius.circular(200)), // Oval shape
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white, size: 28),
            onPressed: () => Get.back(),
          ),
          Expanded(
            child: Text(
              'Điểm danh khuôn mặt',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 48), // Balance for Close button
        ],
      ),
    );
  }

  Widget _buildStatusSection(FaceAttendanceController controller) {
    Color statusColor;
    String statusText = controller.instructionText.value;
    IconData? statusIcon;
    
    switch (controller.state.value) {
      case AttendanceState.lookingForFace:
        statusColor = Colors.white;
        statusIcon = Icons.face;
        break;
      case AttendanceState.performingChallenge:
        statusColor = AppColors.primaryOrange;
        if (controller.currentChallenge.value == LivenessChallenge.blink) {
          statusIcon = Icons.remove_red_eye;
        } else if (controller.currentChallenge.value == LivenessChallenge.smile) {
          statusIcon = Icons.sentiment_satisfied_alt;
        } else if (controller.currentChallenge.value == LivenessChallenge.headTurnLeft) {
          statusIcon = Icons.arrow_back_rounded;
        } else if (controller.currentChallenge.value == LivenessChallenge.headTurnRight) {
          statusIcon = Icons.arrow_forward_rounded;
        } else if (controller.currentChallenge.value == LivenessChallenge.lookUp) {
          statusIcon = Icons.arrow_upward_rounded;
        } else if (controller.currentChallenge.value == LivenessChallenge.openMouth) {
          statusIcon = Icons.mic_none_rounded;
        } else if (controller.currentChallenge.value == LivenessChallenge.nodHead) {
          statusIcon = Icons.swap_vert_rounded;
        }
        break;
      case AttendanceState.verifying:
        statusColor = Colors.blue;
        statusIcon = Icons.cloud_upload;
        break;
      default:
        statusColor = Colors.grey;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (statusIcon != null) ...[
            Icon(statusIcon, size: 40, color: statusColor),
            const SizedBox(height: 12),
          ],
          Text(
            statusText,
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildResultOverlay({
    required bool isSuccess, 
    required String message, 
    required VoidCallback onClose,
    VoidCallback? secondaryAction,
    String? secondaryLabel,
  }) {
    final controller = Get.find<FaceAttendanceController>();
    
    return Container(
      color: Colors.black.withOpacity(0.85),
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: Center(
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(40),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 1. Icon Circle
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: isSuccess ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    isSuccess ? Icons.check_circle_outline_rounded : Icons.report_problem_outlined,
                    color: isSuccess ? const Color(0xFF4CAF50) : const Color(0xFFF44336),
                    size: 56,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              
              // 2. Title
              Text(
                isSuccess ? 'Thành công' : 'Thất bại',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: isSuccess ? const Color(0xFF4CAF50) : const Color(0xFFF44336),
                ),
              ),
              const SizedBox(height: 12),
              
              // 3. Message
              Text(
                message,
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF475569),
                  height: 1.5,
                ),
              ),
              
              // 4. Remaining Attempts (Failure only)
              if (!isSuccess) ...[
                const SizedBox(height: 8),
                Text(
                  'Số lần thử còn lại: ${controller.remainingAttempts.value}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    color: const Color(0xFF94A3B8),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
              
              const SizedBox(height: 40),
              
              // 5. Action Button
              Container(
                width: double.infinity,
                height: 64,
                decoration: BoxDecoration(
                  color: isSuccess ? const Color(0xFF4CAF50) : const Color(0xFFF44336),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: (isSuccess ? const Color(0xFF4CAF50) : const Color(0xFFF44336)).withOpacity(0.3),
                      blurRadius: 15,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  onPressed: onClose,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                  child: Text(
                    isSuccess ? 'Hoàn tất' : 'Thử lại',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),

              // 6. Secondary Action (Exit)
              if (!isSuccess && secondaryAction != null) ...[
                const SizedBox(height: 16),
                TextButton(
                  onPressed: secondaryAction,
                  child: Text(
                    secondaryLabel ?? 'Thoát',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      color: const Color(0xFF94A3B8),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
