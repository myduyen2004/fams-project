import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/api_constants.dart';

/// API Service - Handle all HTTP requests with Dio
class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late Dio _dio;
  final _storage = const FlutterSecureStorage();

  /// Initialize Dio with configuration
  void init() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Add interceptors
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add token to header
          final token = await _storage.read(key: ApiConstants.keyToken);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Handle 401 Unauthorized or 403 Forbidden (expired tokens result in 403 in this backend)
          if (error.response?.statusCode == 401 ||
              error.response?.statusCode == 403) {
            await _storage.deleteAll();
          }
          return handler.next(error);
        },
      ),
    );

    // Add LogInterceptor in Debug Mode
    if (kDebugMode) {
      _dio.interceptors.add(
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          logPrint: (obj) => debugPrint(obj.toString()),
        ),
      );
    }
  }

  /// GET Request
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  /// POST Request
  Future<Response> post(String path, {dynamic data, Options? options}) async {
    try {
      return await _dio.post(path, data: data, options: options);
    } catch (e) {
      rethrow;
    }
  }

  /// PUT Request
  Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  /// DELETE Request
  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } catch (e) {
      rethrow;
    }
  }

  /// Save token to secure storage
  Future<void> saveToken(String token) async {
    await _storage.write(key: ApiConstants.keyToken, value: token);
  }

  /// Get token from secure storage
  Future<String?> getToken() async {
    return await _storage.read(key: ApiConstants.keyToken);
  }

  /// Clear token
  Future<void> clearToken() async {
    await _storage.delete(key: ApiConstants.keyToken);
  }

  /// Save user data
  Future<void> saveUserData(Map<String, dynamic> userData) async {
    await _storage.write(
      key: ApiConstants.keyUser,
      value: jsonEncode(userData),
    );
  }

  /// Get user data
  Future<Map<String, dynamic>?> getUserData() async {
    final data = await _storage.read(key: ApiConstants.keyUser);
    if (data != null) {
      return jsonDecode(data) as Map<String, dynamic>;
    }
    return null;
  }

  /// Clear all storage
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
