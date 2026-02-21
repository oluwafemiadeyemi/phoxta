/* ─────────────────────────────────────────────────────────────────────────────
   CRM – Content Designer page
   Provides a CRM-embedded view of the Designer dashboard + editor
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import dynamic from "next/dynamic";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  FolderOpen,
  Paintbrush,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@crm/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@crm/components/ui/dropdown-menu";
import { Label } from "@crm/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import type { DesignProject, DesignPage } from "@/types/designer";
import { CANVAS_PRESETS } from "@/types/designer";

// Dynamic import for the editor (no SSR)
const DesignerEditor = dynamic(
  () => import("@/components/designer/DesignerEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

type Mode = "dashboard" | "editor";

export default function ContentDesignerPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("dashboard");

  // Dashboard state
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("Untitled Design");
  const [newPreset, setNewPreset] = useState("instagramPost");
  const [creating, setCreating] = useState(false);

  // Editor state
  const [activeProject, setActiveProject] = useState<DesignProject | null>(null);
  const [activePages, setActivePages] = useState<DesignPage[]>([]);
  const [initialJson, setInitialJson] = useState<object | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/designer/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    setCreating(true);
    const preset = CANVAS_PRESETS[newPreset];
    try {
      const res = await fetch("/api/designer/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName || "Untitled Design",
          width: preset?.width || 1080,
          height: preset?.height || 1080,
        }),
      });
      if (res.ok) {
        const { project, page } = await res.json();
        setCreateOpen(false);
        openEditor(project, page ? [page] : []);
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const openEditor = async (project: DesignProject, pages?: DesignPage[]) => {
    setActiveProject(project);
    setInitialJson(null);

    if (!pages) {
      // Fetch pages
      try {
        const res = await fetch(`/api/designer/projects/${project.id}`);
        if (res.ok) {
          const data = await res.json();
          pages = data.pages || [];
        }
      } catch {
        pages = [];
      }
    }

    setActivePages(pages || []);
    setMode("editor");
  };

  const handleSave = useCallback(
    async (json: object) => {
      if (!activeProject || activePages.length === 0) return;
      const page = activePages[0];
      await fetch(`/api/designer/projects/${activeProject.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          fabricJson: json,
        }),
      });
    },
    [activeProject, activePages],
  );

  const handleDelete = async (id: string) => {
    await fetch(`/api/designer/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Editor Mode ──────────────────────────────────────────────────────────
  if (mode === "editor" && activeProject) {
    return (
      <div className="h-[calc(100vh-64px)] w-full">
        <DesignerEditor
          projectId={activeProject.id}
          projectName={activeProject.name}
          width={activeProject.width}
          height={activeProject.height}
          initialJson={initialJson}
          onSave={handleSave}
          onBack={() => {
            setMode("dashboard");
            setActiveProject(null);
            fetchProjects();
          }}
        />
      </div>
    );
  }

  // ── Dashboard Mode ───────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Paintbrush className="h-6 w-6 text-primary" />
            Designer
          </h1>
          <p className="text-sm text-muted-foreground">
            Create graphics, social media posts, and marketing materials
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Design
        </Button>
      </div>

      {/* Search / View toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search designs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="icon"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="icon"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Projects grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-lg font-medium">
              {search ? "No designs found" : "No designs yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? "Try a different search term"
                : "Create your first design to get started"}
            </p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create Design
              </Button>
            )}
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer hover:border-primary transition-colors overflow-hidden"
                onClick={() => openEditor(project)}
              >
                <div
                  className="aspect-square bg-muted flex items-center justify-center"
                  style={{ maxHeight: 160 }}
                >
                  <Paintbrush className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {project.width} × {project.height}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditor(project);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(project.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:border-primary cursor-pointer transition-colors"
                onClick={() => openEditor(project)}
              >
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center shrink-0">
                  <Paintbrush className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.width} × {project.height} ·{" "}
                    {new Date(project.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create project dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Design</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Project Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Design"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Canvas Size</Label>
              <Select value={newPreset} onValueChange={setNewPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CANVAS_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.label} ({preset.width} × {preset.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="w-full gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {creating ? "Creating…" : "Create Design"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
