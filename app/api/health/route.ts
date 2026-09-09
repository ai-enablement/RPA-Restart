import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

function getFailureReason(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (code === "ENOTFOUND") return "dns_resolution_failed";
  if (["ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH"].includes(code)) return "network_unreachable";
  if (code === "ECONNREFUSED") return "connection_refused";
  if (code === "28P01") return "authentication_failed";
  if (code === "3D000") return "database_not_found";
  if (code === "42501") return "permission_denied";
  if (message.includes("password must be a string")) return "password_not_configured";
  if (message.includes("password authentication failed")) return "authentication_failed";
  if (message.includes("no pg_hba.conf entry")) return "database_access_rule_rejected";
  if (message.includes("timeout")) return "network_timeout";
  if (message.includes("ssl")) return "ssl_mismatch";
  return "connection_failed";
}

export async function GET() {
  if (process.env.USE_DEMO_DATA === "true") {
    return NextResponse.json({ status: "ok", database: "demo" });
  }

  const requiredSettings = process.env.DATABASE_URL
    ? []
    : ["PGHOST", "PGUSER", "PGPASSWORD"].filter(
        (name) => !process.env[name]?.trim(),
      );
  if (requiredSettings.length > 0) {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unavailable",
        reason: "environment_variable_missing",
        missing: requiredSettings,
      },
      { status: 503 },
    );
  }

  try {
    await getPool().query("SELECT 1");
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    const reason = getFailureReason(error);
    console.error("Database health check failed", {
      reason,
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined,
    });
    return NextResponse.json(
      { status: "degraded", database: "unavailable", reason },
      { status: 503 },
    );
  }
}
