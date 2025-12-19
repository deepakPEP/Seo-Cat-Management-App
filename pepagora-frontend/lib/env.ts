const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

// Read NEXT_PUBLIC_API_BASE_URL from environment variables
// Note: NEXT_PUBLIC_ prefix is required for Next.js to expose the variable to client-side code
const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!envApiBaseUrl || typeof envApiBaseUrl !== 'string' || envApiBaseUrl.trim() === '') {
  console.error(
    '❌ ERROR: NEXT_PUBLIC_API_BASE_URL is not set in your environment variables!\n' +
    'Please create a .env.local file in pepagora-frontend/ with:\n' +
    'NEXT_PUBLIC_API_BASE_URL=http://localhost:9000\n' +
    '\n' +
    'Current value:', envApiBaseUrl
  );
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL environment variable is required. ' +
    'Please set it in your .env.local file.'
  );
}

const rawBaseUrl = envApiBaseUrl.trim();
export const API_BASE_URL = normalizeBaseUrl(rawBaseUrl);

// Debug: Log the environment variable being used
console.log('[env] ✅ NEXT_PUBLIC_API_BASE_URL from process.env:', envApiBaseUrl);
console.log('[env] ✅ Final API_BASE_URL:', API_BASE_URL);

export const buildApiUrl = (path: string = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// DEEPSEEK_API_KEY and DEEPSEEK_API_URL are now configured on the backend
// The frontend calls the backend endpoint at /ai/deepseek instead

