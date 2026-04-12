import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/app_background.dart';
import '../controllers/academic_request_controller.dart';
import '../models/academic_request_model.dart';

/// 2-step academic request creation screen
/// Step 1: Choose request type
/// Step 2: Fill dynamic form per type
class AcademicRequestCreateScreen extends StatefulWidget {
  const AcademicRequestCreateScreen({super.key});

  @override
  State<AcademicRequestCreateScreen> createState() => _AcademicRequestCreateScreenState();
}

class _AcademicRequestCreateScreenState extends State<AcademicRequestCreateScreen> {
  late final AcademicRequestController controller;

  @override
  void initState() {
    super.initState();
    controller = Get.find<AcademicRequestController>();
    controller.backToTypeSelection();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark 
            ? Theme.of(context).scaffoldBackgroundColor 
            : null,
        gradient: Theme.of(context).brightness == Brightness.dark 
            ? null 
            : const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFFFEF3DE),
                  Colors.white,
                ],
                stops: [0.0, 0.3],
              ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Column(
            children: [
              _buildHeader(context, controller),
              Expanded(
                child: Obx(() {
                  if (controller.selectedType.value == null) {
                    return _TypeSelectionStep(controller: controller);
                  }
                  return _FormStep(controller: controller);
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, AcademicRequestController controller) {
    const Color textMain = Color(0xFF1E2A3A);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 24),
            color: textMain,
            onPressed: () {
              if (controller.selectedType.value != null) {
                controller.backToTypeSelection();
              } else {
                Get.back();
              }
            },
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Obx(() => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  controller.selectedType.value == null ? 'Chọn loại yêu cầu' : 'Thông tin yêu cầu',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: textMain),
                ),
                if (controller.selectedType.value != null)
                  Text(controller.selectedType.value!.label,
                      style: TextStyle(fontSize: 13, color: textMain.withOpacity(0.6), fontWeight: FontWeight.w500)),
              ],
            )),
          ),
        ],
      ),
    );
  }
}

// ─── Step 1: Type Selection ───────────────────────────────────────────────────

class _TypeSelectionStep extends StatelessWidget {
  final AcademicRequestController controller;
  const _TypeSelectionStep({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      if (controller.requestTypes.isEmpty) {
        return const Center(child: CircularProgressIndicator(color: AppColors.primaryOrange));
      }
      return ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
        itemCount: controller.requestTypes.length,
        itemBuilder: (_, i) {
          final type = controller.requestTypes[i];
          return _TypeCard(type: type, onTap: () => controller.selectType(type));
        },
      );
    });
  }
}

class _TypeCard extends StatelessWidget {
  final AcademicRequestType type;
  final VoidCallback onTap;

  const _TypeCard({required this.type, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final enabled = type.canSubmit;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: enabled ? Theme.of(context).cardColor : (Theme.of(context).brightness == Brightness.dark ? Colors.grey[800] : Colors.grey[100]),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: enabled ? (Theme.of(context).brightness == Brightness.dark ? Colors.transparent : Colors.transparent) : (Theme.of(context).brightness == Brightness.dark ? Colors.transparent : Colors.grey[300]!), width: 1),
        boxShadow: enabled
            ? [BoxShadow(color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.04), blurRadius: 8, offset: const Offset(0, 3))]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: enabled ? onTap : () => controller.selectType(type),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: enabled ? AppColors.primaryOrange.withOpacity(0.12) : (Theme.of(context).brightness == Brightness.dark ? Colors.grey[700] : Colors.grey[200]),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.article_outlined,
                      color: enabled ? AppColors.primaryOrange : Colors.grey[400], size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(type.label,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: enabled ? Theme.of(context).colorScheme.onSurface : Colors.grey[500],
                          )),
                      if (type.dueDate != null) ...[
                        const SizedBox(height: 3),
                        Text(
                          type.canSubmit ? 'Hạn: ${type.dueDate}' : 'Đã hết hạn - ${type.dueDate}',
                          style: TextStyle(
                            fontSize: 11,
                            color: type.canSubmit ? Colors.grey[500] : Colors.red[400],
                          ),
                        ),
                      ] else if (type.startDate != null && !type.canSubmit) ...[
                        const SizedBox(height: 3),
                        Text('Bắt đầu từ: ${type.startDate}',
                            style: TextStyle(fontSize: 11, color: Colors.blue[400])),
                      ],
                    ],
                  ),
                ),
                if (enabled)
                  const Icon(Icons.chevron_right_rounded, color: AppColors.primaryOrange),
                if (!enabled)
                  Icon(Icons.lock_outline_rounded, color: Colors.grey[400], size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // expose controller to inner widget
  AcademicRequestController get controller => Get.find<AcademicRequestController>();
}

// ─── Step 2: Dynamic Form ─────────────────────────────────────────────────────

class _FormStep extends StatelessWidget {
  final AcademicRequestController controller;
  const _FormStep({required this.controller});

  String _buildTransferTargetLabel(ClassSectionTransferTarget target) {
    final section = target.classSection;
    final details = <String>[
      if ((section.courseCode ?? '').isNotEmpty && (section.courseName ?? '').isNotEmpty)
        '${section.courseCode} - ${section.courseName}',
      if ((section.courseCode ?? '').isEmpty && (section.courseName ?? '').isNotEmpty)
        section.courseName!,
      if ((section.enrollmentInfo ?? '').isNotEmpty) 'Sĩ số: ${section.enrollmentInfo}',
    ];

    final baseLabel = details.isEmpty
        ? section.className
        : '${section.className}\n${details.join(' | ')}';

    return baseLabel;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
            child: Obx(() {
              final type = controller.selectedType.value!.value;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type-specific fields
                  ..._buildFieldsForType(type),
                  const SizedBox(height: 16),

                  // Reason (always required)
                  _SectionLabel('Lý do *'),
                  _TextInputField(
                    hint: 'Nhập lý do của bạn...',
                    maxLines: 4,
                    value: controller.formReason.value,
                    onChanged: (v) => controller.formReason.value = v,
                  ),
                  const SizedBox(height: 16),

                  // Optional note for OTHERS type
                  if (type == 'OTHERS') ...[
                    _SectionLabel('Ghi chú'),
                    _TextInputField(
                      hint: 'Ghi chú thêm (không bắt buộc)',
                      maxLines: 3,
                      value: controller.formNote.value,
                      onChanged: (v) => controller.formNote.value = v,
                    ),
                    const SizedBox(height: 16),
                  ],

                  // File attachment
                  _SectionLabel('File đính kèm (tùy chọn, tối đa 10MB)'),
                  _buildFileSection(),
                  const SizedBox(height: 24),
                ],
              );
            }),
          ),
        ),
        // Submit button
        _buildSubmitButton(),
      ],
    );
  }

  List<Widget> _buildFieldsForType(String type) {
    final fields = <Widget>[];

    // Semester dropdown (not needed for GRADE_APPEAL)
    if (['PAUSE_SEMESTER', 'RETAKE_COURSE', 'CHANGE_CLASS', 'OVERLOAD_STUDY', 'ABSENT_REQUEST'].contains(type)) {
      fields.add(_SectionLabel('Học kỳ *'));
      fields.add(_buildSemesterDropdown());
      fields.add(const SizedBox(height: 16));
    }

    // Course dropdown (for RETAKE_COURSE, OVERLOAD_STUDY)
    if (['RETAKE_COURSE', 'OVERLOAD_STUDY'].contains(type)) {
      fields.add(_SectionLabel('Môn học *'));
      fields.add(_buildCourseDropdown(type));
      fields.add(const SizedBox(height: 16));
    }

    // Class section dropdown
    if (['CHANGE_CLASS', 'GRADE_APPEAL'].contains(type)) {
      final label = type == 'GRADE_APPEAL' ? 'Lớp học phần muốn phúc khảo *' : 'Lớp học phần *';
      fields.add(_SectionLabel(label));
      fields.add(_buildClassSectionDropdown(type));
      if (type == 'GRADE_APPEAL') {
        fields.add(const SizedBox(height: 8));
        fields.add(_buildGradeAppealInfo());
      }
      fields.add(const SizedBox(height: 16));
    }

    // Target class (for CHANGE_CLASS)
    if (type == 'CHANGE_CLASS') {
      fields.add(_SectionLabel('Lớp muốn chuyển đến *'));
      fields.add(_buildTransferTargetDropdown());
      fields.add(const SizedBox(height: 16));
    }

    // Major dropdown (for CHANGE_MAJOR)
    if (type == 'CHANGE_MAJOR') {
      // Show current major/specialization info
      final profile = controller.studentProfile.value;
      fields.add(_buildCurrentInfoCard(
        items: [
          _InfoItem('Ngành hiện tại', profile?.major ?? 'N/A'),
          _InfoItem('Chuyên ngành hiện tại', profile?.specialization ?? 'N/A'),
        ],
      ));
      fields.add(const SizedBox(height: 16));

      fields.add(_SectionLabel('Ngành muốn chuyển *'));
      fields.add(_buildMajorDropdown());
      fields.add(const SizedBox(height: 16));

      if (controller.majors.isNotEmpty && controller.formToMajor.value.isNotEmpty) {
        fields.add(_SectionLabel('Chuyên ngành muốn chuyển *'));
        fields.add(_buildSpecializationDropdown());
        fields.add(const SizedBox(height: 16));
      }
    }

    // Sub-specialization (for CHANGE_SPECIALIZATION)
    if (type == 'CHANGE_SPECIALIZATION') {
      // Show current sub-specialization info
      final profile = controller.studentProfile.value;
      fields.add(_buildCurrentInfoCard(
        items: [
          _InfoItem('Chuyên ngành hẹp hiện tại', profile?.subSpecialization ?? 'Chưa được thêm vào chuyên ngành hẹp'),
          _InfoItem('Chuyên ngành', profile?.specialization ?? 'N/A'),
        ],
        note: '* Bạn chỉ có thể chuyển giữa các chuyên ngành hẹp trong cùng chuyên ngành',
      ));
      fields.add(const SizedBox(height: 16));

      fields.add(_SectionLabel('Chuyên ngành hẹp muốn chuyển *'));
      fields.add(_buildSubSpecializationDropdown());
      fields.add(const SizedBox(height: 16));
    }

    // Request title for OTHERS
    if (type == 'OTHERS') {
      fields.insert(0, _SectionLabel('Tiêu đề yêu cầu *'));
      fields.insert(1, _TextInputField(
        hint: 'Nhập tiêu đề...',
        value: controller.formRequestTitle.value,
        onChanged: (v) => controller.formRequestTitle.value = v,
      ));
      fields.insert(2, const SizedBox(height: 16));
    }

    return fields;
  }

  Widget _buildSemesterDropdown() {
    return Obx(() => _DropdownField<SemesterOption>(
      hint: 'Chọn học kỳ',
      items: controller.semesters,
      value: controller.semesters.firstWhereOrNull((s) => s.id == controller.formSemesterId.value),
      labelOf: (s) => '${s.code} - ${s.name}',
      onChanged: (s) => controller.onSemesterChanged(s?.id),
    ));
  }

  Widget _buildCourseDropdown(String type) {
    return Obx(() {
      if (controller.loadingCourses.value) {
        return const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)));
      }
      
      final useCurriculumCourses = ['RETAKE_COURSE', 'OVERLOAD_STUDY'].contains(type);
      final courses = useCurriculumCourses ? controller.allCurriculumCourses : controller.myCourses;
      final hint = useCurriculumCourses 
          ? 'Chọn môn học' 
          : (controller.formSemesterId.value == null ? 'Chọn học kỳ trước' : 'Chọn môn học');
      final enabled = useCurriculumCourses || controller.formSemesterId.value != null;

      return _DropdownField<CourseOption>(
        hint: hint,
        items: courses,
        value: courses.firstWhereOrNull((c) => c.id == controller.formCourseId.value),
        labelOf: (c) => '${c.code} - ${c.name}',
        onChanged: (c) => controller.formCourseId.value = c?.id,
        enabled: enabled,
      );
    });
  }

  Widget _buildClassSectionDropdown(String type) {
    return Obx(() {
      // GRADE_APPEAL uses allClassSections (no semester filter)
      // CHANGE_CLASS uses myClassSections (semester-filtered)
      final sections = type == 'GRADE_APPEAL'
          ? controller.allClassSections
          : controller.myClassSections;
      return _DropdownField<ClassSectionOption>(
        hint: 'Chọn lớp học phần',
        items: sections,
        value: sections.firstWhereOrNull((c) => c.className == controller.formClassSectionId.value),
        labelOf: (c) => c.courseName != null ? '${c.className} - ${c.courseName}' : c.className,
        onChanged: (c) => controller.onClassSectionChanged(c?.className),
      );
    });
  }

  Widget _buildTransferTargetDropdown() {
    return Obx(() {
      if (controller.loadingTargets.value) {
        return const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)));
      }
      
      final selectedTarget = controller.transferTargets.firstWhereOrNull((c) => c.classSection.className == controller.formToClassName.value);

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _DropdownField<ClassSectionTransferTarget>(
            hint: controller.formClassSectionId.value.isEmpty ? 'Chọn lớp hiện tại trước' : 'Chọn lớp muốn chuyển',
            items: controller.transferTargets,
            value: selectedTarget,
            labelOf: _buildTransferTargetLabel,
            onChanged: (c) => controller.formToClassName.value = c?.classSection.className ?? '',
            enabled: controller.formClassSectionId.value.isNotEmpty,
            // Only apply red text if it has a conflict
            itemTextStyle: (c) => c.hasConflict ? const TextStyle(color: Colors.red) : null,
          ),
          
          if (selectedTarget != null && selectedTarget.hasConflict) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                border: Border.all(color: Colors.orange.shade200),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, size: 18, color: Colors.orange.shade800),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Cảnh báo xung đột thời gian:',
                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange.shade900),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...selectedTarget.conflictDetails.map((detail) => Padding(
                    padding: const EdgeInsets.only(bottom: 4, left: 26),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('• ', style: TextStyle(color: Colors.orange.shade800)),
                        Expanded(child: Text(detail, style: TextStyle(color: Colors.orange.shade800, fontSize: 13))),
                      ],
                    ),
                  )),
                  const SizedBox(height: 8),
                  Text(
                    '* Bạn vẫn có thể gửi yêu cầu, nhưng khả năng được duyệt sẽ thấp hơn nếu có xung đột.',
                    style: TextStyle(fontStyle: FontStyle.italic, color: Colors.orange.shade700, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ],
      );
    });
  }

  Widget _buildGradeAppealInfo() {
    return Obx(() {
      if (controller.formClassSectionId.value.isEmpty) {
        return const SizedBox.shrink();
      }

      if (controller.loadingGradeAppealInfo.value) {
        return Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.grey[600]),
            ),
            const SizedBox(width: 8),
            Text('Đang kiểm tra trạng thái điểm...', style: TextStyle(fontSize: 13, color: Colors.grey[600])),
          ],
        );
      }

      final info = controller.gradeAppealInfo.value;
      if (info == null) {
        return const SizedBox.shrink();
      }

      final isPublished = info.gradesPublished;
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isPublished ? Colors.blue[50] : Colors.red[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isPublished ? Colors.blue[200]! : Colors.red[200]!),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              isPublished ? Icons.check_circle_outline_rounded : Icons.error_outline_rounded,
              size: 18,
              color: isPublished ? Colors.blue[800] : Colors.red[800],
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isPublished
                    ? 'Điểm đã được công bố. Bạn có thể gửi đơn phúc khảo cho lớp này.'
                    : 'Điểm thi chưa được công bố. Bạn chưa thể gửi đơn phúc khảo cho lớp này.',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isPublished ? Colors.blue[800] : Colors.red[800],
                ),
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildMajorDropdown() {
    return Obx(() => _DropdownField<MajorOption>(
      hint: 'Chọn ngành',
      items: controller.majors,
      value: controller.majors.firstWhereOrNull((m) => m.name == controller.formToMajor.value),
      labelOf: (m) => m.code.isNotEmpty ? '${m.code} - ${m.name}' : m.name,
      onChanged: controller.onMajorChanged,
    ));
  }

  Widget _buildSpecializationDropdown() {
    return Obx(() => _DropdownField<SpecializationOption>(
      hint: 'Chọn chuyên ngành',
      items: controller.specializations,
      value: controller.specializations.firstWhereOrNull((s) => s.name == controller.formToSpecialization.value),
      labelOf: (s) => s.code.isNotEmpty ? '${s.code} - ${s.name}' : s.name,
      onChanged: controller.onSpecializationChanged,
      enabled: controller.formToMajor.value.isNotEmpty,
    ));
  }

  Widget _buildSubSpecializationDropdown() {
    return Obx(() {
      final currentSubSpecialization = controller.studentProfile.value?.subSpecialization;
      final options = controller.subSpecializations
          .where((s) => s.name != currentSubSpecialization)
          .toList();

      return _DropdownField<SubSpecializationOption>(
        hint: options.isEmpty ? 'Không có chuyên ngành hẹp phù hợp' : 'Chọn chuyên ngành hẹp',
        items: options,
        value: options.firstWhereOrNull((s) => s.name == controller.formToSubSpecialization.value),
        labelOf: (s) => s.code.isNotEmpty ? '${s.code} - ${s.name}' : s.name,
        onChanged: (s) => controller.formToSubSpecialization.value = s?.name ?? '',
        enabled: options.isNotEmpty,
      );
    });
  }

  Widget _buildFileSection() {
    return Obx(() => controller.selectedFile.value == null
        ? GestureDetector(
            onTap: controller.pickFile,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
              ),
              child: Row(
                children: [
                  Icon(Icons.attach_file_rounded, color: Colors.grey[500]),
                  const SizedBox(width: 12),
                  Text('Chọn file đính kèm', style: TextStyle(color: Colors.grey[600])),
                ],
              ),
            ),
          )
        : Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primaryOrange.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.attach_file_rounded, color: AppColors.primaryOrange, size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(controller.selectedFileName.value,
                      style: const TextStyle(color: AppColors.primaryOrange, fontSize: 13),
                      overflow: TextOverflow.ellipsis),
                ),
                GestureDetector(
                  onTap: controller.removeFile,
                  child: const Icon(Icons.close_rounded, color: AppColors.primaryOrange, size: 18),
                ),
              ],
            ),
          ));
  }

  Widget _buildCurrentInfoCard({required List<_InfoItem> items, String? note}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.info_outline_rounded, size: 14, color: Colors.blue[700]),
              const SizedBox(width: 6),
              Text('Thông tin hiện tại', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blue[700])),
            ],
          ),
          const SizedBox(height: 8),
          ...items.map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                const SizedBox(height: 2),
                Text(item.value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
              ],
            ),
          )),
          if (note != null) ...[
            const SizedBox(height: 6),
            Text(note, style: TextStyle(fontSize: 11, color: Colors.blue[600], fontStyle: FontStyle.italic)),
          ],
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    return Obx(() => Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      color: Colors.transparent,
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: controller.isSubmitting.value ? null : controller.submitRequest,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryOrange,
            disabledBackgroundColor: Colors.grey[300],
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: controller.isSubmitting.value
              ? const SizedBox(
                  height: 20, width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Gửi yêu cầu',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        ),
      ),
    ));
  }
}

class _InfoItem {
  final String label;
  final String value;
  const _InfoItem(this.label, this.value);
}

// ─── Generic Dropdown Widget ──────────────────────────────────────────────────

class _DropdownField<T> extends StatelessWidget {
  final String hint;
  final List<T> items;
  final T? value;
  final String Function(T) labelOf;
  final void Function(T?) onChanged;
  final bool enabled;
  final TextStyle? Function(T)? itemTextStyle;

  const _DropdownField({
    required this.hint,
    required this.items,
    required this.value,
    required this.labelOf,
    required this.onChanged,
    this.enabled = true,
    this.itemTextStyle,
  });

  @override
  Widget build(BuildContext context) {
    Widget buildItemLabel(T item) {
      final customStyle = itemTextStyle?.call(item);
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Text(
          labelOf(item),
          style: customStyle ?? TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: enabled ? Theme.of(context).cardColor : (Theme.of(context).brightness == Brightness.dark ? Colors.grey[800] : Colors.grey[100]),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? Colors.grey[800]! : Colors.grey[300]!),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          hint: Text(hint, style: TextStyle(color: Colors.grey[500], fontSize: 14)),
          value: value,
          isExpanded: true,
          itemHeight: null, // Allow multiline items
          items: items.map((item) {
            return DropdownMenuItem<T>(
              value: item,
              child: buildItemLabel(item),
            );
          }).toList(),
          selectedItemBuilder: (_) => items.map(buildItemLabel).toList(),
          onChanged: enabled ? onChanged : null,
          dropdownColor: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

// ─── Text Input Field ─────────────────────────────────────────────────────────

class _TextInputField extends StatefulWidget {
  final String hint;
  final int maxLines;
  final String value;
  final void Function(String) onChanged;

  const _TextInputField({
    required this.hint,
    required this.value,
    required this.onChanged,
    this.maxLines = 1,
  });

  @override
  State<_TextInputField> createState() => _TextInputFieldState();
}

class _TextInputFieldState extends State<_TextInputField> {
  late TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.value);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _ctrl,
      maxLines: widget.maxLines,
      onChanged: widget.onChanged,
      decoration: InputDecoration(
        hintText: widget.hint,
        hintStyle: TextStyle(color: Colors.grey[500], fontSize: 14),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryOrange, width: 1.5),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF2D3436))),
    );
  }
}
