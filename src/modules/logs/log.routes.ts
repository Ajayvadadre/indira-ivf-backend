import { Router } from "express";
import { requireAdmin } from "../../middleware/admin.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { listActivityLogs, listErrorLogs } from "./log.controller.js";

export const logRoutes = Router();

logRoutes.get("/activity-logs", authenticate, requireAdmin, listActivityLogs);

logRoutes.get("/error-logs", authenticate, requireAdmin, listErrorLogs);
