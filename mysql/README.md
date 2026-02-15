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
└── mysql/
    ├── README.md                     # This file
    ├── compose.yaml                  # Docker Compose configuration
    ├── my.cnf                        # MySQL 8.0 configuration
    ├── init-mysql.md                 # Database initialization guide
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
