import { RequestHandler } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  getProductById,
  getProducts,
  updateProduct,
} from "./product.service.js";

export const listProducts: RequestHandler = asyncHandler(async (_req, res) => {
  const products = await getProducts();

  res.json(ApiResponse.success("Products fetched", products));
});

export const listAdminProducts: RequestHandler = asyncHandler(
  async (_req, res) => {
    const products = await getAdminProducts();

    res.json(ApiResponse.success("Products fetched", products));
  }
);

export const getProduct: RequestHandler = asyncHandler(async (req, res) => {
  const product = await getProductById(String(req.params.id));

  res.json(ApiResponse.success("Product fetched", product));
});

export const addProduct: RequestHandler = asyncHandler(async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const product = await createProduct(req.body, files, req.user!.id);

  res.status(201).json(ApiResponse.success("Product created", product));
});

export const editProduct: RequestHandler = asyncHandler(async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const product = await updateProduct(
    String(req.params.id),
    req.body,
    files,
    req.user!.id
  );

  res.json(ApiResponse.success("Product updated", product));
});

export const removeProduct: RequestHandler = asyncHandler(async (req, res) => {
  const product = await deleteProduct(String(req.params.id), req.user!.id);

  res.json(ApiResponse.success("Product deleted", product));
});
