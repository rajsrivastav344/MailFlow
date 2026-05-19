// src/services/notificationService.ts
import nodemailer from "nodemailer";
import { userDatabase } from "./userDatabase";
import { logService } from "./logService";
import type { NotificationConfig } from "../types";

export interface JobStats {
  sent: number;
  failed: number;
  total: number;
  errors: number;
  successRate: number;
}

export interface JobDetails {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  duration?: string;
  configUsed: string;
  batchMode: boolean;
  userId?: string;
}

class NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private globalConfig: NotificationConfig | null = null;

  setupGlobalNotificationSender(config: NotificationConfig): void {
    this.globalConfig = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false },
    });
    console.log("📧 Global notification service configured");
  }

  async sendJobCompletionNotification(
    userId: string,
    notifyEmail: string,
    jobStats: Omit<JobStats, "successRate">,
    jobDetails: Omit<JobDetails, "duration" | "userId">,
    configUsed: string
  ): Promise<boolean> {
    try {
      const user = userDatabase.getUserById(userId);
      if (!user) {
        console.error("❌ User not found for notification");
        return false;
      }

      const successRate =
        jobStats.total > 0
          ? parseFloat(((jobStats.sent / jobStats.total) * 100).toFixed(1))
          : 0;

      const duration = this.calculateDuration(
        jobDetails.startTime,
        jobDetails.endTime
      );

      const completeStats: JobStats = { ...jobStats, successRate };
      const completeDetails: JobDetails = {
        ...jobDetails,
        duration,
        userId,
        configUsed,
      };

      // Prefer user's SMTP config
      const userConfig = userDatabase.getUserDefaultSMTPConfig(userId);
      if (userConfig) {
        return this.sendWithUserConfig(
          userConfig,
          notifyEmail,
          completeStats,
          completeDetails,
          user
        );
      }

      // Fallback to global config
      if (this.globalConfig && this.transporter) {
        return this.sendWithGlobalConfig(
          notifyEmail,
          completeStats,
          completeDetails,
          user
        );
      }

      console.error("❌ No notification sender configured");
      return false;
    } catch (error) {
      console.error("❌ Notification error:", error);
      return false;
    }
  }

  private async sendWithUserConfig(
    userConfig: any,
    notifyEmail: string,
    stats: JobStats,
    details: JobDetails,
    user: any
  ): Promise<boolean> {
    try {
      const t = nodemailer.createTransport({
        host: userConfig.host,
        port: userConfig.port,
        secure: !!userConfig.secure,
        auth: { user: userConfig.user, pass: userConfig.pass },
        tls: { rejectUnauthorized: false },
      });

      await t.sendMail({
        from: `${userConfig.from_name || "Email Campaign"} <${userConfig.from_email}>`,
        to: notifyEmail,
        subject: this.createSubject(stats),
        html: this.createHTML({ stats, details, user }),
      });

      console.log(`📧 Notification sent to ${notifyEmail}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send notification:", error);
      return false;
    }
  }

  private async sendWithGlobalConfig(
    notifyEmail: string,
    stats: JobStats,
    details: JobDetails,
    user: any
  ): Promise<boolean> {
    try {
      if (!this.transporter || !this.globalConfig) return false;

      await this.transporter.sendMail({
        from: `${this.globalConfig.fromName} <${this.globalConfig.user}>`,
        to: notifyEmail,
        subject: this.createSubject(stats),
        html: this.createHTML({ stats, details, user }),
      });

      return true;
    } catch (error) {
      console.error("❌ Global notification failed:", error);
      return false;
    }
  }

  private createSubject(stats: JobStats): string {
    const status =
      stats.successRate >= 95
        ? "Success"
        : stats.successRate >= 50
        ? "Warning"
        : "Alert";
    return `Campaign Complete [${status}]: ${stats.sent}/${stats.total} emails sent (${stats.successRate}%)`;
  }

  private createHTML(data: { stats: JobStats; details: JobDetails; user: any }): string {
    const { stats, details, user } = data;
    const color =
      stats.successRate >= 95
        ? "#4CAF50"
        : stats.successRate >= 50
        ? "#FF9800"
        : "#f44336";
    const icon =
      stats.successRate >= 95 ? "✅" : stats.successRate >= 50 ? "⚠️" : "❌";

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Campaign Report</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <div style="background:${color};padding:30px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px">${icon}</div>
      <h1 style="margin:0;color:#fff;font-size:24px">Campaign Complete</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.9)">Hi ${user.name}, your campaign has finished.</p>
    </div>
    <div style="padding:30px">
      <h2 style="margin:0 0 20px;font-size:18px;color:#333">Campaign Summary</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f8f8f8">
          <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold">Subject</td>
          <td style="padding:12px;border:1px solid #e0e0e0">${details.subject}</td>
        </tr>
        <tr>
          <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold">Total</td>
          <td style="padding:12px;border:1px solid #e0e0e0">${stats.total}</td>
        </tr>
        <tr style="background:#f8f8f8">
          <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;color:#4CAF50">Sent</td>
          <td style="padding:12px;border:1px solid #e0e0e0;color:#4CAF50"><strong>${stats.sent}</strong></td>
        </tr>
        <tr>
          <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;color:#f44336">Failed</td>
          <td style="padding:12px;border:1px solid #e0e0e0;color:#f44336"><strong>${stats.failed}</strong></td>
        </tr>
        <tr style="background:#f8f8f8">
          <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold">Success Rate</td>
          <td style="padding:12px;border:1px solid #e0e0e0;color:${color}"><strong>${stats.successRate}%</strong></td>
        </tr>
        <tr>
          <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold">Duration</td>
          <td style="padding:12px;border:1px solid #e0e0e0">${details.duration || "N/A"}</td>
        </tr>
        <tr style="background:#f8f8f8">
          <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold">Config Used</td>
          <td style="padding:12px;border:1px solid #e0e0e0">${details.configUsed}</td>
        </tr>
        <tr>
          <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold">Mode</td>
          <td style="padding:12px;border:1px solid #e0e0e0">${details.batchMode ? "Batch" : "Bulk"}</td>
        </tr>
      </table>
    </div>
    <div style="background:#263238;padding:20px;text-align:center;color:#fff">
      <p style="margin:0;font-size:13px;opacity:.8">Report generated on ${new Date().toLocaleString()}</p>
      <p style="margin:8px 0 0;font-size:12px;opacity:.6">Bulk Email Sender</p>
    </div>
  </div>
</body>
</html>`;
  }

  private calculateDuration(startTime: string, endTime: string): string {
    const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  async sendTestNotification(userId: string, testEmail: string): Promise<boolean> {
    return this.sendJobCompletionNotification(
      userId,
      testEmail,
      { sent: 85, failed: 15, total: 100, errors: 0 },
      {
        id: "test_123",
        subject: "Test Campaign - Welcome Email",
        startTime: new Date(Date.now() - 600000).toISOString(),
        endTime: new Date().toISOString(),
        configUsed: "Test SMTP Configuration",
        batchMode: true,
      },
      "Test SMTP Configuration"
    );
  }

  getCampaignStats(jobId: string): JobStats {
    const logs = logService.getLogs().filter((l) => l.id.includes(jobId));
    const sent = logs.filter((l) => l.status === "Sent").length;
    const failed = logs.filter((l) => l.status === "Failed").length;
    const errors = logs.filter((l) => l.status === "Error").length;
    const total = logs.length;
    const successRate = total > 0 ? parseFloat(((sent / total) * 100).toFixed(1)) : 0;
    return { sent, failed, total, errors, successRate };
  }
}

export const notificationService = new NotificationService();

// Auto-configure global notification sender from env
if (process.env.NOTIFICATION_SMTP_USER) {
  notificationService.setupGlobalNotificationSender({
    host: process.env.NOTIFICATION_SMTP_HOST || process.env.SMTP_HOST || "",
    port: parseInt(process.env.NOTIFICATION_SMTP_PORT || "587"),
    secure: process.env.NOTIFICATION_SMTP_SECURE === "true",
    user: process.env.NOTIFICATION_SMTP_USER,
    pass: process.env.NOTIFICATION_SMTP_PASS || "",
    fromName: process.env.NOTIFICATION_FROM_NAME || "Email Campaign Notifications",
  });
}
