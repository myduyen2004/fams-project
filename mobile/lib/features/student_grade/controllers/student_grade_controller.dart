import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../auth/controllers/auth_controller.dart';
import '../models/student_grade_model.dart';
import '../services/student_grade_service.dart';

/// GetX Controller for Student Grade feature
class StudentGradeController extends GetxController {
  final StudentGradeService _service = StudentGradeService();

  String? get _currentStudentId {
    try {
      return Get.find<AuthController>().currentUser.value?.id;
    } catch (_) {
      return null;
    }
  }

  // ─── Semester list screen state ───────────────────────────────────────────
  final RxList<StudentCourseOption> allCourses = <StudentCourseOption>[].obs;
  final RxList<SemesterGroup> semesterGroups = <SemesterGroup>[].obs;
  final RxBool isLoadingCourses = false.obs;
  final RxString errorMessage = ''.obs;

  // ─── Grade detail screen state ────────────────────────────────────────────
  final Rxn<StudentGradeDetailResponse> gradeDetail = Rxn<StudentGradeDetailResponse>();
  final RxBool isLoadingDetail = false.obs;
  final RxString selectedClassName = ''.obs;

  @override
  void onInit() {
    super.onInit();
    fetchCourses();
  }

  // ─── Fetch all courses ────────────────────────────────────────────────────

  Future<void> fetchCourses() async {
    final studentId = _currentStudentId;
    if (studentId == null) {
      errorMessage.value = 'Không thể xác định thông tin người dùng';
      return;
    }
    try {
      isLoadingCourses.value = true;
      errorMessage.value = '';
      final courses = await _service.getMyCourses(studentId);
      allCourses.assignAll(courses);
      _groupBySemester(courses);
    } catch (e) {
      errorMessage.value = 'Không thể tải danh sách môn học';
      Get.snackbar(
        'Lỗi',
        'Không thể tải danh sách môn học',
        backgroundColor: Colors.red[100],
        colorText: Colors.red[900],
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isLoadingCourses.value = false;
    }
  }

  void _groupBySemester(List<StudentCourseOption> courses) {
    // Use semesterCode as the key since semesterId may be 0 for some backends
    final map = <String, SemesterGroup>{};
    for (final course in courses) {
      // Prefer semesterId, fallback to semesterCode as grouping key
      final key = course.semesterId > 0
          ? course.semesterId.toString()
          : (course.semesterCode.isNotEmpty ? course.semesterCode : 'other');
      if (!map.containsKey(key)) {
        map[key] = SemesterGroup(
          semesterId: course.semesterId,
          semesterName: course.semesterName.isNotEmpty
              ? course.semesterName
              : (course.semesterCode.isNotEmpty ? course.semesterCode : 'Học kỳ'),
          semesterCode: course.semesterCode,
          courses: [],
        );
      }
      map[key]!.courses.add(course);
    }
    // Sort by semesterId descending (newest first), unknown goes last
    final groups = map.values.toList()
      ..sort((a, b) => b.semesterId.compareTo(a.semesterId));
    semesterGroups.assignAll(groups);
  }

  // ─── Fetch grade detail ───────────────────────────────────────────────────

  Future<void> fetchGradeDetail(String className) async {
    final studentId = _currentStudentId;
    if (studentId == null) return;
    try {
      isLoadingDetail.value = true;
      selectedClassName.value = className;
      gradeDetail.value = null;
      final detail = await _service.getGradeDetail(studentId, className);
      gradeDetail.value = detail;
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Không thể tải điểm chi tiết',
        backgroundColor: Colors.red[100],
        colorText: Colors.red[900],
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isLoadingDetail.value = false;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  String formatGrade(double? value, bool isPublished) {
    if (!isPublished) return '-';
    if (value == null) return '-';
    return value.toStringAsFixed(1);
  }

  /// Sort categories: Resit last, Final second-to-last, others by weight
  List<GradeCategory> sortedCategories(List<GradeCategory> categories) {
    return [...categories]..sort((a, b) {
        final isAResit = a.categoryName.toLowerCase() == 'resit';
        final isBResit = b.categoryName.toLowerCase() == 'resit';
        if (isAResit != isBResit) return isAResit ? 1 : -1;
        if (isAResit && isBResit) return 0;

        final isAFinal = a.categoryName.toLowerCase().contains('final');
        final isBFinal = b.categoryName.toLowerCase().contains('final');
        if (isAFinal != isBFinal) return isAFinal ? 1 : -1;
        if (isAFinal && isBFinal) return 0;

        return a.totalWeight.compareTo(b.totalWeight);
      });
  }

  /// Sort items within a category: Total at end, sort by number in name
  List<GradeItem> sortedItems(List<GradeItem> items) {
    return [...items]..sort((a, b) {
        if (a.itemName == 'Total') return 1;
        if (b.itemName == 'Total') return -1;
        final numA = _extractNumber(a.itemName);
        final numB = _extractNumber(b.itemName);
        if (numA != numB) return numA.compareTo(numB);
        return a.itemName.compareTo(b.itemName);
      });
  }

  int _extractNumber(String name) {
    final match = RegExp(r'(\d+)$').firstMatch(name);
    return match != null ? int.parse(match.group(1)!) : 0;
  }
}
