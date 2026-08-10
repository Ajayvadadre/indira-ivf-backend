import { prisma } from "../../config/prisma.js";

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
  await prisma.activityLog.create({
    data: {
      userId: input.user || null,
      action: input.action,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      message: input.message,
    },
  });
};

export const createErrorLog = async (input: ErrorInput) => {
  await prisma.errorLog.create({
    data: {
      message: input.message,
      stack: input.stack || null,
      method: input.method || null,
      path: input.path || null,
      statusCode: input.statusCode || null,
      userId: input.user || null,
    },
  });
};

export const getActivityLogs = async () => {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};

export const getErrorLogs = async () => {
  return prisma.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};
