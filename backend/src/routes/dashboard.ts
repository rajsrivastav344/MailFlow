// src/routes/dashboard.ts
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";

const app = new Hono();

// ✅ ADD THIS - Simple stats endpoint for frontend
app.get("/stats", async (c) => {
  try {
    const user = requireAuth(c);
    
    // You can enhance this with real data from your services
    return c.json({
      totalContacts: 0,
      totalCampaigns: 0,
      emailsSent: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0
    });
  } catch (error) {
    console.error("Stats endpoint error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
});

// ✅ FIXED: Remove "/dashboard" from path - now just "/poll-status"
app.get("/poll-status", async (c) => {
  try {
    requireAuth(c);
  } catch (error) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  try {
    let hasActiveBatch = false;
    let hasScheduledJobs = false;
    let hasRunningScheduledJobs = false;

    try {
      const { batchService } = await import("../services/batchService.js");
      const status = batchService.getBatchStatus();
      hasActiveBatch = status.isRunning;
    } catch (err) {
      console.log("Batch service not available:", err);
      hasActiveBatch = false;
    }

    try {
      const { schedulerService } = await import("../services/schedulerService.js");
      const jobs = await schedulerService.getScheduledJobs();
      hasScheduledJobs = jobs && jobs.length > 0;
      hasRunningScheduledJobs = jobs && jobs.some((j: any) => j.status === "running");
    } catch (err) {
      console.log("Scheduler service not available:", err);
      hasScheduledJobs = false;
      hasRunningScheduledJobs = false;
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
        scheduledJobCount: hasScheduledJobs ? (hasRunningScheduledJobs ? 2 : 1) : 0,
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
      },
    });
  }
});

// ✅ FIXED: Remove "/dashboard" from path - now just "/data"
app.get("/data", async (c) => {
  try {
    requireAuth(c);
  } catch (error) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  try {
    let batchStatus = null;
    let scheduledJobs: any[] = [];

    try {
      const { batchService } = await import("../services/batchService.js");
      batchStatus = batchService.getBatchStatus();
    } catch (err) {
      console.log("Batch service not available:", err);
    }

    try {
      const { schedulerService } = await import("../services/schedulerService.js");
      const jobs = await schedulerService.getScheduledJobs();
      scheduledJobs = jobs && jobs.length > 0
        ? jobs
            .filter((j: any) => j.status === "scheduled" || j.status === "running")
            .slice(0, 5)
        : [];
    } catch (err) {
      console.log("Scheduler service not available:", err);
    }

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