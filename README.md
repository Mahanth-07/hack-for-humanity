# Emergency Response Dashboard

  A modern web-based emergency response system with **4 isolated developer workspaces** for modular development. Built with React, Express, PostgreSQL, and powered by OpenAI for AI-driven emergency analysis and notifications.

  ## 🏗️ Modular Architecture

  This project features a **modular backend architecture** where each emergency response module operates independently, allowing **4 developers to work simultaneously** without conflicts.

  ### Module Structure

  ```
  server/
  ├── modules/
  │   ├── robocaller/          # AI-powered emergency voice notifications
  │   │   └── routes.ts        # Robocaller API endpoints
  │   ├── risk-analysis/       # AI-driven threat assessment
  │   │   └── routes.ts        # Risk analysis API endpoints
  │   ├── camera-processing/   # Real-time video analysis
  │   │   └── routes.ts        # Camera processing API endpoints
  │   └── contact-management/  # Emergency contact database
  │       └── routes.ts        # Contact management API endpoints
  ├── routes/
  │   ├── incidents.ts         # Core incident management
  │   └── module-health.ts     # Module health monitoring
  └── index.ts                 # Main server with WebSocket support
  ```

  ## 🚀 Features

  ### Dashboard Overview
  - **Real-time incident monitoring** with WebSocket updates
  - **System health metrics** for all 4 modules
  - **Emergency incident creation and management**
  - **Beautiful dark-themed UI** with alert color scheme

  ### Module 1: Robocaller (AI Voice Notifications)
  - **AI-powered voice generation** using OpenAI's text-to-speech
  - **Automated emergency calls** to all priority contacts
  - **Incident-based notification routing**
  - **Call status tracking** (pending, calling, completed, failed)

  **Endpoints:**
  - `GET /api/modules/robocaller` - List all robocalls
  - `POST /api/modules/robocaller` - Create manual robocall
  - `POST /api/modules/robocaller/incident/:id` - Initiate calls for incident
  - `PATCH /api/modules/robocaller/:id` - Update call status

  ### Module 2: Risk Analysis (AI Threat Assessment)
  - **AI-powered risk scoring** using GPT-5.2
  - **Threat level classification** (low/moderate/high/severe)
  - **Detailed analysis and recommendations**
  - **Contributing risk factor identification**

  **Endpoints:**
  - `GET /api/modules/risk-analysis` - List all assessments
  - `GET /api/modules/risk-analysis/incident/:id` - Get assessment for incident
  - `POST /api/modules/risk-analysis/analyze/:id` - Generate AI analysis
  - `POST /api/modules/risk-analysis/analyze-all` - Batch analyze active incidents

  ### Module 3: Camera Processing (Video Analysis)
  - **Camera feed management** with location tracking
  - **AI-powered threat detection** using GPT-5.2 vision
  - **Automated incident creation** for critical detections
  - **Detection confidence scoring**

  **Endpoints:**
  - `GET /api/modules/camera-processing/feeds` - List camera feeds
  - `POST /api/modules/camera-processing/feeds` - Create camera feed
  - `PATCH /api/modules/camera-processing/feeds/:id/toggle` - Toggle feed status
  - `GET /api/modules/camera-processing/detections` - List detections
  - `POST /api/modules/camera-processing/detect` - Process image with AI

  ### Module 4: Contact Management
  - **Emergency contact database** with role-based organization
  - **Priority-based notification routing**
  - **Active/inactive contact status**
  - **Bulk contact operations**

  **Endpoints:**
  - `GET /api/modules/contact-management` - List contacts
  - `GET /api/modules/contact-management/:id` - Get contact details
  - `POST /api/modules/contact-management` - Create contact
  - `PATCH /api/modules/contact-management/:id` - Update contact
  - `DELETE /api/modules/contact-management/:id` - Delete contact
  - `POST /api/modules/contact-management/bulk` - Bulk create contacts

  ### Core Incident Management
  - **CRUD operations** for emergency incidents
  - **Status tracking** (active, resolved, escalated)
  - **Severity levels** (low, medium, high, critical)
  - **Location and coordinate tracking**
  - **Statistics and overview**

  **Endpoints:**
  - `GET /api/incidents` - List incidents
  - `GET /api/incidents/:id` - Get incident details
  - `POST /api/incidents` - Create incident
  - `PATCH /api/incidents/:id` - Update incident
  - `DELETE /api/incidents/:id` - Delete incident
  - `GET /api/incidents/stats/overview` - Get statistics

  ### Module Health Monitoring
  - **Real-time health tracking** for all modules
  - **Heartbeat-based status detection**
  - **Degraded/down status alerts**
  - **Performance metrics tracking**

  **Endpoints:**
  - `GET /api/health` - List all module health
  - `GET /api/health/:moduleName` - Get specific module health
  - `POST /api/health/heartbeat/:moduleName` - Update heartbeat
  - `GET /api/health/check/:moduleName` - Check computed status

  ## 🛠️ Technology Stack

  ### Frontend
  - **React 18** with TypeScript
  - **Tailwind CSS** for styling
  - **Shadcn UI** component library
  - **TanStack Query** for data fetching
  - **Wouter** for routing
  - **WebSocket** for real-time updates

  ### Backend
  - **Express.js** server
  - **PostgreSQL** database with Drizzle ORM
  - **WebSocket Server** (ws) for real-time communication
  - **OpenAI API** (via Replit AI Integrations) for:
    - Voice generation (text-to-speech)
    - Risk analysis (GPT-5.2)
    - Image analysis (GPT-5.2 vision)

  ### Database Schema
  - **incidents** - Emergency incident records
  - **contacts** - Emergency contact directory
  - **robocalls** - AI voice call tracking
  - **riskAssessments** - AI-generated risk analyses
  - **cameraFeeds** - Camera feed registry
  - **cameraDetections** - AI detection events
  - **moduleHealth** - Module status tracking

  ## 📦 Getting Started

  ### Prerequisites
  - Node.js 18+ installed
  - PostgreSQL database (automatically configured on Replit)

  ### Installation

  1. **Install dependencies:**
  ```bash
  npm install
  ```

  2. **Push database schema:**
  ```bash
  npm run db:push
  ```

  3. **Seed initial data:**
  ```bash
  npm run seed
  ```

  4. **Start development server:**
  ```bash
  npm run dev
  ```

  The application will be available at `http://localhost:5000`

  ### Database Management

  - **Push schema changes:** `npm run db:push`
  - **Open Drizzle Studio:** `npm run db:studio`
  - **Seed database:** `npm run seed`

  ## 👥 Developer Workspace Guidelines

  ### Working on Modules

  Each module is **completely isolated** with its own directory. Developers should:

  1. **Work exclusively in your module directory:**
     - `server/modules/robocaller/` - Developer 1
     - `server/modules/risk-analysis/` - Developer 2
     - `server/modules/camera-processing/` - Developer 3
     - `server/modules/contact-management/` - Developer 4

  2. **Create new files in your module:**
     - Add controllers, services, utilities as needed
     - Keep all module logic contained within your directory

  3. **Access shared resources:**
     - Import from `@shared/schema` for database types
     - Import from `../db` for database connection
     - Import from `../index` for WebSocket broadcast

  4. **Register new routes:**
     - Export your router from `routes.ts` in your module
     - Routes are already registered in `server/routes.ts`

  ### Example: Adding a New Endpoint

  In `server/modules/robocaller/routes.ts`:

  ```typescript
  // Add a new endpoint
  router.get("/stats", async (req: Request, res: Response) => {
    try {
      const stats = await db
        .select()
        .from(robocalls)
        .where(eq(robocalls.status, "completed"));
      
      res.json({ totalCompleted: stats.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  ```

  Accessible at: `GET /api/modules/robocaller/stats`

  ## 🔄 Real-time Communication

  The dashboard uses **WebSocket** for real-time updates:

  ```typescript
  // In your module, broadcast updates
  import { broadcast } from "../../index";

  // After creating/updating data
  broadcast("incident_created", { incident: newIncident });
  broadcast("module_health_updated", { module: "robocaller" });
  ```

  The frontend automatically receives updates and refreshes relevant queries.

  ## 🤖 AI Integration

  ### OpenAI via Replit AI Integrations

  This project uses **Replit AI Integrations** which:
  - ✅ **No API key required** - Automatically configured
  - ✅ **Billed to Replit credits** - No separate OpenAI account needed
  - ✅ **Ready to use** - Import from `server/replit_integrations/audio/client`

  ### Using OpenAI in Modules

  ```typescript
  import { openai } from "../../replit_integrations/audio/client";

  // Text-to-speech
  const audio = await openai.audio.speech.create({
    model: "gpt-audio",
    voice: "alloy",
    input: "Emergency alert message",
  });

  // GPT-5.2 for analysis
  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [{ role: "user", content: "Analyze this incident..." }],
    response_format: { type: "json_object" }
  });

  // Vision for image analysis
  const vision = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Analyze this image" },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    }]
  });
  ```

  ## 🎨 Frontend Development

  ### Dashboard Structure
  - `client/src/pages/Dashboard.tsx` - Main dashboard component
  - `client/src/components/ui/` - Shadcn UI components
  - `client/src/hooks/` - Custom React hooks

  ### Adding New UI Features

  The dashboard uses **Shadcn UI** components and **Tailwind CSS**:

  ```tsx
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";

  // Use in your component
  <Card className="bg-slate-800/50 border-slate-700">
    <CardHeader>
      <CardTitle>Your Feature</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Your content */}
    </CardContent>
  </Card>
  ```

  ## 📊 Database Schema Reference

  ### Incidents
  ```typescript
  {
    id: number;
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "active" | "resolved" | "escalated";
    location?: string;
    coordinates?: { lat: number, lng: number };
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
  }
  ```

  ### Contacts
  ```typescript
  {
    id: number;
    name: string;
    phone: string;
    email?: string;
    role: "first_responder" | "medical" | "fire" | "police" | "coordinator";
    priority: number; // 1-5, 1 being highest
    isActive: boolean;
    metadata?: any;
  }
  ```

  ### Robocalls
  ```typescript
  {
    id: number;
    incidentId?: number;
    contactId: number;
    status: "pending" | "calling" | "completed" | "failed";
    message: string;
    audioUrl?: string;
    attempts: number;
    lastAttemptAt?: Date;
    completedAt?: Date;
  }
  ```

  ### Risk Assessments
  ```typescript
  {
    id: number;
    incidentId: number;
    riskScore: number; // 0-100
    threatLevel: "low" | "moderate" | "high" | "severe";
    analysis: string;
    recommendations?: string[];
    factors?: any;
  }
  ```

  ## 🔒 Security Notes

  - **No authentication required** - Internal emergency system
  - **WebSocket connections** - Open for real-time updates
  - **API endpoints** - Public access for emergency response
  - **Database** - PostgreSQL with connection via DATABASE_URL env variable

  ## 🚀 Deployment

  The application is ready to deploy on **Replit Deployments**:

  1. Database migrations run automatically on startup
  2. WebSocket server configured for production
  3. Static assets served in production mode
  4. Environment variables managed via Replit Secrets

  ## 📝 API Documentation

  Full API documentation for all modules:

  - **Base URL:** `/api`
  - **WebSocket:** `ws://localhost:5000/ws`

  ### Core Routes
  - `/api/incidents` - Incident management
  - `/api/health` - Module health monitoring

  ### Module Routes
  - `/api/modules/robocaller` - AI voice notifications
  - `/api/modules/risk-analysis` - AI risk assessment
  - `/api/modules/camera-processing` - Video analysis
  - `/api/modules/contact-management` - Contact directory

  ## 🤝 Contributing

  Each developer works in their isolated module workspace. To add features:

  1. Work in your module directory: `server/modules/[module-name]/`
  2. Add routes to your module's `routes.ts`
  3. Use shared database types from `@shared/schema`
  4. Test your endpoints independently
  5. Broadcast updates via WebSocket when needed

  ## 📞 Support

  For questions about:
  - **Module architecture** - Check module-specific README files
  - **Database schema** - See `shared/schema.ts`
  - **API endpoints** - Review route files in each module
  - **Frontend components** - Check Shadcn UI documentation

  ---

  Built with ❤️ for emergency response teams
  