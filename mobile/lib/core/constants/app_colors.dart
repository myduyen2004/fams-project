import 'package:flutter/material.dart';

/// App Colors - FAMS Brand Colors
class AppColors {
  AppColors._();

  // Brand Colors from User Provided Palette
  static const Color orange50 = Color(0xFFFEF6EE);
  static const Color orange100 = Color(0xFFFEECD6);
  static const Color orange200 = Color(0xFFFBD4AD);
  static const Color orange300 = Color(0xFFF8B679);
  static const Color orange400 = Color(0xFFF48D43);
  static const Color orange500 = Color(0xFFF2782F);
  static const Color orange600 = Color(0xFFE25314);

  static const Color primaryOrange = orange400;
  static const Color orangeGradientStart = orange400;
  static const Color orangeGradientEnd = orange200;
  static const Color orangeLight = orange50;
  static const Color glassWhite = Color(0x66FFFFFF); 

  // Background Colors
  static const Color backgroundColor = Color(0xFFF5F5F5);
  static const Color cardBackground = Color(0xFFFFFFFF);
  static const Color orangeBackground = Color(0xFFFFE5D9);

  // Text Colors
  static const Color textPrimary = Color(0xFF1A1A1A);
  static const Color textSecondary = Color(0xFF757575);
  static const Color textHint = Color(0xFFBDBDBD);
  static const Color textWhite = Color(0xFFFFFFFF);

  // Status Colors
  static const Color success = Color(0xFF4CAF50);
  static const Color error = Color(0xFFF44336);
  static const Color warning = Color(0xFFFFC107);
  static const Color info = Color(0xFF2196F3);

  // Border Colors
  static const Color borderColor = Color(0xFFE0E0E0);
  static const Color borderOrange = Color(0xFFFF8C42);
}
