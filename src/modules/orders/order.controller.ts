import { RequestHandler } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
} from "./order.service.js";

export const placeOrder: RequestHandler = asyncHandler(async (req, res) => {
  const order = await createOrder(req.user!.id, req.body);

  res.status(201).json(ApiResponse.success("Order placed", order));
});

export const listMyOrders: RequestHandler = asyncHandler(async (req, res) => {
  const orders = await getMyOrders(req.user!.id);

  res.json(ApiResponse.success("Orders fetched", orders));
});

export const getOrder: RequestHandler = asyncHandler(async (req, res) => {
  const order = await getOrderById(
    String(req.params.id),
    req.user!.id,
    req.user!.role
  );

  res.json(ApiResponse.success("Order fetched", order));
});

export const listAdminOrders: RequestHandler = asyncHandler(
  async (_req, res) => {
    const orders = await getAllOrders();

    res.json(ApiResponse.success("Orders fetched", orders));
  }
);

export const editOrderStatus: RequestHandler = asyncHandler(
  async (req, res) => {
    const order = await updateOrderStatus(
      String(req.params.id),
      req.body.orderStatus,
      req.user!.id
    );

    res.json(ApiResponse.success("Order status updated", order));
  }
);
