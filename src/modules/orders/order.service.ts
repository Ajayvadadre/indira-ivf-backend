import { prisma } from "../../config/prisma.js";
import { sendOrderEmailToAdmin } from "../../integrations/email.service.js";
import { appendOrderToSheet } from "../../integrations/googleSheets.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateOrderNumber } from "../../utils/generateOrderNumber.js";
import { createActivityLog, createErrorLog } from "../logs/log.service.js";

type CreateOrderInput = {
  customerPhone: string;
  shippingAddress: string;
};

const formatOrder = (order: any) => {
  if (!order) return null;

  return {
    ...order,
    _id: order.id,
    user: order.userId,
    items: (order.items || []).map((item: any) => ({
      ...item,
      _id: item.id,
      product: item.productId,
    })),
  };
};

export const createOrder = async (userId: string, input: CreateOrderInput) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  const orderItemsData = [];

  for (const cartItem of cart.items) {
    const product = cartItem.product;

    if (!product || !product.isActive) {
      throw new ApiError(404, "Product in cart not found");
    }

    if (product.stock < cartItem.quantity) {
      throw new ApiError(400, `Not enough stock for ${product.name}`);
    }

    orderItemsData.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: cartItem.quantity,
      total: product.price * cartItem.quantity,
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: { decrement: cartItem.quantity } },
    });
  }

  const subtotal = orderItemsData.reduce((sum, item) => sum + item.total, 0);

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: input.customerPhone,
      shippingAddress: input.shippingAddress,
      subtotal,
      total: subtotal,
      items: {
        create: orderItemsData,
      },
    },
    include: { items: true },
  });

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  await createActivityLog({
    user: userId,
    action: "ORDER_PLACED",
    entityType: "Order",
    entityId: order.id,
    message: `Order placed: ${order.orderNumber}`,
  });

  sendEmail(order.id).catch((err) => {
    console.error("Background sendEmail error:", err);
  });
  syncSheet(order.id).catch((err) => {
    console.error("Background syncSheet error:", err);
  });

  return formatOrder(order);
};

export const getMyOrders = async (userId: string) => {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(formatOrder);
};

export const getOrderById = async (
  orderId: string,
  userId: string,
  role: string
) => {
  const whereFilter =
    role === "admin" ? { id: orderId } : { id: orderId, userId };

  const order = await prisma.order.findFirst({
    where: whereFilter,
    include: { items: true },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return formatOrder(order);
};

export const getAllOrders = async () => {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(formatOrder);
};

export const updateOrderStatus = async (
  orderId: string,
  orderStatus: string,
  adminId: string
) => {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus },
    include: { items: true },
  });

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

  return formatOrder(order);
};

const sendEmail = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) return;

  try {
    await sendOrderEmailToAdmin(order);
    await prisma.order.update({
      where: { id: orderId },
      data: { emailStatus: "sent" },
    });
  } catch (error) {
    await prisma.order.update({
      where: { id: orderId },
      data: { emailStatus: "failed" },
    });

    await createErrorLog({
      message: "Admin order email failed",
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
    });
  }
};

const syncSheet = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) return;

  try {
    await appendOrderToSheet(order);
    await prisma.order.update({
      where: { id: orderId },
      data: { googleSheetStatus: "synced" },
    });
  } catch (error) {
    await prisma.order.update({
      where: { id: orderId },
      data: { googleSheetStatus: "failed" },
    });

    await createErrorLog({
      message: "Google Sheet sync failed",
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
    });
  }
};
