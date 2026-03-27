import axios, { AxiosError } from 'axios';
import { API_URL } from './config';

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
// Axios Instance
// ========================================
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 30000,
});

// Request Interceptor - Add token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Unauthorized - Clear token and redirect to login
      // BUT skip redirect if already on login page to avoid reload
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

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