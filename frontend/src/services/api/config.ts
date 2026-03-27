
// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;
const envApiUrl = import.meta.env.VITE_API_URL;
const envWsUrl = import.meta.env.VITE_WS_URL;

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
    return ensureSecureUrl(url);
};

export const BASE_URL = getBaseUrl();

// API Endpoint (BASE_URL + /api)
export const API_URL = `${BASE_URL}/api`;

// WebSocket Endpoint (BASE_URL + /ws)
// Force HTTPS for WS_URL regardless of whether it comes from env or BASE_URL
export const WS_URL = ensureSecureUrl(envWsUrl) || `${BASE_URL}/ws`;
