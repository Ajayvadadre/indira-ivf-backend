import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PORT: z.coerce.number().default(5000),

  CLIENT_URL: z.string().url(),

  DATABASE_URL: z.string().optional(),

  MONGO_URI: z.string().optional(),

  JWT_SECRET: z.string().min(20, "JWT_SECRET must be at least 20 characters"),

  JWT_EXPIRES_IN: z.string().default("7d"),

  ADMIN_EMAIL: z.string().email().optional(),

  ADMIN_NAME: z.string().optional(),

  ADMIN_PASSWORD: z.string().optional(),

  AWS_ACCESS_KEY_ID: z.string().optional(),

  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  AWS_REGION: z.string().optional(),

  S3_BUCKET_NAME: z.string().optional(),

  SMTP_HOST: z.string().optional(),

  SMTP_PORT: z.coerce.number().optional(),

  SMTP_USER: z.string().optional(),

  SMTP_PASS: z.string().optional(),

  GOOGLE_CLIENT_EMAIL: z.string().optional(),

  GOOGLE_PRIVATE_KEY: z.string().optional(),

  GOOGLE_SHEET_ID: z.string().optional(),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid environment variables",
    parsedEnv.error.flatten().fieldErrors
  );

  process.exit(1);
}

export const env = parsedEnv.data;
