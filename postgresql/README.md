# DB Observability Docker Compose Setup

This Docker Compose setup runs PostgreSQL 15 with Grafana Alloy for database observability, sending metrics and logs to Grafana Cloud.

---

## Prerequisites

- Docker and Docker Compose installed
- Grafana Cloud account with Prometheus and Loki endpoints configured
- `.env` file in parent directory with required credentials

---

## How to Run

### 1. Navigate to the postgresql directory

```bash
cd <YourPath>/db-o11y/postgresql
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

### PostgreSQL Database

| Property | Value |
|----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `super_awesome_application` |
| Username | `admin@admin.com` |
| Password | `admin` |

### pgAdmin Web Interface

- **URL**: http://localhost:5050
- **Email**: `admin@admin.com`
- **Password**: `admin`

#### To connect to PostgreSQL from pgAdmin:

1. Right-click **"Servers"** → **"Register"** → **"Server"**
2. **Name**: `db-o11y-postgres`
3. **Connection** tab:
   - **Host**: `postgres` (use service name, not localhost)
   - **Port**: `5432`
   - **Database**: `super_awesome_application`
   - **Username**: `admin@admin.com`
   - **Password**: `admin`

### Grafana Alloy

- **UI**: http://localhost:12345
- **Health**: http://localhost:12345/-/healthy
- **Ready**: http://localhost:12345/-/ready

---

## Notes

### Environment Variables

- The `.env` file is located in the parent directory (`../`), not in the postgresql directory
- Always use `--env-file ../.env` when running docker compose commands
- The `.env` file contains sensitive credentials and is excluded from git

### PostgreSQL Configuration

- Uses custom `postgresql.conf` from the postgresql directory
- Database credentials are stored as environment variables
- Data persists in a Docker volume named `postgres_data`

### Alloy Configuration

- `config.alloy` uses environment variables for Grafana Cloud credentials
- Connects to PostgreSQL using service name `postgres` (not localhost)
- Sends metrics to Grafana Cloud Prometheus
- Sends logs to Grafana Cloud Loki
- **Enabled collectors**: `query_details`, `schema_details`, `query_samples`, `explain_plans`

### Networking

- All services run on a bridge network named `db-o11y-network`
- Services communicate using their service names (`postgres`, `pgadmin`, `alloy`)
- Only exposed ports are accessible from the host

---

## Troubleshooting

### If Alloy can't connect to PostgreSQL

- Ensure PostgreSQL is fully started (check logs)
- Verify connection string uses `postgres` not `localhost`
- Check that both services are on the same network

### If pgAdmin can't connect to PostgreSQL

- Use service name `postgres` as host, not `localhost`
- Verify PostgreSQL is running:
  ```bash
  docker compose --env-file ../.env ps
  ```

### If metrics/logs aren't appearing in Grafana Cloud

- Check Alloy logs:
  ```bash
  docker compose --env-file ../.env logs alloy
  ```
- Verify `GCLOUD_*` environment variables are set correctly in `../.env`
- Confirm Grafana Cloud credentials are valid

### To reset everything

```bash
# Stop services and remove volumes
docker compose --env-file ../.env down -v

# Remove volumes (if needed)
docker volume rm postgresql_postgres_data

# Restart
docker compose --env-file ../.env up -d
```

---

## Generating Query Load

`generate_load.sql` runs 30 mixed statements against the database:

- **80%** normal queries (selects, aggregations, window functions, subqueries)
- **10%** intentional errors (missing relation, division by zero, invalid cast)
- **10%** complex / slow queries (exceed `log_min_duration_statement` threshold)

Copy the file into the container and run it:

```bash
docker cp generate_load.sql db-o11y-postgres:/tmp/generate_load.sql
docker exec db-o11y-postgres psql -U db-o11y -d super_awesome_application -f /tmp/generate_load.sql
```

Or if the file is already copied:

```bash
docker exec db-o11y-postgres psql -U db-o11y -d super_awesome_application -f /tmp/generate_load.sql
```

---

## File Structure

```
/Users/wei-chincall/Workspace/grafana/db-o11y/
├── .env                              # Environment variables (NOT in git)
└── postgresql/
    ├── README.md                     # This file
    ├── compose.yaml                  # Docker Compose configuration
    ├── postgresql.conf               # PostgreSQL configuration
    ├── init.sql                      # Database initialization (runs on first start)
    ├── generate_load.sql             # Mixed query load generator
    ├── init-postgres.md              # Database initialization guide
    └── alloy/
        └── config.alloy              # Alloy configuration
```

---

## Security Reminders

⚠️ **Important Security Notes:**

- The `.env` file contains sensitive credentials and API keys
- Never commit `.env` to version control
- Change default passwords (`admin/admin`) in production environments
- Grafana Cloud API keys should be rotated regularly

---

## Related Documentation

- [Database Initialization Guide](init-postgres.md) - Step-by-step guide to set up PostgreSQL schema and users
- [Grafana Cloud Database Observability](https://grafana.com/docs/grafana-cloud/monitor-applications/database-observability/)
- [Grafana Alloy Documentation](https://grafana.com/docs/alloy/)
