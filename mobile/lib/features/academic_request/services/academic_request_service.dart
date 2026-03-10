import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../../auth/models/user_model.dart';
import '../models/academic_request_model.dart';

/// Service for Academic Request API calls
class AcademicRequestService {
  final ApiService _apiService = ApiService();

  /// Get available request types with deadline info
  Future<List<AcademicRequestType>> getRequestTypes() async {
    final response = await _apiService.get(ApiConstants.academicRequestTypes);
    if (response.statusCode == 200) {
      final list = response.data as List? ?? [];
      return list.map((e) => AcademicRequestType.fromJson(e)).toList();
    }
    return [];
  }

  /// Get paginated list of student's own requests
  Future<AcademicRequestPage> getMyRequests({
    int page = 0,
    int size = 10,
    String? status,
    String? requestType,
  }) async {
    final params = <String, dynamic>{'page': page, 'size': size, 'sort': 'createdAt,desc'};
    if (status != null && status.isNotEmpty) params['status'] = status;
    if (requestType != null && requestType.isNotEmpty) params['requestType'] = requestType;

    final response = await _apiService.get(
      ApiConstants.academicRequestMyRequests,
      queryParameters: params,
    );
    if (response.statusCode == 200) {
      return AcademicRequestPage.fromJson(response.data);
    }
    return AcademicRequestPage(content: [], totalPages: 0, totalElements: 0, size: size, number: page);
  }

  /// Create a new academic request (multipart/form-data)
  Future<AcademicRequest> createRequest(CreateAcademicRequestPayload payload, {File? file}) async {
    final formData = FormData.fromMap({
      'request': MultipartFile.fromString(
        jsonEncode(payload.toJson()),
        contentType: DioMediaType('application', 'json'),
      ),
      if (file != null)
        'file': await MultipartFile.fromFile(file.path, filename: file.path.split('/').last),
    });

    final response = await _apiService.postMultipart(
      ApiConstants.academicRequests,
      formData: formData,
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return AcademicRequest.fromJson(response.data);
    }
    throw Exception('Failed to create request');
  }

  /// Cancel / withdraw a pending request
  Future<AcademicRequest> cancelRequest(int id) async {
    final response = await _apiService.put(
      '${ApiConstants.academicRequestMyRequests}/$id/cancel',
    );
    if (response.statusCode == 200) {
      return AcademicRequest.fromJson(response.data);
    }
    throw Exception('Failed to cancel request');
  }

  /// Get current student profile from /auth/me
  Future<User?> getStudentProfile() async {
    try {
      final response = await _apiService.get('/api/auth/me');
      if (response.statusCode == 200) {
        return User.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (_) {}
    return null;
  }

  /// Get all semesters
  Future<List<SemesterOption>> getActiveSemesters() async {
    try {
      final response = await _apiService.get('/api/v1/semesters/active');
      if (response.statusCode == 200) {
        final list = response.data as List? ?? [];
        return list.map((e) => SemesterOption.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Get student's enrolled courses
  /// Endpoint: GET /api/v1/students/{studentId}/courses?semesterId=X
  Future<List<CourseOption>> getMyCourses(String studentId, {int? semesterId}) async {
    try {
      final params = <String, dynamic>{};
      if (semesterId != null) params['semesterId'] = semesterId;
      final response = await _apiService.get(
        '/api/v1/students/$studentId/courses',
        queryParameters: params,
      );
      if (response.statusCode == 200) {
        final list = response.data as List? ?? [];
        return list.map((e) => CourseOption.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Get student's class sections derived from enrolled courses
  /// (Reuses getMyCourses, extracts unique classNames)
  Future<List<ClassSectionOption>> getMyClassSections(String studentId, {int? semesterId}) async {
    final courses = await getMyCourses(studentId, semesterId: semesterId);
    final seen = <String>{};
    final sections = <ClassSectionOption>[];
    for (final c in courses) {
      if (c.className != null && seen.add(c.className!)) {
        sections.add(ClassSectionOption(className: c.className!, courseName: c.name));
      }
    }
    return sections;
  }

  /// Get ALL class sections a student is enrolled in (no semester filter)
  /// Used for GRADE_APPEAL type
  Future<List<ClassSectionOption>> getAllMyClassSections(String studentId) async {
    return getMyClassSections(studentId);
  }

  /// Get grade publication info for GRADE_APPEAL validation
  Future<GradeAppealInfo?> getGradeAppealInfo(String studentId, String className) async {
    try {
      final response = await _apiService.get(
        '/api/v1/students/$studentId/grades',
        queryParameters: {'className': className},
      );
      if (response.statusCode == 200 && response.data is Map<String, dynamic>) {
        return GradeAppealInfo.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (_) {}
    return null;
  }

  /// Get ALL curriculum courses from student's profile (Major, Spec, SubSpec)
  /// Replicates Web's fetchAllCourses logic for RETAKE_COURSE / OVERLOAD_STUDY
  Future<List<CourseOption>> getAllCurriculumCourses(User profile) async {
    try {
      final allCourses = <CourseOption>[];

      // 1. Fetch courses for major
      if (profile.majorId != null) {
        try {
          final res = await _apiService.get('/api/v1/majors/${profile.majorId}/courses');
          if (res.statusCode == 200) {
            final list = res.data as List? ?? [];
            allCourses.addAll(list.map((e) => CourseOption.fromJson(e)));
          }
        } catch (_) {}
      }

      // 2. Fetch courses for specialization
      if (profile.specializationId != null) {
        try {
          final res = await _apiService.get('/api/v1/specializations/${profile.specializationId}/courses');
          if (res.statusCode == 200) {
            final list = res.data as List? ?? [];
            allCourses.addAll(list.map((e) => CourseOption.fromJson(e)));
          }
        } catch (_) {}
      }

      // 3. Fetch courses for sub-specialization
      if (profile.subSpecializationId != null) {
        try {
          final res = await _apiService.get('/api/v1/sub-specializations/${profile.subSpecializationId}/courses');
          if (res.statusCode == 200) {
            final list = res.data as List? ?? [];
            allCourses.addAll(list.map((e) => CourseOption.fromJson(e)));
          }
        } catch (_) {}
      }

      // Remove duplicates by ID and sort by code
      final uniqueMap = <int, CourseOption>{};
      for (final c in allCourses) {
        uniqueMap[c.id] = c;
      }
      
      final sortedCourses = uniqueMap.values.toList()
        ..sort((a, b) => a.code.compareTo(b.code));
        
      return sortedCourses;
    } catch (_) {
      return [];
    }
  }

  /// Get transfer candidate classes for CHANGE_CLASS
  Future<List<ClassSectionTransferTarget>> getTransferTargets(String className, {String? studentId}) async {
    try {
      final hasStudentId = studentId != null && studentId.trim().isNotEmpty;
      final response = await _apiService.get(
        hasStudentId
            ? '/api/v1/class-sections/$className/transfer-targets-with-conflict'
            : '/api/v1/class-sections/$className/transfer-targets',
        queryParameters: hasStudentId ? {'studentId': studentId} : null,
      );
      if (response.statusCode == 200) {
        final list = response.data as List? ?? [];
        return list.map((e) => ClassSectionTransferTarget.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Get all majors
  Future<List<MajorOption>> getMajors() async {
    try {
      final response = await _apiService.get('/api/majors', queryParameters: {'size': 200, 'status': 'ACTIVE'});
      if (response.statusCode == 200) {
        List list = [];
        if (response.data is List) {
          list = response.data;
        } else if (response.data is Map && response.data['content'] is List) {
          list = response.data['content'];
        }
        return list.map((e) => MajorOption.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Get specializations by major ID
  Future<List<SpecializationOption>> getSpecializations(int majorId) async {
    try {
      final response = await _apiService.get(
        '/api/specializations/by-major/$majorId',
        queryParameters: {'size': 100, 'status': 'ACTIVE'},
      );
      if (response.statusCode == 200) {
        List list = [];
        if (response.data is List) {
          list = response.data;
        } else if (response.data is Map && response.data['content'] is List) {
          list = response.data['content'];
        }
        return list.map((e) => SpecializationOption.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Get sub-specializations by specialization ID
  Future<List<SubSpecializationOption>> getSubSpecializations(int specId) async {
    try {
      final response = await _apiService.get(
        '/api/sub-specializations/by-specialization/$specId',
      );
      if (response.statusCode == 200) {
        List list = [];
        if (response.data is List) {
          list = response.data;
        } else if (response.data is Map && response.data['content'] is List) {
          list = response.data['content'];
        }
        return list.map((e) => SubSpecializationOption.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }
}
