import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { UserModel } from "../users/user.model.js";
import { LoginInput, RegisterInput } from "./auth.validation.js";

const passwordSaltRounds = 10;

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await UserModel.findOne({ email: input.email });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(input.password, passwordSaltRounds);

  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });

  const token = createToken(user.id, user.role);

  return {
    token,
    user: formatUser(user),
  };
};

export const loginUser = async (input: LoginInput) => {
  const user = await UserModel.findOne({ email: input.email }).select(
    "+password"
  );

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "User account is inactive");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = createToken(user.id, user.role);

  return {
    token,
    user: formatUser(user),
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await UserModel.findById(userId);

  if (!user || !user.isActive) {
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
  _id: unknown;
  name: string;
  email: string;
  role: string;
}) => {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
};
