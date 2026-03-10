import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../auth/models/user_model.dart';
import '../../../core/constants/app_colors.dart'; // Assuming this exists or hardcode colors
import '../../../core/widgets/app_background.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final AuthController _authController = Get.find<AuthController>();
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _phoneController;
  DateTime? _selectedDob;
  String? _avatarPath;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final user = _authController.currentUser.value;
    _phoneController = TextEditingController(text: user?.phone ?? '');
    _selectedDob = user?.dob;
    _avatarPath = null; // Reset path on init

    // Listen for updates (e.g. if fetchCurrentUser completes after screen open)
    ever(_authController.currentUser, (User? user) {
      if (user != null) {
        // Only update if the user hasn't edited yet? 
        // Or just force update since it's "syncing"?
        // For now, let's update if text is empty or matches old value, 
        // but simpler is to just update to ensure "Show existing" works if it was missing.
        // But we must be careful not to overwrite user typing.
        // Best approach: If the controller text is empty, fill it.
        if (_phoneController.text.isEmpty && user.phone != null) {
            _phoneController.text = user.phone!;
        }
        if (_selectedDob == null && user.dob != null) {
            setState(() {
              _selectedDob = user.dob;
            });
        }
        // If we want to force "latest" from server even if different:
        // Use a flag or check if values differ from *initial* empty state.
      }
    });
  }

  Future<void> _pickImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image != null) {
      setState(() {
        _avatarPath = image.path;
      });
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDob ?? DateTime(2000),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFFFF6B00), // Orange
              onPrimary: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDob) {
      setState(() {
        _selectedDob = picked;
      });
    }
  }

  void _saveProfile() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      
      final success = await _authController.updateProfile(
        phone: _phoneController.text.trim(),
        dob: _selectedDob,
        avatarPath: _avatarPath,
      );
      
      setState(() => _isLoading = false);
      
      if (success) {
        Get.back(); // Go back to profile screen (Thông tin cá nhân)
        Get.snackbar(
          'Thành công',
          'Thông tin cá nhân đã được cập nhật',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.green,
          colorText: Colors.white,
          duration: const Duration(seconds: 2),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = _authController.currentUser.value;
    final isStudent = user?.isStudent ?? true; // Default to student restricted mode

    return GestureDetector(
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: Scaffold(
        resizeToAvoidBottomInset: true, // Ensure screen resizes when keyboard opens
        appBar: AppBar(
          title: const Text('Chỉnh sửa hồ sơ'),
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
        ),
        body: AppBackground(
          child: SingleChildScrollView(
          physics: const ClampingScrollPhysics(), // Better scrolling behavior
          padding: EdgeInsets.all(20.r),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Avatar Section
              Center(
                child: Stack(
                  children: [
                   Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFFFFB74D),
                          width: 3,
                        ),
                      ),
                      child: ClipOval(
                        child: SizedBox(
                          width: 100.r,
                          height: 100.r,
                          child: _avatarPath != null
                              ? Image.file(File(_avatarPath!), fit: BoxFit.cover)
                              : (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                                  ? Image.network(
                                      _authController.getOptimizedAvatarUrl(user.avatarUrl),
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Image.asset('assets/images/logo.png', fit: BoxFit.cover),
                                    )
                                  : Image.asset('assets/images/logo.png', fit: BoxFit.cover),
                        ),
                      ),
                    ),
                    if (!isStudent) // Only allow avatar edit for non-students
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: GestureDetector(
                          onTap: _pickImage,
                          child: Container(
                            padding: EdgeInsets.all(8.r),
                            decoration: const BoxDecoration(
                              color: Color(0xFFFF6B00),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(Icons.camera_alt, color: Colors.white, size: 20.r),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              30.verticalSpace,

              // Full Name (Read Only)
              _buildReadOnlyField('Họ và tên', user?.fullName ?? ''),
              15.verticalSpace,

              // Student Code (Read Only)
              _buildReadOnlyField(isStudent ? 'MSSV' : 'Mã số', user?.username.toUpperCase() ?? ''),
               15.verticalSpace,

              // Email (Read Only)
              _buildReadOnlyField('Email', user?.email ?? ''),
               15.verticalSpace,

              // Phone Field
              TextFormField(
                controller: _phoneController,
                decoration: _inputDecoration('Số điện thoại'),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Vui lòng nhập số điện thoại';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 15),

              // DOB Field
              InkWell(
                onTap: () => _selectDate(context),
                child: InputDecorator(
                  decoration: _inputDecoration('Ngày sinh'),
                  child: Text(
                    _selectedDob != null
                        ? DateFormat('dd/MM/yyyy').format(_selectedDob!)
                        : 'Chọn ngày sinh',
                    style: TextStyle(fontSize: 16.sp),
                  ),
                ),
              ),

              40.verticalSpace,

              // Save Button
              SizedBox(
                width: double.infinity,
                height: 50.h,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF6B00),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15.r),
                    ),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          'Lưu thay đổi',
                          style: TextStyle(
                            fontSize: 18.sp,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
        ),
      ),
    ),
    );
  }

  Widget _buildReadOnlyField(String label, String value) {
    return TextFormField(
      initialValue: value,
      readOnly: true,
      enabled: false,
      decoration: _inputDecoration(label).copyWith(
        fillColor: Colors.grey[200],
        filled: true,
      ),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.grey),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(15.r),
        borderSide: const BorderSide(color: Colors.grey),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(15.r),
        borderSide: const BorderSide(color: Color(0xFFFF6B00)),
      ),
      filled: true,
      fillColor: Colors.white,
      contentPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
    );
  }
}
