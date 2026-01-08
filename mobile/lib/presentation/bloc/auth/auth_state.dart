import 'package:equatable/equatable.dart';
import '../../../data/models/user_model.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState extends Equatable {
  final AuthStatus status;
  final UserModel? user;
  final String? errorMessage;
  final bool otpSent;
  final bool otpVerified;
  final bool passwordReset;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
    this.otpSent = false,
    this.otpVerified = false,
    this.passwordReset = false,
  });

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? errorMessage,
    bool? otpSent,
    bool? otpVerified,
    bool? passwordReset,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
      otpSent: otpSent ?? this.otpSent,
      otpVerified: otpVerified ?? this.otpVerified,
      passwordReset: passwordReset ?? this.passwordReset,
    );
  }

  @override
  List<Object?> get props => [status, user, errorMessage, otpSent, otpVerified, passwordReset];
}
