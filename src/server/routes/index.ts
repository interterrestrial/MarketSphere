import { Router } from "express";
import { authRouter } from "./auth.routes";

/**
 * Versioned API router (Task 3: route registration).
 *
 * Convention (see docs/API-Conventions.md): business resources live under
 * `/api/v1/...`; infrastructure endpoints (`/api/health`) stay unversioned.
 * Resource routers (auth, products, orders, …) mount here in later phases:
 *
 *   v1Router.use("/products", productsRouter);
 */
export const v1Router = Router();

v1Router.use("/auth", authRouter);
