import bcrypt from "bcrypt";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { UserModel } from "../modules/users/user.model.js";

const seedAdmin = async () => {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  }

  await connectDatabase();

  const existingAdmin = await UserModel.findOne({ email: env.ADMIN_EMAIL });

  if (existingAdmin) {
    existingAdmin.role = "admin";
    await existingAdmin.save();

    logger.info("Existing user updated to admin");
    process.exit(0);
  }

  const password = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await UserModel.create({
    name: env.ADMIN_NAME || "Admin User",
    email: env.ADMIN_EMAIL,
    password,
    role: "admin",
  });

  logger.info("Admin user created");
  process.exit(0);
};

seedAdmin().catch((error) => {
  logger.error({ error }, "Admin seed failed");
  process.exit(1);
});
