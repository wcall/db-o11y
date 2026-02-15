# MySQL Database Initialization Guide

This guide walks through initializing the MySQL 8 database with the necessary schema, tables, and permissions for database observability with Grafana Alloy. It also configures the Performance Schema for comprehensive query monitoring.

---

## Prerequisites

- Docker container `mysql` must be running
- MySQL credentials configured in `.env` file
- Custom `my.cnf` with Performance Schema settings applied

---

## Step 1: Connect to MySQL

Connect to the MySQL container as the root user:

```bash
docker exec -it db-o11y-mysql mysql -u root -p
```

> **Note**: Replace `rootpass` with your actual root password from the `.env` file.

---

## Step 2: Create Database and Sample Data

### List existing databases

```sql
SHOW DATABASES;
```

### Create application database

```sql
CREATE DATABASE super_awesome_application;
USE super_awesome_application;
```

### Verify you're in the correct database

```sql
SELECT DATABASE();
SHOW TABLES;
```

### Create a sample table

```sql
CREATE TABLE company (
    companyid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    companyname VARCHAR(50) NOT NULL
);
```

### Verify table structure

```sql
DESCRIBE company;
```

### Insert sample data

```sql
INSERT INTO company (companyname) VALUES
    ('Grafana Labs'),
    ('Azure'),
    ('Amazon'),
    ('Google');
```

### Verify the data

```sql
SELECT companyid, companyname FROM company;
```

Expected output:
```
+-----------+---------------+
| companyid | companyname   |
+-----------+---------------+
|         1 | Grafana Labs  |
|         2 | Azure         |
|         3 | Amazon        |
|         4 | Google        |
+-----------+---------------+
```

---

## Step 3: Verify Performance Schema Configuration

> **Reference**: [Grafana Cloud Database Observability - MySQL Setup](https://grafana.com/docs/grafana-cloud/monitor-applications/database-observability/get-started/mysql/)

### Check Performance Schema is enabled

```sql
SHOW VARIABLES LIKE 'performance_schema';
```

**Expected result**: `Value = ON`

If disabled, you need to enable it in `my.cnf` and restart MySQL.

### Verify digest length settings

These settings determine how much query text is captured for analysis:

```sql
SHOW VARIABLES LIKE 'max_digest_length';
SHOW VARIABLES LIKE 'performance_schema_max_digest_length';
SHOW VARIABLES LIKE 'performance_schema_max_sql_text_length';
```

**Expected result**: All three should be `4096`

#### If values are incorrect:

The custom `my.cnf` file in this repository already includes these settings:

```ini
[mysqld]
max_digest_length = 4096
performance_schema_max_digest_length = 4096
performance_schema_max_sql_text_length = 4096
```

If you need to verify or change these settings:

1. Edit the `my.cnf` file
2. Restart the MySQL container: `docker compose --env-file ../.env restart mysql`
3. Verify the changes:

```sql
SHOW GLOBAL VARIABLES 
WHERE Variable_name IN ( 
    'max_digest_length',
    'performance_schema_max_digest_length',
    'performance_schema_max_sql_text_length'
);
```

---

## Step 4: Create Monitoring User and Grant Privileges

### Create the db-o11y monitoring user

```sql
CREATE USER IF NOT EXISTS 'db-o11y'@'%' IDENTIFIED BY 'DBO11y-MySQL';
```

> **Security Note**: Change `DBO11y-MySQL` to a strong password in production environments.

### Grant required privileges for database observability

```sql
-- Basic monitoring privileges
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'db-o11y'@'%';
GRANT SELECT ON performance_schema.* TO 'db-o11y'@'%';

-- Grant read access to all schemas for query analysis
GRANT SELECT, SHOW VIEW ON *.* TO 'db-o11y'@'%';

FLUSH PRIVILEGES;
```

### Disable performance tracking for the monitoring user

This prevents the monitoring user's queries from cluttering the performance data:

```sql
UPDATE performance_schema.setup_actors 
SET ENABLED = 'NO', HISTORY = 'NO' 
WHERE USER = 'db-o11y';
```

**Alternative**: Grant privileges to let Alloy automatically manage this setting (recommended for large fleets):

```sql
GRANT INSERT, UPDATE ON performance_schema.setup_actors TO 'db-o11y'@'%';
```

### Verify user privileges

```sql
SHOW GRANTS FOR 'db-o11y'@'%';
```

Expected grants should include:
- `GRANT SELECT, SHOW VIEW, PROCESS, REPLICATION CLIENT ON *.*`
- `GRANT SELECT ON performance_schema.*`

---

## Step 5: Configure Performance Schema Consumers (Optional but Recommended)

Performance Schema consumers control what events are collected and stored.

### Option A: Grant Alloy Auto-Enable Permissions (Recommended)

Allow Alloy to automatically enable required consumers:

```sql
GRANT UPDATE ON performance_schema.setup_consumers TO 'db-o11y'@'%';
```

**Benefits**:
- Alloy automatically enables necessary consumers
- Consumers are re-enabled after MySQL restarts
- Easier management for large fleets

### Option B: Manually Enable Consumers

If you prefer manual control, enable consumers individually:

#### Enable CPU usage tracking

Track CPU usage for each query:

```sql
-- Check current status
SELECT * FROM performance_schema.setup_consumers 
WHERE NAME = 'events_statements_cpu';

-- Enable if disabled
UPDATE performance_schema.setup_consumers 
SET ENABLED = 'YES' 
WHERE NAME = 'events_statements_cpu';
```

> ⚠️ **Note**: This consumer resets to disabled on MySQL restart. Use Option A to have Alloy manage it automatically.

#### Enable wait event tracking

Track lock waits and other waiting events:

```sql
-- Check current status
SELECT * FROM performance_schema.setup_consumers 
WHERE NAME IN ('events_waits_current', 'events_waits_history');

-- Enable if disabled
UPDATE performance_schema.setup_consumers 
SET ENABLED = 'YES' 
WHERE NAME IN ('events_waits_current', 'events_waits_history');
```

### Verify enabled consumers

```sql
SELECT NAME, ENABLED 
FROM performance_schema.setup_consumers 
WHERE ENABLED = 'YES' 
ORDER BY NAME;
```

---

## Step 6: Test Monitoring User Access

Exit the root session and connect as the monitoring user:

```sql
EXIT;
```

```bash
docker exec -it db-o11y-mysql mysql -udb-o11y -pDBO11y-MySQL
```

### Verify access to Performance Schema

```sql
-- Test query performance data access
SELECT COUNT(*) FROM performance_schema.events_statements_summary_by_digest;

-- Test query samples access
SELECT * FROM performance_schema.events_statements_history LIMIT 1;

-- Test access to your application database
USE super_awesome_application;
SELECT * FROM company;
```

If all queries succeed, the monitoring user is properly configured!

---

## Summary

After completing these steps, you will have:

- ✅ Created the `super_awesome_application` database with sample data
- ✅ Verified Performance Schema is enabled with correct digest settings
- ✅ Created the `db-o11y` monitoring user with appropriate privileges
- ✅ Configured Performance Schema consumers for comprehensive monitoring
- ✅ Tested monitoring user access to performance data

The database is now ready for monitoring with Grafana Alloy and Database Observability!

---

## Next Steps

1. **Configure Alloy** - Update the Alloy configuration with the `db-o11y` user credentials
2. **Start Alloy** - Run `docker compose --env-file ../.env up -d alloy`
3. **Verify Metrics** - Check Grafana Cloud for incoming MySQL metrics and logs
4. **Explore Dashboards** - Use Grafana Cloud's Database Observability dashboards

---

## Troubleshooting

### Performance Schema is disabled

Edit `my.cnf` and ensure:
```ini
[mysqld]
performance_schema = ON
```

Then restart MySQL:
```bash
docker compose --env-file ../.env restart mysql
```

### Monitoring user can't access Performance Schema

Check grants:
```sql
SHOW GRANTS FOR 'db-o11y'@'%';
```

Re-grant if needed:
```sql
GRANT SELECT ON performance_schema.* TO 'db-o11y'@'%';
FLUSH PRIVILEGES;
```

### Consumers keep resetting after restart

Grant Alloy auto-enable permissions:
```sql
GRANT UPDATE ON performance_schema.setup_consumers TO 'db-o11y'@'%';
```

---

## Additional Resources

- [MySQL Performance Schema Documentation](https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html)
- [Grafana Cloud Database Observability for MySQL](https://grafana.com/docs/grafana-cloud/monitor-applications/database-observability/get-started/mysql/)
- [MySQL User Management](https://dev.mysql.com/doc/refman/8.0/en/user-management.html)

