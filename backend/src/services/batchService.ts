// src/services/batchService.ts
import { emailService } from "./emailService";
import { logService } from "./logService";
import { FileService } from "./fileService";
import type { BatchJob, BatchConfig, EmailJob, Contact, BatchStatus } from "../types";

class BatchService {
  private currentJob: BatchJob | null = null;
  private isRunning = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private totalJobs = 0;
  private completedJobs = 0;

  async startBatchJob(
    emailJob: EmailJob,
    batchConfig: BatchConfig,
    notificationSettings?: { email: string; userId: string; configName?: string }
  ): Promise<string> {
    if (this.isRunning) throw new Error("A batch job is already running");

    const jobId = `batch_${Date.now()}`;
    const totalBatches = Math.ceil(emailJob.contacts.length / batchConfig.batchSize);

    this.currentJob = {
      id: jobId,
      totalContacts: emailJob.contacts.length,
      currentBatch: 0,
      totalBatches,
      emailsSent: 0,
      emailsFailed: 0,
      status: "Running",
      startTime: new Date().toISOString(),
      config: batchConfig,
      emailJob,
      notificationSettings,
      userId: notificationSettings?.userId,
      configName: notificationSettings?.configName,
    };

    this.isRunning = true;
    this.totalJobs++;

    console.log(`🚀 Batch job ${jobId}: ${emailJob.contacts.length} contacts → ${totalBatches} batches`);

    emailService.createTransport(emailJob.config);
    this.processNextBatch();

    return jobId;
  }

  async pauseCurrentJob(): Promise<void> {
    if (this.currentJob && this.isRunning) {
      this.currentJob.status = "Paused";
      this.isRunning = false;
      if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
      console.log(`⏸️ Batch job ${this.currentJob.id} paused`);
    }
  }

  async resumeCurrentJob(): Promise<void> {
    if (this.currentJob && this.currentJob.status === "Paused") {
      this.currentJob.status = "Running";
      this.isRunning = true;
      console.log(`▶️ Batch job ${this.currentJob.id} resumed`);
      this.processNextBatch();
    }
  }

  async cancelCurrentJob(): Promise<void> {
    if (this.currentJob) {
      this.currentJob.status = "Failed";
      this.isRunning = false;
      if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
      console.log(`❌ Batch job ${this.currentJob.id} cancelled`);
      this.completedJobs++;
      this.currentJob = null;
    }
  }

  getBatchStatus(): BatchStatus {
    return {
      isRunning: this.isRunning,
      currentJob: this.currentJob,
      totalJobs: this.totalJobs,
      completedJobs: this.completedJobs,
    };
  }

  private async processNextBatch(): Promise<void> {
    if (!this.currentJob || !this.isRunning) return;

    const job = this.currentJob;

    if (job.currentBatch >= job.totalBatches) {
      await this.completeBatchJob();
      return;
    }

    const startIdx = job.currentBatch * job.config.batchSize;
    const endIdx = Math.min(startIdx + job.config.batchSize, job.emailJob.contacts.length);
    const batch = job.emailJob.contacts.slice(startIdx, endIdx);

    job.currentBatch++;
    console.log(`📦 Batch ${job.currentBatch}/${job.totalBatches} (${batch.length} contacts)`);

    try {
      await this.processBatch(batch, job);

      if (job.currentBatch < job.totalBatches && this.isRunning) {
        await this.scheduleNextBatch(job);
      } else {
        await this.completeBatchJob();
      }
    } catch (error) {
      console.error(`❌ Batch ${job.currentBatch} failed:`, error);
      job.status = "Failed";
      this.isRunning = false;
      this.completedJobs++;
    }
  }

  private async processBatch(contacts: Contact[], job: BatchJob): Promise<void> {
    for (let i = 0; i < contacts.length; i++) {
      if (!this.isRunning) break;

      const contact = contacts[i];
      try {
        const html = FileService.replacePlaceholders(job.emailJob.htmlContent, contact);
        const subject = FileService.replacePlaceholders(job.emailJob.subject, contact);

        const info = await emailService.sendSingleEmail({
          from: `${job.emailJob.fromName} <${job.emailJob.fromEmail}>`,
          to: contact.email,  // ✅ Fixed: lowercase email
          subject,
          html,
        });

        logService.addLog({
          id: `batch_${job.id}_${Date.now()}_${i}`,
          email: contact.email,  // ✅ Fixed: lowercase email
          status: "Sent",
          timestamp: new Date().toISOString(),
          messageId: info.messageId,
          firstName: contact.name?.split(' ')[0] || contact.name,  // ✅ Fixed: use name
          company: contact.company,  // ✅ Fixed: lowercase company
          subject,
        });

        job.emailsSent++;
        console.log(`✅ ${contact.email} (${job.emailsSent}/${job.totalContacts})`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        logService.addLog({
          id: `batch_${job.id}_${Date.now()}_${i}`,
          email: contact.email,  // ✅ Fixed: lowercase email
          status: "Failed",
          message: msg,
          timestamp: new Date().toISOString(),
          firstName: contact.name?.split(' ')[0] || contact.name,  // ✅ Fixed: use name
          company: contact.company,  // ✅ Fixed: lowercase company
          subject: job.emailJob.subject,
        });
        job.emailsFailed++;
        console.error(`❌ ${contact.email}: ${msg}`);
      }

      if (i < contacts.length - 1 && this.isRunning) {
        await new Promise((r) => setTimeout(r, job.config.emailDelay * 1000));
      }
    }
  }

  private async scheduleNextBatch(job: BatchJob): Promise<void> {
    const delayMs = job.config.batchDelay * 60 * 1000;
    job.nextBatchTime = new Date(Date.now() + delayMs).toISOString();
    console.log(`⏳ Next batch in ${job.config.batchDelay} minutes`);

    this.timeoutId = setTimeout(() => {
      if (this.isRunning && this.currentJob) this.processNextBatch();
    }, delayMs);
  }

  private async completeBatchJob(): Promise<void> {
    if (!this.currentJob) return;

    this.currentJob.status = "Completed";
    this.currentJob.nextBatchTime = undefined;
    this.isRunning = false;
    this.completedJobs++;

    console.log(`🎉 Batch job ${this.currentJob.id} complete! ${this.currentJob.emailsSent} sent, ${this.currentJob.emailsFailed} failed`);

    if (this.currentJob.notificationSettings?.email) {
      try {
        const { notificationService } = await import("./notificationService.js");  // ✅ Fixed: added .js extension
        await notificationService.sendJobCompletionNotification(
          this.currentJob.userId!,
          this.currentJob.notificationSettings.email,
          {
            sent: this.currentJob.emailsSent,
            failed: this.currentJob.emailsFailed,
            total: this.currentJob.totalContacts,
            errors: 0,
          },
          {
            id: this.currentJob.id,
            subject: this.currentJob.emailJob.subject,
            startTime: this.currentJob.startTime,
            endTime: new Date().toISOString(),
            configUsed: this.currentJob.configName || "Batch Configuration",
            batchMode: true,
          },
          this.currentJob.configName || "Batch Configuration"
        );
      } catch (error) {
        console.error("❌ Batch notification failed:", error);
      }
    }

    if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
    setTimeout(() => { this.currentJob = null; }, 30000);
  }
}

export const batchService = new BatchService();