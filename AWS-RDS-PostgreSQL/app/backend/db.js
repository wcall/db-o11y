import pg from 'pg';
import 'dotenv/config';

/** Trim .env values — leading/trailing spaces break RDS auth. */
function envTrim(value) {
  if (value == null) return value;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

// AWS RDS requires TLS. Use default (SSL on) through SSM port-forward — the handshake is tunneled to RDS.
// Set DB_SSL=false only for local Postgres / tunnels that truly do not speak TLS to the server.
function poolSsl() {
  const v = process.env.DB_SSL?.toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  return { rejectUnauthorized: false };
}

const ssl = poolSsl();
const port = parseInt(process.env.DB_PORT || '5433', 10);
// Must match Terraform `var.db_name` (RDS initial database name).
const database = envTrim(process.env.DB_NAME) ?? 'wcallrdspostgresql17';
const user = envTrim(process.env.DB_USER) ?? 'dbadmin';
const password = envTrim(process.env.DB_PASSWORD);
const host = envTrim(process.env.DB_HOST);

const debugEnabled =
  process.env.DB_DEBUG === '1' || process.env.DB_DEBUG?.toLowerCase() === 'true';
if (debugEnabled) {
  const logPassword =
    process.env.DB_DEBUG_LOG_PASSWORD === '1' ||
    process.env.DB_DEBUG_LOG_PASSWORD?.toLowerCase() === 'true'
      ? password
      : password != null && password !== ''
        ? `(set, length ${String(password).length})`
        : '(unset)';
  console.log('[db] pool config', {
    ssl,
    host,
    port,
    database,
    user,
    password: logPassword,
  });
}

const pool = new pg.Pool({
  host,
  port,
  database,
  user,
  password,
  ssl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export default pool;
