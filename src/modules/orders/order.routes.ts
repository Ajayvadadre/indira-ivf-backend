import { Router } from "express";
import { requireAdmin } from "../../middleware/admin.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  editOrderStatus,
  getOrder,
  listAdminOrders,
  listMyOrders,
  placeOrder,
} from "./order.controller.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "./order.validation.js";

export const orderRoutes = Router();
export const adminOrderRoutes = Router();

orderRoutes.use(authenticate);

orderRoutes.post("/", validate(createOrderSchema), placeOrder);
orderRoutes.get("/my", listMyOrders);
orderRoutes.get("/:id", getOrder);

adminOrderRoutes.get("/", authenticate, requireAdmin, listAdminOrders);
adminOrderRoutes.patch(
  "/:id/status",
  authenticate,
  requireAdmin,
  validate(updateOrderStatusSchema),
  editOrderStatus
);
