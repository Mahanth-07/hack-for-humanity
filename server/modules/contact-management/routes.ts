import { Router, Request, Response } from "express";
  import { db } from "../../db";
  import { contacts } from "@shared/schema";
  import { eq, desc, asc } from "drizzle-orm";

  const router = Router();

  // Get all contacts
  router.get("/", async (req: Request, res: Response) => {
    try {
      const { role, active } = req.query;
      
      let query = db.select().from(contacts).$dynamic();

      if (role) {
        query = query.where(eq(contacts.role, role as string));
      }

      if (active !== undefined) {
        query = query.where(eq(contacts.isActive, active === 'true'));
      }

const allContacts = await query.orderBy(asc(contacts.priority), asc(contacts.name));      res.json(allContacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  // Get contact by ID
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);

      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ error: "Failed to fetch contact" });
    }
  });

  // Create new contact
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { name, phone, email, role, priority, metadata } = req.body;

      if (!name || !phone || !role) {
        return res.status(400).json({ error: "Name, phone, and role are required" });
      }

      const [contact] = await db
        .insert(contacts)
        .values({
          name,
          phone,
          email: email || null,
          role,
          priority: priority || 1,
          isActive: true,
          metadata: metadata || null,
        })
        .returning();

      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  // Update contact
  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const { name, phone, email, role, priority, isActive, metadata } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (priority !== undefined) updateData.priority = priority;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (metadata !== undefined) updateData.metadata = metadata;

      const [updated] = await db
        .update(contacts)
        .set(updateData)
        .where(eq(contacts.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Contact not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  // Delete contact
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);

      const [deleted] = await db
        .delete(contacts)
        .where(eq(contacts.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }

      res.json({ message: "Contact deleted successfully", contact: deleted });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // Toggle contact active status
  router.patch("/:id/toggle", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);

      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);

      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      const [updated] = await db
        .update(contacts)
        .set({ isActive: !contact.isActive })
        .where(eq(contacts.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error toggling contact:", error);
      res.status(500).json({ error: "Failed to toggle contact" });
    }
  });

  // Get contacts by role
  router.get("/role/:role", async (req: Request, res: Response) => {
    try {
      const role = req.params.role as string;
      const contactsByRole = await db
        .select()
        .from(contacts)
        .where(eq(contacts.role, role))
        .orderBy(asc(contacts.priority));

      res.json(contactsByRole);
    } catch (error) {
      console.error("Error fetching contacts by role:", error);
      res.status(500).json({ error: "Failed to fetch contacts by role" });
    }
  });

  // Bulk create contacts (for seeding)
  router.post("/bulk", async (req: Request, res: Response) => {
    try {
      const { contacts: contactsData } = req.body;

      if (!Array.isArray(contactsData) || contactsData.length === 0) {
        return res.status(400).json({ error: "Contacts array is required" });
      }

      const created = await db
        .insert(contacts)
        .values(contactsData)
        .returning();

      res.json({ 
        message: `Created ${created.length} contacts`,
        contacts: created 
      });
    } catch (error) {
      console.error("Error bulk creating contacts:", error);
      res.status(500).json({ error: "Failed to bulk create contacts" });
    }
  });

  export default router;
  