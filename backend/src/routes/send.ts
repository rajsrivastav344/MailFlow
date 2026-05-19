// src/routes/send.ts
import { Hono } from "hono";
import { emailService } from "../services/emailService";
import { batchService } from "../services/batchService";
import { schedulerService } from "../services/schedulerService";
import { notificationService } from "../services/notificationService";
import { ProviderDetection } from "../services/providerLimits";
import { FileService } from "../services/fileService";
import { userDatabase } from "../services/userDatabase";
import { requireAuth } from "../middleware/auth";
import type { EmailJob, EmailConfig, BatchConfig, NotificationConfig } from "../types";

const app = new Hono();

// Configure global notification sender if env vars are set
if (process.env.NOTIFICATION_SMTP_USER) {
  const notifConfig: NotificationConfig = {
    host: process.env.NOTIFICATION_SMTP_HOST || process.env.SMTP_HOST || "",
    port: parseInt(process.env.NOTIFICATION_SMTP_PORT || process.env.SMTP_PORT || "587"),
    secure: (process.env.NOTIFICATION_SMTP_SECURE || process.env.SMTP_SECURE) === "true",
    user: process.env.NOTIFICATION_SMTP_USER || "",
    pass: process.env.NOTIFICATION_SMTP_PASS || "",
    fromName: process.env.NOTIFICATION_FROM_NAME || "Email Campaign Notifications",
  };
  notificationService.setupGlobalNotificationSender(notifConfig);
  console.log("📧 Notification service configured");
}

// ── POST /send ────────────────────────────────────────────────────────────────
app.post("/send", async (c) => {
  try {
    const user = requireAuth(c);
    console.log(`📧 Send request from: ${user.email}`);

    const formData = await c.req.formData();

    // Resolve SMTP config: use specified configId → default → error
    const configId = formData.get("configId") as string;
    let userConfig =
      (configId
        ? userDatabase.getUserSMTPConfigs(user.id).find((c) => c.id === configId)
        : null) ?? userDatabase.getUserDefaultSMTPConfig(user.id);

    if (!userConfig) {
      return c.json(
        {
          success: false,
          message: "No SMTP configuration found. Please add an SMTP configuration first.",
        },
        400
      );
    }

    // Extract form fields
    const subject = (formData.get("subject") as string) || "";
    const htmlContent = (formData.get("htmlContent") as string) || "";
    const delay = parseInt((formData.get("delay") as string) || "20");

    const useBatch = formData.get("useBatch") === "on";
    const batchSize = parseInt((formData.get("batchSize") as string) || "20");
    const batchDelay = parseInt((formData.get("batchDelay") as string) || "60");
    const emailDelay = parseInt((formData.get("emailDelay") as string) || "45");

    const scheduleEmail = formData.get("scheduleEmail") === "on";
    const scheduledTime = formData.get("scheduledTime") as string;
    const notifyEmail = (formData.get("notifyEmail") as string) || "";
    const notifyBrowser = formData.get("notifyBrowser") === "on";

    const excelFile = formData.get("excelFile") as File;
    const htmlTemplateFile = formData.get("htmlTemplate") as File;

    // Validate required fields
    const missing: string[] = [];
    if (!subject.trim()) missing.push("Subject");
    if (scheduleEmail && !scheduledTime) missing.push("Scheduled Time");

    if (missing.length > 0) {
      return c.json({ success: false, message: `Missing required fields: ${missing.join(", ")}` }, 400);
    }

    if (!excelFile || excelFile.size === 0) {
      return c.json({ success: false, message: "Excel file is required" }, 400);
    }

    if (
      (!htmlTemplateFile || htmlTemplateFile.size === 0) &&
      (!htmlContent.trim() || htmlContent === "<p><br></p>")
    ) {
      return c.json(
        { success: false, message: "Email content is required (editor or HTML template)" },
        400
      );
    }

    // Build email config
    const emailConfig: EmailConfig = {
      host: userConfig.host,
      port: userConfig.port,
      secure: !!userConfig.secure,
      auth: { user: userConfig.user, pass: userConfig.pass },
    };

    // Test SMTP connection
    console.log(`🔍 Testing SMTP: ${userConfig.host}:${userConfig.port}`);
    const connectionValid = await emailService.testConnection(emailConfig);
    if (!connectionValid) {
      let msg = "SMTP connection failed. Please check your settings.";
      if (userConfig.host.includes("gmail")) {
        msg =
          "Gmail SMTP connection failed. Use an App Password and ensure 2FA is enabled.\n" +
          "Generate one at: https://myaccount.google.com/apppasswords";
      } else if (userConfig.host.includes("outlook") || userConfig.host.includes("hotmail")) {
        msg = "Outlook SMTP connection failed. Host: smtp-mail.outlook.com, Port: 587";
      }
      return c.json({ success: false, message: msg }, 400);
    }

    // Parse Excel
    const arrayBuffer = await excelFile.arrayBuffer();
    const filename = `${Date.now()}_${excelFile.name}`;
    const filePath = await FileService.saveUploadedFile(new Uint8Array(arrayBuffer), filename);
    let contacts = await FileService.parseExcelFile(filePath);

    // Apply range selection
    const emailRangeStart = parseInt((formData.get("emailRangeStart") as string) || "0") || 0;
    const emailRangeEnd = parseInt((formData.get("emailRangeEnd") as string) || "0") || 0;

    if (emailRangeStart > 0 || emailRangeEnd > 0) {
      const start = emailRangeStart > 0 ? emailRangeStart - 1 : 0;
      const end = emailRangeEnd > 0 ? emailRangeEnd : contacts.length;
      contacts = contacts.slice(start, end);
      console.log(`📋 Range: contacts ${emailRangeStart}–${emailRangeEnd} (${contacts.length} total)`);
    }

    if (contacts.length === 0) {
      return c.json({ success: false, message: "No valid contacts found in Excel file" }, 400);
    }

    // Resolve HTML content
    let finalHtmlContent = htmlContent;
    if (htmlTemplateFile && htmlTemplateFile.size > 0) {
      const templateBuffer = await htmlTemplateFile.arrayBuffer();
      const templateFilename = `tpl_${Date.now()}_${htmlTemplateFile.name}`;
      const templatePath = await FileService.saveUploadedFile(
        new Uint8Array(templateBuffer),
        templateFilename
      );
      finalHtmlContent = await FileService.readHTMLTemplate(templatePath);
      console.log(`📄 Using uploaded HTML template (${finalHtmlContent.length} chars)`);
    }

    // Build email job
    const emailJob: EmailJob = {
      contacts,
      htmlContent: finalHtmlContent,
      subject: subject.trim(),
      fromEmail: userConfig.from_email,
      fromName: userConfig.from_name || "",
      config: emailConfig,
      delay,
    };

    const batchConfig: BatchConfig | null = useBatch
      ? { batchSize, emailDelay, batchDelay, enabled: true }
      : null;

    const notificationSettings = notifyEmail
      ? { email: notifyEmail, userId: user.id, configName: userConfig.name }
      : undefined;

    // ── Schedule ──────────────────────────────────────────────────────────────
    if (scheduleEmail) {
      const scheduledDate = new Date(scheduledTime);

      if (isNaN(scheduledDate.getTime())) {
        return c.json({ success: false, message: "Invalid scheduled time" }, 400);
      }

      if (scheduledDate <= new Date()) {
        return c.json({ success: false, message: "Scheduled time must be in the future" }, 400);
      }

      const jobId = await schedulerService.scheduleJob(
        user.id,
        emailJob,
        batchConfig,
        scheduledDate,
        userConfig.name,
        notifyEmail || undefined,
        notifyBrowser
      );

      console.log(`📅 Campaign scheduled: ${jobId}`);

      return c.json({
        success: true,
        message: `Email campaign scheduled for ${scheduledDate.toLocaleString()}`,
        jobId,
        scheduledTime: scheduledDate.toISOString(),
        contactCount: contacts.length,
        scheduledMode: true,
        batchMode: useBatch,
        configUsed: userConfig.name,
      });
    }

    // ── Immediate send ────────────────────────────────────────────────────────
    if (useBatch) {
      console.log(`⚡ Starting BATCH: ${contacts.length} contacts in batches of ${batchSize}`);

      const jobId = await batchService.startBatchJob(emailJob, batchConfig!, notificationSettings);

      return c.json({
        success: true,
        message: `Batch email job started! ${batchSize} emails every ${batchDelay} minutes.`,
        contactCount: contacts.length,
        jobId,
        batchMode: true,
        batchConfig,
        configUsed: userConfig.name,
      });
    } else {
      console.log(`🚀 Starting bulk send: ${contacts.length} contacts`);
      emailService.createTransport(emailConfig);

      // Fire and forget
      emailService.sendBulkEmails(emailJob, notificationSettings).catch((err) => {
        console.error("Bulk email error:", err);
      });

      return c.json({
        success: true,
        message: `Email sending started for ${contacts.length} contacts`,
        contactCount: contacts.length,
        configUsed: userConfig.name,
      });
    }
  } catch (error) {
    console.error("Send error:", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      500
    );
  }
});

// ── POST /test-notification ───────────────────────────────────────────────────
app.post("/test-notification", async (c) => {
  try {
    const user = requireAuth(c);
    const { testEmail } = await c.req.json<{ testEmail: string }>();

    if (!testEmail) {
      return c.json({ success: false, message: "Test email required" }, 400);
    }

    const success = await notificationService.sendTestNotification(user.id, testEmail);
    return c.json({
      success,
      message: success ? "Test notification sent!" : "Failed to send test notification",
    });
  } catch (error) {
    return c.json({ success: false, message: "Failed to send test notification" }, 500);
  }
});

// ── POST /provider-info ───────────────────────────────────────────────────────
app.post("/provider-info", async (c) => {
  try {
    const formData = await c.req.formData();
    const smtpHost = (formData.get("smtpHost") as string) || "";
    const hasNotification = formData.get("hasNotification") === "true";

    if (!smtpHost) {
      return c.json({ success: false, message: "SMTP host required" }, 400);
    }

    const provider = ProviderDetection.detectProvider(smtpHost);
    const maxContacts = ProviderDetection.calculateMaxContacts(smtpHost, hasNotification);

    return c.json({
      success: true,
      data: {
        provider: provider.name,
        dailyLimit: provider.dailyLimit,
        maxContacts,
        recommendedBatchSize: provider.recommendedBatchSize,
        recommendedDelay: provider.recommendedDelay,
      },
    });
  } catch {
    return c.json({ success: false, message: "Failed to detect provider" }, 500);
  }
});

// ── GET /scheduled-jobs ───────────────────────────────────────────────────────
app.get("/scheduled-jobs", async (c) => {
  const jobs = await schedulerService.getScheduledJobs();
  return c.json({ success: true, data: jobs });
});

// ── DELETE /scheduled-jobs/:id ────────────────────────────────────────────────
app.delete("/scheduled-jobs/:id", async (c) => {
  const jobId = c.req.param("id");
  const cancelled = await schedulerService.cancelScheduledJob(jobId);

  return cancelled
    ? c.json({ success: true, message: "Scheduled job cancelled" })
    : c.json({ success: false, message: "Job not found or cannot be cancelled" }, 404);
});

// ── POST /parse-excel ─────────────────────────────────────────────────────────
app.post("/parse-excel", async (c) => {
  try {
    const formData = await c.req.formData();
    const excelFile = formData.get("excelFile") as File;

    if (!excelFile || excelFile.size === 0) {
      return c.json({ success: false, message: "Excel file is required" }, 400);
    }

    const arrayBuffer = await excelFile.arrayBuffer();
    const filePath = await FileService.saveUploadedFile(
      new Uint8Array(arrayBuffer),
      `temp_${Date.now()}_${excelFile.name}`
    );
    const contacts = await FileService.parseExcelFile(filePath);

    return c.json({
      success: true,
      contacts: contacts.slice(0, 5),
      totalCount: contacts.length,
    });
  } catch (error) {
    return c.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to parse Excel" },
      500
    );
  }
});

// ── Batch control ─────────────────────────────────────────────────────────────
app.get("/batch-status", (c) => {
  return c.json({ success: true, data: batchService.getBatchStatus() });
});

app.post("/batch-pause", async (c) => {
  await batchService.pauseCurrentJob();
  return c.json({ success: true, message: "Batch job paused" });
});

app.post("/batch-resume", async (c) => {
  await batchService.resumeCurrentJob();
  return c.json({ success: true, message: "Batch job resumed" });
});

app.delete("/batch-cancel", async (c) => {
  await batchService.cancelCurrentJob();
  return c.json({ success: true, message: "Batch job cancelled" });
});

export default app;
