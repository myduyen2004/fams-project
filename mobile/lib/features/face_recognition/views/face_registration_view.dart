import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:camera/camera.dart';
import 'dart:math' as math;
import '../controllers/face_registration_controller.dart';

/// Face Registration View - Updated for randomized 6-step flow
class FaceRegistrationView extends StatelessWidget {
  const FaceRegistrationView({super.key});

  // Theme colors
  static const Color primaryOrange = Color(0xFFF26F21);
  static const Color lightPeach = Color(0xFFFEE8DC);
  static const Color bgWhite = Color(0xFFFAFAFA);

  @override
  Widget build(BuildContext context) {
    return GetBuilder<FaceRegistrationController>(
      init: FaceRegistrationController(),
      builder: (controller) {
        return Scaffold(
          backgroundColor: bgWhite,
          body: SafeArea(
            child: Column(
              children: [
                // Header (fixed height)
                _buildHeader(context),
                
                // Step Indicator (fixed height)
                Obx(() => _buildStepIndicator(controller)),
                
                const SizedBox(height: 8),
                
                // Current Action Display (fixed height container)
                SizedBox(
                  height: 40,
                  child: Center(
                    child: Obx(() => _buildCurrentActionBadge(controller)),
                  ),
                ),
                
                // Main content - Camera with overlay warnings
                Expanded(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Camera frame (always centered)
                      Center(
                        child: Obx(() => _buildOvalCameraFrame(controller)),
                      ),
                      // Warning overlay (positioned at top)
                      Positioned(
                        top: 8,
                        left: 24,
                        right: 24,
                        child: Obx(() => _buildWarningBanner(controller)),
                      ),
                    ],
                  ),
                ),
                
                // Status/Error area (fixed height)
                SizedBox(
                  height: 50,
                  child: Center(
                    child: Obx(() => _buildStatusMessage(controller)),
                  ),
                ),
                
                // Bottom Section
                Obx(() => _buildBottomSection(controller)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Get.back(),
            icon: const Icon(Icons.arrow_back_ios, color: Colors.black87, size: 20),
          ),
          const Expanded(
            child: Text(
              'Đăng ký khuôn mặt',
              style: TextStyle(
                color: Colors.black87,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  /// Updated step indicator for 6-step flow
  Widget _buildStepIndicator(FaceRegistrationController controller) {
    final currentPhase = controller.currentPhaseIndex;
    final totalSteps = controller.totalSteps;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(totalSteps, (index) {
          final isCompleted = currentPhase > index;
          final isActive = currentPhase == index;
          
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildStepDot(
                isActive: isActive,
                isCompleted: isCompleted,
              ),
              if (index < totalSteps - 1)
                _buildStepLine(isCompleted: isCompleted),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildStepDot({
    required bool isActive,
    required bool isCompleted,
  }) {
    Color bgColor;
    
    if (isCompleted) {
      bgColor = primaryOrange;
    } else if (isActive) {
      bgColor = lightPeach;
    } else {
      bgColor = Colors.grey.shade300;
    }

    return Container(
      width: isActive ? 14 : 10,
      height: isActive ? 14 : 10,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: bgColor,
        border: isActive 
            ? Border.all(color: primaryOrange, width: 2)
            : null,
      ),
      child: isCompleted
          ? const Icon(Icons.check, color: Colors.white, size: 8)
          : null,
    );
  }

  Widget _buildStepLine({required bool isCompleted}) {
    return Container(
      width: 24,
      height: 2,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      color: isCompleted ? primaryOrange : Colors.grey.shade300,
    );
  }

  /// Display current action being performed
  Widget _buildCurrentActionBadge(FaceRegistrationController controller) {
    final state = controller.state.value;
    final actionName = controller.currentActionName.value;
    
    String displayText;
    IconData displayIcon;
    
    switch (state) {
      case FaceRegistrationState.environmentCheck:
        displayText = 'Kiểm tra môi trường';
        displayIcon = Icons.camera_alt_outlined;
        break;
      case FaceRegistrationState.livenessAction:
        displayText = actionName.isNotEmpty ? actionName : 'Đang xử lý...';
        displayIcon = _getActionIcon(actionName);
        break;
      case FaceRegistrationState.submitting:
        displayText = 'Đang gửi...';
        displayIcon = Icons.cloud_upload_outlined;
        break;
      case FaceRegistrationState.success:
        displayText = 'Thành công!';
        displayIcon = Icons.check_circle;
        break;
      case FaceRegistrationState.error:
      case FaceRegistrationState.alreadyRegistered:
        return const SizedBox.shrink();
      default:
        displayText = 'Đang khởi tạo...';
        displayIcon = Icons.hourglass_empty;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: lightPeach,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(displayIcon, color: primaryOrange, size: 18),
          const SizedBox(width: 8),
          Text(
            displayText,
            style: const TextStyle(
              color: primaryOrange,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getActionIcon(String actionName) {
    if (actionName.contains('Chớp mắt')) return Icons.visibility_outlined;
    if (actionName.contains('Mỉm cười')) return Icons.sentiment_satisfied_alt;
    if (actionName.contains('TRÁI')) return Icons.rotate_left;
    if (actionName.contains('PHẢI')) return Icons.rotate_right;
    return Icons.face_outlined;
  }

  Widget _buildWarningBanner(FaceRegistrationController controller) {
    final warnings = controller.activeWarnings;
    final hasWarning = warnings.isNotEmpty;

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 200),
      opacity: hasWarning ? 1.0 : 0.0,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: primaryOrange,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Text(
          hasWarning ? warnings.first : '',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  Widget _buildOvalCameraFrame(FaceRegistrationController controller) {
    final progress = controller.progress.value;
    final frameStatus = controller.frameStatus.value;
    final state = controller.state.value;

    // Get instruction text based on current action
    String instructionText = _getInstructionText(controller);

    // Camera frame dimensions
    const double frameWidth = 260;
    const double frameHeight = 340;
    const double borderWidth = 5.0;
    
    // Determine ring color: green when complete, orange when in progress
    final bool isComplete = progress >= 1.0 || state == FaceRegistrationState.success;
    final Color ringColor = isComplete ? Colors.green : primaryOrange;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Camera frame with progress ring
        SizedBox(
          width: frameWidth + borderWidth * 2,
          height: frameHeight + borderWidth * 2,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Progress ring (draws both grey background and colored progress)
              Positioned.fill(
                child: CustomPaint(
                  painter: OvalProgressPainter(
                    progress: progress,
                    color: ringColor,
                    strokeWidth: borderWidth,
                  ),
                ),
              ),
              // Camera preview (clipped to OVAL - matches progress ring exactly)
              ClipOval(
                child: Container(
                  width: frameWidth,
                  height: frameHeight,
                  color: lightPeach,
                  child: _buildCameraPreview(controller),
                ),
              ),
              // Success checkmark
              if (state == FaceRegistrationState.success)
                Positioned(
                  top: 5,
                  right: 5,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check, color: Colors.white, size: 20),
                  ),
                ),
            ],
          ),
        ),
        // Percentage badge
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
          decoration: BoxDecoration(
            color: ringColor,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            '${(progress * 100).toInt()}%',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        // Instruction text (fixed height to prevent jumping)
        const SizedBox(height: 8),
        SizedBox(
          height: 24,
          child: instructionText.isNotEmpty
            ? Text(
                instructionText,
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              )
            : const SizedBox.shrink(),
        ),
      ],
    );
  }

  /// Get instruction text with "HÃY" prefix based on current state
  String _getInstructionText(FaceRegistrationController controller) {
    final state = controller.state.value;
    final currentAction = controller.currentActionName.value;
    
    if (state == FaceRegistrationState.environmentCheck) {
      return 'HÃY đưa mặt vào khung hình';
    } else if (state == FaceRegistrationState.livenessAction) {
      if (currentAction.contains('Chớp mắt')) {
        return 'HÃY chớp mắt 1-2 lần';
      } else if (currentAction.contains('Mỉm cười')) {
        return 'HÃY mỉm cười tự nhiên';
      } else if (currentAction.contains('TRÁI')) {
        return 'HÃY quay đầu sang TRÁI';
      } else if (currentAction.contains('PHẢI')) {
        return 'HÃY quay đầu sang PHẢI';
      }
    } else if (state == FaceRegistrationState.submitting) {
      return 'Đang xử lý...';
    } else if (state == FaceRegistrationState.success) {
      return 'Đăng ký thành công!';
    }
    return '';
  }

  Widget _buildCameraPreview(FaceRegistrationController controller) {
    if (controller.cameraController == null ||
        !controller.cameraController!.value.isInitialized) {
      return Container(
        color: lightPeach,
        child: const Center(
          child: CircularProgressIndicator(color: primaryOrange),
        ),
      );
    }

    return FittedBox(
      fit: BoxFit.cover,
      child: SizedBox(
        width: controller.cameraController!.value.previewSize?.height ?? 260,
        height: controller.cameraController!.value.previewSize?.width ?? 340,
        child: CameraPreview(controller.cameraController!),
      ),
    );
  }

  /// Status message displayed in fixed-height area (no layout jumps)
  Widget _buildStatusMessage(FaceRegistrationController controller) {
    final state = controller.state.value;
    final message = controller.statusMessage.value;
    
    // Don't show status in error/success/alreadyRegistered states (handled by bottom section)
    if (state == FaceRegistrationState.error || 
        state == FaceRegistrationState.alreadyRegistered ||
        state == FaceRegistrationState.success) {
      return const SizedBox.shrink();
    }
    
    // Show current action or status message
    if (message.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Text(
      message,
      style: TextStyle(
        color: Colors.grey.shade600,
        fontSize: 13,
      ),
      textAlign: TextAlign.center,
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }

  Widget _buildBottomSection(FaceRegistrationController controller) {
    final state = controller.state.value;

    if (state == FaceRegistrationState.success) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildButton('Hoàn tất', () => Get.back()),
          ],
        ),
      );
    }

    if (state == FaceRegistrationState.error) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildButton('Thử lại', controller.retry),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Get.back(),
              child: Text(
                'Hủy đăng ký',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
              ),
            ),
          ],
        ),
      );
    }

    if (state == FaceRegistrationState.alreadyRegistered) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: _buildButton('Quay lại', () => Get.back()),
      );
    }

    // Default: Show cancel button
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          _buildButton('Hủy đăng ký', () => Get.back(), outlined: true),
        ],
      ),
    );
  }

  Widget _buildButton(String text, VoidCallback onPressed, {bool outlined = false}) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: outlined ? Colors.transparent : primaryOrange,
          foregroundColor: outlined ? Colors.grey.shade700 : Colors.white,
          minimumSize: const Size(double.infinity, 54),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(27),
            side: outlined 
              ? BorderSide(color: Colors.grey.shade300) 
              : BorderSide.none,
          ),
          elevation: 0,
        ),
        child: Text(
          text,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

/// Custom Painter for Oval Progress Ring
class OvalProgressPainter extends CustomPainter {
  final double progress;
  final Color color;
  final double strokeWidth;

  OvalProgressPainter({
    required this.progress,
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(
      strokeWidth / 2,
      strokeWidth / 2,
      size.width - strokeWidth,
      size.height - strokeWidth,
    );

    // Background oval
    final bgPaint = Paint()
      ..color = Colors.grey.shade200
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;
    
    canvas.drawOval(rect, bgPaint);

    // Progress arc
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final sweepAngle = 2 * math.pi * progress;
    canvas.drawArc(
      rect,
      -math.pi / 2, // Start from top
      sweepAngle,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(OvalProgressPainter oldDelegate) {
    return progress != oldDelegate.progress || color != oldDelegate.color;
  }
}
