# MySQL DB Observability Docker Compose Setup

This Docker Compose setup runs MySQL 8 with Grafana Alloy for database observability, sending metrics and logs to Grafana Cloud.

---

## Prerequisites

- Docker and Docker Compose installed
- Grafana Cloud account with Prometheus and Loki endpoints configured
- `.env` file in parent directory with required credentials

---

## How to Run

### 1. Navigate to the mysql directory

```bash
cd <YourPath>/db-o11y/mysql
```

### 2. Start all services

```bash
docker compose --env-file ../.env up -d
```

### 3. View logs

```bash
docker compose --env-file ../.env logs -f
```

### 4. Stop all services

```bash
docker compose --env-file ../.env down
```

### 5. Stop and remove volumes

⚠️ **WARNING**: This deletes all data!

```bash
docker compose --env-file ../.env down -v
```

---

## Running k6 Load Tests

The compose stack includes a k6 service for load testing MySQL. The k6 service:
- ✅ Built from custom Dockerfile at `../k6/Dockerfile`
- ✅ Includes k6 with xk6-sql and MySQL driver extensions pre-compiled
- ✅ Executes tests with local execution and cloud reporting
- ✅ Saves results to `./results/` directory
- ✅ Uses a profile (`load-test`) to prevent auto-start

### Prerequisites

1. **k6 Script Directory**: The k6 scripts are located in `../k6/scripts/`:
   ```bash
   # Scripts and results are in the k6 directory (shared across database types)
   ls ../k6/scripts/mysql-loadgen-with-gck6.js
   ls -d ../k6/results
   ```

2. **Environment Variables**: Ensure these are set in `../.env`:
   ```bash
   # Grafana Cloud k6
   K6_CLOUD_TOKEN=your_k6_cloud_token
   K6_CLOUD_PROJECT_ID=your_project_id
   K6_CLOUD_STACK_ID=your_stack_id

   # MySQL credentials for k6
   K6_MYSQL_USER=k6user
   K6_MYSQL_PASSWORD=k6userpass
   ```

### Run k6 Load Test

The k6 service runs with the `load-test` profile, so you must explicitly invoke it:

```bash
# Build the custom k6 image (first time or after Dockerfile changes)
docker compose --env-file ../.env build k6

# Start all services (mysql, alloy, etc.)
docker compose --env-file ../.env up -d

# Run k6 load test
docker compose --env-file ../.env run --rm k6
```

**What happens:**
1. 🔨 Uses pre-built k6 image with xk6-sql and MySQL driver extensions
2. 🚀 Runs the load test script (`/work/scripts/mysql-loadgen-with-gck6.js`)
3. ☁️ Executes locally but reports results to Grafana Cloud k6
4. 💾 Saves detailed results to `../k6/results/k6-output.log`

### View Results

**Local Results:**
```bash
# View k6 output log
cat ../k6/results/k6-output.log

# View test output from container logs
docker compose --env-file ../.env logs k6
```

**Grafana Cloud k6 Dashboard:**
- The test will output a URL to your Grafana Cloud k6 dashboard
- View real-time metrics, performance graphs, and test summaries

### Customize the Test

To modify test parameters, edit the k6 command in `compose.yaml`:

```yaml
# Example: Run for 5 minutes with 10 VUs
./k6 run --vus 10 --duration 5m \
  --env K6_MYSQL_HOST \
  --env K6_MYSQL_PORT \
  /work/scripts/mysql-loadgen-with-gck6.js
```

### k6 Service Configuration

The k6 service in `compose.yaml`:

- **Build**: Built from `../k6/Dockerfile` - Custom k6 with SQL extensions
  - Uses multi-stage build with Go 1.23+ and `GOTOOLCHAIN=auto`
  - Includes xk6-sql and xk6-sql-driver-mysql extensions
- **Working Directory**: `/work` - Base directory for scripts and results
- **Volumes**:
  - `../k6/scripts:/work/scripts:ro` - Read-only mount of k6 scripts
  - `../k6/results:/work/results` - Writable mount for test results
- **Network**: `db-o11y-network` - Same network as MySQL
- **Depends On**: MySQL healthy - Waits for MySQL before starting
- **Profile**: `load-test` - Must be explicitly invoked with `run`

### Troubleshooting k6

**Script not found:**
```bash
# Ensure script exists in ../k6/scripts/
ls -la ../k6/scripts/mysql-loadgen-with-gck6.js
```

**Connection refused to MySQL:**
```bash
# Verify MySQL is healthy
docker compose --env-file ../.env ps mysql

# Check network
docker network inspect mysql_db-o11y-network
```

**Build failures:**
```bash
# Rebuild the k6 image
docker compose --env-file ../.env build k6 --no-cache

# Check build logs for errors
docker compose --env-file ../.env build k6

# Verify internet connectivity (needs to download Go modules during build)
```

**Go version errors:**
The Dockerfile uses `GOTOOLCHAIN=auto` to automatically download required Go versions.
If you see Go version errors, ensure Docker has internet access to download the Go toolchain.

---

## Access Points

### MySQL Database

| Property | Value |
|----------|-------|
| Host | `localhost` |
| Port | `3306` |
| Database | `devdb` |
| Root Password | `rootpass` |
| Username | `user` |
| Password | `userpass` |

### phpMyAdmin Web Interface

- **URL**: http://localhost:8080
- **Server**: `mysql`
- **Username**: `root` or `user`
- **Password**: `rootpass` or `userpass`

#### To connect to MySQL from phpMyAdmin:

1. Open http://localhost:8080 in your browser
2. **Server**: `mysql` (use service name, not localhost)
3. **Username**: `root`
4. **Password**: `rootpass`
5. Alternatively, use the non-root user:
   - **Username**: `user`
   - **Password**: `userpass`

### Grafana Alloy

- **UI**: http://localhost:12345
- **Health**: http://localhost:12345/-/healthy
- **Ready**: http://localhost:12345/-/ready

---

## Notes

### Environment Variables

- The `.env` file is located in the parent directory (`../`), not in the mysql directory
- Always use `--env-file ../.env` when running docker compose commands
- The `.env` file contains sensitive credentials and is excluded from git

### MySQL Configuration

- Uses custom `my.cnf` from the mysql directory
- Database credentials are stored as environment variables
- Data persists in a Docker volume named `mysql_data`
- Logs persist in a Docker volume named `mysql_logs`

### MySQL 8 Performance Schema Settings

The `my.cnf` configuration includes optimizations for database observability:

- **Performance Schema enabled** with full instrumentation
- **Digest settings**: `max_digest_length = 4096`
- **Statement tracking**: Current, history, and long history events
- **Stage tracking**: Query execution stage monitoring
- **Wait tracking**: Lock and wait analysis
- **Slow query log**: Queries taking > 2 seconds
- **Binary logging**: ROW format for replication

### Alloy Configuration

- `config.alloy` uses environment variables for Grafana Cloud credentials
- Connects to MySQL using service name `mysql` (not localhost)
- Sends metrics to Grafana Cloud Prometheus
- Sends logs to Grafana Cloud Loki
- Monitors performance schema for query insights

### Networking

- All services run on a bridge network named `db-o11y-network`
- Services communicate using their service names (`mysql`, `phpmyadmin`, `alloy`)
- Only exposed ports are accessible from the host

---

## Troubleshooting

### If Alloy can't connect to MySQL

- Ensure MySQL is fully started (check logs)
- Verify connection string uses `mysql` not `localhost`
- Check that both services are on the same network
- Confirm Performance Schema is enabled in `my.cnf`

### If phpMyAdmin can't connect to MySQL

- Use service name `mysql` as host, not `localhost`
- Verify MySQL is running:
  ```bash
  docker compose --env-file ../.env ps
  ```
- Check MySQL logs for connection errors:
  ```bash
  docker compose --env-file ../.env logs mysql
  ```

### If metrics/logs aren't appearing in Grafana Cloud

- Check Alloy logs:
  ```bash
  docker compose --env-file ../.env logs alloy
  ```
- Verify `GCLOUD_*` environment variables are set correctly in `../.env`
- Confirm Grafana Cloud credentials are valid
- Check MySQL Performance Schema is enabled:
  ```bash
  docker exec -it mysql mysql -uroot -prootpass -e "SHOW VARIABLES LIKE 'performance_schema';"
  ```

### If Performance Schema queries are failing

- Verify digest settings in `my.cnf`:
  ```bash
  docker exec -it mysql mysql -uroot -prootpass -e "SHOW VARIABLES LIKE '%digest%';"
  ```
- Expected values: `4096` for all digest-related settings

### To reset everything

```bash
# Stop services and remove volumes
docker compose --env-file ../.env down -v

# Remove volumes (if needed)
docker volume rm mysql_mysql_data mysql_mysql_logs

# Restart
docker compose --env-file ../.env up -d
```

---

## File Structure

```
/Users/wei-chincall/Workspace/Grafana/db-o11y/
├── .env                              # Environment variables (NOT in git)
├── k6/
│   ├── Dockerfile                    # Custom k6 build with SQL extensions
│   ├── scripts/
│   │   └── mysql-loadgen-with-gck6.js # k6 load test script
│   └── results/                      # k6 test results (gitignored)
└── mysql/
    ├── README.md                     # This file
    ├── compose.yaml                  # Docker Compose configuration
    ├── my.cnf                        # MySQL 8.0 configuration
    ├── init-mysql.md                 # Database initialization guide
    ├── mysql-init/                   # Database initialization scripts
    │   └── 01-create-table.sql       # Creates company & employee tables
    └── alloy/
        └── config.alloy              # Alloy configuration
```

---

## Security Reminders

⚠️ **Important Security Notes:**

- The `.env` file contains sensitive credentials and API keys
- Never commit `.env` to version control
- Change default passwords (`rootpass`, `userpass`) in production environments
- Grafana Cloud API keys should be rotated regularly
- MySQL root password should be strong and unique in production

---

## Database Initialization

After starting the services, you'll need to set up users and permissions for database observability:

### Quick Start

```bash
# Connect to MySQL as root
docker exec -it mysql mysql -uroot -prootpass

# Create a monitoring user
CREATE USER 'db-o11y'@'%' IDENTIFIED BY 'db-o11y-password';
GRANT SELECT, PROCESS, REPLICATION CLIENT ON *.* TO 'db-o11y'@'%';
FLUSH PRIVILEGES;
```

For detailed initialization steps, see [init-mysql.md](init-mysql.md).

---

## Related Documentation

- [Database Initialization Guide](init-mysql.md) - Step-by-step guide to set up MySQL users and permissions
- [MySQL Configuration Reference](my.cnf) - Custom MySQL 8.0 configuration with performance schema settings
- [Grafana Cloud Database Observability](https://grafana.com/docs/grafana-cloud/monitor-applications/database-observability/)
- [Grafana Alloy Documentation](https://grafana.com/docs/alloy/)
- [MySQL Performance Schema Documentation](https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html)
