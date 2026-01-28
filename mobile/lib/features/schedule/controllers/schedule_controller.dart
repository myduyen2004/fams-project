import 'package:dio/dio.dart';
import 'package:get/get.dart';
import '../../auth/controllers/auth_controller.dart';
import '../models/schedule_model.dart';
import '../services/schedule_service.dart';

class ScheduleController extends GetxController {
  final ScheduleService _scheduleService = ScheduleService();
  final AuthController _authController = Get.find<AuthController>();

  // Observable state
  final RxBool isLoading = false.obs;
  final RxInt errorStatusCode = (-1).obs;
  final RxList<Semester> semesters = <Semester>[].obs;
  final Rx<Semester?> selectedSemester = Rx<Semester?>(null);
  final Rx<WeeklyTimetable?> weeklyTimetable = Rx<WeeklyTimetable?>(null);
  final Rx<DateTime> selectedDate = DateTime.now().obs;
  final RxList<TimetableSlot> selectedDaySlots = <TimetableSlot>[].obs;

  // Identification logic
  final Rx<TimetableSlot?> activeSlot = Rx<TimetableSlot?>(null);
  final Rx<TimetableSlot?> nextSlot = Rx<TimetableSlot?>(null);
  final RxDouble activeProgress = 0.0.obs;
  final RxString timeLeftStr = "0 phút".obs;

  @override
  void onInit() {
    super.onInit();
    _initializeData();
    
    ever(selectedDate, (_) => _updateSelectedDaySlots());
    ever(weeklyTimetable, (_) => _updateSelectedDaySlots());
    ever(selectedSemester, (_) => _onSemesterChanged());
  }

  Future<void> _initializeData() async {
    await fetchSemesters();
    await fetchSchedule();
    _startTimer();
  }

  void _startTimer() {
    _updateActiveStatus();
    // Update every 10 seconds for a more responsive countdown
    Future.delayed(const Duration(seconds: 10), () {
      if (!isClosed) {
        _updateActiveStatus();
        _startTimer();
      }
    });
  }

  Future<void> fetchSemesters() async {
    final list = await _scheduleService.getSemesters();
    semesters.value = list;
    
    // Auto select current semester based on today's date
    final now = DateTime.now();
    for (var s in list) {
      if (s.startDate != null && s.endDate != null) {
        if (now.isAfter(s.startDate!) && now.isBefore(s.endDate!)) {
          selectedSemester.value = s;
          break;
        }
      }
    }
    
    // Fallback to first if none match
    if (selectedSemester.value == null && list.isNotEmpty) {
      selectedSemester.value = list.first;
    }
  }

  void _onSemesterChanged() {
    final sem = selectedSemester.value;
    if (sem != null && sem.startDate != null) {
      // If today is not in this semester, jump to semester start
      final now = DateTime.now();
      if (now.isBefore(sem.startDate!) || (sem.endDate != null && now.isAfter(sem.endDate!))) {
        selectDate(sem.startDate!);
      }
    }
  }

  Future<void> fetchSchedule({DateTime? date}) async {
    final user = _authController.currentUser.value;
    if (user == null) return;

    try {
      isLoading.value = true;
      errorStatusCode.value = -1;

      WeeklyTimetable? timetable;
      if (user.isLecturer) {
        timetable = await _scheduleService.getLecturerSchedule(
          user.id,
          date: date ?? selectedDate.value,
        );
      } else {
        timetable = await _scheduleService.getStudentSchedule(
          user.id,
          date: date ?? selectedDate.value,
        );
      }
      weeklyTimetable.value = timetable;
    } on DioException catch (e) {
      errorStatusCode.value = e.response?.statusCode ?? 500;
    } catch (e) {
      errorStatusCode.value = 500;
    } finally {
      isLoading.value = false;
    }
  }

  void selectDate(DateTime date) {
    if (!_isSameWeek(selectedDate.value, date)) {
      selectedDate.value = date;
      fetchSchedule(date: date);
    } else {
      selectedDate.value = date;
    }
  }

  void _updateSelectedDaySlots() {
    if (weeklyTimetable.value == null) {
      selectedDaySlots.clear();
      activeSlot.value = null;
      nextSlot.value = null;
      return;
    }

    final day = weeklyTimetable.value!.days.firstWhereOrNull(
      (d) => _isSameDay(d.date, selectedDate.value),
    );

    if (day != null) {
      // Sort slots by start time
      final sortedSlots = List<TimetableSlot>.from(day.slots);
      sortedSlots.sort((a, b) {
        if (a.startTime == null || b.startTime == null) return 0;
        return a.startTime!.compareTo(b.startTime!);
      });
      
      selectedDaySlots.value = sortedSlots;
      _updateActiveStatus();
    } else {
      selectedDaySlots.clear();
      activeSlot.value = null;
      nextSlot.value = null;
    }
  }

  void _updateActiveStatus() {
    if (selectedDaySlots.isEmpty) return;

    // --- DEBUG: TEST MODE START ---
    // Force the first slot to be active for UI testing
    if (selectedDaySlots.isNotEmpty) {
      activeSlot.value = selectedDaySlots.first;
      
      // Mock progress simulation
      final now = DateTime.now();
      // Cycle progress 0.0 -> 1.0 every minute for visual effect
      activeProgress.value = (now.second / 60.0);
      timeLeftStr.value = "${60 - now.second} phút (Test)";
      
      // Clear next slot as we are "in" a slot
      nextSlot.value = null;
      return;
    }
    // --- DEBUG: TEST MODE END ---

    final now = DateTime.now();
    if (!_isSameDay(selectedDate.value, now)) {
      activeSlot.value = null;
      nextSlot.value = null;
      return;
    }

    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
    
    activeSlot.value = null;
    nextSlot.value = null;

    for (int i = 0; i < selectedDaySlots.length; i++) {
      final slot = selectedDaySlots[i];
      if (slot.startTime != null && slot.endTime != null) {
        if (timeStr.compareTo(slot.startTime!) >= 0 && timeStr.compareTo(slot.endTime!) <= 0) {
          activeSlot.value = slot;
          _calculateProgress(slot, now);
        } else if (timeStr.compareTo(slot.startTime!) < 0 && nextSlot.value == null) {
          nextSlot.value = slot;
        }
      }
    }
  }

  void _calculateProgress(TimetableSlot slot, DateTime now) {
    try {
      final startParts = slot.startTime!.split(':');
      final endParts = slot.endTime!.split(':');
      
      final start = DateTime(now.year, now.month, now.day, int.parse(startParts[0]), int.parse(startParts[1]));
      final end = DateTime(now.year, now.month, now.day, int.parse(endParts[0]), int.parse(endParts[1]));
      
      final total = end.difference(start).inMinutes;
      final current = now.difference(start).inMinutes;
      
      if (total > 0) {
        activeProgress.value = (current / total).clamp(0.0, 1.0);
        final remaining = total - current;
        timeLeftStr.value = "$remaining phút";
      }
    } catch (e) {
      activeProgress.value = 0.0;
    }
  }

  bool _isSameDay(DateTime d1, DateTime d2) {
    return d1.year == d2.year && d1.month == d2.month && d1.day == d2.day;
  }

  bool _isSameWeek(DateTime d1, DateTime d2) {
    DateTime getMonday(DateTime d) {
      return d.subtract(Duration(days: d.weekday - 1));
    }
    final m1 = getMonday(d1);
    final m2 = getMonday(d2);
    return m1.year == m2.year && m1.month == m2.month && m1.day == m2.day;
  }
}
