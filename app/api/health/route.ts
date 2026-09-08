import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  if (process.env.USE_DEMO_DATA === "true") {
    return NextResponse.json({ status: "ok", database: "demo" });
  }
  try {
    await getPool().query("SELECT 1");
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 });
  }
}
