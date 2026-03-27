// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;
const VITE_API_URL = import.meta.env.VITE_API_URL;

/**
 * Ensures a URL uses HTTPS if the current page is loaded over HTTPS.
 * This prevents "Mixed Content" and "SecurityError" (especially for SockJS).
 */
const ensureSecureUrl = (url: string) => {
    if (!url) return url;
    const processed = url.trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && processed.startsWith('http:')) {
        return processed.replace(/^http:/, 'https:');
    }
    return processed;
};

const getBaseUrl = () => {
    // 1. Primary: Environment Variable (Ngrok)
    if (VITE_API_URL && VITE_API_URL.trim().length > 0) {
        return ensureSecureUrl(VITE_API_URL);
    }

    // 2. Secondary: If on Vercel but VITE_API_URL is missing, use relative or origin
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.includes('vercel.app')) {
            console.warn('[Config] VITE_API_URL is missing on Vercel. Some features may not work.');
            return ''; // Bails out to relative path to avoid hitting old IPs
        }
    }

    // 3. Fallback for Local Development
    return isProd ? '' : 'http://localhost:8080';
};

export const BASE_URL = getBaseUrl();

// API Endpoint (BASE_URL + /api)
export const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';

// WebSocket Endpoint (BASE_URL + /ws-native)
// Deriving directly from BASE_URL prevents stale IP issues if VITE_WS_URL is forgotten in Vercel settings
export const WS_URL = BASE_URL ? `${BASE_URL.replace(/^http/, 'ws')}/ws-native` : `${typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') : ''}//${typeof window !== 'undefined' ? window.location.host : ''}/ws-native`;

console.debug('[ConfigDebug] BASE_URL:', BASE_URL);
console.debug('[ConfigDebug] API_URL:', API_URL);
console.debug('[ConfigDebug] WS_URL:', WS_URL);
