import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:solar_icons/solar_icons.dart';
import '../controllers/create_request_controller.dart';
import '../widgets/room_selection_widget.dart';
import '../../../core/constants/app_colors.dart';

/// Screen for creating a new schedule request
class CreateRequestScreen extends StatelessWidget {
  const CreateRequestScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(CreateRequestController());

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark 
              ? Theme.of(context).scaffoldBackgroundColor 
              : null,
          gradient: Theme.of(context).brightness == Brightness.dark 
              ? null 
              : const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFFFEF3DE),
                    Colors.white,
                  ],
                  stops: [0.0, 0.3],
                ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(context),
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: EdgeInsets.only(bottom: 30.h),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(height: 8.h),

                      // Info warning box
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.orange[50],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.orange[100]!),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.info_outline, color: Colors.orange[700], size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Vui lòng kiểm tra kỹ thông tin trước khi gửi. Yêu cầu của bạn sẽ được Ban đào tạo xem xét trong vòng 24h làm việc.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.orange[800],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Section 1: General Info
                      _buildSection(context,
                        title: 'Thông tin chung',
                        child: Column(
                          children: [
                            // Class dropdown
                            Obx(() => _buildDropdown(context,
                              label: 'LỚP HỌC',
                              value: controller.selectedClass.value,
                              items: controller.classes.map((c) => 
                                DropdownMenuItem(value: c, child: Text(c))
                              ).toList(),
                              onChanged: controller.onClassChanged,
                              hint: 'Chọn lớp học',
                              isLoading: controller.isLoadingClasses.value,
                            )),
                            const SizedBox(height: 16),
                            // Request type (fixed to RESCHEDULE)
                            _buildReadOnlyField(context,
                              label: 'LOẠI YÊU CẦU',
                              value: 'Đổi lịch',
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Section 2: Change Details
                      _buildSection(context,
                        title: 'Chi tiết thay đổi',
                        child: Obx(() => Column(
                          children: [
                            // Row 1: Original Date, Original Slot, Original Room
                            Row(
                              children: [
                                // Original Date
                                Expanded(
                                  child: _buildDropdown(context,
                                    label: 'NGÀY BAN ĐẦU',
                                    value: controller.selectedOriginalDate.value,
                                    items: controller.getAvailableDates().map((date) {
                                      return DropdownMenuItem(
                                        value: date,
                                        child: Text(_formatDate(date)),
                                      );
                                    }).toList(),
                                    onChanged: (v) => controller.onDateSelected(v ?? ''),
                                    hint: 'Chọn ngày',
                                    enabled: controller.slots.isNotEmpty,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // Original Slot
                                Expanded(
                                  child: Builder(
                                    builder: (context) {
                                      final slots = controller.getSlotsForSelectedDate();
                                      if (slots.length == 1) {
                                        return _buildReadOnlyField(context,
                                          label: 'SLOT BAN ĐẦU',
                                          value: 'Slot ${slots.first.slotNumber}',
                                        );
                                      }
                                      return _buildDropdown(context,
                                        label: 'SLOT BAN ĐẦU',
                                        value: controller.selectedSlotId.value,
                                        items: slots.map((slot) =>
                                          DropdownMenuItem(
                                            value: slot.id.toString(),
                                            child: Text('Slot ${slot.slotNumber}'),
                                          )
                                        ).toList(),
                                        onChanged: (v) => controller.onSlotSelected(v ?? ''),
                                        hint: 'Chọn slot',
                                        enabled: controller.selectedOriginalDate.value != null,
                                      );
                                    }
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            // Original Room (read-only)
                            _buildReadOnlyField(context,
                              label: 'PHÒNG BAN ĐẦU',
                              value: controller.selectedSlot.value?.roomName ?? '-',
                            ),
                            const SizedBox(height: 16),
                            const Divider(),
                            const SizedBox(height: 16),
                            // Row 2: New Date, New Slot
                            Row(
                              children: [
                                // New Date
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'NGÀY CẦN ĐỔI',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.grey[600],
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      GestureDetector(
                                        onTap: () => _selectDate(context, controller),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                          decoration: BoxDecoration(
                                            color: Colors.grey[50],
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(
                                              color: controller.dateError.value != null 
                                                  ? Colors.red[300]! 
                                                  : Colors.grey[200]!
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                controller.newDate.value != null
                                                    ? _formatDate(controller.newDate.value!)
                                                    : 'Chọn ngày',
                                                style: TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: controller.newDate.value != null
                                                      ? FontWeight.w600
                                                      : FontWeight.normal,
                                                  color: controller.newDate.value != null
                                                      ? const Color(0xFF2D3436)
                                                      : Colors.grey[400],
                                                ),
                                              ),
                                              Icon(Icons.calendar_today, size: 18, color: Colors.grey[400]),
                                            ],
                                          ),
                                        ),
                                      ),
                                      if (controller.dateError.value != null)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 4),
                                          child: Text(
                                            controller.dateError.value!,
                                            style: TextStyle(fontSize: 10, color: Colors.red[400]),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // New Slot
                                Expanded(
                                  child: _buildDropdown(context,
                                    label: 'SLOT MỚI',
                                    value: controller.newSlot.value?.toString(),
                                    items: [1, 2, 3, 4].map((slot) =>
                                      DropdownMenuItem(
                                        value: slot.toString(),
                                        child: Text('Slot $slot'),
                                      )
                                    ).toList(),
                                    onChanged: (v) => controller.onNewSlotChanged(v != null ? int.parse(v) : null),
                                    hint: 'Chọn slot',
                                  ),
                                ),
                              ],
                            ),
                            // Show selected room inline after slot selection
                            Obx(() {
                              if (controller.isLoadingRooms.value && controller.newSlot.value != null) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 12),
                                  child: Row(
                                    children: [
                                      SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.grey[400],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Đang tải danh sách phòng...',
                                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                                      ),
                                    ],
                                  ),
                                );
                              }
                              if (controller.selectedRoom.value != null) {
                                final room = controller.selectedRoom.value!;
                                return Padding(
                                  padding: const EdgeInsets.only(top: 12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: Colors.green[50],
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: Colors.green[200]!),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(Icons.meeting_room_rounded, size: 18, color: Colors.green[700]),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Phòng đã chọn: ',
                                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                        ),
                                        Text(
                                          room.name,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.green[800],
                                          ),
                                        ),
                                        const Spacer(),
                                        Text(
                                          '${room.building} - Tầng ${room.floor}',
                                          style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }
                              if (controller.newSlot.value != null && controller.newDate.value != null && !controller.isLoadingRooms.value && controller.rooms.isNotEmpty) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 12),
                                  child: Row(
                                    children: [
                                      Icon(Icons.info_outline, size: 14, color: Colors.orange[400]),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Vui lòng chọn phòng bên dưới',
                                        style: TextStyle(fontSize: 12, color: Colors.orange[600], fontWeight: FontWeight.w500),
                                      ),
                                    ],
                                  ),
                                );
                              }
                              return const SizedBox.shrink();
                            }),
                          ],
                        )),
                      ),

                      const SizedBox(height: 16),

                      // Inline Conflict Warnings
                      Obx(() {
                        if (controller.checkingConflict.value) {
                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 16),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: Row(
                              children: [
                                const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.grey),
                                ),
                                const SizedBox(width: 10),
                                Text('Đang kiểm tra xung đột...', 
                                  style: TextStyle(fontSize: 13, color: Colors.grey[600])
                                ),
                              ],
                            ),
                          );
                        }

                        final result = controller.conflictResult.value;
                        if (result != null && result.hasConflict) {
                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 16),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.red[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.red[100]!),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.warning_amber_rounded, color: Colors.red[700], size: 24),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        'Phát hiện xung đột lịch học!',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.red[800],
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                ...result.conflicts.map((conflict) => Padding(
                                  padding: const EdgeInsets.only(bottom: 6),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        margin: const EdgeInsets.only(top: 6),
                                        width: 6,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: Colors.red[400],
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          conflict.message,
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: Colors.red[700],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                )).toList(),
                                const SizedBox(height: 8),
                                Text(
                                  'Vui lòng chọn ngày hoặc slot khác để tránh xung đột.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontStyle: FontStyle.italic,
                                    color: Colors.red[400],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      }),

                      const SizedBox(height: 20),

                      // Section 3: Room Selection (Hidden if conflict exists)
                      Obx(() {
                        // Hide room selection if there's a conflict
                        if (controller.conflictResult.value?.hasConflict == true) {
                          return const SizedBox.shrink();
                        }
                        
                        return RoomSelectionWidget(
                          rooms: controller.rooms,
                          selectedRoom: controller.selectedRoom.value,
                          onRoomSelect: controller.onRoomSelected,
                          activeFloor: controller.activeFloor.value,
                          onFloorChange: (floor) => controller.activeFloor.value = floor,
                          activeBuilding: controller.activeBuilding.value,
                          onBuildingChange: (building) {
                            controller.activeBuilding.value = building;
                            // Auto-select first available floor for the new building
                            final floorsForBuilding = controller.rooms
                                .where((r) => r.building == building)
                                .map((r) => r.floor)
                                .toSet()
                                .toList()
                              ..sort();
                            if (floorsForBuilding.isNotEmpty) {
                              controller.activeFloor.value = floorsForBuilding.first;
                            }
                          },
                          isLoading: controller.isLoadingRooms.value,
                          hasFilters: controller.newDate.value != null && controller.newSlot.value != null,
                          selectedDate: controller.newDate.value,
                          selectedSlot: controller.newSlot.value,
                        );
                      }),

                      const SizedBox(height: 20),

                      // Section 4: Reason & Files
                      _buildSection(context,
                        title: 'Nội dung & Tài liệu',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Reason
                            Text(
                              'LÝ DO THAY ĐỔI *',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[600],
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              maxLines: 4,
                              onChanged: (v) => controller.reason.value = v,
                              decoration: InputDecoration(
                                hintText: 'Nhập lý do chi tiết...',
                                hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                                filled: true,
                                fillColor: Colors.grey[50],
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.all(14),
                              ),
                            ),
                            const SizedBox(height: 16),

                            // File upload
                            Text(
                              'TỆP ĐÍNH KÈM',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[600],
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            GestureDetector(
                              onTap: controller.pickFile,
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 24),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Column(
                                  children: [
                                    Icon(Icons.cloud_upload_outlined, size: 32, color: Colors.grey[400]),
                                    const SizedBox(height: 8),
                                    RichText(
                                      text: TextSpan(
                                        children: [
                                          TextSpan(
                                            text: 'Tải tệp lên ',
                                            style: TextStyle(color: AppColors.primaryOrange, fontWeight: FontWeight.w600),
                                          ),
                                          TextSpan(
                                            text: 'hoặc chọn ảnh',
                                            style: TextStyle(color: Colors.grey[600]),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'PNG, JPG lên đến 10MB',
                                      style: TextStyle(fontSize: 11, color: Colors.grey[400]),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // Uploaded files list
                            Obx(() {
                              if (controller.uploadedFiles.isEmpty) return const SizedBox.shrink();
                              return Column(
                                children: controller.uploadedFiles.asMap().entries.map((entry) {
                                  final index = entry.key;
                                  final file = entry.value;
                                  final fileName = file.path.split('/').last;
                                  return Container(
                                    margin: const EdgeInsets.only(top: 8),
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: Colors.grey[50],
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.grey[200]!),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 32,
                                          height: 32,
                                          decoration: BoxDecoration(
                                            color: Colors.green[50],
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Icon(Icons.check, color: Colors.green[600], size: 18),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            fileName,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        IconButton(
                                          icon: Icon(Icons.delete_outline, color: Colors.red[400], size: 20),
                                          onPressed: () => controller.removeFile(index),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              );
                            }),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Submit button
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16.w),
                        child: Obx(() => SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: controller.isSubmitting.value
                                ? null
                                : () async {
                                    final requestId = await controller.submitRequest();
                                    if (requestId != null) {
                                      await Future.delayed(const Duration(milliseconds: 1000));
                                      Get.offNamed('/lecturer/requests/$requestId');
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryOrange,
                              foregroundColor: Colors.white,
                              padding: EdgeInsets.symmetric(vertical: 16.h),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16.r),
                              ),
                              elevation: 0,
                              shadowColor: AppColors.primaryOrange.withOpacity(0.3),
                            ),
                            child: controller.isSubmitting.value
                                ? SizedBox(
                                    width: 20.w,
                                    height: 20.w,
                                    child: const CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  )
                                : Text(
                                    'GỬI YÊU CẦU',
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 14.sp,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.2,
                                    ),
                                  ),
                          ),
                        )),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 8.h),
      child: Row(
        children: [
          InkWell(
            onTap: () => Get.back(),
            borderRadius: BorderRadius.circular(12.r),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(SolarIconsOutline.altArrowLeft, color: AppColors.primaryOrange, size: 28.sp),
                SizedBox(width: 4.w),
                Text(
                  'Quay lại',
                  style: GoogleFonts.plusJakartaSans(
                    color: AppColors.primaryOrange,
                    fontWeight: FontWeight.w600,
                    fontSize: 16.sp,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: 16.w),
          Text(
            'Tạo yêu cầu mới',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18.sp,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(BuildContext context, {required String title, required Widget child}) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.04),
            blurRadius: 16.r,
            offset: Offset(0, 8.h),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 16.sp,
              fontWeight: FontWeight.w800,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          SizedBox(height: 20.h),
          child,
        ],
      ),
    );
  }

  Widget _buildDropdown(BuildContext context, {
    required String label,
    required String? value,
    required List<DropdownMenuItem<String>> items,
    required Function(String?) onChanged,
    String? hint,
    bool enabled = true,
    bool isLoading = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 11.sp,
            fontWeight: FontWeight.w800,
            color: Colors.grey[500],
            letterSpacing: 1.0,
          ),
        ),
        SizedBox(height: 8.h),
        Container(
          decoration: BoxDecoration(
            color: enabled ? (Theme.of(context).brightness == Brightness.dark ? Colors.white.withOpacity(0.05) : const Color(0xFFF9FAFB)) : Colors.grey.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12.r),
            border: Border.all(color: Colors.grey.withOpacity(0.1)),
          ),
          child: isLoading
              ? Container(
                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 14.h),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 16.w,
                        height: 16.w,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryOrange.withOpacity(0.5)),
                      ),
                      SizedBox(width: 12.w),
                      Text('Đang tải...', style: GoogleFonts.plusJakartaSans(color: Colors.grey[400], fontSize: 14.sp)),
                    ],
                  ),
                )
              : DropdownButtonFormField<String>(
                  value: items.any((item) => item.value == value) ? value : null,
                  items: items,
                  onChanged: enabled ? onChanged : null,
                  dropdownColor: Theme.of(context).cardColor,
                  decoration: InputDecoration(
                    hintText: hint,
                    hintStyle: GoogleFonts.plusJakartaSans(color: Colors.grey[400], fontSize: 14.sp),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 4.h),
                  ),
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                  icon: Icon(SolarIconsOutline.altArrowDown, color: Colors.grey[400], size: 20.sp),
                  isExpanded: true,
                ),
        ),
      ],
    );
  }

  Widget _buildReadOnlyField(BuildContext context, {required String label, required String value}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 11.sp,
            fontWeight: FontWeight.w800,
            color: Colors.grey[500],
            letterSpacing: 1.0,
          ),
        ),
        SizedBox(height: 8.h),
        Container(
          width: double.infinity,
          padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 14.h),
          decoration: BoxDecoration(
            color: Colors.grey.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12.r),
            border: Border.all(color: Colors.grey.withOpacity(0.1)),
          ),
          child: Text(
            value,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14.sp,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ),
      ],
    );
  }

  String _formatDate(String dateString) {
    if (dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  Future<void> _selectDate(BuildContext context, CreateRequestController controller) async {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    final picked = await showDatePicker(
      context: context,
      initialDate: tomorrow,
      firstDate: tomorrow,
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('vi', 'VN'),
    );
    if (picked != null) {
      final dateStr = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      controller.onNewDateChanged(dateStr);
    }
  }
}