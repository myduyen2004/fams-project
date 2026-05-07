import 'package:get/get.dart';
import '../../schedule/services/attendance_service.dart';
import '../../schedule/controllers/schedule_controller.dart';
import '../models/attendance_report_model.dart';

class AttendanceReportController extends GetxController {
  final AttendanceService _attendanceService = AttendanceService();
  final ScheduleController _scheduleController = Get.find<ScheduleController>();

  final RxBool isLoading = false.obs;
  final Rx<StudentAttendanceSummaryResponse?> summary = Rx<StudentAttendanceSummaryResponse?>(null);
  
  // Selected semester code (null means current active semester)
  final Rx<String?> selectedSemesterCode = Rx<String?>(null);

  // Stats
  final RxDouble overallRate = 0.0.obs;
  final RxInt courseCount = 0.obs;

  @override
  void onInit() {
    super.onInit();
    // Use current active semester from ScheduleController as default
    selectedSemesterCode.value = _scheduleController.selectedSemester.value?.code;
    
    // Auto-update when semester changes in this controller
    ever(selectedSemesterCode, (_) => fetchSummary());
    
    // Auto-initialize
    fetchSummary();
  }

  Future<void> fetchSummary() async {
    try {
      isLoading.value = true;
      final result = await _attendanceService.getStudentAttendanceSummary(
        semesterCode: selectedSemesterCode.value,
      );
      summary.value = result;
      
      // Calculate Stats
      if (result.classSummaries.isNotEmpty) {
        courseCount.value = result.classSummaries.length;
        double totalPercentage = result.classSummaries.fold(0.0, (sum, item) => sum + item.attendancePercentage);
        overallRate.value = totalPercentage / result.classSummaries.length;
      } else {
        courseCount.value = 0;
        overallRate.value = 0.0;
      }
    } catch (e) {
      Get.snackbar('Lỗi', 'Không thể tải báo cáo điểm danh: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<IndividualAttendanceDetail?> fetchDetail(String className) async {
    try {
      return await _attendanceService.getStudentAttendanceDetail(className);
    } catch (e) {
      Get.snackbar('Lỗi', 'Không thể tải chi tiết điểm danh: $e');
      return null;
    }
  }
}
