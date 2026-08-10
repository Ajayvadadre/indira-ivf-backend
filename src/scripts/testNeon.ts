import "dotenv/config";
import { prisma } from "../config/prisma.js";

async function main() {
  console.log("Connecting to Neon PostgreSQL...");
  const usersCount = await prisma.user.count();
  console.log("Connected successfully! Current users count:", usersCount);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Neon connection error:", err);
  process.exit(1);
});
