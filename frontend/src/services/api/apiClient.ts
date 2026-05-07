import axios, { AxiosError } from 'axios';
import { API_URL } from './config';

/**
 * Common Axios Instance for all API requests
 * - Bypasses ngrok browser warning
 * - Automatically attaches JWT token
 * - Handles 401 Unauthorized globally
 */
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 60000,
});

// Request Interceptor: Attach Token
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

// Response Interceptor: Global Error Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    // If 401 Unauthorized, logout and redirect to login
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Avoid infinite loop if already on login/root
      if (currentPath !== '/login' && currentPath !== '/') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
