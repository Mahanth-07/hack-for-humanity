# Emergency Response Dashboard

## Overview
Real-time AI incident response command center with 4 isolated backend developer workspaces. The frontend is a single-page dashboard with camera feeds, incident map, live feed, contact directory, and robocaller console. Includes a full interactive US map view with WebSpatial 3D support.

## Architecture
- **Frontend**: React 18 + TypeScript, Vite, TanStack Query, Wouter, Shadcn UI, Tailwind CSS
- **Backend**: Express.js + TypeScript, WebSocket (ws), PostgreSQL + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (GPT-5.2, TTS)
- **Storage**: Replit Object Storage for MP4 uploads via presigned URLs
- **Spatial**: WebSpatial SDK (@webspatial/core-sdk, @webspatial/react-sdk) for visionOS 3D pop-out

## Key Files
- `shared/schema.ts` - 8 database tables (incidents, contacts, robocalls, riskAssessments, cameraFeeds, cameraDetections, moduleHealth, users)
- `client/src/pages/Dashboard.tsx` - Full command-center dashboard with 5 panels
- `client/src/pages/MapView.tsx` - Interactive SVG US map with camera/incident pins and state detail pop-out
- `client/src/data/us-states.ts` - All 50 US state SVG paths, bounding boxes, projection helpers
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

## Map Feature
- `/map` route with SVG US map (all 50 states)
- Gray camera pins and red severity-coded incident pins (critical/high/medium/low)
- State click opens detail panel with zoomed state outline and pin list
- WebSpatial `enable-xr` and `--xr-back` CSS for 3D elevation on visionOS
- 2D overlay fallback on regular browsers
- Seeded with 20 camera feeds and 10 incidents across US states

## Dashboard Layout (Command Center)
- **Top**: 2x2 grid of camera feed cards with MP4 drag-drop upload, video preview, status badges
- **Middle**: Incident map (SVG) + Live incident feed
- **Bottom**: Contact directory table (CRUD) + Robocaller console terminal
- **Header**: "Incident Map" button navigates to full-screen `/map` view

## Database
- PostgreSQL via Replit, Drizzle ORM
- `cameraFeeds` has `coordinates` jsonb field ({lat, lng})
- Push schema: `npx drizzle-kit push`
- Seed data: `npx tsx server/scripts/seed.ts`
- Seed to Neon: `npx tsx server/scripts/seed-neon.ts`

## GitHub
- Repo: `Mahanth-07/hack-for-humanity`
- Push script: `npx tsx server/scripts/push-to-github.ts`

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
