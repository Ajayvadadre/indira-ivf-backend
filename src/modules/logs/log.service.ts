import { ActivityLogModel } from "./activityLog.model.js";
import { ErrorLogModel } from "./errorLog.model.js";

type ActivityInput = {
  user?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  message: string;
};

type ErrorInput = {
  message: string;
  stack?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  user?: string;
};

export const createActivityLog = async (input: ActivityInput) => {
  await ActivityLogModel.create(input);
};

export const createErrorLog = async (input: ErrorInput) => {
  await ErrorLogModel.create(input);
};

export const getActivityLogs = async () => {
  return ActivityLogModel.find().sort({ createdAt: -1 }).limit(100);
};

export const getErrorLogs = async () => {
  return ErrorLogModel.find().sort({ createdAt: -1 }).limit(100);
};
