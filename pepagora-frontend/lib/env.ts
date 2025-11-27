const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const readEnv = (key: string, fallback = '') => {
  const value = process.env[key];
    console.log(`env Reading ${key}:`, value ? `"${value}" (from env)` : `"${fallback}" (fallback)`);
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return fallback;
};

const rawBaseUrl = readEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:8000');
export const API_BASE_URL = normalizeBaseUrl(rawBaseUrl);

// Debug: Remove this after confirming env is loaded correctly
console.log('[env] API_BASE_URL:', API_BASE_URL);

export const buildApiUrl = (path: string = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const DEEPSEEK_API_KEY = readEnv('NEXT_PUBLIC_DEEPSEEK_API_KEY');
export const DEEPSEEK_API_URL = readEnv(
  'NEXT_PUBLIC_DEEPSEEK_URL',
  'https://api.deepseek.com/chat/completions'
);

