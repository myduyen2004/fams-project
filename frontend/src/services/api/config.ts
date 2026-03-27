
// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;
const envApiUrl = import.meta.env.VITE_API_URL;
const envWsUrl = import.meta.env.VITE_WS_URL;

// Debug logs to identify environment variable issues on Vercel
if (isProd) {
    console.debug('[EnvDebug] PROD=true');
    console.debug('[EnvDebug] VITE_API_URL:', envApiUrl ? 'FOUND' : 'MISSING');
    if (envApiUrl) console.debug('[EnvDebug] Value:', envApiUrl);
}

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
    // Priority 1: Environment Variable
    if (envApiUrl && envApiUrl.trim().length > 0) {
        url = envApiUrl;
    } 
    // Priority 2: Hardcoded Production Fallback (Staging/Production IP)
    else if (isProd) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        if (hostname.includes('staging') || hostname.includes('vercel.app')) {
            url = 'http://16.176.158.195:8081';
        } else {
            url = 'http://16.176.158.195:8080';
        }
    } 
    // Priority 3: Local Development
    else {
        url = 'http://localhost:8080';
    }
    return ensureSecureUrl(url);
};

export const BASE_URL = getBaseUrl();

// API Endpoint (BASE_URL + /api)
export const API_URL = `${BASE_URL}/api`;

// WebSocket Endpoint (BASE_URL + /ws)
export const WS_URL = ensureSecureUrl(envWsUrl) || `${BASE_URL}/ws`;
