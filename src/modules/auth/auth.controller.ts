import { RequestHandler } from "express";
import { createActivityLog } from "../logs/log.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getCurrentUser, loginUser, registerUser } from "./auth.service.js";

export const register: RequestHandler = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);

  res.status(201).json(ApiResponse.success("User registered successfully", result));
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);

  await createActivityLog({
    user: result.user.id,
    action: "USER_LOGIN",
    entityType: "User",
    entityId: result.user.id,
    message: `${result.user.email} logged in`,
  });

  res.json(ApiResponse.success("User logged in successfully", result));
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  await createActivityLog({
    user: req.user?.id,
    action: "USER_LOGOUT",
    entityType: "User",
    entityId: req.user?.id,
    message: "User logged out",
  });

  res.json(ApiResponse.success("User logged out successfully"));
});

export const me: RequestHandler = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user!.id);

  res.json(ApiResponse.success("Current user fetched successfully", user));
});
