import http from 'k6/http';
import { fail } from 'k6';
import { BASE_URL, TOKEN, EMAIL, PASSWORD } from './config.js';

// Resolves a bearer token once, in setup(). Either:
//   - reuse a token passed via -e TOKEN=...
//   - or log in with -e EMAIL=... -e PASSWORD=...
export function resolveToken() {
  if (TOKEN) return TOKEN;

  if (!EMAIL || !PASSWORD) {
    fail(
      'No auth provided. Pass -e TOKEN=<jwt> OR -e EMAIL=<email> -e PASSWORD=<password>.',
    );
  }

  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (res.status !== 200 && res.status !== 201) {
    fail(`Login failed: status ${res.status} body ${res.body}`);
  }

  let body;
  try {
    body = res.json();
  } catch (e) {
    fail(`Login response was not JSON: ${res.body}`);
  }

  // Envelope: { success, timestamp, data: { accessToken, user } }
  const token = body && body.data && body.data.accessToken;
  if (!token) fail(`Login response missing accessToken: ${res.body}`);
  return token;
}
