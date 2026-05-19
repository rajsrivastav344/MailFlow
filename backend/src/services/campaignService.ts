// backend/src/services/campaignService.ts
import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

// Ensure data directory exists
const dbPath = "./data/campaigns.db";
const dbDir = dirname(dbPath);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    recipient_group TEXT,
    status TEXT DEFAULT 'draft',
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    scheduled_at TEXT,
    sent_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
  CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
  CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
`);

export const campaignService = {
  async getUserCampaigns(userId: string, page: number = 1, limit: number = 15, status?: string) {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM campaigns WHERE user_id = ?`;
    const params: any[] = [userId];
    
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const campaigns = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM campaigns WHERE user_id = ?`;
    const countParams: any[] = [userId];
    
    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    
    const total = (db.prepare(countQuery).get(...countParams) as any).total;
    const totalPages = Math.ceil(total / limit);
    
    return {
      campaigns,
      page,
      limit,
      total,
      totalPages,
    };
  },

  async getCampaignById(id: string, userId: string) {
    const stmt = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND user_id = ?
    `);
    return stmt.get(id, userId);
  },

  async createCampaign(data: any) {
    const id = `camp_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const stmt = db.prepare(`
      INSERT INTO campaigns (id, user_id, name, subject, body, recipient_group, status, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      data.user_id,
      data.name,
      data.subject,
      data.body,
      data.recipient_group || null,
      data.status,
      data.scheduled_at || null
    );
    
    return this.getCampaignById(id, data.user_id);
  },

  async updateCampaign(id: string, userId: string, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
    if (data.subject !== undefined) { fields.push("subject = ?"); values.push(data.subject); }
    if (data.body !== undefined) { fields.push("body = ?"); values.push(data.body); }
    if (data.recipient_group !== undefined) { fields.push("recipient_group = ?"); values.push(data.recipient_group); }
    if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
    if (data.scheduled_at !== undefined) { fields.push("scheduled_at = ?"); values.push(data.scheduled_at); }
    
    if (fields.length === 0) return null;
    
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id, userId);
    
    const stmt = db.prepare(`
      UPDATE campaigns SET ${fields.join(", ")} WHERE id = ? AND user_id = ?
    `);
    
    const result = stmt.run(...values);
    if (result.changes === 0) return null;
    
    return this.getCampaignById(id, userId);
  },

  async deleteCampaign(id: string, userId: string) {
    const stmt = db.prepare(`DELETE FROM campaigns WHERE id = ? AND user_id = ?`);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  },

  async sendCampaign(id: string, userId: string, recipientGroup?: string, testEmail?: string) {
    const campaign = await this.getCampaignById(id, userId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    
    if (testEmail) {
      // Send test email logic here
      console.log(`Sending test email to ${testEmail} for campaign: ${campaign.name}`);
      return { testSent: true, email: testEmail };
    }
    
    // Update status to sending
    const updateStmt = db.prepare(`
      UPDATE campaigns SET status = 'sending', sent_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?
    `);
    updateStmt.run(id, userId);
    
    // TODO: Implement actual email sending logic
    console.log(`Sending campaign ${id} to ${recipientGroup || "all contacts"}`);
    
    // Simulate sending and update stats
    const completeStmt = db.prepare(`
      UPDATE campaigns SET status = 'sent', sent_count = ? WHERE id = ?
    `);
    completeStmt.run(100, id); // Placeholder count
    
    return { success: true, campaignId: id };
  },

  async getCampaignStats(id: string, userId: string) {
    const stmt = db.prepare(`
      SELECT sent_count, open_count, click_count, status, created_at, sent_at
      FROM campaigns WHERE id = ? AND user_id = ?
    `);
    return stmt.get(id, userId);
  },

  async duplicateCampaign(id: string, userId: string) {
    const original = await this.getCampaignById(id, userId);
    if (!original) return null;
    
    const newId = `camp_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const stmt = db.prepare(`
      INSERT INTO campaigns (id, user_id, name, subject, body, recipient_group, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      newId,
      userId,
      `${original.name} (Copy)`,
      original.subject,
      original.body,
      original.recipient_group,
      "draft"
    );
    
    return this.getCampaignById(newId, userId);
  },
};