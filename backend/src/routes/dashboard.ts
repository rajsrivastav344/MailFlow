// src/routes/dashboard.ts
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";

const app = new Hono();

// ✅ ADD THIS - Simple stats endpoint for frontend
app.get("/stats", async (c) => {
  requireAuth(c);
  
  return c.json({
    totalContacts: 0,
    totalCampaigns: 0,
    emailsSent: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0
  });
});

// ✅ FIXED: Remove "/dashboard" from path - now just "/poll-status"
app.get("/poll-status", async (c) => {
  requireAuth(c);

  try {
    let hasActiveBatch = false;
    let hasScheduledJobs = false;
    let hasRunningScheduledJobs = false;

    try {
      const { batchService } = await import("../services/batchService");
      const status = batchService.getBatchStatus();
      hasActiveBatch = status.isRunning;
    } catch {
      hasActiveBatch = false;
    }

    try {
      const { schedulerService } = await import("../services/schedulerService");
      const jobs = await schedulerService.getScheduledJobs();
      hasScheduledJobs = jobs.length > 0;
      hasRunningScheduledJobs = jobs.some((j: any) => j.status === "running");
    } catch {
      hasScheduledJobs = false;
    }

    let pollNeeded = false;
    let pollInterval = 30000;

    if (hasActiveBatch) {
      pollNeeded = true;
      pollInterval = 3000;
    } else if (hasRunningScheduledJobs) {
      pollNeeded = true;
      pollInterval = 10000;
    } else if (hasScheduledJobs) {
      pollNeeded = true;
      pollInterval = 30000;
    }

    return c.json({
      success: true,
      data: {
        pollNeeded,
        pollInterval,
        hasActiveBatch,
        hasScheduledJobs,
        hasRunningScheduledJobs,
        activeBatchCount: hasActiveBatch ? 1 : 0,
        scheduledJobCount: hasScheduledJobs ? 1 : 0,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Poll status error:", error);
    return c.json({
      success: true,
      data: {
        pollNeeded: false,
        pollInterval: 30000,
        hasActiveBatch: false,
        hasScheduledJobs: false,
        hasRunningScheduledJobs: false,
        activeBatchCount: 0,
        scheduledJobCount: 0,
        lastUpdated: new Date().toISOString(),
        error: "Service unavailable",
      },
    });
  }
});

// ✅ FIXED: Remove "/dashboard" from path - now just "/data"
app.get("/data", async (c) => {
  requireAuth(c);

  try {
    let batchStatus = null;
    let scheduledJobs: any[] = [];

    try {
      const { batchService } = await import("../services/batchService");
      batchStatus = batchService.getBatchStatus();
    } catch { /* not available */ }

    try {
      const { schedulerService } = await import("../services/schedulerService");
      const jobs = await schedulerService.getScheduledJobs();
      scheduledJobs = jobs
        .filter((j: any) => j.status === "scheduled" || j.status === "running")
        .slice(0, 5);
    } catch { /* not available */ }

    return c.json({
      success: true,
      data: {
        batch: batchStatus,
        scheduledJobs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return c.json(
      {
        success: false,
        message: "Failed to fetch dashboard data",
        data: { batch: null, scheduledJobs: [], timestamp: new Date().toISOString() },
      },
      500
    );
  }
});

export default app;