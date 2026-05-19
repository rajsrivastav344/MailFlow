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

        const contact: Contact = { Email: "" };

        headers.forEach((header, idx) => {
          if (!header?.trim()) return;
          const clean = header.trim();
          const value = row[idx] ? String(row[idx]).trim() : "";

          const lower = clean.toLowerCase();
          if (lower.includes("email")) {
            contact.Email = value;
          } else if (lower.includes("firstname") || lower.includes("first_name") || lower === "first") {
            contact.FirstName = value;
          } else if (lower.includes("lastname") || lower.includes("last_name") || lower === "last") {
            contact.LastName = value;
          } else if (lower.includes("company")) {
            contact.Company = value;
          } else if (lower.includes("subject")) {
            contact.Subject = value;
          } else {
            contact[clean] = value;
          }
        });

        if (contact.Email && this.isValidEmail(contact.Email)) {
          contacts.push(contact);
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
    result = result.replace(/\{\{FirstName\}\}/g, contact.FirstName || "");
    result = result.replace(/\{\{LastName\}\}/g, contact.LastName || "");
    result = result.replace(/\{\{Company\}\}/g, contact.Company || "");
    result = result.replace(/\{\{Email\}\}/g, contact.Email || "");
    result = result.replace(/\{\{Subject\}\}/g, contact.Subject || "");

    Object.keys(contact).forEach((key) => {
      if (!["Email", "FirstName", "LastName", "Company", "Subject"].includes(key)) {
        result = result.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          String(contact[key] || "")
        );
      }
    });

    return result;
  }
}
