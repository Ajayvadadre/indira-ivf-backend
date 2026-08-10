import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { LoginInput, RegisterInput } from "./auth.validation.js";

const passwordSaltRounds = 10;

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(input.password, passwordSaltRounds);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
    },
  });

  const roleString = user.role === "ADMIN" ? "admin" : "user";
  const token = createToken(user.id, roleString);

  return {
    token,
    user: formatUser(user),
  };
};

export const loginUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const roleString = user.role === "ADMIN" ? "admin" : "user";
  const token = createToken(user.id, roleString);

  return {
    token,
    user: formatUser(user),
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  return formatUser(user);
};

const createToken = (userId: string, role: string) => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      id: userId,
      role,
    },
    env.JWT_SECRET,
    options
  );
};

const formatUser = (user: {
  id: string;
  name: string;
  email: string;
  role: string;
}) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === "ADMIN" ? "admin" : "user",
  };
};
