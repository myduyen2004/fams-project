import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:solar_icons/solar_icons.dart';
import '../../../core/services/wifi_service.dart';

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

  // Hidden Diagnostic Mode
  int _diagnosticTapCount = 0;
  DateTime? _lastTapTime;

  void handleDiagnosticTap() {
    final now = DateTime.now();
    if (_lastTapTime == null || now.difference(_lastTapTime!) > const Duration(seconds: 2)) {
      _diagnosticTapCount = 0;
    }
    
    _lastTapTime = now;
    _diagnosticTapCount++;

    if (_diagnosticTapCount >= 2) {
      _diagnosticTapCount = 0;
      showNetworkDiagnostics();
    }
  }

  void showNetworkDiagnostics() async {
    final WifiService wifiService = WifiService();
    
    Get.dialog(
      const Center(child: CircularProgressIndicator(color: Color(0xFFF26F21))),
      barrierDismissible: false,
    );

    final details = await wifiService.getWifiDetails();
    Get.back(); // Close loading

    String infoText = details.entries.map((e) => "${e.key}: ${e.value}").join('\n');

    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.r)),
        title: Row(
          children: [
            const Icon(SolarIconsBold.pointOnMap, color: Color(0xFFF26F21)),
            SizedBox(width: 10.w),
            const Text("Thông tin mạng"),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Dùng thông tin này để cấu hình Demo Face Scan:", style: GoogleFonts.plusJakartaSans(fontSize: 12.sp, color: Colors.grey)),
            SizedBox(height: 15.h),
            Container(
              padding: EdgeInsets.all(12.r),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: Colors.grey.withOpacity(0.1)),
              ),
              child: Text(
                infoText,
                style: GoogleFonts.firaCode(fontSize: 12.sp, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: const Text("Đóng"),
          ),
          ElevatedButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: infoText));
              Get.back();
              Get.snackbar(
                "Đã sao chép",
                "Thông tin mạng đã được lưu vào bộ nhớ tạm",
                snackPosition: SnackPosition.BOTTOM,
                backgroundColor: const Color(0xFFF26F21),
                colorText: Colors.white,
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF26F21),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
            ),
            child: const Text("Sao chép"),
          ),
        ],
      ),
    );
  }
}
