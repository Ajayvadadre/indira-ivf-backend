import { Router } from "express";
import { requireAdmin } from "../../middleware/admin.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { upload } from "../../middleware/upload.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  addProduct,
  editProduct,
  getProduct,
  listAdminProducts,
  listProducts,
  removeProduct,
} from "./product.controller.js";
import {
  createProductSchema,
  updateProductSchema,
} from "./product.validation.js";

export const productRoutes = Router();
export const adminProductRoutes = Router();

productRoutes.get("/", listProducts);
productRoutes.get("/:id", getProduct);

adminProductRoutes.get("/", authenticate, requireAdmin, listAdminProducts);
adminProductRoutes.post(
  "/",
  authenticate,
  requireAdmin,
  upload.array("images", 5),
  validate(createProductSchema),
  addProduct
);
adminProductRoutes.patch(
  "/:id",
  authenticate,
  requireAdmin,
  upload.array("images", 5),
  validate(updateProductSchema),
  editProduct
);
adminProductRoutes.delete("/:id", authenticate, requireAdmin, removeProduct);
