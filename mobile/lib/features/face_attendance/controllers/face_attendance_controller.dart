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

import '../../../core/utils/image_converter_utils.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../../core/constants/api_constants.dart';

enum LivenessChallenge { none, blink, smile }

enum AttendanceState {
  initializing,
  lookingForFace,
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
  DateTime? _challengeStartTime;
  
  // Liveness Logic
  bool _eyeOpenState = true; // For blink detection
  static const double EYE_OPEN_THRESHOLD = 0.8;
  static const double EYE_CLOSED_THRESHOLD = 0.2;
  static const double SMILE_THRESHOLD = 0.8;
  
  // Result Data
  String resultMessage = '';
  double? confidence;
  String? studentName;

  @override
  void onInit() {
    super.onInit();
    _initializeCamera();
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
      } else if (faces.length > 1) {
        instructionText.value = 'Chỉ được 1 người trong khung hình';
      } else {
        final face = faces.first;
        _handleSingleFace(face);
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

  void _handleSingleFace(Face face) {
    // Check face quality (simple checks)
    if (face.headEulerAngleY! > 20 || face.headEulerAngleY! < -20) {
      instructionText.value = 'Nhìn thẳng camera';
      return;
    }

    if (state.value == AttendanceState.lookingForFace) {
      // Face found, start challenge
      _startRandomChallenge();
    } else if (state.value == AttendanceState.performingChallenge) {
      _monitorChallenge(face);
    }
  }

  void _startRandomChallenge() {
    state.value = AttendanceState.performingChallenge;
    
    // Random challenge: 0 = Blink, 1 = Smile
    final random = Random().nextInt(2); 
    if (random == 0) {
      currentChallenge.value = LivenessChallenge.blink;
      instructionText.value = 'HÃY chớp mắt';
      _eyeOpenState = true; // Reset
    } else {
      currentChallenge.value = LivenessChallenge.smile;
      instructionText.value = 'HÃY mỉm cười';
    }
    
    // Timeout for challenge
    _challengeStartTime = DateTime.now();
    _challengeTimer?.cancel();
    _challengeTimer = Timer(const Duration(seconds: 5), () {
      if (state.value == AttendanceState.performingChallenge) {
        _resetChallenge(message: 'Hết thời gian, thử lại');
      }
    });
  }

  void _resetChallenge({String? message}) {
    state.value = AttendanceState.lookingForFace;
    currentChallenge.value = LivenessChallenge.none;
    instructionText.value = message ?? 'Nhìn thẳng camera';
    _challengeTimer?.cancel();
  }

  void _monitorChallenge(Face face) {
    if (currentChallenge.value == LivenessChallenge.blink) {
      final leftOpen = face.leftEyeOpenProbability ?? 1.0;
      final rightOpen = face.rightEyeOpenProbability ?? 1.0;
      
      // Basic blink logic: Open -> Closed -> Open
      if (_eyeOpenState) {
        if (leftOpen < EYE_CLOSED_THRESHOLD && rightOpen < EYE_CLOSED_THRESHOLD) {
          _eyeOpenState = false; // Eyes closed
        }
      } else {
        if (leftOpen > EYE_OPEN_THRESHOLD && rightOpen > EYE_OPEN_THRESHOLD) {
          // Blink completed
          _completeChallenge();
        }
      }
    } else if (currentChallenge.value == LivenessChallenge.smile) {
      final smileProb = face.smilingProbability ?? 0.0;
      if (smileProb > SMILE_THRESHOLD) {
        // Smile detected
        _completeChallenge();
      }
    }
  }

  void _completeChallenge() {
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
      
      final jpgBytes = img.encodeJpg(finalImage, quality: 80);
      final base64Image = base64Encode(jpgBytes);

      // 2. Get Wifi Info
      final info = NetworkInfo();
      String? wifiBssid = await info.getWifiBSSID(); 
      // wifiBssid = wifiBssid ?? "00:00:00:00:00:00"; // DO NOT MOCK IN PROD
      
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

      final response = await dioClient.post(
        '/api/face-attendance/check-in',
        data: {
          'slotId': slotId,
          'faceImageBase64': base64Image,
          'wifiBssid': wifiBssid,
          'wifiRssi': -50,
          'attemptNumber': 1,
        },
      );

      // 4. Handle Response
      if (response.statusCode == 200 || response.statusCode == 202) {
        final data = response.data;
        final status = data['status'];
        
        if (status == 'SUCCESS' || status == 'LATE') {
          state.value = AttendanceState.success;
          confidence = data['confidence'];
          resultMessage = status == 'LATE' ? 'Điểm danh muộn thành công!' : 'Điểm danh thành công!';
        } else if (status == 'ALREADY_CHECKED_IN') {
           state.value = AttendanceState.success;
           resultMessage = 'Bạn đã điểm danh rồi!';
        } else if (status == 'REQUIRES_MANUAL') {
          state.value = AttendanceState.failure;
          resultMessage = 'Cần giảng viên xác nhận thủ công.';
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
  
  void retry() {
    _initializeCamera();
  }
}
