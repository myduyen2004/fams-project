

// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;
const envApiUrl = import.meta.env.VITE_API_URL;

// Cấu hình URL cho API
// - Khi chạy LOCAL (npm run dev): Sẽ dùng http://localhost:8080
// - Khi chạy PRODUCTION (Docker/Server): Dùng '' (đường dẫn tương đối) để đi qua Nginx Proxy
//   (Điều này giúp fix lỗi Timeout khi gọi trực tiếp domain api.fams-edu.online)
export const BASE_URL = envApiUrl !== undefined ? envApiUrl : (isProd ? '' : 'http://localhost:8080');

// API Endpoint (BASE_URL + /api)
export const API_URL = `${BASE_URL}/api`;

// WebSocket Endpoint (BASE_URL + /ws)
// SockJS will handle the protocol upgrade (http/https)
export const WS_URL = import.meta.env.VITE_WS_URL || `${BASE_URL}/ws`;
