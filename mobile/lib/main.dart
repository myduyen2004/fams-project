import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

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
import 'features/academic_request/views/academic_request_list_screen.dart';
import 'features/academic_request/views/academic_request_create_screen.dart';
import 'features/academic_request/bindings/academic_request_bindings.dart';

import 'features/ai_chatbot/views/ai_chat_screen.dart';
import 'features/ai_chatbot/bindings/ai_chat_binding.dart';

import 'features/chat/controllers/chat_controller.dart';
import 'features/schedule/controllers/schedule_controller.dart';
import 'features/notification/services/fcm_service.dart';
import 'core/services/api_service.dart';
import 'core/services/websocket_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print("Handling a background message: ${message.messageId}");
}

bool isFirebaseInitialized = false;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    isFirebaseInitialized = true;
    print('Firebase initialized successfully');
  } catch (e) {
    print(
      'Firebase initialization failed (likely missing google-services.json): $e',
    );
    isFirebaseInitialized = false;
  }

  GoogleFonts.config.allowRuntimeFetching = true;
  runApp(const MyApp());
}

class InitialBinding extends Bindings {
  @override
  void dependencies() {
    // Core Services
    Get.put(ApiService()..init(), permanent: true);
    Get.put(WebSocketService(), permanent: true);

    Get.put(AuthController());
    // Khởi tạo các controller dùng chung ở cấp độ toàn cục để tránh lỗi "not found" khi lướt các tab
    Get.put(ChatController(), permanent: true);
    Get.put(ScheduleController(), permanent: true);

    // Initialize FcmService
    Get.put(FcmService(), permanent: true);
    if (isFirebaseInitialized) {
      FcmService.to.init();
    } else {
      print('Skipping FcmService initialization as Firebase is not ready');
    }
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(411, 891),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return GetMaterialApp(
          title: 'FAMS Mobile',
          debugShowCheckedModeBanner: false,
          // Localization for date picker
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: const [Locale('vi', 'VN'), Locale('en', 'US')],
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
            GetPage(name: AppRoutes.splash, page: () => const SplashScreen()),
            GetPage(name: AppRoutes.login, page: () => const LoginScreen()),
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
              name: AppRoutes.aiChat,
              page: () => const AiChatScreen(),
              binding: AiChatBinding(),
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
            // Student Academic Request Routes
            GetPage(
              name: AppRoutes.studentAcademicRequests,
              page: () => const AcademicRequestListScreen(),
              binding: AcademicRequestBinding(),
            ),
            GetPage(
              name: AppRoutes.studentAcademicRequestCreate,
              page: () => const AcademicRequestCreateScreen(),
              binding: AcademicRequestBinding(),
            ),
          ],
        );
      },
    );
  }
}
