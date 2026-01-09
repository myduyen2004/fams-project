import 'package:get/get.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../core/services/api_service.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/constants/app_routes.dart';
import '../models/user_model.dart';
import '../models/login_response.dart';

/// Auth Controller - Handle authentication logic with GetX
class AuthController extends GetxController {
  final ApiService _apiService = ApiService();

  // Observable state
  final isLoading = false.obs;
  final Rx<User?> currentUser = Rx<User?>(null);
  final isAuthenticated = false.obs;

  @override
  void onInit() {
    super.onInit();
    _apiService.init();
    checkAuthStatus();
  }

  /// Check if user is already logged in
  Future<void> checkAuthStatus() async {
    try {
      final token = await _apiService.getToken();
      final userData = await _apiService.getUserData();

      if (token != null && userData != null) {
        currentUser.value = User.fromJson(userData);
        isAuthenticated.value = true;
      }
    } catch (e) {
      debugPrint('Check auth status error: $e');
    }
  }

  /// Login
  Future<bool> login(String username, String password) async {
    try {
      isLoading.value = true;

      final response = await _apiService.post(
        ApiConstants.login,
        data: {
          'username': username,
          'password': password,
        },
      );

      if (response.statusCode == 200) {
        final loginResponse = LoginResponse.fromJson(response.data);

        // Save token
        await _apiService.saveToken(loginResponse.token);

        // Save user data
        await _apiService.saveUserData(loginResponse.user);

        // Update state
        currentUser.value = User.fromJson(loginResponse.user);
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
      await _apiService.post(ApiConstants.logout);

      // Clear local data
      await _apiService.clearAll();

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
      await _apiService.clearAll();
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

      final response = await _apiService.post(
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

      final response = await _apiService.post(
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

  /// Reset Password
  Future<bool> resetPassword(String email, String newPassword) async {
    try {
      isLoading.value = true;

      final response = await _apiService.post(
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
}
