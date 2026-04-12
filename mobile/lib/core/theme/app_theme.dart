import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: AppColors.primaryOrange,
      scaffoldBackgroundColor: const Color(0xFFF9FAFB),
      cardColor: Colors.white,
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFFF9FAFB),
        elevation: 0,
        iconTheme: IconThemeData(color: Color(0xFF1E2A3A)),
        titleTextStyle: TextStyle(
            color: Color(0xFF1E2A3A),
            fontSize: 22,
            fontWeight: FontWeight.w800),
      ),
      colorScheme: ColorScheme.fromSeed(
        brightness: Brightness.light,
        seedColor: AppColors.primaryOrange,
        primary: AppColors.primaryOrange,
        surface: const Color(0xFFF9FAFB),
        onSurface: const Color(0xFF1E2A3A),
        surfaceContainerLow: Colors.white, // Elevated card color
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(ThemeData.light().textTheme).apply(
        bodyColor: const Color(0xFF1E2A3A),
        displayColor: const Color(0xFF1E2A3A),
      ),
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      useMaterial3: true,
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: AppColors.primaryOrange,
      scaffoldBackgroundColor: const Color(0xFF121212), // Deep dark background
      cardColor: const Color(0xFF1E1E1E), // Standard elevated dark card
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF121212),
        elevation: 0,
        iconTheme: IconThemeData(color: Color(0xFFF9FAFB)),
        titleTextStyle: TextStyle(
            color: Color(0xFFF9FAFB),
            fontSize: 22,
            fontWeight: FontWeight.w800),
      ),
      colorScheme: ColorScheme.fromSeed(
        brightness: Brightness.dark,
        seedColor: AppColors.primaryOrange,
        primary: AppColors.primaryOrange,
        surface: const Color(0xFF121212),
        onSurface: const Color(0xFFF9FAFB),
        surfaceContainerLow: const Color(0xFF1E1E1E), // Elevated card color
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(ThemeData.dark().textTheme).apply(
        bodyColor: const Color(0xFFF9FAFB),
        displayColor: const Color(0xFFF9FAFB),
      ),
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      useMaterial3: true,
    );
  }
}
