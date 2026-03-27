/// Models for Student Grade feature
/// Mirrors the web frontend's studentMyGradeService.ts interfaces exactly

class StudentCourseOption {
  final int courseId;
  final String courseCode;
  final String courseName;
  final String className;
  final String semesterCode;
  final String semesterName;
  final int semesterId;

  StudentCourseOption({
    required this.courseId,
    required this.courseCode,
    required this.courseName,
    required this.className,
    required this.semesterCode,
    required this.semesterName,
    required this.semesterId,
  });

  factory StudentCourseOption.fromJson(Map<String, dynamic> json) {
    return StudentCourseOption(
      courseId: (json['courseId'] as num?)?.toInt() ?? 0,
      courseCode: json['courseCode']?.toString() ?? '',
      courseName: json['courseName']?.toString() ?? '',
      className: json['className']?.toString() ?? '',
      // Semester fields: use empty string / 0 as fallback if backend omits them
      semesterCode: json['semesterCode']?.toString() ?? '',
      semesterName: json['semesterName']?.toString() ?? json['semesterCode']?.toString() ?? '',
      semesterId: (json['semesterId'] as num?)?.toInt() ?? 0,
    );
  }
}

class GradeItem {
  final String itemName;
  final double weight;
  final double? value;
  final String? comment;
  final bool isPublished;

  GradeItem({
    required this.itemName,
    required this.weight,
    this.value,
    this.comment,
    required this.isPublished,
  });

  factory GradeItem.fromJson(Map<String, dynamic> json) {
    return GradeItem(
      itemName: json['itemName']?.toString() ?? '',
      weight: (json['weight'] as num?)?.toDouble() ?? 0,
      value: json['value'] != null ? (json['value'] as num).toDouble() : null,
      comment: json['comment']?.toString(),
      isPublished: json['isPublished'] as bool? ?? false,
    );
  }
}

class GradeCategory {
  final String categoryName;
  final List<GradeItem> items;
  final double totalWeight;
  final double? totalValue;

  GradeCategory({
    required this.categoryName,
    required this.items,
    required this.totalWeight,
    this.totalValue,
  });

  factory GradeCategory.fromJson(Map<String, dynamic> json) {
    return GradeCategory(
      categoryName: json['categoryName']?.toString() ?? '',
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => GradeItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalWeight: (json['totalWeight'] as num?)?.toDouble() ?? 0,
      totalValue: json['totalValue'] != null
          ? (json['totalValue'] as num).toDouble()
          : null,
    );
  }
}

class StudentGradeDetailResponse {
  final String className;
  final String courseName;
  final String courseCode;
  final String semesterName;
  final String semesterCode;
  final List<GradeCategory> gradeCategories;
  final double? courseAverage;
  final String courseStatus; // PASSED | FAILED | PENDING
  final bool gradesPublished;

  StudentGradeDetailResponse({
    required this.className,
    required this.courseName,
    required this.courseCode,
    required this.semesterName,
    required this.semesterCode,
    required this.gradeCategories,
    this.courseAverage,
    required this.courseStatus,
    required this.gradesPublished,
  });

  factory StudentGradeDetailResponse.fromJson(Map<String, dynamic> json) {
    return StudentGradeDetailResponse(
      className: json['className']?.toString() ?? '',
      courseName: json['courseName']?.toString() ?? '',
      courseCode: json['courseCode']?.toString() ?? '',
      semesterName: json['semesterName']?.toString() ?? '',
      semesterCode: json['semesterCode']?.toString() ?? '',
      gradeCategories: (json['gradeCategories'] as List<dynamic>?)
              ?.map((e) => GradeCategory.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      courseAverage: json['courseAverage'] != null
          ? (json['courseAverage'] as num).toDouble()
          : null,
      courseStatus: json['courseStatus']?.toString() ?? 'PENDING',
      gradesPublished: json['gradesPublished'] as bool? ?? false,
    );
  }
}

/// Groups courses by semester for display on Screen 1
class SemesterGroup {
  final int semesterId;
  final String semesterName;
  final String semesterCode;
  final List<StudentCourseOption> courses;

  SemesterGroup({
    required this.semesterId,
    required this.semesterName,
    required this.semesterCode,
    required this.courses,
  });
}
