import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_routes.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../auth/models/user_model.dart';
import '../models/academic_request_model.dart';
import '../services/academic_request_service.dart';

/// GetX Controller for Academic Request feature (Student side)
class AcademicRequestController extends GetxController {
  final AcademicRequestService _service = AcademicRequestService();

  /// Get current student's ID (as String) from AuthController
  String? get _currentStudentId {
    try {
      return Get.find<AuthController>().currentUser.value?.id;
    } catch (_) {
      return null;
    }
  }

  // ─── List State ───────────────────────────────────────────────────────────
  final RxList<AcademicRequest> requests = <AcademicRequest>[].obs;
  final RxBool isLoading = false.obs;
  final RxString statusFilter = ''.obs;
  final RxString typeFilter = ''.obs;
  final RxInt currentPage = 0.obs;
  final RxInt totalPages = 0.obs;
  final RxInt totalElements = 0.obs;
  static const int pageSize = 10;

  // ─── Request Types ─────────────────────────────────────────────────────────
  final RxList<AcademicRequestType> requestTypes = <AcademicRequestType>[].obs;

  // ─── Student Profile ───────────────────────────────────────────────────────
  final Rxn<User> studentProfile = Rxn<User>();

  // ─── Create Form State ─────────────────────────────────────────────────────
  final Rxn<AcademicRequestType> selectedType = Rxn<AcademicRequestType>();
  final RxBool isSubmitting = false.obs;

  // Form fields
  final RxString formRequestType = ''.obs;
  final RxString formReason = ''.obs;
  final RxString formNote = ''.obs;
  final RxString formRequestTitle = ''.obs;

  // Dropdown selections (IDs / values)
  final Rxn<int> formSemesterId = Rxn<int>();
  final Rxn<int> formCourseId = Rxn<int>();
  final RxString formClassSectionId = ''.obs;
  final RxString formToClassName = ''.obs;
  final RxString formToMajor = ''.obs;
  final RxString formToSpecialization = ''.obs;
  final RxString formToSubSpecialization = ''.obs;

  // ─── Supporting Data ───────────────────────────────────────────────────────
  final RxList<SemesterOption> semesters = <SemesterOption>[].obs;
  final RxList<CourseOption> myCourses = <CourseOption>[].obs;
  // All curriculum courses (for RETAKE_COURSE, OVERLOAD_STUDY)
  final RxList<CourseOption> allCurriculumCourses = <CourseOption>[].obs;
  final RxList<ClassSectionOption> myClassSections = <ClassSectionOption>[].obs;
  // All class sections (no semester filter) — needed for GRADE_APPEAL
  final RxList<ClassSectionOption> allClassSections = <ClassSectionOption>[].obs;
  final RxList<ClassSectionTransferTarget> transferTargets = <ClassSectionTransferTarget>[].obs;
  final RxList<MajorOption> majors = <MajorOption>[].obs;
  final RxList<SpecializationOption> specializations = <SpecializationOption>[].obs;
  final RxList<SubSpecializationOption> subSpecializations = <SubSpecializationOption>[].obs;
  final Rxn<GradeAppealInfo> gradeAppealInfo = Rxn<GradeAppealInfo>();
  final RxBool loadingTargets = false.obs;
  final RxBool loadingCourses = false.obs;
  final RxBool loadingGradeAppealInfo = false.obs;

  // ─── File Attachment ───────────────────────────────────────────────────────
  final Rxn<File> selectedFile = Rxn<File>();
  final RxString selectedFileName = ''.obs;

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  @override
  void onInit() {
    super.onInit();
    fetchRequests();
    fetchRequestTypes();
    fetchSupportingData();
  }

  // ─── List Methods ──────────────────────────────────────────────────────────

  Future<void> fetchRequests({bool reset = false}) async {
    if (reset) {
      currentPage.value = 0;
      requests.clear();
    }
    try {
      isLoading.value = true;
      final result = await _service.getMyRequests(
        page: currentPage.value,
        size: pageSize,
        status: statusFilter.value.isEmpty ? null : statusFilter.value,
        requestType: typeFilter.value.isEmpty ? null : typeFilter.value,
      );
      requests.assignAll(result.content);
      totalPages.value = result.totalPages;
      totalElements.value = result.totalElements;
    } catch (e) {
      Get.snackbar('Lỗi', 'Không thể tải danh sách yêu cầu',
          backgroundColor: Colors.red[100], colorText: Colors.red[900]);
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> refreshList() => fetchRequests(reset: true);

  void changeStatusFilter(String? value) {
    statusFilter.value = value ?? '';
    fetchRequests(reset: true);
  }

  void changeTypeFilter(String? value) {
    typeFilter.value = value ?? '';
    fetchRequests(reset: true);
  }

  void clearFilters() {
    statusFilter.value = '';
    typeFilter.value = '';
    fetchRequests(reset: true);
  }

  // ─── Request Types ─────────────────────────────────────────────────────────

  Future<void> fetchRequestTypes() async {
    try {
      final types = await _service.getRequestTypes();
      requestTypes.assignAll(types);
    } catch (e) {
      // silently fail
    }
  }

  // ─── Supporting Data ───────────────────────────────────────────────────────

  Future<void> fetchSupportingData() async {
    final studentId = _currentStudentId;
    try {
      // Fetch student profile, semesters, majors in parallel
      final results = await Future.wait([
        _service.getStudentProfile(),
        _service.getActiveSemesters(),
        _service.getMajors(),
      ]);

      final profile = results[0] as User?;
      if (profile != null) studentProfile.value = profile;

      semesters.assignAll(results[1] as List<SemesterOption>);
      majors.assignAll(results[2] as List<MajorOption>);

      // Load ALL class sections (no semester filter) for GRADE_APPEAL
      if (studentId != null) {
        final allSections = await _service.getAllMyClassSections(studentId);
        allClassSections.assignAll(allSections);
        myClassSections.assignAll(allSections);
      }

      // If student has specialization, pre-load sub-specs for CHANGE_SPECIALIZATION
      if (profile?.specializationId != null) {
        final subs = await _service.getSubSpecializations(profile!.specializationId!);
        subSpecializations.assignAll(subs);
      }
      
      // Load ALL curriculum courses for RETAKE_COURSE and OVERLOAD_STUDY
      if (profile != null) {
        final curriculum = await _service.getAllCurriculumCourses(profile);
        allCurriculumCourses.assignAll(curriculum);
      }
    } catch (e) {
      // silently fail
    }
  }

  Future<void> onSemesterChanged(int? semId) async {
    formSemesterId.value = semId;
    formCourseId.value = null;
    myCourses.clear();

    if (semId == null) {
      // Reset to all class sections
      myClassSections.assignAll(allClassSections);
      return;
    }
    final studentId = _currentStudentId;
    if (studentId == null) return;
    try {
      loadingCourses.value = true;
      final courses = await _service.getMyCourses(studentId, semesterId: semId);
      myCourses.assignAll(courses);
      // Rebuild class sections for this semester
      final seen = <String>{};
      final sections = <ClassSectionOption>[];
      for (final c in courses) {
        if (c.className != null && seen.add(c.className!)) {
          sections.add(ClassSectionOption(className: c.className!, courseName: c.name));
        }
      }
      myClassSections.assignAll(sections);
    } catch (e) {
      // ignore
    } finally {
      loadingCourses.value = false;
    }
  }

  Future<void> onClassSectionChanged(String? className) async {
    final studentId = _currentStudentId;
    formClassSectionId.value = className ?? '';
    formToClassName.value = '';
    transferTargets.clear();
    gradeAppealInfo.value = null;

    if (className == null || className.isEmpty) return;

    if (selectedType.value?.value == 'GRADE_APPEAL') {
      if (studentId == null) return;
      try {
        loadingGradeAppealInfo.value = true;
        gradeAppealInfo.value = await _service.getGradeAppealInfo(studentId, className);
      } finally {
        loadingGradeAppealInfo.value = false;
      }
      return;
    }

    if (selectedType.value?.value != 'CHANGE_CLASS') return;

    try {
      loadingTargets.value = true;
      final targets = await _service.getTransferTargets(className, studentId: studentId);
      transferTargets.assignAll(targets);
    } catch (e) {
      Get.snackbar('Lỗi', 'Không thể tải danh sách lớp chuyển',
          backgroundColor: Colors.red[100], colorText: Colors.red[900]);
    } finally {
      loadingTargets.value = false;
    }
  }

  Future<void> onMajorChanged(MajorOption? major) async {
    formToMajor.value = major?.name ?? '';
    formToSpecialization.value = '';
    specializations.clear();
    subSpecializations.clear();

    if (major == null) return;
    try {
      final specs = await _service.getSpecializations(major.id);
      specializations.assignAll(specs);
    } catch (e) {
      // ignore
    }
  }

  Future<void> onSpecializationChanged(SpecializationOption? spec) async {
    formToSpecialization.value = spec?.name ?? '';
    formToSubSpecialization.value = '';
    subSpecializations.clear();

    if (spec == null) return;
    try {
      final subs = await _service.getSubSpecializations(spec.id);
      subSpecializations.assignAll(subs);
    } catch (e) {
      // ignore
    }
  }

  // ─── Create Form Helpers ───────────────────────────────────────────────────

  void selectType(AcademicRequestType type) {
    if (!type.canSubmit) {
      final isFuture = type.startDate != null &&
          DateTime.tryParse(type.startDate!)?.isAfter(DateTime.now()) == true;
      Get.snackbar(
        'Không thể nộp đơn',
        isFuture ? 'Chưa đến thời gian tiếp nhận loại đơn này' : 'Đã hết hạn nộp loại đơn này',
        backgroundColor: Colors.orange[100],
        colorText: Colors.orange[900],
      );
      return;
    }
    selectedType.value = type;
    _resetFormFields();

    // For CHANGE_SPECIALIZATION: auto-load sub-specs from student's current specialization
    if (type.value == 'CHANGE_SPECIALIZATION') {
      final specId = studentProfile.value?.specializationId;
      if (specId != null && subSpecializations.isEmpty) {
        _service.getSubSpecializations(specId).then((subs) {
          subSpecializations.assignAll(subs);
        });
      }
    }
  }

  void _resetFormFields() {
    formReason.value = '';
    formNote.value = '';
    formRequestTitle.value = '';
    formSemesterId.value = null;
    formCourseId.value = null;
    formClassSectionId.value = '';
    formToClassName.value = '';
    formToMajor.value = '';
    formToSpecialization.value = '';
    formToSubSpecialization.value = '';
    selectedFile.value = null;
    selectedFileName.value = '';
    myCourses.clear();
    transferTargets.clear();
    gradeAppealInfo.value = null;
    // Restore class sections to full list
    myClassSections.assignAll(allClassSections);
  }

  void backToTypeSelection() {
    selectedType.value = null;
    _resetFormFields();
  }

  Future<void> pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      withData: false,
    );
    if (result != null && result.files.single.path != null) {
      final file = File(result.files.single.path!);
      final sizeInMb = await file.length() / (1024 * 1024);
      if (sizeInMb > 10) {
        Get.snackbar('Lỗi', 'File không được vượt quá 10MB',
            backgroundColor: Colors.red[100], colorText: Colors.red[900]);
        return;
      }
      selectedFile.value = file;
      selectedFileName.value = result.files.single.name;
    }
  }

  void removeFile() {
    selectedFile.value = null;
    selectedFileName.value = '';
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  Future<void> submitRequest() async {
    final type = selectedType.value;
    if (type == null) return;

    if (!_validateForm(type.value)) return;

    final payload = CreateAcademicRequestPayload(
      requestType: type.value,
      requestTitle: type.value == 'OTHERS' ? formRequestTitle.value.trim() : null,
      semesterId: formSemesterId.value,
      courseId: formCourseId.value,
      classSectionId: formClassSectionId.value.isEmpty ? null : formClassSectionId.value,
      toClassName: formToClassName.value.isEmpty ? null : formToClassName.value,
      toMajor: formToMajor.value.isEmpty ? null : formToMajor.value,
      toSpecialization: formToSpecialization.value.isEmpty ? null : formToSpecialization.value,
      toSubSpecialization: formToSubSpecialization.value.isEmpty ? null : formToSubSpecialization.value,
      reason: formReason.value.trim(),
      note: formNote.value.trim().isEmpty ? null : formNote.value.trim(),
    );

    try {
      isSubmitting.value = true;
      await _service.createRequest(payload, file: selectedFile.value);
      await refreshList();

      if (Get.currentRoute == AppRoutes.studentAcademicRequestCreate) {
        Get.back();
      }

      if (Get.currentRoute != AppRoutes.studentAcademicRequests) {
        Get.offNamed(AppRoutes.studentAcademicRequests);
      }

      Get.snackbar('Thành công', 'Gửi yêu cầu thành công',
          backgroundColor: Colors.green[100], colorText: Colors.green[900]);
    } catch (e) {
      String message = 'Không thể gửi yêu cầu';
      if (e.toString().contains('Exception:')) {
        message = e.toString().replaceFirst('Exception: ', '');
      }
      Get.snackbar('Lỗi', message,
          backgroundColor: Colors.red[100], colorText: Colors.red[900]);
    } finally {
      isSubmitting.value = false;
    }
  }

  bool _validateForm(String typeValue) {
    if (formReason.value.trim().isEmpty) {
      Get.snackbar('Thiếu thông tin', 'Vui lòng nhập lý do',
          backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
      return false;
    }

    switch (typeValue) {
      case 'OTHERS':
        if (formRequestTitle.value.trim().isEmpty) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng nhập tiêu đề yêu cầu',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        break;
      case 'PAUSE_SEMESTER':
      case 'ABSENT_REQUEST':
        if (formSemesterId.value == null) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng chọn học kỳ',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        break;
      case 'RETAKE_COURSE':
      case 'OVERLOAD_STUDY':
        if (formSemesterId.value == null) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng chọn học kỳ',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        if (formCourseId.value == null) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng chọn môn học',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        break;
      case 'CHANGE_CLASS':
        if (formSemesterId.value == null) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng chọn học kỳ',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        if (formClassSectionId.value.isEmpty) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng chọn lớp học phần hiện tại',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        if (formToClassName.value.isEmpty) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng chọn lớp muốn chuyển đến',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        break;
      case 'GRADE_APPEAL':
        if (formClassSectionId.value.isEmpty) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng chọn lớp học phần',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        if (gradeAppealInfo.value?.gradesPublished != true) {
          Get.snackbar('Không thể gửi đơn', 'Điểm thi chưa được công bố. Bạn chưa thể gửi đơn phúc khảo cho lớp này.',
              backgroundColor: Colors.red[100], colorText: Colors.red[900]);
          return false;
        }
        break;
      case 'CHANGE_MAJOR':
        if (formToMajor.value.isEmpty) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng chọn ngành muốn chuyển',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        break;
      case 'CHANGE_SPECIALIZATION':
        if (formToSubSpecialization.value.isEmpty) {
          Get.snackbar('Thiếu thông tin', 'Vui lòng chọn chuyên ngành hẹp',
              backgroundColor: Colors.orange[100], colorText: Colors.orange[900]);
          return false;
        }
        break;
    }
    return true;
  }

  // ─── Cancel Request ────────────────────────────────────────────────────────

  Future<void> cancelRequest(int id) async {
    try {
      await _service.cancelRequest(id);
      Get.snackbar('Thành công', 'Đã thu hồi yêu cầu',
          backgroundColor: Colors.green[100], colorText: Colors.green[900]);
      await refreshList();
    } catch (e) {
      Get.snackbar('Lỗi', 'Không thể thu hồi yêu cầu',
          backgroundColor: Colors.red[100], colorText: Colors.red[900]);
    }
  }
}
