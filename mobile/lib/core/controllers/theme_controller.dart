import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeController extends GetxController {
  static ThemeController get to => Get.find();
  
  final _key = 'isDarkMode';
  SharedPreferences? _prefs;
  
  // Observable theme mode
  final Rx<ThemeMode> themeMode = ThemeMode.system.obs;

  @override
  void onInit() {
    super.onInit();
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    _prefs = await SharedPreferences.getInstance();
    final bool? isDark = _prefs?.getBool(_key);
    
    // If null, it means system mode
    if (isDark == null) {
      themeMode.value = ThemeMode.system;
      Get.changeThemeMode(ThemeMode.system);
    } else {
      themeMode.value = isDark ? ThemeMode.dark : ThemeMode.light;
      Get.changeThemeMode(themeMode.value);
    }
  }

  Future<void> saveTheme(bool isDark) async {
    themeMode.value = isDark ? ThemeMode.dark : ThemeMode.light;
    Get.changeThemeMode(themeMode.value);
    
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs?.setBool(_key, isDark);
  }

  Future<void> setSystemTheme() async {
    themeMode.value = ThemeMode.system;
    Get.changeThemeMode(ThemeMode.system);
    
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs?.remove(_key); // Remove to fallback to system
  }
  
  // Helper to check if currently dark mode (resolves system mode to actual brightness)
  bool get isDarkMode {
      if (themeMode.value == ThemeMode.system) {
          // Fallback to media query if possible, though Get.isPlatformDarkMode usually works within context
          return Get.isDarkMode;
      }
      return themeMode.value == ThemeMode.dark;
  }
}
