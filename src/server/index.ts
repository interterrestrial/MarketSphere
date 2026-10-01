import "dotenv/config";
import { env } from "../lib/env";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import app from "./app";

async function main(): Promise<void> {
  // Fail fast when PostgreSQL is unreachable instead of serving 503s.
  await db.$connect();

  const server = app.listen(env.PORT, () => {
    logger.info(`MarketSphere API listening on http://localhost:${env.PORT}`);
    logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}; shutting down.`);
    server.close(() => {
      void db.$disconnect().then(() => {
        logger.info("Shutdown complete.");
        process.exit(0);
      });
    });
    // If connections hang, force exit rather than stalling deploys.
    setTimeout(() => {
      logger.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  logger.error(`Failed to start API: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
