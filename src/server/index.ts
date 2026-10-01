import "dotenv/config";
import { env } from "../lib/env";
import app from "./app";

const port = env.PORT;

app.listen(port, () => {
  console.log(`[server] MarketSphere API listening on http://localhost:${port}`);
  console.log(`[server] Health check: http://localhost:${port}/api/health`);
});
