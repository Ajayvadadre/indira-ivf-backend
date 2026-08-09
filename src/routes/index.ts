import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { cartRoutes } from "../modules/cart/cart.routes.js";
import { logRoutes } from "../modules/logs/log.routes.js";
import { adminOrderRoutes, orderRoutes } from "../modules/orders/order.routes.js";
import {
  adminProductRoutes,
  productRoutes,
} from "../modules/products/product.routes.js";
import { healthRoutes } from "./health.routes.js";

export const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/products", productRoutes);
apiRoutes.use("/cart", cartRoutes);
apiRoutes.use("/orders", orderRoutes);
apiRoutes.use("/admin/products", adminProductRoutes);
apiRoutes.use("/admin/orders", adminOrderRoutes);
apiRoutes.use("/admin", logRoutes);
