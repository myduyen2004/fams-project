import 'package:flutter/material.dart';

/// Modern, Premium Color System
class AppColors {
  AppColors._();

  // Primary - Indigo to Purple Gradient
  static const Color primaryStart = Color(0xFF6366F1); // Indigo
  static const Color primaryEnd = Color(0xFF8B5CF6);   // Purple
  static const Color primaryDark = Color(0xFF4F46E5);
  static const Color primaryLight = Color(0xFFEEF2FF);

  // Accent - Coral to Peach Gradient
  static const Color accentStart = Color(0xFFFF6B6B);  // Coral
  static const Color accentEnd = Color(0xFFFFAA64);    // Peach
  static const Color accentLight = Color(0xFFFFF4ED);

  // Neutrals - Modern Grey Scale
  static const Color background = Color(0xFFF8FAFC);   // Very light blue-grey
  static const Color surface = Color(0xFFFFFFFF);      // White
  static const Color surfaceVariant = Color(0xFFF1F5F9);
  
  static const Color textPrimary = Color(0xFF1E293B);   // Slate 800
  static const Color textSecondary = Color(0xFF64748B); // Slate 500
  static const Color textTertiary = Color(0xFF94A3B8);  // Slate 400
  
  static const Color border = Color(0xFFE2E8F0);        // Slate 200
  static const Color divider = Color(0xFFF1F5F9);       // Slate 100

  // Status Colors
  static const Color success = Color(0xFF10B981);  // Green
  static const Color warning = Color(0xFFF59E0B);  // Amber
  static const Color error = Color(0xFFEF4444);    // Red
  static const Color info = Color(0xFF3B82F6);     // Blue

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryStart, primaryEnd],
  );

  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accentStart, accentEnd],
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFF8FAFC), Color(0xFFFFFFFF)],
  );

  // Shadows
  static List<BoxShadow> cardShadow = [
    BoxShadow(
      color: primaryStart.withOpacity(0.08),
      blurRadius: 16,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> elevatedShadow = [
    BoxShadow(
      color: primaryStart.withOpacity(0.12),
      blurRadius: 24,
      offset: const Offset(0, 8),
    ),
  ];
}
