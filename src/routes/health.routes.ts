import { Router } from "express";
import { isDatabaseConnected } from "../config/db.js";
import { env } from "../config/env.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const healthRoutes = Router();

healthRoutes.get("/health", (_req, res) => {
  res.json(
    ApiResponse.success("API is running", {
      service: "ecommerce-api",
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      pipelineTestId: "vapt-cicd-test-2026-08-12",
    })
  );
});

healthRoutes.get("/pipeline-test", (_req, res) => {
  res.json(
    ApiResponse.success("CI/CD pipeline test endpoint", {
      pipelineTestId: "vapt-cicd-test-2026-08-12",
      purpose: "Verify GitHub Actions trigger + Render deploy",
      scannedBy: ["gitleaks", "semgrep", "nmap", "owasp-zap"],
    })
  );
});

healthRoutes.get("/ready", (_req, res) => {
  const databaseConnected = isDatabaseConnected();

  res.status(databaseConnected ? 200 : 503).json(
    ApiResponse.success(
      databaseConnected ? "API is ready" : "API is not ready",
      {
        database: databaseConnected ? "connected" : "disconnected",
      }
    )
  );
});
