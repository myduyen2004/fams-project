import 'package:get/get.dart';
import '../../auth/controllers/auth_controller.dart';

/// Home Controller
class HomeController extends GetxController {
  final AuthController _authController = Get.find<AuthController>();

  int currentIndex = 0;

  void changeTab(int index) {
    currentIndex = index;
    update();
  }

  Future<void> logout() async {
    await _authController.logout();
  }
}
