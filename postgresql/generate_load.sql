-- generate_load.sql
-- Generates mixed query load against super_awesome_application:
--   ~73% normal queries
--   ~9%  intentional errors  (marked ERROR)
--   ~9%  complex / slow queries (marked SLOW — exceed log_min_duration_statement=1000ms)
--   ~9%  wait-inducing queries (marked WAIT)
--         IO/BufFileRead+Write — sort and hash spills to disk via SET LOCAL work_mem='64kB'
--         IO/DataFileRead      — sequential scan of a large temp table
--
-- Run: docker exec -i db-o11y-postgres psql -U wcall -d super_awesome_application -f /tmp/generate_load.sql
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
-- Intentional errors (4 of 34 = 11.76%)
-- ============================================================

-- ERROR 1: relation does not exist
SELECT * FROM wcall.employees;

-- ERROR 2: division by zero
SELECT companyid / 0 AS bad_math FROM wcall.company LIMIT 1;

-- ERROR 3: invalid type cast
SELECT 'not_a_number'::integer AS bad_cast;

-- ERROR 4: invalid cast
SELECT * FROM wcall.nonexistent_table;

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

-- ============================================================
-- Wait-inducing queries (3 of 33)
-- ============================================================

-- WAIT 1: IO/BufFileWrite + IO/BufFileRead — sort spill to disk
--         SET LOCAL work_mem limits memory to 64kB for this transaction,
--         forcing the 250k-row sort to spill temp files to disk
BEGIN;
SET LOCAL work_mem = '64kB';
SELECT count(*)  AS sorted_rows,
       max(hash) AS max_hash
FROM (
    SELECT id, md5(id::text) AS hash
    FROM generate_series(1, 250000) id
    ORDER BY hash
) sorted;
COMMIT;

-- WAIT 2: IO/DataFileRead — large temp table sequential scan
--         400k rows written to a temp table force pages out of shared_buffers;
--         the subsequent filtered scan must read them back from disk
CREATE TEMP TABLE io_wait_scan (id int, payload text, filler text);
INSERT INTO io_wait_scan
    SELECT id, md5(id::text), repeat('x', 40)
    FROM generate_series(1, 400000) id;
SELECT count(*)                                   AS scanned_rows,
       count(DISTINCT substring(payload, 1, 4))   AS distinct_prefixes,
       max(id)                                    AS max_id
FROM io_wait_scan
WHERE id % 5 = 0;
DROP TABLE io_wait_scan;

-- WAIT 3: IO/BufFileWrite + IO/BufFileRead — hash aggregate spill
--         Low work_mem forces the hash aggregate over 300k distinct keys
--         to spill intermediate hash batches to disk
BEGIN;
SET LOCAL work_mem = '64kB';
SELECT substring(hash, 1, 3) AS prefix,
       count(*)               AS cnt,
       max(id)                AS max_id
FROM (
    SELECT id, md5(id::text) AS hash
    FROM generate_series(1, 300000) id
) data
GROUP BY prefix
ORDER BY cnt DESC
LIMIT 20;
COMMIT;
