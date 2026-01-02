
// Logic to determine API URL based on environment
const isProd = import.meta.env.PROD;

// Base URL for API (no trailing slash)
// Default to production URL if in production mode, otherwise localhost
export const BASE_URL = import.meta.env.VITE_API_URL || (isProd ? 'https://api.fams-edu.online' : 'http://localhost:8080');

// API Endpoint (BASE_URL + /api)
export const API_URL = `${BASE_URL}/api`;

// WebSocket Endpoint (BASE_URL + /ws)
// SockJS will handle the protocol upgrade (http/https)
export const WS_URL = import.meta.env.VITE_WS_URL || `${BASE_URL}/ws`;
