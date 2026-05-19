// src/middleware/auth.ts
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { getCookie } from "hono/cookie";
import { userDatabase, type User } from "../services/userDatabase";

// Extend Hono's Context VariableMap
declare module "hono" {
  interface ContextVariableMap {
    user: User;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const path = c.req.path;

  // Public paths — skip auth
  const publicPaths = ["/api/auth/login", "/api/auth/register", "/health", "/api/user/info"];
  if (publicPaths.some((p) => path === p || path.startsWith(p + "/"))) {
    return await next();
  }

  // Try Authorization header first, then cookie
  let token = c.req.header("Authorization")?.replace("Bearer ", "").trim();
  if (!token) {
    token = getCookie(c, "session_token");
  }

  if (!token) {
    return c.json({ success: false, message: "Authentication required" }, 401);
  }

  const user = userDatabase.validateSession(token);
  if (!user) {
    return c.json({ success: false, message: "Invalid or expired session" }, 401);
  }

  // Store user in context variables
  c.set("user", user);
  return await next();
}

/**
 * Helper to get the authenticated user from context.
 * Throws a proper HTTP 401 response if not authenticated.
 */
export function requireAuth(c: Context): User {
  const user = c.get("user") as User | undefined;
  if (!user) {
    throw new HTTPException(401, { message: "User not authenticated" });
  }
  return user;
}

/**
 * Optional: Get user if authenticated, returns null otherwise
 */
export function getUser(c: Context): User | null {
  return c.get("user") as User | undefined || null;
}