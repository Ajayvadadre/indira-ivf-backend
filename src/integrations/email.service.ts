import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

type OrderEmailInput = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
};

export const sendOrderEmailToAdmin = async (order: OrderEmailInput) => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.ADMIN_EMAIL) {
    throw new ApiError(500, "Email is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.SMTP_USER,
    to: env.ADMIN_EMAIL,
    subject: `New order received: ${order.orderNumber}`,
    text: `Order ${order.orderNumber} was placed by ${order.customerName} (${order.customerEmail}). Total: ${order.total}`,
  });
};
