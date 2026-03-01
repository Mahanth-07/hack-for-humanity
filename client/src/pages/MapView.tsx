import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Camera,
  AlertTriangle,
  X,
  MapPin,
  Activity,
  Shield,
} from "lucide-react";
import { US_STATES, projectToSvg, getStateForCoordinates } from "@/data/us-states";

type CameraFeed = {
  id: number;
  name: string;
  location: string;
  coordinates: { lat: number; lng: number } | null;
  status: string;
  isActive: boolean;
  metadata: any;
};

type Incident = {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  location: string | null;
  coordinates: { lat: number; lng: number } | null;
  createdAt: string;
};

const SVG_WIDTH = 960;
const SVG_HEIGHT = 600;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-600 text-white",
    high: "bg-orange-600 text-white",
    medium: "bg-yellow-600 text-black",
    low: "bg-green-600 text-white",
  };
  return (
    <Badge className={`text-[10px] px-1.5 py-0 ${colors[severity] || "bg-slate-600 text-white"}`} data-testid={`severity-badge-${severity}`}>
      {severity}
    </Badge>
  );
}

function StateDetailPanel({
  stateId,
  stateName,
  cameras,
  incidents,
  onClose,
}: {
  stateId: string;
  stateName: string;
  cameras: CameraFeed[];
  incidents: Incident[];
  onClose: () => void;
}) {
  const statePath = US_STATES.find((s) => s.id === stateId)?.path || "";

  const stateCameras = cameras.filter((c) => {
    if (!c.coordinates) return false;
    return getStateForCoordinates(c.coordinates.lat, c.coordinates.lng) === stateId;
  });

  const stateIncidents = incidents.filter((i) => {
    if (!i.coordinates) return false;
    return getStateForCoordinates(i.coordinates.lat, i.coordinates.lng) === stateId;
  });

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      data-testid="state-detail-overlay"
      enable-xr
    >
      <div
        className="relative w-[90%] max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden xr-elevated"
        onClick={(e) => e.stopPropagation()}
        style={{
          // @ts-ignore
          "--xr-back": "80",
          "--xr-background-material": "thick",
        }}
        enable-xr
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold text-white" data-testid="state-detail-title">{stateName}</h2>
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
              {stateCameras.length} cameras
            </Badge>
            <Badge variant="outline" className="text-[10px] border-red-800 text-red-400">
              {stateIncidents.length} incidents
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            data-testid="close-state-detail"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-0 h-[500px]">
          <div className="border-r border-slate-700 p-4 flex items-center justify-center">
            <svg viewBox="100 50 800 500" className="w-full h-full" style={{ maxHeight: "460px" }}>
              <path
                d={statePath}
                fill="rgba(30, 41, 59, 0.8)"
                stroke="rgba(100, 116, 139, 0.6)"
                strokeWidth="2"
                className="drop-shadow-lg"
              />
              {stateCameras.map((cam) => {
                if (!cam.coordinates) return null;
                const pos = projectToSvg(cam.coordinates.lat, cam.coordinates.lng, SVG_WIDTH, SVG_HEIGHT);
                return (
                  <g key={`cam-detail-${cam.id}`}>
                    <circle cx={pos.x} cy={pos.y} r="8" fill="rgba(100, 116, 139, 0.3)" stroke="none" />
                    <circle cx={pos.x} cy={pos.y} r="5" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
                    <text x={pos.x + 10} y={pos.y + 4} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      {cam.name.length > 20 ? cam.name.slice(0, 20) + "..." : cam.name}
                    </text>
                  </g>
                );
              })}
              {stateIncidents.map((inc) => {
                if (!inc.coordinates) return null;
                const pos = projectToSvg(inc.coordinates.lat, inc.coordinates.lng, SVG_WIDTH, SVG_HEIGHT);
                const color = SEVERITY_COLORS[inc.severity] || "#ef4444";
                return (
                  <g key={`inc-detail-${inc.id}`}>
                    <circle cx={pos.x} cy={pos.y} r="12" fill={`${color}20`} stroke="none">
                      <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={pos.x} cy={pos.y} r="5" fill={color} stroke="white" strokeWidth="1.5" />
                    <text x={pos.x + 10} y={pos.y + 4} fill={color} fontSize="9" fontWeight="bold" fontFamily="monospace">
                      {inc.title.length > 25 ? inc.title.slice(0, 25) + "..." : inc.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <ScrollArea className="p-4">
            {stateIncidents.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Active Incidents
                </h3>
                <div className="space-y-2">
                  {stateIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50"
                      data-testid={`state-incident-${inc.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-white">{inc.title}</span>
                        <SeverityBadge severity={inc.severity} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{inc.description}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{inc.location}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera className="h-3 w-3" />
              Camera Feeds
            </h3>
            <div className="space-y-2">
              {stateCameras.length === 0 && (
                <p className="text-[10px] text-slate-500">No cameras in this state</p>
              )}
              {stateCameras.map((cam) => (
                <div
                  key={cam.id}
                  className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/30"
                  data-testid={`state-camera-${cam.id}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${cam.isActive ? "bg-emerald-500" : "bg-slate-600"}`} />
                    <span className="text-xs font-medium text-white">{cam.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 ml-4">{cam.location}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default function MapView() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredPin, setHoveredPin] = useState<{ type: string; id: number; x: number; y: number } | null>(null);

  const { data: cameras = [] } = useQuery<CameraFeed[]>({
    queryKey: ["/api/modules/camera-processing/feeds"],
    refetchInterval: 10000,
  });

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    refetchInterval: 5000,
  });

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status === "active" && i.coordinates),
    [incidents]
  );

  const activeCameras = useMemo(
    () => cameras.filter((c) => c.coordinates),
    [cameras]
  );

  const stateStats = useMemo(() => {
    const stats: Record<string, { cameras: number; incidents: number; maxSeverity: string }> = {};
    for (const cam of activeCameras) {
      if (!cam.coordinates) continue;
      const state = getStateForCoordinates(cam.coordinates.lat, cam.coordinates.lng);
      if (state) {
        if (!stats[state]) stats[state] = { cameras: 0, incidents: 0, maxSeverity: "none" };
        stats[state].cameras++;
      }
    }
    const severityOrder = ["none", "low", "medium", "high", "critical"];
    for (const inc of activeIncidents) {
      if (!inc.coordinates) continue;
      const state = getStateForCoordinates(inc.coordinates.lat, inc.coordinates.lng);
      if (state) {
        if (!stats[state]) stats[state] = { cameras: 0, incidents: 0, maxSeverity: "none" };
        stats[state].incidents++;
        if (severityOrder.indexOf(inc.severity) > severityOrder.indexOf(stats[state].maxSeverity)) {
          stats[state].maxSeverity = inc.severity;
        }
      }
    }
    return stats;
  }, [activeCameras, activeIncidents]);

  const getStateFill = useCallback(
    (stateId: string) => {
      const stat = stateStats[stateId];
      if (!stat) return "rgba(30, 41, 59, 0.6)";
      if (stat.incidents > 0) {
        const color = SEVERITY_COLORS[stat.maxSeverity] || "#ef4444";
        return `${color}30`;
      }
      if (stat.cameras > 0) return "rgba(71, 85, 105, 0.5)";
      return "rgba(30, 41, 59, 0.6)";
    },
    [stateStats]
  );

  const selectedStateName = useMemo(
    () => US_STATES.find((s) => s.id === selectedState)?.name || "",
    [selectedState]
  );

  const tooltipInfo = useMemo(() => {
    if (!hoveredPin) return null;
    if (hoveredPin.type === "camera") {
      const cam = cameras.find((c) => c.id === hoveredPin.id);
      return cam ? { title: cam.name, subtitle: cam.location, type: "camera" } : null;
    }
    const inc = incidents.find((i) => i.id === hoveredPin.id);
    return inc ? { title: inc.title, subtitle: inc.severity, type: "incident" } : null;
  }, [hoveredPin, cameras, incidents]);

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden" data-testid="map-view">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white h-8" data-testid="back-to-dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </Link>
          <div className="h-5 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-white tracking-wide">INCIDENT MAP</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <span className="text-[10px] text-slate-400">Camera ({activeCameras.length})</span>
            </div>
            <div className="flex items-center gap-1.5 ml-3">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-[10px] text-slate-400">Incident ({activeIncidents.length})</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {["critical", "high", "medium", "low"].map((s) => (
              <div key={s} className="flex items-center gap-1 ml-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[s] }} />
                <span className="text-[9px] text-slate-500 capitalize">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center p-4">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full max-w-[1200px]"
          style={{ filter: "drop-shadow(0 4px 30px rgba(0,0,0,0.5))" }}
          data-testid="us-map-svg"
        >
          <defs>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-gray">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {US_STATES.map((state) => (
            <g key={state.id}>
              <path
                d={state.path}
                fill={hoveredState === state.id ? "rgba(71, 85, 105, 0.8)" : getStateFill(state.id)}
                stroke={
                  stateStats[state.id]?.incidents
                    ? "rgba(239, 68, 68, 0.4)"
                    : "rgba(100, 116, 139, 0.3)"
                }
                strokeWidth={hoveredState === state.id ? "2" : "1"}
                className="cursor-pointer transition-all duration-200"
                onClick={() => setSelectedState(state.id)}
                onMouseEnter={() => setHoveredState(state.id)}
                onMouseLeave={() => setHoveredState(null)}
                data-testid={`state-${state.id}`}
              />
              <text
                x={state.labelX}
                y={state.labelY}
                fill="rgba(148, 163, 184, 0.5)"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="middle"
                pointerEvents="none"
              >
                {state.abbr}
              </text>
            </g>
          ))}

          {activeCameras.map((cam) => {
            if (!cam.coordinates) return null;
            const pos = projectToSvg(cam.coordinates.lat, cam.coordinates.lng, SVG_WIDTH, SVG_HEIGHT);
            return (
              <g
                key={`cam-${cam.id}`}
                onMouseEnter={() => setHoveredPin({ type: "camera", id: cam.id, x: pos.x, y: pos.y })}
                onMouseLeave={() => setHoveredPin(null)}
                className="cursor-pointer"
                data-testid={`map-camera-pin-${cam.id}`}
              >
                <circle cx={pos.x} cy={pos.y} r="6" fill="rgba(148, 163, 184, 0.15)" stroke="none" />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="3.5"
                  fill="#94a3b8"
                  stroke="#334155"
                  strokeWidth="1"
                  filter="url(#glow-gray)"
                />
              </g>
            );
          })}

          {activeIncidents.map((inc) => {
            if (!inc.coordinates) return null;
            const pos = projectToSvg(inc.coordinates.lat, inc.coordinates.lng, SVG_WIDTH, SVG_HEIGHT);
            const color = SEVERITY_COLORS[inc.severity] || "#ef4444";
            return (
              <g
                key={`inc-${inc.id}`}
                onMouseEnter={() => setHoveredPin({ type: "incident", id: inc.id, x: pos.x, y: pos.y })}
                onMouseLeave={() => setHoveredPin(null)}
                className="cursor-pointer"
                data-testid={`map-incident-pin-${inc.id}`}
              >
                <circle cx={pos.x} cy={pos.y} r="10" fill={`${color}15`} stroke="none">
                  <animate attributeName="r" values="6;12;6" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="4"
                  fill={color}
                  stroke="white"
                  strokeWidth="1.5"
                  filter="url(#glow-red)"
                />
              </g>
            );
          })}

          {tooltipInfo && hoveredPin && (
            <g pointerEvents="none">
              <rect
                x={hoveredPin.x + 12}
                y={hoveredPin.y - 28}
                width={Math.max(tooltipInfo.title.length * 6, 120)}
                height="36"
                rx="4"
                fill="rgba(15, 23, 42, 0.95)"
                stroke="rgba(100, 116, 139, 0.4)"
                strokeWidth="1"
              />
              <text
                x={hoveredPin.x + 18}
                y={hoveredPin.y - 13}
                fill="white"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {tooltipInfo.title.length > 30 ? tooltipInfo.title.slice(0, 30) + "..." : tooltipInfo.title}
              </text>
              <text
                x={hoveredPin.x + 18}
                y={hoveredPin.y + 1}
                fill={tooltipInfo.type === "incident" ? SEVERITY_COLORS[tooltipInfo.subtitle] || "#94a3b8" : "#94a3b8"}
                fontSize="9"
                fontFamily="monospace"
              >
                {tooltipInfo.type === "incident" ? `Severity: ${tooltipInfo.subtitle}` : tooltipInfo.subtitle}
              </text>
            </g>
          )}
        </svg>

        {hoveredState && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-2 backdrop-blur-sm pointer-events-none" data-testid="state-hover-info">
            <div className="flex items-center gap-3">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-sm font-medium text-white">
                {US_STATES.find((s) => s.id === hoveredState)?.name}
              </span>
              {stateStats[hoveredState] && (
                <>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-600 text-slate-400">
                    {stateStats[hoveredState].cameras} cameras
                  </Badge>
                  {stateStats[hoveredState].incidents > 0 && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-red-600/80">
                      {stateStats[hoveredState].incidents} incidents
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {selectedState && (
          <StateDetailPanel
            stateId={selectedState}
            stateName={selectedStateName}
            cameras={cameras}
            incidents={incidents}
            onClose={() => setSelectedState(null)}
          />
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-500 font-mono">
            TOTAL CAMERAS: {activeCameras.length}
          </span>
          <span className="text-[10px] text-red-500 font-mono">
            ACTIVE INCIDENTS: {activeIncidents.length}
          </span>
          <span className="text-[10px] text-slate-600 font-mono">
            STATES WITH ACTIVITY: {Object.keys(stateStats).length}
          </span>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">
          CLICK STATE TO EXPAND 3D VIEW
        </span>
      </div>
    </div>
  );
}
