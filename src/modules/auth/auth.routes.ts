import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { login, logout, me, register } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.validation.js";

export const authRoutes = Router();

authRoutes.post("/register", validate(registerSchema), register);

authRoutes.post("/login", validate(loginSchema), login);

authRoutes.post("/logout", authenticate, logout);

authRoutes.get("/me", authenticate, me);
