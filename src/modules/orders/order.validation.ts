import { z } from "zod";

export const createOrderSchema = z.object({
  body: z.object({
    customerPhone: z.string().min(1, "Customer phone is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    orderStatus: z.string().min(1, "Order status is required"),
  }),
});
