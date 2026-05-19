// src/routes/contacts.ts
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { userDatabase } from "../services/userDatabase";

const app = new Hono();

// GET /api/contacts/groups - Get contact groups with counts
app.get("/groups", async (c) => {
  try {
    const user = requireAuth(c);
    const allContacts = await userDatabase.getUserContacts(user.id);
    
    // Calculate group counts - using group_name
    const groups = [
      { name: "All Contacts", count: allContacts.length },
      { name: "Newsletter", count: allContacts.filter(c => c.group_name === "newsletter").length },
      { name: "Customers", count: allContacts.filter(c => c.group_name === "customer").length },
      { name: "Leads", count: allContacts.filter(c => c.group_name === "lead").length },
      { name: "Partners", count: allContacts.filter(c => c.group_name === "partner").length }
    ];
    
    return c.json({ groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return c.json({ groups: [] });
  }
});

// GET /api/contacts - Get all contacts with pagination
app.get("/", async (c) => {
  try {
    const user = requireAuth(c);
    const page = Number(c.req.query("page")) || 1;
    const limit = Number(c.req.query("limit")) || 20;
    const search = c.req.query("search") || "";
    const group = c.req.query("group") || "";
    
    let contacts = await userDatabase.getUserContacts(user.id);
    
    // Apply search filter
    if (search) {
      contacts = contacts.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Apply group filter - using group_name
    if (group && group !== "All Contacts") {
      contacts = contacts.filter(c => c.group_name === group.toLowerCase());
    }
    
    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedContacts = contacts.slice(start, end);
    
    return c.json({
      success: true,
      data: paginatedContacts,
      total: contacts.length,
      page,
      limit,
      totalPages: Math.ceil(contacts.length / limit)
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return c.json({
      success: false,
      message: "Failed to fetch contacts",
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    }, 500);
  }
});

// GET /api/contacts/:id - Get single contact by ID
app.get("/:id", async (c) => {
  try {
    const user = requireAuth(c);
    const id = c.req.param("id");
    
    const contact = await userDatabase.getContactById(id);
    
    if (!contact) {
      return c.json({ success: false, message: "Contact not found" }, 404);
    }
    
    // Verify contact belongs to user
    if (contact.user_id !== user.id) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    
    return c.json({ success: true, contact });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return c.json({ success: false, message: "Failed to fetch contact" }, 500);
  }
});

// POST /api/contacts - Create a new contact
app.post("/", async (c) => {
  try {
    const user = requireAuth(c);
    const body = await c.req.json();
    
    // Validate required fields
    if (!body.name || !body.email) {
      return c.json(
        { success: false, message: "Name and email are required" },
        400
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json({ success: false, message: "Invalid email format" }, 400);
    }
    
    // Create contact - using group_name
    const contact = await userDatabase.createContact(user.id, {
      name: body.name,
      email: body.email,
      group_name: body.group || null,  // Changed from 'group' to 'group_name'
      phone: body.phone || null,
      company: body.company || null,
      notes: body.notes || null
    });
    
    console.log(`✅ Contact created for user ${user.email}: ${body.name} (${body.email})`);
    
    return c.json({
      success: true,
      message: "Contact created successfully",
      contact
    });
  } catch (error: any) {
    console.error("Error creating contact:", error);
    
    if (error.message === "Contact with this email already exists") {
      return c.json({ success: false, message: error.message }, 409);
    }
    
    return c.json(
      { success: false, message: error.message || "Failed to create contact" },
      500
    );
  }
});

// PUT /api/contacts/:id - Update a contact
app.put("/:id", async (c) => {
  try {
    const user = requireAuth(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    
    // Check if contact exists and belongs to user
    const existingContact = await userDatabase.getContactById(id);
    if (!existingContact) {
      return c.json({ success: false, message: "Contact not found" }, 404);
    }
    
    if (existingContact.user_id !== user.id) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    
    // Update contact - using group_name
    const updatedContact = await userDatabase.updateContact(id, user.id, {
      name: body.name,
      email: body.email,
      group_name: body.group,  // Changed from 'group' to 'group_name'
      phone: body.phone,
      company: body.company,
      notes: body.notes
    });
    
    if (!updatedContact) {
      return c.json({ success: false, message: "Failed to update contact" }, 500);
    }
    
    console.log(`✏️ Contact updated: ${id} by user ${user.email}`);
    
    return c.json({
      success: true,
      message: "Contact updated successfully",
      contact: updatedContact
    });
  } catch (error: any) {
    console.error("Error updating contact:", error);
    
    if (error.message === "Contact with this email already exists") {
      return c.json({ success: false, message: error.message }, 409);
    }
    
    return c.json(
      { success: false, message: error.message || "Failed to update contact" },
      500
    );
  }
});

// DELETE /api/contacts/:id - Delete a contact
app.delete("/:id", async (c) => {
  try {
    const user = requireAuth(c);
    const id = c.req.param("id");
    
    // Check if contact exists and belongs to user
    const existingContact = await userDatabase.getContactById(id);
    if (!existingContact) {
      return c.json({ success: false, message: "Contact not found" }, 404);
    }
    
    if (existingContact.user_id !== user.id) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    
    // Delete contact
    const deleted = await userDatabase.deleteContact(id, user.id);
    
    if (!deleted) {
      return c.json({ success: false, message: "Failed to delete contact" }, 500);
    }
    
    console.log(`🗑️ Contact deleted: ${id} by user ${user.email}`);
    
    return c.json({
      success: true,
      message: "Contact deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return c.json(
      { success: false, message: "Failed to delete contact" },
      500
    );
  }
});

// POST /api/contacts/bulk-delete - Delete multiple contacts
app.post("/bulk-delete", async (c) => {
  try {
    const user = requireAuth(c);
    const { contactIds } = await c.req.json();
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return c.json(
        { success: false, message: "Contact IDs are required" },
        400
      );
    }
    
    const deletedCount = await userDatabase.bulkDeleteContacts(contactIds, user.id);
    
    console.log(`🗑️ Bulk deleted ${deletedCount} contacts for user ${user.email}`);
    
    return c.json({
      success: true,
      message: `${deletedCount} contacts deleted successfully`,
      deletedCount
    });
  } catch (error) {
    console.error("Error bulk deleting contacts:", error);
    return c.json(
      { success: false, message: "Failed to delete contacts" },
      500
    );
  }
});

// GET /api/contacts/search/:term - Search contacts
app.get("/search/:term", async (c) => {
  try {
    const user = requireAuth(c);
    const term = c.req.param("term");
    
    if (!term || term.length < 2) {
      return c.json({
        success: true,
        data: [],
        total: 0
      });
    }
    
    const contacts = await userDatabase.searchContacts(user.id, term);
    
    return c.json({
      success: true,
      data: contacts,
      total: contacts.length
    });
  } catch (error) {
    console.error("Error searching contacts:", error);
    return c.json(
      { success: false, message: "Failed to search contacts", data: [], total: 0 },
      500
    );
  }
});

// GET /api/contacts/export/csv - Export contacts to CSV
app.get("/export/csv", async (c) => {
  try {
    const user = requireAuth(c);
    const contacts = await userDatabase.getUserContacts(user.id);
    
    // Create CSV header
    const headers = ["Name", "Email", "Group", "Phone", "Company", "Notes", "Created At"];
    const csvRows = [headers];
    
    // Add data rows - using group_name
    for (const contact of contacts) {
      csvRows.push([
        `"${contact.name.replace(/"/g, '""')}"`,
        `"${contact.email.replace(/"/g, '""')}"`,
        `"${(contact.group_name || "").replace(/"/g, '""')}"`,  // Changed from group to group_name
        `"${(contact.phone || "").replace(/"/g, '""')}"`,
        `"${(contact.company || "").replace(/"/g, '""')}"`,
        `"${(contact.notes || "").replace(/"/g, '""')}"`,
        contact.created_at
      ]);
    }
    
    const csvContent = csvRows.map(row => row.join(",")).join("\n");
    
    c.header("Content-Type", "text/csv");
    c.header("Content-Disposition", `attachment; filename="contacts_${Date.now()}.csv"`);
    
    return c.body(csvContent);
  } catch (error) {
    console.error("Error exporting contacts:", error);
    return c.json({ success: false, message: "Failed to export contacts" }, 500);
  }
});

export default app;