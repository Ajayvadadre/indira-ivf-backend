import { RequestHandler } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getActivityLogs, getErrorLogs } from "./log.service.js";

export const listActivityLogs: RequestHandler = asyncHandler(
  async (_req, res) => {
    const logs = await getActivityLogs();

    res.json(ApiResponse.success("Activity logs fetched", logs));
  }
);

export const listErrorLogs: RequestHandler = asyncHandler(async (_req, res) => {
  const logs = await getErrorLogs();

  res.json(ApiResponse.success("Error logs fetched", logs));
});
