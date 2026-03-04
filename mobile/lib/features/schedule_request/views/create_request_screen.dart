import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/create_request_controller.dart';
import '../widgets/room_selection_widget.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/app_background.dart';

/// Screen for creating a new schedule request
class CreateRequestScreen extends StatelessWidget {
  const CreateRequestScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(CreateRequestController());

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2D3436)),
          onPressed: () => Get.back(),
        ),
        title: const Text(
          'Tạo yêu cầu mới',
          style: TextStyle(
            color: Color(0xFF2D3436),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: AppBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            const SizedBox(height: 16),

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
            _buildSection(
              title: 'Thông tin chung',
              child: Column(
                children: [
                  // Class dropdown
                  Obx(() => _buildDropdown(
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
                  _buildReadOnlyField(
                    label: 'LOẠI YÊU CẦU',
                    value: 'Đổi lịch',
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Section 2: Change Details
            _buildSection(
              title: 'Chi tiết thay đổi',
              child: Obx(() => Column(
                children: [
                  // Row 1: Original Date, Original Slot, Original Room
                  Row(
                    children: [
                      // Original Date
                      Expanded(
                        child: _buildDropdown(
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
                              return _buildReadOnlyField(
                                label: 'SLOT BAN ĐẦU',
                                value: 'Slot ${slots.first.slotNumber}',
                              );
                            }
                            return _buildDropdown(
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
                  _buildReadOnlyField(
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
                        child: _buildDropdown(
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
                isLoading: controller.isLoadingRooms.value,
                hasFilters: controller.newDate.value != null && controller.newSlot.value != null,
                selectedDate: controller.newDate.value,
                selectedSlot: controller.newSlot.value,
              );
            }),

            const SizedBox(height: 20),

            // Section 4: Reason & Files
            _buildSection(
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
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Obx(() => SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: controller.isSubmitting.value
                      ? null
                      : () async {
                          final requestId = await controller.submitRequest();
                          if (requestId != null) {
                            // Delay to show success message
                            await Future.delayed(const Duration(milliseconds: 1000));
                            // Navigate to request detail page
                            Get.offNamed('/lecturer/requests/$requestId');
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: controller.isSubmitting.value
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'GỬI YÊU CẦU',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                ),
              )),
            ),

            const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection({required String title, required Widget child}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2D3436),
            ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildDropdown({
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
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Colors.grey[600],
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: enabled ? Colors.grey[50] : Colors.grey[100],
            borderRadius: BorderRadius.circular(10),
          ),
          child: isLoading
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.grey[400]),
                      ),
                      const SizedBox(width: 10),
                      Text('Đang tải...', style: TextStyle(color: Colors.grey[400])),
                    ],
                  ),
                )
              : DropdownButtonFormField<String>(
                  value: items.any((item) => item.value == value) ? value : null,
                  items: items,
                  onChanged: enabled ? onChanged : null,
                  decoration: InputDecoration(
                    hintText: hint,
                    hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  ),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF2D3436),
                  ),
                  icon: Icon(Icons.keyboard_arrow_down, color: Colors.grey[400]),
                  isExpanded: true,
                ),
        ),
      ],
    );
  }

  Widget _buildReadOnlyField({required String label, required String value}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Colors.grey[600],
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF2D3436),
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
