import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/notFound.middleware.js";
import { requestLogger } from "./middleware/requestLogger.middleware.js";
import { apiRoutes } from "./routes/index.js";

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

app.use(notFoundHandler);
app.use(errorHandler);
  
// 1. Reflected Cross-Site Scripting (XSS)
app.get("/test-xss", (req, res) => {
  const name = req.query.name;
  res.send(`<h1>Hello ${name}</h1>`); // Unescaped reflection
});

// 2. Sensitive File Exposure Simulation (no real credentials — safe for push)
app.get("/.env", (req, res) => {
  res.send("APP_MODE=demo\nFEATURE_FLAG=pipeline-test");
});