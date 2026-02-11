import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:camera/camera.dart';
import '../controllers/face_checkin_controller.dart';

/// Face Check-in View
/// Camera screen for attendance check-in with WiFi verification and retry logic
class FaceCheckInView extends StatelessWidget {
  final int slotId;
  final String courseName;
  final String roomName;

  const FaceCheckInView({
    super.key,
    required this.slotId,
    required this.courseName,
    required this.roomName,
  });

  @override
  Widget build(BuildContext context) {
    return GetBuilder<FaceCheckInController>(
      init: FaceCheckInController(
        slotId: slotId,
        courseName: courseName,
        roomName: roomName,
      ),
      builder: (controller) {
        return Scaffold(
          backgroundColor: Colors.black,
          body: SafeArea(
            child: Column(
              children: [
                // Header with course info
                _buildHeader(context, controller),

                // Camera Preview
                Expanded(
                  child: Obx(() => _buildMainContent(controller)),
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

  Widget _buildHeader(BuildContext context, FaceCheckInController controller) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => Get.back(),
                icon: const Icon(Icons.close, color: Colors.white),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Text(
                      'Điểm danh',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      courseName,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 48),
            ],
          ),

          // Room & WiFi Info
          const SizedBox(height: 8),
          Obx(() => Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.location_on,
                  color: Color(0xFFF26F21),
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  roomName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (controller.wifiSsid.value.isNotEmpty) ...[
                  Container(
                    width: 1,
                    height: 14,
                    margin: const EdgeInsets.symmetric(horizontal: 10),
                    color: Colors.white.withOpacity(0.3),
                  ),
                  const Icon(Icons.wifi, color: Colors.green, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    controller.wifiSsid.value,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildMainContent(FaceCheckInController controller) {
    final state = controller.state.value;

    // WiFi Not Found State
    if (state == FaceCheckInState.wifiNotFound) {
      return _buildWifiError(controller);
    }

    // Success State
    if (state == FaceCheckInState.success) {
      return _buildSuccessScreen(controller);
    }

    // Manual Verification Required
    if (state == FaceCheckInState.requiresManualVerify) {
      return _buildManualVerifyScreen(controller);
    }

    // Camera States
    return Stack(
      alignment: Alignment.center,
      children: [
        // Camera Preview
        _buildCameraPreview(controller),

        // Corner Frame
        _buildCornerFrame(controller),

        // Countdown Overlay
        if (controller.captureCountdown.value > 0)
          _buildCountdownOverlay(controller),

        // Status Message
        Positioned(
          bottom: 40,
          child: _buildStatusChip(controller),
        ),

        // Attempt Counter
        Positioned(
          top: 16,
          right: 16,
          child: _buildAttemptCounter(controller),
        ),
      ],
    );
  }

  Widget _buildCameraPreview(FaceCheckInController controller) {
    if (controller.cameraController == null ||
        !controller.cameraController!.value.isInitialized) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: Color(0xFFF26F21)),
            const SizedBox(height: 16),
            Text(
              controller.statusMessage.value,
              style: TextStyle(color: Colors.white.withOpacity(0.7)),
            ),
          ],
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: CameraPreview(controller.cameraController!),
    );
  }

  Widget _buildCornerFrame(FaceCheckInController controller) {
    final isDetected = controller.isFaceDetected.value;
    final color = isDetected
        ? const Color(0xFFF26F21)
        : Colors.white.withOpacity(0.5);

    return SizedBox(
      width: 260,
      height: 340,
      child: CustomPaint(
        painter: _CornerFramePainter(color: color),
      ),
    );
  }

  Widget _buildCountdownOverlay(FaceCheckInController controller) {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFFF26F21).withOpacity(0.9),
      ),
      child: Center(
        child: Text(
          '${controller.captureCountdown.value}',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 48,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(FaceCheckInController controller) {
    final state = controller.state.value;
    Color bgColor;
    IconData icon;

    switch (state) {
      case FaceCheckInState.checkingWifi:
        bgColor = Colors.blue;
        icon = Icons.wifi_find;
        break;
      case FaceCheckInState.detectingFace:
        bgColor = const Color(0xFFF26F21);
        icon = Icons.face;
        break;
      case FaceCheckInState.capturing:
      case FaceCheckInState.submitting:
        bgColor = Colors.purple;
        icon = Icons.camera;
        break;
      case FaceCheckInState.failed:
        bgColor = Colors.red;
        icon = Icons.error;
        break;
      default:
        bgColor = Colors.grey;
        icon = Icons.face;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          Text(
            controller.statusMessage.value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttemptCounter(FaceCheckInController controller) {
    if (controller.currentAttempt.value == 0) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        'Lần ${controller.currentAttempt.value}/${controller.maxAttempts}',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildWifiError(FaceCheckInController controller) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.red.withOpacity(0.1),
              ),
              child: const Icon(
                Icons.wifi_off,
                color: Colors.red,
                size: 48,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Không thể xác định vị trí',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              controller.errorMessage.value,
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccessScreen(FaceCheckInController controller) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFF26F21),
            ),
            child: const Icon(
              Icons.check,
              color: Colors.white,
              size: 64,
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            'Điểm danh thành công!',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            courseName,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            roomName,
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildManualVerifyScreen(FaceCheckInController controller) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.orange.withOpacity(0.1),
              ),
              child: const Icon(
                Icons.person_search,
                color: Colors.orange,
                size: 48,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Cần xác nhận thủ công',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              controller.errorMessage.value,
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.hourglass_empty, color: Colors.orange, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Đang chờ giảng viên xác nhận...',
                    style: TextStyle(
                      color: Colors.orange,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomSection(FaceCheckInController controller) {
    final state = controller.state.value;

    if (state == FaceCheckInState.success) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: ElevatedButton(
          onPressed: () => Get.back(),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFF26F21),
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 54),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: const Text(
            'Đóng',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
      );
    }

    if (state == FaceCheckInState.failed && controller.remainingAttempts > 0) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Text(
              controller.errorMessage.value,
              style: const TextStyle(color: Colors.red, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: controller.retry,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF26F21),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 54),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                'Thử lại (${controller.remainingAttempts} lần)',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );
    }

    if (state == FaceCheckInState.requiresManualVerify) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: OutlinedButton(
          onPressed: () => Get.back(),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.white,
            side: const BorderSide(color: Colors.white54),
            minimumSize: const Size(double.infinity, 54),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: const Text(
            'Quay lại',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
      );
    }

    return const SizedBox(height: 24);
  }
}

/// Custom painter for corner frame
class _CornerFramePainter extends CustomPainter {
  final Color color;

  _CornerFramePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const cornerLength = 35.0;
    const radius = 20.0;

    // Top-left
    canvas.drawPath(
      Path()
        ..moveTo(0, cornerLength + radius)
        ..lineTo(0, radius)
        ..arcToPoint(const Offset(radius, 0), radius: const Radius.circular(radius))
        ..lineTo(cornerLength + radius, 0),
      paint,
    );

    // Top-right
    canvas.drawPath(
      Path()
        ..moveTo(size.width - cornerLength - radius, 0)
        ..lineTo(size.width - radius, 0)
        ..arcToPoint(Offset(size.width, radius), radius: const Radius.circular(radius))
        ..lineTo(size.width, cornerLength + radius),
      paint,
    );

    // Bottom-left
    canvas.drawPath(
      Path()
        ..moveTo(0, size.height - cornerLength - radius)
        ..lineTo(0, size.height - radius)
        ..arcToPoint(Offset(radius, size.height), radius: const Radius.circular(radius))
        ..lineTo(cornerLength + radius, size.height),
      paint,
    );

    // Bottom-right
    canvas.drawPath(
      Path()
        ..moveTo(size.width - cornerLength - radius, size.height)
        ..lineTo(size.width - radius, size.height)
        ..arcToPoint(Offset(size.width, size.height - radius), radius: const Radius.circular(radius))
        ..lineTo(size.width, size.height - cornerLength - radius),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
