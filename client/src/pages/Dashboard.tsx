import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// @ts-ignore – no type declarations bundled with react-simple-maps
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Phone,
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
  Terminal,
  Trash2,
  Edit,
  PhoneCall,
  Radio,
  Zap,
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
  metadata?: { location?: string;[key: string]: unknown };
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

type Robocall = {
  id: number;
  incidentId?: number;
  contactId: number;
  status: string;
  message: string;
  attempts: number;
  createdAt: string;
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-blue-500 text-white",
};

const MODULE_STATUS_CONFIG: Record<string, { color: string; pulse: boolean }> = {
  running: { color: "bg-green-500", pulse: true },
  processing: { color: "bg-blue-500", pulse: true },
  idle: { color: "bg-muted", pulse: false },
  error: { color: "bg-destructive", pulse: false },
  offline: { color: "bg-muted", pulse: false },
};

const STATUS_BADGE: Record<string, { color: string; pulse: boolean }> = {
  idle: { color: "bg-muted", pulse: false },
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
  fire: { icon: <Flame className="h-8 w-8 text-red-400 animate-pulse mb-1" />, label: "Fire" },
  flood: { icon: <Droplets className="h-8 w-8 text-blue-400 animate-pulse mb-1" />, label: "Flood" },
  crash: { icon: <Car className="h-8 w-8 text-orange-400 animate-pulse mb-1" />, label: "Vehicle Crash" },
  fight: { icon: <Swords className="h-8 w-8 text-red-400 animate-pulse mb-1" />, label: "Fight / Assault" },
  weapon: { icon: <CircleAlert className="h-8 w-8 text-red-500 animate-pulse mb-1" />, label: "Weapon" },
  hazmat: { icon: <FlaskConical className="h-8 w-8 text-yellow-400 animate-pulse mb-1" />, label: "Hazmat" },
  structural: { icon: <Building2 className="h-8 w-8 text-orange-400 animate-pulse mb-1" />, label: "Structural Damage" },
  medical: { icon: <HeartPulse className="h-8 w-8 text-pink-400 animate-pulse mb-1" />, label: "Medical Emergency" },
  environmental: { icon: <Leaf className="h-8 w-8 text-green-400 animate-pulse mb-1" />, label: "Environmental Hazard" },
  anomaly: { icon: <CircleAlert className="h-8 w-8 text-yellow-400 animate-pulse mb-1" />, label: "Anomaly" },
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
  const { toast } = useToast();

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: async (response) => {
      try {
        await apiRequest("PATCH", `/api/modules/camera-processing/feeds/${feed.id}/video`, { videoUrl: response.objectPath });
        onVideoUploaded();
        toast({ title: "Video Uploaded", description: `${feed.name} feed updated.` });
        // Show location input after successful upload
        setShowLocationInput(true);
        setTimeout(() => locationInputRef.current?.focus(), 100);
      } catch {
        toast({ title: "Error", description: "Failed to save video reference.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Upload Failed", description: "Could not upload video file.", variant: "destructive" });
    },
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid File", description: "Please upload an MP4 video file.", variant: "destructive" });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalVideoUrl(objectUrl);
    uploadFile(file);
  }, [uploadFile, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleSaveLocation = async () => {
    if (!locationValue || !VALID_LOCATIONS.includes(locationValue)) {
      toast({ title: "Invalid Location", description: "Please select a valid US city.", variant: "destructive" });
      return;
    }
    setIsSavingLocation(true);
    try {
      await apiRequest("PATCH", `/api/modules/camera-processing/feeds/${feed.id}/location`, { location: locationValue });
      onVideoUploaded();
      setShowLocationInput(false);
      setLocationValue("");
      toast({ title: "Location Saved", description: `Location set to "${locationValue}".` });
    } catch {
      toast({ title: "Error", description: "Failed to save location.", variant: "destructive" });
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
          toast({
            title: "⚠️ Hazard Detected",
            description: `${meta?.description || "Threat identified"} at ${feed.location}`,
            variant: "destructive",
          });
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
    <Card className="saas-card saas-card-hover group relative overflow-hidden" data-testid={`camera-card-${feed.id}`}>
      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative aspect-video bg-background overflow-hidden">
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
            className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${isDragOver
              ? "bg-primary/20 border-2 border-dashed border-primary"
              : "bg-background hover:bg-background/80"
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
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Drop MP4 or click</span>
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
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-black/60 px-1.5 py-0.5 rounded">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
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

      <div className="p-4 bg-white flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold text-card-foreground truncate font-heading" data-testid={`camera-name-${feed.id}`}>{feed.name}</h3>
            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 truncate mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              {feed.location}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors group/btn"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid={`upload-btn-${feed.id}`}
                  >
                    <Video className="h-4 w-4 text-muted-foreground group-hover/btn:text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Upload MP4</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {showLocationInput && (
          <div className="mt-3 flex flex-col gap-2" data-testid={`location-input-${feed.id}`}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                <select
                  ref={locationInputRef}
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-[11px] font-medium bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 appearance-none shadow-sm transition-colors"
                  data-testid={`location-select-${feed.id}`}
                >
                  <option value="">— Select a US city —</option>
                  {VALID_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSaveLocation}
                disabled={!locationValue || !VALID_LOCATIONS.includes(locationValue) || isSavingLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-md bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground transition-colors shadow-sm"
                data-testid={`save-location-${feed.id}`}
              >
                {isSavingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
              <button
                onClick={() => { setShowLocationInput(false); setLocationValue(""); }}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

const SEVERITY_PIN_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

// GeoJSON for US states (Natural Earth via public CDN)
const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

function IncidentMap({ incidents }: { incidents: Incident[] }) {
  const activeIncidents = incidents.filter((i) => i.status === "active");

  // Build pins — only for incidents whose location has known coordinates
  const pins = activeIncidents
    .map((inc) => {
      const coords = inc.location ? CITY_COORDS[inc.location] : undefined;
      return coords ? { incident: inc, coords } : null;
    })
    .filter(Boolean) as Array<{ incident: Incident; coords: [number, number] }>;

  return (
    <div className="relative w-full h-full bg-secondary/30 rounded-lg overflow-hidden" data-testid="incident-map">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#E8E6E1"
                stroke="#FFFFFF"
                strokeWidth={1}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none", fill: "#D4D2CD" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {pins.map(({ incident, coords }) => {
          const color = SEVERITY_PIN_COLORS[incident.severity] || "#64748b";
          return (
            <Marker key={incident.id} coordinates={coords}>
              {/* Pulsing halo */}
              <circle r={10} fill={color} opacity={0.15}>
                <animate attributeName="r" values="8;13;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Solid dot */}
              <circle r={5} fill={color} stroke="white" strokeWidth={1.5} />
              {/* Label */}
              <text
                textAnchor="middle"
                y={-12}
                style={{ fontSize: "9px", fontWeight: "900", fill: "#1A2B4A", pointerEvents: "none", filter: "drop-shadow(0px 1px 2px rgba(255,255,255,0.8))" }}
              >
                {incident.title.length > 18 ? incident.title.slice(0, 18) + "…" : incident.title}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-white/90 border border-border shadow-sm backdrop-blur-sm rounded-lg px-3 py-2">
        {["critical", "high", "medium", "low"].map((sev) => (
          <div key={sev} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_PIN_COLORS[sev] }} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{sev}</span>
          </div>
        ))}
      </div>

      <div className="absolute top-3 left-3 text-[10px] font-bold tracking-wider text-primary bg-primary/10 border border-primary/20 shadow-sm px-2.5 py-1 rounded-md uppercase backdrop-blur-sm">
        {activeIncidents.length} active incident{activeIncidents.length !== 1 ? "s" : ""}
      </div>
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
  onAlert,
  onAnalyze,
}: {
  incidents: Incident[];
  onAlert: (id: number) => void;
  onAnalyze: (id: number) => void;
}) {
  const rankBadgeClasses = (severity: string) => {
    if (severity === "critical") return "border-red-200 bg-red-50 text-red-700";
    if (severity === "high") return "border-orange-200 bg-orange-50 text-orange-700";
    if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-border bg-secondary text-muted-foreground";
  };

  const cardBorderClasses = (rank: number, severity: string) => {
    if (rank === 1) return "border-red-300 bg-white shadow-[0_4px_20px_-4px_rgba(239,68,68,0.15)] ring-1 ring-red-100";
    if (rank === 2) return "border-orange-200 bg-white";
    if (rank === 3) return "border-amber-200 bg-white";
    if (severity === "critical") return "border-red-200";
    if (severity === "high") return "border-orange-200";
    return "border-border/60";
  };

  return (
    <ScrollArea className="h-full" data-testid="incident-feed">
      <div className="space-y-3 pr-4">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No active incidents</p>
          </div>
        ) : (
          <>
            {/* Incident cards */}
            {incidents.map((incident) => {
              const meta = parseIncidentMeta(incident.description);
              return (
                <div
                  key={incident.id}
                  className={`p-4 bg-white rounded-xl shadow-xs border transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:border-border/80 ${cardBorderClasses(incident.riskRank ?? 999, incident.severity)}`}
                  data-testid={`incident-card-${incident.id}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Rank block */}
                    <div className={`shrink-0 min-w-[56px] rounded-lg border px-2 py-1.5 text-center flex flex-col items-center justify-center ${rankBadgeClasses(incident.severity)}`}>
                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Rank</p>
                      <p className="text-xl font-black leading-none font-heading">#{incident.riskRank}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border-none ${SEVERITY_COLORS[incident.severity]}`}>
                          {incident.severity}
                        </Badge>
                        {incident.status === "active" && (
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse-status shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                        )}
                      </div>
                      <h4 className="text-[14px] font-bold text-foreground truncate font-heading leading-tight">{incident.title}</h4>
                      <p className="text-[12px] font-medium text-muted-foreground line-clamp-2 mt-1 leading-relaxed pr-2">{incident.description}</p>

                      {/* First-responder indicator badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {meta.humanLife && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 shadow-sm">
                            <User className="h-2.5 w-2.5" />
                            Human life
                          </span>
                        )}
                        {meta.noHumanLife && !meta.humanLife && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border shadow-sm">
                            <User className="h-2.5 w-2.5" />
                            No humans
                          </span>
                        )}
                        {meta.animals && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                            <PawPrint className="h-2.5 w-2.5" />
                            Animals
                          </span>
                        )}
                        {meta.objects && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/20 shadow-sm">
                            <Box className="h-2.5 w-2.5" />
                            {meta.objects.length > 30 ? meta.objects.slice(0, 30) + "…" : meta.objects}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-border/50">
                        {incident.location && (
                          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {incident.location}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(incident.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0 pl-2">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-[11px] font-bold tracking-wide uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                        onClick={() => onAlert(incident.id)}
                        data-testid={`alert-btn-${incident.id}`}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Alert
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-[11px] font-bold tracking-wide uppercase border-border/80 text-muted-foreground hover:bg-secondary hover:text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                        onClick={() => onAnalyze(incident.id)}
                        data-testid={`analyze-btn-${incident.id}`}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Analyze
                      </Button>
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
    <div className="h-full flex flex-col px-1" data-testid="contacts-table">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{contacts.length} contacts</span>
        <Button
          size="sm"
          className="h-8 px-3 text-[11px] font-bold uppercase tracking-wide shadow-sm"
          onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: "", phone: "", email: "", roleSelect: "ems", roleCustom: "", location: "", priority: 1 }); }}
          data-testid="add-contact-btn"
        >
          <UserPlus className="h-3 w-3 mr-1.5" />
          Add Contact
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 bg-secondary/30 rounded-xl border border-border/80 space-y-3 shadow-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 text-xs bg-white border-border shadow-sm focus-visible:ring-primary"
              data-testid="contact-name-input"
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-9 text-xs bg-white border-border shadow-sm focus-visible:ring-primary"
              data-testid="contact-phone-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.roleSelect} onValueChange={(v) => setForm({ ...form, roleSelect: v, roleCustom: "" })}>
              <SelectTrigger className="h-9 text-xs bg-white border-border shadow-sm focus:ring-primary" data-testid="contact-role-select">
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
              className="h-9 text-xs bg-white border-border shadow-sm focus-visible:ring-primary"
              data-testid="contact-email-input"
            />
          </div>
          {form.roleSelect === "custom" && (
            <Input
              placeholder="Enter custom role…"
              value={form.roleCustom}
              onChange={(e) => setForm({ ...form, roleCustom: e.target.value })}
              className="h-9 text-xs bg-white border-border shadow-sm focus-visible:ring-primary"
              data-testid="contact-role-custom-input"
            />
          )}
          <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
            <SelectTrigger className="h-9 text-xs bg-white border-border shadow-sm focus:ring-primary" data-testid="contact-location-select">
              <SelectValue placeholder="Select location…" />
            </SelectTrigger>
            <SelectContent>
              {VALID_LOCATIONS.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="outline" className="h-8 px-4 text-xs font-bold border-border shadow-sm text-muted-foreground hover:text-foreground" onClick={resetForm}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 px-4 text-xs font-bold shadow-sm" onClick={handleSave} data-testid="save-contact-btn">
              <Save className="h-3 w-3 mr-1.5" />
              {editingId ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4 pb-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${contact.isActive
                ? "bg-white border-border hover:border-border/80 hover:shadow-sm"
                : "bg-secondary/30 border-border/50 opacity-60 grayscale-[50%]"
                }`}
              data-testid={`contact-row-${contact.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-bold text-foreground truncate font-heading">{contact.name}</span>
                  <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0 border-none ${ROLE_COLORS[contact.role] || "bg-secondary text-muted-foreground"}`}>
                    {contact.role.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </span>
                  {contact.metadata?.location && (
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {contact.metadata.location}
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">P{contact.priority}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={contact.isActive}
                  onCheckedChange={() => onToggle(contact.id)}
                  className="scale-90 data-[state=checked]:bg-primary mr-1"
                  data-testid={`toggle-contact-${contact.id}`}
                />
                <button
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => startEdit(contact)}
                  data-testid={`edit-contact-${contact.id}`}
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  onClick={() => onDelete(contact.id)}
                  data-testid={`delete-contact-${contact.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function RobocallerConsole({ robocalls, incidents }: { robocalls: Robocall[]; incidents: Incident[] }) {
  const consoleRef = useRef<HTMLDivElement>(null);
  const [commandInput, setCommandInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [robocalls]);

  const handleCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    setCommandInput("");

    const parts = cmd.trim().split(" ");
    const action = parts[0]?.toLowerCase();

    if (action === "alert" && parts[1]) {
      try {
        const incidentId = parseInt(parts[1]);
        await apiRequest("POST", `/api/modules/robocaller/incident/${incidentId}`, {});
        queryClient.invalidateQueries({ queryKey: ["/api/modules/robocaller"] });
        toast({ title: "Robocalls Initiated", description: `Alert sent for incident #${incidentId}` });
      } catch {
        toast({ title: "Error", description: "Failed to initiate alert.", variant: "destructive" });
      }
    } else if (action === "status") {
      toast({ title: "System Status", description: `${robocalls.length} calls logged. ${robocalls.filter((r) => r.status === "completed").length} completed.` });
    } else if (action === "help") {
      toast({
        title: "Available Commands",
        description: "alert <incident_id> | status | clear | help",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "calling": return <PhoneCall className="h-3 w-3 text-blue-400 animate-pulse" />;
      case "failed": return <XCircle className="h-3 w-3 text-red-500" />;
      default: return <Clock className="h-3 w-3 text-yellow-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0F0F0F] rounded-xl border border-border/80 overflow-hidden shadow-inner" data-testid="robocaller-console">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <Terminal className="h-3.5 w-3.5 text-green-500" />
        <span className="text-[11px] font-mono font-bold text-green-500">robocaller@emergency</span>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground font-medium">{robocalls.length} calls</span>
      </div>

      <div ref={consoleRef} className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1">
        <div className="text-green-500/60">{'>'} Robocaller console ready. Type "help" for commands.</div>
        <div className="text-muted-foreground">{'>'} Connected to emergency notification system.</div>

        {robocalls.slice(-20).map((call) => (
          <div key={call.id} className="flex items-start gap-1.5">
            {getStatusIcon(call.status)}
            <span className="text-muted-foreground">[{new Date(call.createdAt).toLocaleTimeString()}]</span>
            <span className={
              call.status === "completed" ? "text-green-400" :
                call.status === "failed" ? "text-red-400" :
                  call.status === "calling" ? "text-blue-400" :
                    "text-yellow-400"
            }>
              {call.status.toUpperCase()}
            </span>
            <span className="text-muted-foreground truncate">
              Contact#{call.contactId} - {call.message.slice(0, 40)}{call.message.length > 40 ? "..." : ""}
            </span>
          </div>
        ))}

        {robocalls.length === 0 && (
          <div className="text-muted-foreground">{'>'} No call activity yet. Use "alert {'<incident_id>'}" to start.</div>
        )}
      </div>

      <div className="flex items-center border-t border-[#2A2A2A] bg-[#141414]">
        <span className="text-green-500 text-xs pl-3 font-mono font-bold">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCommand(commandInput); }}
          placeholder="Type command..."
          className="flex-1 bg-transparent text-xs font-mono text-gray-300 px-3 py-2.5 focus:outline-none placeholder:text-gray-600"
          data-testid="console-input"
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
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
      } catch { }
    };

    websocket.onerror = () => { };
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
      } catch { }
    };
    seed();
  }, [cameraFeedsFetched]);

  const { data: robocalls = [] } = useQuery<Robocall[]>({
    queryKey: ["/api/modules/robocaller"],
  });

  const initiateRobocalls = useCallback(
    async (incidentId: number) => {
      try {
        await apiRequest("POST", `/api/modules/robocaller/incident/${incidentId}`, {});
        queryClient.invalidateQueries({ queryKey: ["/api/modules/robocaller"] });
        toast({ title: "Alerts Sent", description: `Robocalls initiated for incident #${incidentId}` });
      } catch {
        toast({ title: "Error", description: "Failed to initiate alerts.", variant: "destructive" });
      }
    },
    [toast]
  );

  const analyzeRisk = useCallback(
    async (incidentId: number) => {
      try {
        await apiRequest("POST", `/api/modules/risk-analysis/analyze/${incidentId}`);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/risk-analysis"] });
        toast({ title: "Analysis Queued", description: "AI risk assessment in progress." });
      } catch {
        toast({ title: "Error", description: "Failed to analyze risk.", variant: "destructive" });
      }
    },
    [toast]
  );

  const createContact = useCallback(
    async (data: Partial<Contact>) => {
      try {
        await apiRequest("POST", "/api/modules/contact-management", data);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
        toast({ title: "Contact Added", description: `${data.name} added to directory.` });
      } catch {
        toast({ title: "Error", description: "Failed to add contact.", variant: "destructive" });
      }
    },
    [toast]
  );

  const editContact = useCallback(
    async (id: number, data: Partial<Contact>) => {
      try {
        await apiRequest("PATCH", `/api/modules/contact-management/${id}`, data);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
        toast({ title: "Contact Updated", description: `${data.name} has been updated.` });
      } catch {
        toast({ title: "Error", description: "Failed to update contact.", variant: "destructive" });
      }
    },
    [toast]
  );

  const deleteContact = useCallback(
    async (id: number) => {
      try {
        await apiRequest("DELETE", `/api/modules/contact-management/${id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
        toast({ title: "Contact Removed" });
      } catch {
        toast({ title: "Error", description: "Failed to delete contact.", variant: "destructive" });
      }
    },
    [toast]
  );

  const toggleContact = useCallback(
    async (id: number) => {
      try {
        await apiRequest("PATCH", `/api/modules/contact-management/${id}/toggle`);
        queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
      } catch { }
    },
    []
  );

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
      toast({ title: "Incidents Cleared", description: `${active.length} incident${active.length !== 1 ? "s" : ""} resolved.` });
    } catch {
      toast({ title: "Error", description: "Failed to clear incidents.", variant: "destructive" });
    }
  }, [incidents, toast]);

  const activeIncidents = useMemo(
    () => rankIncidentsByRisk(incidents.filter((i) => i.status === "active"), riskAssessments),
    [incidents, riskAssessments],
  );
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
    if (!m) return <Activity className="h-3 w-3 text-muted-foreground" />;
    if (m.status === "healthy") return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (m.status === "degraded") return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    return <XCircle className="h-3 w-3 text-red-500" />;
  };

  // Helper: maximize button for card headers
  const MaxBtn = ({ panel }: { panel: string }) => (
    <button
      onClick={() => setMaximizedPanel(panel)}
      className="ml-1 p-0.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      title="Maximize"
      data-testid={`maximize-${panel}`}
    >
      <Maximize2 className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Maximized Panel Overlay */}
      <AnimatePresence>
        {maximizedPanel && (
          <motion.div
            layoutId={maximizedPanel}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-between px-6 py-5 bg-white border-b border-border shadow-xs">
              <span className="text-2xl lg:text-3xl font-black text-card-foreground tracking-tight flex items-center gap-3 font-heading">
                {maximizedPanel === "map" && <><MapPin className="h-6 w-6 text-primary" /> Incident Map</>}
                {maximizedPanel === "incidents" && <><Activity className="h-6 w-6 text-destructive" /> Live Incident Feed</>}
                {maximizedPanel === "contacts" && <><Users className="h-6 w-6 text-primary" /> Contact Directory</>}
                {maximizedPanel === "robocaller" && <><Terminal className="h-6 w-6 text-green-500" /> Robocaller Console</>}
                {maximizedPanel === "cameras" && <><Camera className="h-6 w-6 text-muted-foreground" /> Camera Feeds</>}
              </span>
              <button
                onClick={() => setMaximizedPanel(null)}
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-secondary font-sans"
              >
                <Minimize2 className="h-4 w-4" />
                Minimize
              </button>
            </div>
            <div className="flex-1 min-h-0 p-3 overflow-hidden">
              {maximizedPanel === "map" && <IncidentMap incidents={incidents} />}
              {maximizedPanel === "incidents" && (
                <div className="h-full flex flex-col">
                  {activeIncidents.length > 0 && (
                    <div className="shrink-0 flex justify-end mb-2">
                      <button
                        onClick={clearAllIncidents}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear all
                      </button>
                    </div>
                  )}
                  <div className="flex-1 min-h-0">
                    <LiveIncidentFeed incidents={activeIncidents} onAlert={initiateRobocalls} onAnalyze={analyzeRisk} />
                  </div>
                </div>
              )}
              {maximizedPanel === "contacts" && (
                <ContactsTable
                  contacts={contacts}
                  onAdd={createContact}
                  onEdit={editContact}
                  onDelete={deleteContact}
                  onToggle={toggleContact}
                />
              )}
              {maximizedPanel === "robocaller" && <RobocallerConsole robocalls={robocalls} incidents={incidents} />}
              {maximizedPanel === "cameras" && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 h-full">
                  {displayFeeds.map((feed) => (
                    <CameraFeedCard
                      key={feed.id}
                      feed={feed}
                      onVideoUploaded={() => queryClient.invalidateQueries({ queryKey: ["/api/modules/camera-processing/feeds"] })}
                      onIncidentCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/incidents"] })}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-border shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tighter text-primary font-heading uppercase" data-testid="dashboard-title">INCIDENT RESPONSE CENTER</h1>
            <p className="text-xs font-light tracking-widest text-muted-foreground font-sans uppercase">Real-time monitoring & coordination</p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Module health indicators */}
          <div className="hidden lg:flex items-center gap-4 border-r border-border pr-5">
            {[
              { key: "robocaller", label: "Robocaller" },
              { key: "risk_analysis", label: "Risk" },
              { key: "camera_processing", label: "Camera" },
              { key: "contact_management", label: "Contacts" },
            ].map((mod) => (
              <div key={mod.key} className="flex items-center gap-1.5" data-testid={`health-${mod.key}`}>
                {getHealthIcon(mod.key)}
                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-80">{mod.label}</span>
              </div>
            ))}
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-xs px-3 py-1 animate-pulse-status rounded-full shadow-sm font-black tracking-widest border-none font-sans uppercase" data-testid="critical-badge">
                {criticalCount} CRITICAL
              </Badge>
            )}
            <Badge variant="outline" className="text-xs px-3 py-1 border-border bg-secondary text-muted-foreground font-bold tracking-widest rounded-full font-sans uppercase" data-testid="active-count-badge">
              {activeIncidents.length} Active
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-rows-[auto_1fr_1fr] gap-4 p-4 lg:p-6 lg:gap-6 overflow-hidden min-h-0 bg-background">
        {/* Row 1: Camera Feeds */}
        <section className="staggered-fade-in delay-100">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="saas-section-label mb-0">Camera Feeds</h2>
            <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md ml-1">{cameraFeeds.filter((f) => f.isActive).length} active</span>
            <MaxBtn panel="cameras" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {displayFeeds.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="saas-card bg-white border border-border/50 overflow-hidden">
                  <div className="aspect-video bg-secondary/30 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-muted-foreground/30 animate-spin" />
                  </div>
                  <div className="p-4 bg-white">
                    <div className="h-3 w-20 bg-secondary rounded animate-pulse" />
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

        {/* Row 2: Map + Incident Feed */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 lg:gap-6 min-h-0 staggered-fade-in delay-200">
          <motion.div layoutId="map" className="h-full">
            <Card className="saas-card flex flex-col h-full bg-card overflow-hidden">
              <CardHeader className="py-3 px-4 shrink-0 border-b border-border/50 bg-white/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl lg:text-2xl font-black text-card-foreground tracking-tight flex items-center gap-3 font-heading">
                    <MapPin className="h-5 w-5 text-primary" />
                    Incident Map
                  </CardTitle>
                  <MaxBtn panel="map" />
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-48px)] flex-1">
                <IncidentMap incidents={incidents} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div layoutId="incidents" className="h-full">
            <Card className="saas-card flex flex-col h-full bg-card overflow-hidden">
              <CardHeader className="py-3 px-4 shrink-0 border-b border-border/50 bg-white/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl lg:text-2xl font-black text-card-foreground tracking-tight flex items-center gap-3 font-heading">
                    <Activity className="h-5 w-5 text-destructive" />
                    Live Incident Feed
                    {activeIncidents.length > 0 && (
                      <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse-status" />
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {activeIncidents.length > 0 && (
                      <button
                        onClick={clearAllIncidents}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-secondary/50"
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
              <CardContent className="p-3 flex-1 min-h-0 bg-secondary/20">
                <LiveIncidentFeed
                  incidents={activeIncidents}
                  onAlert={initiateRobocalls}
                  onAnalyze={analyzeRisk}
                />
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Row 3: Contacts + Robocaller Console */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-h-0 staggered-fade-in delay-300">
          <motion.div layoutId="contacts" className="h-full">
            <Card className="saas-card flex flex-col h-full bg-card overflow-hidden">
              <CardHeader className="py-3 px-4 shrink-0 border-b border-border/50 bg-white/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl lg:text-2xl font-black text-card-foreground tracking-tight flex items-center gap-3 font-heading">
                    <Users className="h-5 w-5 text-primary" />
                    Contact Directory
                  </CardTitle>
                  <MaxBtn panel="contacts" />
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <ContactsTable
                  contacts={contacts}
                  onAdd={createContact}
                  onEdit={editContact}
                  onDelete={deleteContact}
                  onToggle={toggleContact}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div layoutId="robocaller" className="h-full">
            <Card className="saas-card flex flex-col h-full bg-card overflow-hidden">
              <CardHeader className="py-3 px-4 shrink-0 border-b border-border/50 bg-white/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl lg:text-2xl font-black text-card-foreground tracking-tight flex items-center gap-3 font-heading">
                    <Terminal className="h-5 w-5 text-green-500" />
                    Robocaller Console
                  </CardTitle>
                  <MaxBtn panel="robocaller" />
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 min-h-0 bg-secondary/10">
                <RobocallerConsole robocalls={robocalls} incidents={incidents} />
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </main>
    </div >
  );
}
