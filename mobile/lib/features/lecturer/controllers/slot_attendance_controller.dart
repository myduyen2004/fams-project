import 'package:get/get.dart';
import '../models/attendance_session_model.dart';
import '../services/lecturer_service.dart';

class SlotAttendanceController extends GetxController {
  final LecturerService _lecturerService = LecturerService();

  // Observable state
  final RxBool isLoading = false.obs;
  final RxString errorMessage = ''.obs;
  final Rx<SessionDetailResponse?> sessionDetail = Rx<SessionDetailResponse?>(null);
  
  // For search/filtering
  final RxList<StudentAttendanceResponse> filteredStudents = <StudentAttendanceResponse>[].obs;
  final RxString searchQuery = ''.obs;

  /// Fetch attendance detail for a slot
  Future<void> fetchAttendance(int slotId) async {
    try {
      isLoading.value = true;
      errorMessage.value = '';
      
      final result = await _lecturerService.getSlotAttendanceDetail(slotId);
      sessionDetail.value = result;
      _applyFilter();
    } catch (e) {
      errorMessage.value = e.toString().contains('404') 
          ? 'Hiện chưa có phiên điểm danh cho slot này.' 
          : 'Không thể tải dữ liệu điểm danh: $e';
    } finally {
      isLoading.value = false;
    }
  }

  /// Search students by name or code
  void searchStudents(String query) {
    searchQuery.value = query;
    _applyFilter();
  }

  void _applyFilter() {
    final students = sessionDetail.value?.students ?? [];
    if (searchQuery.value.isEmpty) {
      filteredStudents.assignAll(students);
      return;
    }

    final lowerQuery = searchQuery.value.toLowerCase();
    filteredStudents.assignAll(
      students.where((s) => 
        s.fullName.toLowerCase().contains(lowerQuery) || 
        s.studentCode.toLowerCase().contains(lowerQuery)
      ).toList()
    );
  }
  
  /// Get counts for UI summary
  int get presentCount => sessionDetail.value?.presentCount ?? 0;
  int get totalCount => sessionDetail.value?.totalStudents ?? 0;
}
