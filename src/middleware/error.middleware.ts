import { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { createErrorLog } from "../modules/logs/log.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  const message =
    error instanceof ApiError ? error.message : "Internal server error";

  logger.error(
    {
      error,
      method: req.method,
      path: req.path,
      statusCode,
    },
    "Request failed"
  );

  // Fire-and-forget: never let a logging failure crash the response
  // userId is intentionally omitted — the JWT user may not exist in the current DB
  void createErrorLog({
    message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    statusCode,
  }).catch((logErr) => {
    logger.warn({ logErr }, "createErrorLog failed silently");
  });

  res.status(statusCode).json(
    ApiResponse.error(message, {
      stack: env.NODE_ENV === "development" ? error.stack : undefined,
    })
  );
};
