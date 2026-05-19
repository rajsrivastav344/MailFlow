// src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { config } from "dotenv";
import { getCookie } from "hono/cookie";

// Load environment variables FIRST
config();

// Import after config to ensure env vars are loaded
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import sendRoutes from "./routes/send.js";
import reportRoutes from "./routes/report.js";
import configRoutes from "./routes/config.js";
import dashboardRoutes from "./routes/dashboard.js";
import contactsRoutes from "./routes/contacts.js";
import campaignsRoutes from "./routes/campaigns.js";

const app = new Hono();

// ── CORS CONFIGURATION (Fixed) ────────────────────────────────────────────────
// Get allowed origins from environment variable
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(',')
  .map(o => o.trim());

// Simple approach: allow specific origins or use a function that returns the origin
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use("*", cors({
  origin: corsOrigin,  // Use string directly instead of function
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Set-Cookie"],
  maxAge: 86400,
}));

app.use("*", logger());

// ── OR use this approach for multiple origins (Commented) ────────────────────
// If you need multiple origins, use this pattern instead:
/*
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  const allowedOrigins = [
    "http://localhost:3000",
    "https://mail-flow-gules.vercel.app",
    "https://*.vercel.app"
  ];
  
  if (allowedOrigins.some(allowed => 
    allowed === origin || 
    (allowed.includes('*') && origin?.match(new RegExp(allowed.replace('*', '.*'))))
  )) {
    c.header("Access-Control-Allow-Origin", origin || "");
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    c.header("Access-Control-Max-Age", "86400");
  }
  
  if (c.req.method === "OPTIONS") {
    return c.text("", 204);
  }
  
  await next();
});
*/

// ── Public routes (no auth) ───────────────────────────────────────────────────
app.route("/api/auth", authRoutes);

// Health check (public)
app.get("/health", (c) => c.json({ status: "OK", version: "3.0.0" }));

// User info endpoint (public - it validates the token internally)
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return c.json({ success: false, message: "Error fetching user info" }, 500);
  }
});

// ── Protected routes ──────────────────────────────────────────────────────────
app.use("/api/*", authMiddleware);

app.route("/api/send", sendRoutes);
app.route("/api/report", reportRoutes);
app.route("/api/config", configRoutes);
app.route("/api/smtp", configRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/contacts", contactsRoutes);
app.route("/api/campaigns", campaignsRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.notFound((c) => {
  console.log(`404 Not Found: ${c.req.method} ${c.req.path}`);
  return c.json({ success: false, message: "Endpoint not found" }, 404);
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error("Application error:", err);
  return c.json(
    {
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  );
});

// ── Start server ──────────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 8080;

async function startServer() {
  console.log("🚀 Starting Bulk Email Sender API...");
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 CORS Origin: ${corsOrigin}`);

  const directories = ["./data", "./uploads", "./logs"];
  for (const dir of directories) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }

  serve({ fetch: app.fetch, port });

  console.log(`\n✅ API Server running on http://localhost:${port}`);
  console.log(`   Health check: http://localhost:${port}/health`);
  console.log(`   Auth endpoint: http://localhost:${port}/api/auth/login`);
  console.log(`   User info: http://localhost:${port}/api/user/info`);
  console.log(`   Dashboard: http://localhost:${port}/api/dashboard/stats`);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down server...");
  process.exit(0);
});

startServer().catch(console.error);