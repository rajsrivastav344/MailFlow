// src/routes/auth.ts
import { Hono } from "hono";
import { userDatabase } from "../services/userDatabase";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";

const app = new Hono();
const COOKIE_NAME = "session_token";

/** REGISTER */
app.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return c.json(
        { success: false, message: "Email, name and password are required" },
        400
      );
    }

    if (password.length < 6) {
      return c.json(
        { success: false, message: "Password must be at least 6 characters" },
        400
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ success: false, message: "Invalid email format" }, 400);
    }

    const userId = await userDatabase.createUser(email, name, password);
    const token = await userDatabase.createSession(userId);

    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return c.json({
      success: true,
      message: "Account created successfully",
      token,  // also return token for Bearer auth
      user: { id: userId, email, name },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    if (error.message === "Email already exists") {
      return c.json({ success: false, message: "Email already exists" }, 409);
    }
    return c.json({ success: false, message: "Registration failed" }, 500);
  }
});

/** LOGIN */
app.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json(
        { success: false, message: "Email and password are required" },
        400
      );
    }

    const user = await userDatabase.authenticateUser(
      email.toLowerCase(),
      password
    );

    if (!user) {
      return c.json(
        { success: false, message: "Invalid email or password" },
        401
      );
    }

    const token = await userDatabase.createSession(user.id);

    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    console.log(`✅ Login successful: ${email}`);

    return c.json({
      success: true,
      message: "Login successful",
      token,  // also return token for Bearer auth (used by Next.js frontend)
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ success: false, message: "Login failed" }, 500);
  }
});

/** LOGOUT */
app.post("/logout", (c) => {
  const token =
    getCookie(c, COOKIE_NAME) ||
    c.req.header("Authorization")?.replace("Bearer ", "").trim();

  if (token) userDatabase.deleteSession(token);

  deleteCookie(c, COOKIE_NAME, { path: "/" });

  return c.json({ success: true, message: "Logged out successfully" });
});

/** ME — works with both cookie and Bearer token */
app.get("/me", (c) => {
  const token =
    getCookie(c, COOKIE_NAME) ||
    c.req.header("Authorization")?.replace("Bearer ", "").trim();

  if (!token) {
    return c.json({ success: false, message: "Not authenticated" }, 401);
  }

  const user = userDatabase.validateSession(token);
  if (!user) {
    deleteCookie(c, COOKIE_NAME, { path: "/" });
    return c.json({ success: false, message: "Session expired" }, 401);
  }

  return c.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

export default app;
