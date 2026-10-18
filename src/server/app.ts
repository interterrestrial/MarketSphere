import express from "express";
import { requireTrustedOrigin } from "./middleware/csrf";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiRateLimit } from "./middleware/rate-limit";
import { requestLogger } from "./middleware/request-logger";
import { securityHeaders } from "./middleware/security";
import { healthRouter } from "./routes/health.routes";
import { v1Router } from "./routes/index";

const app = express();

// Middleware order matters: logging -> headers -> parsing -> origin check ->
// rate limiting -> routes -> 404 -> errors.
app.use(requestLogger);
app.use(securityHeaders);
app.use(express.json({ limit: "1mb" }));

// Infrastructure (unversioned) + versioned business API. The origin check
// only applies to state-changing calls, so it sits in front of both.
app.use("/api", requireTrustedOrigin);
app.use("/api", healthRouter);
app.use("/api/v1", apiRateLimit, v1Router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
