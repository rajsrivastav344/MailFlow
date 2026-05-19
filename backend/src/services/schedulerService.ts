// src/services/schedulerService.ts
import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { batchService } from "./batchService";
import { emailService } from "./emailService";
import type { EmailJob, BatchConfig } from "../types";

class SchedulerService {
  private db!: Database;
  private ready = false;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const dbPath = "./data/scheduler.db";
    const dbDir = dirname(dbPath);

    if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

    this.db = await open({ filename: dbPath, driver: sqlite3.Database });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_jobs (
        id             TEXT PRIMARY KEY,
        user_id        TEXT NOT NULL,
        email_job      TEXT NOT NULL,
        batch_config   TEXT,
        scheduled_time TEXT NOT NULL,
        notify_email   TEXT,
        notify_browser INTEGER DEFAULT 0,
        status         TEXT DEFAULT 'scheduled',
        created_at     TEXT DEFAULT CURRENT_TIMESTAMP,
        started_at     TEXT,
        completed_at   TEXT,
        contact_count  INTEGER,
        subject        TEXT,
        use_batch      INTEGER DEFAULT 0,
        config_name    TEXT
      )
    `);

    this.ready = true;
    console.log("✅ Scheduler initialized");

    this.schedulerInterval = setInterval(() => this.checkDueJobs(), 60_000);
  }

  async scheduleJob(
    userId: string,
    emailJob: EmailJob,
    batchConfig: BatchConfig | null,
    scheduledTime: Date,
    configName: string,
    notifyEmail?: string,
    notifyBrowser?: boolean
  ): Promise<string> {
    await this.waitReady();

    const jobId = `sched_${Date.now()}`;

    await this.db.run(
      `INSERT INTO scheduled_jobs
       (id, user_id, email_job, batch_config, scheduled_time, notify_email, notify_browser,
        contact_count, subject, use_batch, config_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobId,
        userId,
        JSON.stringify(emailJob),
        batchConfig ? JSON.stringify(batchConfig) : null,
        scheduledTime.toISOString(),
        notifyEmail || null,
        notifyBrowser ? 1 : 0,
        emailJob.contacts.length,
        emailJob.subject,
        batchConfig ? 1 : 0,
        configName || "Default Config",
      ]
    );

    console.log(`📅 Job scheduled: ${jobId}`);
    return jobId;
  }

  private async checkDueJobs() {
    if (!this.ready) return;

    const now = new Date().toISOString();
    const dueJobs = await this.db.all(
      "SELECT * FROM scheduled_jobs WHERE scheduled_time <= ? AND status = 'scheduled' ORDER BY scheduled_time ASC",
      [now]
    );

    for (const job of dueJobs) {
      await this.executeScheduledJob(job);
    }
  }

  private async executeScheduledJob(job: any) {
    console.log(`🚀 Executing scheduled job: ${job.id}`);

    try {
      await this.db.run(
        "UPDATE scheduled_jobs SET status = 'running', started_at = ? WHERE id = ?",
        [new Date().toISOString(), job.id]
      );

      const emailJob: EmailJob = JSON.parse(job.email_job);
      const batchConfig: BatchConfig | null = job.batch_config
        ? JSON.parse(job.batch_config)
        : null;

      emailService.createTransport(emailJob.config);

      const notificationSettings = job.notify_email
        ? { email: job.notify_email, userId: job.user_id, configName: job.config_name || "Scheduled Job" }
        : undefined;

      if (job.use_batch && batchConfig) {
        await batchService.startBatchJob(emailJob, batchConfig, notificationSettings);
      } else {
        await emailService.sendBulkEmails(emailJob, notificationSettings);
      }

      await this.db.run(
        "UPDATE scheduled_jobs SET status = 'completed', completed_at = ? WHERE id = ?",
        [new Date().toISOString(), job.id]
      );

      console.log(`✅ Scheduled job complete: ${job.id}`);
    } catch (error) {
      console.error(`❌ Scheduled job failed: ${job.id}`, error);
      await this.db.run("UPDATE scheduled_jobs SET status = 'failed' WHERE id = ?", [job.id]);
    }
  }

  async getScheduledJobs(): Promise<any[]> {
    await this.waitReady();
    return this.db.all(
      `SELECT id, user_id, scheduled_time, status, contact_count, subject, use_batch, notify_email, config_name
       FROM scheduled_jobs
       WHERE status IN ('scheduled', 'running')
       ORDER BY scheduled_time ASC`
    );
  }

  async cancelScheduledJob(jobId: string): Promise<boolean> {
    await this.waitReady();
    const result = await this.db.run(
      "UPDATE scheduled_jobs SET status = 'cancelled' WHERE id = ? AND status = 'scheduled'",
      [jobId]
    );
    return (result.changes ?? 0) > 0;
  }

  private waitReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (this.ready) { clearInterval(check); resolve(); }
      }, 100);
    });
  }
}

export const schedulerService = new SchedulerService();
