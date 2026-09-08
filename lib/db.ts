import { Pool } from "pg";

const globalForDb = globalThis as unknown as { rpaPool?: Pool };

function createPool() {
  const sslMode = process.env.PGSSLMODE?.toLowerCase();
  return new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.PGHOST || undefined,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "rpa_db",
    user: process.env.PGUSER || undefined,
    password: process.env.PGPASSWORD || undefined,
    // node-postgres treats PGSSLMODE=prefer as an SSL request without libpq-style
    // fallback. This on-premises server is non-SSL, so only opt in explicitly.
    ssl: sslMode === "require" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export function getPool() {
  globalForDb.rpaPool ??= createPool();
  return globalForDb.rpaPool;
}
