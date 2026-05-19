// src/services/userDatabase.ts
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { hash, verify } from "argon2";
import { createHmac, randomBytes } from "crypto";

// ==================== Types ====================

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface UserSMTPConfig {
  id: string;
  user_id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean | number;
  user: string;
  pass: string;
  from_email: string;
  from_name: string;
  is_default: boolean | number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  group_name: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  recipient_group: string | null;
  status: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== Database Class ====================

class UserDatabase {
  private db: InstanceType<typeof Database>;
  private sessionSecret: string;

  constructor() {
    const dbPath = "./data/users.db";
    const dbDir = dirname(dbPath);

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    this.sessionSecret =
      process.env.SESSION_SECRET || this.generateFallbackSecret();

    if (!process.env.SESSION_SECRET) {
      console.warn("⚠️  No SESSION_SECRET in .env — using temporary secret");
    } else {
      console.log("🔒 Session secret loaded from environment");
    }

    this.initDatabase();
  }

  private generateFallbackSecret(): string {
    return randomBytes(64).toString("hex");
  }

  // ==================== Database Initialization ====================

  private initDatabase() {
    this.db.exec(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT UNIQUE NOT NULL,
        name          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login    TEXT,
        is_active     INTEGER DEFAULT 1
      );

      -- User sessions table
      CREATE TABLE IF NOT EXISTS user_sessions (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        token      TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- SMTP configurations table
      CREATE TABLE IF NOT EXISTS user_smtp_configs (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        name       TEXT NOT NULL,
        host       TEXT NOT NULL,
        port       INTEGER NOT NULL,
        secure     INTEGER NOT NULL DEFAULT 0,
        user       TEXT NOT NULL,
        pass       TEXT NOT NULL,
        from_email TEXT NOT NULL,
        from_name  TEXT DEFAULT '',
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Contacts table
      CREATE TABLE IF NOT EXISTS contacts (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        group_name TEXT,
        phone      TEXT,
        company    TEXT,
        notes      TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, email)
      );

      -- Campaigns table
      CREATE TABLE IF NOT EXISTS campaigns (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL,
        name            TEXT NOT NULL,
        subject         TEXT NOT NULL,
        body            TEXT NOT NULL,
        recipient_group TEXT,
        status          TEXT DEFAULT 'draft',
        sent_count      INTEGER DEFAULT 0,
        open_count      INTEGER DEFAULT 0,
        click_count     INTEGER DEFAULT 0,
        scheduled_at    TEXT,
        sent_at         TEXT,
        created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at      TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_sessions_token    ON user_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id  ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_smtp_user_id      ON user_smtp_configs(user_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_user_id  ON contacts(user_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_email    ON contacts(email);
      CREATE INDEX IF NOT EXISTS idx_contacts_group    ON contacts(group_name);
      CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
      CREATE INDEX IF NOT EXISTS idx_campaigns_status  ON campaigns(status);
    `);

    console.log("✅ User database initialized");
  }

  // ==================== Token Helpers ====================

  private generateSecureToken(userId: string): string {
    const randomPart = randomBytes(32).toString("hex");
    const timestamp = Date.now().toString();
    const payload = `${userId}:${timestamp}:${randomPart}`;
    const signature = createHmac("sha256", this.sessionSecret)
      .update(payload)
      .digest("hex");
    return `${payload}:${signature}`;
  }

  private verifyToken(
    token: string
  ): { userId: string; timestamp: number } | null {
    try {
      const parts = token.split(":");
      if (parts.length === 4) {
        const [userId, timestamp, randomPart, signature] = parts;
        const payload = `${userId}:${timestamp}:${randomPart}`;
        const expected = createHmac("sha256", this.sessionSecret)
          .update(payload)
          .digest("hex");
        if (signature !== expected) return null;
        return { userId, timestamp: parseInt(timestamp) };
      }
      return null;
    } catch {
      return null;
    }
  }

  // ==================== User Management ====================

  async createUser(email: string, name: string, password: string): Promise<string> {
    const userId = `user_${Date.now()}`;
    const passwordHash = await hash(password);

    try {
      this.db
        .prepare(
          "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)"
        )
        .run(userId, email.toLowerCase().trim(), name.trim(), passwordHash);

      console.log(`👤 User created: ${email}`);
      return userId;
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed")) {
        throw new Error("Email already exists");
      }
      throw error;
    }
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const row = this.db
      .prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
      .get(email.toLowerCase().trim()) as any;

    if (!row) return null;

    const isValid = await verify(row.password_hash, password);
    if (!isValid) return null;

    this.db
      .prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?")
      .run(row.id);

    return this.rowToUser(row);
  }

  getUserById(userId: string): User | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE id = ? AND is_active = 1")
      .get(userId) as any;
    return row ? this.rowToUser(row) : null;
  }

  getUserByEmail(email: string): User | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
      .get(email.toLowerCase().trim()) as any;
    return row ? this.rowToUser(row) : null;
  }

  async updateUser(userId: string, updates: { name?: string; email?: string }): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name) {
      fields.push("name = ?");
      values.push(updates.name.trim());
    }
    if (updates.email) {
      fields.push("email = ?");
      values.push(updates.email.toLowerCase().trim());
    }

    if (fields.length === 0) return false;

    values.push(userId);
    const result = this.db
      .prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values);

    return result.changes > 0;
  }

  async changePassword(userId: string, newPassword: string): Promise<boolean> {
    const passwordHash = await hash(newPassword);
    const result = this.db
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .run(passwordHash, userId);
    return result.changes > 0;
  }

  private rowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      password_hash: row.password_hash,
      created_at: row.created_at,
      last_login: row.last_login,
      is_active: row.is_active === 1,
    };
  }

  // ==================== Session Management ====================

  async createSession(userId: string): Promise<string> {
    const sessionId = `sess_${Date.now()}`;
    const token = this.generateSecureToken(userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    this.db
      .prepare(
        "DELETE FROM user_sessions WHERE user_id = ? AND expires_at < CURRENT_TIMESTAMP"
      )
      .run(userId);

    this.db
      .prepare(
        "INSERT INTO user_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
      )
      .run(sessionId, userId, token, expiresAt);

    return token;
  }

  validateSession(token: string): User | null {
    try {
      const tokenData = this.verifyToken(token);
      if (!tokenData) return null;

      const row = this.db
        .prepare(
          `SELECT s.*, u.id as uid, u.email, u.name, u.password_hash, u.created_at as ucreated, u.last_login, u.is_active
           FROM user_sessions s
           JOIN users u ON s.user_id = u.id
           WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1`
        )
        .get(token) as any;

      if (!row) return null;

      return {
        id: row.uid,
        email: row.email,
        name: row.name,
        password_hash: row.password_hash,
        created_at: row.ucreated,
        last_login: row.last_login,
        is_active: row.is_active === 1,
      };
    } catch (error) {
      console.error("Session validation error:", error);
      return null;
    }
  }

  deleteSession(token: string): void {
    this.db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
  }

  deleteAllUserSessions(userId: string): void {
    this.db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(userId);
  }

  cleanExpiredSessions(): void {
    const result = this.db
      .prepare("DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP")
      .run();
    if (result.changes > 0) {
      console.log(`🧹 Cleaned ${result.changes} expired sessions`);
    }
  }

  // ==================== SMTP Configuration ====================

  async createSMTPConfig(
    userId: string,
    config: {
      name: string;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from_email: string;
      from_name?: string;
      is_default?: boolean;
    }
  ): Promise<string> {
    const configId = `smtp_${Date.now()}`;

    if (config.is_default) {
      this.db
        .prepare("UPDATE user_smtp_configs SET is_default = 0 WHERE user_id = ?")
        .run(userId);
    }

    this.db
      .prepare(
        `INSERT INTO user_smtp_configs
         (id, user_id, name, host, port, secure, user, pass, from_email, from_name, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        configId,
        userId,
        config.name,
        config.host,
        config.port,
        config.secure ? 1 : 0,
        config.user,
        config.pass,
        config.from_email,
        config.from_name || "",
        config.is_default ? 1 : 0
      );

    return configId;
  }

  getUserSMTPConfigs(userId: string): UserSMTPConfig[] {
    return this.db
      .prepare(
        "SELECT * FROM user_smtp_configs WHERE user_id = ? ORDER BY is_default DESC, created_at DESC"
      )
      .all(userId) as UserSMTPConfig[];
  }

  getUserDefaultSMTPConfig(userId: string): UserSMTPConfig | null {
    return (
      (this.db
        .prepare(
          "SELECT * FROM user_smtp_configs WHERE user_id = ? AND is_default = 1 LIMIT 1"
        )
        .get(userId) as UserSMTPConfig | undefined) ?? null
    );
  }

  updateSMTPConfig(
    configId: string,
    userId: string,
    updates: Partial<UserSMTPConfig>
  ): boolean {
    const allowed = [
      "name", "host", "port", "secure", "user", "pass",
      "from_email", "from_name", "is_default",
    ];
    const fields = Object.keys(updates).filter((k) => allowed.includes(k));
    if (fields.length === 0) return false;

    if (updates.is_default) {
      this.db
        .prepare(
          "UPDATE user_smtp_configs SET is_default = 0 WHERE user_id = ? AND id != ?"
        )
        .run(userId, configId);
    }

    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => {
      const v = updates[f as keyof UserSMTPConfig];
      if (f === "secure" || f === "is_default") return v ? 1 : 0;
      return v;
    });

    const result = this.db
      .prepare(
        `UPDATE user_smtp_configs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`
      )
      .run(...values, configId, userId);

    return result.changes > 0;
  }

  deleteSMTPConfig(configId: string, userId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM user_smtp_configs WHERE id = ? AND user_id = ?")
      .run(configId, userId);
    return result.changes > 0;
  }

  // ==================== Contact Management ====================

  async createContact(
    userId: string,
    contactData: {
      name: string;
      email: string;
      group_name?: string;
      phone?: string;
      company?: string;
      notes?: string;
    }
  ): Promise<Contact> {
    const contactId = `cont_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`; // Fixed: substr -> substring

    try {
      this.db
        .prepare(
          `INSERT INTO contacts (id, user_id, name, email, group_name, phone, company, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          contactId,
          userId,
          contactData.name.trim(),
          contactData.email.toLowerCase().trim(),
          contactData.group_name || null,
          contactData.phone || null,
          contactData.company || null,
          contactData.notes || null
        );

      console.log(`📇 Contact created: ${contactData.name} (${contactData.email})`);
      const contact = await this.getContactById(contactId); // Fixed: added await
      return contact!;
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed")) {
        throw new Error("Contact with this email already exists");
      }
      throw error;
    }
  }

  async getUserContacts(userId: string): Promise<Contact[]> {
    return this.db
      .prepare(
        `SELECT * FROM contacts 
         WHERE user_id = ? 
         ORDER BY created_at DESC`
      )
      .all(userId) as Contact[];
  }

  async getContactById(contactId: string): Promise<Contact | null> {
    const row = this.db
      .prepare("SELECT * FROM contacts WHERE id = ?")
      .get(contactId) as any;
    return row ? this.rowToContact(row) : null;
  }

  async updateContact(
    contactId: string,
    userId: string,
    updates: Partial<Omit<Contact, "id" | "user_id" | "created_at" | "updated_at">>
  ): Promise<Contact | null> {
    const allowed = ["name", "email", "group_name", "phone", "company", "notes"];
    const fields = Object.keys(updates).filter((k) => allowed.includes(k));

    if (fields.length === 0) return null;

    const existing = this.db
      .prepare("SELECT * FROM contacts WHERE id = ? AND user_id = ?")
      .get(contactId, userId) as any;

    if (!existing) return null;

    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => {
      let v = updates[f as keyof typeof updates];
      if (f === "email" && v) return (v as string).toLowerCase().trim();
      if (typeof v === "string") return v.trim();
      return v;
    });

    this.db
      .prepare(
        `UPDATE contacts SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND user_id = ?`
      )
      .run(...values, contactId, userId);

    return this.getContactById(contactId);
  }

  async deleteContact(contactId: string, userId: string): Promise<boolean> {
    const result = this.db
      .prepare("DELETE FROM contacts WHERE id = ? AND user_id = ?")
      .run(contactId, userId);

    if (result.changes > 0) {
      console.log(`🗑️ Contact deleted: ${contactId}`);
    }

    return result.changes > 0;
  }

  async getContactCount(userId: string): Promise<number> {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM contacts WHERE user_id = ?")
      .get(userId) as any;
    return result?.count || 0;
  }

  async getContactsByGroup(userId: string, groupName: string): Promise<Contact[]> {
    return this.db
      .prepare(
        `SELECT * FROM contacts 
         WHERE user_id = ? AND group_name = ? 
         ORDER BY name ASC`
      )
      .all(userId, groupName) as Contact[];
  }

  async searchContacts(userId: string, searchTerm: string): Promise<Contact[]> {
    const term = `%${searchTerm.toLowerCase()}%`;
    return this.db
      .prepare(
        `SELECT * FROM contacts 
         WHERE user_id = ? 
         AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ?)
         ORDER BY name ASC`
      )
      .all(userId, term, term, term) as Contact[];
  }

  async bulkDeleteContacts(contactIds: string[], userId: string): Promise<number> {
    const placeholders = contactIds.map(() => "?").join(",");
    const result = this.db
      .prepare(`DELETE FROM contacts WHERE id IN (${placeholders}) AND user_id = ?`)
      .run(...contactIds, userId);
    return result.changes;
  }

  private rowToContact(row: any): Contact {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      email: row.email,
      group_name: row.group_name,
      phone: row.phone,
      company: row.company,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // ==================== Campaign Management ====================

  async createCampaign(
    userId: string,
    campaignData: {
      name: string;
      subject: string;
      body: string;
      recipient_group?: string;
      status?: string;
      scheduled_at?: string;
    }
  ): Promise<Campaign> {
    const campaignId = `camp_${Date.now()}`;

    this.db
      .prepare(
        `INSERT INTO campaigns (id, user_id, name, subject, body, recipient_group, status, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        campaignId,
        userId,
        campaignData.name.trim(),
        campaignData.subject.trim(),
        campaignData.body,
        campaignData.recipient_group || null,
        campaignData.status || "draft",
        campaignData.scheduled_at || null
      );

    const campaign = await this.getCampaignById(campaignId); // Fixed: added await
    return campaign!;
  }

  async getUserCampaigns(userId: string): Promise<Campaign[]> {
    return this.db
      .prepare(
        `SELECT * FROM campaigns 
         WHERE user_id = ? 
         ORDER BY created_at DESC`
      )
      .all(userId) as Campaign[];
  }

  async getCampaignById(campaignId: string): Promise<Campaign | null> {
    const row = this.db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .get(campaignId) as any;
    return row ? this.rowToCampaign(row) : null;
  }

  async updateCampaign(
    campaignId: string,
    userId: string,
    updates: Partial<Omit<Campaign, "id" | "user_id" | "created_at">>
  ): Promise<Campaign | null> {
    const allowed = ["name", "subject", "body", "recipient_group", "status", "scheduled_at"];
    const fields = Object.keys(updates).filter((k) => allowed.includes(k));

    if (fields.length === 0) return null;

    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => updates[f as keyof typeof updates]);

    this.db
      .prepare(
        `UPDATE campaigns SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND user_id = ?`
      )
      .run(...values, campaignId, userId);

    return this.getCampaignById(campaignId);
  }

  async deleteCampaign(campaignId: string, userId: string): Promise<boolean> {
    const result = this.db
      .prepare("DELETE FROM campaigns WHERE id = ? AND user_id = ?")
      .run(campaignId, userId);
    return result.changes > 0;
  }

  async updateCampaignStats(
    campaignId: string,
    stats: { sent_count?: number; open_count?: number; click_count?: number }
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (stats.sent_count !== undefined) {
      fields.push("sent_count = ?");
      values.push(stats.sent_count);
    }
    if (stats.open_count !== undefined) {
      fields.push("open_count = ?");
      values.push(stats.open_count);
    }
    if (stats.click_count !== undefined) {
      fields.push("click_count = ?");
      values.push(stats.click_count);
    }

    if (fields.length === 0) return false;

    values.push(campaignId);
    const result = this.db
      .prepare(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values);

    return result.changes > 0;
  }

  private rowToCampaign(row: any): Campaign {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      subject: row.subject,
      body: row.body,
      recipient_group: row.recipient_group,
      status: row.status,
      sent_count: row.sent_count,
      open_count: row.open_count,
      click_count: row.click_count,
      scheduled_at: row.scheduled_at,
      sent_at: row.sent_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// ==================== Export Singleton ====================

export const userDatabase = new UserDatabase();

// Clean expired sessions every hour
setInterval(() => userDatabase.cleanExpiredSessions(), 60 * 60 * 1000);