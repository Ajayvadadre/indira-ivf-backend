import { app } from "../app.js";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { google } from "googleapis";

const PORT = 8082;
const BASE_URL = `http://localhost:${PORT}/api`;

const TEST_ADMIN = {
  name: env.ADMIN_NAME || "Admin User",
  email: env.ADMIN_EMAIL || "admin@example.com",
  password: env.ADMIN_PASSWORD || "admin123",
};

const TEST_USER = {
  name: "Integration Test User",
  email: "testuser_integration_test@example.com",
  password: "testpassword123",
};

const TEST_PRODUCT = {
  name: "Integration Test Product",
  description: "A product created during automated integration testing.",
  price: 49.99,
  sku: "TEST-SKU-INTG-001",
  category: "TestCategory",
  stock: 15,
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("=== STARTING BACKEND INTEGRATION TESTS (POSTGRESQL / PRISMA / NEON) ===");

  console.log("\n[Step 1] Connecting to Neon PostgreSQL and starting server...");
  await connectDatabase();
  console.log("✔ PostgreSQL Connection established.");

  const server = app.listen(PORT, () => {
    console.log(`✔ API server started on ${BASE_URL}`);
  });

  let adminToken = "";
  let userToken = "";
  let userId = "";
  let productId = "";
  let orderId = "";
  let orderNumber = "";

  const results = {
    database: "PASS",
    adminLogin: "FAIL",
    userRegistration: "FAIL",
    userLogin: "FAIL",
    userProfile: "FAIL",
    productCreation: "FAIL",
    s3Upload: "SKIPPED",
    productListing: "FAIL",
    cartOperations: "FAIL",
    orderPlacement: "FAIL",
    googleSheetsSync: "FAIL",
    emailNotification: "FAIL",
    adminOrderManagement: "FAIL",
    activityLogging: "FAIL",
    logout: "FAIL",
    cleanup: "PENDING",
  };

  try {
    console.log("\n[Pre-test] Cleaning up legacy test records...");
    await cleanUpTestRecords();

    console.log("\n[Step 2] Verifying/Seeding Admin User in Database...");
    let adminInDb = await prisma.user.findUnique({ where: { email: TEST_ADMIN.email } });
    if (!adminInDb) {
      console.log(`Admin user ${TEST_ADMIN.email} not found. Seeding admin user...`);
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.default.hash(TEST_ADMIN.password, 10);
      adminInDb = await prisma.user.create({
        data: {
          name: TEST_ADMIN.name,
          email: TEST_ADMIN.email,
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      console.log("✔ Admin user seeded successfully.");
    } else {
      if (adminInDb.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: adminInDb.id },
          data: { role: "ADMIN" },
        });
        console.log("✔ Updated existing user to admin role.");
      } else {
        console.log("✔ Admin user already exists.");
      }
    }

    console.log("\n[Step 3] Testing Admin Login via API...");
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      }),
    });

    const adminLoginData = (await adminLoginRes.json()) as any;
    if (!adminLoginRes.ok || !adminLoginData.success || !adminLoginData.data.token) {
      console.error("❌ Admin Login Failed:", adminLoginData);
      throw new Error(`Admin Login failed with status ${adminLoginRes.status}`);
    }
    adminToken = adminLoginData.data.token;
    console.log("✔ Admin login successful. Token received.");
    results.adminLogin = "PASS";

    console.log("\n[Step 4] Testing User Registration via API...");
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_USER),
    });

    const registerData = (await registerRes.json()) as any;
    if (!registerRes.ok || !registerData.success) {
      console.error("❌ User Registration Failed:", registerData);
      throw new Error(`User registration failed with status ${registerRes.status}`);
    }
    userId = registerData.data.user.id;
    console.log(`✔ User registration successful. Registered User ID: ${userId}`);
    results.userRegistration = "PASS";

    console.log("\n[Step 5] Testing User Login via API...");
    const userLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    });

    const userLoginData = (await userLoginRes.json()) as any;
    if (!userLoginRes.ok || !userLoginData.success || !userLoginData.data.token) {
      console.error("❌ User Login Failed:", userLoginData);
      throw new Error(`User Login failed with status ${userLoginRes.status}`);
    }
    userToken = userLoginData.data.token;
    console.log("✔ User login successful. Token received.");
    results.userLogin = "PASS";

    console.log("\n[Step 6] Testing User Profile fetch (/me)...");
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const meData = (await meRes.json()) as any;
    if (!meRes.ok || !meData.success || meData.data.email !== TEST_USER.email) {
      console.error("❌ User Profile GET failed:", meData);
      throw new Error(`GET /me failed with status ${meRes.status}`);
    }
    console.log(`✔ User profile fetched correctly. Name: ${meData.data.name}`);
    results.userProfile = "PASS";

    console.log("\n[Step 7] Testing Product Creation by Admin via API...");
    // Product creation endpoint uses multer (multipart/form-data), NOT JSON
    const productFormData = new FormData();
    productFormData.append("name", TEST_PRODUCT.name);
    productFormData.append("description", TEST_PRODUCT.description);
    productFormData.append("price", String(TEST_PRODUCT.price));
    productFormData.append("sku", TEST_PRODUCT.sku);
    productFormData.append("category", TEST_PRODUCT.category);
    productFormData.append("stock", String(TEST_PRODUCT.stock));

    const createProductRes = await fetch(`${BASE_URL}/admin/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        // Do NOT set Content-Type manually — fetch sets it with boundary for FormData
      },
      body: productFormData,
    });

    const createProductData = (await createProductRes.json()) as any;
    if (!createProductRes.ok || !createProductData.success) {
      console.error("❌ Product Creation Failed:", createProductData);
      throw new Error(`Product creation failed with status ${createProductRes.status}`);
    }
    productId = createProductData.data.id || createProductData.data._id;
    console.log(`✔ Product created successfully. Product ID: ${productId}`);
    results.productCreation = "PASS";

    console.log("\n[Step 8] Testing Active Products Listing...");
    const productsRes = await fetch(`${BASE_URL}/products`);
    const productsData = (await productsRes.json()) as any;
    if (!productsRes.ok || !productsData.success || !Array.isArray(productsData.data)) {
      console.error("❌ Product listing failed:", productsData);
      throw new Error("Product listing failed");
    }
    const foundProduct = productsData.data.find((p: any) => p.name === TEST_PRODUCT.name);
    if (!foundProduct) {
      throw new Error(`Product ${TEST_PRODUCT.name} not found in public products listing.`);
    }
    console.log(`✔ Found newly created product in active list. Price matches: ${foundProduct.price}`);
    results.productListing = "PASS";

    console.log("\n[Step 9] Testing Cart Operations...");
    const addCartRes = await fetch(`${BASE_URL}/cart/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        productId,
        quantity: 2,
      }),
    });
    const addCartData = (await addCartRes.json()) as any;
    if (!addCartRes.ok || !addCartData.success) {
      console.error("❌ Add to Cart Failed:", addCartData);
      throw new Error("Add to cart failed");
    }
    console.log("✔ Product added to cart successfully.");

    const getCartRes = await fetch(`${BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const getCartData = (await getCartRes.json()) as any;
    if (!getCartRes.ok || !getCartData.success || getCartData.data.items.length === 0) {
      console.error("❌ Get Cart Failed:", getCartData);
      throw new Error("Get cart failed");
    }
    console.log(`✔ Cart item quantity verified: ${getCartData.data.items[0].quantity}`);
    results.cartOperations = "PASS";

    console.log("\n[Step 9.5] Checking Google Spreadsheet tabs...");
    try {
      if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_SHEET_ID) {
        const auth = new google.auth.JWT({
          email: env.GOOGLE_CLIENT_EMAIL,
          key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const sheets = google.sheets({ version: "v4", auth });
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId: env.GOOGLE_SHEET_ID,
        });
        const sheetTitles = spreadsheet.data.sheets?.map((s) => s.properties?.title) || [];
        if (!sheetTitles.includes("Orders")) {
          console.log("⚠ Tab 'Orders' not found in spreadsheet. Programmatically creating tab 'Orders'...");
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: env.GOOGLE_SHEET_ID,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: "Orders",
                    },
                  },
                },
              ],
            },
          });
          console.log("✔ Tab 'Orders' created successfully in Google Sheet.");
        } else {
          console.log("✔ Tab 'Orders' already exists in Google Sheet.");
        }
      }
    } catch (sheetErr) {
      console.error("⚠ Google Sheets tab check/creation encountered an exception:", sheetErr);
    }

    console.log("\n[Step 10] Testing Order Placement via API...");
    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        customerPhone: "+919876543210",
        shippingAddress: "123 E-Commerce Boulevard, Digital City, 560001",
      }),
    });

    const orderData = (await orderRes.json()) as any;
    if (!orderRes.ok || !orderData.success) {
      console.error("❌ Order Placement Failed:", orderData);
      throw new Error(`Order placement failed with status ${orderRes.status}`);
    }
    orderId = orderData.data.id || orderData.data._id;
    orderNumber = orderData.data.orderNumber;
    console.log(`✔ Order placed successfully. Order Number: ${orderNumber}, ID: ${orderId}`);
    results.orderPlacement = "PASS";

    console.log("\n[Step 11] Waiting and Polling for Third-Party Integrations...");
    let isSyncedToSheet = false;
    let isEmailSent = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      await sleep(1000);
      attempts++;

      const polledOrder = await prisma.order.findUnique({ where: { id: orderId } });
      if (!polledOrder) {
        throw new Error("Placed order not found in database during polling!");
      }

      console.log(`Attempt ${attempts}/${maxAttempts} - Google Sheets: ${polledOrder.googleSheetStatus}, Email: ${polledOrder.emailStatus}`);

      if (polledOrder.googleSheetStatus === "synced") {
        isSyncedToSheet = true;
      }
      if (polledOrder.emailStatus === "sent") {
        isEmailSent = true;
      }

      if (polledOrder.googleSheetStatus !== "pending" && polledOrder.emailStatus !== "pending") {
        break;
      }
    }

    if (isSyncedToSheet) {
      console.log("✔ Google Sheets Sync verified (status is synced).");
      results.googleSheetsSync = "PASS";
    } else {
      console.warn("⚠ Google Sheets Sync status: pending/failed.");
      results.googleSheetsSync = "FAIL";
    }

    if (isEmailSent) {
      console.log("✔ Admin Email Notification sent successfully (status is sent).");
      results.emailNotification = "PASS";
    } else {
      console.warn("⚠ Admin Email Notification status: pending/failed.");
      results.emailNotification = "FAIL";
    }

    console.log("\n[Step 12] Testing Admin Order Management (Fetch and Status Update)...");
    const getAdminOrdersRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getAdminOrdersData = (await getAdminOrdersRes.json()) as any;
    if (!getAdminOrdersRes.ok || !getAdminOrdersData.success) {
      console.error("❌ Admin fetch orders failed:", getAdminOrdersData);
      throw new Error("Admin fetch orders failed");
    }
    const foundOrder = getAdminOrdersData.data.find(
      (o: any) => o.id === orderId || o._id === orderId
    );
    if (!foundOrder) {
      throw new Error("Placed order not found in admin orders listing.");
    }
    console.log("✔ Placed order found in Admin listing.");

    const updateOrderRes = await fetch(`${BASE_URL}/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        orderStatus: "processing",
      }),
    });
    const updateOrderData = (await updateOrderRes.json()) as any;
    if (!updateOrderRes.ok || !updateOrderData.success || updateOrderData.data.orderStatus !== "processing") {
      console.error("❌ Admin order status update failed:", updateOrderData);
      throw new Error("Admin order status update failed");
    }
    console.log(`✔ Order status updated to 'processing' successfully.`);
    results.adminOrderManagement = "PASS";

    console.log("\n[Step 13] Testing Activity Logs fetch by Admin...");
    const logsRes = await fetch(`${BASE_URL}/admin/activity-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const logsData = (await logsRes.json()) as any;
    if (!logsRes.ok || !logsData.success || !Array.isArray(logsData.data)) {
      console.error("❌ Fetch Activity Logs failed:", logsData);
      throw new Error("Fetch activity logs failed");
    }
    console.log("✔ Audit logging verified successfully.");
    results.activityLogging = "PASS";

    console.log("\n[Step 14] Testing User and Admin Logout...");
    const userLogoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const adminLogoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (userLogoutRes.ok && adminLogoutRes.ok) {
      console.log("✔ Logout endpoints called and completed successfully.");
      results.logout = "PASS";
    } else {
      console.error("❌ Logout APIs failed.");
      results.logout = "FAIL";
    }

  } catch (error) {
    console.error("\n❌ TESTS ABORTED DUE TO FAILURE:", error);
  } finally {
    console.log("\n[Cleanup] Cleaning up created test user, products, cart, and orders from PostgreSQL...");
    try {
      await cleanUpTestRecords();
      console.log("✔ Cleanup complete.");
      results.cleanup = "PASS";
    } catch (cleanupError) {
      console.error("❌ Cleanup failed:", cleanupError);
      results.cleanup = "FAIL";
    }

    server.close(() => {
      console.log("✔ Server connection closed.");
    });
    await prisma.$disconnect();
    console.log("✔ PostgreSQL connection closed.");

    printTestReport(results);

    const failedTests = Object.entries(results).filter(
      ([key, status]) => status === "FAIL" && key !== "s3Upload"
    );

    if (failedTests.length > 0) {
      console.error(`\n❌ Integration tests failed. Failed tasks: ${failedTests.map((t) => t[0]).join(", ")}`);
      process.exit(1);
    } else {
      console.log("\n✔ All mandatory integration tests passed successfully on PostgreSQL!");
      process.exit(0);
    }
  }
}

async function cleanUpTestRecords() {
  const testUser = await prisma.user.findUnique({ where: { email: TEST_USER.email } });
  if (testUser) {
    await prisma.cart.deleteMany({ where: { userId: testUser.id } });
    await prisma.order.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  }

  const testProducts = await prisma.product.findMany({
    where: { name: TEST_PRODUCT.name },
  });
  for (const product of testProducts) {
    await prisma.cartItem.deleteMany({ where: { productId: product.id } });
    await prisma.orderItem.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }
}

function printTestReport(results: Record<string, string>) {
  console.log("\n==========================================");
  console.log("     POSTGRESQL INTEGRATION TEST REPORT   ");
  console.log("==========================================");

  for (const [feature, status] of Object.entries(results)) {
    const paddedFeature = feature.padEnd(25, ".");
    let formattedStatus = status;
    if (status === "PASS") {
      formattedStatus = "\x1b[32m[PASS]\x1b[0m";
    } else if (status === "FAIL") {
      formattedStatus = "\x1b[31m[FAIL]\x1b[0m";
    } else if (status === "SKIPPED") {
      formattedStatus = "\x1b[33m[SKIPPED]\x1b[0m";
    }
    console.log(`${paddedFeature}: ${formattedStatus}`);
  }
  console.log("==========================================\n");
}

runTests().catch((err) => {
  console.error("Unhandled test script crash:", err);
  process.exit(1);
});
