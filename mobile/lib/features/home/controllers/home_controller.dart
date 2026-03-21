import 'package:get/get.dart';

class HomeController extends GetxController {
  // Current tab index
  var currentIndex = 0;

  // ✨ ADDED: Home View States ✨
  var selectedDate = DateTime.now().obs;
  var isCalendarVisible = true.obs;

  void changeTab(int index) {
    currentIndex = index;
    update(); // Notifies GetBuilder
  }

  // ✨ ADDED: Home View Actions ✨
  void toggleCalendar() {
    isCalendarVisible.value = !isCalendarVisible.value;
  }

  void updateSelectedDate(DateTime date) {
    selectedDate.value = date;
  }
}
