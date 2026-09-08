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
    ssl: sslMode === "require" ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export function getPool() {
  globalForDb.rpaPool ??= createPool();
  return globalForDb.rpaPool;
}
