import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/constants/app_colors.dart';
import 'core/constants/app_routes.dart';
import 'features/auth/controllers/auth_controller.dart';
import 'features/auth/views/splash_screen.dart';
import 'features/auth/views/login_screen.dart';
import 'features/auth/views/forgot_password_screen.dart';
import 'features/auth/views/otp_verification_screen.dart';
import 'features/auth/views/reset_password_screen.dart';
import 'features/auth/views/change_password_required_screen.dart';
import 'features/home/views/home_screen.dart';
import 'features/home/bindings/home_binding.dart';
import 'features/schedule_request/views/schedule_request_list_screen.dart';
import 'features/schedule_request/views/schedule_request_detail_screen.dart';
import 'features/schedule_request/views/create_request_screen.dart';
import 'features/schedule_request/bindings/schedule_request_bindings.dart';

void main() {
  runApp(const MyApp());
}

class InitialBinding extends Bindings {
  @override
  void dependencies() {
    Get.put(AuthController());
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: 'FAMS Mobile',
      debugShowCheckedModeBanner: false,
      // Localization for date picker
      localizationsDelegates: [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('vi', 'VN'),
        Locale('en', 'US'),
      ],
      locale: const Locale('vi', 'VN'),
      theme: ThemeData(
        primaryColor: AppColors.primaryOrange,
        scaffoldBackgroundColor: Colors.white,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primaryOrange,
          primary: AppColors.primaryOrange,
        ),
        textTheme: GoogleFonts.interTextTheme(),
        fontFamily: GoogleFonts.inter().fontFamily,
        useMaterial3: true,
      ),
      initialRoute: AppRoutes.splash,
      initialBinding: InitialBinding(),
      getPages: [
        GetPage(
          name: AppRoutes.splash,
          page: () => const SplashScreen(),
        ),
        GetPage(
          name: AppRoutes.login,
          page: () => const LoginScreen(),
        ),
        GetPage(
          name: AppRoutes.forgotPassword,
          page: () => const ForgotPasswordScreen(),
        ),
        GetPage(
          name: AppRoutes.otpVerification,
          page: () => const OtpVerificationScreen(),
        ),
        GetPage(
          name: AppRoutes.resetPassword,
          page: () => const ResetPasswordScreen(),
        ),
        GetPage(
          name: AppRoutes.changePasswordRequired,
          page: () => const ChangePasswordRequiredScreen(),
        ),
        GetPage(
          name: AppRoutes.home,
          page: () => const HomeScreen(),
          binding: HomeBinding(),
        ),
        // Lecturer Routes
        GetPage(
          name: AppRoutes.lecturerRequests,
          page: () => const ScheduleRequestListScreen(),
          binding: ScheduleRequestBinding(),
        ),
        // IMPORTANT: Create route must come BEFORE :id route
        GetPage(
          name: AppRoutes.lecturerCreateRequest,
          page: () => const CreateRequestScreen(),
          binding: CreateRequestBinding(),
        ),
        GetPage(
          name: AppRoutes.lecturerRequestDetail,
          page: () => const ScheduleRequestDetailScreen(),
          binding: ScheduleRequestBinding(),
        ),
      ],
    );
  }
}
