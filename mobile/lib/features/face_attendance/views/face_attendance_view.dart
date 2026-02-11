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
              style: GoogleFonts.roboto(
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
            style: GoogleFonts.roboto(
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
    return Container(
      color: Colors.black87,
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isSuccess ? Icons.check_circle : Icons.error,
                color: isSuccess ? Colors.green : Colors.red,
                size: 80,
              ),
              const SizedBox(height: 24),
              Text(
                isSuccess ? 'Thành công' : 'Thất bại',
                style: GoogleFonts.roboto(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: isSuccess ? Colors.green : Colors.red,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                message,
                textAlign: TextAlign.center,
                style: GoogleFonts.roboto(
                  fontSize: 16,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: onClose,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isSuccess ? Colors.green : AppColors.primaryOrange,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    isSuccess ? 'Hoàn tất' : 'Thử lại',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              if (!isSuccess && secondaryAction != null) ...[
                const SizedBox(height: 12),
                TextButton(
                  onPressed: secondaryAction,
                  child: Text(
                    secondaryLabel ?? 'Thoát',
                    style: TextStyle(color: Colors.grey[600]),
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
