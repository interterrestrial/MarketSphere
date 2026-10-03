import { Router } from "express";
import { authRouter } from "./auth.routes";
import { businessProfileRouter } from "./business-profile.routes";
import { orderRouter } from "./order.routes";
import { productRouter } from "./product.routes";

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
v1Router.use("/business-profile", businessProfileRouter);
v1Router.use("/products", productRouter);
v1Router.use("/orders", orderRouter);
