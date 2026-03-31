/**
 * Short-lived insert test (~7 min total)
 * Inserts k6-prefixed companies and products, then cleans up in teardown.
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkUsageReport, randomK6Name, jsonHeaders, pickRandom } from './utils.js';
import { checkCreated, checkResponse } from './checks.js';

checkUsageReport();

export const options = {
  stages: [
    { duration: '1m',  target: 5 },
    { duration: '5m',  target: 5 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed:   ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export function setup() {
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) throw new Error('Backend is not healthy — aborting');

  const companiesRes = http.get(`${BASE_URL}/api/companies`);
  const existingCompanyIds = JSON.parse(companiesRes.body).map(c => c.companyid);
  return { existingCompanyIds };
}

export default function (data) {
  // Insert a new company
  const companyRes = http.post(
    `${BASE_URL}/api/companies`,
    JSON.stringify({ name: randomK6Name('company') }),
    { headers: jsonHeaders() }
  );
  checkCreated(companyRes, 'insert company');

  sleep(1);

  // Insert a product — use the new company if created, otherwise fall back to an existing one
  let companyId;
  try {
    companyId = companyRes.status === 201
      ? JSON.parse(companyRes.body).companyid
      : pickRandom(data.existingCompanyIds);
  } catch {
    companyId = pickRandom(data.existingCompanyIds);
  }

  const productRes = http.post(
    `${BASE_URL}/api/products`,
    JSON.stringify({ name: randomK6Name('product'), company_id: companyId }),
    { headers: jsonHeaders() }
  );
  checkCreated(productRes, 'insert product');

  sleep(1);
}

export function teardown() {
  // Products first (FK), then companies
  const pRes = http.del(`${BASE_URL}/api/products/cleanup`, null, { headers: jsonHeaders() });
  checkResponse(pRes, 'cleanup products');

  const cRes = http.del(`${BASE_URL}/api/companies/cleanup`, null, { headers: jsonHeaders() });
  checkResponse(cRes, 'cleanup companies');

  console.log(`Teardown complete — products deleted: ${JSON.parse(pRes.body).deleted}, companies deleted: ${JSON.parse(cRes.body).deleted}`);
}
