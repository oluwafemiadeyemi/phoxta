"use client";

// ===========================================================================
// CRM Content Designer — Adapts the Phoxta Designer for CRM Content Studio
// Renders dashboard (project list) and editor (canvas) modes inline
// ===========================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { CANVAS_PRESETS } from "@/types/designer";
import type { DesignProject, DesignPage } from "@/types/designer";
import type { AIDesignResponse } from "@/types/aiDesign";

// shadcn/ui
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Card, CardContent } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { Separator } from "@crm/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@crm/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@crm/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@crm/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@crm/components/ui/tooltip";
import {
  Plus,
  Trash2,
  RotateCcw,
  X,
  Loader2,
  Paintbrush,
  FileImage,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Search,
  MoreVertical,
  Copy,
  Download,
  Eye,
  Grid3X3,
  List,
  FolderOpen,
  Clock,
  Star,
  Filter,
  SortAsc,
  LayoutGrid,
  Pencil,
  ExternalLink,
  ChevronRight,
  Share2,
  Palette,
  Image as ImageIcon,
  Type,
  Layers,
  MousePointer2,
  Square,
  Circle,
  Minus,
  Frame as FrameIcon,
  Crop,
  Pipette,
  Hand,
  ZoomIn,
  Undo2,
  Redo2,
  Save,
  Menu,
  PanelLeftClose,
  PanelRightClose,
  ChevronLeft,
  FileText,
  Settings,
  MessageSquare,
  History,
} from "lucide-react";
import { cn } from "@crm/lib/utils";

// ── Types ──
type ViewMode = "dashboard" | "editor";
type DashboardView = "grid" | "list";
type SortBy = "updated" | "created" | "name";

// ===========================================================================
// DASHBOARD VIEW
// ===========================================================================

function DesignerDashboard({
  onOpenProject,
}: {
  onOpenProject: (projectId: string) => void;
}) {
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<DashboardView>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashed, setTrashed] = useState<DesignProject[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [psdImporting, setPsdImporting] = useState(false);
  const [showAiDesign, setShowAiDesign] = useState(false);
  const psdFileRef = useRef<HTMLInputElement>(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch {
      /* network error */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch trash
  const fetchTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const res = await fetch("/api/designer/projects?status=trashed");
      if (res.ok) setTrashed(await res.json());
    } catch {
      /* */
    } finally {
      setTrashLoading(false);
    }
  }, []);

  // Create project
  const createProject = async (name: string, width: number, height: number) => {
    setCreateError(null);
    try {
      const res = await fetch("/api/designer/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, width, height }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowNewDialog(false);
        onOpenProject(data.id);
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setCreateError(err.error || `Failed (${res.status})`);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Network error");
    }
  };

  // Delete project
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/designer/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* */
    }
  };

  // Restore project
  const restoreProject = async (id: string) => {
    try {
      await fetch(`/api/designer/${id}/restore`, { method: "POST" });
      setTrashed((prev) => prev.filter((p) => p.id !== id));
      fetchProjects();
    } catch {
      /* */
    }
  };

  // PSD import
  const handlePsdImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.toLowerCase().endsWith(".psd")) {
      setCreateError("Please select a .psd file");
      return;
    }
    setPsdImporting(true);
    setCreateError(null);
    try {
      const { previewPsd } = await import("@/lib/designer/psdImporter");
      const { storePendingPsd } = await import("@/lib/designer/psdTransfer");
      const info = await previewPsd(file);
      const psdKey = crypto.randomUUID();
      await storePendingPsd(psdKey, file);
      const name = file.name.replace(/\.psd$/i, "");
      const res = await fetch("/api/designer/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, width: info.width, height: info.height }),
      });
      if (res.ok) {
        const data = await res.json();
        // Store psdKey for the editor to pick up
        sessionStorage.setItem("designer_psd_import", JSON.stringify({ projectId: data.id, psdKey }));
        onOpenProject(data.id);
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setCreateError(err.error || `Failed to create project (${res.status})`);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to import PSD");
    } finally {
      setPsdImporting(false);
      if (psdFileRef.current) psdFileRef.current.value = "";
    }
  };

  // Filter and sort
  const filtered = projects
    .filter((p) => {
      if (!searchQuery) return true;
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "updated":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Designer</h2>
            <p className="text-xs text-gray-500">
              Create graphics, social posts, banners, and marketing visuals
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500"
              onClick={() => {
                setShowTrash(true);
                fetchTrash();
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Trash</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={psdImporting}
              onClick={() => psdFileRef.current?.click()}
            >
              {psdImporting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileImage className="mr-1.5 h-3.5 w-3.5" />
              )}
              {psdImporting ? "Importing…" : "Import PSD"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowAiDesign(true)}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Design
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Design
            </Button>
          </div>
        </div>

        {/* Search & filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search designs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Modified</SelectItem>
              <SelectItem value="created">Date Created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              className="h-8 w-8 rounded-none"
              onClick={() => setView("grid")}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              className="h-8 w-8 rounded-none"
              onClick={() => setView("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects */}
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-xs text-gray-500">Loading designs...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Paintbrush className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">
                {searchQuery ? "No designs match your search" : "No designs yet"}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first design to get started"}
              </p>
              {!searchQuery && (
                <Button size="sm" onClick={() => setShowNewDialog(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> New Design
                </Button>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="group relative">
                  <button
                    onClick={() => onOpenProject(p.id)}
                    className="w-full text-left"
                  >
                    <Card className="overflow-hidden hover:shadow-md transition border-gray-200 hover:border-gray-300">
                      <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
                        {p.preview_url ? (
                          <img
                            src={p.preview_url}
                            alt={p.name}
                            className="w-full h-full object-contain bg-white"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Paintbrush className="h-6 w-6 text-gray-200" />
                            <span className="text-[10px] text-gray-300">
                              No preview
                            </span>
                          </div>
                        )}
                      </div>
                      <CardContent className="px-3 py-2">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {p.width}×{p.height} ·{" "}
                          {new Date(p.updated_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 border-gray-200 hidden group-hover:flex"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[140px]">
                      <DropdownMenuItem onClick={() => onOpenProject(p.id)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const res = await fetch("/api/designer/projects", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              name: `${p.name} (Copy)`,
                              width: p.width,
                              height: p.height,
                              template_source_id: p.id,
                            }),
                          });
                          if (res.ok) fetchProjects();
                        }}
                      >
                        <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onOpenProject(p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition text-left group"
                >
                  <div className="w-12 h-9 bg-gray-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {p.preview_url ? (
                      <img
                        src={p.preview_url}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Paintbrush className="h-4 w-4 text-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {p.width}×{p.height}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[140px]">
                      <DropdownMenuItem onClick={() => onOpenProject(p.id)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* New project dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Design</DialogTitle>
            <DialogDescription>
              Choose a preset or enter custom dimensions.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-md px-3 py-2 mb-2">
              {createError}
            </div>
          )}

          {/* Custom size */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Input
              id="crm-new-name"
              type="text"
              placeholder="Design name"
              className="flex-1 min-w-[120px] text-xs h-9"
            />
            <div className="flex gap-2">
              <Input
                id="crm-new-w"
                type="number"
                placeholder="Width"
                defaultValue={1080}
                className="w-20 text-xs h-9"
              />
              <Input
                id="crm-new-h"
                type="number"
                placeholder="Height"
                defaultValue={1080}
                className="w-20 text-xs h-9"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                const name =
                  (document.getElementById("crm-new-name") as HTMLInputElement)
                    .value || "Untitled design";
                const w =
                  parseInt(
                    (document.getElementById("crm-new-w") as HTMLInputElement)
                      .value
                  ) || 1080;
                const h =
                  parseInt(
                    (document.getElementById("crm-new-h") as HTMLInputElement)
                      .value
                  ) || 1080;
                createProject(name, w, h);
              }}
            >
              Create
            </Button>
          </div>

          {/* Presets by category */}
          {["Social Media", "Print", "Presentation", "Web"].map((cat) => {
            const presets = CANVAS_PRESETS.filter((p) => p.category === cat);
            if (presets.length === 0) return null;
            return (
              <div key={cat} className="mb-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
                  {cat}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      className="h-auto py-2.5 px-3 justify-start"
                      onClick={() =>
                        createProject(preset.label, preset.width, preset.height)
                      }
                    >
                      <div className="text-left">
                        <p className="text-xs font-medium">
                          {preset.icon} {preset.label}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {preset.width}×{preset.height}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </DialogContent>
      </Dialog>

      {/* Trash dialog */}
      <Dialog open={showTrash} onOpenChange={setShowTrash}>
        <DialogContent className="sm:max-w-[440px] max-h-[60vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Trash
            </DialogTitle>
          </DialogHeader>
          {trashLoading ? (
            <div className="text-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : trashed.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              Trash is empty
            </p>
          ) : (
            <div className="space-y-2">
              {trashed.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50"
                >
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Deleted {new Date(p.deleted_at!).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-600"
                    onClick={() => restoreProject(p.id)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrash(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Design dialog */}
      <AiDesignDialog
        open={showAiDesign}
        onOpenChange={setShowAiDesign}
        onProjectCreated={(id) => onOpenProject(id)}
      />

      {/* Hidden PSD file input */}
      <input
        ref={psdFileRef}
        type="file"
        accept=".psd"
        onChange={(e) => handlePsdImport(e.target.files)}
        className="hidden"
      />

      {/* Error toast */}
      {createError && !showNewDialog && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 text-red-600 text-xs rounded-md px-4 py-3 shadow-lg flex items-center gap-2 max-w-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{createError}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5 shrink-0"
            onClick={() => setCreateError(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// AI DESIGN DIALOG (CRM-local version)
// ===========================================================================

function AiDesignDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (projectId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("Instagram Post");
  const [pageCount, setPageCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const preset = CANVAS_PRESETS.find((p) => p.label === format) || CANVAS_PRESETS[0];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError("");

    try {
      // Create project first
      const res = await fetch("/api/designer/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prompt.slice(0, 50),
          width: preset.width,
          height: preset.height,
        }),
      });

      if (!res.ok) throw new Error("Failed to create project");

      const data = await res.json();
      const projectId = data.id;

      // Store AI design request for the editor to pick up
      sessionStorage.setItem(
        "designer_ai_design",
        JSON.stringify({
          projectId,
          prompt,
          format,
          pageCount,
          width: preset.width,
          height: preset.height,
        })
      );

      onOpenChange(false);
      onProjectCreated(projectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start AI design");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" /> AI Design
          </DialogTitle>
          <DialogDescription>
            Describe what you want and AI will create the design for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">
              What do you want to design?
            </label>
            <textarea
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="e.g. A promotional Instagram post for a summer sale with vibrant colors..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Format
              </label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANVAS_PRESETS.filter((p) => p.category === "Social Media").map(
                    (p) => (
                      <SelectItem key={p.label} value={p.label}>
                        {p.icon} {p.label} ({p.width}×{p.height})
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[80px]">
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Pages
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={pageCount}
                onChange={(e) =>
                  setPageCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
                }
                className="h-9 text-xs"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Generate Design
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// EDITOR VIEW — dynamically imports the full Designer editor components
// ===========================================================================

function DesignerEditor({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [EditorComponents, setEditorComponents] = useState<any>(null);
  const [project, setProjectState] = useState<DesignProject | null>(null);
  const [pages, setPagesState] = useState<DesignPage[]>([]);
  const [aiProgress, setAiProgress] = useState("");
  const psdImportedRef = useRef(false);
  const aiDesignTriggeredRef = useRef(false);

  // Dynamically import all editor components (SSR-safe)
  useEffect(() => {
    let cancelled = false;

    async function loadComponents() {
      try {
        const [
          { useDocumentStore },
          { default: TopBar },
          { default: LeftRail },
          { default: LeftPanel },
          { default: RightPanel },
          { default: CharacterPanel },
          { default: AdjustmentsPanel },
          { default: LayersTree },
          { default: PagesStrip },
          { default: CanvasStage },
          { default: LeftToolbar },
          { default: MobileRightPanelTiles },
          { default: ExportModal },
          { default: ShareModal },
          { default: CsvBulkModal },
          { default: AiDesignModal },
        ] = await Promise.all([
          import("@/stores/designer/documentStore"),
          import("@/components/designer/TopBar"),
          import("@/components/designer/LeftRail"),
          import("@/components/designer/LeftPanel"),
          import("@/components/designer/RightPanel"),
          import("@/components/designer/CharacterPanel"),
          import("@/components/designer/AdjustmentsPanel"),
          import("@/components/designer/LayersTree"),
          import("@/components/designer/PagesStrip"),
          import("@/components/designer/CanvasStage"),
          import("@/components/designer/LeftToolbar"),
          import("@/components/designer/MobileRightPanelTiles"),
          import("@/components/designer/modals/ExportModal"),
          import("@/components/designer/modals/ShareModal"),
          import("@/components/designer/modals/CsvBulkModal"),
          import("@/components/designer/modals/AiDesignModal"),
        ]);

        if (!cancelled) {
          setEditorComponents({
            useDocumentStore,
            TopBar,
            LeftRail,
            LeftPanel,
            RightPanel,
            CharacterPanel,
            AdjustmentsPanel,
            LayersTree,
            PagesStrip,
            CanvasStage,
            LeftToolbar,
            MobileRightPanelTiles,
            ExportModal,
            ShareModal,
            CsvBulkModal,
            AiDesignModal,
          });
        }
      } catch (err) {
        console.error("Failed to load designer components:", err);
        if (!cancelled) setError("Failed to load editor components");
      }
    }

    loadComponents();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load project data
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/designer/${projectId}`);
        if (!res.ok) {
          setError("Project not found");
          return;
        }
        const data = await res.json();
        const proj = data.project ?? data;

        const loadedProject: DesignProject = {
          id: proj.id,
          user_id: proj.user_id,
          name: proj.name,
          width: proj.width,
          height: proj.height,
          preview_url: proj.preview_url,
          is_template: proj.is_template,
          template_source_id: proj.template_source_id,
          folder_id: proj.folder_id,
          deleted_at: proj.deleted_at,
          created_at: proj.created_at,
          updated_at: proj.updated_at,
        };

        const loadedPages: DesignPage[] = (data.pages || []).map((p: any) => ({
          id: p.id,
          project_id: p.project_id,
          page_index: p.page_index,
          width: p.width,
          height: p.height,
          background: p.background,
          fabric_json_path: p.fabric_json_path,
          preview_path: p.preview_path,
          created_at: p.created_at,
          fabricUrl: p.fabricUrl,
          previewUrl: p.previewUrl,
        }));

        setProjectState(loadedProject);
        setPagesState(loadedPages);
      } catch {
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId]);

  // Initialize the document store when both components and data are ready
  useEffect(() => {
    if (!EditorComponents || !project || loading) return;

    const { useDocumentStore } = EditorComponents;
    const store = useDocumentStore.getState();
    store.setProject(project);
    store.setPages(pages);
    if (pages.length > 0) {
      store.setCurrentPageId(pages[0].id);
    }
  }, [EditorComponents, project, pages, loading]);

  // Handle PSD import from sessionStorage
  useEffect(() => {
    if (!EditorComponents || psdImportedRef.current) return;
    const raw = sessionStorage.getItem("designer_psd_import");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.projectId !== projectId) return;
    psdImportedRef.current = true;
    sessionStorage.removeItem("designer_psd_import");

    const { useDocumentStore } = EditorComponents;
    const store = useDocumentStore.getState();
    const canvas = store.canvas;
    if (!canvas) return;

    (async () => {
      try {
        const { retrievePendingPsd } = await import("@/lib/designer/psdTransfer");
        const { importPsdToCanvas } = await import("@/lib/designer/psdImporter");
        const file = await retrievePendingPsd(data.psdKey);
        if (!file) return;
        await importPsdToCanvas(file, canvas, {
          pushUndo: store.pushUndo,
          markDirty: store.markDirty,
          refreshLayers: store.refreshLayers,
          designWidth: project?.width,
          designHeight: project?.height,
        });
        setTimeout(() => {
          const saveFn = (window as any).__designerSave;
          if (typeof saveFn === "function") saveFn();
        }, 500);
      } catch (err) {
        console.error("PSD auto-import failed:", err);
      }
    })();
  }, [EditorComponents, projectId, project]);

  // Handle AI design from sessionStorage
  useEffect(() => {
    if (!EditorComponents || aiDesignTriggeredRef.current) return;
    const raw = sessionStorage.getItem("designer_ai_design");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.projectId !== projectId) return;
    aiDesignTriggeredRef.current = true;
    sessionStorage.removeItem("designer_ai_design");

    const { useDocumentStore } = EditorComponents;
    const store = useDocumentStore.getState();
    const canvas = store.canvas;
    if (!canvas) return;

    (async () => {
      try {
        setAiProgress("Planning content with AI…");
        const res = await fetch("/api/designer/ai-design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: data.prompt,
            format: data.format,
            pageCount: data.pageCount,
            designWidth: data.width,
            designHeight: data.height,
          }),
        });
        if (!res.ok) throw new Error("AI design failed");
        setAiProgress("Assembling design…");
        const { assemblePageOnCanvas } = await import(
          "@/lib/designer/aiCanvasAssembler"
        );
        const result = (await res.json()) as AIDesignResponse;
        if (result.pageSpecs.length > 0) {
          await assemblePageOnCanvas(canvas, result.pageSpecs[0], {
            clearFirst: true,
            designWidth: data.width,
            designHeight: data.height,
            pushUndo: () => store.pushUndo("AI Design"),
            markDirty: store.markDirty,
            refreshLayers: store.refreshLayers,
          });
        }
        setAiProgress("");
        setTimeout(() => {
          const saveFn = (window as any).__designerSave;
          if (typeof saveFn === "function") saveFn();
        }, 500);
      } catch (err) {
        console.error("AI design generation failed:", err);
        setAiProgress("");
      }
    })();
  }, [EditorComponents, projectId]);

  if (loading || !EditorComponents) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-xs text-gray-500">Loading editor…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-500 mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to designs
          </Button>
        </div>
      </div>
    );
  }

  const {
    TopBar,
    LeftRail,
    LeftPanel,
    RightPanel,
    CharacterPanel,
    AdjustmentsPanel,
    LayersTree,
    PagesStrip,
    CanvasStage,
    LeftToolbar,
    MobileRightPanelTiles,
    ExportModal,
    ShareModal,
    CsvBulkModal,
    AiDesignModal,
    useDocumentStore,
  } = EditorComponents;

  return (
    <DesignerEditorInner
      projectId={projectId}
      onBack={onBack}
      aiProgress={aiProgress}
      TopBar={TopBar}
      LeftRail={LeftRail}
      LeftPanel={LeftPanel}
      RightPanel={RightPanel}
      CharacterPanel={CharacterPanel}
      AdjustmentsPanel={AdjustmentsPanel}
      LayersTree={LayersTree}
      PagesStrip={PagesStrip}
      CanvasStage={CanvasStage}
      LeftToolbar={LeftToolbar}
      MobileRightPanelTiles={MobileRightPanelTiles}
      ExportModal={ExportModal}
      ShareModal={ShareModal}
      CsvBulkModal={CsvBulkModal}
      AiDesignModal={AiDesignModal}
      useDocumentStore={useDocumentStore}
    />
  );
}

// Inner editor rendering component — reads from Zustand store
function DesignerEditorInner({
  projectId,
  onBack,
  aiProgress,
  TopBar,
  LeftRail,
  LeftPanel,
  RightPanel,
  CharacterPanel,
  AdjustmentsPanel,
  LayersTree,
  PagesStrip,
  CanvasStage,
  LeftToolbar,
  MobileRightPanelTiles,
  ExportModal,
  ShareModal,
  CsvBulkModal,
  AiDesignModal,
  useDocumentStore,
}: any) {
  const { pages, currentPageId, project } = useDocumentStore();
  const currentPage = pages.find((p: DesignPage) => p.id === currentPageId);
  const initialFabricUrl = (currentPage as any)?.fabricUrl ?? undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
        {/* CRM back bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-gray-200 shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] text-gray-400">Content</span>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <span className="text-[11px] text-gray-600 font-medium">Designer</span>
          {project?.name && (
            <>
              <ChevronRight className="h-3 w-3 text-gray-300" />
              <span className="text-[11px] text-gray-600 truncate max-w-[200px]">
                {project.name}
              </span>
            </>
          )}
        </div>

        <TopBar projectId={projectId} />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Mobile: right panel tiles */}
          <div className="order-first md:hidden shrink-0">
            <MobileRightPanelTiles />
          </div>

          {/* Desktop: right panels */}
          <div className="hidden md:flex md:order-last shrink-0 overflow-y-auto flex-col border-l border-gray-200">
            <LayersTree />
            <CharacterPanel />
            <AdjustmentsPanel />
            <RightPanel />
          </div>

          {/* Main workspace */}
          <div className="flex-1 flex overflow-hidden order-last md:order-first min-h-0">
            <LeftRail />
            <LeftPanel />

            <div className="flex-1 flex overflow-hidden min-w-0 relative">
              <div className="absolute left-0 top-0 bottom-0 z-20 md:relative md:inset-auto">
                <LeftToolbar />
              </div>

              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <div className="flex-1 relative overflow-hidden">
                  {aiProgress && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-full shadow-lg">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      <span className="text-xs font-medium">{aiProgress}</span>
                    </div>
                  )}
                  <CanvasStage
                    key={currentPageId ?? "default"}
                    pageId={currentPageId ?? ""}
                    projectId={projectId}
                    initialFabricUrl={initialFabricUrl}
                    width={currentPage?.width ?? project?.width ?? 1080}
                    height={currentPage?.height ?? project?.height ?? 1080}
                  />
                </div>
                <PagesStrip projectId={projectId} />
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <ExportModal />
        <ShareModal projectId={projectId} />
        <CsvBulkModal />
        <AiDesignModal />
      </div>
    </TooltipProvider>
  );
}

// ===========================================================================
// MAIN PAGE — switches between dashboard and editor
// ===========================================================================

export default function ContentDesignerPage() {
  const navigate = useNavigate();
  const params = useParams();
  const projectId = params["*"]; // catch-all for /content/designer/PROJECT_ID

  const [editorProjectId, setEditorProjectId] = useState<string | null>(
    projectId || null
  );

  // Sync URL param to state
  useEffect(() => {
    if (projectId) {
      setEditorProjectId(projectId);
    }
  }, [projectId]);

  const handleOpenProject = (id: string) => {
    setEditorProjectId(id);
    navigate(`/content/designer/${id}`, { replace: true });
  };

  const handleBack = () => {
    setEditorProjectId(null);
    navigate("/content/designer", { replace: true });
  };

  if (editorProjectId) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
        <DesignerEditor projectId={editorProjectId} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <DesignerDashboard onOpenProject={handleOpenProject} />
    </div>
  );
}
