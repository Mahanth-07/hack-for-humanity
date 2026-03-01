# WebSpatial US Incident Map

## Overview
Standalone interactive US incident map with WebSpatial 3D support. Shows camera feed locations (gray pins) and active incidents (red severity-coded pins) pulled from PostgreSQL. Clicking a state pops out a 3D detail panel (via WebSpatial SDK) with zoomed state view and labeled pins. Map only — no dashboard.

## Architecture
- **Frontend**: React 18 + TypeScript, Vite, TanStack Query, Shadcn UI, Tailwind CSS
- **Backend**: Express.js + TypeScript, PostgreSQL + Drizzle ORM
- **Spatial**: WebSpatial SDK (@webspatial/core-sdk, @webspatial/react-sdk) for visionOS 3D pop-out
- **Map**: SVG US map using pre-generated TopoJSON paths with Albers USA projection

## Key Files
- `shared/schema.ts` - Database tables (incidents, cameraFeeds, cameraDetections, users)
- `client/src/pages/MapView.tsx` - Full interactive US map with pins and state detail pop-out
- `client/src/data/us-states.ts` - 51 US state SVG paths, projection helpers, state detection
- `client/src/data/us-states-generated.json` - Pre-generated SVG path data from TopoJSON
- `client/src/App.tsx` - Renders MapView at root (no routing needed, map-only app)
- `client/src/index.css` - Dark theme + WebSpatial glass panel CSS
- `server/routes.ts` - `/api/incidents` + `/api/modules/camera-processing/feeds`
- `server/index.ts` - Express server setup

## API Routes
- `/api/incidents` - Incident CRUD
- `/api/modules/camera-processing/feeds` - Camera feed list + create + toggle

## Map Features
- Full SVG US map (51 states including DC) via TopoJSON + d3-geo Albers USA projection
- Gray camera pins with glow filter
- Red severity-coded incident pins (critical/high/medium/low) with pulse animation
- Hover tooltips on pins (name, location, severity)
- State hover shows camera/incident counts
- State click opens detail panel with zoomed state outline and pin list
- WebSpatial `enable-xr` attribute + `--xr-back: 150px` + `--xr-background-material: glass.thick` for 3D elevation on visionOS
- `html.is-spatial` CSS class for spatial mode styling (transparent backgrounds, no backdrop-filter)
- 2D glass overlay fallback on regular browsers

## Database
- PostgreSQL via Drizzle ORM
- `cameraFeeds` has `coordinates` jsonb field ({lat, lng})
- `incidents` has `coordinates` jsonb field ({lat, lng})
- Push schema: `npx drizzle-kit push`
- Seed data: `npx tsx server/scripts/seed.ts`

## GitHub
- Repo: `Mahanth-07/hack-for-humanity`
- Push script: `npx tsx server/scripts/push-to-github.ts`

## WebSpatial 3D
- `enable-xr` attribute set via `ref.setAttribute()` in useEffect (avoids React warnings)
- `--xr-back` CSS var controls depth offset (150px for panel)
- `--xr-background-material: glass.thick` for visionOS glass effect
- Panel and overlay both spatialized at different depths
- `html.is-spatial` class enables spatial-specific styles

## Port
- Runs on port 5000 (Replit default, do not change)

## Theme
- Dark mode command-center aesthetic
- Slate/navy base, red/orange severity accents
- Monospace font for status text
