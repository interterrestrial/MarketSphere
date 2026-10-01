import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Next.js health-check endpoint (mirrors the Express `/api/health`).
 * Proves the Next.js stack can reach PostgreSQL via Prisma.
 */
export async function GET() {
  let database: "connected" | "disconnected" = "disconnected";
  try {
    await db.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "disconnected";
  }

  const healthy = database === "connected";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
