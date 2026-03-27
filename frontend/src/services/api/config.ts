
// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;
const envApiUrl = import.meta.env.VITE_API_URL;

const getBaseUrl = () => {
    let url = '';
    if (envApiUrl) {
        url = envApiUrl;
    } else if (isProd) {
        // Automatically switch port based on hostname for Staging vs Production
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        if (hostname.includes('staging') || hostname.includes('vercel.app')) {
            url = 'http://16.176.158.195:8081';
        } else {
            url = 'http://16.176.158.195:8080';
        }
    } else {
        url = 'http://localhost:8080';
    }
    
    // Remove trailing slash if exists
    let processedUrl = url.replace(/\/$/, '');

    // Tự động nâng cấp giao thức: Nếu trang web chạy trên HTTPS (như Vercel), 
    // hệ thống sẽ tự động chuyển URL Ngrok sang https:// (để tránh lỗi Mixed Content)
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && processedUrl.startsWith('http:')) {
        processedUrl = processedUrl.replace(/^http:/, 'https:');
    }

    return processedUrl;
};

export const BASE_URL = getBaseUrl();

// API Endpoint (BASE_URL + /api)
export const API_URL = `${BASE_URL}/api`;

// WebSocket Endpoint (BASE_URL + /ws)
// SockJS will handle the protocol upgrade (http/https internally) based on BASE_URL
export const WS_URL = import.meta.env.VITE_WS_URL || `${BASE_URL}/ws`;
