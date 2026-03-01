# Emergency Response Dashboard

## Overview
Real-time AI incident response command center with 4 isolated backend developer workspaces. The frontend is a single-page dashboard with camera feeds, incident map, live feed, contact directory, and robocaller console.

## Architecture
- **Frontend**: React 18 + TypeScript, Vite, TanStack Query, Wouter, Shadcn UI, Tailwind CSS
- **Backend**: Express.js + TypeScript, WebSocket (ws), PostgreSQL + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (GPT-5.2, TTS)
- **Storage**: Replit Object Storage for MP4 uploads via presigned URLs

## Key Files
- `shared/schema.ts` - 8 database tables (incidents, contacts, robocalls, riskAssessments, cameraFeeds, cameraDetections, moduleHealth, users)
- `client/src/pages/Dashboard.tsx` - Full command-center dashboard with 5 panels
- `client/src/index.css` - Dark theme CSS variables (command-center aesthetic)
- `server/routes.ts` - Route registration (core + 4 modules + object storage)
- `server/index.ts` - Express + WebSocket server setup

## Backend Module Workspaces
1. `server/modules/robocaller/` - AI voice notifications (backend dev)
2. `server/modules/risk-analysis/` - AI threat assessment (backend dev)
3. `server/modules/camera-processing/` - Video analysis (backend dev)
4. `server/modules/contact-management/` - Contact CRUD (fully implemented)

## API Routes
- `/api/incidents` - Incident CRUD
- `/api/health` - Module health monitoring
- `/api/modules/robocaller` - Robocaller endpoints
- `/api/modules/risk-analysis` - Risk analysis endpoints
- `/api/modules/camera-processing` - Camera feeds + detections + video upload
- `/api/modules/contact-management` - Contact CRUD
- `/api/uploads/request-url` - Presigned URL for file uploads
- `/objects/:objectPath` - Serve uploaded files

## Dashboard Layout (Command Center)
- **Top**: 2x2 grid of camera feed cards with MP4 drag-drop upload, video preview, status badges
- **Middle**: Incident map (SVG) + Live incident feed
- **Bottom**: Contact directory table (CRUD) + Robocaller console terminal

## Database
- PostgreSQL via Replit, Drizzle ORM
- Push schema: `npx drizzle-kit push`
- Seed data: `npx tsx server/scripts/seed.ts`

## Theme
- Dark mode by default (`class="dark"` on `<html>`)
- Command-center aesthetic with slate/navy base, red/orange accents
- CSS variables in HSL format (no placeholder values)

## WebSocket Events
- `incident_created`, `incident_updated`
- `robocall_created`, `robocall_completed`
- `risk_assessment_created`
- `camera_detection`, `camera_status_changed`
- `contact_created`, `contact_updated`
