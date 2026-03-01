# Robocaller Module - Developer Workspace 1

  ## 🎯 Module Purpose
  AI-powered emergency voice notifications using OpenAI's text-to-speech API.

  ## 📁 Your Workspace
  ```
  server/modules/robocaller/
  ├── routes.ts          # Your API endpoints
  ├── controller.ts      # Add controllers here
  ├── service.ts         # Add business logic here
  └── README.md          # This file
  ```

  ## 🔌 API Endpoints

  ### GET /api/modules/robocaller
  List all robocalls
  ```typescript
  Response: Robocall[]
  ```

  ### POST /api/modules/robocaller
  Create a manual robocall
  ```typescript
  Body: {
    incidentId?: number;
    contactId: number;
    message: string;
  }
  Response: Robocall
  ```

  ### POST /api/modules/robocaller/incident/:incidentId
  Initiate robocalls for all priority contacts
  ```typescript
  Body: { priority?: number }
  Response: { message: string; robocalls: Robocall[] }
  ```

  ### PATCH /api/modules/robocaller/:id
  Update robocall status
  ```typescript
  Body: { status: "pending" | "calling" | "completed" | "failed" }
  Response: Robocall
  ```

  ## 🤖 Using OpenAI

  ```typescript
  import { openai } from "../../replit_integrations/audio/client";

  // Generate AI voice
  const audioResponse = await openai.audio.speech.create({
    model: "gpt-audio",
    voice: "alloy", // or "echo", "fable", "onyx", "nova", "shimmer"
    input: "Your emergency message here",
  });
  ```

  ## 💾 Database Access

  ```typescript
  import { db } from "../../db";
  import { robocalls, contacts, incidents } from "@shared/schema";
  import { eq } from "drizzle-orm";

  // Query robocalls
  const calls = await db.select().from(robocalls);

  // Create robocall
  const [call] = await db.insert(robocalls).values({
    contactId: 1,
    message: "Emergency alert",
    status: "pending",
  }).returning();

  // Update robocall
  await db.update(robocalls)
    .set({ status: "completed" })
    .where(eq(robocalls.id, callId));
  ```

  ## 📡 Broadcasting Updates

  ```typescript
  import { broadcast } from "../../index";

  // After creating/updating robocalls
  broadcast("robocall_created", { robocall: newCall });
  broadcast("robocall_completed", { robocall: updatedCall });
  ```

  ## 🚀 Development Tips

  1. **Test endpoints independently** - Each module is isolated
  2. **Use AI wisely** - OpenAI calls are billed to Replit credits
  3. **Handle errors** - Wrap AI calls in try-catch blocks
  4. **Status tracking** - Update robocall status throughout lifecycle
  5. **Retry logic** - Consider adding retry attempts for failed calls

  ## 📋 Schema Reference

  ```typescript
  type Robocall = {
    id: number;
    incidentId?: number;
    contactId: number;
    status: "pending" | "calling" | "completed" | "failed";
    message: string;
    audioUrl?: string;
    attempts: number;
    lastAttemptAt?: Date;
    completedAt?: Date;
    createdAt: Date;
  }
  ```
  