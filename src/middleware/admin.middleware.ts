import { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== "admin") {
    return next(new ApiError(403, "Admin access required"));
  }

  next();
};
