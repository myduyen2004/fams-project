

// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;
const envApiUrl = import.meta.env.VITE_API_URL;

// Cấu hình URL cho API
// - Khi chạy LOCAL (npm run dev): Sẽ dùng http://localhost:8080
// - Khi chạy PRODUCTION (Vercel): Dùng '' (đường dẫn tương đối) để đi qua Vercel Proxy
//   Vercel sẽ proxy /api/* tới EC2 backend (xem vercel.json)
export const BASE_URL = isProd ? '' : (envApiUrl || 'http://localhost:8080');

// API Endpoint (BASE_URL + /api)
export const API_URL = `${BASE_URL}/api`;

// WebSocket Endpoint (BASE_URL + /ws)
// SockJS will handle the protocol upgrade (http/https)
export const WS_URL = import.meta.env.VITE_WS_URL || `${BASE_URL}/ws`;
