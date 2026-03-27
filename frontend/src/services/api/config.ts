// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;
const VITE_API_URL = import.meta.env.VITE_API_URL;

/**
 * Ensures a URL uses HTTPS if the current page is loaded over HTTPS.
 * This prevents "Mixed Content" errors.
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
 * WebSocket endpoint — uses SockJS over HTTPS (NOT wss://).
 *
 * SockJS handles the upgrade internally.
 * We append ?ngrok-skip-browser-warning=true so Ngrok's free-tier interstitial page
 * is bypassed — this was the true root cause of all CORS failures on /ws/info requests.
 */
export const WS_URL = (() => {
    const base = BASE_URL
        ? `${BASE_URL}/ws`
        : `${typeof window !== 'undefined' ? window.location.origin : ''}/ws`;
    // Only add the bypass param when going through an ngrok tunnel
    const isNgrok = base.includes('ngrok');
    return isNgrok ? `${base}?ngrok-skip-browser-warning=true` : base;
})();

console.debug('[ConfigDebug] BASE_URL:', BASE_URL);
console.debug('[ConfigDebug] API_URL:', API_URL);
console.debug('[ConfigDebug] WS_URL:', WS_URL);
