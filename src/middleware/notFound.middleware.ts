import { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
