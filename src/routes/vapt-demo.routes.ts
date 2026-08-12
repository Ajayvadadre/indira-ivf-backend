/**
 * INTENTIONAL VAPT DEMO ROUTES
 *
 * Real-world vulnerability patterns teams often ship and scanners catch later.
 * Mounted at /api/vapt-demo/* — remove before production hardening.
 *
 * Coverage map:
 * - Semgrep (SAST): injection, XSS, SSRF, path traversal, weak crypto, hardcoded secrets
 * - OWASP ZAP (DAST): open redirect, XSS, info disclosure, CORS, cookie flags
 * - GitLeaks: see ../config/vapt-demo.secrets.ts
 */
import { exec } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { VAPT_DEMO_SECRETS } from "../config/vapt-demo.secrets.js";
import { OrderModel } from "../modules/orders/order.model.js";
import { UserModel } from "../modules/users/user.model.js";

const execAsync = promisify(exec);

export const vaptDemoRoutes = Router();

// --- A01: Broken Access Control ---

/** IDOR — fetch any order by ID with no ownership check */
vaptDemoRoutes.get("/orders/:id", async (req, res) => {
  const order = await OrderModel.findById(req.params.id).lean();
  res.json(order);
});

/** Missing auth — "admin" action with no middleware */
vaptDemoRoutes.delete("/users/:id", async (req, res) => {
  await UserModel.findByIdAndDelete(req.params.id);
  res.json({ deleted: req.params.id });
});

// --- A02: Cryptographic Failures ---

/** MD5 for password hashing — weak and deprecated */
vaptDemoRoutes.post("/hash-password", (req, res) => {
  const { password } = req.body as { password?: string };
  const hash = crypto.createHash("md5").update(password ?? "").digest("hex");
  res.json({ hash });
});

/** Hardcoded JWT secret fallback — common in rushed MVPs */
vaptDemoRoutes.post("/issue-token", (req, res) => {
  const { userId } = req.body as { userId?: string };
  const token = jwt.sign(
    { sub: userId },
    VAPT_DEMO_SECRETS.jwtFallbackSecret,
    { algorithm: "HS256", expiresIn: "30d" }
  );
  res.json({ token });
});

// --- A03: Injection ---

/** NoSQL injection — user-controlled filter object passed to MongoDB */
vaptDemoRoutes.get("/users/search", async (req, res) => {
  const filter = JSON.parse(String(req.query.filter ?? "{}"));
  const users = await UserModel.find(filter).select("name email role").lean();
  res.json(users);
});

/** OS command injection — unsanitized input in shell command */
vaptDemoRoutes.get("/ping", async (req, res) => {
  const host = String(req.query.host ?? "127.0.0.1");
  const { stdout } = await execAsync(`ping -c 1 ${host}`);
  res.type("text/plain").send(stdout);
});

/** Code injection via eval — still seen in legacy Node services */
vaptDemoRoutes.get("/calc", (req, res) => {
  const expression = String(req.query.expr ?? "1+1");
  const result = eval(expression);
  res.json({ result });
});

// --- A04: Insecure Design ---

/** Mass assignment — trusts entire request body for updates */
vaptDemoRoutes.patch("/users/:id/profile", async (req, res) => {
  const user = await UserModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(user);
});

/** Sensitive data in logs — passwords logged during "debug" */
vaptDemoRoutes.post("/login-debug", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  console.log("[vapt-demo] login attempt", { email, password });
  res.json({ logged: true });
});

// --- A05: Security Misconfiguration ---

/** Debug endpoint left enabled — leaks runtime details */
vaptDemoRoutes.get("/debug", (_req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    demoSecretsLoaded: Boolean(VAPT_DEMO_SECRETS.internalApiToken),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

/** Permissive CORS on a single route — misconfiguration pattern */
vaptDemoRoutes.get("/cors-test", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.json({ cors: "wildcard-enabled" });
});

/** Insecure cookie flags — common session mistakes */
vaptDemoRoutes.get("/set-session", (_req, res) => {
  res.cookie("vapt_session", "demo-session-id", {
    httpOnly: false,
    secure: false,
    sameSite: "none",
  });
  res.json({ cookieSet: true });
});

// --- A06: Vulnerable Components / A07: Auth failures handled above ---

// --- A08: Software & Data Integrity — N/A for route demo ---

// --- A09: Logging & Monitoring failures ---

/** Verbose stack traces returned to clients */
vaptDemoRoutes.get("/error", (_req, res) => {
  try {
    throw new Error("Intentional VAPT demo failure");
  } catch (error) {
    res.status(500).type("text/plain").send((error as Error).stack ?? "error");
  }
});

// --- A10: SSRF ---

/** Server-side request forgery — fetches arbitrary user URL */
vaptDemoRoutes.get("/fetch-url", async (req, res) => {
  const target = String(req.query.url ?? "");
  const response = await fetch(target);
  const body = await response.text();
  res.type("text/plain").send(body.slice(0, 2000));
});

// --- Classic web issues ---

/** Reflected XSS — unescaped HTML reflection */
vaptDemoRoutes.get("/xss", (req, res) => {
  const name = req.query.name;
  res.send(`<h1>Hello ${name}</h1>`);
});

/** Open redirect — phishing vector via ?next= */
vaptDemoRoutes.get("/redirect", (req, res) => {
  res.redirect(String(req.query.next ?? "/"));
});

/** Path traversal — user input in file read path */
vaptDemoRoutes.get("/read-file", (req, res) => {
  const fileName = String(req.query.file ?? "notes.txt");
  const filePath = path.join(process.cwd(), "uploads", fileName);
  const contents = fs.readFileSync(filePath, "utf8");
  res.type("text/plain").send(contents);
});

/** Sensitive path exposure — simulates leaked .env (no real secrets) */
vaptDemoRoutes.get("/dotenv-leak", (_req, res) => {
  res.type("text/plain").send(
    "APP_MODE=demo\nFEATURE_FLAG=vapt-demo\nINTERNAL_TOKEN=redacted-for-demo"
  );
});
