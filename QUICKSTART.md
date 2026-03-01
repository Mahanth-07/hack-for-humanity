# 🚀 Quick Start Guide

  Welcome to the Emergency Response Dashboard! This guide will get you up and running in 5 minutes.

  ## 📋 Prerequisites
  - Node.js 18+ installed
  - This Repl is already configured with PostgreSQL

  ## ⚡ 5-Minute Setup

  ### Step 1: Install Dependencies (if needed)
  ```bash
  npm install
  ```

  ### Step 2: Initialize Database
  ```bash
  # Push database schema
  npm run db:push

  # Seed initial data (contacts & cameras)
  npm run seed
  ```

  ### Step 3: Start Development Server
  ```bash
  npm run dev
  ```

  ### Step 4: Open the Dashboard
  Visit: **http://localhost:5000**

  You should see:
  - ✅ Emergency Response Dashboard
  - ✅ 4 module health indicators
  - ✅ Statistics cards
  - ✅ Real-time WebSocket connection

  ---

  ## 🎯 What's Included Out of the Box

  ### Pre-seeded Data
  - **6 Emergency Contacts** (Fire, Police, EMS, Coordinators)
  - **5 Camera Feeds** (Various locations)
  - **4 Healthy Modules** (All systems operational)

  ### Working Features
  - ✅ Create incidents from the dashboard
  - ✅ View active/resolved incidents
  - ✅ Module health monitoring
  - ✅ Real-time WebSocket updates
  - ✅ Contact and camera feed display

  ---

  ## 🧪 Test the System

  ### 1. Create a Test Incident
  1. Click **"Report New Incident"**
  2. Fill in:
     - Title: "Test Fire Alert"
     - Description: "Smoke detected in building"
     - Severity: "High"
     - Location: "123 Main St"
  3. Click **"Create Incident"**

  ### 2. Initiate Emergency Robocalls
  1. Find your incident in the list
  2. Click the **"Alert"** button
  3. Check console - robocalls created for all active contacts

  ### 3. Generate AI Risk Analysis
  1. Click the **"Analyze"** button on your incident
  2. AI will generate:
     - Risk score (0-100)
     - Threat level classification
     - Detailed analysis
     - Recommendations

  ### 4. Check Module Health
  All 4 modules should show **green checkmarks** (healthy status)

  ---

  ## 👨‍💻 Developer Workspaces

  Choose your module and start developing:

  ### Workspace 1: Robocaller 📞
  ```bash
  cd server/modules/robocaller
  # Your API: /api/modules/robocaller
  ```

  ### Workspace 2: Risk Analysis 📊
  ```bash
  cd server/modules/risk-analysis
  # Your API: /api/modules/risk-analysis
  ```

  ### Workspace 3: Camera Processing 📹
  ```bash
  cd server/modules/camera-processing
  # Your API: /api/modules/camera-processing
  ```

  ### Workspace 4: Contact Management 👥
  ```bash
  cd server/modules/contact-management
  # Your API: /api/modules/contact-management
  ```

  **Each module has its own README.md with detailed documentation!**

  ---

  ## 🔧 Useful Commands

  ```bash
  # Development
  npm run dev              # Start dev server with hot reload

  # Database
  npm run db:push          # Push schema changes
  npm run db:studio        # Open Drizzle Studio (visual DB editor)
  npm run seed             # Seed initial data

  # Production
  npm run build            # Build for production
  npm start                # Start production server
  ```

  ---

  ## 📡 API Testing Examples

  ### Test Robocaller
  ```bash
  # List all robocalls
  curl http://localhost:5000/api/modules/robocaller

  # Create manual robocall
  curl -X POST http://localhost:5000/api/modules/robocaller \
    -H "Content-Type: application/json" \
    -d '{
      "contactId": 1,
      "message": "Emergency test message"
    }'
  ```

  ### Test Risk Analysis
  ```bash
  # Analyze incident ID 1
  curl -X POST http://localhost:5000/api/modules/risk-analysis/analyze/1
  ```

  ### Test Camera Processing
  ```bash
  # List camera feeds
  curl http://localhost:5000/api/modules/camera-processing/feeds

  # Simulate detection
  curl -X POST http://localhost:5000/api/modules/camera-processing/simulate/1 \
    -H "Content-Type: application/json" \
    -d '{"detectionType": "fire", "confidence": 95}'
  ```

  ### Test Contact Management
  ```bash
  # List all contacts
  curl http://localhost:5000/api/modules/contact-management

  # Create new contact
  curl -X POST http://localhost:5000/api/modules/contact-management \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Jane Smith",
      "phone": "+1-555-7777",
      "role": "medical",
      "priority": 2
    }'
  ```

  ---

  ## 🎨 Frontend Development

  ### Main Dashboard
  Location: `client/src/pages/Dashboard.tsx`

  The dashboard features:
  - Real-time incident monitoring
  - Module health status
  - Tabbed interface (Incidents, Robocaller, Cameras, Contacts)
  - WebSocket connection for live updates

  ### Adding UI Components
  ```bash
  # Shadcn UI components are pre-installed
  # Import and use:
  import { Button } from "@/components/ui/button";
  import { Card } from "@/components/ui/card";
  ```

  ---

  ## 🐛 Troubleshooting

  ### Database Connection Issues
  ```bash
  # Check DATABASE_URL is set
  echo $DATABASE_URL

  # Re-push schema
  npm run db:push
  ```

  ### Port Already in Use
  ```bash
  # Change port in .env or:
  PORT=5001 npm run dev
  ```

  ### OpenAI Not Working
  - Ensure you're using Replit AI Integrations (no API key needed)
  - Check imports: `import { openai } from "../../replit_integrations/audio/client"`

  ### WebSocket Connection Failed
  - Check browser console for errors
  - Ensure server is running on correct port
  - WebSocket connects to: `ws://localhost:5000/ws`

  ---

  ## 📚 Documentation

  ### Essential Reads
  1. **[README.md](README.md)** - Full project documentation
  2. **[WORKSPACE_GUIDE.md](WORKSPACE_GUIDE.md)** - Developer workspace guide
  3. **Your Module's README** - Module-specific docs

  ### Module Documentation
  - [Robocaller Module](server/modules/robocaller/README.md)
  - [Risk Analysis Module](server/modules/risk-analysis/README.md)
  - [Camera Processing Module](server/modules/camera-processing/README.md)
  - [Contact Management Module](server/modules/contact-management/README.md)

  ---

  ## 🎯 Next Steps

  1. ✅ Complete the 5-minute setup above
  2. ✅ Test creating an incident in the dashboard
  3. ✅ Choose your developer workspace
  4. ✅ Read your module's README
  5. ✅ Test your module's API endpoints
  6. ✅ Start building features!

  ---

  ## 💡 Pro Tips

  - **Database Studio**: Run `npm run db:studio` to visually explore your database
  - **Hot Reload**: The dev server automatically reloads on file changes
  - **Type Safety**: Import types from `@shared/schema` for full TypeScript support
  - **WebSocket Testing**: Open browser DevTools → Network → WS to see messages
  - **Module Isolation**: Each developer can work independently without conflicts

  ---

  ## 🚨 Emergency Response Dashboard Features

  ### Incident Management
  - Create, update, and track emergency incidents
  - Severity levels: Low, Medium, High, Critical
  - Status tracking: Active, Resolved, Escalated
  - Location and coordinate tracking

  ### AI-Powered Capabilities
  - **Voice Notifications**: OpenAI text-to-speech for emergency calls
  - **Risk Analysis**: GPT-5.2 analyzes incidents and provides recommendations
  - **Image Analysis**: GPT-5.2 vision detects threats from camera feeds

  ### Real-Time Monitoring
  - WebSocket updates for live incident tracking
  - Module health monitoring
  - Camera feed status
  - Contact availability

  ---

  **You're all set! Start building amazing emergency response features! 🚨**

  Need help? Check the documentation or ask your team!
  