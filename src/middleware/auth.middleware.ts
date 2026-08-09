import jwt from "jsonwebtoken";
import { RequestHandler } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { UserRole } from "../modules/users/user.model.js";

type JwtPayload = {
  id: string;
  role: UserRole;
};

export const authenticate: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication token is required"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = {
      id: payload.id,
      role: payload.role,
    };

    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
};
