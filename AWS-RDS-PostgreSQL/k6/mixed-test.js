/**
 * Mixed test (~14 min total) — concurrent insert and query scenarios.
 * Simulates realistic load: readers outnumber writers.
 * Inserts use k6-prefixed names; teardown cleans them up.
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkUsageReport, randomK6Name, jsonHeaders, pickRandom, shuffleArray } from './utils.js';
import { checkCreated, checkList, checkJoinResult, checkResponse } from './checks.js';

checkUsageReport();

export const options = {
  scenarios: {
    writers: {
      executor: 'ramping-vus',
      exec: 'writeData',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 3 },
        { duration: '10m', target: 3 },
        { duration: '1m',  target: 0 },
      ],
    },
    readers: {
      executor: 'ramping-vus',
      exec: 'readData',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 8 },
        { duration: '10m', target: 8 },
        { duration: '1m',  target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:writers}': ['p(95)<500'],
    'http_req_duration{scenario:readers}': ['p(95)<600'],
  },
};

export function setup() {
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) throw new Error('Backend is not healthy — aborting');

  const companiesRes = http.get(`${BASE_URL}/api/companies`);
  const existingCompanyIds = JSON.parse(companiesRes.body).map(c => c.companyid);
  return { existingCompanyIds };
}

export function writeData(data) {
  const companyRes = http.post(
    `${BASE_URL}/api/companies`,
    JSON.stringify({ name: randomK6Name('company') }),
    { headers: jsonHeaders() }
  );
  checkCreated(companyRes, 'mixed: insert company');

  sleep(1);

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
  checkCreated(productRes, 'mixed: insert product');

  sleep(2);
}

export function readData() {
  const companiesRes = http.get(`${BASE_URL}/api/companies`);
  checkList(companiesRes, 'mixed: list companies');

  sleep(1);

  const joinRes = http.get(`${BASE_URL}/api/products/with-company`);
  checkJoinResult(joinRes, 'mixed: join products');

  // Walk through individual companies from the list
  if (companiesRes.status === 200) {
    const companies = shuffleArray(JSON.parse(companiesRes.body));
    for (const company of companies.slice(0, 3)) {
      const res = http.get(`${BASE_URL}/api/companies`);
      checkList(res, `mixed: re-list after company ${company.companyid}`);
      sleep(1);
    }
  }

  sleep(1);
}

export function teardown() {
  const pRes = http.del(`${BASE_URL}/api/products/cleanup`, null, { headers: jsonHeaders() });
  checkResponse(pRes, 'teardown: cleanup products');

  const cRes = http.del(`${BASE_URL}/api/companies/cleanup`, null, { headers: jsonHeaders() });
  checkResponse(cRes, 'teardown: cleanup companies');

  console.log(`Teardown complete — products deleted: ${JSON.parse(pRes.body).deleted}, companies deleted: ${JSON.parse(cRes.body).deleted}`);
}
