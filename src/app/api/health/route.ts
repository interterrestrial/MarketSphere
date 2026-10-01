import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/api-response";

/**
 * Next.js health-check endpoint (mirrors the Express `/api/health`).
 * Uses the same response envelope so both stacks speak one shape.
 */
export async function GET() {
  let database: "connected" | "disconnected" = "disconnected";
  try {
    await db.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "disconnected";
  }

  if (database === "connected") {
    return NextResponse.json(ok({ status: "ok", database, timestamp: new Date().toISOString() }), {
      status: 200,
    });
  }
  return NextResponse.json(
    fail("DATABASE_UNAVAILABLE", "The app cannot reach the database.", { database }),
    { status: 503 }
  );
}
