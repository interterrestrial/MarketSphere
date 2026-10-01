import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { healthRouter } from "./routes/health.routes";
import { v1Router } from "./routes/index";

const app = express();

// Middleware order matters: logging -> parsing -> routes -> 404 -> errors.
app.use(requestLogger);
app.use(express.json({ limit: "1mb" }));

// Infrastructure (unversioned) + versioned business API.
app.use("/api", healthRouter);
app.use("/api/v1", v1Router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
