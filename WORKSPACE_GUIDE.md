# Developer Workspace Guide

  ## 🏗️ Modular Architecture Overview

  This emergency response dashboard is designed for **4 developers to work simultaneously** without conflicts. Each module is completely isolated with its own directory, routes, and business logic.

  ## 👥 Workspace Assignments

  ### Workspace 1: Robocaller Module
  **Location:** `server/modules/robocaller/`  
  **Responsibility:** AI-powered emergency voice notifications  
  **Key Features:**
  - Voice message generation with OpenAI
  - Automated emergency call distribution
  - Call status tracking and retry logic
  - Integration with contact management

  📖 **Documentation:** [server/modules/robocaller/README.md](server/modules/robocaller/README.md)

  ---

  ### Workspace 2: Risk Analysis Module
  **Location:** `server/modules/risk-analysis/`  
  **Responsibility:** AI-driven threat assessment  
  **Key Features:**
  - Risk scoring (0-100 scale)
  - Threat level classification
  - AI-powered analysis and recommendations
  - Batch processing for multiple incidents

  📖 **Documentation:** [server/modules/risk-analysis/README.md](server/modules/risk-analysis/README.md)

  ---

  ### Workspace 3: Camera Processing Module
  **Location:** `server/modules/camera-processing/`  
  **Responsibility:** Real-time video analysis  
  **Key Features:**
  - Camera feed management
  - AI-powered threat detection
  - Auto-incident creation for critical detections
  - Detection confidence scoring

  📖 **Documentation:** [server/modules/camera-processing/README.md](server/modules/camera-processing/README.md)

  ---

  ### Workspace 4: Contact Management Module
  **Location:** `server/modules/contact-management/`  
  **Responsibility:** Emergency contact database  
  **Key Features:**
  - Contact CRUD operations
  - Role-based organization
  - Priority-based routing
  - Bulk contact management

  📖 **Documentation:** [server/modules/contact-management/README.md](server/modules/contact-management/README.md)

  ---

  ## 🔄 Shared Resources

  All modules have access to shared resources:

  ### Database Connection
  ```typescript
  import { db } from "../../db";
  ```

  ### Database Schema & Types
  ```typescript
  import { 
    incidents, 
    contacts, 
    robocalls, 
    riskAssessments,
    cameraFeeds,
    cameraDetections,
    moduleHealth 
  } from "@shared/schema";

  import type { 
    Incident, 
    Contact, 
    Robocall,
    RiskAssessment,
    CameraFeed,
    CameraDetection
  } from "@shared/schema";
  ```

  ### WebSocket Broadcasting
  ```typescript
  import { broadcast } from "../../index";

  // Notify all connected clients
  broadcast("event_name", { data: yourData });
  ```

  ### OpenAI Integration
  ```typescript
  import { openai } from "../../replit_integrations/audio/client";

  // No API key needed - automatically configured
  ```

  ---

  ## 🚀 Development Workflow

  ### 1. Choose Your Module
  Select one of the 4 workspaces based on your assignment.

  ### 2. Explore Your Directory
  ```
  server/modules/[your-module]/
  ├── routes.ts          # API endpoints (already created)
  ├── README.md          # Module documentation
  ├── controller.ts      # Create for request handlers
  ├── service.ts         # Create for business logic
  └── utils.ts           # Create for utilities
  ```

  ### 3. Add New Features
  Create new files as needed:

  ```typescript
  // Example: server/modules/robocaller/service.ts
  import { db } from "../../db";
  import { robocalls } from "@shared/schema";
  import { openai } from "../../replit_integrations/audio/client";

  export async function generateVoiceMessage(message: string) {
    const audio = await openai.audio.speech.create({
      model: "gpt-audio",
      voice: "alloy",
      input: message,
    });
    
    return audio;
  }
  ```

  ### 4. Register New Routes
  Add to your module's `routes.ts`:

  ```typescript
  // server/modules/robocaller/routes.ts
  import { generateVoiceMessage } from "./service";

  router.post("/generate-voice", async (req, res) => {
    const { message } = req.body;
    const audio = await generateVoiceMessage(message);
    res.json({ success: true });
  });
  ```

  Routes are automatically mounted at:
  - `/api/modules/robocaller/*`
  - `/api/modules/risk-analysis/*`
  - `/api/modules/camera-processing/*`
  - `/api/modules/contact-management/*`

  ### 5. Test Your Endpoints
  Use curl or Postman:

  ```bash
  # Test robocaller endpoint
  curl http://localhost:5000/api/modules/robocaller

  # Test with data
  curl -X POST http://localhost:5000/api/modules/robocaller \
    -H "Content-Type: application/json" \
    -d '{"contactId": 1, "message": "Test alert"}'
  ```

  ### 6. Broadcast Updates
  Notify the frontend of changes:

  ```typescript
  import { broadcast } from "../../index";

  // After creating/updating data
  broadcast("robocall_created", { robocall: newRobocall });
  ```

  ---

  ## 🔒 Workspace Isolation Rules

  ### ✅ DO:
  - Work exclusively in your assigned module directory
  - Create new files in your module as needed
  - Import shared resources (db, schema, broadcast)
  - Add routes to your module's `routes.ts`
  - Test your endpoints independently
  - Document your code and APIs

  ### ❌ DON'T:
  - Modify other modules' files
  - Change shared database schema without team discussion
  - Modify `server/routes.ts` (routes are pre-registered)
  - Modify `server/index.ts` (server setup is complete)
  - Create circular dependencies between modules

  ---

  ## 💾 Database Best Practices

  ### Querying Data
  ```typescript
  import { db } from "../../db";
  import { contacts, incidents } from "@shared/schema";
  import { eq, and, or, desc, asc } from "drizzle-orm";

  // Select
  const allContacts = await db.select().from(contacts);

  // Where
  const activeContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.isActive, true));

  // Multiple conditions
  const priorityFireContacts = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.role, "fire"),
        eq(contacts.priority, 1)
      )
    );

  // Order by
  const sortedIncidents = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.createdAt));
  ```

  ### Inserting Data
  ```typescript
  // Single insert
  const [contact] = await db
    .insert(contacts)
    .values({
      name: "John Doe",
      phone: "+1-555-0100",
      role: "first_responder",
    })
    .returning();

  // Bulk insert
  const newContacts = await db
    .insert(contacts)
    .values([
      { name: "Contact 1", phone: "111", role: "fire" },
      { name: "Contact 2", phone: "222", role: "police" },
    ])
    .returning();
  ```

  ### Updating Data
  ```typescript
  const [updated] = await db
    .update(contacts)
    .set({ 
      isActive: false,
      // Only include fields you want to update
    })
    .where(eq(contacts.id, contactId))
    .returning();
  ```

  ### Deleting Data
  ```typescript
  const [deleted] = await db
    .delete(contacts)
    .where(eq(contacts.id, contactId))
    .returning();
  ```

  ---

  ## 🤖 OpenAI Integration

  ### Text-to-Speech
  ```typescript
  import { openai } from "../../replit_integrations/audio/client";

  const audio = await openai.audio.speech.create({
    model: "gpt-audio",
    voice: "alloy", // alloy, echo, fable, onyx, nova, shimmer
    input: "Emergency alert message",
  });
  ```

  ### GPT-5.2 Chat
  ```typescript
  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Analyze this incident..." }
    ],
    response_format: { type: "json_object" } // For structured output
  });

  const result = JSON.parse(completion.choices[0].message.content);
  ```

  ### GPT-5.2 Vision
  ```typescript
  const vision = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "What's in this image?" },
        { 
          type: "image_url", 
          image_url: { 
            url: imageUrl // or data:image/jpeg;base64,...
          } 
        }
      ]
    }]
  });
  ```

  ---

  ## 📡 Real-time Communication

  ### Broadcasting Events
  ```typescript
  import { broadcast } from "../../index";

  // Common event patterns
  broadcast("incident_created", { incident });
  broadcast("incident_updated", { incident });
  broadcast("robocall_initiated", { robocall });
  broadcast("risk_assessment_complete", { assessment });
  broadcast("camera_detection", { detection });
  broadcast("contact_status_changed", { contact });
  ```

  ### Frontend receives via WebSocket
  The dashboard automatically listens and refreshes relevant data.

  ---

  ## 🧪 Testing Your Module

  ### Manual Testing
  1. Start the server: `npm run dev`
  2. Use curl, Postman, or Thunder Client
  3. Check console logs for debugging

  ### Example Tests
  ```bash
  # Test GET endpoint
  curl http://localhost:5000/api/modules/robocaller

  # Test POST endpoint
  curl -X POST http://localhost:5000/api/modules/contact-management \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Contact",
      "phone": "+1-555-9999",
      "role": "first_responder"
    }'

  # Test PATCH endpoint
  curl -X PATCH http://localhost:5000/api/modules/contact-management/1 \
    -H "Content-Type: application/json" \
    -d '{"isActive": false}'
  ```

  ---

  ## 📊 Module Communication

  While modules are isolated, they can interact via shared database:

  ```typescript
  // Robocaller module creating contacts
  import { contacts } from "@shared/schema";

  // Risk Analysis module reading incidents
  import { incidents } from "@shared/schema";

  // Camera module creating incidents
  const [incident] = await db.insert(incidents).values({...});

  // Contact module being used by Robocaller
  const allContacts = await db.select().from(contacts);
  ```

  **Key Point:** Modules share data through the database, not direct function calls.

  ---

  ## 🐛 Debugging Tips

  ### Enable Detailed Logging
  ```typescript
  import { log } from "../../index";

  log("Processing robocall for incident " + incidentId, "robocaller");
  log("Risk score calculated: " + riskScore, "risk-analysis");
  ```

  ### Check Database Queries
  ```typescript
  try {
    const result = await db.select().from(contacts);
    console.log("Query result:", result);
  } catch (error) {
    console.error("Database error:", error);
  }
  ```

  ### Monitor WebSocket
  Open browser console and check for WebSocket messages.

  ---

  ## 📝 Code Style Guidelines

  ### File Organization
  ```
  module/
  ├── routes.ts       # Express routes
  ├── controller.ts   # Request handlers
  ├── service.ts      # Business logic
  ├── utils.ts        # Helper functions
  └── types.ts        # TypeScript types
  ```

  ### Error Handling
  ```typescript
  router.post("/endpoint", async (req, res) => {
    try {
      // Your logic here
      res.json({ success: true });
    } catch (error) {
      console.error("Error in robocaller:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });
  ```

  ### Type Safety
  ```typescript
  import type { Contact, Incident } from "@shared/schema";

  function processContact(contact: Contact): void {
    // TypeScript ensures type safety
  }
  ```

  ---

  ## 🚀 Quick Start Checklist

  - [ ] Read main [README.md](README.md)
  - [ ] Read your module's README
  - [ ] Explore your module directory
  - [ ] Test existing endpoints with curl/Postman
  - [ ] Try querying the database
  - [ ] Make a small change and test it
  - [ ] Add a new endpoint
  - [ ] Broadcast an event
  - [ ] Check the dashboard updates in real-time

  ---

  ## 💡 Need Help?

  - **Database queries:** Check Drizzle ORM docs
  - **OpenAI API:** See your module's README for examples
  - **TypeScript errors:** Check `@shared/schema` for types
  - **Routing issues:** Verify your routes.ts exports default router
  - **WebSocket:** Ensure you're importing broadcast correctly

  ---

  **Happy coding! Build amazing emergency response features! 🚨**
  