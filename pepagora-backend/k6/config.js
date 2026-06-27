// Shared config + helpers for the analytics k6 tests.
//
// Everything is overridable via environment variables (k6 -e KEY=value).

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

// Auth: either pass a ready token (-e TOKEN=...) or credentials to log in.
export const TOKEN = __ENV.TOKEN || '';
export const EMAIL = __ENV.EMAIL || '';
export const PASSWORD = __ENV.PASSWORD || '';

// Sample node ids to exercise the per-node pipelines.
// Defaults use the category id from the marketing view-details page; override per environment.
export const CATEGORY_ID = __ENV.CATEGORY_ID || '68a586bf0a6ee7d879676ddb';
export const SUBCATEGORY_ID = __ENV.SUBCATEGORY_ID || '';
export const PRODUCT_CATEGORY_ID = __ENV.PRODUCT_CATEGORY_ID || '';

// Acceptance-criteria latency budgets (ms).
// AC-01 / AC-02: Top 5 widgets must paint under 2000ms.
export const BUDGET_MS = Number(__ENV.BUDGET_MS || 2000);
// Plan §4/§9 aspirational target: each pipeline under ~500ms once indexed.
export const TARGET_MS = Number(__ENV.TARGET_MS || 800);

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

// Unwrap NestJS ResponseInterceptor envelope: { success, timestamp, data }.
export function unwrap(body) {
  if (!body) return undefined;
  return body.data !== undefined ? body.data : body;
}
