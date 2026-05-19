// backend/src/routes/config.ts
import { Hono } from "hono";
import { userDatabase } from "../services/userDatabase.js";
import { requireAuth } from "../middleware/auth.js";
import type { SMTPDefaults } from "../types.js";

const envConfig: SMTPDefaults = {
  host: process.env.SMTP_HOST || "",
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  fromEmail: process.env.FROM_EMAIL || "",
  fromName: process.env.FROM_NAME || "",
};

const hasEnvConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const app = new Hono();

// GET /smtp
app.get("/smtp", (c) => {
  try {
    const user = requireAuth(c);
    
    const userConfigs = userDatabase.getUserSMTPConfigs(user.id);
    const defaultConfig = userDatabase.getUserDefaultSMTPConfig(user.id);

    const activeConfig = defaultConfig
      ? {
          host: defaultConfig.host,
          port: defaultConfig.port,
          secure: !!defaultConfig.secure,
          user: defaultConfig.user,
          pass: defaultConfig.pass,
          fromEmail: defaultConfig.from_email,
          fromName: defaultConfig.from_name,
        }
      : hasEnvConfig
      ? envConfig
      : null;

    return c.json({
      success: true,
      data: activeConfig,
      hasConfig: !!activeConfig,
      hasEnvConfig,
      currentMode: defaultConfig ? "user" : "env",
      envConfig: hasEnvConfig ? envConfig : null,
      userConfigs: userConfigs.map((cfg) => ({
        id: cfg.id,
        name: cfg.name,
        host: cfg.host,
        port: cfg.port,
        secure: !!cfg.secure,
        user: cfg.user,
        fromEmail: cfg.from_email,
        fromName: cfg.from_name,
        isDefault: !!cfg.is_default,
        createdAt: cfg.created_at,
      })),
      userId: user.id,
      userName: user.name,
    });
  } catch (error) {
    console.error("Error fetching SMTP configs:", error);
    return c.json({ success: false, message: "Failed to fetch SMTP configs" }, 500);
  }
});

// GET /smtp/active
app.get("/smtp/active", (c) => {
  try {
    const user = requireAuth(c);
    const defaultConfig = userDatabase.getUserDefaultSMTPConfig(user.id);

    const activeConfig = defaultConfig
      ? {
          host: defaultConfig.host,
          port: defaultConfig.port,
          secure: !!defaultConfig.secure,
          user: defaultConfig.user,
          pass: defaultConfig.pass,
          fromEmail: defaultConfig.from_email,
          fromName: defaultConfig.from_name,
        }
      : hasEnvConfig
      ? envConfig
      : null;

    return c.json({
      success: true,
      data: activeConfig,
      mode: defaultConfig ? "user" : "env",
      configId: defaultConfig?.id,
      configName: defaultConfig?.name,
    });
  } catch (error) {
    console.error("Error fetching active SMTP config:", error);
    return c.json({ success: false, message: "Failed to fetch active config" }, 500);
  }
});

// POST /smtp
app.post("/smtp", async (c) => {
  try {
    const user = requireAuth(c);
    const body = await c.req.json();

    // Accept both naming conventions
    const host = body.host;
    const port = body.port || 587;
    const secure = body.secure || false;
    const user_field = body.user || body.username;
    const pass = body.pass || body.password;
    const from_email = body.from_email || body.fromEmail;
    const from_name = body.from_name || body.fromName;
    const name = body.name || "Default Configuration";
    const is_default = body.is_default || body.isDefault || false;

    if (!host || !user_field || !pass || !from_email) {
      return c.json(
        { success: false, message: "host, user, pass, and from_email are required" },
        400
      );
    }

    const configId = await userDatabase.createSMTPConfig(user.id, {
      name: name,
      host: host,
      port: port,
      secure: secure,
      user: user_field,
      pass: pass,
      from_email: from_email,
      from_name: from_name || "",
      is_default: is_default,
    });

    return c.json({ success: true, message: "SMTP configuration saved", configId });
  } catch (error) {
    console.error("Create SMTP config error:", error);
    return c.json({ success: false, message: "Failed to save SMTP configuration" }, 500);
  }
});

// PUT /smtp/:configId
app.put("/smtp/:configId", async (c) => {
  try {
    const user = requireAuth(c);
    const configId = c.req.param("configId");
    const body = await c.req.json();

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.host !== undefined) updates.host = body.host;
    if (body.port !== undefined) updates.port = body.port;
    if (body.secure !== undefined) updates.secure = body.secure;
    if (body.user !== undefined) updates.user = body.user;
    if (body.pass !== undefined) updates.pass = body.pass;
    if (body.fromEmail !== undefined) updates.from_email = body.fromEmail;
    if (body.fromName !== undefined) updates.from_name = body.fromName;
    if (body.isDefault !== undefined) updates.is_default = body.isDefault;

    const updated = userDatabase.updateSMTPConfig(configId, user.id, updates);

    if (!updated) {
      return c.json({ success: false, message: "Configuration not found" }, 404);
    }

    return c.json({ success: true, message: "SMTP configuration updated" });
  } catch (error) {
    console.error("Update SMTP config error:", error);
    return c.json({ success: false, message: "Failed to update SMTP configuration" }, 500);
  }
});

// DELETE /smtp/:configId
app.delete("/smtp/:configId", (c) => {
  try {
    const user = requireAuth(c);
    const configId = c.req.param("configId");

    const deleted = userDatabase.deleteSMTPConfig(configId, user.id);
    if (!deleted) {
      return c.json({ success: false, message: "Configuration not found" }, 404);
    }

    return c.json({ success: true, message: "SMTP configuration deleted" });
  } catch (error) {
    console.error("Delete SMTP config error:", error);
    return c.json({ success: false, message: "Failed to delete SMTP configuration" }, 500);
  }
});

// POST /smtp/:configId/default
app.post("/smtp/:configId/default", (c) => {
  try {
    const user = requireAuth(c);
    const configId = c.req.param("configId");

    const updated = userDatabase.updateSMTPConfig(configId, user.id, { is_default: true });
    if (!updated) {
      return c.json({ success: false, message: "Configuration not found" }, 404);
    }

    return c.json({ success: true, message: "Default configuration updated" });
  } catch (error) {
    console.error("Error setting default config:", error);
    return c.json({ success: false, message: "Failed to set default configuration" }, 500);
  }
});

// POST /smtp/test
app.post("/smtp/test", async (c) => {
  try {
    requireAuth(c);
    const body = await c.req.json();
    const { emailService } = await import("../services/emailService.js");
    
    const testEmail = body.email || body.testEmail;
    
    if (!testEmail) {
      return c.json({ success: false, message: "Test email address is required" }, 400);
    }
    
    // Accept both naming conventions
    const host = body.host;
    const port = body.port || 587;
    const secure = body.secure || false;
    const user = body.user || body.username;
    const pass = body.pass || body.password;
    
    if (!host || !user || !pass) {
      return c.json({ success: false, message: "SMTP settings (host, user, pass) are required" }, 400);
    }
    
    const config = {
      host: host,
      port: port,
      secure: secure,
      auth: { user: user, pass: pass },
    };
    
    // Test connection first
    const isValid = await emailService.testConnection(config);
    
    if (!isValid) {
      return c.json({ success: false, message: "SMTP connection failed" }, 400);
    }
    
    // Send actual test email
    const emailSent = await emailService.sendTestEmail(config, testEmail);
    
    return c.json({
      success: emailSent,
      message: emailSent ? "Test email sent successfully" : "Connection successful but email send failed",
    });
  } catch (error) {
    console.error("SMTP test error:", error);
    return c.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "SMTP connection test failed" 
    }, 500);
  }
});

export default app;