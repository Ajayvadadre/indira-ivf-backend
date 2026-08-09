import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  addItem,
  clearMyCart,
  getMyCart,
  removeItem,
  updateItem,
} from "./cart.controller.js";
import { addCartItemSchema, updateCartItemSchema } from "./cart.validation.js";

export const cartRoutes = Router();

cartRoutes.use(authenticate);

cartRoutes.get("/", getMyCart);
cartRoutes.post("/items", validate(addCartItemSchema), addItem);
cartRoutes.patch(
  "/items/:productId",
  validate(updateCartItemSchema),
  updateItem
);
cartRoutes.delete("/items/:productId", removeItem);
cartRoutes.delete("/", clearMyCart);
