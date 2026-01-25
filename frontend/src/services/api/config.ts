

// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;
const envApiUrl = import.meta.env.VITE_API_URL;

const getBaseUrl = () => {
    if (envApiUrl) return envApiUrl;
    if (isProd) {
        // Automatically switch port based on hostname for Staging vs Production
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        if (hostname.includes('staging') || hostname.includes('vercel.app')) {
            return 'http://16.176.158.195:8081';
        }
        return 'http://16.176.158.195:8080';
    }
    return 'http://localhost:8080';
};

export const BASE_URL = getBaseUrl();

// API Endpoint (BASE_URL + /api)
export const API_URL = `${BASE_URL}/api`;

// WebSocket Endpoint (BASE_URL + /ws)
// SockJS will handle the protocol upgrade (http/https)
export const WS_URL = import.meta.env.VITE_WS_URL || `${BASE_URL}/ws`;
