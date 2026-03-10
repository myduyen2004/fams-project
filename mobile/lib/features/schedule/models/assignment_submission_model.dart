class AssignmentSubmissionResponse {
  final int? id;
  final int? assignmentId;
  final String? assignmentTitle;
  final String? className;
  final String? courseCode;
  final String? courseName;
  final String? studentCode;
  final String? studentName;
  final List<String>? fileUrls;
  final List<String>? fileNames;
  final String? note;
  final String? lecturerComment;
  final String? status;
  final DateTime? submittedAt;
  final DateTime? assignmentDueDate;

  AssignmentSubmissionResponse({
    this.id,
    this.assignmentId,
    this.assignmentTitle,
    this.className,
    this.courseCode,
    this.courseName,
    this.studentCode,
    this.studentName,
    this.fileUrls,
    this.fileNames,
    this.note,
    this.lecturerComment,
    this.status,
    this.submittedAt,
    this.assignmentDueDate,
  });

  factory AssignmentSubmissionResponse.fromJson(Map<String, dynamic> json) {
    return AssignmentSubmissionResponse(
      id: json['id'],
      assignmentId: json['assignmentId'],
      assignmentTitle: json['assignmentTitle'],
      className: json['className'],
      courseCode: json['courseCode'],
      courseName: json['courseName'],
      studentCode: json['studentCode'],
      studentName: json['studentName'],
      fileUrls: (json['fileUrls'] as List<dynamic>?)?.map((e) => e as String).toList(),
      fileNames: (json['fileNames'] as List<dynamic>?)?.map((e) => e as String).toList(),
      note: json['note'],
      lecturerComment: json['lecturerComment'],
      status: json['status'],
      submittedAt: json['submittedAt'] != null ? DateTime.parse(json['submittedAt']) : null,
      assignmentDueDate: json['assignmentDueDate'] != null ? DateTime.parse(json['assignmentDueDate']) : null,
    );
  }
}
