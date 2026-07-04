import http from 'k6/http';
import { check } from 'k6';
import { resolveToken } from './auth.js';
import {
  BASE_URL,
  CATEGORY_ID,
  SUBCATEGORY_ID,
  PRODUCT_CATEGORY_ID,
  BUDGET_MS,
  authHeaders,
  unwrap,
} from './config.js';

// Single-pass cold/warm latency check. No load — just confirms each endpoint
// responds correctly and prints its duration. Good for AC-01..AC-04 spot checks.
export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: [`p(95)<${BUDGET_MS}`],
  },
};

export function setup() {
  return { token: resolveToken() };
}

function hit(name, url, cfg) {
  const res = http.get(url, cfg);
  const passed = check(res, {
    [`${name}: status 200`]: (r) => r.status === 200,
    [`${name}: body ok`]: (r) => {
      try {
        return unwrap(r.json()) !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  const flag = res.timings.duration < BUDGET_MS ? 'OK ' : 'SLOW';
  console.log(
    `[${flag}] ${name.padEnd(28)} ${res.timings.duration.toFixed(0).padStart(6)}ms  (status ${res.status})`,
  );
  return passed;
}

export default function (data) {
  const cfg = authHeaders(data.token);

  hit('home', `${BASE_URL}/analytics/home`, cfg);
  hit('top-categories', `${BASE_URL}/analytics/top-categories`, cfg);
  hit('top-product-categories', `${BASE_URL}/analytics/top-product-categories`, cfg);
  hit(
    'top5-subcategory',
    `${BASE_URL}/analytics/top5?level=subcategory&parentId=${CATEGORY_ID}`,
    cfg,
  );
  hit(
    'list-counts-subcategory',
    `${BASE_URL}/analytics/list-counts?level=subcategory&parentId=${CATEGORY_ID}`,
    cfg,
  );
  hit(
    'breakdown-category',
    `${BASE_URL}/analytics/breakdown?nodeType=category&nodeId=${CATEGORY_ID}`,
    cfg,
  );
  if (SUBCATEGORY_ID) {
    hit(
      'breakdown-subcategory',
      `${BASE_URL}/analytics/breakdown?nodeType=subcategory&nodeId=${SUBCATEGORY_ID}`,
      cfg,
    );
  }
  if (PRODUCT_CATEGORY_ID) {
    hit(
      'breakdown-product-category',
      `${BASE_URL}/analytics/breakdown?nodeType=product_category&nodeId=${PRODUCT_CATEGORY_ID}`,
      cfg,
    );
  }
  hit('category-screen', `${BASE_URL}/analytics/category/${CATEGORY_ID}`, cfg);
}
