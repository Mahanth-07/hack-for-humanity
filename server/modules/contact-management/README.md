# Contact Management Module - Developer Workspace 4

  ## 🎯 Module Purpose
  Emergency contact database with role-based organization and priority routing.

  ## 📁 Your Workspace
  ```
  server/modules/contact-management/
  ├── routes.ts          # Your API endpoints
  ├── controller.ts      # Add controllers here
  ├── service.ts         # Add business logic here
  └── README.md          # This file
  ```

  ## 🔌 API Endpoints

  ### GET /api/modules/contact-management
  List all contacts
  ```typescript
  Query params: ?role=fire&active=true
  Response: Contact[]
  ```

  ### GET /api/modules/contact-management/:id
  Get contact details
  ```typescript
  Response: Contact
  ```

  ### POST /api/modules/contact-management
  Create new contact
  ```typescript
  Body: {
    name: string;
    phone: string;
    email?: string;
    role: "first_responder" | "medical" | "fire" | "police" | "coordinator";
    priority?: number; // 1-5, default 1
    metadata?: any;
  }
  Response: Contact
  ```

  ### PATCH /api/modules/contact-management/:id
  Update contact
  ```typescript
  Body: Partial<Contact>
  Response: Contact
  ```

  ### DELETE /api/modules/contact-management/:id
  Delete contact
  ```typescript
  Response: { message: string; contact: Contact }
  ```

  ### PATCH /api/modules/contact-management/:id/toggle
  Toggle active status
  ```typescript
  Response: Contact
  ```

  ### GET /api/modules/contact-management/role/:role
  Get contacts by role
  ```typescript
  Response: Contact[]
  ```

  ### POST /api/modules/contact-management/bulk
  Bulk create contacts
  ```typescript
  Body: { contacts: Contact[] }
  Response: { message: string; contacts: Contact[] }
  ```

  ## 💾 Database Access

  ```typescript
  import { db } from "../../db";
  import { contacts } from "@shared/schema";
  import { eq, asc } from "drizzle-orm";

  // Query by role
  const fireResponders = await db
    .select()
    .from(contacts)
    .where(eq(contacts.role, "fire"))
    .orderBy(asc(contacts.priority));

  // Create contact
  const [contact] = await db.insert(contacts).values({
    name: "John Doe",
    phone: "+1-555-0100",
    role: "first_responder",
    priority: 1,
    isActive: true
  }).returning();

  // Toggle status
  await db.update(contacts)
    .set({ isActive: !contact.isActive })
    .where(eq(contacts.id, contactId));
  ```

  ## 👥 Contact Roles

  - **first_responder** - First on scene, initial assessment
  - **medical** - Medical emergency services (EMS, paramedics)
  - **fire** - Fire department personnel
  - **police** - Law enforcement officers
  - **coordinator** - Emergency response coordinators

  ## 📊 Priority Levels

  - **1** - Highest priority (always contact first)
  - **2** - High priority
  - **3** - Medium priority
  - **4** - Low priority
  - **5** - Lowest priority (contact if needed)

  ## 🎯 Notification Routing

  Contacts are sorted by priority when initiating robocalls:

  ```typescript
  const priorityContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.isActive, true))
    .orderBy(asc(contacts.priority), asc(contacts.name));

  // Priority 1 contacts receive alerts first
  // Then priority 2, etc.
  ```

  ## 📋 Metadata Examples

  Store additional contact information:

  ```typescript
  {
    metadata: {
      specialization: "hazmat",
      availability: "24/7",
      equipment: ["ambulance", "defibrillator"],
      certifications: ["EMT-P", "ACLS"],
      responseTime: "5 minutes"
    }
  }
  ```

  ## 📡 Broadcasting Updates

  ```typescript
  import { broadcast } from "../../index";

  broadcast("contact_created", { contact });
  broadcast("contact_updated", { contact });
  broadcast("contact_status_changed", { contact });
  ```

  ## 🚀 Development Tips

  1. **Validation** - Ensure phone numbers are in valid format
  2. **Deduplication** - Check for duplicate contacts before creating
  3. **Bulk operations** - Use bulk endpoints for importing contact lists
  4. **Role filtering** - Pre-filter contacts by role for faster routing
  5. **Metadata flexibility** - Use metadata field for custom contact info

  ## 📋 Schema Reference

  ```typescript
  type Contact = {
    id: number;
    name: string;
    phone: string;
    email?: string;
    role: "first_responder" | "medical" | "fire" | "police" | "coordinator";
    priority: number; // 1-5
    isActive: boolean;
    metadata?: any;
    createdAt: Date;
  }
  ```

  ## 📞 Phone Format Examples

  - **US:** +1-555-0100
  - **International:** +44-20-1234-5678
  - **Emergency:** 911 (for reference only)
  