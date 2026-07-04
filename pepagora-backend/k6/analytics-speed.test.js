import http from 'k6/http';
import { check, group } from 'k6';
import { Trend } from 'k6/metrics';
import { resolveToken } from './auth.js';
import {
  BASE_URL,
  CATEGORY_ID,
  SUBCATEGORY_ID,
  PRODUCT_CATEGORY_ID,
  BUDGET_MS,
  TARGET_MS,
  authHeaders,
  unwrap,
} from './config.js';

// ── Per-endpoint latency metrics (so we can see which pipeline is slow) ──────
const tHome = new Trend('ep_home', true);
const tTopCategories = new Trend('ep_top_categories', true);
const tTopProductCats = new Trend('ep_top_product_categories', true);
const tTop5SubByParent = new Trend('ep_top5_subcategory', true);
const tBreakdownCat = new Trend('ep_breakdown_category', true);
const tBreakdownSub = new Trend('ep_breakdown_subcategory', true);
const tBreakdownPc = new Trend('ep_breakdown_product_category', true);
const tListCounts = new Trend('ep_list_counts', true);
const tCategoryScreen = new Trend('ep_category_screen', true);

export const options = {
  scenarios: {
    // Warm, steady load that mimics a few managers browsing dashboards.
    steady: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '15s', target: 5 },
        { duration: '30s', target: 5 },
        { duration: '10s', target: 10 },
        { duration: '20s', target: 10 },
        { duration: '5s', target: 0 },
      ],
      gracefulStop: '10s',
    },
  },
  thresholds: {
    // Hard gate — AC-01 / AC-02: Top 5 widgets under 2000ms (p95).
    ep_top_categories: [`p(95)<${BUDGET_MS}`],
    ep_top_product_categories: [`p(95)<${BUDGET_MS}`],
    ep_top5_subcategory: [`p(95)<${BUDGET_MS}`],
    // Breakdown panels — same 2000ms budget.
    ep_breakdown_category: [`p(95)<${BUDGET_MS}`],
    ep_breakdown_subcategory: [`p(95)<${BUDGET_MS}`],
    ep_breakdown_product_category: [`p(95)<${BUDGET_MS}`],
    // Combined home payload (3 widgets) — allow a bit more headroom.
    ep_home: [`p(95)<${BUDGET_MS * 1.5}`],
    // Aspirational target for the lightest queries.
    ep_list_counts: [`p(95)<${TARGET_MS}`],
    // Global health.
    http_req_failed: ['rate<0.01'],
    http_req_duration: [`p(95)<${BUDGET_MS}`],
  },
};

export function setup() {
  const token = resolveToken();
  return { token };
}

function timed(trend, res) {
  trend.add(res.timings.duration);
}

function ok(name, res) {
  return check(res, {
    [`${name}: status 200`]: (r) => r.status === 200,
    [`${name}: success body`]: (r) => {
      try {
        const b = r.json();
        return b && (b.success === true || unwrap(b) !== undefined);
      } catch (e) {
        return false;
      }
    },
    [`${name}: under budget`]: (r) => r.timings.duration < BUDGET_MS,
  });
}

export default function (data) {
  const cfg = authHeaders(data.token);

  group('home dashboard', () => {
    let res = http.get(`${BASE_URL}/analytics/home`, { ...cfg, tags: { ep: 'home' } });
    timed(tHome, res);
    ok('home', res);

    res = http.get(`${BASE_URL}/analytics/top-categories`, { ...cfg, tags: { ep: 'top_categories' } });
    timed(tTopCategories, res);
    ok('top-categories', res);

    res = http.get(`${BASE_URL}/analytics/top-product-categories`, {
      ...cfg,
      tags: { ep: 'top_product_categories' },
    });
    timed(tTopProductCats, res);
    ok('top-product-categories', res);
  });

  group('top5 + list-counts', () => {
    let res = http.get(
      `${BASE_URL}/analytics/top5?level=subcategory&parentId=${CATEGORY_ID}`,
      { ...cfg, tags: { ep: 'top5_subcategory' } },
    );
    timed(tTop5SubByParent, res);
    ok('top5-subcategory', res);

    res = http.get(
      `${BASE_URL}/analytics/list-counts?level=subcategory&parentId=${CATEGORY_ID}`,
      { ...cfg, tags: { ep: 'list_counts' } },
    );
    timed(tListCounts, res);
    ok('list-counts', res);
  });

  group('breakdown panels', () => {
    let res = http.get(
      `${BASE_URL}/analytics/breakdown?nodeType=category&nodeId=${CATEGORY_ID}`,
      { ...cfg, tags: { ep: 'breakdown_category' } },
    );
    timed(tBreakdownCat, res);
    ok('breakdown-category', res);

    if (SUBCATEGORY_ID) {
      res = http.get(
        `${BASE_URL}/analytics/breakdown?nodeType=subcategory&nodeId=${SUBCATEGORY_ID}`,
        { ...cfg, tags: { ep: 'breakdown_subcategory' } },
      );
      timed(tBreakdownSub, res);
      ok('breakdown-subcategory', res);
    }

    if (PRODUCT_CATEGORY_ID) {
      res = http.get(
        `${BASE_URL}/analytics/breakdown?nodeType=product_category&nodeId=${PRODUCT_CATEGORY_ID}`,
        { ...cfg, tags: { ep: 'breakdown_product_category' } },
      );
      timed(tBreakdownPc, res);
      ok('breakdown-product-category', res);
    }
  });

  group('category screen payload', () => {
    const res = http.get(`${BASE_URL}/analytics/category/${CATEGORY_ID}`, {
      ...cfg,
      tags: { ep: 'category_screen' },
    });
    timed(tCategoryScreen, res);
    ok('category-screen', res);
  });
}
