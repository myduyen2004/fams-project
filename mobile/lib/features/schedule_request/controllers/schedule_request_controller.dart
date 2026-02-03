import 'package:dio/dio.dart';
import 'package:get/get.dart';
import '../models/schedule_request_model.dart';
import '../services/schedule_request_service.dart';

/// GetX Controller for Schedule Request feature
class ScheduleRequestController extends GetxController {
  final ScheduleRequestService _service = ScheduleRequestService();

  // Observable state
  final RxBool isLoading = false.obs;
  final RxBool isLoadingDetail = false.obs;
  final RxInt errorStatusCode = (-1).obs;
  final RxList<ScheduleRequest> requests = <ScheduleRequest>[].obs;
  final Rx<ScheduleRequest?> selectedRequest = Rx<ScheduleRequest?>(null);

  // Filter and sort state
  final RxString sortOrder = 'desc'.obs; // 'desc' = newest, 'asc' = oldest
  final RxnString statusFilter = RxnString(null); // null = all, 'PENDING', 'APPROVED', 'REJECTED'

  // All requests (unfiltered)
  final RxList<ScheduleRequest> _allRequests = <ScheduleRequest>[].obs;

  @override
  void onInit() {
    super.onInit();
    fetchRequests();
  }

  /// Fetch all requests from API
  Future<void> fetchRequests({bool refresh = false}) async {
    try {
      isLoading.value = true;
      errorStatusCode.value = -1;

      // Fetch all pages (up to 100 items for now)
      final result = await _service.getMyRequests(
        page: 0,
        size: 100,
      );

      if (result != null) {
        _allRequests.value = result.content;
        _applyFilters();
      }
    } on DioException catch (e) {
      errorStatusCode.value = e.response?.statusCode ?? 500;
    } catch (e) {
      errorStatusCode.value = 500;
    } finally {
      isLoading.value = false;
    }
  }

  /// Apply filters and sorting to the request list
  void _applyFilters() {
    List<ScheduleRequest> filtered = List.from(_allRequests);

    // Apply status filter
    if (statusFilter.value != null) {
      filtered = filtered.where((r) => r.status == statusFilter.value).toList();
    }

    // Apply sorting
    filtered.sort((a, b) {
      final dateA = DateTime.tryParse(a.createdAt) ?? DateTime.now();
      final dateB = DateTime.tryParse(b.createdAt) ?? DateTime.now();
      return sortOrder.value == 'desc' 
          ? dateB.compareTo(dateA) 
          : dateA.compareTo(dateB);
    });

    requests.value = filtered;
  }

  /// Change sort order
  void changeSortOrder(String order) {
    sortOrder.value = order;
    _applyFilters();
  }

  /// Change status filter
  void changeStatusFilter(String? status) {
    statusFilter.value = status;
    _applyFilters();
  }

  /// Fetch request detail by ID
  Future<void> fetchRequestDetail(int id) async {
    try {
      isLoadingDetail.value = true;
      errorStatusCode.value = -1;

      final result = await _service.getRequestById(id);
      selectedRequest.value = result;
    } on DioException catch (e) {
      errorStatusCode.value = e.response?.statusCode ?? 500;
    } catch (e) {
      errorStatusCode.value = 500;
    } finally {
      isLoadingDetail.value = false;
    }
  }

  /// Refresh list (pull-to-refresh)
  Future<void> refreshList() async {
    await fetchRequests(refresh: true);
  }

  /// Clear selected request when leaving detail screen
  void clearSelectedRequest() {
    selectedRequest.value = null;
  }
}

