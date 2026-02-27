import 'package:get/get.dart';
import '../controllers/home_controller.dart';
import '../../chat/controllers/chat_controller.dart';
import '../../schedule/controllers/schedule_controller.dart';

class HomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<HomeController>(() => HomeController());
    Get.put<ChatController>(ChatController(), permanent: true);
    Get.put<ScheduleController>(ScheduleController(), permanent: true);
  }
}
