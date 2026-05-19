// backend/src/routes/campaigns.ts
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/auth";
import { campaignService } from "../services/campaignService";

const campaigns = new Hono();

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  recipient_group: z.string().optional(),
  scheduled_at: z.string().optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  recipient_group: z.string().optional(),
  scheduled_at: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed']).optional(),
});

const sendCampaignSchema = z.object({
  recipient_group: z.string().optional(),
  test_email: z.string().email().optional(),
});

// Get all campaigns for current user
campaigns.get("/", async (c) => {
  try {
    const user = requireAuth(c);
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "15");
    const status = c.req.query("status");
    
    const result = await campaignService.getUserCampaigns(user.id, page, limit, status);
    
    return c.json({
      success: true,
      data: result.campaigns,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return c.json({ success: false, message: "Failed to fetch campaigns" }, 500);
  }
});

// Get single campaign
campaigns.get("/:id", async (c) => {
  try {
    const user = requireAuth(c);
    const id = c.req.param("id");
    
    const campaign = await campaignService.getCampaignById(id, user.id);
    if (!campaign) {
      return c.json({ success: false, message: "Campaign not found" }, 404);
    }
    
    return c.json({ success: true, data: campaign });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return c.json({ success: false, message: "Failed to fetch campaign" }, 500);
  }
});

// Create campaign
campaigns.post("/", zValidator("json", createCampaignSchema), async (c) => {
  try {
    const user = requireAuth(c);
    const data = c.req.valid("json");
    
    const campaign = await campaignService.createCampaign({
      ...data,
      user_id: user.id,
      status: data.scheduled_at ? "scheduled" : "draft",
    });
    
    return c.json({ 
      success: true, 
      data: campaign, 
      message: "Campaign created successfully" 
    }, 201);
  } catch (error) {
    console.error("Error creating campaign:", error);
    return c.json({ success: false, message: "Failed to create campaign" }, 500);
  }
});

// Update campaign
campaigns.put("/:id", zValidator("json", updateCampaignSchema), async (c) => {
  try {
    const user = requireAuth(c);
    const id = c.req.param("id");
    const data = c.req.valid("json");
    
    const updated = await campaignService.updateCampaign(id, user.id, data);
    if (!updated) {
      return c.json({ success: false, message: "Campaign not found" }, 404);
    }
    
    return c.json({ 
      success: true, 
      data: updated, 
      message: "Campaign updated successfully" 
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return c.json({ success: false, message: "Failed to update campaign" }, 500);
  }
});

// Delete campaign
campaigns.delete("/:id", async (c) => {
  try {
    const user = requireAuth(c);
    const id = c.req.param("id");
    
    const deleted = await campaignService.deleteCampaign(id, user.id);
    if (!deleted) {
      return c.json({ success: false, message: "Campaign not found" }, 404);
    }
    
    return c.json({ success: true, message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return c.json({ success: false, message: "Failed to delete campaign" }, 500);
  }
});

// Send campaign
campaigns.post("/:id/send", zValidator("json", sendCampaignSchema), async (c) => {
  try {
    const user = requireAuth(c);
    const id = c.req.param("id");
    const { recipient_group, test_email } = c.req.valid("json");
    
    // Start sending campaign
    const result = await campaignService.sendCampaign(id, user.id, recipient_group, test_email);
    
    return c.json({ 
      success: true, 
      message: test_email ? "Test email sent successfully" : "Campaign sending started",
      data: result 
    });
  } catch (error) {
    console.error("Error sending campaign:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send campaign";
    return c.json({ success: false, message: errorMessage }, 500);
  }
});

// Get campaign stats
campaigns.get("/:id/stats", async (c) => {
  try {
    const user = requireAuth(c);
    const id = c.req.param("id");
    
    const stats = await campaignService.getCampaignStats(id, user.id);
    if (!stats) {
      return c.json({ success: false, message: "Campaign not found" }, 404);
    }
    
    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching campaign stats:", error);
    return c.json({ success: false, message: "Failed to fetch stats" }, 500);
  }
});

// Duplicate campaign
campaigns.post("/:id/duplicate", async (c) => {
  try {
    const user = requireAuth(c);
    const id = c.req.param("id");
    
    const duplicated = await campaignService.duplicateCampaign(id, user.id);
    if (!duplicated) {
      return c.json({ success: false, message: "Campaign not found" }, 404);
    }
    
    return c.json({ 
      success: true, 
      data: duplicated, 
      message: "Campaign duplicated successfully" 
    }, 201);
  } catch (error) {
    console.error("Error duplicating campaign:", error);
    return c.json({ success: false, message: "Failed to duplicate campaign" }, 500);
  }
});

export default campaigns;