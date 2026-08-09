import { google } from "googleapis";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

type SheetOrderInput = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  orderStatus: string;
};

export const appendOrderToSheet = async (order: SheetOrderInput) => {
  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_SHEET_ID) {
    throw new ApiError(500, "Google Sheets is not configured");
  }

  const auth = new google.auth.JWT({
    email: env.GOOGLE_CLIENT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: "Orders!A:F",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          order.orderNumber,
          order.customerName,
          order.customerEmail,
          order.customerPhone,
          order.total,
          order.orderStatus,
        ],
      ],
    },
  });
};
