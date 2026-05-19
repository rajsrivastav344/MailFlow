// backend/src/routes/config.ts
import { Hono } from "hono";
import { userDatabase } from "../services/userDatabase";
import { requireAuth } from "../middleware/auth";
import type { SMTPDefaults } from "../types";

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

// CHANGE THESE ROUTES - remove "/config" prefix
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
// backend/src/routes/config.ts - Update the test endpoint
app.post("/smtp/test", async (c) => {
  try {
    requireAuth(c);
    const body = await c.req.json();
    const { emailService } = await import("../services/emailService");
    
    const testEmail = body.email || body.testEmail;
    
    if (!testEmail) {
      return c.json({ success: false, message: "Test email address is required" }, 400);
    }
    
    const config = {
      host: body.host,
      port: body.port || 587,
      secure: body.secure || false,
      auth: { user: body.user, pass: body.pass },
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
    const { emailService } = await import("../services/emailService");

    // Make sure emailService has testConnection method
    const isValid = await emailService.testConnection({
      host: body.host,
      port: body.port || 587,
      secure: !!body.secure,
      auth: { user: body.user, pass: body.pass },
    });

    return c.json({
      success: isValid,
      message: isValid ? "SMTP connection successful" : "SMTP connection failed",
    });
  } catch (error) {
    console.error("SMTP test error:", error);
    return c.json({ success: false, message: "SMTP connection test failed" }, 500);
  }
});

export default app;