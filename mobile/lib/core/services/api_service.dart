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

  /// Callback to handle unauthorized errors (401)
  VoidCallback? onUnauthorized;

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
          'ngrok-skip-browser-warning': 'true',
        },
      ),
    );

    // Add interceptors
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: ApiConstants.keyToken);
          final bool isExternal = options.path.startsWith('http') && 
                                 !options.path.startsWith(ApiConstants.baseUrl);
          
          if (isExternal) {
            // Strip default JSON headers for external requests (Cloudinary/S3 etc)
            // as they can cause 401/403 errors on some CDNs
            options.headers.remove('Content-Type');
            options.headers.remove('Accept');
          } else if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Handle 401 Unauthorized or 403 Forbidden
          if (error.response?.statusCode == 401) {
            debugPrint('[ApiService] Unauthorized error (401) for: ${error.requestOptions.path}');
            
            // Optimization: if we didn't even send an Authorization header, 
            // it might be a race condition or an intended public request that failed.
            // Don't kill the whole session for this.
            bool hasToken = error.requestOptions.headers.containsKey('Authorization');
            if (!hasToken) {
              debugPrint('[ApiService] 401 error but no Authorization header was sent. Ignoring for session management.');
              return handler.next(error);
            }
            
            // Check for ignoreUnauthorized flag in extra
            final ignoreUnauthorized = error.requestOptions.extra['ignoreUnauthorized'] == true;
            
            if (ignoreUnauthorized) {
              debugPrint('[ApiService] 401 error suppressed by ignoreUnauthorized flag for ${error.requestOptions.path}');
              return handler.next(error);
            }
            
            // Only trigger logout logic if it's NOT a public endpoint
            bool isPublic = error.requestOptions.path.contains('/api/auth/') || 
                           error.requestOptions.path.contains('/api/v1/semesters/active');
            
            if (!isPublic && onUnauthorized != null) {
              onUnauthorized!();
            }
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

  /// POST Multipart Request (for file uploads)
  Future<Response> postMultipart(String path, {required FormData formData}) async {
    try {
      return await _dio.post(
        path,
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
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

  /// Download Request
  Future<Response> download(
    String urlPath,
    dynamic savePath, {
    ProgressCallback? onReceiveProgress,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    bool deleteOnError = true,
    String lengthHeader = Headers.contentLengthHeader,
    Object? data,
  }) async {
    try {
      return await _dio.download(
        urlPath,
        savePath,
        onReceiveProgress: onReceiveProgress,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        deleteOnError: deleteOnError,
        lengthHeader: lengthHeader,
        data: data,
      );
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
