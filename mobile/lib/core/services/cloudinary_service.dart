import 'dart:io';
import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

/// Service for uploading files to Cloudinary via Backend proxy
class CloudinaryService {
  final ApiService _apiService = ApiService();

  /// Upload a file to Cloudinary via Backend
  /// Returns the secure URL of the uploaded file, or null if failed
  Future<String?> uploadFile(File file) async {
    try {
      final fileName = file.path.split('/').last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
      });

      print('Uploading file via backend: $fileName');
      
      final response = await _apiService.postMultipart(
        '/api/upload',
        formData: formData,
      );

      if (response.statusCode == 200) {
        final url = response.data['secure_url'] ?? response.data['url'];
        print('Upload success: $url');
        return url as String?;
      }
      print('Upload failed with status: ${response.statusCode}');
      return null;
    } on DioException catch (e) {
      print('Upload DioException: ${e.message}');
      print('Upload error response: ${e.response?.data}');
      return null;
    } catch (e) {
      print('Upload error: $e');
      return null;
    }
  }
}
