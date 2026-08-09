import { sendOrderEmailToAdmin } from "../../integrations/email.service.js";
import { appendOrderToSheet } from "../../integrations/googleSheets.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateOrderNumber } from "../../utils/generateOrderNumber.js";
import { CartModel } from "../cart/cart.model.js";
import { createActivityLog, createErrorLog } from "../logs/log.service.js";
import { ProductModel } from "../products/product.model.js";
import { UserModel } from "../users/user.model.js";
import { OrderModel } from "./order.model.js";

type CreateOrderInput = {
  customerPhone: string;
  shippingAddress: string;
};

export const createOrder = async (userId: string, input: CreateOrderInput) => {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const cart = await CartModel.findOne({ user: userId });

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  const orderItems = [];

  for (const cartItem of cart.items) {
    const product = await ProductModel.findById(cartItem.product);

    if (!product || !product.isActive) {
      throw new ApiError(404, "Product in cart not found");
    }

    if (product.stock < cartItem.quantity) {
      throw new ApiError(400, `Not enough stock for ${product.name}`);
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: cartItem.quantity,
      total: product.price * cartItem.quantity,
    });

    product.stock -= cartItem.quantity;
    await product.save();
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);

  const order = await OrderModel.create({
    orderNumber: generateOrderNumber(),
    user: userId,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: input.customerPhone,
    shippingAddress: input.shippingAddress,
    items: orderItems,
    subtotal,
    total: subtotal,
  });

  cart.set("items", []);

  await cart.save();

  await createActivityLog({
    user: userId,
    action: "ORDER_PLACED",
    entityType: "Order",
    entityId: order.id,
    message: `Order placed: ${order.orderNumber}`,
  });

  // Trigger background integrations without blocking checkout response
  sendEmail(order.id).catch((err) => {
    console.error("Background sendEmail error:", err);
  });
  syncSheet(order.id).catch((err) => {
    console.error("Background syncSheet error:", err);
  });

  return order;
};

export const getMyOrders = async (userId: string) => {
  return OrderModel.find({ user: userId }).sort({ createdAt: -1 });
};

export const getOrderById = async (orderId: string, userId: string, role: string) => {
  const filter = role === "admin" ? { _id: orderId } : { _id: orderId, user: userId };
  const order = await OrderModel.findOne(filter);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return order;
};

export const getAllOrders = async () => {
  return OrderModel.find().sort({ createdAt: -1 });
};

export const updateOrderStatus = async (orderId: string, orderStatus: string, adminId: string) => {
  const order = await OrderModel.findByIdAndUpdate(
    orderId,
    { orderStatus },
    { new: true }
  );

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  await createActivityLog({
    user: adminId,
    action: "ORDER_STATUS_UPDATED",
    entityType: "Order",
    entityId: order.id,
    message: `Order status updated: ${order.orderNumber}`,
  });

  return order;
};

const sendEmail = async (orderId: string) => {
  const order = await OrderModel.findById(orderId);

  if (!order) return;

  try {
    await sendOrderEmailToAdmin(order);
    order.emailStatus = "sent";
    await order.save();
  } catch (error) {
    order.emailStatus = "failed";
    await order.save();

    await createErrorLog({
      message: "Admin order email failed",
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
    });
  }
};

const syncSheet = async (orderId: string) => {
  const order = await OrderModel.findById(orderId);

  if (!order) return;

  try {
    await appendOrderToSheet(order);
    order.googleSheetStatus = "synced";
    await order.save();
  } catch (error) {
    order.googleSheetStatus = "failed";
    await order.save();

    await createErrorLog({
      message: "Google Sheet sync failed",
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
    });
  }
};
