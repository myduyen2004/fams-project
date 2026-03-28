import apiClient from './apiClient';

// ========================================
// Types
// ========================================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
  isPasswordChanged?: boolean;
  gpa?: number;
}

export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
  errors?: Record<string, string>;
}

// ========================================
// Auth Service
// ========================================

// ========================================
// Auth Service
// ========================================
export const authService = {
  /**
   * Login
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  /**
   * Change Password
   */
  changePassword: async (newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { newPassword });
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<UserInfo> => {
    const response = await apiClient.get<UserInfo>('/auth/me');
    return response.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  /**
   * Get stored user info
   */
  getUser: (): UserInfo | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as UserInfo;
    } catch {
      return null;
    }
  },

  /**
   * Get token
   */
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  /**
   * Forgot Password - Step 1: Request OTP
   */
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Verify OTP - Step 2: Check OTP
   */
  verifyOtp: async (email: string, otp: string): Promise<void> => {
    await apiClient.post('/auth/verify-otp', { email, otp });
  },

  /**
   * Reset Password - Step 3: Set new password
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    await apiClient.post('/auth/reset-password', data);
  },
};

export default apiClient;
