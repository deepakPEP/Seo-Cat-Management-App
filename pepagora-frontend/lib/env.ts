const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

// Read NEXT_PUBLIC_API_BASE_URL from environment variables
// Note: NEXT_PUBLIC_ prefix is required for Next.js to expose the variable to client-side code
const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

// Auto-detect environment: use localhost for development, production URL for production
// Priority: 1. Explicit env var, 2. NODE_ENV check, 3. Hostname check
let rawBaseUrl: string;

// Check NODE_ENV first (most reliable for Next.js)
const isNextDev = process.env.NODE_ENV === 'development';

// Check hostname as fallback (for production builds accessed locally)
const isLocalHostname = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1');

// Priority: Development mode > Explicit env var > Production
if (isNextDev || isLocalHostname) {
  // Force localhost in development mode (even if env var is set)
  rawBaseUrl = 'http://localhost:8000';
} else if (envApiBaseUrl && typeof envApiBaseUrl === 'string' && envApiBaseUrl.trim() !== '') {
  // Use explicitly set environment variable in production
  rawBaseUrl = envApiBaseUrl.trim();
} else {
  // Production deployment - use production URL
  rawBaseUrl = 'http://13.234.126.192:8000';
}

export const API_BASE_URL = normalizeBaseUrl(rawBaseUrl);

export const buildApiUrl = (path: string = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// DEEPSEEK_API_KEY and DEEPSEEK_API_URL are now configured on the backend
// The frontend calls the backend endpoint at /ai/deepseek instead

