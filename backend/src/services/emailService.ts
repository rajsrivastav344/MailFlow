// src/services/emailService.ts
import nodemailer from "nodemailer";
import { logService } from "./logService";
import { FileService } from "./fileService";
import type { EmailConfig, EmailJob } from "../types";

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  createTransport(config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: { rejectUnauthorized: false },
    });
  }

  async sendSingleEmail(mailOptions: any): Promise<any> {
    if (!this.transporter) throw new Error("Email transporter not configured");
    return this.transporter.sendMail(mailOptions);
  }

  async sendBulkEmails(
    job: EmailJob,
    notificationSettings?: { email?: string; userId?: string; configName?: string }
  ): Promise<void> {
    if (!this.transporter) throw new Error("Email transporter not configured");

    console.log(`📧 Starting bulk send for ${job.contacts.length} contacts`);
    const startTime = new Date().toISOString();
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < job.contacts.length; i++) {
      const contact = job.contacts[i];
      try {
        const html = FileService.replacePlaceholders(job.htmlContent, contact);
        const subject = FileService.replacePlaceholders(job.subject, contact);

        const info = await this.transporter.sendMail({
          from: `${job.fromName} <${job.fromEmail}>`,
          to: contact.email,
          subject,
          html,
        });

        logService.addLog({
          id: `email_${Date.now()}_${i}`,
          email: contact.email,
          status: "Sent",
          timestamp: new Date().toISOString(),
          messageId: info.messageId,
          firstName: contact.name,  // Use name field
          company: contact.company,  // Use company field
          subject,
        });

        sentCount++;
        console.log(`✅ Sent to ${contact.email} (${sentCount}/${job.contacts.length})`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        logService.addLog({
          id: `email_${Date.now()}_${i}`,
          email: contact.email,
          status: "Failed",
          message: msg,
          timestamp: new Date().toISOString(),
          firstName: contact.name,  // Use name field
          company: contact.company,  // Use company field
          subject: job.subject,
        });
        failedCount++;
        console.error(`❌ Failed to ${contact.email}: ${msg}`);
      }

      if (i < job.contacts.length - 1) {
        await new Promise((r) => setTimeout(r, job.delay * 1000));
      }
    }

    console.log(`✅ Bulk complete: ${sentCount} sent, ${failedCount} failed`);

    if (notificationSettings?.email && notificationSettings?.userId) {
      await this.sendBulkCompletionNotification(
        job,
        {
          email: notificationSettings.email,
          userId: notificationSettings.userId,
          configName: notificationSettings.configName,
        },
        startTime,
        sentCount,
        failedCount
      );
    }
  }

  private async sendBulkCompletionNotification(
    job: EmailJob,
    settings: { email: string; userId: string; configName?: string },
    startTime: string,
    sentCount: number,
    failedCount: number
  ): Promise<void> {
    try {
      const { notificationService } = await import("./notificationService");
      await notificationService.sendJobCompletionNotification(
        settings.userId,
        settings.email,
        { sent: sentCount, failed: failedCount, total: job.contacts.length, errors: 0 },
        {
          id: `bulk_${Date.now()}`,
          subject: job.subject,
          startTime,
          endTime: new Date().toISOString(),
          configUsed: settings.configName || "Bulk Email Configuration",
          batchMode: false,
        },
        settings.configName || "Bulk Email Configuration"
      );
    } catch (error) {
      console.error("❌ Notification failed:", error);
    }
  }

  async testConnection(config: EmailConfig): Promise<boolean> {
    try {
      console.log("Testing SMTP connection with:", {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth?.user,
        hasPass: !!config.auth?.pass,
      });
      
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        tls: { rejectUnauthorized: false },
      });
      
      await transporter.verify();
      console.log("✅ SMTP connection successful");
      return true;
    } catch (error: any) {
      console.error("❌ SMTP test failed:", error.message);
      return false;
    }
  }

  async sendTestEmail(config: EmailConfig, toEmail: string): Promise<boolean> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        tls: { rejectUnauthorized: false },
      });
      
      await transporter.sendMail({
        from: `"${config.auth?.user}" <${config.auth?.user}>`,
        to: toEmail,
        subject: "SMTP Test Email - MailFlow",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9fafb; }
              .success { color: #10b981; font-size: 48px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 SMTP Test Successful!</h1>
              </div>
              <div class="content">
                <div class="success">✅</div>
                <p>Your SMTP settings are working correctly!</p>
                <hr />
                <p><strong>Configuration:</strong></p>
                <ul>
                  <li>Host: ${config.host}</li>
                  <li>Port: ${config.port}</li>
                  <li>User: ${config.auth?.user}</li>
                </ul>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      
      console.log(`✅ Test email sent successfully to ${toEmail}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send test email:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();