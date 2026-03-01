import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertCircle,
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
  UserPlus
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

const MAP_PINS = [
  { x: 22, y: 35, label: "Downtown" },
  { x: 55, y: 25, label: "City Hall" },
  { x: 75, y: 60, label: "Central Park" },
  { x: 38, y: 70, label: "HQ" },
  { x: 85, y: 30, label: "Highway 101" },
  { x: 15, y: 55, label: "West Side" },
  { x: 60, y: 80, label: "South District" },
  { x: 45, y: 45, label: "Midtown" },
];

function CameraFeedCard({ feed, onVideoUploaded }: { feed: CameraFeed; onVideoUploaded: () => void }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: async (response) => {
      try {
        await apiRequest("PATCH", `/api/modules/camera-processing/feeds/${feed.id}/video`, { videoUrl: response.objectPath });
        onVideoUploaded();
        toast({ title: "Video Uploaded", description: `${feed.name} feed updated.` });
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

  const statusInfo = STATUS_BADGE[feed.status] || STATUS_BADGE.idle;
  const hasVideo = localVideoUrl || feed.videoUrl;

  return (
    <Card className="bg-slate-900/80 border-slate-700/50 overflow-hidden group relative" data-testid={`camera-card-${feed.id}`}>
      <div className="relative aspect-video bg-slate-950 overflow-hidden">
        {hasVideo ? (
          <video
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

        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${statusInfo.color} ${statusInfo.pulse ? "animate-pulse-status" : ""}`} />
          <span className="text-[10px] font-medium text-white/90 bg-black/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
            {feed.status}
          </span>
        </div>

        {feed.isActive && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 text-[10px] text-green-400 bg-black/50 px-1.5 py-0.5 rounded">
              <Radio className="h-2.5 w-2.5" />
              LIVE
            </span>
          </div>
        )}

        {hasVideo && (
          <button
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded p-1 hover:bg-black/80"
            onClick={() => { setLocalVideoUrl(null); }}
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
      </div>
    </Card>
  );
}

function IncidentMap({ incidents }: { incidents: Incident[] }) {
  const activeIncidents = incidents.filter((i) => i.status === "active");

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-lg overflow-hidden" data-testid="incident-map">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="0.2" />
          </pattern>
          <radialGradient id="pinGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100" height="100" fill="url(#grid)" />

        <path d="M 10 40 Q 25 38, 40 42 T 70 35 T 95 45" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="0.5" />
        <path d="M 5 60 Q 30 55, 50 65 T 90 55" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="0.5" />
        <path d="M 30 10 Q 32 30, 35 50 T 30 90" fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="0.3" />
        <path d="M 60 5 Q 58 25, 62 45 T 58 85" fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="0.3" />

        <rect x="18" y="30" width="12" height="8" rx="0.5" fill="rgba(100,116,139,0.08)" stroke="rgba(100,116,139,0.15)" strokeWidth="0.2" />
        <rect x="50" y="20" width="15" height="10" rx="0.5" fill="rgba(100,116,139,0.08)" stroke="rgba(100,116,139,0.15)" strokeWidth="0.2" />
        <rect x="70" y="55" width="10" height="12" rx="0.5" fill="rgba(100,116,139,0.08)" stroke="rgba(100,116,139,0.15)" strokeWidth="0.2" />

        {MAP_PINS.map((pin, i) => (
          <g key={i}>
            <circle cx={pin.x} cy={pin.y} r="1.5" fill="rgba(100,116,139,0.3)" />
            <text x={pin.x} y={pin.y + 4} textAnchor="middle" className="fill-slate-600" style={{ fontSize: "2px" }}>
              {pin.label}
            </text>
          </g>
        ))}

        {activeIncidents.map((incident, index) => {
          const pin = MAP_PINS[index % MAP_PINS.length];
          const colors: Record<string, string> = {
            critical: "#dc2626",
            high: "#f97316",
            medium: "#eab308",
            low: "#3b82f6",
          };
          const color = colors[incident.severity] || "#64748b";

          return (
            <g key={incident.id} data-testid={`map-pin-${incident.id}`}>
              <circle cx={pin.x} cy={pin.y} r="4" fill={color} opacity="0.15">
                <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={pin.x} cy={pin.y} r="1.8" fill={color} stroke="white" strokeWidth="0.3" />
              <text
                x={pin.x}
                y={pin.y - 3.5}
                textAnchor="middle"
                fill="white"
                style={{ fontSize: "2.2px", fontWeight: "bold" }}
              >
                {incident.title.length > 15 ? incident.title.slice(0, 15) + "..." : incident.title}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-2 left-2 flex items-center gap-3 bg-black/60 rounded px-2 py-1">
        {["critical", "high", "medium", "low"].map((sev) => (
          <div key={sev} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  sev === "critical" ? "#dc2626" : sev === "high" ? "#f97316" : sev === "medium" ? "#eab308" : "#3b82f6",
              }}
            />
            <span className="text-[9px] text-slate-400 capitalize">{sev}</span>
          </div>
        ))}
      </div>

      <div className="absolute top-2 left-2 text-[10px] text-slate-500 bg-black/50 px-2 py-0.5 rounded">
        {activeIncidents.length} active incident{activeIncidents.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
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
  return (
    <ScrollArea className="h-full" data-testid="incident-feed">
      <div className="space-y-2 pr-3">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No active incidents</p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-colors"
              data-testid={`incident-card-${incident.id}`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[incident.severity]}`}>
                      {incident.severity.toUpperCase()}
                    </Badge>
                    {incident.status === "active" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse-status" />
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-slate-200 truncate">{incident.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{incident.description}</p>
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
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    size="sm"
                    className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700"
                    onClick={() => onAlert(incident.id)}
                    data-testid={`alert-btn-${incident.id}`}
                  >
                    <Phone className="h-2.5 w-2.5 mr-0.5" />
                    Alert
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] border-slate-700 hover:bg-slate-800"
                    onClick={() => onAnalyze(incident.id)}
                    data-testid={`analyze-btn-${incident.id}`}
                  >
                    <Zap className="h-2.5 w-2.5 mr-0.5" />
                    Analyze
                  </Button>
                </div>
              </div>
            </div>
          ))
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
  const [form, setForm] = useState({ name: "", phone: "", email: "", role: "first_responder", priority: 1 });

  const resetForm = () => {
    setForm({ name: "", phone: "", email: "", role: "first_responder", priority: 1 });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name || !form.phone) return;
    if (editingId) {
      onEdit(editingId, form);
    } else {
      onAdd(form);
    }
    resetForm();
  };

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email || "", role: c.role, priority: c.priority });
    setIsAdding(true);
  };

  return (
    <div className="h-full flex flex-col" data-testid="contacts-table">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{contacts.length} contacts</span>
        <Button
          size="sm"
          className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: "", phone: "", email: "", role: "first_responder", priority: 1 }); }}
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
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-700" data-testid="contact-role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first_responder">First Responder</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="fire">Fire</SelectItem>
                <SelectItem value="police">Police</SelectItem>
                <SelectItem value="coordinator">Coordinator</SelectItem>
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
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${ROLE_COLORS[contact.role] || ""}`}>
                    {contact.role.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500">{contact.phone}</span>
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
    <div className="h-full flex flex-col bg-slate-950 rounded-lg border border-slate-700/50 overflow-hidden" data-testid="robocaller-console">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border-b border-slate-700/50">
        <Terminal className="h-3.5 w-3.5 text-green-400" />
        <span className="text-[11px] font-mono text-green-400">robocaller@emergency</span>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-600">{robocalls.length} calls</span>
      </div>

      <div ref={consoleRef} className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1">
        <div className="text-green-500/60">{'>'} Robocaller console ready. Type "help" for commands.</div>
        <div className="text-slate-600">{'>'} Connected to emergency notification system.</div>

        {robocalls.slice(-20).map((call) => (
          <div key={call.id} className="flex items-start gap-1.5">
            {getStatusIcon(call.status)}
            <span className="text-slate-500">[{new Date(call.createdAt).toLocaleTimeString()}]</span>
            <span className={
              call.status === "completed" ? "text-green-400" :
              call.status === "failed" ? "text-red-400" :
              call.status === "calling" ? "text-blue-400" :
              "text-yellow-400"
            }>
              {call.status.toUpperCase()}
            </span>
            <span className="text-slate-400 truncate">
              Contact#{call.contactId} - {call.message.slice(0, 40)}{call.message.length > 40 ? "..." : ""}
            </span>
          </div>
        ))}

        {robocalls.length === 0 && (
          <div className="text-slate-600">{'>'} No call activity yet. Use "alert {'<incident_id>'}" to start.</div>
        )}
      </div>

      <div className="flex items-center border-t border-slate-700/50 bg-slate-900/50">
        <span className="text-green-400 text-xs pl-2 font-mono">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCommand(commandInput); }}
          placeholder="Type command..."
          className="flex-1 bg-transparent text-xs font-mono text-slate-300 px-2 py-2 focus:outline-none placeholder:text-slate-700"
          data-testid="console-input"
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateIncidentOpen, setIsCreateIncidentOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "medium",
    location: "",
  });

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
        }
        if (message.event?.includes("module_health")) {
          queryClient.invalidateQueries({ queryKey: ["/api/health"] });
        }
        if (message.event?.includes("robocall")) {
          queryClient.invalidateQueries({ queryKey: ["/api/modules/robocaller"] });
        }
        if (message.event?.includes("camera") || message.event?.includes("detection")) {
          queryClient.invalidateQueries({ queryKey: ["/api/modules/camera-processing/feeds"] });
        }
        if (message.event?.includes("contact")) {
          queryClient.invalidateQueries({ queryKey: ["/api/modules/contact-management"] });
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

  const { data: moduleHealth = [] } = useQuery<ModuleHealth[]>({
    queryKey: ["/api/health"],
    refetchInterval: 10000,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/modules/contact-management"],
  });

  const { data: cameraFeeds = [] } = useQuery<CameraFeed[]>({
    queryKey: ["/api/modules/camera-processing/feeds"],
  });

  const { data: robocalls = [] } = useQuery<Robocall[]>({
    queryKey: ["/api/modules/robocaller"],
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: typeof newIncident) => {
      const res = await apiRequest("POST", "/api/incidents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setIsCreateIncidentOpen(false);
      setNewIncident({ title: "", description: "", severity: "medium", location: "" });
      toast({ title: "Incident Created", description: "Emergency incident has been reported." });
    },
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
      } catch {}
    },
    []
  );

  const activeIncidents = incidents.filter((i) => i.status === "active");
  const criticalCount = incidents.filter((i) => i.severity === "critical" && i.status === "active").length;
  const displayFeeds = cameraFeeds.length > 0 ? cameraFeeds.slice(0, 4) : [
    { id: -1, name: "Camera 1", location: "Unassigned", status: "idle", isActive: false, createdAt: "" },
    { id: -2, name: "Camera 2", location: "Unassigned", status: "idle", isActive: false, createdAt: "" },
    { id: -3, name: "Camera 3", location: "Unassigned", status: "idle", isActive: false, createdAt: "" },
    { id: -4, name: "Camera 4", location: "Unassigned", status: "idle", isActive: false, createdAt: "" },
  ] as CameraFeed[];

  const getHealthIcon = (name: string) => {
    const m = moduleHealth.find((h) => h.moduleName === name);
    if (!m) return <Activity className="h-3 w-3 text-slate-600" />;
    if (m.status === "healthy") return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (m.status === "degraded") return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    return <XCircle className="h-3 w-3 text-red-500" />;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden dark">
      {/* Header Bar */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-red-500" />
          <div>
            <h1 className="text-sm font-bold tracking-tight" data-testid="dashboard-title">INCIDENT RESPONSE CENTER</h1>
            <p className="text-[10px] text-slate-500">Real-time monitoring & coordination</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Module health indicators */}
          <div className="hidden md:flex items-center gap-3">
            {[
              { key: "robocaller", label: "Robocaller" },
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

          {/* Stats badges */}
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 animate-pulse-status" data-testid="critical-badge">
                {criticalCount} CRITICAL
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-700 text-slate-400" data-testid="active-count-badge">
              {activeIncidents.length} Active
            </Badge>
          </div>

          <Dialog open={isCreateIncidentOpen} onOpenChange={setIsCreateIncidentOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700" data-testid="report-incident-btn">
                <AlertCircle className="h-3 w-3 mr-1" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 text-white border-slate-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">Report Emergency Incident</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Create a new incident for immediate response coordination.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <Input
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="Incident title"
                  className="bg-slate-950 border-slate-700 text-sm"
                  data-testid="incident-title-input"
                />
                <Textarea
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Detailed description"
                  className="bg-slate-950 border-slate-700 text-sm"
                  rows={3}
                  data-testid="incident-description-input"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={newIncident.severity}
                    onValueChange={(value) => setNewIncident({ ...newIncident, severity: value })}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-sm" data-testid="incident-severity-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={newIncident.location}
                    onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
                    placeholder="Location"
                    className="bg-slate-950 border-slate-700 text-sm"
                    data-testid="incident-location-input"
                  />
                </div>
                <Button
                  onClick={() => createIncidentMutation.mutate(newIncident)}
                  disabled={!newIncident.title || !newIncident.description || createIncidentMutation.isPending}
                  className="w-full bg-red-600 hover:bg-red-700 text-sm"
                  data-testid="create-incident-btn"
                >
                  {createIncidentMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  )}
                  Create Incident
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-rows-[auto_1fr_1fr] gap-3 p-3 overflow-hidden min-h-0">
        {/* Row 1: Camera Feeds */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-slate-500" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Camera Feeds</h2>
            <span className="text-[10px] text-slate-600">{cameraFeeds.filter((f) => f.isActive).length} active</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {displayFeeds.map((feed) => (
              <CameraFeedCard
                key={feed.id}
                feed={feed}
                onVideoUploaded={() => queryClient.invalidateQueries({ queryKey: ["/api/modules/camera-processing/feeds"] })}
              />
            ))}
          </div>
        </section>

        {/* Row 2: Map + Incident Feed */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 min-h-0">
          <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Incident Map
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 h-[calc(100%-40px)]">
              <IncidentMap incidents={incidents} />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 overflow-hidden flex flex-col">
            <CardHeader className="py-2 px-3 shrink-0">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-red-400" />
                Live Incident Feed
                {activeIncidents.length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse-status" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex-1 min-h-0">
              <LiveIncidentFeed
                incidents={incidents}
                onAlert={initiateRobocalls}
                onAnalyze={analyzeRisk}
              />
            </CardContent>
          </Card>
        </section>

        {/* Row 3: Contacts + Robocaller Console */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0">
          <Card className="bg-slate-900/50 border-slate-800 overflow-hidden flex flex-col">
            <CardHeader className="py-2 px-3 shrink-0">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                Contact Directory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex-1 min-h-0">
              <ContactsTable
                contacts={contacts}
                onAdd={createContact}
                onEdit={editContact}
                onDelete={deleteContact}
                onToggle={toggleContact}
              />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 overflow-hidden flex flex-col">
            <CardHeader className="py-2 px-3 shrink-0">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-green-400" />
                Robocaller Console
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex-1 min-h-0">
              <RobocallerConsole robocalls={robocalls} incidents={incidents} />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
