import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../chat/models/chat_models.dart';
import '../../chat/controllers/chat_controller.dart';
import '../../chat/views/chat_detail_screen.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../schedule/controllers/schedule_controller.dart';
import '../models/class_section_model.dart';
import '../services/lecturer_service.dart';

class ClassListController extends GetxController {
  final LecturerService _lecturerService = LecturerService();
  final AuthController _authController = Get.find<AuthController>();

  // Observable state
  final RxBool isLoading = false.obs;
  final RxList<ClassSection> classes = <ClassSection>[].obs;
  final RxList<Enrollment> students = <Enrollment>[].obs;
  final RxList<Enrollment> filteredStudents =
      <Enrollment>[].obs; // For storing filtered list
  final Rx<ClassSection?> selectedClass = Rx<ClassSection?>(null);

  // Error handling
  final RxString errorMessage = ''.obs;

  @override
  void onInit() {
    super.onInit();

    // Listen for semester changes in ScheduleController to refresh list
    try {
      final scheduleController = Get.find<ScheduleController>();
      ever(scheduleController.selectedSemester, (_) {
        fetchClasses();
      });
    } catch (_) {}

    // Initial fetch
    fetchClasses();
  }

  /// Fetch classes for current lecturer
  Future<void> fetchClasses() async {
    final user = _authController.currentUser.value;
    if (user == null) return;

    try {
      isLoading.value = true;
      errorMessage.value = '';

      // Get active semester from schedule controller
      String? semesterCode;
      try {
        final scheduleController = Get.find<ScheduleController>();
        semesterCode = scheduleController.selectedSemester.value?.code;
      } catch (_) {}

      // If no semester selected yet, don't fetch (listener will catch it later)
      if (semesterCode == null) {
        isLoading.value = false;
        return;
      }

      final result = await _lecturerService.getClasses(semesterCode, user.id);
      classes.assignAll(result);
    } catch (e) {
      errorMessage.value = 'Không thể tải danh sách lớp ($e)';
    } finally {
      isLoading.value = false;
    }
  }

  /// Fetch students for a class
  Future<void> fetchStudents(String className) async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      final result = await _lecturerService.getStudents(className);
      students.value = result;
      filteredStudents.value = result; // Initialize filtered list
    } catch (e) {
      errorMessage.value = 'Không thể tải danh sách sinh viên';
    } finally {
      isLoading.value = false;
    }
  }

  /// Select a class and navigate to student list
  void selectClass(ClassSection classSection) {
    selectedClass.value = classSection;
    fetchStudents(classSection.className);
  }

  /// Get count of students
  int get studentCount => students.length;

  /// Filter classes by status
  List<ClassSection> get ongoingClasses =>
      classes.where((c) => c.isOngoing).toList();

  List<ClassSection> get upcomingClasses =>
      classes.where((c) => c.isUpcoming).toList();

  List<ClassSection> get finishedClasses =>
      classes.where((c) => c.isFinished).toList();

  /// Find matching chat group from ChatController
  ChatGroup? getChatGroupForClass(ClassSection classSection) {
    try {
      final chatController = Get.find<ChatController>();
      return chatController.groups.firstWhereOrNull(
        (g) => g.className == classSection.className,
      );
    } catch (_) {
      return null;
    }
  }

  /// Search students by name or code
  void searchStudents(String query) {
    if (query.isEmpty) {
      filteredStudents.value = students;
      return;
    }

    final lowerQuery = query.toLowerCase();
    filteredStudents.value = students.where((student) {
      return student.studentName.toLowerCase().contains(lowerQuery) ||
          student.studentCode.toLowerCase().contains(lowerQuery);
    }).toList();
  }

  /// Create chat group for class
  Future<void> createGroupChat(ClassSection classSection) async {
    // If already has group in local state, just go to it
    final existingGroup = getChatGroupForClass(classSection);
    if (existingGroup != null) {
      goToChat(existingGroup.id);
      return;
    }

    try {
      isLoading.value = true;
      final result = await _lecturerService.createChatGroup(
        classSection.className,
      );

      if (result.containsKey('id')) {
        final groupId = result['id'] as int;

        // Update local class object
        final index = classes.indexWhere(
          (c) => c.className == classSection.className,
        );
        if (index != -1) {
          final updated = ClassSection(
            className: classes[index].className,
            courseCode: classes[index].courseCode,
            courseName: classes[index].courseName,
            semesterCode: classes[index].semesterCode,
            semesterName: classes[index].semesterName,
            lecturerName: classes[index].lecturerName,
            enrollmentInfo: classes[index].enrollmentInfo,
            slots: classes[index].slots,
            status: classes[index].status,
            hasChatGroup: true,
            chatGroupId: groupId,
          );
          classes[index] = updated;
          if (selectedClass.value?.className == classSection.className) {
            selectedClass.value = updated;
          }
        }

        // Navigate to chat
        final chatController = Get.find<ChatController>();
        await chatController.loadGroups(); // Refresh groups
        final createdGroup = chatController.groups.firstWhereOrNull(
          (g) => g.id == groupId,
        );
        if (createdGroup != null) {
          chatController.selectGroup(createdGroup);
          Get.to(() => const ChatDetailScreen());
        } else {
          Get.snackbar(
            'Thành công',
            'Đã tạo nhóm chat. Bạn có thể tìm thấy trong danh sách tin nhắn.',
            backgroundColor: Colors.green.withOpacity(0.1),
          );
        }
      }
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Không thể tạo nhóm chat: $e',
        backgroundColor: Colors.red.withOpacity(0.1),
      );
    } finally {
      isLoading.value = false;
    }
  }

  /// Go to chat if exists
  void goToChat(int groupId) {
    final chatController = Get.find<ChatController>();
    final group = chatController.groups.firstWhereOrNull(
      (g) => g.id == groupId,
    );
    if (group != null) {
      chatController.selectGroup(group);
      Get.to(() => const ChatDetailScreen());
    } else {
      // If not in local list, refresh first
      isLoading.value = true;
      chatController.loadGroups().then((_) {
        isLoading.value = false;
        final refreshedGroup = chatController.groups.firstWhereOrNull(
          (g) => g.id == groupId,
        );
        if (refreshedGroup != null) {
          chatController.selectGroup(refreshedGroup);
          Get.to(() => const ChatDetailScreen());
        } else {
          Get.snackbar('Lỗi', 'Không tìm thấy nhóm chat');
        }
      });
    }
  }
}
