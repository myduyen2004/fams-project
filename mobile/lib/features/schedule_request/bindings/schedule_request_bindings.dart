import 'package:get/get.dart';
import '../controllers/schedule_request_controller.dart';
import '../controllers/create_request_controller.dart';

/// Binding for Schedule Request feature
class ScheduleRequestBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ScheduleRequestController>(() => ScheduleRequestController());
  }
}

/// Binding for Create Request feature
class CreateRequestBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<CreateRequestController>(() => CreateRequestController());
  }
}
