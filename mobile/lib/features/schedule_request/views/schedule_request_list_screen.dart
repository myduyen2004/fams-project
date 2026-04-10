import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/app_background.dart';
import '../../home/controllers/home_controller.dart';
import '../controllers/schedule_request_controller.dart';
import '../utils/request_type_labels.dart';
import '../widgets/request_status_badge.dart';

/// Screen displaying list of schedule requests for lecturer
class ScheduleRequestListScreen extends StatelessWidget {
  const ScheduleRequestListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Initialize controller - use existing if available, otherwise create new
    final controller = Get.isRegistered<ScheduleRequestController>()
        ? Get.find<ScheduleRequestController>()
        : Get.put(ScheduleRequestController());
    final homeController = Get.find<HomeController>();

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          child: Column(
          children: [
            // Header
            _buildHeader(context, controller),
            
            // Filter Bar
            _buildFilterBar(controller),
            
            // Request List
            Expanded(
              child: Obx(() {
                if (controller.isLoading.value && controller.requests.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(color: AppColors.primaryOrange),
                  );
                }

                if (controller.errorStatusCode.value > 0 && controller.requests.isEmpty) {
                  return _buildErrorState(controller);
                }

                if (controller.requests.isEmpty) {
                  return _buildEmptyState(controller);
                }

                return RefreshIndicator(
                  onRefresh: controller.refreshList,
                  color: AppColors.primaryOrange,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                    physics: const BouncingScrollPhysics(),
                    itemCount: controller.requests.length,
                    itemBuilder: (context, index) {
                      final request = controller.requests[index];
                      return _RequestCard(request: request);
                    },
                  ),
                );
                }),
              ),
            ],
          ),
        ),
      ),
      
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primaryOrange,
        onPressed: () => Get.toNamed('/lecturer/requests/create'),
        icon: const Icon(Icons.add_circle_outline_rounded, color: Colors.white, size: 24),
        label: const Text('Tạo yêu cầu', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, ScheduleRequestController controller) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Row(
        children: [
          // Back button
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
              onPressed: () => Get.back(),
              color: const Color(0xFF2D3436),
            ),
          ),
          const SizedBox(width: 16),
          // Title
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Quản lý Yêu cầu',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2D3436),
                    letterSpacing: -0.5,
                  ),
                ),
                Obx(() => Text(
                  '${controller.requests.length} yêu cầu',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                  ),
                )),
              ],
            ),
          ),
          // Orange Filter Button
          PopupMenuButton<String>(
            onSelected: (value) {
              controller.changeSortOrder(value);
            },
            offset: const Offset(0, 45),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'desc',
                child: Obx(() => Row(
                  children: [
                    Icon(
                      Icons.arrow_downward,
                      size: 18,
                      color: controller.sortOrder.value == 'desc' 
                          ? AppColors.primaryOrange 
                          : Colors.grey[600],
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Mới nhất',
                      style: TextStyle(
                        fontWeight: controller.sortOrder.value == 'desc' 
                            ? FontWeight.bold 
                            : FontWeight.normal,
                        color: controller.sortOrder.value == 'desc' 
                            ? AppColors.primaryOrange 
                            : Colors.grey[800],
                      ),
                    ),
                  ],
                )),
              ),
              PopupMenuItem(
                value: 'asc',
                child: Obx(() => Row(
                  children: [
                    Icon(
                      Icons.arrow_upward,
                      size: 18,
                      color: controller.sortOrder.value == 'asc' 
                          ? AppColors.primaryOrange 
                          : Colors.grey[600],
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Cũ nhất',
                      style: TextStyle(
                        fontWeight: controller.sortOrder.value == 'asc' 
                            ? FontWeight.bold 
                            : FontWeight.normal,
                        color: controller.sortOrder.value == 'asc' 
                            ? AppColors.primaryOrange 
                            : Colors.grey[800],
                      ),
                    ),
                  ],
                )),
              ),
            ],
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primaryOrange,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryOrange.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(
                Icons.filter_list_rounded,
                color: Colors.white,
                size: 22,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(ScheduleRequestController controller) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Obx(() => Row(
          children: [
            _FilterChip(
              label: 'Tất cả',
              isSelected: controller.statusFilter.value == null,
              onTap: () => controller.changeStatusFilter(null),
            ),
            const SizedBox(width: 8),
            _FilterChip(
              label: 'Đang chờ',
              color: Colors.amber,
              isSelected: controller.statusFilter.value == 'PENDING',
              onTap: () => controller.changeStatusFilter('PENDING'),
            ),
            const SizedBox(width: 8),
            _FilterChip(
              label: 'Đã duyệt',
              color: Colors.green,
              isSelected: controller.statusFilter.value == 'APPROVED',
              onTap: () => controller.changeStatusFilter('APPROVED'),
            ),
            const SizedBox(width: 8),
            _FilterChip(
              label: 'Từ chối',
              color: Colors.red,
              isSelected: controller.statusFilter.value == 'REJECTED',
              onTap: () => controller.changeStatusFilter('REJECTED'),
            ),
          ],
        )),
      ),
    );
  }

  Widget _buildErrorState(ScheduleRequestController controller) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 80, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'Lỗi ${controller.errorStatusCode.value}',
              style: TextStyle(fontSize: 16, color: Colors.grey[500]),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => controller.refreshList(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Thử lại', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(ScheduleRequestController controller) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 80, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              controller.statusFilter.value != null 
                ? 'Không có yêu cầu nào với trạng thái này'
                : 'Chưa có yêu cầu nào',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey[500],
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? AppColors.primaryOrange : Colors.grey[400],
              size: 28,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isActive ? AppColors.primaryOrange : Colors.grey[400],
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color? color;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    this.icon,
    this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected 
            ? (color ?? AppColors.primaryOrange) 
            : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected 
              ? (color ?? AppColors.primaryOrange) 
              : Colors.grey[300]!,
            width: 1.5,
          ),
          boxShadow: isSelected ? [
            BoxShadow(
              color: (color ?? AppColors.primaryOrange).withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ] : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 14,
                color: isSelected ? Colors.white : Colors.grey[600],
              ),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final dynamic request;

  const _RequestCard({required this.request});

  String _formatDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('dd/MM/yyyy HH:mm').format(date);
    } catch (e) {
      return dateString;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => Get.toNamed('/lecturer/requests/${request.id}'),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header: Class name & Status
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        request.className,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2D3436),
                        ),
                      ),
                    ),
                    RequestStatusBadge(
                      status: request.status,
                      label: request.statusLabel,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Slot info
                Row(
                  children: [
                    _InfoChip(
                      icon: Icons.access_time,
                      label: request.originalSlotNumber != null
                          ? 'Slot ${request.originalSlotNumber}'
                          : '-',
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    _InfoChip(
                      icon: Icons.schedule,
                      label: request.requestedSlotNumber != null
                          ? 'Slot ${request.requestedSlotNumber}'
                          : '-',
                      isHighlight: true,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Room info
                if (request.originalRoomName != null || request.requestedRoomName != null)
                  Row(
                    children: [
                      _InfoChip(
                        icon: Icons.room,
                        label: request.originalRoomName ?? '-',
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward, size: 16, color: Colors.grey),
                      const SizedBox(width: 8),
                      _InfoChip(
                        icon: Icons.meeting_room,
                        label: request.requestedRoomName ?? 'Không đổi',
                        isHighlight: true,
                      ),
                    ],
                  ),
                const SizedBox(height: 12),
                // Footer: Type & Date
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF0E0),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        RequestTypeLabels.getLabel(request.type),
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.primaryOrange,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Text(
                      _formatDate(request.createdAt),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isHighlight;

  const _InfoChip({
    required this.icon,
    required this.label,
    this.isHighlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 14,
          color: isHighlight ? AppColors.primaryOrange : Colors.grey[600],
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: isHighlight ? AppColors.primaryOrange : Colors.grey[700],
            fontWeight: isHighlight ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
