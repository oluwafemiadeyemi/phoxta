import { useOne, useUpdate, useDelete, useGo } from "@refinedev/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@crm/components/ui/dialog";
import { Button } from "@crm/components/ui/button";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { Badge } from "@crm/components/ui/badge";
import { Separator } from "@crm/components/ui/separator";
import type { Project } from "@crm/types";
import {
  Calendar,
  Users,
  Settings,
  Trash2,
  Edit,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useRef, useState } from "react";
import { supabaseClient } from "@crm/lib/supabase";

interface ProjectDetailModalProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  Active: {
    color: "bg-green-100 text-green-700 border-green-300",
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Active",
  },
  Upcoming: {
    color: "bg-blue-100 text-blue-700 border-blue-300",
    icon: <Clock className="w-4 h-4" />,
    label: "Upcoming",
  },
  Completed: {
    color: "bg-slate-100 text-slate-700 border-slate-300",
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Completed",
  },
  "On Hold": {
    color: "bg-amber-100 text-amber-700 border-amber-300",
    icon: <AlertCircle className="w-4 h-4" />,
    label: "On Hold",
  },
};

export function ProjectDetailModal({ projectId, open, onOpenChange }: ProjectDetailModalProps) {
  const { mutate: updateProject } = useUpdate();
  const { mutate: deleteProject } = useDelete();
  const go = useGo();
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    query: { data: project, isLoading: projectLoading },
  } = useOne<Project>({
    resource: "projects",
    id: projectId || "",
    queryOptions: {
      enabled: !!projectId,
    },
  });

  const projectData = project?.data;
  const status = projectData?.status || "Active";
  const statusInfo = statusConfig[status] || statusConfig.Active;

  const handleDelete = () => {
    if (!projectData?.id) return;
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject(
        {
          resource: "projects",
          id: projectData.id,
          mutationMode: "optimistic",
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        },
      );
    }
  };

  const handleEdit = () => {
    if (!projectData?.id) return;
    go?.({ to: { resource: "projects", action: "edit", id: projectData.id } });
  };

  const handleImageUpload = async (file: File) => {
    if (!projectData?.id || !file) return;
    setUploadingImage(true);
    try {
      const extension = file.name.split(".").pop() || "png";
      const path = `${projectData.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabaseClient.storage.from("project_images").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/png",
      });

      if (uploadError) throw uploadError;

      const { data } = supabaseClient.storage.from("project_images").getPublicUrl(path);

      updateProject({
        resource: "projects",
        id: projectData.id,
        values: { imageUrl: data.publicUrl },
        mutationMode: "optimistic",
      });
    } catch (error) {
      console.error("Failed to upload project image:", error);
    } finally {
      setUploadingImage(false);
    }
  };

  if (!projectId || projectLoading || !projectData) {
    return null;
  }

  const progress = projectData.progress || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl">
        <ScrollArea className="max-h-[90vh]">
          {/* Header with color gradient */}
          <div
            className="h-40 bg-gradient-to-br relative overflow-hidden"
            style={{
              backgroundImage: projectData.imageUrl
                ? `linear-gradient(135deg, ${projectData.color}20 0%, ${projectData.color}40 100%), url(${projectData.imageUrl})`
                : `linear-gradient(135deg, ${projectData.color}20 0%, ${projectData.color}40 100%)`,
              backgroundSize: projectData.imageUrl ? "cover" : "auto",
              backgroundPosition: "center",
              borderBottom: `3px solid ${projectData.color}`,
            }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundColor: projectData.color }} />
            <div className="relative p-6 h-full flex items-end">
              <div className="w-full">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{projectData.name}</h1>
                    <p className="text-slate-600 text-sm">{projectData.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingImage ? "Uploading..." : projectData.imageUrl ? "Replace image" : "Upload image"}
                    </Button>
                    <Badge
                      className={`${statusInfo.color} border flex items-center gap-1.5 px-3 py-1.5 font-medium`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Project Progress</h3>
                <span className="text-sm font-medium text-slate-600">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r transition-all duration-500 rounded-full"
                  style={{
                    width: `${progress}%`,
                    backgroundImage: `linear-gradient(90deg, ${projectData.color}, ${projectData.color}80)`,
                  }}
                />
              </div>
            </div>

            <Separator />

            {/* Project Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Start Date</span>
                </div>
                <p className="text-slate-900 font-semibold">{projectData.startDate ? format(new Date(projectData.startDate), "MMM dd, yyyy") : "—"}</p>
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">End Date</span>
                </div>
                <p className="text-slate-900 font-semibold">{projectData.endDate ? format(new Date(projectData.endDate), "MMM dd, yyyy") : "—"}</p>
              </div>

              {/* Team Members */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Team Size</span>
                </div>
                <p className="text-slate-900 font-semibold">{projectData.teamMembers?.length || 0} members</p>
              </div>

              {/* Budget */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-600">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Budget</span>
                </div>
                <p className="text-slate-900 font-semibold">${projectData.budget?.toLocaleString() || "0"}</p>
              </div>
            </div>

            <Separator />

            {/* Team Members List */}
            {projectData.teamMembers && projectData.teamMembers.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-600" />
                  Team Members
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {projectData.teamMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                      <p className="font-medium text-slate-900 text-sm">{member.name}</p>
                      <p className="text-xs text-slate-600">{member.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleEdit}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-2 font-medium">
                <Edit className="w-4 h-4" />
                Edit Project
              </Button>
              <Button
                onClick={handleDelete}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2 font-medium">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
