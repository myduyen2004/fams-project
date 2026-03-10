import 'package:flutter/foundation.dart';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:get/get.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../../core/services/websocket_service.dart';
import '../models/schedule_model.dart';
import '../services/schedule_service.dart';

class ScheduleController extends GetxController {
  final ScheduleService _scheduleService = ScheduleService();
  final AuthController _authController = Get.find<AuthController>();
  final WebSocketService _wsService = Get.find<WebSocketService>();

  // Observable state
  final RxBool isLoading = false.obs;
  final RxInt errorStatusCode = (-1).obs;
  final RxList<Semester> semesters = <Semester>[].obs;
  final Rx<Semester?> selectedSemester = Rx<Semester?>(null);
  final Rx<WeeklyTimetable?> weeklyTimetable = Rx<WeeklyTimetable?>(null);
  final Rx<DateTime> selectedDate = DateTime.now().obs;
  final Rx<DateTime> currentTime = DateTime.now().obs;
  final RxList<TimetableSlot> selectedDaySlots = <TimetableSlot>[].obs;
  final Rx<AttendanceConfig> attendanceConfig = AttendanceConfig.defaultConfig().obs;

  // Identification logic
  final Rx<TimetableSlot?> activeSlot = Rx<TimetableSlot?>(null);
  final Rx<TimetableSlot?> nextSlot = Rx<TimetableSlot?>(null);
  final RxDouble activeProgress = 0.0.obs;
  final RxString timeLeftStr = "0 phút".obs;

  bool get isLecturer => _authController.currentUser.value?.isLecturer ?? false;

  @override
  void onInit() {
    super.onInit();
    _initializeData();

    ever(selectedDate, (_) => _updateSelectedDaySlots());
    ever(weeklyTimetable, (_) => _updateSelectedDaySlots());
    ever(selectedSemester, (_) => _onSemesterChanged());
    
    // Listen to auth status change to re-fetch data
    ever(_authController.currentUser, (user) {
      if (user != null) {
        debugPrint('[ScheduleController] User authenticated, re-initializing data');
        _initializeData();
      } else {
        debugPrint('[ScheduleController] User logged out, clearing data');
        semesters.clear();
        selectedSemester.value = null;
        weeklyTimetable.value = null;
        selectedDaySlots.clear();
      }
    });

    _startTimer();
  }

  Future<void> _initializeData() async {
    // Only fetch if user is logged in
    if (_authController.currentUser.value == null) {
      debugPrint('[ScheduleController] Skipping initialization: No user logged in');
      return;
    }
    
    // Always start with "today" freshly set
    selectedDate.value = DateTime.now();
    
    await fetchSemesters();
    await fetchAttendanceConfig();
    await fetchSchedule();
  }

  void _startTimer() {
    _updateActiveStatus();
    currentTime.value = DateTime.now();
    
    // Update every 1 second for sharp real-time feel
    Future.delayed(const Duration(seconds: 1), () {
      if (!isClosed) {
        _startTimer();
      }
    });
  }

  Future<void> fetchSemesters() async {
    try {
      debugPrint('[ScheduleController] fetchSemesters start');
      final list = await _scheduleService.getSemesters();
      debugPrint('[ScheduleController] Received ${list.length} semesters');
      semesters.value = list;

      // Auto select current semester:
      // 1. Prioritize semester with status "active" (ONGOING in backend)
      // 2. Fallback to date range match
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      
      Semester? found;
      
      // Step 1: Search for explicitly "active" semester
      found = list.firstWhereOrNull((s) => s.status == 'active');
      
      // Step 2: Fallback to date range if no "active" status matches
      if (found == null) {
        for (var s in list) {
          if (s.startDate != null && s.endDate != null) {
            // Use inclusive comparison for dates
            final start = DateTime(s.startDate!.year, s.startDate!.month, s.startDate!.day);
            final end = DateTime(s.endDate!.year, s.endDate!.month, s.endDate!.day);
            
            if ((today.isAtSameMomentAs(start) || today.isAfter(start)) && 
                (today.isAtSameMomentAs(end) || today.isBefore(end))) {
              found = s;
              break;
            }
          }
        }
      }

      if (found != null) {
        selectedSemester.value = found;
        debugPrint('[ScheduleController] Auto-selected semester: ${found.name} (Source: ${found.status == 'active' ? 'Status' : 'Date Range'})');
      }

      // Fallback to first if none match
      if (selectedSemester.value == null && list.isNotEmpty) {
        selectedSemester.value = list.first;
        debugPrint('[ScheduleController] Fallback to first semester: ${list.first.name}');
      }

      if (selectedSemester.value == null) {
        debugPrint('[ScheduleController] WARNING: semestes list is empty or none selected');
      }
    } catch (e) {
      debugPrint('[ScheduleController] Error in fetchSemesters: $e');
    }
  }

  void _onSemesterChanged() {
    final sem = selectedSemester.value;
    if (sem != null && sem.startDate != null) {
      // If today is not in this semester, jump to semester start
      final now = DateTime.now();
      if (now.isBefore(sem.startDate!) ||
          (sem.endDate != null && now.isAfter(sem.endDate!))) {
        selectDate(sem.startDate!);
      }
    }
  }

  Future<void> fetchSchedule({DateTime? date}) async {
    final user = _authController.currentUser.value;
    if (user == null) return;

    try {
      // If semesters list is empty, try to fetch them first
      if (semesters.isEmpty) {
        await fetchSemesters();
      }

      isLoading.value = true;
      errorStatusCode.value = -1;

      final timetable = isLecturer
          ? await _scheduleService.getLecturerSchedule(
              user.id,
              date: date ?? selectedDate.value,
            )
          : await _scheduleService.getStudentSchedule(
              user.id,
              date: date ?? selectedDate.value,
            );
      weeklyTimetable.value = timetable;
    } on DioException catch (e) {
      errorStatusCode.value = e.response?.statusCode ?? 500;
    } catch (e) {
      errorStatusCode.value = 500;
    } finally {
      isLoading.value = false;
    }
  }

  void _initWebSocket() {
    _wsService.connect(
      onConnected: () {
        debugPrint('[ScheduleController] WS connected, subscribing to config');
        _wsService.subscribe('/topic/attendance-config', (data) {
          debugPrint('[ScheduleController] Received config update: $data');
          attendanceConfig.value = AttendanceConfig.fromJson(data);
          // If a slot list is visible, current timer will already pick up the change
          // because it uses attendanceConfig.value in Obx blocks.
        });
      },
    );
  }

  Future<void> fetchAttendanceConfig() async {
    try {
      attendanceConfig.value = await _scheduleService.getAttendanceConfig();
      _initWebSocket(); // Initialize WS after we have initial config
    } catch (e) {
      debugPrint('[ScheduleController] Could not fetch global attendance config (likely expected 403): $e');
      // Still try to connect WS if possible
      _initWebSocket();
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

    // --- DEBUG: TEST MODE END --- (Removed)

    final now = DateTime.now();
    if (!_isSameDay(selectedDate.value, now)) {
      activeSlot.value = null;
      nextSlot.value = null;
      return;
    }

    final timeStr =
        "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";

    activeSlot.value = null;
    nextSlot.value = null;

    for (int i = 0; i < selectedDaySlots.length; i++) {
      final slot = selectedDaySlots[i];
      if (slot.startTime != null && slot.endTime != null) {
        if (timeStr.compareTo(slot.startTime!) >= 0 &&
            timeStr.compareTo(slot.endTime!) <= 0) {
          activeSlot.value = slot;
          _calculateProgress(slot, now);
        } else if (timeStr.compareTo(slot.startTime!) < 0 &&
            nextSlot.value == null) {
          nextSlot.value = slot;
        }
      }
    }
  }

  void _calculateProgress(TimetableSlot slot, DateTime now) {
    try {
      final startParts = slot.startTime!.split(':');
      final endParts = slot.endTime!.split(':');

      final start = DateTime(
        now.year,
        now.month,
        now.day,
        int.parse(startParts[0]),
        int.parse(startParts[1]),
      );
      final end = DateTime(
        now.year,
        now.month,
        now.day,
        int.parse(endParts[0]),
        int.parse(endParts[1]),
      );

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

  /// Save all semester slots to device calendar via ICS file
  final RxBool isSavingToCalendar = false.obs;

  Future<void> saveAllSemesterToCalendar() async {
    final user = _authController.currentUser.value;
    final semester = selectedSemester.value;

    if (user == null || semester == null) {
      Get.snackbar(
        'Lỗi',
        'Không thể lấy thông tin người dùng hoặc học kỳ',
        snackPosition: SnackPosition.BOTTOM,
      );
      return;
    }

    try {
      isSavingToCalendar.value = true;

      // Fetch all slots for the semester
      final List<TimetableSlot> slots = isLecturer
          ? await _scheduleService.getLecturerSemesterSlots(
              user.id,
              semester.code,
            )
          : await _scheduleService.getStudentSemesterSlots(
              user.id,
              semester.code,
            );

      if (slots.isEmpty) {
        Get.snackbar(
          'Thông báo',
          'Không có lịch học trong học kỳ này',
          snackPosition: SnackPosition.BOTTOM,
        );
        return;
      }

      // Generate ICS content
      final StringBuffer icsContent = StringBuffer();
      icsContent.writeln('BEGIN:VCALENDAR');
      icsContent.writeln('VERSION:2.0');
      icsContent.writeln('PRODID:-//FAMS//Schedule Export//VI');
      icsContent.writeln('CALSCALE:GREGORIAN');
      icsContent.writeln('METHOD:PUBLISH');
      icsContent.writeln('X-WR-CALNAME:${semester.name}');

      for (final slot in slots) {
        if (slot.startTime == null || slot.endTime == null || slot.date == null)
          continue;

        final date = DateTime.parse(slot.date.toString());
        final startParts = slot.startTime!.split(':');
        final endParts = slot.endTime!.split(':');

        final start = DateTime(
          date.year,
          date.month,
          date.day,
          int.parse(startParts[0]),
          int.parse(startParts[1]),
        );
        final end = DateTime(
          date.year,
          date.month,
          date.day,
          int.parse(endParts[0]),
          int.parse(endParts[1]),
        );

        final uid =
            '${slot.id ?? DateTime.now().millisecondsSinceEpoch}@fams.edu.vn';
        final dtStart = _formatIcsDate(start);
        final dtEnd = _formatIcsDate(end);

        icsContent.writeln('BEGIN:VEVENT');
        icsContent.writeln('UID:$uid');
        icsContent.writeln('DTSTAMP:${_formatIcsDate(DateTime.now())}');
        icsContent.writeln('DTSTART:$dtStart');
        icsContent.writeln('DTEND:$dtEnd');
        icsContent.writeln(
          'SUMMARY:${slot.courseCode} - ${slot.courseName ?? ''}',
        );
        icsContent.writeln(
          'DESCRIPTION:Lớp: ${slot.className}\\nGiảng viên: ${slot.lecturerName}\\nPhòng: ${slot.roomCode}',
        );
        icsContent.writeln('LOCATION:${slot.roomCode ?? 'Online'}');
        icsContent.writeln('END:VEVENT');
      }

      icsContent.writeln('END:VCALENDAR');

      // Save to temp file and open with calendar app
      final directory = await getTemporaryDirectory();
      final file = File('${directory.path}/schedule_${semester.code}.ics');
      await file.writeAsString(icsContent.toString());

      // Open the file with calendar app (Google Calendar should be an option)
      final result = await OpenFilex.open(file.path, type: 'text/calendar');

      if (result.type == ResultType.done) {
        Get.snackbar(
          'Thành công',
          'Đã mở file lịch với ${slots.length} sự kiện. Chọn "Add all" trong Google Calendar!',
          snackPosition: SnackPosition.BOTTOM,
          duration: const Duration(seconds: 4),
        );
      } else {
        Get.snackbar(
          'Thông báo',
          'Không tìm thấy ứng dụng lịch. Vui lòng cài Google Calendar.',
          snackPosition: SnackPosition.BOTTOM,
        );
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        Get.snackbar(
          'Lỗi',
          'Lịch học kỳ này chưa được công bố',
          snackPosition: SnackPosition.BOTTOM,
        );
      } else {
        Get.snackbar(
          'Lỗi',
          'Không thể tải lịch học: ${e.message}',
          snackPosition: SnackPosition.BOTTOM,
        );
      }
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Đã xảy ra lỗi: $e',
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isSavingToCalendar.value = false;
    }
  }

  String _formatIcsDate(DateTime dt) {
    return '${dt.year}${dt.month.toString().padLeft(2, '0')}${dt.day.toString().padLeft(2, '0')}T${dt.hour.toString().padLeft(2, '0')}${dt.minute.toString().padLeft(2, '0')}00';
  }
}
