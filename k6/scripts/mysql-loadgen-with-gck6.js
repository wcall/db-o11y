/**
 * MySQL Load Generation Script for Grafana Cloud k6
 *
 * This script generates realistic database traffic against MySQL 8 for observability testing.
 * Duration: 1 hour
 * Patterns: Ramp-up, steady state, spike testing
 * Operations: SELECT, INSERT, UPDATE, DELETE queries
 *
 * Prerequisites:
 * - k6 with xk6-sql extension installed
 * - MySQL 8 running and accessible
 * - Grafana Cloud k6 token configured
 *
 * Run with:
 * K6_CLOUD_TOKEN=<your-token> k6 run --out cloud mysql-loadgen-with-gck6.js
 */

import sql from 'k6/x/sql';
import driver from 'k6/x/sql/driver/mysql';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const queryDuration = new Trend('mysql_query_duration');
const queryErrors = new Counter('mysql_query_errors');
const querySuccess = new Rate('mysql_query_success');
const insertCount = new Counter('mysql_inserts');
const selectCount = new Counter('mysql_selects');
const updateCount = new Counter('mysql_updates');
const deleteCount = new Counter('mysql_deletes');

// Test configuration
export const options = {
  // Cloud configuration
  cloud: {
    projectID: parseInt(__ENV.K6_CLOUD_PROJECT_ID) || 0,
    name: 'MySQL Database Observability Load Test',
    distribution: {
      'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
    },
  },

  // Load stages - 1 hour total duration
  stages: [
    // Warm-up: 5 minutes ramp to 10 VUs
    { duration: '5m', target: 10 },

    // Steady load: 20 minutes at 10 VUs
    { duration: '20m', target: 10 },

    // Ramp up: 5 minutes to 30 VUs
    { duration: '5m', target: 30 },

    // Peak load: 15 minutes at 30 VUs
    { duration: '15m', target: 30 },

    // Spike test: 2 minutes to 50 VUs
    { duration: '2m', target: 50 },

    // Spike sustained: 3 minutes at 50 VUs
    { duration: '3m', target: 50 },

    // Cool down: 5 minutes back to 10 VUs
    { duration: '5m', target: 10 },

    // Final steady: 5 minutes at 10 VUs
    { duration: '5m', target: 10 },
  ],

  // Thresholds
  thresholds: {
    'mysql_query_duration': ['p(95)<500', 'p(99)<1000'],
    'mysql_query_success': ['rate>0.95'],
    'mysql_query_errors': ['count<100'],
    'http_req_duration': ['p(95)<2000'],
  },

  // Tags
  tags: {
    test_type: 'database_observability',
    database: 'mysql',
    version: '8.0',
  },
};

// Database connection string
const dbUrl = `${__ENV.K6_MYSQL_USER}:${__ENV.K6_MYSQL_PASSWORD}@tcp(${__ENV.K6_MYSQL_HOST}:${__ENV.K6_MYSQL_PORT})/${__ENV.K6_MYSQL_DATABASE}`;
//const dbUrl = `k6user:k6userpass@tcp(mysql:3306)/super_awesome_application`;

// Setup function - runs once per VU
export function setup() {
  console.log('='.repeat(60));
  console.log('MySQL Load Test Configuration');
  console.log('='.repeat(60));
  console.log(`Host: ${__ENV.K6_MYSQL_HOST}:${__ENV.K6_MYSQL_PORT}`);
  console.log(`Database: ${__ENV.K6_MYSQL_DATABASE}`);
  console.log(`User: ${__ENV.K6_MYSQL_USER}`);
  console.log(`Connection String: ${dbUrl}`);
  console.log(`Test Duration: 1 hour`);
  console.log(`Max VUs: 50`);
  console.log('='.repeat(60));

  // Test database connectivity
  try {
    const testDb = sql.open(driver, dbUrl);
    console.log('✓ Database connection successful');
    testDb.close();
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }

  return {
    timestamp: new Date().toISOString(),
  };
}

// Open database connection once per VU
let db;

// Main test function
export default function () {
  // Open connection once per VU (lazy initialization)
  if (!db) {
    db = sql.open(driver, dbUrl);
  }

  // Weight different query types for realistic traffic
  const queryType = Math.random();

  if (queryType < 0.6) {
    // 60% SELECT queries
    executeSelectQueries(db);
  } else if (queryType < 0.75) {
    // 15% INSERT queries
    executeInsertQuery(db);
    executeInsertQueryErrors(db);
  } else if (queryType < 0.90) {
    // 15% UPDATE queries
    executeUpdateQuery(db);
    executeUpdateQueryErrors(db);
  } else {
    // 10% DELETE queries (followed by re-insert)
    executeDeleteQuery(db);
  }

  // Simulate think time between operations
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

// SELECT query patterns
function executeSelectQueries(db) {
  const queryPatterns = [
    {
      name: 'select_all_companies',
      query: 'SELECT companyid, companyname FROM company LIMIT 100',
    },
    {
      name: 'select_by_id',
      query: 'SELECT * FROM company WHERE companyid = ?',
      params: [Math.floor(Math.random() * 1000) + 1],
    },
    {
      name: 'select_by_name_pattern',
      query: "SELECT * FROM company WHERE companyname LIKE ?",
      params: ['%Lab%'],
    },
    {
      name: 'count_companies',
      query: 'SELECT COUNT(*) as total FROM company',
    },
    {
      name: 'aggregate_query',
      query: 'SELECT LEFT(companyname, 1) as initial, COUNT(*) as count FROM company GROUP BY initial',
    },
    {
      name: 'inner_join_company_employee',
      query: `SELECT c.companyid, c.companyname, e.employeeid, e.employeename, e.salary
              FROM company c
              INNER JOIN employee e ON c.companyid = e.companyid
              ORDER BY c.companyname, e.employeename`,
    },
    {
      name: 'inner_join_with_aggregation',
      query: `SELECT c.companyid, c.companyname, COUNT(e.employeeid) as employee_count, AVG(e.salary) as avg_salary
              FROM company c
              INNER JOIN employee e ON c.companyid = e.companyid
              GROUP BY c.companyid, c.companyname
              ORDER BY avg_salary DESC`,
    },
    {
      name: 'inner_join_high_salary',
      query: `SELECT c.companyname, e.employeename, e.salary
              FROM company c
              INNER JOIN employee e ON c.companyid = e.companyid
              WHERE e.salary > ?
              ORDER BY e.salary DESC`,
      params: [120000],
    },
    {
      name: 'left_join_all_companies',
      query: `SELECT c.companyid, c.companyname, e.employeeid, e.employeename, e.salary
              FROM company c
              LEFT JOIN employee e ON c.companyid = e.companyid
              ORDER BY c.companyid`,
    },
    {
      name: 'left_join_all_companies_with_name_filter',
      query: `SELECT c.companyid, c.companyname, e.employeeid, e.employeename, e.salary
              FROM company c
              LEFT JOIN employee e ON c.companyid = e.companyid
              WHERE c.companyname LIKE ?   
              ORDER BY c.companyid`,
      params: ['%Tech%'],
    },    
    {
      name: 'left_join_all_companies_with_filter',
      query: `SELECT c.companyid, c.companyname, e.employeeid, e.employeename, e.salary
              FROM company c
              LEFT JOIN employee e ON c.companyid = e.companyid
              WHERE e.salary < ?
              ORDER BY c.companyid`,
      params: [100000],
    },
    {
      name: 'full_outer_join_simulation',
      query: `SELECT c.companyid, c.companyname, e.employeeid, e.employeename, e.salary
              FROM company c
              LEFT JOIN employee e ON c.companyid = e.companyid
              UNION
              SELECT c.companyid, c.companyname, e.employeeid, e.employeename, e.salary
              FROM company c
              RIGHT JOIN employee e ON c.companyid = e.companyid
              WHERE c.companyid IS NULL`,
    },
    {
      name: 'inner_join_salary_range',
      query: `SELECT c.companyname, COUNT(e.employeeid) as num_employees,
              MIN(e.salary) as min_salary, MAX(e.salary) as max_salary
              FROM company c
              INNER JOIN employee e ON c.companyid = e.companyid
              GROUP BY c.companyid, c.companyname
              HAVING COUNT(e.employeeid) > ?`,
      params: [1],
    },
  ];

  const pattern = queryPatterns[Math.floor(Math.random() * queryPatterns.length)];

  const startTime = Date.now();
  try {
    let results;
    if (pattern.params) {
      results = db.query(pattern.query, ...pattern.params);
    } else {
      results = db.query(pattern.query);
    }

    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'select', query_name: pattern.name });
    selectCount.add(1);

    check(results, {
      [`${pattern.name} succeeded`]: (r) => r !== null,
    });

    querySuccess.add(1);
  } catch (error) {
    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'select', query_name: pattern.name });
    queryErrors.add(1, { query_type: 'select', error: error.message });
    querySuccess.add(0);
    console.error(`SELECT query failed (${pattern.name}):`, error.message);
  }
}

// INSERT query
function executeInsertQuery(db) {
  const companies = [
    'Acme Corporation',
    'TechStart Inc',
    'Global Solutions',
    'DataFlow Systems',
    'CloudNet Services',
    'Innovation Labs',
    'Digital Ventures',
    'Smart Analytics',
    'AI Research Corp',
    'Quantum Computing Ltd',
  ];

  const companyName = companies[Math.floor(Math.random() * companies.length)] +
                     ' #' + Math.floor(Math.random() * 10000);

  const query = 'INSERT INTO company (companyname) VALUES (?)';

  const startTime = Date.now();
  try {
    db.exec(query, companyName);

    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'insert' });
    insertCount.add(1);
    querySuccess.add(1);

  } catch (error) {
    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'insert' });
    queryErrors.add(1, { query_type: 'insert', error: error.message });
    querySuccess.add(0);
    console.error('INSERT query failed:', error.message);
  }
}

// INSERT query errors - attempt to insert into non-existent table to generate errors
function executeInsertQueryErrors(db) {
  const companies = [
    'Acme Corporation',
    'TechStart Inc',
    'Global Solutions',
    'DataFlow Systems',
    'CloudNet Services',
    'Innovation Labs',
    'Digital Ventures',
    'Smart Analytics',
    'AI Research Corp',
    'Quantum Computing Ltd',
  ];

  const companyName = companies[Math.floor(Math.random() * companies.length)] +
                     ' #' + Math.floor(Math.random() * 10000);

  const query = 'INSERT INTO competitior (companyname) VALUES (?)';

  const startTime = Date.now();
  try {
    db.exec(query, companyName);

    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'insert' });
    insertCount.add(1);
    querySuccess.add(1);

  } catch (error) {
    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'insert' });
    queryErrors.add(1, { query_type: 'insert', error: error.message });
    querySuccess.add(0);
    console.error('INSERT query failed:', error.message);
  }
}

// UPDATE query
function executeUpdateQuery(db) {
  const newNames = [
    'Updated Corp',
    'Renamed LLC',
    'Modified Industries',
    'Changed Systems',
    'Revised Solutions',
  ];

  const newName = newNames[Math.floor(Math.random() * newNames.length)] +
                 ' #' + Math.floor(Math.random() * 10000);
  const targetId = Math.floor(Math.random() * 1000) + 1;

  const query = 'UPDATE company SET companyname = ? WHERE companyid = ?';

  const startTime = Date.now();
  try {
    db.exec(query, newName, targetId);

    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'update' });
    updateCount.add(1);
    querySuccess.add(1);

  } catch (error) {
    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'update' });
    queryErrors.add(1, { query_type: 'update', error: error.message });
    querySuccess.add(0);
    console.error('UPDATE query failed:', error.message);
  }
}

// UPDATE query errors - attempt to update non-existent table to generate errors
function executeUpdateQueryErrors(db) {
  const newNames = [
    'Updated Corp',
    'Renamed LLC',
    'Modified Industries',
    'Changed Systems',
    'Revised Solutions',
  ];

  const newName = newNames[Math.floor(Math.random() * newNames.length)] +
                 ' #' + Math.floor(Math.random() * 10000);
  const targetId = Math.floor(Math.random() * 1000) + 1;

  const query = 'UPDATE competitior SET companyname = ? WHERE companyid = ?';

  const startTime = Date.now();
  try {
    db.exec(query, newName, targetId);

    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'update' });
    updateCount.add(1);
    querySuccess.add(1);

  } catch (error) {
    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'update' });
    queryErrors.add(1, { query_type: 'update', error: error.message });
    querySuccess.add(0);
    console.error('UPDATE query failed:', error.message);
  }
}

// DELETE query (followed by re-insert to maintain data)
function executeDeleteQuery(db) {
  const targetId = Math.floor(Math.random() * 1000) + 1;

  const deleteQuery = 'DELETE FROM company WHERE companyid = ?';

  const startTime = Date.now();
  try {
    db.exec(deleteQuery, targetId);

    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'delete' });
    deleteCount.add(1);
    querySuccess.add(1);

  } catch (error) {
    const duration = Date.now() - startTime;
    queryDuration.add(duration, { query_type: 'delete' });
    queryErrors.add(1, { query_type: 'delete', error: error.message });
    querySuccess.add(0);
    console.error('DELETE query failed:', error.message);
  }
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log('='.repeat(60));
  console.log('Test Completed');
  console.log(`Started: ${data.timestamp}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
}