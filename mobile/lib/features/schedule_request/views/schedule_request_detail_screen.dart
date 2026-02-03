import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/widgets/app_background.dart';
import '../controllers/schedule_request_controller.dart';
import '../utils/request_type_labels.dart';
import '../widgets/request_status_badge.dart';

/// Screen displaying schedule request details
class ScheduleRequestDetailScreen extends StatefulWidget {
  const ScheduleRequestDetailScreen({super.key});

  @override
  State<ScheduleRequestDetailScreen> createState() => _ScheduleRequestDetailScreenState();
}

class _ScheduleRequestDetailScreenState extends State<ScheduleRequestDetailScreen> {
  late ScheduleRequestController controller;
  late int requestId;

  @override
  void initState() {
    super.initState();
    controller = Get.find<ScheduleRequestController>();
    requestId = int.tryParse(Get.parameters['id'] ?? '') ?? 0;
    controller.fetchRequestDetail(requestId);
  }

  @override
  void dispose() {
    controller.clearSelectedRequest();
    super.dispose();
  }

  String _formatDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'Không có';
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('dd/MM/yyyy HH:mm').format(date);
    } catch (e) {
      return dateString;
    }
  }

  String _formatDateOnly(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'Không có';
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('dd/MM/yyyy').format(date);
    } catch (e) {
      return dateString;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text(
          'Chi tiết Yêu cầu',
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2D3436)),
        ),
        backgroundColor: Colors.transparent,
        foregroundColor: const Color(0xFF2D3436),
        elevation: 0,
      ),
      body: AppBackground(
        child: SafeArea(
          child: Obx(() {
        if (controller.isLoadingDetail.value) {
          return const Center(
            child: CircularProgressIndicator(
              color: Color(0xFFF36F21),
            ),
          );
        }

        final request = controller.selectedRequest.value;
        if (request == null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'Không tìm thấy yêu cầu',
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => Get.back(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF36F21),
                  ),
                  child: const Text('Quay lại', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // General Info Section
              _SectionCard(
                title: 'Thông tin chung',
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDBEAFE),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    RequestTypeLabels.getLabel(request.type),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                ),
                child: Column(
                  children: [
                    _InfoRow(label: 'Lớp học', value: request.className),
                    _InfoRow(label: 'Ngày tạo', value: _formatDate(request.createdAt)),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Change Details Section
              _SectionCard(
                title: 'Chi tiết thay đổi',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Ban đầu section
                    Text(
                      'BAN ĐẦU',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[500],
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _InfoRow(
                      label: 'Slot:',
                      value: request.originalSlotNumber != null
                          ? 'Slot ${request.originalSlotNumber}'
                          : 'Không có',
                    ),
                    _InfoRow(
                      label: 'Phòng:',
                      value: request.originalRoomName ?? 'Không có',
                    ),
                    const SizedBox(height: 12),
                    const Divider(),
                    const SizedBox(height: 12),
                    // Yêu cầu đổi sang section
                    Text(
                      'YÊU CẦU ĐỔI SANG',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFFF36F21),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _InfoRow(
                      label: 'Ngày:',
                      value: _formatDateOnly(request.requestedDate),
                    ),
                    _InfoRow(
                      label: 'Slot:',
                      value: request.requestedSlotNumber != null
                          ? 'Slot ${request.requestedSlotNumber}'
                          : 'Không đổi',
                    ),
                    _InfoRow(
                      label: 'Phòng:',
                      value: request.requestedRoomName ?? 'Không đổi',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Content & Documents Section
              _SectionCard(
                title: 'Nội dung & Tài liệu',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'LÝ DO THAY ĐỔI',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                      child: Text(
                        request.reason,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[700],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildAttachments(request.file),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Status & Approval Section
              _SectionCard(
                title: 'Trạng thái & Phê duyệt',
                child: Column(
                  children: [
                    // Status Badge (centered)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: _getStatusBackgroundColor(request.status),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'TRẠNG THÁI HIỆN TẠI',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFF36F21),
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 12),
                          RequestStatusBadge(
                            status: request.status,
                            label: request.statusLabel,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    _InfoRow(
                      label: 'Người phê duyệt',
                      value: request.approverName ?? 'Chưa có thông tin',
                    ),
                    _InfoRow(
                      label: 'Thời gian phê duyệt',
                      value: request.approvedAt != null
                          ? _formatDate(request.approvedAt)
                          : 'Chưa có thông tin',
                    ),
                    const Divider(height: 24),
                    const Text(
                      'GHI CHÚ PHÊ DUYỆT',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      request.approverNote ?? 'Yêu cầu đang chờ quản lý xem xét và phê duyệt.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
        ),
      ),
    );
  }

  Widget _buildAttachments(String? file) {
    List<String> fileUrls = [];
    if (file != null && file.isNotEmpty) {
      try {
        if (file.startsWith('[')) {
          // Parse JSON array
          final parsed = file.substring(1, file.length - 1).split(',');
          fileUrls = parsed.map((e) => e.trim().replaceAll('"', '')).toList();
        } else {
          fileUrls = [file];
        }
      } catch (e) {
        fileUrls = [file];
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'TÀI LIỆU ĐÍNH KÈM (${fileUrls.length})',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: Colors.grey,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        if (fileUrls.isEmpty)
          Text(
            'Không có file đính kèm',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
              fontStyle: FontStyle.italic,
            ),
          )
        else
          ...fileUrls.map((url) => _FileCard(url: url)),
      ],
    );
  }

  Color _getStatusBackgroundColor(String status) {
    switch (status) {
      case 'APPROVED':
        return const Color(0xFFDCFCE7);
      case 'REJECTED':
        return const Color(0xFFFEE2E2);
      default:
        return const Color(0xFFFFF7ED);
    }
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget? trailing;
  final Widget child;

  const _SectionCard({
    required this.title,
    this.trailing,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[600],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Color(0xFF374151),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailBox extends StatelessWidget {
  final String label;
  final String value;
  final bool isOriginal;
  final bool fullWidth;

  const _DetailBox({
    required this.label,
    required this.value,
    required this.isOriginal,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: fullWidth ? double.infinity : null,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isOriginal ? const Color(0xFFF1F5F9) : const Color(0xFFFFF7ED),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isOriginal ? const Color(0xFFE2E8F0) : const Color(0xFFFFEDD5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: isOriginal ? Colors.grey[500] : const Color(0xFFF36F21),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isOriginal ? const Color(0xFF475569) : const Color(0xFFF36F21),
            ),
          ),
        ],
      ),
    );
  }
}

class _FileCard extends StatelessWidget {
  final String url;

  const _FileCard({required this.url});

  String _getFileName() {
    try {
      final decoded = Uri.decodeComponent(url);
      return decoded.split('/').last.split('?').first;
    } catch (e) {
      return url.split('/').last;
    }
  }

  String _getExtension() {
    final name = _getFileName();
    return name.split('.').last.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () async {
          final uri = Uri.parse(url);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.description,
                  color: Colors.grey[600],
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _getFileName(),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF374151),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_getExtension()} File',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.open_in_new,
                color: Colors.grey[400],
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
