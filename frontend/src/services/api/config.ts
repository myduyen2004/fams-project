
// Definitive API Configuration
const isProd = import.meta.env.PROD;
const VITE_API_URL = import.meta.env.VITE_API_URL;
const VITE_WS_URL = import.meta.env.VITE_WS_URL;

/**
 * Ensures a URL is secure (https/wss) if the page is HTTPS.
 */
const ensureSecureUrl = (url: string) => {
    if (!url) return url;
    let processed = url.trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && processed.startsWith('http:')) {
        return processed.replace(/^http:/, 'https:');
    }
    return processed;
};

const getBaseUrl = () => {
    // 1. Force the Environment Variable if present (Ngrok)
    if (VITE_API_URL && VITE_API_URL.trim().length > 0) {
        return ensureSecureUrl(VITE_API_URL);
    }

    // 2. Production fallback based on hostname (Only if VITE_API_URL is missing)
    if (isProd) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        console.warn('[Config] VITE_API_URL is MISSING. Determining fallback from hostname:', hostname);
        
        // If we are on Vercel, we SHOULD have VITE_API_URL. 
        // If not, we fallback to the same domain (which might not work for cross-domain API, but is safer than random IP)
        if (hostname.includes('vercel.app')) {
            return ''; // Let it fail or use relative path if possible, but don't hit 16.176.158.195
        }
        return 'http://16.176.158.195:8080';
    }

    return 'http://localhost:8080';
};

export const BASE_URL = getBaseUrl();
export const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';
export const WS_URL = ensureSecureUrl(VITE_WS_URL) || (BASE_URL ? `${BASE_URL}/ws` : '/ws');

console.debug('[ConfigDebug] BASE_URL:', BASE_URL);
console.debug('[ConfigDebug] WS_URL:', WS_URL);
