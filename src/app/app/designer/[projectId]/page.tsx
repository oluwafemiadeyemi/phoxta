/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Editor page  /app/designer/[projectId]
   Loads project data from API and renders the DesignerEditor
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { DesignProject, DesignPage } from "@/types/designer";

// Dynamic import to avoid SSR issues with Fabric.js
const DesignerEditor = dynamic(
  () => import("@/components/designer/DesignerEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export default function DesignerEditorPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<DesignProject | null>(null);
  const [pages, setPages] = useState<DesignPage[]>([]);
  const [initialJson, setInitialJson] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch project data
  useEffect(() => {
    if (!projectId) return;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/designer/projects/${projectId}`);
        if (!res.ok) {
          setError("Project not found");
          return;
        }
        const data = await res.json();
        setProject(data.project);
        setPages(data.pages || []);

        // Load first page's fabric JSON if available
        const firstPage = data.pages?.[0];
        if (firstPage?.fabric_json_path) {
          try {
            const jsonRes = await fetch(
              `/api/designer/projects/${projectId}/save?pageId=${firstPage.id}`,
            );
            if (jsonRes.ok) {
              const jsonData = await jsonRes.json();
              setInitialJson(jsonData.fabricJson || null);
            }
          } catch {
            // No saved JSON yet — blank canvas
          }
        }
      } catch {
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  // Save handler
  const handleSave = useCallback(
    async (json: object) => {
      if (!project || pages.length === 0) return;
      const page = pages[0];
      await fetch(`/api/designer/projects/${project.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          fabricJson: json,
        }),
      });
    },
    [project, pages],
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading designer…</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error || "Project not found"}
          </p>
          <button
            onClick={() => router.push("/app/designer")}
            className="text-sm text-primary underline mt-2"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <DesignerEditor
      projectId={project.id}
      projectName={project.name}
      width={project.width}
      height={project.height}
      initialJson={initialJson}
      onSave={handleSave}
      onBack={() => router.push("/app/designer")}
    />
  );
}
