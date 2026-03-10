import 'package:get/get.dart';
import '../controllers/academic_request_controller.dart';

/// Binding for Academic Request feature
class AcademicRequestBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AcademicRequestController>(() => AcademicRequestController());
  }
}
