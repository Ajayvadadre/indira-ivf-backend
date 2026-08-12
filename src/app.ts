import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/notFound.middleware.js";
import { requestLogger } from "./middleware/requestLogger.middleware.js";
import { apiRoutes } from "./routes/index.js";
import { vaptDemoRoutes } from "./routes/vapt-demo.routes.js";

export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use("/api", apiRoutes);

// VAPT demo surface — intentional OWASP test cases for CI scanning
app.use("/api/vapt-demo", vaptDemoRoutes);

// Legacy paths kept for ZAP regression baselines
app.get("/test-xss", (req, res) => {
  const name = req.query.name;
  res.send(`<h1>Hello ${name}</h1>`);
});

app.get("/.env", (_req, res) => {
  res.send("APP_MODE=demo\nFEATURE_FLAG=pipeline-test");
});

app.use(notFoundHandler);
app.use(errorHandler);