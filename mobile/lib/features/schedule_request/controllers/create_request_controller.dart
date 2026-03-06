import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import '../models/create_request_models.dart';
import '../models/schedule_request_model.dart';
import '../services/schedule_request_service.dart';
import '../../../core/services/cloudinary_service.dart';

/// GetX Controller for Create Request feature
class CreateRequestController extends GetxController {
  final ScheduleRequestService _service = ScheduleRequestService();
  final CloudinaryService _cloudinaryService = CloudinaryService();

  // Loading states
  final RxBool isLoadingClasses = false.obs;
  final RxBool isLoadingSlots = false.obs;
  final RxBool isLoadingRooms = false.obs;
  final RxBool isSubmitting = false.obs;

  // Data lists
  final RxList<String> classes = <String>[].obs;
  final RxList<ClassSlot> slots = <ClassSlot>[].obs;
  final RxList<RoomAvailability> rooms = <RoomAvailability>[].obs;
  final RxList<File> uploadedFiles = <File>[].obs;

  // Selected values
  final RxnString selectedClass = RxnString(null);
  final RxnString selectedSlotId = RxnString(null);
  final Rx<ClassSlot?> selectedSlot = Rx<ClassSlot?>(null);
  final RxnString newDate = RxnString(null);
  final RxnInt newSlot = RxnInt(null);
  final Rx<RoomAvailability?> selectedRoom = Rx<RoomAvailability?>(null);
  final RxnString selectedType = RxnString('RESCHEDULE'); // Always RESCHEDULE
  final RxString reason = ''.obs;

  // Error states
  final RxnString dateError = RxnString(null);
  
  // Conflict states
  final Rx<ConflictCheckResponse?> conflictResult = Rx<ConflictCheckResponse?>(null);
  final RxBool checkingConflict = false.obs;
  
  // Separated date selection state
  final RxnString selectedOriginalDate = RxnString(null);

  // Floor and building selection for room
  final RxInt activeFloor = 2.obs;
  final RxString activeBuilding = 'Alpha'.obs;

  @override
  void onInit() {
    super.onInit();
    fetchClasses();
  }

  /// Get tomorrow's date string in YYYY-MM-DD format
  String getTomorrowString() {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    return '${tomorrow.year}-${tomorrow.month.toString().padLeft(2, '0')}-${tomorrow.day.toString().padLeft(2, '0')}';
  }

  /// Fetch lecturer's classes
  Future<void> fetchClasses() async {
    try {
      isLoadingClasses.value = true;
      final data = await _service.getClasses();
      classes.value = data;
    } catch (e) {
      Get.snackbar('Lỗi', 'Không thể tải danh sách lớp học',
          snackPosition: SnackPosition.BOTTOM);
    } finally {
      isLoadingClasses.value = false;
    }
  }

  /// Handle class change
  void onClassChanged(String? className) {
    selectedClass.value = className;
    // Reset downstream selections
    slots.clear();
    slots.clear();
    selectedSlotId.value = null;
    selectedSlot.value = null;
    selectedOriginalDate.value = null;
    conflictResult.value = null;
    
    if (className != null && className.isNotEmpty) {
      fetchSlotsForClass(className);
    }
  }

  /// Fetch slots for selected class
  Future<void> fetchSlotsForClass(String className) async {
    try {
      isLoadingSlots.value = true;
      final data = await _service.getSlotsForClass(className);
      slots.value = data;
    } catch (e) {
      Get.snackbar('Lỗi', 'Không thể tải danh sách slot',
          snackPosition: SnackPosition.BOTTOM);
    } finally {
      isLoadingSlots.value = false;
    }
  }

  /// Get unique dates from slots (tomorrow+)
  List<String> getAvailableDates() {
    final tomorrow = getTomorrowString();
    final uniqueDates = slots
        .where((s) => s.date.compareTo(tomorrow) >= 0)
        .map((s) => s.date)
        .toSet()
        .toList();
    uniqueDates.sort();
    return uniqueDates;
  }

  /// Get slots for selected original date
  List<ClassSlot> getSlotsForSelectedDate() {
    if (selectedOriginalDate.value == null) return [];
    
    return slots
        .where((s) => s.date == selectedOriginalDate.value)
        .toList()
      ..sort((a, b) => a.slotNumber.compareTo(b.slotNumber));
  }

  /// Handle date selection
  void onDateSelected(String date) {
    selectedOriginalDate.value = date;
    // Reset slot selection but keep date
    selectedSlotId.value = null;
    selectedSlot.value = null;
    // Reset conflict status
    conflictResult.value = null;
    
    // Auto-select if only 1 slot
    final availableSlots = getSlotsForSelectedDate();
    if (availableSlots.length == 1) {
      onSlotSelected(availableSlots.first.id.toString());
    }
  }

  /// Handle slot selection within selected date
  void onSlotSelected(String slotId) {
    final slot = slots.firstWhereOrNull((s) => s.id.toString() == slotId);
    if (slot != null) {
      selectedSlotId.value = slotId;
      selectedSlot.value = slot;
      
      // Re-check conflict if new date/slot already selected
      if (newDate.value != null && newSlot.value != null) {
        checkConflicts();
      }
    }
  }

  /// Handle new date change (for requested date)
  void onNewDateChanged(String? date) async {
    if (date == null || date.isEmpty) {
      newDate.value = null;
      return;
    }

    final tomorrow = getTomorrowString();
    if (date.compareTo(tomorrow) < 0) {
      dateError.value = 'Ngày thay đổi phải từ ngày mai trở đi';
      newDate.value = null;
      return;
    }

    dateError.value = null;
    newDate.value = date;
    // Reset selected room and conflict when date changes
    selectedRoom.value = null;
    conflictResult.value = null;
    
    // Fetch room availability if both date and slot are selected
    if (newSlot.value != null) {
      await checkConflicts();
      fetchRoomAvailability();
    }
  }

  /// Handle new slot change
  void onNewSlotChanged(int? slot) async {
    newSlot.value = slot;
    // Reset selected room and conflict when slot changes
    selectedRoom.value = null;
    conflictResult.value = null;
    
    // Fetch room availability if both date and slot are selected
    if (newDate.value != null && slot != null) {
      await checkConflicts();
      fetchRoomAvailability();
    }
  }

  /// Check for conflicts
  Future<void> checkConflicts() async {
    if (selectedClass.value == null || 
        selectedSlotId.value == null || 
        newDate.value == null || 
        newSlot.value == null) {
      conflictResult.value = null;
      return;
    }

    try {
      print('Checking conflicts for: Class=${selectedClass.value}, Date=${newDate.value}, Slot=${newSlot.value}, OrigSlot=${selectedSlotId.value}');
      
      checkingConflict.value = true;
      final result = await _service.checkConflicts(
        selectedClass.value!,
        newDate.value!,
        newSlot.value!,
        int.parse(selectedSlotId.value!),
      );
      
      print('Conflict Result: hasConflict=${result?.hasConflict}, conflicts=${result?.conflicts.length}');
      if (result?.conflicts.isNotEmpty == true) {
        result!.conflicts.forEach((c) => print(' - ${c.message}'));
      }
      
      conflictResult.value = result;
      
      // If conflict exists, clear selected room (disable selection)
      if (result?.hasConflict == true) {
        selectedRoom.value = null;
      }
    } catch (e) {
      print('Error checking conflicts: $e');
      conflictResult.value = null;
    } finally {
      checkingConflict.value = false;
    }
  }

  /// Fetch room availability
  Future<void> fetchRoomAvailability() async {
    if (newDate.value == null || newSlot.value == null) return;
    
    // Don't fetch rooms if there are conflicts
    if (conflictResult.value?.hasConflict == true) {
      rooms.clear();
      return;
    }
    
    try {
      isLoadingRooms.value = true;
      // Debug logging
      print('=== Fetching Room Availability ===');
      print('Date: ${newDate.value}');
      print('SlotNumber: ${newSlot.value}');
      
      final data = await _service.getRoomAvailability(newDate.value!, newSlot.value!);
      // Filter only Gamma building rooms
      rooms.value = data;
      print('Loaded ${rooms.length} rooms');
    } catch (e) {
      print('Error fetching room availability: $e');
      Get.snackbar('Lỗi', 'Không thể tải trạng thái phòng học',
          snackPosition: SnackPosition.BOTTOM);
    } finally {
      isLoadingRooms.value = false;
    }
  }

  /// Get rooms for active floor
  List<RoomAvailability> getRoomsForFloor(int floor) {
    return rooms.where((r) => r.floor == floor).toList();
  }

  /// Select room
  void onRoomSelected(RoomAvailability room) {
    if (!room.isAvailable) return;
    
    if (selectedRoom.value?.id == room.id) {
      selectedRoom.value = null; // Deselect
    } else {
      selectedRoom.value = room;
    }
  }

  /// Add file from picker
  Future<void> pickFile() async {
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        final file = File(image.path);
        // Check file size (max 10MB)
        if (await file.length() > 10 * 1024 * 1024) {
          Get.snackbar('Lỗi', 'File vượt quá 10MB',
              snackPosition: SnackPosition.BOTTOM);
          return;
        }
        uploadedFiles.add(file);
      }
    } catch (e) {
      Get.snackbar('Lỗi', 'Không thể chọn file',
          snackPosition: SnackPosition.BOTTOM);
    }
  }

  /// Remove file at index
  void removeFile(int index) {
    if (index >= 0 && index < uploadedFiles.length) {
      uploadedFiles.removeAt(index);
    }
  }

  /// Submit request - returns created request ID on success, null on failure
  Future<int?> submitRequest() async {
    // Validation
    if (selectedSlotId.value == null) {
      Get.snackbar('Lỗi', 'Vui lòng chọn slot cần thay đổi',
          snackPosition: SnackPosition.BOTTOM);
      return null;
    }
    if (newDate.value == null) {
      Get.snackbar('Lỗi', 'Vui lòng chọn ngày cần đổi',
          snackPosition: SnackPosition.BOTTOM);
      return null;
    }
    if (newSlot.value == null) {
      Get.snackbar('Lỗi', 'Vui lòng chọn slot mới',
          snackPosition: SnackPosition.BOTTOM);
      return null;
    }
    if (selectedRoom.value == null) {
      // Check if blocked by conflict
      if (conflictResult.value?.hasConflict == true) {
        Get.snackbar('Lỗi', 'Không thể gửi yêu cầu do có xung đột lịch học',
            snackPosition: SnackPosition.BOTTOM);
      } else {
        Get.snackbar('Lỗi', 'Vui lòng chọn phòng học mới',
            snackPosition: SnackPosition.BOTTOM);
      }
      return null;
    }
    if (reason.value.trim().isEmpty) {
      Get.snackbar('Lỗi', 'Vui lòng nhập lý do thay đổi',
          snackPosition: SnackPosition.BOTTOM);
      return null;
    }

    try {
      isSubmitting.value = true;

      // Upload files to Cloudinary
      List<String> fileUrls = [];
      if (uploadedFiles.isNotEmpty) {
        print('=== Uploading ${uploadedFiles.length} files to Cloudinary ===');
        for (final file in uploadedFiles) {
          print('Uploading file: ${file.path}');
          final url = await _cloudinaryService.uploadFile(file);
          print('Upload result URL: $url');
          if (url != null) {
            fileUrls.add(url);
          } else {
            print('WARNING: Upload failed for file ${file.path}');
          }
        }
        print('Total uploaded URLs: ${fileUrls.length}');
      }

      final fileJsonString = fileUrls.isNotEmpty ? jsonEncode(fileUrls) : null;
      print('=== Final file JSON: $fileJsonString ===');

      final payload = CreateRequestPayload(
        originalSlotId: int.parse(selectedSlotId.value!),
        type: selectedType.value!,
        reason: reason.value.trim(),
        requestedDate: newDate.value,
        requestedSlotTypeId: newSlot.value,
        requestedRoomId: selectedRoom.value!.id,
        file: fileJsonString,
      );

      print('=== Payload toJson: ${payload.toJson()} ===');

      final result = await _service.createRequest(payload);
      if (result != null) {
        Get.snackbar('Thành công', 'Yêu cầu đã được gửi thành công!',
            snackPosition: SnackPosition.BOTTOM,
            backgroundColor: Colors.green[100],
            colorText: Colors.green[800],
            duration: const Duration(seconds: 2));
        return result.id;
      }
      Get.snackbar('Lỗi', 'Có lỗi xảy ra khi gửi yêu cầu',
          snackPosition: SnackPosition.BOTTOM);
      return null;
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ?? 'Có lỗi xảy ra khi gửi yêu cầu';
      Get.snackbar('Lỗi', message, snackPosition: SnackPosition.BOTTOM);
      return null;
    } catch (e) {
      Get.snackbar('Lỗi', 'Có lỗi xảy ra khi gửi yêu cầu',
          snackPosition: SnackPosition.BOTTOM);
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }

  /// Reset all selections
  void reset() {
    selectedClass.value = null;
    selectedType.value = 'RESCHEDULE';
    slots.clear();
    selectedSlotId.value = null;
    selectedSlot.value = null;
    selectedOriginalDate.value = null;
    conflictResult.value = null;
    newDate.value = null;
    newSlot.value = null;
    selectedRoom.value = null;
    rooms.clear();
    reason.value = '';
    uploadedFiles.clear();
    dateError.value = null;
  }
}
