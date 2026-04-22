import 'dart:convert';
import 'dart:async';
import 'dart:ui';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:network_info_plus/network_info_plus.dart';
import '../../../core/services/api_service.dart';

/// States for face check-in flow
enum FaceCheckInState {
  checkingWifi,
  wifiNotFound,
  initializingCamera,
  ready,
  detectingFace,
  capturing,
  submitting,
  success,
  failed,
  requiresManualVerify,
}

/// Face Check-in Controller
/// Handles WiFi verification, face capture, and attendance submission with retry logic
class FaceCheckInController extends GetxController {
  final ApiService _apiService = ApiService();
  final NetworkInfo _networkInfo = NetworkInfo();
  
  // Parameters
  final int slotId;
  final String courseName;
  final String roomName;
  
  FaceCheckInController({
    required this.slotId,
    required this.courseName,
    required this.roomName,
  });

  // Camera
  CameraController? cameraController;
  late FaceDetector _faceDetector;
  
  // State
  final Rx<FaceCheckInState> state = FaceCheckInState.checkingWifi.obs;
  final RxString statusMessage = ''.obs;
  final RxBool isFaceDetected = false.obs;
  final RxBool isProcessing = false.obs;
  final RxString errorMessage = ''.obs;
  
  // WiFi Info
  final RxString wifiBssid = ''.obs;
  final RxInt wifiRssi = 0.obs;
  final RxString wifiSsid = ''.obs;
  
  // Retry logic
  final int maxAttempts = 3;
  final RxInt currentAttempt = 0.obs;
  final RxList<String> failureReasons = <String>[].obs;

  // Detection
  bool _isDetecting = false;
  Timer? _countdownTimer;
  final RxInt captureCountdown = 0.obs;

  @override
  void onInit() {
    super.onInit();
    _initializeFaceDetector();
    _checkWifiAndInitialize();
  }

  @override
  void onClose() {
    cameraController?.dispose();
    _faceDetector.close();
    _countdownTimer?.cancel();
    super.onClose();
  }

  void _initializeFaceDetector() {
    final options = FaceDetectorOptions(
      enableClassification: true,
      performanceMode: FaceDetectorMode.fast,
    );
    _faceDetector = FaceDetector(options: options);
  }

  Future<void> _checkWifiAndInitialize() async {
    state.value = FaceCheckInState.checkingWifi;
    statusMessage.value = 'Đang kiểm tra vị trí...';

    try {
      // Get WiFi information
      final bssid = await _networkInfo.getWifiBSSID();
      final ssid = await _networkInfo.getWifiName();

      if (bssid == null || bssid.isEmpty) {
        state.value = FaceCheckInState.wifiNotFound;
        statusMessage.value = 'Không thể xác định vị trí';
        errorMessage.value = 'Vui lòng kết nối WiFi của phòng học để điểm danh';
        return;
      }

      wifiBssid.value = bssid;
      wifiSsid.value = ssid ?? 'Unknown';
      
      // Get RSSI (signal strength) - platform specific
      // Note: network_info_plus doesn't provide RSSI, would need platform channel
      wifiRssi.value = -65; // Default value

      // Initialize camera
      await _initializeCamera();
    } catch (e) {
      state.value = FaceCheckInState.wifiNotFound;
      errorMessage.value = 'Lỗi kiểm tra WiFi: $e';
    }
  }

  Future<void> _initializeCamera() async {
    state.value = FaceCheckInState.initializingCamera;
    statusMessage.value = 'Đang khởi tạo camera...';

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
        imageFormatGroup: ImageFormatGroup.nv21,
      );

      await cameraController!.initialize();
      cameraController!.startImageStream(_processImage);

      state.value = FaceCheckInState.ready;
      statusMessage.value = 'Đưa mặt vào khung hình';
      update();
    } catch (e) {
      state.value = FaceCheckInState.failed;
      errorMessage.value = 'Không thể khởi tạo camera: $e';
    }
  }

  Future<void> _processImage(CameraImage image) async {
    if (_isDetecting || isProcessing.value) return;
    _isDetecting = true;

    try {
      final inputImage = _convertCameraImage(image);
      if (inputImage == null) {
        _isDetecting = false;
        return;
      }

      final faces = await _faceDetector.processImage(inputImage);

      if (faces.isEmpty) {
        isFaceDetected.value = false;
        _cancelCountdown();
      } else {
        isFaceDetected.value = true;
        
        // Start countdown when face is detected
        if (state.value == FaceCheckInState.ready && captureCountdown.value == 0) {
          _startCaptureCountdown();
        }
      }
    } catch (e) {
      // Ignore processing errors
    } finally {
      _isDetecting = false;
    }
  }

  InputImage? _convertCameraImage(CameraImage image) {
    try {
      final allBytes = image.planes.fold<List<int>>(
        [],
        (List<int> previousValue, Plane plane) =>
            previousValue..addAll(plane.bytes),
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

  void _startCaptureCountdown() {
    captureCountdown.value = 3;
    state.value = FaceCheckInState.detectingFace;
    statusMessage.value = 'Giữ yên...';

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      captureCountdown.value--;

      if (!isFaceDetected.value) {
        _cancelCountdown();
        return;
      }

      if (captureCountdown.value <= 0) {
        timer.cancel();
        _captureAndSubmit();
      }
    });
  }

  void _cancelCountdown() {
    _countdownTimer?.cancel();
    captureCountdown.value = 0;
    if (state.value == FaceCheckInState.detectingFace) {
      state.value = FaceCheckInState.ready;
      statusMessage.value = 'Đưa mặt vào khung hình';
    }
  }

  Future<void> _captureAndSubmit() async {
    isProcessing.value = true;
    state.value = FaceCheckInState.capturing;
    statusMessage.value = 'Đang chụp...';
    currentAttempt.value++;

    try {
      await cameraController!.stopImageStream();
      final image = await cameraController!.takePicture();
      final bytes = await image.readAsBytes();
      final base64Image = _bytesToBase64(bytes);

      state.value = FaceCheckInState.submitting;
      statusMessage.value = 'Đang xác thực...';

      final response = await _apiService.post('/api/face-attendance/check-in', data: {
        'slotId': slotId,
        'faceImageBase64': base64Image,
        'wifiBssid': wifiBssid.value,
        'wifiRssi': wifiRssi.value,
        'attemptNumber': currentAttempt.value,
      });

      if (response.statusCode == 200) {
        state.value = FaceCheckInState.success;
        statusMessage.value = 'Điểm danh thành công!';
      } else {
        _handleFailure(response.data?['message'] ?? 'Không xác thực được');
      }
    } catch (e) {
      _handleFailure('Lỗi kết nối: $e');
    }
  }

  void _handleFailure(String reason) {
    failureReasons.add(reason);

    if (currentAttempt.value >= maxAttempts) {
      state.value = FaceCheckInState.requiresManualVerify;
      statusMessage.value = 'Cần xác nhận thủ công';
      errorMessage.value = 'Bạn đã thử $maxAttempts lần. Vui lòng chờ giảng viên xác nhận.';
    } else {
      state.value = FaceCheckInState.failed;
      statusMessage.value = 'Thử lại';
      errorMessage.value = '$reason\nCòn ${maxAttempts - currentAttempt.value} lần thử';
      isProcessing.value = false;
    }
  }

  String _bytesToBase64(dynamic bytes) {
    if (bytes is List<int>) {
        return base64Encode(bytes);
    } else if (bytes is Uint8List) {
        return base64Encode(bytes);
    }
    return '';
  }

  void retry() {
    if (currentAttempt.value >= maxAttempts) return;

    errorMessage.value = '';
    captureCountdown.value = 0;
    isProcessing.value = false;

    // Restart camera stream
    _initializeCamera();
  }

  int get remainingAttempts => maxAttempts - currentAttempt.value;
}
