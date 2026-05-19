// src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { config } from "dotenv";
import { getCookie } from "hono/cookie"; // Add this import

// Load environment variables FIRST
config();

// Import after config to ensure env vars are loaded
import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import sendRoutes from "./routes/send";
import reportRoutes from "./routes/report";
import configRoutes from "./routes/config";
import dashboardRoutes from "./routes/dashboard";
import contactsRoutes from "./routes/contacts";
import campaignsRoutes from "./routes/campaigns";

const app = new Hono();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use("*", logger());

// ── Public routes (no auth) ───────────────────────────────────────────────────
// Mount auth routes BEFORE the wildcard authMiddleware
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

    const { userDatabase } = await import("./services/userDatabase");
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
// Apply auth middleware to all /api/* routes except auth and health
app.use("/api/*", authMiddleware);

// Mount protected routes
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
  console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || "http://localhost:3000"}`);

  // Ensure required directories exist
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
  console.log(`\n📋 Available API endpoints:`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   POST   /api/auth/logout`);
  console.log(`   GET    /api/user/info`);
  console.log(`   GET    /api/dashboard/stats`);
  console.log(`   GET    /api/contacts`);
  console.log(`   POST   /api/contacts`);
  console.log(`   GET    /api/campaigns`);
  console.log(`   POST   /api/campaigns`);
  console.log(`   GET    /api/campaigns/:id`);
  console.log(`   PUT    /api/campaigns/:id`);
  console.log(`   DELETE /api/campaigns/:id`);
  console.log(`   POST   /api/campaigns/:id/send`);
  console.log(`   GET    /api/campaigns/:id/stats`);
  console.log(`   GET    /api/config/smtp`);
  console.log(`   POST   /api/config/smtp`);
  console.log(`   POST   /api/send/bulk`);
  console.log(`   GET    /api/report/stats`);
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