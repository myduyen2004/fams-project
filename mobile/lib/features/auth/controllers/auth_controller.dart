import 'package:get/get.dart' hide FormData, MultipartFile, Response;
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../core/services/api_service.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/constants/app_routes.dart';
import '../models/user_model.dart';
import '../models/login_response.dart';
import 'package:http_parser/http_parser.dart';
import 'dart:convert';

/// Auth Controller - Handle authentication logic with GetX
class AuthController extends GetxController {
  final ApiService apiService = ApiService();

  // Observable state
  final isLoading = false.obs;
  final Rx<User?> currentUser = Rx<User?>(null);
  final isAuthenticated = false.obs;
  final isInitialized = false.obs;

  @override
  void onInit() {
    super.onInit();
    apiService.init();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    debugPrint('AuthController: Starting _initializeApp...');
    try {
      await checkAuthStatus();
    } catch (e) {
      debugPrint('AuthController: Error during _initializeApp: $e');
    } finally {
      debugPrint('AuthController: Initialization complete. Setting isInitialized to true.');
      isInitialized.value = true;
    }
  }

  /// Check if user is already logged in
  Future<void> checkAuthStatus() async {
    try {
      debugPrint('AuthController: Reading token from storage...');
      final token = await apiService.getToken();
      debugPrint('AuthController: Token read result: ${token != null ? "FOUND" : "NOT FOUND"}');

      debugPrint('AuthController: Reading user data from storage...');
      final userData = await apiService.getUserData();
      debugPrint('AuthController: User data read result: ${userData != null ? "FOUND" : "NOT FOUND"}');

      if (token != null && userData != null) {
        currentUser.value = User.fromJson(userData);
        isAuthenticated.value = true;
        debugPrint('AuthController: User authenticated from local storage.');
        
        // Refresh user data from server in background to get latest fields
        fetchCurrentUser();
      } else {
        debugPrint('AuthController: No local session found.');
      }
    } catch (e) {
      debugPrint('AuthController: Check auth status CRITICAL error: $e');
    }
  }

  /// Fetch Current User (Refresh)
  Future<void> fetchCurrentUser() async {
    try {
      final response = await apiService.get(ApiConstants.getCurrentUser);
      if (response.statusCode == 200) {
        final user = User.fromJson(response.data);
        currentUser.value = user;
        await saveUserToStorage(user);
      }
    } catch (e) {
      debugPrint('Error fetching current user: $e');
    }
  }

  /// Get Optimized Cloudinary URL
  String getOptimizedAvatarUrl(String? originalUrl) {
    if (originalUrl == null || originalUrl.isEmpty) return '';
    if (!originalUrl.contains('cloudinary.com')) return originalUrl;
    
    // Check if it already has transformations
    // Pattern: /upload/w_...,.../
    // We want to force w_300,h_300,c_fill,q_auto,f_auto
    const transformation = '/upload/w_300,h_300,c_fill,q_auto,f_auto/';
    
    // If it has /upload/, replace or insert
    if (originalUrl.contains('/upload/')) {
       // If it has existing transformations after upload/, replace them or just insert ours?
       // Cloudinary URLs are usually .../upload/v12345/... or .../upload/transformations/v12345/...
       // Safest is to replace '/upload/' with '/upload/TRANSFORMATION/'
       // But if there are already transformations, we might duplicate. 
       // Regex replace is safer but simple replaceFirst is okay if we assume standard format.
       // Let's rely on standard format: .../upload/(v[0-9]+/)?...
       
       // If we see /upload/v, it means no transformation yet.
       // If we see /upload/w_..., it means existing key.
       
       // Simple approach: Replace '/upload/' with '/upload/w_300,h_300,c_fill,q_auto,f_auto/'
       // But if user ALREADY put transformations, this prepends ours. Cloudinary applies chained transformations.
       // This is acceptable and often desired if we want to enforce size.
       return originalUrl.replaceFirst('/upload/', transformation);
    }
    return originalUrl;
  }

  /// Login
  Future<bool> login(String username, String password) async {
    try {
      isLoading.value = true;

      final response = await apiService.post(
        ApiConstants.login,
        data: {
          'username': username,
          'password': password,
        },
      );

      if (response.statusCode == 200) {
        final loginResponse = LoginResponse.fromJson(response.data);

        final user = User.fromJson(loginResponse.user);

        // Restriction: Only LECTURER and STUDENT allowed
        if (!user.isLecturer && !user.isStudent) {
          Get.snackbar(
            'Lỗi',
            'Tài khoản không được hỗ trợ trên thiết bị này',
            backgroundColor: Colors.red,
            colorText: Colors.white,
            duration: const Duration(seconds: 4),
          );
          return false;
        }

        // Save token
        await apiService.saveToken(loginResponse.token);

        // Save user data
        await apiService.saveUserData(loginResponse.user);

        // Update state
        currentUser.value = user;
        isAuthenticated.value = true;

        Get.snackbar(
          'Thành công',
          'Đăng nhập thành công',
          backgroundColor: Colors.green,
          colorText: Colors.white,
        );

        return true;
      }

      return false;
    } on DioException catch (e) {
      String errorMessage = 'Đăng nhập thất bại';

      if (e.response?.statusCode == 401) {
        errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
      } else if (e.response?.statusCode == 400) {
        errorMessage = e.response?.data['message'] ?? 'Dữ liệu không hợp lệ';
      } else if (e.type == DioExceptionType.connectionTimeout) {
        errorMessage = 'Kết nối timeout. Vui lòng kiểm tra backend';
      } else if (e.type == DioExceptionType.connectionError) {
        errorMessage = 'Không thể kết nối đến server';
      }

      Get.snackbar(
        'Lỗi',
        errorMessage,
        backgroundColor: Colors.red,
        colorText: Colors.white,
        duration: const Duration(seconds: 3),
      );

      return false;
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Đã có lỗi xảy ra: $e',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /// Logout
  Future<void> logout() async {
    try {
      isLoading.value = true;

      // Call logout API
      await apiService.post(ApiConstants.logout);

      // Clear local data
      await apiService.clearAll();

      // Update state
      currentUser.value = null;
      isAuthenticated.value = false;

      Get.offAllNamed(AppRoutes.login);

      Get.snackbar(
        'Thành công',
        'Đăng xuất thành công',
        backgroundColor: Colors.green,
        colorText: Colors.white,
      );
    } catch (e) {
      // Even if API call fails, still clear local data
      await apiService.clearAll();
      currentUser.value = null;
      isAuthenticated.value = false;
      Get.offAllNamed(AppRoutes.login);
    } finally {
      isLoading.value = false;
    }
  }

  /// Forgot Password - Send OTP
  Future<bool> forgotPassword(String email) async {
    try {
      isLoading.value = true;

      final response = await apiService.post(
        ApiConstants.forgotPassword,
        data: {'email': email},
      );

      if (response.statusCode == 200) {
        Get.snackbar(
          'Thành công',
          'Mã OTP đã được gửi đến email của bạn',
          backgroundColor: Colors.green,
          colorText: Colors.white,
        );
        return true;
      }

      return false;
    } on DioException catch (e) {
      String errorMessage = 'Gửi OTP thất bại';

      if (e.response?.statusCode == 404) {
        errorMessage = 'Email không tồn tại trong hệ thống';
      } else if (e.response?.data != null) {
        errorMessage = e.response?.data['message'] ?? errorMessage;
      }

      Get.snackbar(
        'Lỗi',
        errorMessage,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );

      return false;
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Đã có lỗi xảy ra: $e',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /// Verify OTP
  Future<bool> verifyOtp(String email, String otp) async {
    try {
      isLoading.value = true;

      final response = await apiService.post(
        ApiConstants.verifyOtp,
        data: {
          'email': email,
          'otp': otp,
        },
      );

      if (response.statusCode == 200) {
        Get.snackbar(
          'Thành công',
          'Xác thực OTP thành công',
          backgroundColor: Colors.green,
          colorText: Colors.white,
        );
        return true;
      }

      return false;
    } on DioException catch (e) {
      String errorMessage = 'Xác thực OTP thất bại';

      if (e.response?.statusCode == 400) {
        errorMessage = 'Mã OTP không đúng hoặc đã hết hạn';
      } else if (e.response?.data != null) {
        errorMessage = e.response?.data['message'] ?? errorMessage;
      }

      Get.snackbar(
        'Lỗi',
        errorMessage,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );

      return false;
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Đã có lỗi xảy ra: $e',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /// Update Profile
  Future<bool> updateProfile({
    String? phone,
    DateTime? dob,
    String? avatarPath,
  }) async {
    try {
      isLoading.value = true;
      
      // Prepare JSON data manually
      // Prepare JSON data safely
      final Map<String, dynamic> dataMap = {};
      if (phone != null) dataMap['phone'] = phone;
      if (dob != null) {
        dataMap['dob'] = "${dob.year}-${dob.month.toString().padLeft(2, '0')}-${dob.day.toString().padLeft(2, '0')}";
      }
      
      final String jsonBody = jsonEncode(dataMap);
      
      final formDataMap = <String, dynamic>{
         'data': MultipartFile.fromString(
            jsonBody,
            contentType: MediaType.parse('application/json'),
         ),
      };
      
      if (avatarPath != null && avatarPath.isNotEmpty) {
        String fileName = avatarPath.split('/').last;
        formDataMap['avatar'] = await MultipartFile.fromFile(avatarPath, filename: fileName);
      }
      
      final formDataObj = FormData.fromMap(formDataMap);

      final response = await apiService.put(
        ApiConstants.updateProfile,
        data: formDataObj,
      );

      if (response.statusCode == 200) {
        // Update local user data
        final updatedUser = User.fromJson(response.data);
        currentUser.value = updatedUser;
        await saveUserToStorage(updatedUser);
        
        Get.snackbar(
          'Thành công',
          'Cập nhật hồ sơ thành công',
          backgroundColor: Colors.green,
          colorText: Colors.white,
        );
        return true;
      }
      return false;
    } on DioException catch (e) {
       String errorMessage = 'Cập nhật thất bại';
       if (e.response?.data != null) {
          errorMessage = e.response?.data['message'] ?? errorMessage;
       }
       Get.snackbar('Lỗi', errorMessage, backgroundColor: Colors.red, colorText: Colors.white);
       return false;
    } catch (e) {
       Get.snackbar('Lỗi', 'Lỗi hệ thống: $e', backgroundColor: Colors.red, colorText: Colors.white);
       return false;
    } finally {
      isLoading.value = false;
    }
  }

  /// Reset Password
  Future<bool> resetPassword(String email, String newPassword) async {
    try {
      isLoading.value = true;

      final response = await apiService.post(
        ApiConstants.resetPassword,
        data: {
          'email': email,
          'newPassword': newPassword,
        },
      );

      if (response.statusCode == 200) {
        Get.snackbar(
          'Thành công',
          'Đặt lại mật khẩu thành công',
          backgroundColor: Colors.green,
          colorText: Colors.white,
        );
        return true;
      }

      return false;
    } on DioException catch (e) {
      String errorMessage = 'Đặt lại mật khẩu thất bại';

      if (e.response?.data != null) {
        errorMessage = e.response?.data['message'] ?? errorMessage;
      }

      Get.snackbar(
        'Lỗi',
        errorMessage,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );

      return false;
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Đã có lỗi xảy ra: $e',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  Future<void> saveUserToStorage(User user) async {
    await apiService.saveUserData(user.toJson());
    currentUser.value = user;
  }
}
