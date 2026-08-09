import { IncomingMessage, ServerResponse } from "node:http";
import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";

export const requestLogger = pinoHttp<IncomingMessage, ServerResponse>({
  logger,

  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";

    return "info";
  },

  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} completed with ${res.statusCode}`,

  customErrorMessage: (req, res, _error) =>
    `${req.method} ${req.url} failed with ${res.statusCode}`,
});
