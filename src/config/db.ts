import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

export const connectDatabase = async () => {

  try {
    mongoose.set("strictQuery", true);

    await mongoose.connect(env.MONGO_URI);

    logger.info("MongoDB connected");
  } catch (error) {
    logger.error(
      {
        error,
        mongoUriHost: getMongoUriHost(env.MONGO_URI),
      },
      "MongoDB connection failed. API is still running, but database routes will not be ready."
    );
  }
};

const getMongoUriHost = (mongoUri: string) => {
  
  try {
    return new URL(mongoUri).host;
  } catch {
    return "invalid-mongo-uri";
  }
};

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;
