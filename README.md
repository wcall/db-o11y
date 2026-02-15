# Database Observability with Grafana Alloy

This repository provides Docker Compose setups for monitoring **MySQL 8** and **PostgreSQL 15** databases using **Grafana Alloy** and **Grafana Cloud Database Observability**.

## 🚀 What's Inside

- **MySQL 8** - Complete observability setup with Performance Schema monitoring
- **PostgreSQL 15** - Full observability with pg_stat_statements and query tracking
- **Grafana Alloy** - Modern telemetry collector for metrics and logs
- **Management Tools** - phpMyAdmin for MySQL, pgAdmin for PostgreSQL
- **k6 Load Testing** - Generate realistic database traffic for MySQL with Grafana Cloud k6 integration
- **Production-Ready** - Environment-based configuration, health checks, and security best practices

---

## 📋 Prerequisites

- Docker and Docker Compose installed
- Grafana Cloud account ([Sign up free](https://grafana.com/auth/sign-up/create-user))
- Grafana Cloud Metrics (Mimir) and Grafana Cloud Logs (Loki) endpoints configured

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Grafana Cloud                           │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │   Prometheus    │         │      Loki       │           │
│  │   (Metrics)     │         │     (Logs)      │           │
│  └────────▲────────┘         └────────▲────────┘           │
└───────────┼───────────────────────────┼────────────────────┘
            │                           │
            │        Grafana Alloy      │
            │   ┌───────────────────┐   │
            └───┤  Telemetry        ├───┘
                │  Collector        │
                └─────────┬─────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
    ┌─────▼─────┐                  ┌─────▼─────┐
    │  MySQL 8  │                  │PostgreSQL │
    │           │                  │    15     │
    │Performance│                  │pg_stat_   │
    │  Schema   │                  │statements │
    └───────────┘                  └───────────┘
          │                               │
    ┌─────▼─────┐                  ┌─────▼─────┐
    │phpMyAdmin │                  │  pgAdmin  │
    └───────────┘                  └───────────┘
```

---

## 🔧 Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/wcall/db-o11y.git
cd db-o11y
```

### 2. Configure Environment

Copy the example environment file and add your Grafana Cloud credentials:

```bash
cp .env.example .env
```

Edit `.env` and update:
- `GCLOUD_PROMETHEUS_URL` - Your Grafana Cloud Prometheus endpoint
- `GCLOUD_PROMETHEUS_USERNAME` - Your Prometheus username
- `GCLOUD_PROMETHEUS_PASSWORD` - Your Prometheus API key
- `GCLOUD_LOKI_URL` - Your Grafana Cloud Loki endpoint
- `GCLOUD_LOKI_USERNAME` - Your Loki username
- `GCLOUD_LOKI_PASSWORD` - Your Loki API key

> 💡 Get credentials from: [Grafana Cloud Portal](https://grafana.com/docs/grafana-cloud/account-management/authentication-and-permissions/access-policies/)

### 3. Choose Your Database

#### Option A: MySQL 8

```bash
cd mysql
docker compose --env-file ../.env up -d
```

**Access Points:**
- MySQL: `localhost:3306`
- phpMyAdmin: http://localhost:8080
- Alloy UI: http://localhost:12345

📖 **Full Guide**: [MySQL Setup Guide](mysql/README.md)

#### Option B: PostgreSQL 15

```bash
cd postgresql
docker compose --env-file ../.env up -d
```

**Access Points:**
- PostgreSQL: `localhost:5432`
- pgAdmin: http://localhost:5050
- Alloy UI: http://localhost:12345

📖 **Full Guide**: [PostgreSQL Setup Guide](postgresql/README.md)

---

## 📊 What Gets Monitored

### MySQL 8 Observability

✅ **Query Performance**
- Slow queries and execution times
- Query samples with full SQL text
- Query execution plans (EXPLAIN)
- Query response time distribution

✅ **Performance Schema**
- Statement events and statistics
- Wait events and lock analysis
- Schema and table metadata
- CPU usage per query

✅ **Database Metrics**
- Connection counts and states
- InnoDB buffer pool usage
- Table locks and row operations
- Replication lag (if configured)

✅ **System Metrics**
- Memory usage
- Disk I/O
- Network traffic
- Thread states

### PostgreSQL 15 Observability

✅ **Query Performance**
- Slow queries via pg_stat_statements
- Query samples with parameters
- Execution plans and optimization
- Query response times

✅ **Database Statistics**
- Table and index usage
- Vacuum and autovacuum activity
- Dead tuples and bloat
- Cache hit ratios

✅ **Connection Metrics**
- Active connections and states
- Connection pool statistics
- Idle transactions
- Lock waits

✅ **System Metrics**
- WAL generation
- Checkpoint activity
- Buffer usage
- Replication metrics

---

## 🚦 k6 Load Testing for MySQL

Generate realistic database traffic to test MySQL performance and observability capabilities.

### Features

- 📊 **Realistic Query Patterns** - 60% SELECT, 15% INSERT, 15% UPDATE, 10% DELETE
- 🔗 **Complex JOIN Queries** - INNER JOIN, LEFT JOIN, FULL OUTER JOIN simulations
- ⏱️ **Configurable Load Stages** - 1-hour test with ramp-up, steady state, and spike testing
- ☁️ **Grafana Cloud k6** - Local execution with cloud reporting and dashboards
- 📈 **Custom Metrics** - Query duration, success rate, operation counters
- 🎯 **Performance Thresholds** - p95 < 500ms, p99 < 1000ms, 95% success rate

### Quick Start

```bash
cd mysql

# Ensure directories exist
mkdir -p scripts results

# Start MySQL
docker compose --env-file ../.env up -d mysql

# Run k6 load test
docker compose --env-file ../.env run --rm k6
```

### Query Patterns Tested

- **Simple SELECTs** - All companies, by ID, by name pattern
- **Aggregations** - COUNT, GROUP BY, AVG
- **INNER JOINs** - Company-Employee relationships with aggregations
- **LEFT JOINs** - All companies with optional employee data
- **FULL OUTER JOINs** - Complete dataset including orphaned records
- **Filtered JOINs** - Salary ranges, employee counts, HAVING clauses
- **Write Operations** - INSERTs, UPDATEs, DELETEs with re-insertion

### Observability Insights

The load test helps you:
1. 🔍 **Identify slow queries** in Database Observability dashboards
2. 📊 **Analyze JOIN performance** under realistic load
3. ⚡ **Detect bottlenecks** during peak traffic
4. 📉 **Optimize query patterns** based on p95/p99 latencies
5. 🎯 **Set performance baselines** for SLO/SLA definitions

See [mysql/README.md](mysql/README.md#running-k6-load-tests) for detailed k6 setup and usage instructions.

---

## 🗂️ Repository Structure

```
db-o11y/
├── .env                        # Environment variables (gitignored)
├── .env.example                # Template for environment setup
├── .gitignore                  # Git ignore rules
├── README.md                   # This file
├── k6/                         # k6 load testing (legacy)
│   └── mysql-loadgen-with-gck6.js  # k6 script reference
├── mysql/                      # MySQL 8 setup
│   ├── README.md               # MySQL-specific documentation
│   ├── compose.yaml            # Docker Compose for MySQL stack
│   ├── my.cnf                  # MySQL 8 configuration
│   ├── init-mysql.md           # Database initialization guide
│   ├── mysql-init/             # Database initialization scripts
│   │   └── 01-create-table.sql # Creates company & employee tables
│   ├── scripts/                # k6 load testing scripts
│   │   └── mysql-loadgen-with-gck6.js  # MySQL load test script
│   ├── results/                # k6 test results (gitignored)
│   └── alloy/
│       └── config.alloy        # Alloy configuration for MySQL
└── postgresql/                 # PostgreSQL 15 setup
    ├── README.md               # PostgreSQL-specific documentation
    ├── compose.yaml            # Docker Compose for PostgreSQL stack
    ├── postgresql.conf         # PostgreSQL configuration
    ├── init-postgres.md        # Database initialization guide
    └── alloy/
        └── config.alloy        # Alloy configuration for PostgreSQL
```

---

## 🎯 Features

### Environment-Based Configuration

All sensitive credentials are stored in `.env` file:
- Database passwords
- Grafana Cloud API keys
- Service configuration

### Health Checks

Both setups include health checks to ensure:
- Databases are fully initialized before Alloy connects
- Services restart automatically on failure
- Proper startup sequencing

### Security Best Practices

- `.env` file excluded from git
- `.env.example` template for easy setup
- Read-only configuration mounts
- Minimal privilege grants for monitoring users

### Production-Ready Components

- **Persistent Storage**: Docker volumes for data and logs
- **Custom Networks**: Isolated bridge networks per stack
- **Resource Limits**: Configurable connection and buffer limits
- **Logging**: Structured logs for debugging

---

## 📚 Detailed Documentation

### MySQL Setup

- **[MySQL README](mysql/README.md)** - Complete setup guide
- **[MySQL Initialization](mysql/init-mysql.md)** - Database setup instructions
- **[MySQL Configuration](mysql/my.cnf)** - Performance Schema configuration

### PostgreSQL Setup

- **[PostgreSQL README](postgresql/README.md)** - Complete setup guide
- **[PostgreSQL Initialization](postgresql/init-postgres.md)** - Database setup instructions
- **[PostgreSQL Configuration](postgresql/postgresql.conf)** - pg_stat_statements configuration

---

## 🛠️ Common Tasks

### View Logs

```bash
# MySQL stack
cd mysql && docker compose --env-file ../.env logs -f

# PostgreSQL stack
cd postgresql && docker compose --env-file ../.env logs -f

# Specific service
docker logs db-o11y-mysql -f
docker logs db-o11y-alloy -f
```

### Restart Services

```bash
# Restart specific service
docker compose --env-file ../.env restart mysql
docker compose --env-file ../.env restart alloy

# Restart all services
docker compose --env-file ../.env restart
```

### Stop and Clean Up

```bash
# Stop services (keeps data)
docker compose --env-file ../.env down

# Stop and remove volumes (deletes all data)
docker compose --env-file ../.env down -v
```

### Check Service Health

```bash
# Check running containers
docker compose --env-file ../.env ps

# Check MySQL health
docker exec -it db-o11y-mysql mysqladmin ping -h localhost -uroot -prootpass

# Check PostgreSQL health
docker exec -it db-o11y-postgres pg_isready -U admin@admin.com
```

---

## 🔍 Troubleshooting

### Connection Issues

**Symptom**: Alloy can't connect to database

**Solutions**:
1. Check database is healthy: `docker compose --env-file ../.env ps`
2. Verify monitoring user exists (see init guides)
3. Check network connectivity: `docker network inspect <network_name>`
4. Review Alloy logs: `docker logs db-o11y-alloy`

### No Metrics in Grafana Cloud

**Symptom**: Dashboards are empty

**Solutions**:
1. Verify Grafana Cloud credentials in `.env`
2. Check Alloy is sending data: `docker logs db-o11y-alloy | grep "remote_write"`
3. Confirm Performance Schema/pg_stat_statements is enabled
4. Wait 1-2 minutes for initial data to appear

### Performance Schema Issues (MySQL)

**Symptom**: Digest length errors or missing query text

**Solutions**:
1. Verify `my.cnf` settings:
   ```sql
   SHOW VARIABLES LIKE '%digest%';
   ```
2. Ensure all three should be `4096`:
   - `max_digest_length`
   - `performance_schema_max_digest_length`
   - `performance_schema_max_sql_text_length`
3. Restart MySQL after config changes

### pg_stat_statements Issues (PostgreSQL)

**Symptom**: No query statistics

**Solutions**:
1. Verify extension is installed:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
   ```
2. Check `postgresql.conf` has:
   ```
   shared_preload_libraries = 'pg_stat_statements'
   ```
3. Restart PostgreSQL after config changes

---

## 🔐 Security Notes

⚠️ **Important Security Reminders:**

- The `.env` file contains sensitive credentials - **never commit it to git**
- Change default passwords (`admin/admin`, `rootpass/userpass`) in production
- Rotate Grafana Cloud API keys regularly
- Use strong passwords for monitoring users
- Restrict database network access in production environments
- Review and audit user permissions periodically

---

## 📖 Additional Resources

### Grafana Documentation

- [Grafana Cloud Database Observability](https://grafana.com/docs/grafana-cloud/monitor-applications/database-observability/)
- [Grafana Alloy Documentation](https://grafana.com/docs/alloy/)
- [Getting Started with Grafana Cloud](https://grafana.com/docs/grafana-cloud/get-started/)

### MySQL Resources

- [MySQL 8.0 Performance Schema](https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html)
- [MySQL Performance Tuning](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)

### PostgreSQL Resources

- [PostgreSQL pg_stat_statements](https://www.postgresql.org/docs/15/pgstatstatements.html)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/15/performance-tips.html)

---

## 🤝 Contributing

This repository demonstrates database observability setups. Feel free to:
- Report issues
- Suggest improvements
- Share your configurations
- Contribute documentation

---

## 📄 License

This project is provided as-is for educational and demonstration purposes.

---

## 🎓 Learning Path

### Beginner

1. ✅ Set up MySQL or PostgreSQL with default configuration
2. ✅ Access web management tools (phpMyAdmin/pgAdmin)
3. ✅ View basic metrics in Grafana Cloud

### Intermediate

1. 📊 Create sample databases and run queries
2. 🔍 Analyze slow queries in Database Observability dashboards
3. ⚙️ Tune database configuration based on metrics

### Advanced

1. 🎯 Set up alerts for performance thresholds
2. 📈 Create custom dashboards for specific use cases
3. 🔧 Optimize query performance using explain plans
4. 🏗️ Scale horizontally with replication (see cloud provider sections in configs)

---

## 💡 Tips

- **Start Simple**: Begin with one database type
- **Use Init Guides**: Follow the detailed initialization guides in each directory
- **Monitor First**: Let the system collect data for a few minutes before tuning
- **Compare Baselines**: Establish performance baselines before making changes
- **Test Queries**: Use the sample data to generate realistic query patterns

---

**Ready to get started?** Choose your database:
- [MySQL Setup →](mysql/README.md)
- [PostgreSQL Setup →](postgresql/README.md)

For questions or issues, check the troubleshooting sections in the respective READMEs.
