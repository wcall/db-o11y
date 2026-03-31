# AWS RDS PostgreSQL — Terraform Provisioning

Provisions a monitored AWS RDS PostgreSQL instance inside a dedicated VPC, with remote Terraform state stored in S3. Designed for ad hoc demo use in the `grafanalabs-solutions-engineering` AWS account (`us-west-1`).

## What Gets Provisioned

| Resource | Details |
|---|---|
| **VPC** | `10.0.0.0/16`, DNS enabled |
| **Subnets** | 2 private (RDS) + 2 public across `us-west-1a/b` |
| **Internet Gateway** | Attached to public subnets |
| **Security Group** | Port 5432 open to `allowed_cidr_blocks` |
| **RDS PostgreSQL 17** | `db.t3.medium`, gp3, encrypted, single-AZ |
| **Parameter Group** | `pg_stat_statements` + slow query logging enabled |
| **IAM Role** | Enhanced Monitoring role for RDS |
| **S3 Bucket** | `wcall-rds-postgresql-bucket` — Terraform remote state |
| **Init Scripts** | Seed data + `db-o11y` monitoring user, run automatically in order |

---

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured with SSO
- `psql` installed locally (used by Terraform `local-exec` provisioners)

### AWS Access Keys

You need an Access Key ID and Secret Access Key to configure a named AWS CLI profile.

1. Log in to the AWS Console and navigate to **IAM > Users > `<your-user>`**
2. Go to the **Security credentials** tab
3. Under **Access keys**, look up an existing key or click **Create access key**
4. Copy the **Access Key ID** and **Secret Access Key**

Then configure your local profile:

```bash
aws configure --profile grafana-se-<yourInitials>
```

Enter the values when prompted:

```
AWS Access Key ID:     <your-access-key-id>
AWS Secret Access Key: <your-secret-access-key>
Default region name:   us-west-1
Default output format: json
```

Verify it works:

```bash
aws sts get-caller-identity --profile grafana-se-<yourInitials>
```

### AWS Role Assumption

```bash
aws sts get-caller-identity --profile terraform-rds
export AWS_PROFILE=terraform-rds
```

---

## Step 1 — Bootstrap S3 Remote State Bucket

Run once before the main Terraform configuration.

```bash
cd bootstrap
terraform init
terraform apply
cd ..
```

Expected output:
```
tfstate_bucket_name = "wcall-rds-postgresql-bucket"
```

---

## Step 2 — Provision RDS and Networking

```bash
terraform init
terraform apply \
  -var="db_password=<master-password>" \
  -var="monitoring_user_password=<monitoring-password>" \
  -var='allowed_cidr_blocks=["<your-ip>/32"]'
```

> **Note:** `pg_stat_statements` requires a reboot after first apply due to `shared_preload_libraries`. Terraform handles this automatically on first provision.

Terraform will automatically run the init scripts in order after the instance is ready:
1. `01-seed.sql` — creates `wcall` schema, tables, and sample data
2. `02-monitoring.sql` — creates extensions, `db-o11y` user, and grants access to both `public` and `wcall` schemas

After the init scripts complete, reboot the instance so `pg_stat_statements` is fully active:

```bash
aws rds reboot-db-instance \
  --db-instance-identifier db-o11y-postgres \
  --profile terraform-rds \
  --region us-west-1
```

Wait for the instance to return to `available`:

```bash
aws rds wait db-instance-available \
  --db-instance-identifier db-o11y-postgres \
  --profile terraform-rds \
  --region us-west-1
```

Or poll the status manually:

```bash
aws rds describe-db-instances \
  --db-instance-identifier db-o11y-postgres \
  --profile terraform-rds \
  --region us-west-1 \
  --query 'DBInstances[0].DBInstanceStatus'
```

Expected: `"available"`

When complete, note the outputs:

```bash
terraform output db_instance_address
terraform output db_instance_port
```

---

## Step 3 — Connect to PostgreSQL

```bash
export RDS_HOST=$(terraform output -raw db_instance_address)

psql \
  --host=$RDS_HOST \
  --port=5432 \
  --username=dbadmin \
  --dbname=wcall-rds-postgresql-17
```

### List databases

```sql
\l
```

### List users

```sql
\du
```

---

## Step 4 — Verify Seed Data

```sql
SELECT c.companyname, p.productname
FROM wcall.company c
JOIN wcall.product p ON c.companyid = p.companyid
ORDER BY c.companyname;

\q
```

Expected result: 5 rows across 4 companies (`Grafana Labs`, `Azure`, `Amazon`, `Google`).

---

## Step 5 — Verify db-o11y Access

Connect as the monitoring user:

```bash
psql \
  --host=$RDS_HOST \
  --port=5432 \
  --username=db-o11y \
  --dbname=wcall-rds-postgresql-17
```

```sql
-- Verify wcall schema access
SELECT * FROM wcall.company;

-- Verify pg_stat_statements access
SELECT * FROM pg_stat_statements LIMIT 5;
```

---

## Step 6 — Verify Monitoring Extensions

```sql
-- Confirm extensions are active
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_stat_statements', 'pg_buffercache');

-- Confirm query tracking
SELECT count(*) FROM pg_stat_statements;

-- Confirm slow query log threshold (expect 1000ms)
SHOW log_min_duration_statement;

\q
```

---

## Teardown

Because this is a demo instance, `deletion_protection` is disabled and `skip_final_snapshot` is set.

```bash
terraform destroy \
  -var="db_password=<master-password>" \
  -var="monitoring_user_password=<monitoring-password>"
```

To also remove the S3 bucket (empty it first):

```bash
aws s3 rm s3://wcall-rds-postgresql-bucket --recursive
cd bootstrap && terraform destroy
```

---

---

## Running the App

The app connects your local machine to the RDS instance. Because RDS is in private subnets, you need network access first.

### Option A — SSM Port Forwarding (recommended)

```bash
aws ssm start-session \
  --target i-07c32e6bf6451e176 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{
    "host": ["db-o11y-postgres.c1udvcbskwrv.us-west-1.rds.amazonaws.com"],
    "portNumber": ["5432"],
    "localPortNumber": ["5432"]
  }' \
  --profile grafana-se-wcall
```

Then set `DB_HOST=127.0.0.1` in your `.env`.

### Option B — Temporarily enable public access

Re-apply Terraform with public access and your IP:

```bash
terraform apply \
  -var="db_password=<master-password>" \
  -var="monitoring_user_password=<monitoring-password>" \
  -var='allowed_cidr_blocks=["<your-ip>/32"]'
```

And in `main.tf` set `publicly_accessible = true` on the `aws_db_instance` resource.

### Start the backend

```bash
cd app/backend
cp .env.example .env   # fill in DB_HOST and DB_PASSWORD
npm install
npm run dev
```

Backend runs at `http://localhost:3001`.

### Start the frontend

```bash
cd app/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`. The Vite dev server proxies `/api/*` to the backend.

### API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/companies` | List all companies |
| POST | `/api/companies` | Insert a company `{ name }` |
| DELETE | `/api/companies/:id` | Delete by ID |
| DELETE | `/api/companies/cleanup` | Delete all k6 test companies (and their products) |
| GET | `/api/products` | List all products |
| GET | `/api/products/with-company` | Products with company name (JOIN) |
| POST | `/api/products` | Insert a product `{ name, company_id }` |
| DELETE | `/api/products/:id` | Delete by ID |
| DELETE | `/api/products/cleanup` | Delete all k6 test products |

---

## Running Grafana Alloy (Database Observability)

`alloy/config.alloy` configures `database_observability.postgres` and `prometheus.exporter.postgres` to collect query metrics and slow query logs, forwarding them to Grafana Cloud.

### 1 — Start the SSM tunnel (port 5433)

```bash
aws ssm start-session \
  --target i-07c32e6bf6451e176 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{
    "host": ["db-o11y-postgres.c1udvcbskwrv.us-west-1.rds.amazonaws.com"],
    "portNumber": ["5432"],
    "localPortNumber": ["5433"]
  }' \
  --profile grafana-se-wcall
```

Keep this terminal open. The tunnel forwards `localhost:5433` → RDS port `5432`.

### 2 — Update the DSN string and port in config.alloy

`config.alloy` defaults to `127.0.0.1:5432`. Change both DSN strings to `host.docker.internal:5433`:

```
postgres://db-o11y:<monitoring-user-password>@host.docker.internal:5433/wcallrdspostgresql17?sslmode=require
```

### 3 — Set Grafana Cloud env vars

Fill in `alloy/setenv.sh` (gitignored) and source it:

```bash
source alloy/setenv.sh
```

### 4 — Run Alloy

```bash
docker pull grafana/alloy:v1.15.0

docker run --rm \
  --network host \
  -v "$(pwd)/alloy:/etc/alloy" \
  -e GCLOUD_PROMETHEUS_URL \
  -e GCLOUD_PROMETHEUS_USERNAME \
  -e GCLOUD_PROMETHEUS_PASSWORD \
  -e GCLOUD_LOKI_URL \
  -e GCLOUD_LOKI_USERNAME \
  -e GCLOUD_LOKI_PASSWORD \
  grafana/alloy:v1.15.0 \
  run --stability.level=public-preview /etc/alloy/config.alloy
```

Alloy connects to `localhost:5433` (tunnelled to RDS), scrapes `pg_stat_statements`, and streams query samples and explain plans to Grafana Cloud.

---

## Running k6 Load Tests

Requires [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) and the backend running on `http://localhost:3001`.

### insert-test.js — short-lived (~7 min)

Inserts k6-prefixed companies and products across 5 VUs. Cleans up all inserted rows in teardown.

```bash
K6_NO_USAGE_REPORT=true k6 run k6/insert-test.js
```

### query-test.js — long-running (~27 min)

Two concurrent scenarios: `list_companies` (3 VUs) and `join_products` (5 VUs). Read-only — no teardown needed.

```bash
K6_NO_USAGE_REPORT=true k6 run k6/query-test.js
```

### mixed-test.js — mixed (~14 min)

Concurrent writers (3 VUs inserting) and readers (8 VUs querying). Cleans up in teardown.

```bash
K6_NO_USAGE_REPORT=true k6 run k6/mixed-test.js
```

### Custom base URL

```bash
K6_NO_USAGE_REPORT=true k6 run -e BASE_URL=http://localhost:3001 k6/insert-test.js
```

---

## File Structure

```
AWS-RDS-PostgreSQL/
├── bootstrap/
│   ├── versions.tf             # Standalone provider for bucket creation
│   └── main.tf                 # S3 remote state bucket
├── init/
│   ├── 01-seed.sql             # wcall schema, tables, and sample data (runs first)
│   └── 02-monitoring.sql       # db-o11y user, extensions, and schema grants (runs second)
├── app/
│   ├── backend/
│   │   ├── package.json
│   │   ├── .env.example
│   │   ├── db.js               # pg connection pool
│   │   ├── server.js           # Express app + middleware
│   │   └── routes/
│   │       ├── companies.js    # CRUD + k6 cleanup for wcall.company
│   │       └── products.js     # CRUD + JOIN + k6 cleanup for wcall.product
│   └── frontend/
│       ├── package.json
│       ├── vite.config.js      # Proxies /api to backend
│       ├── index.html
│       └── src/
│           ├── App.jsx         # Nav + page routing
│           ├── api.js          # fetch helpers
│           └── pages/
│               ├── InsertPage.jsx   # Forms for company and product insertion
│               └── QueryPage.jsx    # Tables for companies and JOIN query
├── alloy/
│   ├── config.alloy            # Grafana Alloy config for database observability
│   └── setenv.sh               # Grafana Cloud credentials (gitignored — fill in locally)
├── k6/
│   ├── utils.js                # BASE_URL, random name, helpers
│   ├── checks.js               # Reusable k6 check functions
│   ├── insert-test.js          # Short-lived insert test (~7 min)
│   ├── query-test.js           # Long-running query test (~27 min)
│   └── mixed-test.js           # Mixed concurrent insert + query (~14 min)
├── versions.tf                 # S3 backend + provider config
├── variables.tf                # Input variables
├── main.tf                     # VPC, subnets, RDS, IAM, parameter group, init runners
└── outputs.tf                  # Endpoint, VPC, subnet IDs
```
