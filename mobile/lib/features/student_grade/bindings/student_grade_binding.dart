import 'package:get/get.dart';
import '../controllers/student_grade_controller.dart';

class StudentGradeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<StudentGradeController>(() => StudentGradeController());
  }
}
