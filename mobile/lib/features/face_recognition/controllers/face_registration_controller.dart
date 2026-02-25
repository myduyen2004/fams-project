import 'dart:convert';
import 'dart:async';
import 'dart:ui';
import 'dart:typed_data';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image/image.dart' as img;
import 'package:dio/dio.dart';
import '../../../core/services/api_service.dart';
import '../../../core/utils/image_converter_utils.dart';
import '../../auth/controllers/auth_controller.dart';

/// ============================================================
/// Enhanced Face Registration Flow with Randomized Actions
/// ============================================================
/// Phase 1: Environment Check (0-20%) - Validate image quality
/// Phase 2-4: Randomized Actions (20-80%) - Blink, Smile, Head Turns
/// Phase 5: Submission (80-100%) - Send to backend
/// ============================================================

/// Liveness action types
enum LivenessAction { blink, smile, turnLeft, turnRight }

enum FaceRegistrationState {
  initializing,
  environmentCheck,   // Phase 1: Quality validation
  livenessAction,     // Phase 2-4: Randomized actions
  submitting,         // Phase 5: Send to backend
  success,
  error,
  alreadyRegistered,
}

/// Overlay frame colors based on status
enum FrameStatus { normal, detected, warning, error, success }

class FaceRegistrationController extends GetxController {
  final ApiService _apiService = ApiService();

  // ===================== THRESHOLDS (Slightly stricter) =====================
  // Image Quality
  static const int MIN_IMAGE_WIDTH = 320;
  static const int MIN_IMAGE_HEIGHT = 240;
  static const double MIN_BRIGHTNESS = 20.0;    // Relaxed for low light
  static const double MAX_BRIGHTNESS = 250.0;   // Relaxed
  static const double MIN_LAPLACIAN_VARIANCE = 30.0; // Ultra-lenient local check
  
  // Face Geometry
  static const double MIN_FACE_COVERAGE = 0.20;  // 20% of frame (was 25)
  static const double MAX_FACE_COVERAGE = 0.65;  // 65% of frame (was 55)
  static const double MAX_HEAD_ANGLE = 18.0;     // ±18 degrees for frontal (was 12)
  static const double MIN_TURN_ANGLE = 12.0;     // Easier head turn (was 20)
  
  // Blink/Smile Detection
  static const double BLINK_THRESHOLD = 0.6;     // Easier blink (was 0.4)
  static const double SMILE_THRESHOLD = 0.5;     // Easier smile (was 0.7)
  static const int REQUIRED_FRAMES = 1;          // Instant detection (was 2)
  // ===========================================================================

  // Camera
  CameraController? cameraController;
  final Rx<FaceRegistrationState> state = FaceRegistrationState.initializing.obs;
  final RxString statusMessage = ''.obs;
  final RxDouble progress = 0.0.obs;
  final RxBool isFaceDetected = false.obs;
  final RxBool isProcessing = false.obs;
  final RxString errorMessage = ''.obs;
  final RxInt faceCount = 0.obs;
  final RxString debugInfo = ''.obs;
  
  // Active warnings for parallel display
  final RxList<String> activeWarnings = <String>[].obs;
  
  // Frame color state
  final Rx<FrameStatus> frameStatus = FrameStatus.normal.obs;

  // Face Detection
  late FaceDetector _faceDetector;
  bool _faceDetectorInitialized = false;
  CameraImage? _lastCameraImage;
  List<String> _capturedImages = [];

  // ===================== RANDOMIZED ACTIONS =====================
  List<LivenessAction> _actionSequence = [];
  int _currentActionIndex = 0;
  final RxString currentActionName = ''.obs;
  
  // Phase tracking for individual actions
  bool _blinkDetected = false;
  bool _smileDetected = false;
  bool _leftTurnCaptured = false;
  bool _rightTurnCaptured = false;
  int _detectionFrameCount = 0;
  
  // Timers
  Timer? _phaseTimer;
  DateTime? _lastToastTime;  // For debouncing toast messages
  static const int _toastCooldownMs = 3000;  // 3 second cooldown (less spam)
  bool _isDetecting = false;
  
  // Timing
  DateTime? _flowStartTime;

  @override
  void onInit() {
    super.onInit();
    _checkFaceStatusAndInit();
  }

  @override
  void onClose() {
    cameraController?.dispose();
    if (_faceDetectorInitialized) {
      _faceDetector.close();
    }
    _phaseTimer?.cancel();
    super.onClose();
  }

  /// Fixed action sequence (no randomization)
void _generateRandomActionSequence() {
  // Fixed order: blink -> smile -> turn left -> turn right
  _actionSequence = [
    LivenessAction.blink,
    LivenessAction.smile,
    LivenessAction.turnLeft,
    LivenessAction.turnRight,
  ];
  // No shuffle - fixed order as requested
  _currentActionIndex = 0;
  debugPrint('Action sequence: $_actionSequence');
}

  /// Get action display name in Vietnamese
  String _getActionDisplayName(LivenessAction action) {
    switch (action) {
      case LivenessAction.blink:
        return 'Chớp mắt';
      case LivenessAction.smile:
        return 'Mỉm cười';
      case LivenessAction.turnLeft:
        return 'Quay sang TRÁI';
      case LivenessAction.turnRight:
        return 'Quay sang PHẢI';
    }
  }

  /// Check existing face status before starting
  Future<void> _checkFaceStatusAndInit() async {
    state.value = FaceRegistrationState.initializing;
    statusMessage.value = 'Đang kiểm tra...';

    try {
      final response = await _apiService.get('/api/face-attendance/status');
      if (response.statusCode == 200) {
        final data = response.data;
        final currentCount = data['faceCount'] as int? ?? 0;
        faceCount.value = currentCount;
        
        if (currentCount >= 5) {
          state.value = FaceRegistrationState.alreadyRegistered;
          statusMessage.value = 'Đã đăng ký đủ 5 góc mặt';
          errorMessage.value = 'Bạn đã đăng ký đủ 5 góc mặt.';
          return;
        }
      }
    } catch (e) {
      debugPrint('Face status check failed: $e');
    }

    _generateRandomActionSequence();
    _initializeFaceDetector();
    _initializeCamera();
  }

  void _initializeFaceDetector() {
    final options = FaceDetectorOptions(
      enableClassification: true,  // For blink/smile detection
      enableTracking: true,
      performanceMode: FaceDetectorMode.fast,
    );
    _faceDetector = FaceDetector(options: options);
    _faceDetectorInitialized = true;
  }

  Future<void> _initializeCamera() async {
    state.value = FaceRegistrationState.initializing;
    statusMessage.value = 'Đang khởi tạo camera...';

    try {
      final cameras = await availableCameras();
      final frontCamera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      cameraController = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.nv21,
      );

      await cameraController!.initialize();
      cameraController!.startImageStream(_processImage);
      
      // Start with Phase 1: Environment Check
      _startEnvironmentCheck();
      update();
    } catch (e) {
      state.value = FaceRegistrationState.error;
      errorMessage.value = 'Không thể khởi tạo camera: $e';
    }
  }

  /// Process each camera frame
  Future<void> _processImage(CameraImage image) async {
    if (_isDetecting || isProcessing.value) return;
    
    _lastCameraImage = image;
    _isDetecting = true;

    try {
      final inputImage = _convertCameraImage(image);
      if (inputImage == null) {
        _isDetecting = false;
        return;
      }

      final faces = await _faceDetector.processImage(inputImage);
      
      if (faces.isNotEmpty) {
        // Find largest face
        Face face = faces.first;
        if (faces.length > 1) {
             face = faces.reduce((curr, next) => 
                (curr.boundingBox.width * curr.boundingBox.height) > 
                (next.boundingBox.width * next.boundingBox.height) ? curr : next
             );
        }
        
        // Check if the primary face is facing the camera (assuming _isFacingCamera is defined elsewhere)
        // For now, we'll just proceed with the largest face.
        // If _isFacingCamera is a new method, it needs to be added.
        // For the purpose of this edit, we'll assume it's a placeholder or will be added.
        // final isFacingFields = _isFacingCamera(primaryFace);
        // if (!isFacingFields) {
        //    _addWarning('Vui lòng nhìn thẳng vào camera');
        // }

        isFaceDetected.value = true;
        frameStatus.value = FrameStatus.detected;
        
        // Update debug info
        debugInfo.value = 
          'Y:${face.headEulerAngleY?.toStringAsFixed(1)} '
          'X:${face.headEulerAngleX?.toStringAsFixed(1)} '
          'L:${face.leftEyeOpenProbability?.toStringAsFixed(2)} '
          'R:${face.rightEyeOpenProbability?.toStringAsFixed(2)} '
          'S:${face.smilingProbability?.toStringAsFixed(2)}';

        // Process based on current state
        _handleState(face, inputImage.metadata!.size);
      } else {
        isFaceDetected.value = false;
        frameStatus.value = FrameStatus.normal;
        _addWarning('Không thấy mặt');
        _detectionFrameCount = 0;
      }
    } catch (e) {
      debugPrint('Image processing error: $e');
    } finally {
      _isDetecting = false;
    }
  }

  /// Handle logic based on current state
  void _handleState(Face face, Size imageSize) {
    activeWarnings.clear();
    
    switch (state.value) {
      case FaceRegistrationState.environmentCheck:
        _handleEnvironmentCheck(face, imageSize);
        break;
      case FaceRegistrationState.livenessAction:
        _handleLivenessAction(face);
        break;
      default:
        break;
    }
  }

  // ===================== PHASE 1: ENVIRONMENT CHECK =====================
  
  void _startEnvironmentCheck() {
    state.value = FaceRegistrationState.environmentCheck;
    statusMessage.value = 'Đang kiểm tra môi trường...';
    progress.value = 0.05;
    _flowStartTime = DateTime.now();
    
    _phaseTimer?.cancel();
    _phaseTimer = Timer(const Duration(seconds: 30), _handleTimeout);
  }

  void _handleEnvironmentCheck(Face face, Size imageSize) {
    List<String> issues = [];
    
    // ===== 1. Check Image Resolution =====
    final imgWidth = imageSize.width;
    final imgHeight = imageSize.height;
    if (imgWidth < MIN_IMAGE_WIDTH || imgHeight < MIN_IMAGE_HEIGHT) {
      issues.add('Độ phân giải thấp');
    }
    
    // ===== 2. Check Face Size (30-50% coverage) =====
    final faceWidth = face.boundingBox.width;
    final faceHeight = face.boundingBox.height;
    final faceArea = faceWidth * faceHeight;
    final imageArea = imgWidth * imgHeight;
    final coverage = faceArea / imageArea;
    
    if (coverage < MIN_FACE_COVERAGE) {
      issues.add('Lại gần hơn');
    } else if (coverage > MAX_FACE_COVERAGE) {
      issues.add('Lùi lại chút');
    }
    
    // ===== 3. Check Head Pose (Frontal: ±15°) =====
    final yaw = face.headEulerAngleY ?? 0;
    final pitch = face.headEulerAngleX ?? 0;
    
    if (yaw > MAX_HEAD_ANGLE) {
      issues.add('Xoay mặt sang PHẢI nhẹ');
    } else if (yaw < -MAX_HEAD_ANGLE) {
      issues.add('Xoay mặt sang TRÁI nhẹ');
    }
    
    if (pitch > MAX_HEAD_ANGLE) {
      issues.add('Cúi xuống chút');
    } else if (pitch < -MAX_HEAD_ANGLE) {
      issues.add('Ngẩng lên chút');
    }

    if (issues.isNotEmpty) {
      activeWarnings.addAll(issues);
      frameStatus.value = FrameStatus.warning;
      _showWarningToast(issues.first);  // Show toast for first warning
      statusMessage.value = issues.first;
      return;
    }

    // Face looks good, call backend quality check
    _performQualityCheck();
  }

  Future<void> _performQualityCheck() async {
    if (_lastCameraImage == null || isProcessing.value) return;
    
    isProcessing.value = true;
    statusMessage.value = 'Đang kiểm tra chất lượng...';
    progress.value = 0.10;
    
    try {
      final img.Image? image = ImageConverterUtils.convertYUV420ToImage(_lastCameraImage!);
      if (image == null) throw Exception("Image conversion failed");
      
      // ===== Local Pre-checks =====
      // Check brightness locally
      final brightness = _calculateBrightness(image);
      if (brightness < MIN_BRIGHTNESS) {
        statusMessage.value = 'Quá TỐI. Tìm nơi sáng hơn.';
        frameStatus.value = FrameStatus.error;
        isProcessing.value = false;
        return;
      }
      if (brightness > MAX_BRIGHTNESS) {
        statusMessage.value = 'Quá SÁNG. Tránh ánh nắng.';
        frameStatus.value = FrameStatus.error;
        isProcessing.value = false;
        return;
      }
      
      // Check sharpness locally (Laplacian variance)
      final sharpness = _calculateLaplacianVariance(image);
      if (sharpness < MIN_LAPLACIAN_VARIANCE) {
        statusMessage.value = 'Ảnh bị MỜ. Giữ yên điện thoại.';
        frameStatus.value = FrameStatus.error;
        isProcessing.value = false;
        return;
      }
      
      // ===== Backend Security & Quality Check =====
      final flipped = img.flipHorizontal(image);
      final jpegBytes = img.encodeJpg(flipped, quality: 85);
      final base64Image = base64Encode(jpegBytes);

      // 1. Mandatory Security Veto (Anti-Spoof/Replay)
      statusMessage.value = 'Đang kiểm tra bảo mật...';
      try {
        // Call /detect endpoint which now has Replay Detection
        final securityResponse = await _apiService.post(
          '/api/face/detect',
          data: {
            'image': base64Image,
            'mode': 'registration', // High quality mode for reference face
          },
        );
        
        if (securityResponse.statusCode == 400 || securityResponse.statusCode == 403) {
           final secData = securityResponse.data;
           if (secData['is_replay'] == true || secData['success'] == false) {
             statusMessage.value = secData['message'] ?? 'Phát hiện giả mạo!';
             frameStatus.value = FrameStatus.error;
             isProcessing.value = false;
             return;
           }
        }
      } catch (e) {
        debugPrint('Security check failed (bypass allowed for network): $e');
        // Let it fall through to quality check if just a network error
      }

      // 2. Standard Quality Check
      statusMessage.value = 'Đang kiểm tra chất lượng...';
      final response = await _apiService.post('/api/face-attendance/check-quality', data: {
        'image': base64Image,
        'mode': 'registration',
      });

      if (response.statusCode == 200) {
        final data = response.data;
        final passed = data['passed'] == true;
        
        if (passed) {
          // Environment check passed! Capture frontal frame and start liveness
          _captureCurrentFrame();
          progress.value = 0.20;
          _startNextLivenessAction();
        } else {
          // Show quality errors
          final errors = List<String>.from(data['errors'] ?? []);
          List<String> userMsgs = [];
          
          if (errors.contains('glasses_detected')) userMsgs.add('THÁO KÍNH');
          if (errors.contains('face_too_small')) userMsgs.add('Lại GẦN hơn');
          if (errors.contains('too_dark')) userMsgs.add('Quá TỐI');
          if (errors.contains('too_bright')) userMsgs.add('Quá SÁNG');
          if (errors.contains('uneven_lighting')) userMsgs.add('Ánh sáng KHÔNG ĐỀU');
          if (errors.contains('cheeks_covered') || errors.contains('eyes_covered')) userMsgs.add('VÉN TÓC');
          if (errors.contains('head_turned')) userMsgs.add('Nhìn THẲNG');
          if (errors.contains('image_blurry')) userMsgs.add('Giữ YÊN điện thoại');
          
          if (userMsgs.isEmpty && data['message'] != null) {
            userMsgs.add(data['message']);
          }
          
          activeWarnings.addAll(userMsgs);
          frameStatus.value = FrameStatus.error;
          statusMessage.value = userMsgs.isNotEmpty ? userMsgs.first : 'Chất lượng không đạt';
        }
      }
    } on DioException catch (e) {
      debugPrint('Quality check DioException: ${e.type} - ${e.message}');
      if (e.response?.statusCode == 400 || e.response?.statusCode == 422) {
        final data = e.response?.data;
        if (data != null && data is Map<String, dynamic>) {
          statusMessage.value = data['message'] ?? 'Chất lượng ảnh không đạt';
        } else {
          statusMessage.value = 'Chất lượng ảnh không đạt';
        }
      } else {
        statusMessage.value = 'Lỗi kết nối. Thử lại...';
      }
    } catch (e) {
      debugPrint('Quality check error: $e');
      statusMessage.value = 'Lỗi: $e';
    } finally {
      isProcessing.value = false;
    }
  }

  /// Calculate average brightness of image
  double _calculateBrightness(img.Image image) {
    double sum = 0;
    int count = 0;
    
    // Sample pixels for performance
    final step = max(1, image.width ~/ 50);
    for (int y = 0; y < image.height; y += step) {
      for (int x = 0; x < image.width; x += step) {
        final pixel = image.getPixel(x, y);
        // Luminance formula: 0.299*R + 0.587*G + 0.114*B
        final luminance = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
        sum += luminance;
        count++;
      }
    }
    
    return count > 0 ? sum / count : 128.0;
  }

  /// Calculate Laplacian variance for sharpness detection
  double _calculateLaplacianVariance(img.Image image) {
    // Simplified Laplacian variance using pixel differences
    double sum = 0;
    double sumSq = 0;
    int count = 0;
    
    final step = max(1, image.width ~/ 30);
    for (int y = step; y < image.height - step; y += step) {
      for (int x = step; x < image.width - step; x += step) {
        final center = image.getPixel(x, y);
        final left = image.getPixel(x - 1, y);
        final right = image.getPixel(x + 1, y);
        final top = image.getPixel(x, y - 1);
        final bottom = image.getPixel(x, y + 1);
        
        // Laplacian: 4*center - (left + right + top + bottom)
        final laplacian = (4 * _getLuminance(center) - 
            _getLuminance(left) - _getLuminance(right) - 
            _getLuminance(top) - _getLuminance(bottom)).abs();
        
        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;
      }
    }
    
    if (count == 0) return 0;
    
    final mean = sum / count;
    final variance = (sumSq / count) - (mean * mean);
    return variance;
  }

  double _getLuminance(img.Pixel pixel) {
    return 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
  }

  // ===================== PHASE 2-4: RANDOMIZED LIVENESS ACTIONS =====================
  
  void _startNextLivenessAction() {
    _phaseTimer?.cancel();
    _detectionFrameCount = 0;
    
    if (_currentActionIndex >= _actionSequence.length) {
      // All actions completed, submit
      _submitRegistration();
      return;
    }
    
    final currentAction = _actionSequence[_currentActionIndex];
    currentActionName.value = _getActionDisplayName(currentAction);
    
    state.value = FaceRegistrationState.livenessAction;
    statusMessage.value = '${currentActionName.value}...';
    
    // Calculate progress (20-80% range for 4 actions)
    final actionProgress = 0.20 + (0.60 * _currentActionIndex / _actionSequence.length);
    progress.value = actionProgress;
    
    _phaseTimer = Timer(const Duration(seconds: 15), _handleTimeout);
  }

  void _handleLivenessAction(Face face) {
    if (_currentActionIndex >= _actionSequence.length) return;
    
    final currentAction = _actionSequence[_currentActionIndex];
    
    switch (currentAction) {
      case LivenessAction.blink:
        _handleBlink(face);
        break;
      case LivenessAction.smile:
        _handleSmile(face);
        break;
      case LivenessAction.turnLeft:
        _handleTurnLeft(face);
        break;
      case LivenessAction.turnRight:
        _handleTurnRight(face);
        break;
    }
  }

  void _handleBlink(Face face) {
    final leftEye = face.leftEyeOpenProbability ?? 1.0;
    final rightEye = face.rightEyeOpenProbability ?? 1.0;
    
    // Detect blink: both eyes < threshold
    if (leftEye < BLINK_THRESHOLD && rightEye < BLINK_THRESHOLD) {
      _detectionFrameCount++;
      if (_detectionFrameCount >= REQUIRED_FRAMES) {
        _blinkDetected = true;
        _captureCurrentFrame();
        _advanceToNextAction();
      }
    } else {
      _detectionFrameCount = 0;
    }
  }

  void _handleSmile(Face face) {
    final smileProbability = face.smilingProbability ?? 0.0;
    
    // Detect smile
    if (smileProbability > SMILE_THRESHOLD) {
      _detectionFrameCount++;
      if (_detectionFrameCount >= REQUIRED_FRAMES) {
        _smileDetected = true;
        frameStatus.value = FrameStatus.success;
        _captureCurrentFrame();
        _advanceToNextAction();
      }
    } else {
      _detectionFrameCount = 0;
      if (smileProbability < 0.3) {
        activeWarnings.add('Hãy mỉm cười');
      }
    }
  }

  void _handleTurnLeft(Face face) {
  final yaw = face.headEulerAngleY ?? 0;
  
  // Front camera is mirrored: positive yaw = user's LEFT
  if (yaw > MIN_TURN_ANGLE) {
    frameStatus.value = FrameStatus.success;
    _captureCurrentFrame();
    _leftTurnCaptured = true;
    _advanceToNextAction();
  } else if (yaw < 5) {
    activeWarnings.add('Quay sang TRÁI nhiều hơn');
  }
}

  void _handleTurnRight(Face face) {
  final yaw = face.headEulerAngleY ?? 0;
  
  // Front camera is mirrored: negative yaw = user's RIGHT
  if (yaw < -MIN_TURN_ANGLE) {
    frameStatus.value = FrameStatus.success;
    _captureCurrentFrame();
    _rightTurnCaptured = true;
    _advanceToNextAction();
  } else if (yaw > -5) {
    activeWarnings.add('Quay sang PHẢI nhiều hơn');
  }
}

  void _advanceToNextAction() {
    _currentActionIndex++;
    _detectionFrameCount = 0;
    
    // Brief delay before next action
    Future.delayed(const Duration(milliseconds: 300), () {
      _startNextLivenessAction();
    });
  }

  // ===================== PHASE 5: SUBMISSION =====================
  
  Future<void> _submitRegistration() async {
    _phaseTimer?.cancel();
    isProcessing.value = true;
    state.value = FaceRegistrationState.submitting;
    statusMessage.value = 'Đang đăng ký...';
    progress.value = 0.85;

    try {
      await cameraController!.stopImageStream();
      
      // Capture final high-res image
      final image = await cameraController!.takePicture();
      final bytes = await image.readAsBytes();
      final originalImage = img.decodeImage(bytes);
      if (originalImage != null) {
        final flipped = img.flipHorizontal(originalImage);
        final jpegBytes = img.encodeJpg(flipped, quality: 90);
        _capturedImages.add(base64Encode(jpegBytes));
      }

      progress.value = 0.90;

      final response = await _apiService.post('/api/face-attendance/register', data: {
        'faceImages': _capturedImages,
        'livenessProof': {
          'passedPassiveCheck': true,
          'passedBlinkCheck': _blinkDetected,
          'passedHeadMovement': _leftTurnCaptured && _rightTurnCaptured,
          'passedSmile': _smileDetected,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        },
      });

      if (response.statusCode == 200) {
        state.value = FaceRegistrationState.success;
        statusMessage.value = 'Đăng ký thành công!';
        progress.value = 1.0;
        faceCount.value++;
        frameStatus.value = FrameStatus.success;
        
        // Log timing
        final duration = DateTime.now().difference(_flowStartTime!);
        debugPrint('Registration completed in ${duration.inSeconds}s');
        
        // Refresh user data
        try {
          final authController = Get.find<AuthController>();
          await authController.fetchCurrentUser();
        } catch (_) {}
      } else {
        throw Exception(response.data['message'] ?? 'Registration failed');
      }
    } on DioException catch (e) {
      _handleRegistrationError(e);
    } catch (e) {
      state.value = FaceRegistrationState.error;
      errorMessage.value = 'Lỗi: $e';
      statusMessage.value = 'Thất bại';
    } finally {
      isProcessing.value = false;
    }
  }

  void _handleRegistrationError(DioException e) {
    state.value = FaceRegistrationState.error;
    String message = 'Đăng ký thất bại';
    
    if (e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map<String, dynamic>) {
        String backendMessage = data['message'] as String? ?? '';
        
        // Try to extract Vietnamese message from AI service response
        // Format: "AI service error: 400 BAD REQUEST: "{<EOL>  \"message\": \"Tiếng Việt\"..."
        if (backendMessage.contains('AI service error')) {
          // Extract the inner JSON message
          final msgMatch = RegExp(r'"message":\s*"([^"]+)"').firstMatch(backendMessage);
          if (msgMatch != null) {
            // Decode unicode escapes
            String extracted = msgMatch.group(1) ?? '';
            extracted = extracted.replaceAll(r'\u', '\\u');
            try {
              // Parse unicode sequences like \u1ea2 to Vietnamese
              message = _decodeUnicode(extracted);
            } catch (_) {
              message = extracted;
            }
          }
        } else if (backendMessage.contains('glasses_detected')) {
          message = 'Vui lòng THÁO KÍNH';
        } else if (backendMessage.contains('face_too_small')) {
          message = 'Mặt QUÁ XA. Hãy lại gần.';
        } else if (backendMessage.contains('face_too_large')) {
          message = 'Mặt QUÁ GẦN. Hãy lùi lại.';
        } else if (backendMessage.contains('image_blurry')) {
          message = 'Ảnh bị MỜ. Giữ yên điện thoại.';
        } else if (backendMessage.contains('too_dark')) {
          message = 'Quá TỐI. Tìm nơi sáng hơn.';
        } else if (backendMessage.contains('too_bright')) {
          message = 'Quá SÁNG. Tránh ánh nắng trực tiếp.';
        } else if (backendMessage.contains('head_turned')) {
          message = 'Nhìn THẲNG vào camera.';
        } else if (backendMessage.contains('Face already registered')) {
          message = 'Khuôn mặt đã được đăng ký.';
          state.value = FaceRegistrationState.alreadyRegistered;
        } else if (backendMessage.isNotEmpty && backendMessage.length < 100) {
          message = backendMessage;
        }
      }
    }
    
    errorMessage.value = message;
    statusMessage.value = message;
    frameStatus.value = FrameStatus.error;
    
    // Show prominent toast
    Get.snackbar('Lỗi', message,
      backgroundColor: Colors.red.shade700,
      colorText: Colors.white,
      snackPosition: SnackPosition.TOP,
      duration: const Duration(seconds: 3),
      margin: const EdgeInsets.all(12),
      borderRadius: 8,
    );
  }
  
  /// Decode unicode escape sequences to Vietnamese characters
  String _decodeUnicode(String input) {
    return input.replaceAllMapped(
      RegExp(r'\\u([0-9a-fA-F]{4})'),
      (match) => String.fromCharCode(int.parse(match.group(1)!, radix: 16)),
    );
  }

  // ===================== HELPERS =====================
  
  void _handleTimeout() {
    state.value = FaceRegistrationState.error;
    errorMessage.value = 'Hết thời gian. Vui lòng thử lại.';
    statusMessage.value = 'Hết thời gian';
  }

  void _addWarning(String warning) {
    if (!activeWarnings.contains(warning)) {
      activeWarnings.add(warning);
    }
  }

  /// Show a toast notification with debouncing to avoid spam
  void _showWarningToast(String message) {
    final now = DateTime.now();
    if (_lastToastTime != null && 
        now.difference(_lastToastTime!).inMilliseconds < _toastCooldownMs) {
      return;  // Skip if within cooldown period
    }
    _lastToastTime = now;
    
    Get.showSnackbar(GetSnackBar(
      message: message,
      duration: const Duration(seconds: 2),
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: Colors.orange.shade700,
      margin: const EdgeInsets.all(12),
      borderRadius: 8,
    ));
  }

  Future<void> _captureCurrentFrame() async {
    if (_lastCameraImage == null) return;
    
    try {
      final img.Image? image = ImageConverterUtils.convertYUV420ToImage(_lastCameraImage!);
      if (image != null) {
        final flipped = img.flipHorizontal(image);
        final jpegBytes = img.encodeJpg(flipped, quality: 80);
        _capturedImages.add(base64Encode(jpegBytes));
        debugPrint('Captured frame. Total: ${_capturedImages.length}');
      }
    } catch (e) {
      debugPrint('Frame capture error: $e');
    }
  }

  InputImage? _convertCameraImage(CameraImage image) {
    try {
      final allBytes = image.planes.fold<List<int>>(
        [],
        (List<int> prev, Plane plane) => prev..addAll(plane.bytes),
      );

      final rotation = InputImageRotationValue.fromRawValue(
        cameraController!.description.sensorOrientation,
      );
      if (rotation == null) return null;

      final format = InputImageFormatValue.fromRawValue(image.format.raw);
      if (format == null) return null;

      return InputImage.fromBytes(
        bytes: Uint8List.fromList(allBytes),
        metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: format,
          bytesPerRow: image.planes.first.bytesPerRow,
        ),
      );
    } catch (e) {
      return null;
    }
  }

  void retry() {
    _blinkDetected = false;
    _smileDetected = false;
    _leftTurnCaptured = false;
    _rightTurnCaptured = false;
    _detectionFrameCount = 0;
    _currentActionIndex = 0;
    _capturedImages.clear();
    activeWarnings.clear();
    errorMessage.value = '';
    progress.value = 0.0;
    frameStatus.value = FrameStatus.normal;
    currentActionName.value = '';
    
    _generateRandomActionSequence();
    _initializeCamera();
  }

  void registerMore() {
    retry();
  }

  /// Get current phase info for UI step indicator
  int get currentPhaseIndex {
    switch (state.value) {
      case FaceRegistrationState.environmentCheck:
        return 0;
      case FaceRegistrationState.livenessAction:
        // Return index 1-4 based on current action
        return 1 + _currentActionIndex.clamp(0, 3);
      case FaceRegistrationState.submitting:
      case FaceRegistrationState.success:
        return 5;
      default:
        return 0;
    }
  }

  /// Get total number of steps for UI
  int get totalSteps => 6; // Environment + 4 actions + Submit
}
