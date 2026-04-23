import mysql from 'mysql2/promise';
import 'dotenv/config';

const port = parseInt(process.env.DB_PORT || '3306', 10);
const database = process.env.DB_NAME ?? 'super_awesome_application';
const user = process.env.DB_USER ?? 'root';
const password = process.env.DB_PASSWORD;
const host = process.env.DB_HOST ?? 'localhost';

const debugEnabled =
  process.env.DB_DEBUG === '1' || process.env.DB_DEBUG?.toLowerCase() === 'true';
if (debugEnabled) {
  console.log('[db] pool config', { host, port, database, user });
}

const pool = mysql.createPool({
  host,
  port,
  database,
  user,
  password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
});

export default pool;
