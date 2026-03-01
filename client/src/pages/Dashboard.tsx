import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
// @ts-ignore – no type declarations bundled with react-simple-maps
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
// @ts-ignore
import { geoMercator, geoPath } from "d3-geo";
// @ts-ignore
import { feature } from "topojson-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Camera,
  Users,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Video,
  MapPin,

  Trash2,
  Edit,

  Radio,
  Clock,
  X,
  Save,
  UserPlus,
  Flame,
  ScanEye,
  Maximize2,
  Minimize2,
  User,
  PawPrint,
  Box,
  Building2,
  Car,
  Droplets,
  Swords,
  FlaskConical,
  HeartPulse,
  Leaf,
  CircleAlert,
  Flag,
  PhoneCall,
} from "lucide-react";

type Incident = {
  id: number;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "resolved" | "escalated";
  location?: string;
  coordinates?: { lat: number; lng: number };
  createdAt: string;
  riskRank?: number;
  riskScore?: number | null;
  priorityScore?: number | null;
};

type RiskAssessment = {
  id: number;
  incidentId: number;
  riskScore: number;
  severity?: "low" | "medium" | "high" | "severe" | null;
  threatLevel?: "low" | "moderate" | "high" | "severe" | null;
  priorityScore?: number | null;
  createdAt: string;
};

type ModuleHealth = {
  moduleName: string;
  status: "healthy" | "degraded" | "down";
  lastHeartbeat: string;
  errorCount: number;
};

type Contact = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: string;
  priority: number;
  isActive: boolean;
  metadata?: { location?: string; [key: string]: unknown };
  createdAt: string;
};

type CameraFeed = {
  id: number;
  name: string;
  location: string;
  streamUrl?: string;
  videoUrl?: string;
  status: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
};


const SEV_LEFT_ACCENT: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#f59e0b",
  low:      "#3b82f6",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border border-red-500/40",
  high:     "bg-orange-500/15 text-orange-300 border border-orange-500/40",
  medium:   "bg-amber-500/15 text-amber-200 border border-amber-500/40",
  low:      "bg-sky-500/15 text-sky-300 border border-sky-500/40",
};

const STATUS_BADGE: Record<string, { color: string; pulse: boolean }> = {
  idle: { color: "bg-slate-500", pulse: false },
  analyzing: { color: "bg-blue-500", pulse: true },
  incident: { color: "bg-red-600", pulse: true },
  calling: { color: "bg-orange-500", pulse: true },
  resolved: { color: "bg-green-500", pulse: false },
};

const ROLE_COLORS: Record<string, string> = {
  fire: "bg-red-500/20 text-red-400 border-red-500/30",
  police: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medical: "bg-green-500/20 text-green-400 border-green-500/30",
  first_responder: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  coordinator: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

// Lat/lng coordinates for each valid US city (for real map pin placement)
const CITY_COORDS: Record<string, [number, number]> = {
  "New York, NY": [-74.006, 40.7128],
  "Los Angeles, CA": [-118.2437, 34.0522],
  "Chicago, IL": [-87.6298, 41.8781],
  "Houston, TX": [-95.3698, 29.7604],
  "Phoenix, AZ": [-112.074, 33.4484],
  "Philadelphia, PA": [-75.1652, 39.9526],
  "San Antonio, TX": [-98.4936, 29.4241],
  "San Diego, CA": [-117.1611, 32.7157],
  "Dallas, TX": [-96.797, 32.7767],
  "San Jose, CA": [-121.8863, 37.3382],
  "Austin, TX": [-97.7431, 30.2672],
  "Jacksonville, FL": [-81.6557, 30.3322],
  "Fort Worth, TX": [-97.3308, 32.7555],
  "Columbus, OH": [-82.9988, 39.9612],
  "Charlotte, NC": [-80.8431, 35.2271],
  "Indianapolis, IN": [-86.1581, 39.7684],
  "San Francisco, CA": [-122.4194, 37.7749],
  "Seattle, WA": [-122.3321, 47.6062],
  "Denver, CO": [-104.9903, 39.7392],
  "Nashville, TN": [-86.7816, 36.1627],
  "Oklahoma City, OK": [-97.5164, 35.4676],
  "El Paso, TX": [-106.4850, 31.7619],
  "Washington, DC": [-77.0369, 38.9072],
  "Boston, MA": [-71.0589, 42.3601],
  "Las Vegas, NV": [-115.1398, 36.1699],
  "Memphis, TN": [-90.0490, 35.1495],
  "Louisville, KY": [-85.7585, 38.2527],
  "Portland, OR": [-122.6784, 45.5051],
  "Baltimore, MD": [-76.6122, 39.2904],
  "Milwaukee, WI": [-87.9065, 43.0389],
  "Albuquerque, NM": [-106.6504, 35.0844],
  "Tucson, AZ": [-110.9747, 32.2226],
  "Fresno, CA": [-119.7871, 36.7378],
  "Sacramento, CA": [-121.4944, 38.5816],
  "Mesa, AZ": [-111.8315, 33.4152],
  "Kansas City, MO": [-94.5786, 39.0997],
  "Atlanta, GA": [-84.388, 33.749],
  "Omaha, NE": [-95.9345, 41.2565],
  "Colorado Springs, CO": [-104.8214, 38.8339],
  "Raleigh, NC": [-78.6382, 35.7796],
  "Miami, FL": [-80.1918, 25.7617],
  "Long Beach, CA": [-118.1937, 33.7701],
  "Virginia Beach, VA": [-75.9779, 36.8529],
  "Minneapolis, MN": [-93.2650, 44.9778],
  "Tampa, FL": [-82.4572, 27.9506],
  "New Orleans, LA": [-90.0715, 29.9511],
  "Arlington, TX": [-97.1081, 32.7357],
  "Bakersfield, CA": [-119.0187, 35.3733],
  "Honolulu, HI": [-157.8583, 21.3069],
  "Anaheim, CA": [-117.9145, 33.8353],
};

// Validated US city locations — only these exact values are accepted
const VALID_LOCATIONS = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
  "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
  "Austin, TX", "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "Charlotte, NC",
  "Indianapolis, IN", "San Francisco, CA", "Seattle, WA", "Denver, CO", "Nashville, TN",
  "Oklahoma City, OK", "El Paso, TX", "Washington, DC", "Boston, MA", "Las Vegas, NV",
  "Memphis, TN", "Louisville, KY", "Portland, OR", "Baltimore, MD", "Milwaukee, WI",
  "Albuquerque, NM", "Tucson, AZ", "Fresno, CA", "Sacramento, CA", "Mesa, AZ",
  "Kansas City, MO", "Atlanta, GA", "Omaha, NE", "Colorado Springs, CO", "Raleigh, NC",
  "Miami, FL", "Long Beach, CA", "Virginia Beach, VA", "Minneapolis, MN", "Tampa, FL",
  "New Orleans, LA", "Arlington, TX", "Bakersfield, CA", "Honolulu, HI", "Anaheim, CA",
];

// Icon + label for each detection type shown in the hazard overlay
const DETECTION_ICON: Record<string, { icon: React.ReactNode; label: string }> = {
  fire:          { icon: <Flame className="h-8 w-8 text-red-400 animate-pulse mb-1" />,      label: "Fire" },
  flood:         { icon: <Droplets className="h-8 w-8 text-blue-400 animate-pulse mb-1" />,  label: "Flood" },
  crash:         { icon: <Car className="h-8 w-8 text-orange-400 animate-pulse mb-1" />,     label: "Vehicle Crash" },
  fight:         { icon: <Swords className="h-8 w-8 text-red-400 animate-pulse mb-1" />,     label: "Fight / Assault" },
  weapon:        { icon: <CircleAlert className="h-8 w-8 text-red-500 animate-pulse mb-1" />, label: "Weapon" },
  hazmat:        { icon: <FlaskConical className="h-8 w-8 text-yellow-400 animate-pulse mb-1" />, label: "Hazmat" },
  structural:    { icon: <Building2 className="h-8 w-8 text-orange-400 animate-pulse mb-1" />, label: "Structural Damage" },
  medical:       { icon: <HeartPulse className="h-8 w-8 text-pink-400 animate-pulse mb-1" />, label: "Medical Emergency" },
  environmental: { icon: <Leaf className="h-8 w-8 text-green-400 animate-pulse mb-1" />,     label: "Environmental Hazard" },
  anomaly:       { icon: <CircleAlert className="h-8 w-8 text-yellow-400 animate-pulse mb-1" />, label: "Anomaly" },
};

function CameraFeedCard({
  feed,
  onVideoUploaded,
  onIncidentCreated,
}: {
  feed: CameraFeed;
  onVideoUploaded: () => void;
  onIncidentCreated: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationValue, setLocationValue] = useState("");
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [hazardAlert, setHazardAlert] = useState<{ type: string; description: string; confidence: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLSelectElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track which detection types have already triggered an incident for this video session
  const reportedHazardsRef = useRef<Set<string>>(new Set());
  // Track whether analysis should stop (hazard already found)
  const hazardFoundRef = useRef(false);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: async (response) => {
      try {
        await apiRequest("PATCH", `/api/modules/camera-processing/feeds/${feed.id}/video`, { videoUrl: response.objectPath });
        onVideoUploaded();
        // Show location input after successful upload
        setShowLocationInput(true);
        setTimeout(() => locationInputRef.current?.focus(), 100);
      } catch {
        // Intentionally silent: UI should not trigger action popups.
      }
    },
    onError: () => {},
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) {
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalVideoUrl(objectUrl);
    uploadFile(file);
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleSaveLocation = async () => {
    if (!locationValue.trim()) {
      return;
    }
    setIsSavingLocation(true);
    try {
      await apiRequest("PATCH", `/api/modules/camera-processing/feeds/${feed.id}/location`, { location: locationValue });
      onVideoUploaded();
      setShowLocationInput(false);
      setLocationValue("");
      setIsCustomLocation(false);
    } catch {
      // Intentionally silent: UI should not trigger action popups.
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Frame analysis: sample a frame from the video element every 3 seconds and send to AI.
  // Only triggered by a new local upload (localVideoUrl). feed.videoUrl changes (from DB refreshes)
  // do NOT restart scanning — that would reset the dedup guards and fire duplicate incidents.
  useEffect(() => {
    if (!localVideoUrl) return;

    // Reset dedup guards for this new video session
    reportedHazardsRef.current = new Set();
    hazardFoundRef.current = false;

    const analyzeFrame = async () => {
      // Stop scanning once a hazard has been found for this video
      if (hazardFoundRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || video.paused) return;

      setIsAnalyzing(true);
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // Higher resolution (640×360) so small objects like a car 1/16th of the frame are visible
        canvas.width = 640;
        canvas.height = 360;
        ctx.drawImage(video, 0, 0, 640, 360);
        const imageData = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

        const result = await apiRequest("POST", "/api/modules/camera-processing/detect", {
          cameraFeedId: feed.id,
          imageData,
        });
        const json = await result.json();

        if (json.autoCreated && json.incident) {
          const { detection } = json;
          const detType: string = detection?.detectionType || "anomaly";

          // Skip if we already reported this same hazard type for this video session
          if (reportedHazardsRef.current.has(detType)) return;
          reportedHazardsRef.current.add(detType);

          // Stop future scans — one hazard report per video is enough
          hazardFoundRef.current = true;
          if (analyzeIntervalRef.current) {
            clearInterval(analyzeIntervalRef.current);
            analyzeIntervalRef.current = null;
          }

          const meta = detection?.metadata as { description?: string; urgency?: string } | null;
          setHazardAlert({
            type: detType,
            description: meta?.description || "Hazard detected",
            confidence: detection?.confidence || 0,
          });
          onVideoUploaded(); // refresh camera feeds (status → incident)
          onIncidentCreated(); // refresh incidents
        }
      } catch {
        // silently ignore analysis errors to avoid noise
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeIntervalRef.current = setInterval(analyzeFrame, 3000);
    // Run once immediately after a short delay to let the video load
    const initial = setTimeout(analyzeFrame, 1000);

    return () => {
      if (analyzeIntervalRef.current) clearInterval(analyzeIntervalRef.current);
      clearTimeout(initial);
    };
  // Only re-run when a new local video is selected — NOT on feed.videoUrl/feed.location changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localVideoUrl, feed.id]);

  const statusInfo = STATUS_BADGE[feed.status] || STATUS_BADGE.idle;
  const hasVideo = localVideoUrl || feed.videoUrl;

  return (
    <Card className="bg-slate-900/50 border-slate-700/40 overflow-hidden group relative" data-testid={`camera-card-${feed.id}`}>
      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative aspect-video bg-slate-950 overflow-hidden">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={localVideoUrl || (feed.videoUrl ? `/objects${feed.videoUrl}` : undefined)}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            autoPlay
            data-testid={`video-preview-${feed.id}`}
          />
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? "bg-blue-500/20 border-2 border-dashed border-blue-400"
                : "bg-slate-950 hover:bg-slate-900/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid={`upload-zone-${feed.id}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin mb-2" />
                <span className="text-xs text-blue-400">{progress}%</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-slate-600 mb-2" />
                <span className="text-xs text-slate-500">Drop MP4 or click</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              data-testid={`file-input-${feed.id}`}
            />
          </div>
        )}

        {hasVideo && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        )}

        {/* Hazard detected overlay */}
        {hazardAlert && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/70 backdrop-blur-[1px] z-10">
            {(DETECTION_ICON[hazardAlert.type] ?? DETECTION_ICON.anomaly).icon}
            <span className="text-[11px] font-bold text-red-300 uppercase tracking-widest">Hazard Detected</span>
            <span className="text-[10px] text-red-400/80 capitalize mt-0.5">
              {(DETECTION_ICON[hazardAlert.type] ?? DETECTION_ICON.anomaly).label}
            </span>
            <p className="text-[9px] text-red-300/70 text-center px-4 mt-1 line-clamp-2">{hazardAlert.description}</p>
            <button
              className="mt-2 text-[9px] text-red-400/60 hover:text-red-300 underline"
              onClick={() => setHazardAlert(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* AI scanning indicator (bottom-right, shows when actively analyzing) */}
        {isAnalyzing && !hazardAlert && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded">
            <ScanEye className="h-2.5 w-2.5 text-blue-400 animate-pulse" />
            <span className="text-[9px] text-blue-400">Scanning…</span>
          </div>
        )}

        {/* Live / Inactive badge — top left */}
        <div className="absolute top-2 left-2">
          {hasVideo ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-green-400 bg-black/60 px-1.5 py-0.5 rounded">
              <Radio className="h-2.5 w-2.5 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-black/60 px-1.5 py-0.5 rounded">
              <span className="h-2 w-2 rounded-full bg-slate-600" />
              INACTIVE
            </span>
          )}
        </div>

        {/* AI analysis status badge — only shown when not idle */}
        {feed.status !== "idle" && (
          <div className="absolute top-2 left-[4.5rem]">
            <span className={`flex items-center gap-1 text-[10px] font-medium text-white/90 bg-black/60 px-1.5 py-0.5 rounded uppercase tracking-wider ${statusInfo.pulse ? "animate-pulse" : ""}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.color}`} />
              {feed.status}
            </span>
          </div>
        )}

        {hasVideo && (
          <button
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded p-1 hover:bg-black/80"
            onClick={async () => {
              // Clear local state immediately
              setLocalVideoUrl(null);
              setHazardAlert(null);
              setIsAnalyzing(false);
              setShowLocationInput(false);
              setLocationValue("");
              reportedHazardsRef.current = new Set();
              hazardFoundRef.current = false;
              if (analyzeIntervalRef.current) {
                clearInterval(analyzeIntervalRef.current);
                analyzeIntervalRef.current = null;
              }
              // Disconnect: clears video, resets location to Unassigned, resolves linked incidents
              try {
                await apiRequest("POST", `/api/modules/camera-processing/feeds/${feed.id}/disconnect`, {});
                onVideoUploaded();
                onIncidentCreated(); // refresh incidents (some may now be resolved)
              } catch {
                // best-effort
              }
            }}
            data-testid={`clear-video-${feed.id}`}
          >
            <X className="h-3 w-3 text-white" />
          </button>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-200 truncate" data-testid={`camera-name-${feed.id}`}>{feed.name}</h3>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {feed.location}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1.5 rounded hover:bg-slate-800 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid={`upload-btn-${feed.id}`}
                  >
                    <Video className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Upload MP4</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {showLocationInput && (
          <div className="mt-2 flex flex-col gap-1.5" data-testid={`location-input-${feed.id}`}>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none z-10" />
                <select
                  ref={locationInputRef}
                  value={isCustomLocation ? "__custom__" : locationValue}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomLocation(true);
                      setLocationValue("");
                    } else {
                      setIsCustomLocation(false);
                      setLocationValue(e.target.value);
                    }
                  }}
                  className="w-full pl-6 pr-2 py-1.5 text-[11px] bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 appearance-none"
                  data-testid={`location-select-${feed.id}`}
                >
                  <option value="">— Select a US city —</option>
                  {VALID_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                  <option value="__custom__">Custom address…</option>
                </select>
              </div>
              {isCustomLocation && (
                <input
                  type="text"
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  placeholder="e.g. 123 Main St, Austin, TX"
                  className="flex-1 min-w-[220px] px-2 py-1.5 text-[11px] bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  data-testid={`location-custom-${feed.id}`}
                />
              )}
              <button
                onClick={handleSaveLocation}
                disabled={!locationValue.trim() || isSavingLocation}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
                data-testid={`save-location-${feed.id}`}
              >
                {isSavingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </button>
              <button
                onClick={() => { setShowLocationInput(false); setLocationValue(""); setIsCustomLocation(false); }}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Choropleth scoring constants ───────────────────────────────────────────
const SEV_WEIGHT: Record<string, number> = { low: 1, medium: 3, high: 8, critical: 20 };
const TAU_MS = 6 * 60 * 60 * 1000; // 6 hours
const K = 30;
const ALPHA = 0.25;
const GAMMA = 1.6;

// Extract 2-letter state code from "City, ST" location string
function locationToState(location?: string): string | null {
  if (!location) return null;
  const m = location.match(/,\s*([A-Z]{2})$/);
  return m ? m[1] : null;
}

// Resolve incident coordinates for map pins:
// 1) explicit coordinates from backend, 2) known city lookup, 3) deterministic jitter near state center.
function incidentToCoords(inc: Incident): [number, number] | null {
  if (inc.coordinates?.lat != null && inc.coordinates?.lng != null) {
    return [inc.coordinates.lng, inc.coordinates.lat];
  }
  if (inc.location && CITY_COORDS[inc.location]) {
    return CITY_COORDS[inc.location];
  }
  const state = locationToState(inc.location);
  if (!state || !STATE_CENTERS[state]) return null;
  const [lng, lat] = STATE_CENTERS[state];
  const jitterA = ((inc.id % 7) - 3) * 0.12;
  const jitterB = (((inc.id * 3) % 7) - 3) * 0.1;
  return [lng + jitterA, lat + jitterB];
}

// Compute per-state EMA-smoothed scores
function computeStateScores(
  incidents: Incident[],
  prev: Record<string, number>,
  now: number,
): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const inc of incidents) {
    if (inc.status !== "active") continue;
    const state = locationToState(inc.location);
    if (!state) continue;
    const w = SEV_WEIGHT[inc.severity] ?? 1;
    const decay = Math.exp(-(now - new Date(inc.createdAt).getTime()) / TAU_MS);
    raw[state] = (raw[state] ?? 0) + w * decay;
  }
  const next: Record<string, number> = {};
  const allStates = Array.from(new Set([...Object.keys(prev), ...Object.keys(raw)]));
  for (const state of allStates) {
    const sat = 1 - Math.exp(-(raw[state] ?? 0) / K);
    const ema = ALPHA * sat + (1 - ALPHA) * (prev[state] ?? 0);
    next[state] = Math.min(1, Math.max(0, ema));
  }
  return next;
}

// score → rgb color: yellow (#FDE047) → deep red (#991B1B)
function scoreToColor(score: number): string {
  const p = Math.pow(score, GAMMA);
  const crush = 1 - 0.18 * p;
  const r = Math.round(Math.min(255, (253 + (239 - 253) * p) * crush));
  const g = Math.round(Math.min(255, (224 + (68  - 224) * p) * crush));
  const b = Math.round(Math.min(255, (71  + (68  - 71)  * p) * crush));
  return `rgb(${r},${g},${b})`;
}

// Derive a call_status proxy from incident fields
function incidentCallStatus(inc: Incident): "routing" | "dialing" | "connected" | "completed" | "failed" {
  if (inc.status === "resolved") return "completed";
  if (inc.status === "escalated") return "connected";
  const score = inc.riskScore ?? 0;
  if (score > 70) return "dialing";
  if (score > 30) return "routing";
  return "routing";
}

const CALL_STATUS_STROKE: Record<string, string> = {
  routing:   "#60A5FA",
  dialing:   "#60A5FA",
  connected: "#A78BFA",
  completed: "#22C55E",
  failed:    "#F87171",
};
const SEV_PIN_FILL: Record<string, string> = {
  critical: "#EF4444",
  high:     "#F97316",
  medium:   "#FCD34D",
  low:      "#3B82F6",
};

// Full state name lookup
const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",
  KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
  MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",
  MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
  OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
  DC:"Washington D.C.",
};

// Approximate centroids [lng, lat] for zooming into each state
const STATE_CENTERS: Record<string, [number, number]> = {
  AL:[-86.9,32.8],AK:[-153,64],AZ:[-111.6,34.3],AR:[-92.4,34.9],CA:[-119.4,37.2],
  CO:[-105.5,39.0],CT:[-72.7,41.6],DE:[-75.5,39.0],FL:[-81.5,27.8],GA:[-83.4,32.7],
  HI:[-157.5,20.3],ID:[-114.5,44.4],IL:[-89.2,40.0],IN:[-86.3,40.3],IA:[-93.5,42.0],
  KS:[-98.4,38.5],KY:[-84.9,37.5],LA:[-91.8,31.2],ME:[-69.2,45.4],MD:[-76.8,39.0],
  MA:[-71.8,42.2],MI:[-85.4,44.3],MN:[-94.3,46.4],MS:[-89.7,32.7],MO:[-92.5,38.5],
  MT:[-110.0,47.0],NE:[-99.9,41.5],NV:[-116.4,39.3],NH:[-71.6,43.7],NJ:[-74.5,40.1],
  NM:[-106.1,34.4],NY:[-75.5,42.8],NC:[-79.4,35.5],ND:[-100.5,47.5],OH:[-82.8,40.4],
  OK:[-97.5,35.5],OR:[-120.6,44.0],PA:[-77.2,40.9],RI:[-71.5,41.7],SC:[-80.9,33.8],
  SD:[-100.2,44.4],TN:[-86.7,35.9],TX:[-99.3,31.5],UT:[-111.1,39.5],VT:[-72.7,44.0],
  VA:[-78.5,37.5],WA:[-120.5,47.4],WV:[-80.6,38.6],WI:[-89.8,44.5],WY:[-107.6,43.0],
  DC:[-77.0,38.9],
};
const SEV_PIN_RADIUS: Record<string, number> = {
  critical: 12, high: 9, medium: 7, low: 5,
};

// FIPS numeric ID → 2-letter postal code (us-atlas states-10m uses FIPS IDs)
const FIPS_TO_POSTAL: Record<string, string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
  "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
  "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
  "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
  "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
  "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
  "55":"WI","56":"WY",
};

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// Separate component: renders a single state filling the container using d3 fitExtent
function StateDrillDown({
  stateCode,
  pins,
  onBack,
}: {
  stateCode: string;
  pins: Array<{ inc: Incident; coords: [number, number] }>;
  onBack: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ d: string; code: string }[]>([]);
  const [projection, setProjection] = useState<any>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [stateFeat, setStateFeat] = useState<any>(null);
  const lifecycleStartRef = useRef<Map<number, number>>(new Map());
  const [clockMs, setClockMs] = useState(Date.now());

  // Zoom / pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // ── 1. Reliable dimension measurement via ResizeObserver + rAF ──────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId: number;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const { width: w, height: h } = el.getBoundingClientRect();
        if (w > 0 && h > 0) setDims({ w, h });
      });
    });
    ro.observe(el);
    // Also fire immediately in case element already has size
    rafId = requestAnimationFrame(() => {
      const { width: w, height: h } = el.getBoundingClientRect();
      if (w > 0 && h > 0) setDims({ w, h });
    });
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
  }, []);

  // ── 2. Fetch GeoJSON whenever stateCode changes ────────────────────────────
  useEffect(() => {
    setStateFeat(null);
    setPaths([]);
    setProjection(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topo: any) => {
        const geojson: any = feature(topo, topo.objects.states);
        const found = geojson.features.find((f: any) => {
          const rawId = String(f.id ?? "").padStart(2, "0");
          return (FIPS_TO_POSTAL[rawId] ?? rawId) === stateCode;
        });
        if (found) setStateFeat(found);
      });
  }, [stateCode]);

  // ── 3. Recompute projection whenever stateFeat or dims change ──────────────
  useEffect(() => {
    if (!stateFeat || dims.w === 0 || dims.h === 0) return;
    const { w, h } = dims;
    const pad = 0.08;
    const proj = geoMercator().fitExtent(
      [[w * pad, h * pad], [w * (1 - pad), h * (1 - pad)]],
      stateFeat
    );
    const pathGen = geoPath().projection(proj);
    const d = pathGen(stateFeat) ?? "";
    setPaths([{ d, code: stateCode }]);
    setProjection(() => proj);
  }, [stateFeat, dims, stateCode]);

  // ── Pin lifecycle tracking ─────────────────────────────────────────────────
  useEffect(() => {
    const now = Date.now();
    const activeIds = new Set<number>();
    for (const { inc } of pins) {
      activeIds.add(inc.id);
      if (!lifecycleStartRef.current.has(inc.id)) {
        lifecycleStartRef.current.set(inc.id, now);
      }
    }
    for (const id of Array.from(lifecycleStartRef.current.keys())) {
      if (!activeIds.has(id)) lifecycleStartRef.current.delete(id);
    }
  }, [pins]);

  useEffect(() => {
    const timer = setInterval(() => setClockMs(Date.now()), 300);
    return () => clearInterval(timer);
  }, []);

  const timedPins = useMemo(() => {
    return pins
      .map(({ inc, coords }) => {
        const startedAt = lifecycleStartRef.current.get(inc.id) ?? clockMs;
        const elapsed = clockMs - startedAt;
        let callStatus: "dialing" | "connected" | "completed" | "hidden" = "dialing";
        if (elapsed >= 3000 && elapsed < 9000) callStatus = "connected";
        else if (elapsed >= 9000 && elapsed < 24000) callStatus = "completed";
        else if (elapsed >= 24000) callStatus = "hidden";
        return { inc, coords, callStatus };
      })
      .filter((item) => item.callStatus !== "hidden");
  }, [pins, clockMs]);

  // ── Zoom / pan handlers ────────────────────────────────────────────────────
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 12;

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setZoom((prev) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor));
      const scale = next / prev;
      setPan((p) => ({ x: mx * (1 - scale) + p.x * scale, y: my * (1 - scale) + p.y * scale }));
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    isDraggingRef.current = true;
    dragStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.style.cursor = "grabbing";
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.mx;
    const dy = e.clientY - dragStartRef.current.my;
    setPan({ x: dragStartRef.current.px + dx, y: dragStartRef.current.py + dy });
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    e.currentTarget.style.cursor = "grab";
  }, []);

  const zoomIn = () => {
    const factor = 1.4;
    setZoom((prev) => {
      const next = Math.min(MAX_ZOOM, prev * factor);
      const cx = dims.w / 2, cy = dims.h / 2;
      const scale = next / prev;
      setPan((p) => ({ x: cx * (1 - scale) + p.x * scale, y: cy * (1 - scale) + p.y * scale }));
      return next;
    });
  };
  const zoomOut = () => {
    const factor = 1 / 1.4;
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, prev * factor);
      const cx = dims.w / 2, cy = dims.h / 2;
      const scale = next / prev;
      setPan((p) => ({ x: cx * (1 - scale) + p.x * scale, y: cy * (1 - scale) + p.y * scale }));
      return next;
    });
  };
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const stateName = STATE_NAMES[stateCode] ?? stateCode;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(165deg, #0b1220 0%, #172033 55%, #121a29 100%)",
        cursor: "grab",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Topographic texture */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="topo-drill" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 20 Q10 10 20 20 Q30 30 40 20" fill="none" stroke="#7dd3fc" strokeWidth="0.8"/>
            <path d="M0 10 Q10 0 20 10 Q30 20 40 10" fill="none" stroke="#7dd3fc" strokeWidth="0.5"/>
            <path d="M0 30 Q10 20 20 30 Q30 40 40 30" fill="none" stroke="#7dd3fc" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo-drill)"/>
      </svg>

      {/* State SVG — zoom/pan applied via CSS transform */}
      {dims.w > 0 && (
        <svg
          width={dims.w}
          height={dims.h}
          className="absolute inset-0 pointer-events-none"
          style={{
            transformOrigin: "0 0",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {paths.map(({ d, code }) => (
            <path key={code} d={d} fill="rgba(30,58,138,0.18)" stroke="#4b6eaf" strokeWidth={1.4} />
          ))}
          {projection && timedPins.map(({ inc, coords, callStatus }) => {
            const [px, py] = projection(coords) ?? [0, 0];
            const fill = SEV_PIN_FILL[inc.severity] ?? "#94A3B8";
            const statusColor = CALL_STATUS_STROKE[callStatus];
            const r = SEV_PIN_RADIUS[inc.severity] ?? 6;
            const pinScale = 1 / zoom;
            const isActive = callStatus === "connected" || callStatus === "completed";
            return (
              <g key={inc.id} transform={`translate(${px},${py}) scale(${pinScale})`}>
                {/* Pulsing halo */}
                <circle r={r + 6} fill={isActive ? statusColor : fill} opacity={isActive ? 0.18 : 0.12}>
                  <animate attributeName="r" values={`${r+4};${r+10};${r+4}`} dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values={isActive ? "0.18;0.05;0.18" : "0.12;0.03;0.12"} dur="2s" repeatCount="indefinite"/>
                </circle>
                {/* Main circle — status color when connected/completed, severity color when dialing */}
                <circle r={r} fill={isActive ? statusColor : fill} stroke={isActive ? "none" : statusColor} strokeWidth={isActive ? 0 : 2.5}/>
                {/* Inner severity dot visible only when connected/completed */}
                {isActive && <circle r={r * 0.42} fill={fill}/>}
                <text textAnchor="middle" y={-(r + 6)}
                  style={{ fontSize: "7px", fontWeight: "bold", fill: "white", pointerEvents: "none" }}>
                  {inc.title.length > 22 ? inc.title.slice(0, 22) + "…" : inc.title}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* Loading indicator while fetching / computing */}
      {dims.w > 0 && paths.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-500 text-xs">Loading {stateName}…</span>
        </div>
      )}

      {/* Back button */}
      <button onClick={onBack}
        className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-medium px-2.5 py-1.5 rounded transition-colors z-10"
      >
        ← Back to US
      </button>

      {/* State name + count top-right */}
      <div className="absolute top-2 right-2 bg-black/70 border border-slate-700 px-3 py-1.5 rounded text-slate-200 z-10">
        <p className="text-sm font-bold text-white leading-tight">{stateName}</p>
        <p className="text-[10px] text-slate-400">{pins.length} active incident{pins.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
        <button onClick={zoomIn}
          className="w-7 h-7 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded transition-colors font-bold"
          title="Zoom in"
        >+</button>
        <button onClick={zoomOut}
          className="w-7 h-7 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded transition-colors font-bold"
          title="Zoom out"
        >−</button>
        <button onClick={resetView}
          className="w-7 h-7 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[9px] rounded transition-colors font-medium"
          title="Reset view"
        >↺</button>
      </div>

      {/* Pin legend */}
      <div className="absolute bottom-2 left-2 flex flex-col gap-1 bg-black/70 rounded px-2 py-1.5 z-10">
        <div className="flex gap-2">
          {(["critical","high","medium","low"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: SEV_PIN_FILL[s] }}/>
              <span className="text-[9px] text-slate-400 capitalize">{s}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {(["connected","completed"] as const).map((cs) => (
            <div key={cs} className="flex items-center gap-1">
              <span className="relative h-3 w-3 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: CALL_STATUS_STROKE[cs] }}>
                <span className="h-1 w-1 rounded-full bg-slate-300"/>
              </span>
              <span className="text-[9px] text-slate-500">{cs === "connected" ? "Connected" : "Completed"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IncidentMap({ incidents }: { incidents: Incident[] }) {
  const [stateScores, setStateScores] = useState<Record<string, number>>({});
  const prevScoresRef = useRef<Record<string, number>>({});
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const next = computeStateScores(incidents, prevScoresRef.current, Date.now());
      prevScoresRef.current = next;
      setStateScores({ ...next });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [incidents]);

  const activeIncidents = incidents.filter((i) => i.status === "active");

  const statePins = selectedState
    ? activeIncidents
        .filter((inc) => locationToState(inc.location) === selectedState)
        .map((inc) => {
          const coords = incidentToCoords(inc) ?? undefined;
          return coords ? { inc, coords } : null;
        })
        .filter(Boolean) as Array<{ inc: Incident; coords: [number, number] }>
    : [];
  const openStateDrill = useCallback((stateCode: string) => {
    // Immediate handoff to drill-down; overview map should disappear right away.
    setHoveredState(null);
    setSelectedState(stateCode);
  }, []);

  const closeStateDrill = useCallback(() => {
    setSelectedState(null);
  }, []);

  return (
    <div
      className="relative w-full h-full rounded-lg overflow-hidden"
      data-testid="incident-map"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1a2744 40%, #162032 100%)" }}
    >
      {!selectedState && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: [0.4, 0, 1, 1] }}
        >
        {/* Topographic texture overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="topo-lines" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 20 Q10 10 20 20 Q30 30 40 20" fill="none" stroke="#7dd3fc" strokeWidth="0.8"/>
              <path d="M0 10 Q10 0 20 10 Q30 20 40 10" fill="none" stroke="#7dd3fc" strokeWidth="0.5"/>
              <path d="M0 30 Q10 20 20 30 Q30 40 40 30" fill="none" stroke="#7dd3fc" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo-lines)"/>
        </svg>

        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => {
                const rawId: string = String(geo.id ?? "").padStart(2, "0");
                const stateCode: string = FIPS_TO_POSTAL[rawId] ?? geo.properties?.postal ?? rawId;
                const score = stateScores[stateCode] ?? 0;
                const isHovered = hoveredState === stateCode;
                const fill = score > 0 ? scoreToColor(score) : isHovered ? "#334155" : "#1e293b";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#475569"
                    strokeWidth={0.6}
                    style={{
                      default: { outline: "none", opacity: isHovered ? 0.82 : 1 },
                      hover:   { outline: "none", opacity: 0.82, cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                    onClick={() => openStateDrill(stateCode)}
                    onMouseEnter={() => setHoveredState(stateCode)}
                    onMouseLeave={() => setHoveredState(null)}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Choropleth legend */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/60 rounded px-2 py-1">
          <span className="text-[9px] text-slate-500">Low</span>
          <div className="w-20 h-2 rounded" style={{ background: "linear-gradient(to right, #FDE047, #EF4444, #991B1B)" }} />
          <span className="text-[9px] text-slate-500">High</span>
          <span className="text-[9px] text-slate-600 ml-2">{activeIncidents.length} active</span>
        </div>
      </motion.div>
      )}

      <AnimatePresence mode="wait">
        {selectedState && (
          <motion.div
            key={selectedState}
            className="absolute inset-0 z-10"
            initial={{ opacity: 0, y: 18, scale: 1.1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.996 }}
            transition={{ duration: 0.38, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ willChange: "transform, opacity" }}
          >
            <StateDrillDown
              stateCode={selectedState}
              pins={statePins}
              onBack={closeStateDrill}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Parse enriched first-responder metadata from incident description
function parseIncidentMeta(description: string) {
  const humanLife = /human life present/i.test(description);
  const noHumanLife = /no human life detected/i.test(description);
  const animals = /animals present/i.test(description);
  const objectsMatch = description.match(/objects visible:\s*([^.]+)\./i);
  const objects = objectsMatch ? objectsMatch[1].trim() : null;
  return { humanLife, noHumanLife, animals, objects };
}

const INCIDENT_SEVERITY_WEIGHT: Record<"low" | "medium" | "high" | "critical", number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// Extract the camera name from an incident title, e.g. "Fire Detected — Camera 2" → "Camera 2"
function extractCameraKey(incident: Incident): string {
  const match = incident.title.match(/—\s*(.+)$/);
  return match ? match[1].trim() : `incident-${incident.id}`;
}

function rankIncidentsByRisk(incidents: Incident[], assessments: RiskAssessment[]): Incident[] {
  // Build latest assessment per incident
  const latestByIncident = new Map<number, RiskAssessment>();
  for (const item of assessments) {
    const existing = latestByIncident.get(item.incidentId);
    if (!existing || new Date(item.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      latestByIncident.set(item.incidentId, item);
    }
  }

  const enriched = incidents.map((incident) => {
    const latest = latestByIncident.get(incident.id);
    const riskScore = typeof latest?.riskScore === "number" ? latest.riskScore : null;
    const priorityScore = typeof latest?.priorityScore === "number" ? latest.priorityScore : riskScore;
    return {
      incident,
      riskScore,
      priorityScore,
      assessmentTs: latest ? new Date(latest.createdAt).getTime() : 0,
      cameraKey: extractCameraKey(incident),
    };
  });

  // Sort by severity first, then risk score, then recency
  enriched.sort((a, b) => {
    const sevA = INCIDENT_SEVERITY_WEIGHT[a.incident.severity] ?? 0;
    const sevB = INCIDENT_SEVERITY_WEIGHT[b.incident.severity] ?? 0;
    if (sevB !== sevA) return sevB - sevA;
    if ((b.priorityScore ?? -1) !== (a.priorityScore ?? -1)) return (b.priorityScore ?? -1) - (a.priorityScore ?? -1);
    if ((b.riskScore ?? -1) !== (a.riskScore ?? -1)) return (b.riskScore ?? -1) - (a.riskScore ?? -1);
    if (b.assessmentTs !== a.assessmentTs) return b.assessmentTs - a.assessmentTs;
    return new Date(b.incident.createdAt).getTime() - new Date(a.incident.createdAt).getTime();
  });

  // Deduplicate: each camera feed gets one rank slot — the worst incident for that camera
  // (already sorted worst-first, so first occurrence wins)
  const seenCameras = new Set<string>();
  const ranked: Incident[] = [];
  for (const item of enriched) {
    if (!seenCameras.has(item.cameraKey)) {
      seenCameras.add(item.cameraKey);
      ranked.push({
        ...item.incident,
        riskRank: ranked.length + 1,
        riskScore: item.riskScore,
        priorityScore: item.priorityScore,
      });
    }
  }
  return ranked;
}

function LiveIncidentFeed({
  incidents,
  onFlag,
}: {
  incidents: Incident[];
  onFlag?: (id: number) => void;
}) {
  const rankBadgeClasses = (severity: string) => {
    if (severity === "critical") return "border-red-500/80 bg-red-500/20 text-red-200";
    if (severity === "high") return "border-orange-500/80 bg-orange-500/20 text-orange-200";
    if (severity === "medium") return "border-amber-500/80 bg-amber-500/20 text-amber-200";
    return "border-slate-600 bg-slate-700/50 text-slate-300";
  };

  const cardBorderClasses = (rank: number, severity: string) => {
    if (rank === 1) return "border-red-500/50 shadow-[0_0_14px_rgba(239,68,68,0.12)]";
    if (rank === 2) return "border-orange-500/40";
    if (rank === 3) return "border-amber-500/35";
    if (severity === "critical") return "border-red-500/25";
    if (severity === "high") return "border-orange-500/20";
    return "border-slate-700/40";
  };

  return (
    <ScrollArea className="h-full" data-testid="incident-feed">
      <div className="space-y-2 pr-3">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No active incidents</p>
          </div>
        ) : (
          <>
            {/* Incident cards */}
            {incidents.map((incident) => {
              const meta = parseIncidentMeta(incident.description);
              return (
                <div
                  key={incident.id}
                  className={`flex overflow-hidden rounded-lg border bg-slate-900/50 hover:bg-slate-900/80 transition-colors ${cardBorderClasses(incident.riskRank ?? 999, incident.severity)}`}
                  data-testid={`incident-card-${incident.id}`}
                >
                  <div className="w-[3px] shrink-0" style={{ background: SEV_LEFT_ACCENT[incident.severity] ?? "#475569" }} />
                  <div className="flex-1 p-3">
                  <div className="flex items-start gap-2">
                    {/* Rank block */}
                    <div className={`shrink-0 min-w-[52px] rounded-md border px-1.5 py-1 text-center ${rankBadgeClasses(incident.severity)}`}>
                      <p className="text-[9px] uppercase tracking-wide opacity-70">Rank</p>
                      <p className="text-lg font-extrabold leading-none">#{incident.riskRank}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[incident.severity]}`}>
                          {incident.severity.toUpperCase()}
                        </Badge>
                        {incident.status === "active" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse-status" />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium text-slate-200 truncate">{incident.title}</h4>
                        {incident.status === "active" && (
                          <div className="inline-flex items-center gap-2 rounded-md border border-red-700/30 bg-red-950/15 px-2 py-1 shrink-0">
                            <div className="voice-memo-badge" aria-hidden="true">
                              <span className="voice-memo-ring voice-memo-ring-1" />
                              <span className="voice-memo-ring voice-memo-ring-2" />
                              <span className="voice-memo-core">
                                <span className="voice-memo-bars">
                                  <span className="voice-memo-bar" />
                                  <span className="voice-memo-bar" />
                                  <span className="voice-memo-bar" />
                                  <span className="voice-memo-bar" />
                                  <span className="voice-memo-bar" />
                                </span>
                              </span>
                            </div>
                            <span className="text-[9px] text-red-300 uppercase tracking-wider">Currently Dialing</span>
                            <span className="sr-only">Currently dialing with voice memo activity</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{incident.description}</p>

                      {/* First-responder indicator badges */}
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        {meta.humanLife && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            <User className="h-2 w-2" />
                            Human life
                          </span>
                        )}
                        {meta.noHumanLife && !meta.humanLife && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-500 border border-slate-700/30">
                            <User className="h-2 w-2" />
                            No humans
                          </span>
                        )}
                        {meta.animals && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <PawPrint className="h-2 w-2" />
                            Animals
                          </span>
                        )}
                        {meta.objects && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30">
                            <Box className="h-2 w-2" />
                            {meta.objects.length > 30 ? meta.objects.slice(0, 30) + "…" : meta.objects}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        {incident.location && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {incident.location}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(incident.createdAt).toLocaleTimeString()}
                        </span>
                        {onFlag && (
                          <button
                            onClick={() => onFlag(incident.id)}
                            className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-400 transition-colors rounded px-1.5 py-0.5"
                            aria-label={`Flag ${incident.title} for review`}
                          >
                            <Flag className="h-3 w-3" />
                            Flag
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function FlaggedCallsQueue({
  incidents,
  onAllow,
  onDiscard,
}: {
  incidents: Incident[];
  onAllow: (id: number) => void;
  onDiscard: (id: number) => void;
}) {
  if (incidents.length === 0) {
    return (
      <div className="p-3 rounded-lg border border-slate-700/50 bg-slate-900/40 text-[11px] text-slate-500">
        No flagged users in review.
      </div>
    );
  }

  return (
    <div className="space-y-2 py-0.5">
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className="flex overflow-hidden rounded-lg border border-amber-700/30 bg-amber-950/15"
          data-testid={`flagged-call-${incident.id}`}
        >
          <div className="w-[3px] shrink-0 rounded-l-lg bg-amber-500/70" />
          <div className="flex-1 p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[incident.severity]}`}>
                  {incident.severity.toUpperCase()}
                </Badge>
                <span className="text-[9px] text-amber-500 font-semibold uppercase tracking-widest">Under Review</span>
              </div>
              <h4 className="text-[12px] font-semibold text-slate-200 truncate leading-snug">{incident.title}</h4>
              {incident.location && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {incident.location}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => onAllow(incident.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium bg-emerald-700/80 hover:bg-emerald-600 text-white transition-colors"
                aria-label={`Return ${incident.title} to live action`}
              >
                <PhoneCall className="h-3 w-3" />
                Return to Live
              </button>
              <button
                onClick={() => onDiscard(incident.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-700/50 transition-colors"
                aria-label={`Discard flagged call ${incident.title}`}
              >
                <Trash2 className="h-3 w-3" />
                Discard
              </button>
            </div>
          </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactsTable({
  contacts,
  onDelete,
  onToggle,
  onAdd,
  onEdit,
}: {
  contacts: Contact[];
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onAdd: (data: Partial<Contact>) => void;
  onEdit: (id: number, data: Partial<Contact>) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", roleSelect: "ems", roleCustom: "", location: "", priority: 1 });

  const resetForm = () => {
    setForm({ name: "", phone: "", email: "", roleSelect: "ems", roleCustom: "", location: "", priority: 1 });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name || !form.phone) return;
    const role = form.roleSelect === "custom" ? form.roleCustom.trim() || "custom" : form.roleSelect;
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      role,
      priority: form.priority,
      metadata: { location: form.location },
    };
    if (editingId) {
      onEdit(editingId, payload);
    } else {
      onAdd(payload);
    }
    resetForm();
  };

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    const presetRoles = ["ems", "fire", "police"];
    const roleSelect = presetRoles.includes(c.role) ? c.role : "custom";
    const roleCustom = presetRoles.includes(c.role) ? "" : c.role;
    const location = c.metadata?.location || "";
    setForm({ name: c.name, phone: c.phone, email: c.email || "", roleSelect, roleCustom, location, priority: c.priority });
    setIsAdding(true);
  };

  return (
    <div className="h-full flex flex-col" data-testid="contacts-table">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{contacts.length} contacts</span>
        <Button
          size="sm"
          className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: "", phone: "", email: "", roleSelect: "ems", roleCustom: "", location: "", priority: 1 }); }}
          data-testid="add-contact-btn"
        >
          <UserPlus className="h-2.5 w-2.5 mr-1" />
          Add
        </Button>
      </div>

      {isAdding && (
        <div className="mb-2 p-2 bg-slate-900/80 rounded border border-slate-700/50 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-7 text-xs bg-slate-950 border-slate-700"
              data-testid="contact-name-input"
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-7 text-xs bg-slate-950 border-slate-700"
              data-testid="contact-phone-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Select value={form.roleSelect} onValueChange={(v) => setForm({ ...form, roleSelect: v, roleCustom: "" })}>
              <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-700" data-testid="contact-role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ems">EMS</SelectItem>
                <SelectItem value="fire">Fire</SelectItem>
                <SelectItem value="police">Police</SelectItem>
                <SelectItem value="custom">Type your own…</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-7 text-xs bg-slate-950 border-slate-700"
              data-testid="contact-email-input"
            />
          </div>
          {form.roleSelect === "custom" && (
            <Input
              placeholder="Enter custom role…"
              value={form.roleCustom}
              onChange={(e) => setForm({ ...form, roleCustom: e.target.value })}
              className="h-7 text-xs bg-slate-950 border-slate-700"
              data-testid="contact-role-custom-input"
            />
          )}
          <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
            <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-700" data-testid="contact-location-select">
              <SelectValue placeholder="Select location…" />
            </SelectTrigger>
            <SelectContent>
              {VALID_LOCATIONS.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1.5 justify-end">
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-slate-700" onClick={resetForm}>
              Cancel
            </Button>
            <Button size="sm" className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} data-testid="save-contact-btn">
              <Save className="h-2.5 w-2.5 mr-0.5" />
              {editingId ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                contact.isActive
                  ? "bg-slate-900/40 border-slate-700/40 hover:border-slate-600/50"
                  : "bg-slate-900/20 border-slate-800/30 opacity-50"
              }`}
              data-testid={`contact-row-${contact.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-300 truncate">{contact.name}</span>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${ROLE_COLORS[contact.role] || "bg-slate-700/30 text-slate-400 border-slate-600/30"}`}>
                    {contact.role.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500">{contact.phone}</span>
                  {contact.metadata?.location && (
                    <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                      <MapPin className="h-2 w-2" />
                      {contact.metadata.location}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-600">P{contact.priority}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={contact.isActive}
                  onCheckedChange={() => onToggle(contact.id)}
                  className="scale-75"
                  data-testid={`toggle-contact-${contact.id}`}
                />
                <button
                  className="p-1 rounded hover:bg-slate-800 transition-colors"
                  onClick={() => startEdit(contact)}
                  data-testid={`edit-contact-${contact.id}`}
                >
                  <Edit className="h-3 w-3 text-slate-500 hover:text-slate-300" />
                </button>
                <button
                  className="p-1 rounded hover:bg-slate-800 transition-colors"
                  onClick={() => onDelete(contact.id)}
                  data-testid={`delete-contact-${contact.id}`}
                >
                  <Trash2 className="h-3 w-3 text-slate-600 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}


export default function Dashboard() {
  const queryClient = useQueryClient();
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const [cameraPage, setCameraPage] = useState(0);
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(new Set());
  const rankingSyncInFlightRef = useRef(false);
  const analyzingIncidentsRef = useRef(new Set<number>());

  const analyzeAndRefreshRankings = useCallback(async (incidentId: number) => {
    if (analyzingIncidentsRef.current.has(incidentId)) return;
    analyzingIncidentsRef.current.add(incidentId);
    try {
      await apiRequest("POST", `/api/modules/risk-analysis/analyze/${incidentId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/modules/risk-analysis"] });
    } catch {
      // silent
    } finally {
      analyzingIncidentsRef.current.delete(incidentId);
    }
  }, [queryClient]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => console.log("WebSocket connected");

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event?.includes("incident")) {
          queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
          // Immediately score any newly created incident
          const incidentId = message.data?.incident?.id ?? message.data?.incidentId;
          if (typeof incidentId === "number") {
            void analyzeAndRefreshRankings(incidentId);
          }
        }
        if (message.event?.includes("module_health")) {
          queryClient.invalidateQueries({ queryKey: ["/api/health"] });
        }
        if (message.event?.includes("robocall")) {
          queryClient.invalidateQueries({ queryKey: ["/api/modules/robocaller"] });
        }
        if (message.event?.includes("camera") || message.event?.includes("detection")) {
          queryClient.invalidateQueries({ queryKey: ["/api/modules/camera-processing/feeds"] });
          // Re-score the incident linked to this detection
          const incidentId = message.data?.detection?.incidentId ?? message.data?.incidentId;
          if (typeof incidentId === "number") {
            void analyzeAndRefreshRankings(incidentId);
          }
        }
        if (message.event?.includes("contact")) {
          queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
        }
        if (message.event?.includes("risk")) {
          queryClient.invalidateQueries({ queryKey: ["/api/modules/risk-analysis"] });
        }
      } catch {}
    };

    websocket.onerror = () => {};
    websocket.onclose = () => {
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 3000);
    };

    return () => websocket.close();
  }, [queryClient]);

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    refetchInterval: 5000,
  });

  const { data: riskAssessments = [] } = useQuery<RiskAssessment[]>({
    queryKey: ["/api/modules/risk-analysis"],
    refetchInterval: 5000,
  });

  const { data: moduleHealth = [] } = useQuery<ModuleHealth[]>({
    queryKey: ["/api/health"],
    refetchInterval: 10000,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/modules/contact-management"],
  });

  const { data: cameraFeeds = [], isFetched: cameraFeedsFetched } = useQuery<CameraFeed[]>({
    queryKey: ["/api/modules/camera-processing/feeds"],
  });

  // Seed 4 real camera feeds into the DB on first load if the DB is actually empty
  useEffect(() => {
    if (!cameraFeedsFetched || cameraFeeds.length > 0) return;
    const seed = async () => {
      try {
        await Promise.all([
          apiRequest("POST", "/api/modules/camera-processing/feeds", { name: "Camera 1", location: "Unassigned" }),
          apiRequest("POST", "/api/modules/camera-processing/feeds", { name: "Camera 2", location: "Unassigned" }),
          apiRequest("POST", "/api/modules/camera-processing/feeds", { name: "Camera 3", location: "Unassigned" }),
          apiRequest("POST", "/api/modules/camera-processing/feeds", { name: "Camera 4", location: "Unassigned" }),
        ]);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/camera-processing/feeds"] });
      } catch {}
    };
    seed();
  }, [cameraFeedsFetched]);


  const createContact = useCallback(
    async (data: Partial<Contact>) => {
      try {
        await apiRequest("POST", "/api/modules/contact-management", data);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
      } catch {
        // Intentionally silent: UI should not trigger action popups.
      }
    },
    [queryClient]
  );

  const editContact = useCallback(
    async (id: number, data: Partial<Contact>) => {
      try {
        await apiRequest("PATCH", `/api/modules/contact-management/${id}`, data);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
      } catch {
        // Intentionally silent: UI should not trigger action popups.
      }
    },
    [queryClient]
  );

  const deleteContact = useCallback(
    async (id: number) => {
      try {
        await apiRequest("DELETE", `/api/modules/contact-management/${id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
      } catch {
        // Intentionally silent: UI should not trigger action popups.
      }
    },
    [queryClient]
  );

  const toggleContact = useCallback(
    async (id: number) => {
      try {
        await apiRequest("PATCH", `/api/modules/contact-management/${id}/toggle`);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
      } catch {}
    },
    []
  );

  const flagIncident = useCallback((id: number) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const allowFlaggedCall = useCallback((id: number) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const discardFlaggedCall = useCallback(async (id: number) => {
    try {
      await apiRequest("PATCH", `/api/incidents/${id}`, { status: "resolved" });
      setFlaggedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    } catch {
      // Intentionally silent: UI should not trigger action popups.
    }
  }, [queryClient]);

  // Resolve all active incidents at once
  const clearAllIncidents = useCallback(async () => {
    const active = incidents.filter((i) => i.status === "active");
    if (active.length === 0) return;
    try {
      await Promise.all(
        active.map((inc) =>
          apiRequest("PATCH", `/api/incidents/${inc.id}`, { status: "resolved" })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    } catch {
      // Intentionally silent: UI should not trigger action popups.
    }
  }, [incidents]);

  const activeIncidents = useMemo(
    () => rankIncidentsByRisk(incidents.filter((i) => i.status === "active"), riskAssessments),
    [incidents, riskAssessments],
  );
  const liveIncidents = useMemo(
    () => activeIncidents.filter((inc) => !flaggedIds.has(inc.id)),
    [activeIncidents, flaggedIds],
  );
  const flaggedIncidents = useMemo(
    () => activeIncidents.filter((inc) => flaggedIds.has(inc.id)),
    [activeIncidents, flaggedIds],
  );
  useEffect(() => {
    const activeIds = new Set(activeIncidents.map((inc) => inc.id));
    setFlaggedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => activeIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [activeIncidents]);
  const activeIncidentIdsKey = useMemo(
    () => incidents.filter((i) => i.status === "active").map((i) => i.id).sort((a, b) => a - b).join(","),
    [incidents],
  );
  const criticalCount = incidents.filter((i) => i.severity === "critical" && i.status === "active").length;
  const displayFeeds = cameraFeeds.slice(0, 4);

  useEffect(() => {
    let isMounted = true;
    const syncRankings = async () => {
      if (!isMounted) return;
      if (!activeIncidentIdsKey) return;
      if (rankingSyncInFlightRef.current) return;
      rankingSyncInFlightRef.current = true;
      try {
        await apiRequest("POST", "/api/modules/risk-analysis/analyze-all?cooldownSeconds=15");
        queryClient.invalidateQueries({ queryKey: ["/api/modules/risk-analysis"] });
      } catch {
        // Silent background sync failure
      } finally {
        rankingSyncInFlightRef.current = false;
      }
    };

    void syncRankings();
    const timer = setInterval(syncRankings, 8000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeIncidentIdsKey, queryClient]);

  const getHealthIcon = (name: string) => {
    const m = moduleHealth.find((h) => h.moduleName === name);
    if (!m) return <Activity className="h-3 w-3 text-slate-600" />;
    if (m.status === "healthy") return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (m.status === "degraded") return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    return <XCircle className="h-3 w-3 text-red-500" />;
  };

  // Helper: maximize button for card headers
  const MaxBtn = ({ panel }: { panel: string }) => (
    <button
      onClick={() => setMaximizedPanel(panel)}
      className="ml-1 p-0.5 rounded hover:bg-slate-700/50 transition-colors text-slate-600 hover:text-slate-400"
      title="Maximize"
    >
      <Maximize2 className="h-3 w-3" />
    </button>
  );
  const panelMotion = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="min-h-screen h-screen flex flex-col text-slate-200 overflow-x-hidden dark" style={{ background: "linear-gradient(160deg, #04070e 0%, #080d1b 45%, #04070e 100%)" }}>
      {/* Maximized Panel Overlay */}
      <AnimatePresence>
        {maximizedPanel && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "linear-gradient(160deg, #04070e 0%, #080d1b 100%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              className="relative flex h-full flex-col"
              initial={{ opacity: 0, y: 10, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
              animate={{ opacity: 1, scale: 1, y: 0, boxShadow: "0 24px 70px rgba(2, 6, 23, 0.55)" }}
              exit={{ opacity: 0, y: 8, boxShadow: "0 10px 30px rgba(2, 6, 23, 0.35)" }}
              transition={panelMotion}
              style={{ willChange: "transform, opacity, box-shadow" }}
            >
              <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-white/[0.05]" style={{ background: "linear-gradient(135deg, #06090f 0%, #0c1525 100%)" }}>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  {maximizedPanel === "map" && <><div className="h-3 w-[3px] rounded-full bg-indigo-500" /><MapPin className="h-3.5 w-3.5 text-indigo-400" /> Incident Map</>}
                  {maximizedPanel === "incidents" && <><div className="h-3 w-[3px] rounded-full bg-red-500" /><Activity className="h-3.5 w-3.5 text-red-400" /> Live Incident Feed</>}
                  {maximizedPanel === "cameras" && <><div className="h-3 w-[3px] rounded-full bg-sky-500" /><Camera className="h-3.5 w-3.5 text-sky-400" /> Camera Feeds</>}
                </span>
                <button
                  onClick={() => setMaximizedPanel(null)}
                  className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Minimize
                </button>
              </div>
              <div className="flex-1 min-h-0 p-3 overflow-hidden">
                {maximizedPanel === "map" && <IncidentMap incidents={incidents} />}
                {maximizedPanel === "incidents" && (
                  <div className="h-full flex flex-col gap-3">
                    {liveIncidents.length > 0 && (
                      <div className="shrink-0 flex justify-end mb-2">
                        <button
                          onClick={clearAllIncidents}
                          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Clear all
                        </button>
                      </div>
                    )}
                    <div className="flex-1 min-h-0">
                      <LiveIncidentFeed incidents={liveIncidents} onFlag={flagIncident} />
                    </div>
                    <div className="shrink-0 border-t border-amber-900/30 pt-3">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <Flag className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">
                          Flagged Users ({flaggedIncidents.length})
                        </span>
                      </div>
                      <div className="overflow-y-auto max-h-56">
                        <FlaggedCallsQueue
                          incidents={flaggedIncidents}
                          onAllow={allowFlaggedCall}
                          onDiscard={discardFlaggedCall}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {maximizedPanel === "cameras" && (() => {
                  const PAGE_SIZE = 12;
                  const totalPages = Math.max(1, Math.ceil(Math.max(cameraFeeds.length, 1) / PAGE_SIZE));
                  const pageFeeds = cameraFeeds.slice(cameraPage * PAGE_SIZE, (cameraPage + 1) * PAGE_SIZE);
                  const slots: Array<CameraFeed | null> = [
                    ...pageFeeds,
                    ...Array(Math.max(0, PAGE_SIZE - pageFeeds.length)).fill(null),
                  ];
                  return (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 min-h-0 grid grid-cols-4 grid-rows-3 gap-2">
                        {slots.map((feed, i) =>
                          feed ? (
                            <CameraFeedCard
                              key={feed.id}
                              feed={feed}
                              onVideoUploaded={() => queryClient.invalidateQueries({ queryKey: ["/api/modules/camera-processing/feeds"] })}
                              onIncidentCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/incidents"] })}
                            />
                          ) : (
                            <div
                              key={`empty-${i}`}
                              className="rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center gap-1.5"
                            >
                              <Camera className="h-6 w-6 text-slate-700" />
                              <span className="text-[10px] text-slate-600 font-medium">
                                Cam {cameraPage * PAGE_SIZE + i + 1}
                              </span>
                              <span className="text-[9px] text-slate-700">No feed</span>
                            </div>
                          )
                        )}
                      </div>
                      <div className="shrink-0 flex items-center justify-center gap-3 pt-2 pb-1">
                        <button
                          onClick={() => setCameraPage((p) => Math.max(0, p - 1))}
                          disabled={cameraPage === 0}
                          className="px-3 py-1 text-[11px] rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          ← Prev
                        </button>
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          Page {cameraPage + 1} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCameraPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={cameraPage === totalPages - 1}
                          className="px-3 py-1 text-[11px] rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header
        className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/[0.05]"
        style={{ background: "linear-gradient(135deg, #06090f 0%, #0c1525 50%, #06090f 100%)" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl blur-lg opacity-50" style={{ background: "linear-gradient(135deg, #1e40af, #3b82f6)" }} />
            <div
              className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-blue-500/25"
              style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)" }}
            >
              <Shield className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1
              className="text-base font-black leading-none"
              data-testid="dashboard-title"
              style={{ background: "linear-gradient(90deg, #f0f9ff 0%, #93c5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              GUARDIAN
            </h1>
            <p className="text-[9px] text-slate-500 tracking-[0.14em] uppercase mt-0.5">Emergency Response Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* System status pill */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-800/80 bg-slate-900/50">
            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-medium pr-2 border-r border-slate-800">Systems</span>
            {[
              { key: "risk_analysis", label: "Risk" },
              { key: "camera_processing", label: "Camera" },
              { key: "contact_management", label: "Contacts" },
            ].map((mod) => (
              <div key={mod.key} className="flex items-center gap-1" data-testid={`health-${mod.key}`}>
                {getHealthIcon(mod.key)}
                <span className="text-[10px] text-slate-500">{mod.label}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-700/60 bg-red-950/50 animate-pulse-status" data-testid="critical-badge">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] font-semibold text-red-300">{criticalCount} CRITICAL</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700/60 bg-slate-800/60" data-testid="active-count-badge">
              <Activity className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] text-slate-400">{activeIncidents.length} Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-800/50 bg-amber-950/30">
              <Flag className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] text-amber-400">{flaggedIncidents.length} Flagged</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: camera row (auto) · map+feed row (1fr, fills all remaining space) */}
      <main className="flex-1 grid grid-rows-[auto_1fr] gap-3 p-3 overflow-y-auto overflow-x-hidden min-h-0">
        {/* Row 1: Camera Feeds */}
        <section>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="h-4 w-[3px] rounded-full bg-sky-500" />
            <Camera className="h-3.5 w-3.5 text-sky-400" />
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Camera Feeds</h2>
            <span className="text-[10px] text-slate-600">{cameraFeeds.filter((f) => f.isActive).length} active</span>
            <MaxBtn panel="cameras" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {displayFeeds.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="bg-slate-900/80 border-slate-700/50 overflow-hidden">
                    <div className="aspect-video bg-slate-950 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-slate-700 animate-spin" />
                    </div>
                    <div className="p-3">
                      <div className="h-3 w-20 bg-slate-800 rounded animate-pulse" />
                    </div>
                  </Card>
                ))
              : displayFeeds.map((feed) => (
                  <CameraFeedCard
                    key={feed.id}
                    feed={feed}
                    onVideoUploaded={() => queryClient.invalidateQueries({ queryKey: ["/api/modules/camera-processing/feeds"] })}
                    onIncidentCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/incidents"] })}
                  />
                ))}
          </div>
        </section>

        {/* Row 2: Left col = map stacked above contact directory · Right col = incident feed full height */}
        <section className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3 min-h-0">

          {/* Left: map (fills space) + contact directory (collapsed by default) */}
          <div className="flex flex-col gap-3 min-h-0">
            <Card className="bg-slate-900/40 border-slate-800/70 overflow-hidden flex flex-col flex-1 min-h-0">
              <CardHeader className="py-2 px-3 shrink-0 border-b border-slate-800/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <div className="h-3 w-[3px] rounded-full bg-indigo-500" />
                    <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                    Incident Map
                  </CardTitle>
                  <MaxBtn panel="map" />
                </div>
              </CardHeader>
              <CardContent className="p-2 flex-1 min-h-0">
                <IncidentMap incidents={incidents} />
              </CardContent>
            </Card>

            {/* Contact Directory — header only; expand opens full-screen overlay */}
            <Card className="bg-slate-900/40 border-slate-800/70 overflow-hidden shrink-0">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <div className="h-3 w-[3px] rounded-full bg-violet-500" />
                    <Users className="h-3.5 w-3.5 text-violet-400" />
                    Contact Directory
                    <span className="text-[10px] text-slate-600 font-normal normal-case tracking-normal">({contacts.length})</span>
                  </CardTitle>
                  <button
                    onClick={() => setContactsExpanded(true)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                  >
                    <Maximize2 className="h-3 w-3" />
                    View
                  </button>
                </div>
              </CardHeader>
            </Card>

            {/* Contacts full-screen overlay */}
            {contactsExpanded && (
              <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "linear-gradient(160deg, #04070e 0%, #080d1b 100%)" }}>
                <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-white/[0.05]" style={{ background: "linear-gradient(135deg, #06090f 0%, #0c1525 100%)" }}>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <div className="h-3 w-[3px] rounded-full bg-violet-500" />
                    <Users className="h-3.5 w-3.5 text-violet-400" /> Contact Directory
                  </span>
                  <button
                    onClick={() => setContactsExpanded(false)}
                    className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                    Close
                  </button>
                </div>
                <div className="flex-1 min-h-0 p-3 overflow-auto">
                  <ContactsTable
                    contacts={contacts}
                    onAdd={createContact}
                    onEdit={editContact}
                    onDelete={deleteContact}
                    onToggle={toggleContact}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: live feed + flagged users review queue */}
          <div className="flex flex-col gap-3 min-h-0">
            <Card className="bg-slate-900/40 border-slate-800/70 overflow-hidden flex flex-col min-h-[20rem] lg:min-h-0 lg:flex-1">
              <CardHeader className="py-2 px-3 shrink-0 border-b border-slate-800/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <div className="h-3 w-[3px] rounded-full bg-red-500" />
                    <Activity className="h-3.5 w-3.5 text-red-400" />
                    Live Incident Feed
                    {liveIncidents.length > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse-status" />
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {liveIncidents.length > 0 && (
                      <button
                        onClick={clearAllIncidents}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                        data-testid="clear-incidents-btn"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear all
                      </button>
                    )}
                    <MaxBtn panel="incidents" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 flex-1 min-h-0">
                <LiveIncidentFeed incidents={liveIncidents} onFlag={flagIncident} />
              </CardContent>
            </Card>

            <Card className="bg-amber-950/10 border-amber-800/30 overflow-hidden flex flex-col min-h-[13rem] lg:max-h-[34vh]" data-testid="flagged-users-section">
              <CardHeader className="py-2 px-3 shrink-0 border-b border-amber-900/25">
                <CardTitle className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="h-3 w-[3px] rounded-full bg-amber-500" />
                  <Flag className="h-3.5 w-3.5 text-amber-500" />
                  Flagged for Review
                  <span className="text-amber-700/80 font-normal normal-case tracking-normal">
                    ({flaggedIncidents.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <div className="p-2 flex-1 min-h-0 overflow-y-auto">
                <FlaggedCallsQueue
                  incidents={flaggedIncidents}
                  onAllow={allowFlaggedCall}
                  onDiscard={discardFlaggedCall}
                />
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
