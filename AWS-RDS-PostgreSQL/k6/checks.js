import { check } from 'k6';

function baseChecks(res, name) {
  return {
    [`${name}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${name}: is JSON`]: (r) => (r.headers['Content-Type'] || '').includes('application/json'),
    [`${name}: response time < 500ms`]: (r) => r.timings.duration < 500,
  };
}

export function checkResponse(res, name) {
  return check(res, baseChecks(res, name));
}

export function checkCreated(res, name) {
  return check(res, {
    ...baseChecks(res, name),
    [`${name}: status 201`]: (r) => r.status === 201,
    [`${name}: has id`]: (r) => {
      try { return JSON.parse(r.body).companyid !== undefined || JSON.parse(r.body).productid !== undefined; }
      catch { return false; }
    },
  });
}

export function checkList(res, name) {
  return check(res, {
    ...baseChecks(res, name),
    [`${name}: is array`]: (r) => {
      try { return Array.isArray(JSON.parse(r.body)); }
      catch { return false; }
    },
    [`${name}: not empty`]: (r) => {
      try { return JSON.parse(r.body).length > 0; }
      catch { return false; }
    },
  });
}

export function checkJoinResult(res, name) {
  return check(res, {
    ...baseChecks(res, name),
    [`${name}: has companyname`]: (r) => {
      try {
        const rows = JSON.parse(r.body);
        return rows.length > 0 && rows[0].companyname !== undefined;
      } catch { return false; }
    },
  });
}
