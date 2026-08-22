import { config } from "./config.js";
import { buildServer } from "./server.js";

const app = buildServer();
await app.listen({ port: config.port, host: "0.0.0.0" });
