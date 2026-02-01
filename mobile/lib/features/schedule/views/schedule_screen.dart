import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/controllers/auth_controller.dart';
import '../controllers/schedule_controller.dart';
import '../widgets/schedule_calendar.dart';
import '../widgets/slot_card.dart';
import 'qr_scanner_screen.dart';

class ScheduleScreen extends StatelessWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ScheduleController controller = Get.put(ScheduleController());

    return Scaffold(
      backgroundColor: const Color(0xFFF8EDE4), // Updated beige background
      body: SafeArea(
        child: Column(
          children: [
            // 1. Header with Semester Selector
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 10), // Restored padding
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Kì học',
                        style: TextStyle(fontSize: 13, color: Colors.grey[500], fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8), // Restored from 4
                      GestureDetector(
                        onTap: () => _showSemesterPicker(context, controller),
                        child: Row(
                          children: [
                            Obx(() => Text(
                              controller.selectedSemester.value?.code ?? 'CHỌN KỲ',
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF2D3436)), // Restored 22
                            )),
                            const SizedBox(width: 4),
                            Icon(Icons.keyboard_arrow_down_rounded, color: Colors.grey[800], size: 24), // Restored 24
                          ],
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), // Restored
                    decoration: BoxDecoration(
                      color: AppColors.primaryOrange,
                      borderRadius: BorderRadius.circular(14), // Restored
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryOrange.withOpacity(0.2),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Text(
                      'Lưu vào lịch',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

            // 2. Redesigned Calendar
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16), // Restored
              child: ScheduleCalendar(),
            ),

            const SizedBox(height: 10), // Restored

            // 3. Section Title and Slot Count Badge
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12), // Restored
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Lịch học',
                    style: TextStyle(
                      fontSize: 24, // Restored
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF2D3436),
                      letterSpacing: -0.5,
                    ),
                  ),
                  Obx(() => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6), // Restored
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF0E0),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${controller.selectedDaySlots.length} Slot',
                      style: const TextStyle(
                        color: AppColors.primaryOrange,
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                      ),
                    ),
                  )),
                ],
              ),
            ),

            // 4. Slots List
            Expanded(
              child: Obx(() {
                if (controller.isLoading.value) {
                  return const Center(
                    child: CircularProgressIndicator(color: AppColors.primaryOrange),
                  );
                }

                if (controller.selectedDaySlots.isEmpty) {
                  final isNotPublished = controller.errorStatusCode.value == 403;
                  
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 40),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            isNotPublished ? Icons.lock_clock_outlined : Icons.event_busy_outlined, 
                            size: 80, 
                            color: Colors.grey[200]
                          ),
                          const SizedBox(height: 16),
                          Text(
                            isNotPublished 
                              ? 'Lịch học học kỳ này chưa được công bố.' 
                              : 'Nghỉ ngơi thôi, hông có lịch học đâu!',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.grey[400], 
                              fontSize: 15, 
                              fontStyle: FontStyle.italic
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
                  physics: const BouncingScrollPhysics(),
                  itemCount: controller.selectedDaySlots.length,
                  itemBuilder: (context, index) {
                    final slot = controller.selectedDaySlots[index];
                    return SlotCard(slot: slot);
                  },
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  void _showSemesterPicker(BuildContext context, ScheduleController controller) {
    if (controller.semesters.isEmpty) return;

    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Chọn học kỳ',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF2D3436)),
            ),
            const SizedBox(height: 20),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: controller.semesters.length,
                itemBuilder: (context, index) {
                  final sem = controller.semesters[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      sem.name,
                      style: TextStyle(
                        fontWeight: controller.selectedSemester.value?.code == sem.code ? FontWeight.bold : FontWeight.normal,
                        color: controller.selectedSemester.value?.code == sem.code ? AppColors.primaryOrange : const Color(0xFF2D3436),
                      ),
                    ),
                    subtitle: Text(sem.code, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                    onTap: () {
                      controller.selectedSemester.value = sem;
                      Get.back();
                    },
                    trailing: controller.selectedSemester.value?.code == sem.code 
                      ? const Icon(Icons.check_circle, color: AppColors.primaryOrange) 
                      : null,
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
