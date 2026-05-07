// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;
const VITE_API_URL = import.meta.env.VITE_API_URL;

/**
 * Ensures a URL uses HTTPS if the current page is loaded over HTTPS.
 * This prevents "Mixed Content" errors.
 */
const ensureSecureUrl = (url: string) => {
    if (!url) return url;
    let processed = url.trim().replace(/\/+$/, '');
    // Prevent duplicated /api in API_URL when env var already includes it.
    // Example: VITE_API_URL=https://example.com/api -> API_URL should still be
    // https://example.com/api (not /api/api).
    if (/\/api$/i.test(processed)) {
        processed = processed.replace(/\/api$/i, '');
    }
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && processed.startsWith('http:')) {
        return processed.replace(/^http:/, 'https:');
    }
    return processed;
};

const getBaseUrl = () => {
    // 1. Primary: Environment Variable (Ngrok or any external URL)
    if (VITE_API_URL && VITE_API_URL.trim().length > 0) {
        return ensureSecureUrl(VITE_API_URL);
    }

    // 2. If on Vercel but VITE_API_URL is missing, bail out gracefully
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.includes('vercel.app')) {
            console.warn('[Config] VITE_API_URL is missing on Vercel. Some features may not work.');
            return '';
        }
    }

    // 3. Fallback for Local Development
    return isProd ? '' : 'http://localhost:8080';
};

export const BASE_URL = getBaseUrl();

// API Endpoint
export const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';

/**
 * WebSocket endpoint — Switch to Native WebSocket (wss://) for Ngrok.
 * 
 * We use the '/ws-native' endpoint which we configured in Spring Boot.
 * Native WebSockets bypass Ngrok's HTML interstitial pages because they 
 * use the 'Upgrade' protocol which Ngrok forwards directly.
 */
export const WS_URL = (() => {
    if (!BASE_URL) {
        return `${typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') : ''}//${typeof window !== 'undefined' ? window.location.host : ''}/ws-native`;
    }
    // Replace http/https with ws/wss
    return `${BASE_URL.replace(/^http/, 'ws')}/ws-native`;
})();

console.debug('[ConfigDebug] BASE_URL:', BASE_URL);
console.debug('[ConfigDebug] API_URL:', API_URL);
console.debug('[ConfigDebug] WS_URL:', WS_URL);
