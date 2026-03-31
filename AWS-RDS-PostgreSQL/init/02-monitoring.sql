-- PostgreSQL Monitoring and Performance Configuration for AWS RDS
-- Applied via Terraform null_resource after 01-seed.sql
--
-- Requires MONITORING_PASSWORD in the environment (Terraform sets it), then psql 15+
-- loads it:  \getenv monitoring_password MONITORING_PASSWORD
-- Manual run:  export MONITORING_PASSWORD='...' && psql ... -f init/02-monitoring.sql

-- =============================================================================
-- Extensions Setup
-- Note: shared_preload_libraries is set in the RDS parameter group.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;

-- =============================================================================
-- Monitoring user (password from env — avoids broken psql -v quoting for ' $ etc.)
-- =============================================================================

\getenv monitoring_password MONITORING_PASSWORD

SELECT format('CREATE USER "db-o11y" WITH LOGIN PASSWORD %L', :'monitoring_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'db-o11y')
\gexec

-- Predefined role includes stats views (replaces fragile GRANT on pg_stat_statements)
GRANT pg_monitor TO "db-o11y";
GRANT pg_read_all_stats TO "db-o11y";
GRANT pg_read_all_data TO "db-o11y";

DO $grant_connect$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO "db-o11y"', current_database());
END
$grant_connect$;

-- public schema
GRANT USAGE ON SCHEMA public TO "db-o11y";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO "db-o11y";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO "db-o11y";

-- wcall schema (01-seed.sql)
GRANT USAGE ON SCHEMA wcall TO "db-o11y";
GRANT SELECT ON ALL TABLES IN SCHEMA wcall TO "db-o11y";
ALTER DEFAULT PRIVILEGES IN SCHEMA wcall GRANT SELECT ON TABLES TO "db-o11y";

ALTER ROLE "db-o11y" SET pg_stat_statements.track = 'none';
