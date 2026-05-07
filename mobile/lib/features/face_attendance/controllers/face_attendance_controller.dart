import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'dart:ui';
import 'dart:convert'; // Added for base64Encode

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image/image.dart' as img;
import 'package:network_info_plus/network_info_plus.dart';
import 'package:dio/dio.dart' as dio;
import 'package:permission_handler/permission_handler.dart';

import '../../../core/utils/image_converter_utils.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../schedule/controllers/schedule_controller.dart';
import '../../../core/constants/api_constants.dart';

enum LivenessChallenge { 
  none, 
  blink, 
  smile, 
  headTurnLeft, 
  headTurnRight,
  lookUp,      // NEW: Look up
  openMouth,   // NEW: Open mouth wide
  nodHead,     // NEW: Nod head (down then up)
}

enum AttendanceState { 
  initializing, 
  lookingForFace, 
  securityChecking, // NEW: Prevent redundant triggers
  performingChallenge, 
  verifying, 
  success, 
  failure 
}

class FaceAttendanceController extends GetxController {
  final int slotId;
  FaceAttendanceController({required this.slotId});

  // State
  final state = AttendanceState.initializing.obs;
  final instructionText = 'Đang khởi động camera...'.obs;
  final currentChallenge = LivenessChallenge.none.obs;
  final remainingAttempts = 5.obs; // FIXED: Initialize to max attempts (matches backend default)
  
  // Neutral Face Logic
  bool _isWaitingForNeutral = false;
  static const int NEUTRAL_HOLD_MS = 300; // Must hold neutral for 300ms
  int _neutralConsecutiveFrames = 0;
  
  // Challenge sequence logic
  final List<LivenessChallenge> _challengeSequence = [];
  int _currentChallengeIndex = 0;
  static const int MIN_CHALLENGES = 2;
  static const int MAX_CHALLENGES = 4;
  int _requiredChallenges = 2; // Will be randomized per session
  final Random _random = Random();
  
  // Consecutive straight frames for stabilization
  int _straightConsecutiveFrames = 0;
  
  // Camera & Face Detection
  CameraController? cameraController;
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableClassification: true,
      enableLandmarks: true,
      enableTracking: true,
      performanceMode: FaceDetectorMode.accurate,
      minFaceSize: 0.15, // Should be close
    ),
  );
  
  bool _isDetecting = false;
  CameraImage? _lastCameraImage;
  Timer? _challengeTimer;
    
  // Liveness Logic
  bool _eyeOpenState = true; // For blink detection
  bool _nodState = false;   // For nod detection (down phase)
  static const double EYE_OPEN_THRESHOLD = 0.70;   // Relaxed from 0.85
  static const double EYE_CLOSED_THRESHOLD = 0.35; // Relaxed from 0.20
  static const double SMILE_THRESHOLD = 0.6;       // Relaxed from 0.8
  static const double HEAD_TURN_THRESHOLD = 15.0;  // Relaxed from 20.0
  static const double LOOK_UP_THRESHOLD = -12.0;   // Relaxed from -15.0
  static const double NOD_DOWN_THRESHOLD = 12.0;   // Relaxed from 15.0
  static const double MOUTH_OPEN_THRESHOLD = 0.5;  // Relaxed from 0.6
  
  // Result Data
  String resultMessage = '';
  double? confidence;
  String? studentName;

  @override
  void onInit() {
    super.onInit();
    _fetchInitialStatus();
    _initializeCamera();
  }

  Future<void> _fetchInitialStatus() async {
      try {
          final authController = Get.find<AuthController>();
          final token = await authController.apiService.getToken();
          if (token == null) return;

          final dioClient = dio.Dio(dio.BaseOptions(
            baseUrl: ApiConstants.baseUrl,
            headers: { 'Authorization': 'Bearer $token' },
          ));

          final response = await dioClient.get('/api/face-attendance/status/$slotId');
          if (response.statusCode == 200) {
              final data = response.data;
              remainingAttempts.value = data['remainingAttempts'] ?? 5;
              debugPrint('Initial attempts synced: ${remainingAttempts.value}');
          }
      } catch (e) {
          debugPrint('Failed to fetch initial status: $e');
      }
  }

  @override
  void onClose() {
    _stopCamera();
    _faceDetector.close();
    _challengeTimer?.cancel();
    super.onClose();
  }

  Future<void> _initializeCamera() async {
    try {
      // Request Location Permission (Required for BSSID on Android 10+)
      final locStatus = await Permission.location.request();
      if (locStatus.isDenied || locStatus.isPermanentlyDenied) {
        state.value = AttendanceState.failure;
        resultMessage = 'Ứng dụng cần quyền Truy cập Vị trí để xác định WiFi trong phòng học. Vui lòng cấp quyền trong Cài đặt.';
        return;
      }

      final cameras = await availableCameras();
      final frontCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      cameraController = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid
            ? ImageFormatGroup.nv21
            : ImageFormatGroup.bgra8888,
      );

      await cameraController!.initialize();
      
      // Set fixed orientation to avoid rotation issues
      await cameraController!.lockCaptureOrientation(DeviceOrientation.portraitUp);

      update(); // Update UI
      
      state.value = AttendanceState.lookingForFace;
      instructionText.value = 'HÃY nhìn thẳng vào camera';
      
      cameraController!.startImageStream(_processImage);
    } catch (e) {
      debugPrint('Camera init error: $e');
      state.value = AttendanceState.failure;
      resultMessage = 'Lỗi camera: $e';
    }
  }
  
  void _stopCamera() {
    cameraController?.stopImageStream();
    cameraController?.dispose();
    cameraController = null;
  }

  Future<void> _processImage(CameraImage image) async {
    if (_isDetecting || state.value == AttendanceState.verifying || 
        state.value == AttendanceState.success || state.value == AttendanceState.failure) {
      return;
    }
    
    _isDetecting = true;
    _lastCameraImage = image;

    try {
      final inputImage = _convertCameraImage(image);
      if (inputImage == null) return;

      final faces = await _faceDetector.processImage(inputImage);
      
      if (faces.isEmpty) {
        if (state.value == AttendanceState.performingChallenge) {
          // Lost face during challenge -> Reset
          _resetChallenge();
        }
        instructionText.value = 'Không thấy khuôn mặt';
      } else {
        // If multiple faces, pick the largest one
        Face primaryFace = faces.first;
        if (faces.length > 1) {
             // Find largest face by bounding box area
             primaryFace = faces.reduce((curr, next) => 
                (curr.boundingBox.width * curr.boundingBox.height) > 
                (next.boundingBox.width * next.boundingBox.height) ? curr : next
             );
        }
        _handleSingleFace(primaryFace);
      }
    } catch (e) {
      debugPrint('Detection error: $e');
    } finally {
      _isDetecting = false;
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

  // Replay check state
  bool _isCheckingReplay = false;

  Future<void> _handleSingleFace(Face face) async {
    if (state.value == AttendanceState.lookingForFace) {
      // Fast-capture logic: Start security check immediately if face is mostly straight
      if (face.headEulerAngleY!.abs() > 25 || face.headEulerAngleX!.abs() > 25) {
        // Only show "look straight" if not already showing a specific quality warning from server
        if (!instructionText.value.contains("mặt lại gần") && !instructionText.value.contains("ánh sáng")) {
          instructionText.value = 'Nhìn thẳng camera để bắt đầu';
        }
        _straightConsecutiveFrames = 0;
        return;
      }

      // We have a straight face, proceed to server-side check immediately
      // unless we are already checking or just showed a warning.
      if (_isCheckingReplay) return;

      // SERVER-SIDE REPLAY CHECK (FAIL FAST)
      _isCheckingReplay = true;
      instructionText.value = 'Đang kiểm tra an toàn...';
      
      try {
          if (_lastCameraImage == null) throw Exception("No image");
          
          final preCheckResponse = await _checkReplayWithServer(_lastCameraImage!);
          final bool isClean = preCheckResponse['passed'] == true;
          final bool isWarning = preCheckResponse['isQualityWarning'] == true;
          
          if (!isClean) {
              if (isWarning) {
                  // It's a quality instruction (too far, low light), NOT a failed attempt
                  instructionText.value = preCheckResponse['message'] ?? "Vui lòng điều chỉnh lại vị trí mặt";
                  _isCheckingReplay = false;
                  _straightConsecutiveFrames = 0; // Reset to ensure they hold still again
                  return;
              } else {
                  // Malicious spoof, fail the session
                  state.value = AttendanceState.failure;
                  resultMessage = preCheckResponse['message'] ?? "Hình ảnh không hợp lệ. Vui lòng chụp ảnh trực tiếp.";
                  _isCheckingReplay = false;
                  return; 
              }
          }
      } catch (e) {
          debugPrint("Replay check error: $e");
      } finally {
          _isCheckingReplay = false;
      }

      // Add a small delay for better UX transition
      await Future.delayed(const Duration(milliseconds: 500));

      // PASSED Security Check (Server & Proxy)
      state.value = AttendanceState.securityChecking; 
      instructionText.value = 'Đang quét 3D (Hình học)...';
      _isCheckingReplay = false;
      
      // Wait for stabilization (Passive Liveness)
      Future.delayed(const Duration(milliseconds: 2000), () { 
          if (state.value == AttendanceState.securityChecking) {
             _completeSequence(); // Zero-interaction flow
          }
      });
    } else if (state.value == AttendanceState.performingChallenge) {
      _monitorChallenge(face);
    }
  }

  Future<Map<String, dynamic>> _checkReplayWithServer(CameraImage image) async {
      try {
          // 1. Convert Image
          final img.Image? convertedImage = ImageConverterUtils.convertYUV420ToImage(image);
          if (convertedImage == null) return {'passed': true}; // Skip if conversion fails

          // Rotate/Flip (Front camera)
          var finalImage = img.copyRotate(convertedImage, angle: -90);
          finalImage = img.flipHorizontal(finalImage); 
          
          final jpgBytes = img.encodeJpg(finalImage, quality: 50);
          final base64Image = base64Encode(jpgBytes);

          // 2. Get Token
          final authController = Get.find<AuthController>();
          final token = await authController.apiService.getToken();
          if (token == null) return {'passed': true};

          // 3. Call API
          final dioClient = dio.Dio(dio.BaseOptions(
            baseUrl: ApiConstants.baseUrl,
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
            connectTimeout: const Duration(seconds: 5),
          ));

          final response = await dioClient.post(
            '/api/face-attendance/pre-check',
            data: {
              'slotId': slotId,
              'image': base64Image,
            },
          );

          if (response.statusCode == 200) {
              final data = response.data;
              
              if (data['remainingAttempts'] != null) {
                  remainingAttempts.value = data['remainingAttempts'];
              }

              return {
                  'passed': data['passed'] == true,
                  'isQualityWarning': data['isQualityWarning'] == true,
                  'message': data['message'],
              };
          }
          return {'passed': false, 'message': 'Server error ${response.statusCode}'};
      } catch (e) {
          debugPrint('Security pre-check failed: $e');
          if (e is dio.DioException && e.response?.statusCode != null) {
              final data = e.response?.data;
              if (data is Map) {
                  if (data['remainingAttempts'] != null) {
                      remainingAttempts.value = data['remainingAttempts'];
                  }
                  return {
                      'passed': false,
                      'isQualityWarning': data['isQualityWarning'] == true,
                      'message': data['message'],
                  };
              }
          }
          return {'passed': true}; // Safety fallback: proceed anyway if security service is down
      }
  }

  void _startChallengeSequence() {
    state.value = AttendanceState.performingChallenge;
    _challengeSequence.clear();
    _currentChallengeIndex = 0;
    
    // PHASE 4: PASSIVE 3D GEOMETRY (Smoothest Experience)
    _requiredChallenges = 0; 
    
    // Core challenges (ignored but kept for reference)
    final coreChallenges = [
      LivenessChallenge.blink, 
      LivenessChallenge.smile, 
      LivenessChallenge.headTurnLeft, 
      LivenessChallenge.headTurnRight,
      LivenessChallenge.lookUp,
      LivenessChallenge.openMouth,
      LivenessChallenge.nodHead,
    ];
    
    // Shuffle and pick
    coreChallenges.shuffle(_random);
    final selected = coreChallenges.take(_requiredChallenges).toList();
    
    // Remove Noise Injection for speed
    // User complaint: "time is too long"
    
    _challengeSequence.addAll(selected);
    
    _challengeSequence.addAll(selected);
    
    debugPrint('🎲 Challenge sequence: $_challengeSequence');
    
    _nextChallenge();
  }

  void _nextChallenge() {
    _challengeTimer?.cancel();

    if (_currentChallengeIndex >= _challengeSequence.length) {
      _completeSequence();
      return;
    }

    currentChallenge.value = _challengeSequence[_currentChallengeIndex];
    
    // Reset state for stateful challenges
    _eyeOpenState = true;
    _nodState = false;
    _isWaitingForNeutral = false; // Start challenge
    
    // Set instruction
    switch (currentChallenge.value) {
      case LivenessChallenge.blink:
        instructionText.value = 'HÃY chớp mắt';
        break;
      case LivenessChallenge.smile:
        instructionText.value = 'HÃY mỉm cười';
        break;
      case LivenessChallenge.headTurnLeft:
        instructionText.value = 'HÃY quay đầu sang TRÁI';
        break;
      case LivenessChallenge.headTurnRight:
        instructionText.value = 'HÃY quay đầu sang PHẢI';
        break;
      case LivenessChallenge.lookUp:
        instructionText.value = 'HÃY nhìn LÊN TRÊN';
        break;
      case LivenessChallenge.openMouth:
        instructionText.value = 'HÃY mở MIỆNG to';
        break;
      case LivenessChallenge.nodHead:
        instructionText.value = 'HÃY gật đầu XUỐNG rồi LÊN';
        break;
      case LivenessChallenge.none:
         // Noise action
         instructionText.value = 'Giữ nguyên...';
         break;
    }

    // RANDOM TIMEOUT PER ACTION (1.2 - 2.5s)
    final timeoutMs = 1200 + _random.nextInt(1300); 
    
    _challengeTimer = Timer(Duration(milliseconds: timeoutMs), () {
        if (state.value == AttendanceState.performingChallenge) {
             if (currentChallenge.value == LivenessChallenge.none) {
                 _onChallengePassed();
             } else {
                 _resetChallenge(message: 'Quá chậm! Thử lại');
             }
        }
    });
  }
  
  // Neutral Face Check
  bool _isNeutralFace(Face face) {
      final smile = face.smilingProbability ?? 0.0;
      final leftOpen = face.leftEyeOpenProbability ?? 1.0;
      final rightOpen = face.rightEyeOpenProbability ?? 1.0;
      final headY = face.headEulerAngleY ?? 0.0;
      final headX = face.headEulerAngleX ?? 0.0;
      
      // Strict constraints for "Neutral":
      // 1. Not smiling
      // 2. Eyes open
      // 3. Looking straight (approx)
      return smile < 0.4 &&  // Relaxed from 0.3
             leftOpen > 0.4 && rightOpen > 0.4 && // Relaxed from 0.5
             headY.abs() < 20 && headX.abs() < 20; // Relaxed from 15
  }

  void _resetChallenge({String? message}) {
    state.value = AttendanceState.lookingForFace;
    currentChallenge.value = LivenessChallenge.none;
    instructionText.value = message ?? 'Nhìn thẳng camera';
    _challengeTimer?.cancel();
    _isWaitingForNeutral = false;
  }

  void _monitorChallenge(Face face) {
    // If waiting for neutral face
    if (_isWaitingForNeutral) {
        if (_isNeutralFace(face)) {
            _neutralConsecutiveFrames++;
            if (_neutralConsecutiveFrames >= 5) { // MODERATE: 5 frames (~150ms) to ensure deliberate stop
                _isWaitingForNeutral = false;
                _neutralConsecutiveFrames = 0;
                
                // Proceed to next challenge
                if (_currentChallengeIndex < _challengeSequence.length) {
                    _nextChallenge();
                } else {
                    _completeSequence();
                }
            }
        } else {
            _neutralConsecutiveFrames = 0; // Reset if moved
            instructionText.value = 'Hãy nhìn thẳng và giữ nghiêm túc';
        }
        return;
    }

    bool challengePassed = false;
    
    // For "Active" challenges, check if completed
    switch (currentChallenge.value) {
      case LivenessChallenge.blink:
        final leftOpen = face.leftEyeOpenProbability ?? 1.0;
        final rightOpen = face.rightEyeOpenProbability ?? 1.0;
        if (_eyeOpenState) {
          if (leftOpen < EYE_CLOSED_THRESHOLD && rightOpen < EYE_CLOSED_THRESHOLD) _eyeOpenState = false;
        } else {
           if (leftOpen > EYE_OPEN_THRESHOLD && rightOpen > EYE_OPEN_THRESHOLD) challengePassed = true;
        }
        break;
      case LivenessChallenge.smile:
        if ((face.smilingProbability ?? 0) > SMILE_THRESHOLD) challengePassed = true;
        break;
      case LivenessChallenge.headTurnLeft:
        if (face.headEulerAngleY! > HEAD_TURN_THRESHOLD) challengePassed = true;
        break;
      case LivenessChallenge.headTurnRight:
        if (face.headEulerAngleY! < -HEAD_TURN_THRESHOLD) challengePassed = true;
        break;
      case LivenessChallenge.lookUp:
        if ((face.headEulerAngleX ?? 0) < LOOK_UP_THRESHOLD) challengePassed = true;
        break;
      case LivenessChallenge.openMouth:
        if ((face.smilingProbability ?? 0.5) < 0.3) challengePassed = true; 
        break;
      case LivenessChallenge.nodHead:
        if (face.headEulerAngleX != null) {
          if (!_nodState) {
            if (face.headEulerAngleX! > NOD_DOWN_THRESHOLD) {
               _nodState = true;
               instructionText.value = 'Tốt! Giờ hãy ngẩng LÊN';
            }
          } else {
            if (face.headEulerAngleX! < 0) challengePassed = true;
          }
        }
        break;
      case LivenessChallenge.none:
         // For "Hold Still", we just wait for timeout (Success)
         // But we should fail if user moves too much? 
         // For now, let's just interpret as a "Pause"
         // Logic handled in Timer
         break;
    }

    if (challengePassed) {
       _onChallengePassed();
    }
  }

  void _onChallengePassed() {
     _challengeTimer?.cancel();
     _currentChallengeIndex++;
     // Don't increment index yet? No, we incremented it. 
     // Wait, logic: Pass -> Increment -> Wait Neutral -> Next Challenge
     
     // Haptic feedback
     HapticFeedback.mediumImpact();
     instructionText.value = '✓ Tốt!';
     
     // Enter Neutral Wait State instead of immediately finding next
     if (_currentChallengeIndex < _challengeSequence.length) {
         _isWaitingForNeutral = true;
         _neutralConsecutiveFrames = 0;
         // Slight delay before requiring neutral?
         Future.delayed(Duration(milliseconds: 100), () { // FAST: Reduced from 500ms
             if (state.value == AttendanceState.performingChallenge) {
                  instructionText.value = '...';
             }
         });
     } else {
         _completeSequence();
     }
  }

  void _completeSequence() {
    _challengeTimer?.cancel();
    state.value = AttendanceState.verifying;
    instructionText.value = 'Đang xác thực...';
    _performVerification();
  }

  Future<void> _performVerification() async {
    try {
      // 1. Capture Image
      if (_lastCameraImage == null) throw Exception("No image captured");
      
      final img.Image? convertedImage = ImageConverterUtils.convertYUV420ToImage(_lastCameraImage!);
      if (convertedImage == null) throw Exception("Failed to convert image");

      // Rotate/Flip if needed (Front camera usually mirrored and rotated)
      var finalImage = img.copyRotate(convertedImage, angle: -90);
      finalImage = img.flipHorizontal(finalImage); 
      
      final jpgBytes = img.encodeJpg(finalImage, quality: 70);
      final base64Image = base64Encode(jpgBytes);

      // 2. Get Wifi Info
      final scheduleController = Get.find<ScheduleController>();
      final config = scheduleController.attendanceConfig.value;
      
      String? wifiBssid;
      String? wifiSsid;
      
      if (config.wifiLocationEnabled) {
          final info = NetworkInfo();
          wifiBssid = await info.getWifiBSSID(); 
          wifiSsid = await info.getWifiName();
          
          // Clean SSID quotes (iOS artifact)
          if (wifiSsid != null && wifiSsid.startsWith('"') && wifiSsid.endsWith('"')) {
            wifiSsid = wifiSsid.substring(1, wifiSsid.length - 1);
          }
          debugPrint('Captured WiFi SSID: $wifiSsid, BSSID: $wifiBssid');
      } else {
          debugPrint('WiFi location check is disabled in config, skipping scan.');
      }
      
      // 3. Call API
      final authController = Get.find<AuthController>();
      final token = await authController.apiService.getToken();
      
      if (token == null) throw Exception("Unauthorized");
      
      final dioClient = dio.Dio(dio.BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ));

      // Attempt number is now managed by backend, but we send a placeholder 
      // or the last known value for backward compatibility if needed.
      // Better yet, we just send the request and let the server increment.

      final response = await dioClient.post(
        '/api/face-attendance/check-in',
        data: {
          'slotId': slotId,
          'faceImageBase64': base64Image,
          'wifiSsid': wifiSsid ?? "",
          'wifiBssid': wifiBssid ?? "", 
          'wifiRssi': -55,
          'attemptNumber': 0, // Placeholder, backend will increment
        },
      );

      // 4. Handle Response
      if (response.statusCode == 200 || response.statusCode == 202) {
        final data = response.data;
        final status = data['status'];
        
        // Sync remaining attempts from server
        remainingAttempts.value = data['remainingAttempts'] ?? 0;

        if (status == 'SUCCESS') {
          state.value = AttendanceState.success;
          confidence = data['confidence'];
          resultMessage = 'Điểm danh thành công!';
        } else if (status == 'ALREADY_CHECKED_IN') {
           state.value = AttendanceState.success;
           resultMessage = 'Bạn đã điểm danh rồi!';
        } else if (status == 'REQUIRES_MANUAL') {
          state.value = AttendanceState.failure;
          resultMessage = data['message'] ?? 'Cần giảng viên xác nhận thủ công.';
        } else {
          state.value = AttendanceState.failure;
          resultMessage = data['message'] ?? 'Điểm danh thất bại';
        }
      } else {
        throw Exception('API Error: ${response.statusCode}');
      }

    } catch (e) {
      debugPrint('Verification error: $e');
      state.value = AttendanceState.failure;
      
      if (e is dio.DioException) {
         resultMessage = e.response?.data['message'] ?? 'Lỗi kết nối';
         if (e.response?.statusCode == 400 && e.response?.data['status'] == 'FAILED') {
            resultMessage = e.response?.data['message'];
         }
      } else {
        resultMessage = 'Lỗi hệ thống: $e';
      }
    }
  }
  
  void _resetState() {
    state.value = AttendanceState.initializing;
    instructionText.value = 'Đang khởi động camera...';
    currentChallenge.value = LivenessChallenge.none;
    _currentChallengeIndex = 0;
    _challengeSequence.clear();
    _straightConsecutiveFrames = 0;
    _neutralConsecutiveFrames = 0;
    _isCheckingReplay = false;
    _isDetecting = false;
    _isWaitingForNeutral = false;
    _nodState = false;
    _eyeOpenState = true;
    resultMessage = '';
    confidence = null;
    studentName = null;
  }

  void retry() {
    _stopCamera();
    _resetState();
    _initializeCamera();
  }
}
