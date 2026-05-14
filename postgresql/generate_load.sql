-- generate_load.sql
-- Generates mixed query load against super_awesome_application:
--   ~80% normal queries
--   ~10% intentional errors  (marked ERROR)
--   ~10% complex / slow queries (marked SLOW — exceed log_min_duration_statement=1000ms)
--
-- Run: docker exec -i db-o11y-postgres psql -U db-o11y -d super_awesome_application -f /tmp/generate_load.sql
-- Copy: docker cp generate_load.sql db-o11y-postgres:/tmp/generate_load.sql

\set ON_ERROR_STOP off

-- ============================================================
-- Normal queries (24 of 30 = 80%)
-- ============================================================

SELECT * FROM wcall.company;

SELECT companyname FROM wcall.company ORDER BY companyname;

SELECT count(*) FROM wcall.company;

SELECT companyname FROM wcall.company WHERE companyid = 1;

SELECT upper(companyname), length(companyname) AS name_length FROM wcall.company;

SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'wcall';

SELECT companyname FROM wcall.company WHERE companyname LIKE '%a%';

SELECT max(companyid), min(companyid), avg(companyid)::numeric(10,2) AS avg_id FROM wcall.company;

SELECT current_database(), current_user, now();

SELECT companyid, companyname, length(companyname) AS name_length
FROM wcall.company
ORDER BY name_length DESC;

SELECT c.companyid, c.companyname
FROM wcall.company c
WHERE c.companyid IN (
    SELECT companyid FROM wcall.company WHERE companyname LIKE '%G%'
);

SELECT tablename, tableowner
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema');

SELECT attname, atttypid::regtype AS data_type
FROM pg_attribute
WHERE attrelid = 'wcall.company'::regclass AND attnum > 0;

SELECT schemaname, relname, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'wcall';

SELECT companyname, row_number() OVER (ORDER BY companyid) AS row_num
FROM wcall.company;

SELECT string_agg(companyname, ', ' ORDER BY companyname) AS all_companies
FROM wcall.company;

SELECT companyid,
       companyname,
       CASE
           WHEN companyname ILIKE '%a%' THEN 'contains A'
           ELSE 'no A'
       END AS has_letter_a
FROM wcall.company;

SELECT pid, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid();

SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'wcall';

SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'wcall' AND table_name = 'company';

SELECT n.nspname, c.relname, c.reltuples::bigint AS estimated_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'wcall';

SELECT companyname FROM wcall.company
UNION ALL
SELECT companyname FROM wcall.company
ORDER BY 1;

SELECT count(*) AS total_statements,
       round(sum(total_exec_time)::numeric, 2) AS total_exec_ms,
       round(avg(mean_exec_time)::numeric, 4) AS avg_exec_ms
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database());

SELECT version(), pg_postmaster_start_time();

-- ============================================================
-- Intentional errors (3 of 30 = 10%)
-- ============================================================

-- ERROR 1: relation does not exist
SELECT * FROM wcall.employees;

-- ERROR 2: division by zero
SELECT companyid / 0 AS bad_math FROM wcall.company LIMIT 1;

-- ERROR 3: invalid type cast
SELECT 'not_a_number'::integer AS bad_cast;

-- ============================================================
-- Complex / slow queries (3 of 30 = 10%)
-- ============================================================

-- SLOW 1: pg_sleep ensures query exceeds log_min_duration_statement threshold;
--         window function runs across all rows while sleeping
SELECT pg_sleep(1.5),
       companyid,
       companyname,
       sum(companyid) OVER () AS total_id_sum,
       rank() OVER (ORDER BY companyname) AS alpha_rank
FROM wcall.company;

-- SLOW 2: cross join on system catalogs produces a large intermediate row set
--         before aggregation collapses it
SELECT count(*) AS row_count,
       sum(a.attnum)  AS attnum_sum,
       avg(c.oid::bigint) AS avg_class_oid
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
CROSS JOIN (SELECT generate_series(1, 1000)) gs(n)
WHERE a.attnum > 0
  AND c.relkind IN ('r', 'v');

-- SLOW 3: recursive CTE generates 8000 Fibonacci rows, then cross-joins
--         against wcall.company with a sort and aggregate per company
WITH RECURSIVE fib(n, a, b) AS (
    SELECT 1, 0::numeric, 1::numeric
    UNION ALL
    SELECT n + 1, b, a + b FROM fib WHERE n < 8000
),
ranked AS (
    SELECT f.n, f.b, c.companyname,
           ntile(4) OVER (PARTITION BY c.companyname ORDER BY f.b) AS quartile
    FROM fib f
    CROSS JOIN wcall.company c
)
SELECT companyname,
       quartile,
       count(*)        AS rows_in_quartile,
       max(b)          AS max_fib,
       round(avg(b), 2) AS avg_fib
FROM ranked
GROUP BY companyname, quartile
ORDER BY companyname, quartile;
