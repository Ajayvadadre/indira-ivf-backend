import { logger } from "./logger.js";
import { prisma } from "./prisma.js";

let connected = false;

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    connected = true;
    logger.info("PostgreSQL (Neon) connected via Prisma");
  } catch (error) {
    connected = false;
    logger.error(
      { error },
      "PostgreSQL connection failed. API is running, but database routes will not be ready."
    );
  }
};

export const isDatabaseConnected = () => connected;
