/// Model classes for Academic Request feature (Student)
/// Maps to /api/v1/academic-requests endpoints

class AcademicRequestType {
  final String value;
  final String label;
  final bool canSubmit;
  final String? startDate;
  final String? dueDate;
  final bool requiresClassSection;

  AcademicRequestType({
    required this.value,
    required this.label,
    required this.canSubmit,
    this.startDate,
    this.dueDate,
    this.requiresClassSection = false,
  });

  factory AcademicRequestType.fromJson(Map<String, dynamic> json) {
    return AcademicRequestType(
      value: json['value'] ?? '',
      label: json['label'] ?? '',
      canSubmit: json['canSubmit'] ?? false,
      startDate: json['startDate'],
      dueDate: json['dueDate'],
      requiresClassSection: json['requiresClassSection'] ?? false,
    );
  }
}

class AcademicRequest {
  final int id;
  final String requestType;
  final String requestTypeLabel;
  final String requestTitle;
  final String status;
  final String statusLabel;
  final String? dueDate;
  final String createdAt;
  final String? approverName;
  final String? approverNote;
  final String? approvedAt;
  final String? reason;
  final String? note;
  final String? fileUrl;
  final String? semesterCode;
  final String? semesterName;
  final String? courseCode;
  final String? courseName;
  final String? className;
  final String? toClassName;
  final String? toMajor;
  final String? toSpecialization;
  final String? toSubSpecialization;
  final String? studentName;
  final String? studentCode;

  AcademicRequest({
    required this.id,
    required this.requestType,
    required this.requestTypeLabel,
    required this.requestTitle,
    required this.status,
    required this.statusLabel,
    this.dueDate,
    required this.createdAt,
    this.approverName,
    this.approverNote,
    this.approvedAt,
    this.reason,
    this.note,
    this.fileUrl,
    this.semesterCode,
    this.semesterName,
    this.courseCode,
    this.courseName,
    this.className,
    this.toClassName,
    this.toMajor,
    this.toSpecialization,
    this.toSubSpecialization,
    this.studentName,
    this.studentCode,
  });

  factory AcademicRequest.fromJson(Map<String, dynamic> json) {
    return AcademicRequest(
      id: json['id'] ?? 0,
      requestType: json['requestType'] ?? '',
      requestTypeLabel: json['requestTypeLabel'] ?? '',
      requestTitle: json['requestTitle'] ?? '',
      status: json['status'] ?? '',
      statusLabel: json['statusLabel'] ?? '',
      dueDate: json['dueDate'],
      createdAt: json['createdAt'] ?? '',
      approverName: json['approverName'],
      approverNote: json['approverNote'],
      approvedAt: json['approvedAt'],
      reason: json['reason'],
      note: json['note'],
      fileUrl: json['fileUrl'],
      semesterCode: json['semesterCode'],
      semesterName: json['semesterName'],
      courseCode: json['courseCode'],
      courseName: json['courseName'],
      className: json['className'],
      toClassName: json['toClassName'],
      toMajor: json['toMajor'],
      toSpecialization: json['toSpecialization'],
      toSubSpecialization: json['toSubSpecialization'],
      studentName: json['studentName'],
      studentCode: json['studentCode'],
    );
  }
}

class AcademicRequestPage {
  final List<AcademicRequest> content;
  final int totalPages;
  final int totalElements;
  final int size;
  final int number;

  AcademicRequestPage({
    required this.content,
    required this.totalPages,
    required this.totalElements,
    required this.size,
    required this.number,
  });

  factory AcademicRequestPage.fromJson(Map<String, dynamic> json) {
    return AcademicRequestPage(
      content: (json['content'] as List? ?? [])
          .map((e) => AcademicRequest.fromJson(e))
          .toList(),
      totalPages: json['totalPages'] ?? 0,
      totalElements: json['totalElements'] ?? 0,
      size: json['size'] ?? 10,
      number: json['number'] ?? 0,
    );
  }
}

class GradeAppealInfo {
  final String className;
  final bool gradesPublished;
  final String? gradesPublishedAt;

  GradeAppealInfo({
    required this.className,
    required this.gradesPublished,
    this.gradesPublishedAt,
  });

  factory GradeAppealInfo.fromJson(Map<String, dynamic> json) {
    return GradeAppealInfo(
      className: json['className'] ?? '',
      gradesPublished: json['gradesPublished'] ?? false,
      gradesPublishedAt: json['gradesPublishedAt'],
    );
  }
}

/// Payload for creating a new academic request
class CreateAcademicRequestPayload {
  final String requestType;
  final String? requestTitle;
  final int? semesterId;
  final int? courseId;
  final String? classSectionId;
  final String? toClassName;
  final String? toMajor;
  final String? toSpecialization;
  final String? toSubSpecialization;
  final String reason;
  final String? note;

  CreateAcademicRequestPayload({
    required this.requestType,
    this.requestTitle,
    this.semesterId,
    this.courseId,
    this.classSectionId,
    this.toClassName,
    this.toMajor,
    this.toSpecialization,
    this.toSubSpecialization,
    required this.reason,
    this.note,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'requestType': requestType,
      'reason': reason,
    };
    if (requestTitle != null) map['requestTitle'] = requestTitle;
    if (semesterId != null) map['semesterId'] = semesterId;
    if (courseId != null) map['courseId'] = courseId;
    if (classSectionId != null) map['classSectionId'] = classSectionId;
    if (toClassName != null) map['toClassName'] = toClassName;
    if (toMajor != null) map['toMajor'] = toMajor;
    if (toSpecialization != null) map['toSpecialization'] = toSpecialization;
    if (toSubSpecialization != null) map['toSubSpecialization'] = toSubSpecialization;
    if (note != null && note!.isNotEmpty) map['note'] = note;
    return map;
  }
}

/// Semester option for dropdown
class SemesterOption {
  final int id;
  final String code;
  final String name;

  SemesterOption({required this.id, required this.code, required this.name});

  factory SemesterOption.fromJson(Map<String, dynamic> json) {
    return SemesterOption(
      id: json['id'] ?? 0,
      code: json['code'] ?? '',
      name: json['name'] ?? json['semesterName'] ?? '',
    );
  }

  @override
  String toString() => '$code - $name';
}

/// Course option for dropdown
class CourseOption {
  final int id;
  final String code;
  final String name;
  final String? className;

  CourseOption({required this.id, required this.code, required this.name, this.className});

  factory CourseOption.fromJson(Map<String, dynamic> json) {
    return CourseOption(
      id: json['courseId'] ?? json['id'] ?? 0,
      code: json['courseCode'] ?? json['code'] ?? '',
      name: json['courseName'] ?? json['name'] ?? '',
      className: json['className'],
    );
  }

  @override
  String toString() => '$code - $name';
}

/// Class section option for dropdown
class ClassSectionOption {
  final String className;
  final String? courseName;
  final String? courseCode;
  final String? semesterName;
  final String? lecturerName;
  final String? enrollmentInfo;

  ClassSectionOption({
    required this.className,
    this.courseName,
    this.courseCode,
    this.semesterName,
    this.lecturerName,
    this.enrollmentInfo,
  });

  factory ClassSectionOption.fromJson(Map<String, dynamic> json) {
    return ClassSectionOption(
      className: json['className'] ?? json['name'] ?? '',
      courseName: json['courseName'],
      courseCode: json['courseCode'],
      semesterName: json['semesterName'],
      lecturerName: json['lecturerName'],
      enrollmentInfo: json['enrollmentInfo'],
    );
  }

  @override
  String toString() => className;
}

/// Target class option with conflict details for CHANGE_CLASS
class ClassSectionTransferTarget {
  final ClassSectionOption classSection;
  final bool hasConflict;
  final List<String> conflictDetails;

  ClassSectionTransferTarget({
    required this.classSection,
    this.hasConflict = false,
    this.conflictDetails = const [],
  });

  factory ClassSectionTransferTarget.fromJson(Map<String, dynamic> json) {
    final classSectionJson = json['classSection'];
    return ClassSectionTransferTarget(
      classSection: ClassSectionOption.fromJson(
        classSectionJson is Map<String, dynamic> ? classSectionJson : json,
      ),
      hasConflict: json['hasConflict'] ?? false,
      conflictDetails: (json['conflictDetails'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

/// Major option
class MajorOption {
  final int id;
  final String code;
  final String name;

  MajorOption({required this.id, required this.code, required this.name});

  factory MajorOption.fromJson(Map<String, dynamic> json) {
    return MajorOption(
      id: json['id'] ?? 0,
      code: json['code'] ?? '',
      name: json['name'] ?? '',
    );
  }

  @override
  String toString() => name;
}

/// Specialization option
class SpecializationOption {
  final int id;
  final String code;
  final String name;

  SpecializationOption({required this.id, required this.code, required this.name});

  factory SpecializationOption.fromJson(Map<String, dynamic> json) {
    return SpecializationOption(
      id: json['id'] ?? 0,
      code: json['code'] ?? '',
      name: json['name'] ?? '',
    );
  }

  @override
  String toString() => code.isNotEmpty ? '$code - $name' : name;
}

/// Sub-specialization option
class SubSpecializationOption {
  final int id;
  final String code;
  final String name;

  SubSpecializationOption({required this.id, required this.code, required this.name});

  factory SubSpecializationOption.fromJson(Map<String, dynamic> json) {
    return SubSpecializationOption(
      id: json['id'] ?? 0,
      code: json['code'] ?? '',
      name: json['name'] ?? '',
    );
  }

  @override
  String toString() => code.isNotEmpty ? '$code - $name' : name;
}
