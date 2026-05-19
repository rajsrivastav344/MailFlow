// backend/src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { config } from "dotenv";
import { getCookie } from "hono/cookie";

config();

import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import sendRoutes from "./routes/send.js";
import reportRoutes from "./routes/report.js";
import configRoutes from "./routes/config.js";
import dashboardRoutes from "./routes/dashboard.js";
import contactsRoutes from "./routes/contacts.js";
import campaignsRoutes from "./routes/campaigns.js";

const app = new Hono();

// ─── 1. CORS — must be the very first middleware ───────────────────────────
app.use(
  "*",
  cors({
    origin: "https://mail-flow-gules.vercel.app",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use("*", logger());

// ─── 2. Short-circuit ALL preflight requests before auth can block them ────
app.options("*", (c) => c.body(null, 204));

// ─── 3. Public routes (no auth required) ──────────────────────────────────
app.get("/health", (c) => c.json({ status: "OK", version: "3.0.0" }));

app.route("/api/auth", authRoutes);

app.get("/api/user/info", async (c) => {
  try {
    const token = getCookie(c, "session_token");
    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }
    const { userDatabase } = await import("./services/userDatabase.js");
    const user = userDatabase.validateSession(token);
    if (!user) {
      return c.json({ success: false, message: "Session expired" }, 401);
    }
    return c.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return c.json({ success: false, message: "Error fetching user info" }, 500);
  }
});

// ─── 4. Auth guard — applied AFTER the OPTIONS short-circuit ──────────────
app.use("/api/*", authMiddleware);

// ─── 5. Protected routes ──────────────────────────────────────────────────
app.route("/api/send", sendRoutes);
app.route("/api/report", reportRoutes);
app.route("/api/config", configRoutes);
app.route("/api/smtp", configRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/contacts", contactsRoutes);
app.route("/api/campaigns", campaignsRoutes);

// ─── 6. 404 handler ───────────────────────────────────────────────────────
app.notFound((c) => {
  console.log(`404 Not Found: ${c.req.method} ${c.req.path}`);
  return c.json({ success: false, message: "Endpoint not found" }, 404);
});

// ─── 7. Global error handler ──────────────────────────────────────────────
app.onError((err, c) => {
  console.error("Application error:", err);
  return c.json({ success: false, message: "Internal Server Error" }, 500);
});

// ─── 8. Server startup ────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 8080;

async function startServer() {
  console.log("🚀 Starting Bulk Email Sender API...");
  console.log(`🔗 CORS Origin: https://mail-flow-gules.vercel.app`);

  const directories = ["./data", "./uploads", "./logs"];
  for (const dir of directories) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }

  serve({ fetch: app.fetch, port });
  console.log(`\n✅ API Server running on http://localhost:${port}`);
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

startServer().catch(console.error);