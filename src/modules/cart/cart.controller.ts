import { RequestHandler } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "./cart.service.js";

export const getMyCart: RequestHandler = asyncHandler(async (req, res) => {
  const cart = await getCart(req.user!.id);

  res.json(ApiResponse.success("Cart fetched", cart));
});

export const addItem: RequestHandler = asyncHandler(async (req, res) => {
  const cart = await addToCart(
    req.user!.id,
    req.body.productId,
    req.body.quantity
  );

  res.status(201).json(ApiResponse.success("Item added to cart", cart));
});

export const updateItem: RequestHandler = asyncHandler(async (req, res) => {
  const cart = await updateCartItem(
    req.user!.id,
    String(req.params.productId),
    req.body.quantity
  );

  res.json(ApiResponse.success("Cart item updated", cart));
});

export const removeItem: RequestHandler = asyncHandler(async (req, res) => {
  const cart = await removeCartItem(req.user!.id, String(req.params.productId));

  res.json(ApiResponse.success("Cart item removed", cart));
});

export const clearMyCart: RequestHandler = asyncHandler(async (req, res) => {
  const cart = await clearCart(req.user!.id);

  res.json(ApiResponse.success("Cart cleared", cart));
});
