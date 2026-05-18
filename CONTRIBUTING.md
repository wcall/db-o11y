# Contributing

Thanks for your interest in improving this repo.

## Project Overview

This repository provides Docker Compose and Terraform setups for monitoring MySQL 8, local PostgreSQL 15, and AWS RDS PostgreSQL 17 with Grafana Alloy, shipping metrics and logs to Grafana Cloud. Each stack lives in its own top-level directory and is independently runnable.

---

## Contribution Workflow

1. **Fork** the repository on GitHub.
2. **Clone** your fork and add the upstream remote:
   ```bash
   git clone https://github.com/<your-user>/db-o11y.git
   cd db-o11y
   git remote add upstream https://github.com/wcall/db-o11y.git
   ```
3. **Branch** off `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feat/<short-description>
   ```
4. **Commit** your changes (see commit style below). Never commit directly to `main`.
5. **Push** to your fork and open a **pull request** against `main` in this repo.
6. Address review feedback by pushing additional commits to the same branch.

---

## Branch Naming

Use a prefix that describes the change, then a short kebab-case summary:

| Prefix | Use for |
|---|---|
| `feat/` | New features, new integrations, new scripts |
| `fix/` | Bug fixes, broken configs, incorrect docs |
| `docs/` | Documentation-only changes |
| `chore/` | Tooling, cleanup, dependency bumps, config tweaks |
| `refactor/` | Restructuring without behavior change |

Examples: `feat/oracle-stack`, `fix/postgres-alloy-socket`, `docs/k6-readme-update`.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <imperative summary>

<optional body explaining the why>
```

Types match the branch prefixes above (`feat`, `fix`, `docs`, `chore`, `refactor`).

Examples:
- `feat: add Oracle observability stack`
- `fix: grant alloy access to docker socket under podman`
- `chore: remove unused Alloy components`

Keep the summary under 70 characters. Use the body to explain motivation, not implementation detail that's already visible in the diff.

---

## Local Development Setup

All local stacks read credentials from a single `.env` at the repo root. Start by copying the template:

```bash
cp .env.example .env
# then edit .env and fill in your Grafana Cloud credentials
```

### MySQL stack

```bash
cd mysql
docker compose --env-file ../.env up -d
# phpMyAdmin: http://localhost:8080   Alloy UI: http://localhost:12345
docker compose --env-file ../.env down       # stop
docker compose --env-file ../.env down -v    # stop + wipe volumes
```

To run the k6 load test (requires `K6_CLOUD_*` and `K6_MYSQL_*` in `.env`):

```bash
docker compose --env-file ../.env run --rm k6
```

### PostgreSQL stack

```bash
cd postgresql
docker compose --env-file ../.env up -d
# pgAdmin: http://localhost:5050   Alloy UI: http://localhost:12345
```

To exercise the collectors with mixed query load:

```bash
docker exec db-o11y-postgres psql -U wcall -d super_awesome_application \
  -f /tmp/generate_load.sql
```

### AWS RDS PostgreSQL stack

This stack provisions real AWS infrastructure (VPC, RDS, S3) via Terraform and tunnels to it through an SSM bastion. It costs money to run. Follow [`AWS-RDS-PostgreSQL/README.md`](AWS-RDS-PostgreSQL/README.md) end-to-end; do not skip the teardown step when you're done.

Before opening a PR that touches this stack, run `terraform plan` against your own AWS account and confirm the plan is what you expect.

---

## What Contributions Are Welcome

- **New database integrations** (Oracle, SQL Server, MongoDB, etc.) following the same one-directory-per-stack pattern
- **Alloy config improvements** — additional collectors, better relabeling, reduced cardinality, healthier defaults
- **k6 load test scripts** — new query mixes, scenarios for specific bottlenecks, support for additional databases
- **Documentation** — clearer setup steps, fixed instructions, troubleshooting recipes you've actually used
- **Bug fixes** — anything in the repo that doesn't work as described

For larger changes (new stack, breaking config change), open an issue first to discuss scope.

---

## Pull Request Checklist

Before requesting review, confirm:

- [ ] Changes have been **tested locally** — the affected stack starts cleanly and Alloy ships data
- [ ] **No secrets** committed — `.env` is gitignored and stays that way; no credentials, API keys, or passwords in code, configs, or commit messages
- [ ] **Docs updated** — if you changed setup steps, env vars, ports, or component behavior, the relevant README reflects it
- [ ] **`.env.example` updated** if you added new environment variables
- [ ] Branch name and commit messages follow the conventions above
- [ ] PR title is a Conventional Commit (e.g. `feat: add Oracle stack`)

---

## Reporting Issues

Open issues on GitHub. Use one of two shapes:

**Bug report** — include:
- Which stack (`mysql`, `postgresql`, `AWS-RDS-PostgreSQL`)
- Your environment (OS, Docker/Podman version, Terraform version if applicable)
- Steps to reproduce
- What you expected vs. what happened
- Relevant logs (`docker logs db-o11y-alloy`, `terraform apply` output) with secrets redacted

**Feature request** — include:
- The use case you're trying to solve
- What you've tried so far
- Whether you're willing to send a PR

Keep titles specific. "PostgreSQL log parser drops multi-line statements" beats "logs broken."

---

## Security

**Never commit `.env`.** It's listed in `.gitignore` for a reason. If you accidentally stage it, unstage before committing. If you accidentally push it, rotate every credential it contained — git history is permanent.

Use [`.env.example`](.env.example) as the source of truth for which variables exist. When you add a new variable, add it to `.env.example` with a placeholder value in the same PR.
