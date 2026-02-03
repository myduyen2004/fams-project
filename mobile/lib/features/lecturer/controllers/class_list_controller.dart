import 'package:get/get.dart';
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
  final RxList<Enrollment> filteredStudents = <Enrollment>[].obs; // For storing filtered list
  final Rx<ClassSection?> selectedClass = Rx<ClassSection?>(null);

  // Error handling
  final RxString errorMessage = ''.obs;

  @override
  void onInit() {
    super.onInit();
    fetchClasses();
  }

  /// Fetch classes for current lecturer
  Future<void> fetchClasses() async {
    final user = _authController.currentUser.value;
    if (user == null) return;

    try {
      isLoading.value = true;
      errorMessage.value = '';

      // Get active semester from schedule controller if available
      String semesterCode = 'SP26'; // Default fallback
      try {
        final scheduleController = Get.find<ScheduleController>();
        semesterCode = scheduleController.selectedSemester.value?.code ?? 'SP26';
      } catch (_) {
        // ScheduleController not initialized yet
      }

      final result = await _lecturerService.getClasses(semesterCode, user.id);
      classes.value = result;
    } catch (e) {
      errorMessage.value = 'Không thể tải danh sách lớp';
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
}
