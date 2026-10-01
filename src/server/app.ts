import express, { type Request, type Response } from "express";
import { db } from "../lib/db";

const app = express();
app.use(express.json());

app.get("/api/health", async (_req: Request, res: Response) => {
  let database: "connected" | "disconnected" = "disconnected";
  try {
    await db.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "disconnected";
  }

  const healthy = database === "connected";
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    database,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

export default app;
