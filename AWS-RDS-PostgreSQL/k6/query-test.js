/**
 * Long-running query test (~27 min total)
 * Two named scenarios run concurrently:
 *   - list_companies: steady read load on GET /api/companies
 *   - join_products:  heavier load on the JOIN query GET /api/products/with-company
 * No writes — no teardown needed.
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkUsageReport } from './utils.js';
import { checkList, checkJoinResult } from './checks.js';

checkUsageReport();

export const options = {
  scenarios: {
    list_companies: {
      executor: 'ramping-vus',
      exec: 'listCompanies',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 3 },
        { duration: '25m', target: 3 },
        { duration: '30s', target: 0 },
      ],
    },
    join_products: {
      executor: 'ramping-vus',
      exec: 'joinProducts',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 5 },
        { duration: '25m', target: 5 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:list_companies}': ['p(95)<300'],
    'http_req_duration{scenario:join_products}':  ['p(95)<600'],
  },
};

export function setup() {
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) throw new Error('Backend is not healthy — aborting');
}

export function listCompanies() {
  const res = http.get(`${BASE_URL}/api/companies`);
  checkList(res, 'list companies');
  sleep(2);
}

export function joinProducts() {
  const res = http.get(`${BASE_URL}/api/products/with-company`);
  checkJoinResult(res, 'products with company join');
  sleep(2);
}
