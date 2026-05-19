// src/services/fileService.ts
import * as XLSX from "xlsx";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import type { Contact } from "../types";

export class FileService {
  static async parseExcelFile(filePath: string): Promise<Contact[]> {
    try {
      if (!existsSync(filePath)) throw new Error("File does not exist");

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("No sheets found in Excel file");

      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      }) as any[][];

      if (data.length < 2)
        throw new Error("Excel file needs at least a header row and one data row");

      const headers = data[0] as string[];

      const emailIdx = headers.findIndex(
        (h) => typeof h === "string" && h.toLowerCase().includes("email")
      );
      if (emailIdx === -1)
        throw new Error('No "Email" column found in Excel file');

      const contacts: Contact[] = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        // Create contact with all fields as optional initially
        const contact: Partial<Contact> = {};

        headers.forEach((header, idx) => {
          if (!header?.trim()) return;
          const clean = header.trim();
          const value = row[idx] ? String(row[idx]).trim() : "";

          const lower = clean.toLowerCase();
          if (lower.includes("email")) {
            contact.email = value;
          } else if (lower.includes("firstname") || lower.includes("first_name") || lower === "first") {
            contact.name = value; // Store full name or first part
          } else if (lower.includes("lastname") || lower.includes("last_name") || lower === "last") {
            // If we already have a name, append last name
            if (contact.name) {
              contact.name = `${contact.name} ${value}`;
            } else {
              contact.name = value;
            }
          } else if (lower.includes("company")) {
            contact.company = value;
          } else if (lower.includes("subject")) {
            // Subject is not a standard Contact field, store in a custom property or skip
            // For now, we'll store it in a custom field if needed
          } else {
            // For any other column, try to match to Contact fields
            if (lower === "name") {
              contact.name = value;
            } else if (lower === "phone") {
              contact.phone = value;
            } else if (lower === "group_name" || lower === "group") {
              contact.group_name = value;
            } else if (lower === "notes") {
              contact.notes = value;
            } else {
              // For custom fields, we could store them, but Contact type doesn't have index signature
              // So we'll skip unknown fields
              console.log(`Skipping unknown field: ${clean}`);
            }
          }
        });

        // Only add contact if we have a valid email
        if (contact.email && this.isValidEmail(contact.email)) {
          // Ensure required fields exist with defaults
          const fullContact: Contact = {
            id: `temp_${Date.now()}_${i}`,
            user_id: "", // This will be set by the caller
            name: contact.name || "",
            email: contact.email,
            group_name: contact.group_name || null,
            phone: contact.phone || null,
            company: contact.company || null,
            notes: contact.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          contacts.push(fullContact);
        }
      }

      if (contacts.length === 0)
        throw new Error("No valid email addresses found in the Excel file");

      console.log(`✅ Parsed ${contacts.length} contacts from Excel`);
      return contacts;
    } catch (error) {
      if (error instanceof Error) throw new Error(`Failed to parse Excel: ${error.message}`);
      throw new Error("Failed to parse Excel: Unknown error");
    }
  }

  static async saveUploadedFile(file: Uint8Array, filename: string): Promise<string> {
    const uploadDir = "./uploads";
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const uploadPath = `${uploadDir}/${filename}`;
    await writeFile(uploadPath, file);
    return uploadPath;
  }

  static async readHTMLTemplate(filePath: string): Promise<string> {
    if (!existsSync(filePath)) throw new Error("HTML template file does not exist");
    return readFile(filePath, "utf-8");
  }

  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  static replacePlaceholders(template: string, contact: Contact): string {
    if (!template || !contact) return template || "";

    let result = template;
    
    // Replace common placeholders with Contact fields
    result = result.replace(/\{\{name\}\}/gi, contact.name || "");
    result = result.replace(/\{\{FirstName\}\}/gi, contact.name?.split(' ')[0] || "");
    result = result.replace(/\{\{LastName\}\}/gi, contact.name?.split(' ').slice(1).join(' ') || "");
    result = result.replace(/\{\{company\}\}/gi, contact.company || "");
    result = result.replace(/\{\{Company\}\}/gi, contact.company || "");
    result = result.replace(/\{\{email\}\}/gi, contact.email || "");
    result = result.replace(/\{\{Email\}\}/gi, contact.email || "");
    result = result.replace(/\{\{group_name\}\}/gi, contact.group_name || "");
    result = result.replace(/\{\{phone\}\}/gi, contact.phone || "");
    result = result.replace(/\{\{notes\}\}/gi, contact.notes || "");

    return result;
  }
}