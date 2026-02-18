import { useList, useMany, useUpdate, useDelete, useGo, useCreate } from "@refinedev/core";
import { Badge } from "@crm/components/ui/badge";
import { Card } from "@crm/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@crm/components/ui/tooltip";
import { Progress } from "@crm/components/ui/progress";
import { TaskDetailModal } from "@crm/components/task-detail-modal";
import { ProjectDetailModal } from "@crm/components/project-detail-modal";
import { logEngagementEvent } from "@crm/lib/engagement";
import { supabaseClient } from "@crm/lib/supabase";
import type { Task, Project, TeamMember, ProjectStage, Attachment } from "@crm/types";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckSquare, MessageSquare, Plus, Play, Copy, Clock, AlertCircle, CheckCircle2, ListTodo, GripVertical } from "lucide-react";
import { differenceInDays, isPast, isToday, isTomorrow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@crm/components/ui/dialog";
import { Button } from "@crm/components/ui/button";
import { TaskForm } from "@crm/pages/tasks/form";

const projectStages: ProjectStage["name"][] = ["Unassigned", "Todo", "In Progress", "In Review", "Done"];

const stageConfig: Record<ProjectStage["name"], { dot: string; bg: string; border: string; dropRing: string; accent: string; badge: string; badgeText: string; icon: string }> = {
  Unassigned: { dot: "bg-slate-400", bg: "bg-slate-50/40", border: "border-slate-200/60", dropRing: "ring-slate-400", accent: "from-slate-400 to-slate-500", badge: "bg-slate-100 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700", badgeText: "text-slate-600 dark:text-slate-300", icon: "text-slate-400" },
  Todo: { dot: "bg-blue-500", bg: "bg-blue-50/30", border: "border-blue-200/60", dropRing: "ring-blue-400", accent: "from-blue-500 to-blue-600", badge: "bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-800", badgeText: "text-blue-600 dark:text-blue-300", icon: "text-blue-500" },
  "In Progress": { dot: "bg-amber-500", bg: "bg-amber-50/30", border: "border-amber-200/60", dropRing: "ring-amber-400", accent: "from-amber-500 to-orange-500", badge: "bg-amber-50 dark:bg-amber-950/50 border-amber-200/80 dark:border-amber-800", badgeText: "text-amber-600 dark:text-amber-300", icon: "text-amber-500" },
  "In Review": { dot: "bg-violet-500", bg: "bg-violet-50/30", border: "border-violet-200/60", dropRing: "ring-violet-400", accent: "from-violet-500 to-purple-600", badge: "bg-violet-50 dark:bg-violet-950/50 border-violet-200/80 dark:border-violet-800", badgeText: "text-violet-600 dark:text-violet-300", icon: "text-violet-500" },
  Done: { dot: "bg-emerald-500", bg: "bg-emerald-50/30", border: "border-emerald-200/60", dropRing: "ring-emerald-400", accent: "from-emerald-500 to-green-600", badge: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800", badgeText: "text-emerald-600 dark:text-emerald-300", icon: "text-emerald-500" },
};

const priorityConfig: Record<Task["priority"], { dot: string; label: string }> = {
  Low: { dot: "bg-slate-400", label: "Low" },
  Medium: { dot: "bg-blue-500", label: "Med" },
  High: { dot: "bg-orange-500", label: "High" },
  Urgent: { dot: "bg-red-500", label: "Urgent" },
};

const extractYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  return match?.[1] || null;
};

const extractTikTokId = (url: string) => {
  const match = url.match(/tiktok\.com\/.*\/video\/(\d+)/i);
  return match?.[1] || null;
};

const extractInstagramCode = (url: string) => {
  const match = url.match(/instagram\.com\/(p|reel|tv)\/([^/?#]+)/i);
  if (!match) return null;
  return { kind: match[1], code: match[2] };
};

const getEmbedInfo = (url: string) => {
  const youTubeId = extractYouTubeId(url);
  if (youTubeId) {
    return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${youTubeId}` };
  }
  const tikTokId = extractTikTokId(url);
  if (tikTokId) {
    return { type: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${tikTokId}` };
  }
  const insta = extractInstagramCode(url);
  if (insta) {
    return { type: "instagram", embedUrl: `https://www.instagram.com/${insta.kind}/${insta.code}/embed/` };
  }
  return { type: "link" };
};

const isDirectVideoUrl = (url: string) => /\.(mp4|mov|webm|ogg)$/i.test(url);

function TaskCard({
  task,
  project,
  assignee,
  cover,
  isDragging = false,
  onClick,
  onProjectClick,
  onDuplicate,
}: {
  task: Task;
  project?: Project;
  assignee?: TeamMember;
  cover?: { url: string; type: "image" | "video" | "link"; thumbUrl?: string | null } | null;
  isDragging?: boolean;
  onClick?: () => void;
  onProjectClick?: (projectId: string) => void;
  onDuplicate?: (task: Task) => void;
}) {
  const completedChecklist = task.checklist.filter((item) => item.completed).length;
  const totalChecklist = task.checklist.length;
  const checklistProgress = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0;

  const dueDate = new Date(task.dueDate);
  const formattedDate = dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Determine date color based on due date
  const getDueDateColor = () => {
    if (isPast(dueDate) && !isToday(dueDate)) {
      return "text-red-600 font-semibold"; // Overdue
    }
    if (isToday(dueDate) || isTomorrow(dueDate)) {
      return "text-orange-600 font-medium"; // Due soon
    }
    const daysUntilDue = differenceInDays(dueDate, new Date());
    if (daysUntilDue <= 3) {
      return "text-amber-600"; // Due within 3 days
    }
    return "text-muted-foreground"; // Normal
  };

  return (
    <Card
      onClick={onClick}
      className={`group relative mb-3 bg-background border border-border/60 rounded-xl transition-all duration-200 cursor-pointer active:cursor-grabbing hover:border-border hover:shadow-md ${isDragging ? "opacity-40 scale-95" : ""}`}>
      {/* Left edge stage color stripe */}
      <div className={`absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b ${stageConfig[task.stage as ProjectStage["name"]]?.accent ?? "from-slate-400 to-slate-500"}`} />

      <div className="pl-3.5 pr-3.5 pt-3 pb-3 space-y-2.5">
        {cover?.url && (
          <div className="overflow-hidden rounded-lg border bg-background -mx-0.5">
            <div className="aspect-[16/9] w-full">
              {cover.type === "image" ? (
                <img src={cover.url} alt={`${task.title} preview`} className="h-full w-full object-cover" />
              ) : cover.type === "video" ? (
                (() => {
                  const embed = getEmbedInfo(cover.url);
                  if (embed.type !== "link") {
                    return (
                      <iframe
                        src={embed.embedUrl}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`${task.title} preview`}
                      />
                    );
                  }
                  if (isDirectVideoUrl(cover.url)) {
                    return (
                      <video
                        src={cover.url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        loop
                        autoPlay
                      />
                    );
                  }
                  return (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                  );
                })()
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                  Link
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage badge + Priority label */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${stageConfig[task.stage as ProjectStage["name"]]?.badge ?? ""} ${stageConfig[task.stage as ProjectStage["name"]]?.badgeText ?? ""}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stageConfig[task.stage as ProjectStage["name"]]?.dot ?? "bg-slate-400"}`} />
            {task.stage}
          </span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 border border-border/40 text-muted-foreground`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[task.priority]?.dot ?? "bg-slate-400"}`} />
            {priorityConfig[task.priority]?.label ?? task.priority}
          </span>
        </div>

        {/* Title + Duplicate */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-[13px] line-clamp-2 leading-tight">{task.title}</h3>
              <div className="flex items-center gap-0.5 shrink-0">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                {onDuplicate && (
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground/50 transition hover:text-foreground opacity-0 group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDuplicate(task);
                    }}
                    aria-label="Duplicate task"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {project && (
              <button
                type="button"
                className="flex items-center gap-1 mt-1 text-left"
                onClick={(event) => {
                  event.stopPropagation();
                  onProjectClick?.(project.id);
                }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                <span className="text-[11px] text-muted-foreground truncate hover:text-foreground transition-colors">{project.name}</span>
              </button>
            )}
          </div>
        </div>

        {/* Checklist progress bar */}
        {totalChecklist > 0 && (
          <div className="space-y-1">
            <Progress value={checklistProgress} className="h-1" />
          </div>
        )}

        {/* Metadata row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center gap-1 ${getDueDateColor()}`}>
              <Calendar className="w-3 h-3" />
              <span>{formattedDate}</span>
            </div>

            {totalChecklist > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckSquare className="w-3 h-3" />
                <span>{completedChecklist}/{totalChecklist}</span>
              </div>
            )}

            {task.commentCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="w-3 h-3" />
                <span>{task.commentCount}</span>
              </div>
            )}
          </div>

          {assignee && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="w-6 h-6 border-2 border-background shadow-sm">
                    <AvatarImage src={assignee.avatar ?? undefined} alt={assignee.name} />
                    <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                      {assignee.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">{assignee.name}</p>
                  <p className="text-xs text-muted-foreground">{assignee.role}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </Card>
  );
}

function DraggableTaskCard({
  task,
  project,
  assignee,
  cover,
  onClick,
  onProjectClick,
  onDuplicate,
}: {
  task: Task;
  project?: Project;
  assignee?: TeamMember;
  cover?: { url: string; type: "image" | "video" | "link"; thumbUrl?: string | null } | null;
  onClick?: () => void;
  onProjectClick?: (projectId: string) => void;
  onDuplicate?: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: task.id,
    data: {
      type: "task",
      stage: task.stage,
      task,
      project,
      assignee,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <div
        className={`transition-all duration-200 ${
          isDragging ? "ring-2 ring-primary/40 shadow-2xl rounded-xl scale-[1.02]" : ""
        }`}
      >
        <TaskCard
          task={task}
          project={project}
          assignee={assignee}
          cover={cover}
          isDragging={isDragging}
          onClick={onClick}
          onProjectClick={onProjectClick}
          onDuplicate={onDuplicate}
        />
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  tasks,
  projects,
  teamMembers,
  onTaskClick,
  onProjectClick,
  taskCoverMap,
  orderedTaskIds,
  onDuplicate,
}: {
  stage: ProjectStage["name"];
  tasks: Task[];
  projects?: Project[];
  teamMembers?: TeamMember[];
  onTaskClick?: (taskId: string) => void;
  onProjectClick?: (projectId: string) => void;
  taskCoverMap?: Map<string, { url: string; type: "image" | "video" | "link"; thumbUrl?: string | null }>;
  orderedTaskIds?: string[];
  onDuplicate?: (task: Task) => void;
}) {
  const stageTasks = tasks.filter((task) => task.stage === stage);

  const stageTaskIds = useMemo(() => {
    const idsInStage = new Set(stageTasks.map((t) => t.id));
    const ordered = (orderedTaskIds ?? []).filter((id) => idsInStage.has(id));
    const missing = stageTasks
      .filter((t) => !ordered.includes(t.id))
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
      .map((t) => t.id);
    return [...ordered, ...missing];
  }, [orderedTaskIds, stageTasks]);

  const orderedStageTasks = useMemo(() => {
    const byId = new Map(stageTasks.map((t) => [t.id, t] as const));
    return stageTaskIds.map((id) => byId.get(id)).filter(Boolean) as Task[];
  }, [stageTaskIds, stageTasks]);

  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: "column",
      stage,
    },
  });

  return (
    <div ref={setNodeRef} className="flex flex-col min-w-[280px] sm:min-w-[300px] max-w-[300px]">
      {/* Column header */}
      <div className="px-3 py-3 rounded-t-xl bg-background border border-b-0 border-border/60">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${stageConfig[stage]?.dot ?? "bg-slate-400"}`} />
            <h2 className="font-semibold text-sm text-foreground">{stage}</h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {stageTasks.length}
          </span>
        </div>
      </div>

      <div
        className={`flex-1 px-2 py-2 rounded-b-xl border border-t-0 border-border/60 ${stageConfig[stage]?.bg ?? "bg-slate-50/40"} min-h-[500px] transition-all duration-200 ${
          isOver ? `ring-2 ${stageConfig[stage]?.dropRing ?? "ring-slate-400"} ring-offset-1` : ""
        }`}>
        <SortableContext items={stageTaskIds} strategy={verticalListSortingStrategy}>
          {orderedStageTasks.map((task) => {
            const project = projects?.find((p) => p.id === task.projectId);
            const assignee = teamMembers?.find((tm) => tm.id === task.assigneeId);
            const cover = taskCoverMap?.get(task.id) || null;

            return (
              <DraggableTaskCard
                key={task.id}
                task={task}
                project={project}
                assignee={assignee}
                cover={cover}
                onClick={() => onTaskClick?.(task.id)}
                onProjectClick={onProjectClick}
                onDuplicate={onDuplicate}
              />
            );
          })}
        </SortableContext>

        {stageTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <ListTodo className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground">No tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsBoardPage() {
  type StageName = ProjectStage["name"];
  const STORAGE_KEY = "projectsBoard.taskOrderByStage.v1";

  const [activeTask, setActiveTask] = useState<{
    task: Task;
    project?: Project;
    assignee?: TeamMember;
    cover?: { url: string; type: "image" | "video" | "link"; thumbUrl?: string | null } | null;
  } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [coverVersion, setCoverVersion] = useState(0);

  const { mutate: updateTask } = useUpdate();
  const { mutate: deleteTask } = useDelete();
  const { mutate: createTask } = useCreate();
  const go = useGo();

  const [taskOrderByStage, setTaskOrderByStage] = useState<Record<StageName, string[]>>(() => {
    const empty: Record<StageName, string[]> = {
      Unassigned: [],
      Todo: [],
      "In Progress": [],
      "In Review": [],
      Done: [],
    };

    if (typeof window === "undefined") return empty;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return empty;
      const parsed = JSON.parse(raw) as Partial<Record<StageName, string[]>>;
      const sanitized = Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : []]),
      );
      return { ...empty, ...(sanitized as Partial<Record<StageName, string[]>>) };
    } catch {
      return empty;
    }
  });

  // Fetch all tasks
  const {
    result: { data: tasks = [] },
    query: { isLoading: tasksLoading, refetch: refetchTasks },
  } = useList<Task>({
    resource: "tasks",
    pagination: {
      mode: "off",
    },
  });

  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const displayTasks = localTasks ?? tasks;

  const taskIds = useMemo(() => displayTasks.map((task) => task.id), [displayTasks]);

  const {
    result: { data: attachmentsData = [] },
    query: { isLoading: attachmentsLoading, refetch: refetchAttachments },
  } = useList<Attachment>({
    resource: "attachments",
    pagination: {
      mode: "off",
    },
    filters: [
      {
        field: "taskId",
        operator: "in",
        value: taskIds,
      },
    ],
    queryOptions: {
      enabled: taskIds.length > 0,
    },
  });

  const taskCoverMap = useMemo(() => {
    const map = new Map<string, { url: string; type: "image" | "video" | "link"; thumbUrl?: string | null }>();
    const byTask = new Map<string, Attachment[]>();
    (attachmentsData || []).forEach((attachment) => {
      const list = byTask.get(attachment.taskId) ?? [];
      list.push(attachment);
      byTask.set(attachment.taskId, list);
    });

    byTask.forEach((list, taskId) => {
      const storedCoverId = typeof window !== "undefined" ? window.localStorage.getItem(`task-cover:${taskId}`) : null;
      const sorted = [...list].sort((a, b) => {
        const bPrimary = Boolean(b.isPrimary || (storedCoverId && b.id === storedCoverId));
        const aPrimary = Boolean(a.isPrimary || (storedCoverId && a.id === storedCoverId));
        return Number(bPrimary) - Number(aPrimary);
      });
      const selected = sorted.find((attachment) => attachment.isPrimary || (storedCoverId && attachment.id === storedCoverId));
      if (selected?.fileUrl) {
        const fileUrl = selected.fileUrl;
        const type = selected.fileType || "";
        const isVideoLink = /youtu\.be|youtube\.com|tiktok\.com|instagram\.com/i.test(fileUrl);
        const youTubeMatch = fileUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
        const thumbUrl = youTubeMatch?.[1]
          ? `https://img.youtube.com/vi/${youTubeMatch[1]}/hqdefault.jpg`
          : `data:image/svg+xml;utf8,${encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="320" cy="180" r="56" fill="rgba(255,255,255,0.15)"/><polygon points="308,155 308,205 360,180" fill="white"/></svg>'
            )}`;
        if (type.startsWith("video") || isVideoLink) {
          map.set(taskId, { url: fileUrl, type: "video", thumbUrl });
        } else if (type.startsWith("image") || /\.(png|jpe?g|gif|webp|svg)$/i.test(fileUrl)) {
          map.set(taskId, { url: fileUrl, type: "image" });
        } else {
          map.set(taskId, { url: fileUrl, type: "link" });
        }
      }
    });
    return map;
  }, [attachmentsData, coverVersion]);

  useEffect(() => {
    const handler = () => {
      refetchAttachments?.();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("task-attachments-updated", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("task-attachments-updated", handler);
      }
    };
  }, [refetchAttachments]);

  useEffect(() => {
    const handler = () => {
      setCoverVersion((v) => v + 1);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("task-cover-updated", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("task-cover-updated", handler);
      }
    };
  }, []);

  // Get all unique project IDs
  const projectIds = [...new Set(tasks.map((task: Task) => task.projectId))].filter(Boolean) as string[];

  // Get all unique assignee IDs
  const assigneeIds = [...new Set(tasks.map((task: Task) => task.assigneeId))].filter(Boolean) as string[];

  // Fetch related projects
  const {
    result: { data: projects = [] },
    query: { isLoading: projectsLoading },
  } = useMany<Project>({
    resource: "projects",
    ids: projectIds,
    queryOptions: {
      enabled: projectIds.length > 0,
    },
  });

  // Fetch related team members
  const {
    result: { data: teamMembers = [] },
    query: { isLoading: teamMembersLoading },
  } = useMany<TeamMember>({
    resource: "teamMembers",
    ids: assigneeIds,
    queryOptions: {
      enabled: assigneeIds.length > 0,
    },
  });

  const isLoading = tasksLoading || projectsLoading || teamMembersLoading || attachmentsLoading;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
  );

  const tasksById = useMemo(() => new Map(displayTasks.map((t) => [t.id, t] as const)), [displayTasks]);

  useEffect(() => {
    if (!displayTasks.length) return;
    setTaskOrderByStage((prev) => {
      const next: Record<StageName, string[]> = { ...prev } as Record<StageName, string[]>;
      for (const stage of projectStages) {
        const idsInStage = displayTasks.filter((t) => t.stage === stage).map((t) => t.id);
        const setInStage = new Set(idsInStage);
        const kept = (next[stage] ?? []).filter((id) => setInStage.has(id));
        const missing = idsInStage.filter((id) => !kept.includes(id));
        next[stage] = [...kept, ...missing];
      }
      return next;
    });
  }, [displayTasks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(taskOrderByStage));
    } catch {
      // ignore
    }
  }, [taskOrderByStage]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = String(active.id);
    const task = tasksById.get(taskId);
    if (!task) return;
    const project = projects.find((p) => p.id === task.projectId);
    const assignee = teamMembers.find((tm) => tm.id === task.assigneeId);
    const cover = taskCoverMap.get(taskId) || null;
    setActiveTask({ task, project, assignee, cover });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeData = active.data.current as { type?: string; stage?: StageName } | undefined;
    const overData = over.data.current as { type?: string; stage?: StageName } | undefined;

    const fromStage = (activeData?.stage ?? tasksById.get(activeId)?.stage) as StageName | undefined;
    const toStage = (overData?.type === "column"
      ? ((overData.stage ?? overId) as StageName)
      : (overData?.stage ?? tasksById.get(overId)?.stage)) as StageName | undefined;

    if (!fromStage || !toStage) return;

    setTaskOrderByStage((prev) => {
      const next: Record<StageName, string[]> = { ...prev } as Record<StageName, string[]>;
      next[fromStage] = [...(next[fromStage] ?? [])];
      next[toStage] = [...(next[toStage] ?? [])];

      if (!next[fromStage].includes(activeId)) {
        next[fromStage].push(activeId);
      }

      if (fromStage === toStage) {
        if (activeId === overId) return prev;
        const oldIndex = next[fromStage].indexOf(activeId);
        const newIndex = next[toStage].indexOf(overId);
        if (oldIndex >= 0 && newIndex >= 0) {
          next[fromStage] = arrayMove(next[fromStage], oldIndex, newIndex);
        }
        return next;
      }

      next[fromStage] = next[fromStage].filter((id) => id !== activeId);
      const overIndex = next[toStage].indexOf(overId);
      const insertIndex = overData?.type === "column" || overIndex < 0 ? next[toStage].length : overIndex;
      next[toStage] = [...next[toStage].slice(0, insertIndex), activeId, ...next[toStage].slice(insertIndex)];
      return next;
    });

    if (fromStage !== toStage) {
      setLocalTasks((prev) => {
        const current = prev ?? tasks;
        return current.map((t) => (t.id === activeId ? { ...t, stage: toStage } : t));
      });

      updateTask(
        {
          resource: "tasks",
          id: activeId,
          values: {
            stage: toStage,
          },
          mutationMode: "optimistic",
        },
        {
          onSuccess: () => {
            console.log(`Task moved to ${toStage}`);
            if (toStage === "Done") {
              const t = tasksById.get(activeId);
              logEngagementEvent("task_moved_done", { id: activeId, title: t?.title });
            }
            refetchTasks();
          },
          onError: () => {
            // Best effort rollback by refetching authoritative state.
            refetchTasks();
          },
        },
      );
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
  };

  const handleTaskEdit = (taskId: string) => {
    go?.({ to: { resource: "tasks", action: "edit", id: taskId } });
  };

  const handleTaskDelete = (taskId: string) => {
    deleteTask(
      {
        resource: "tasks",
        id: taskId,
        mutationMode: "optimistic",
      },
      {
        onSuccess: () => {
          console.log("Task deleted successfully");
          setIsModalOpen(false);
          refetchTasks();
        },
      },
    );
  };

  const handleTaskDuplicate = (task: Task) => {
    const duplicated = {
      projectId: task.projectId,
      title: `${task.title} (Copy)`,
      description: task.description,
      stage: task.stage,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
      priority: task.priority,
      checklist: task.checklist,
      commentCount: 0,
      attachmentCount: task.attachmentCount ?? 0,
    };

    createTask(
      {
        resource: "tasks",
        values: duplicated,
      },
      {
        onSuccess: async (result) => {
          const newTaskId = result?.data?.id ?? result?.data?.[0]?.id;
          if (newTaskId) {
            const { data: sourceAttachments, error: fetchError } = await supabaseClient
              .from("attachments")
              .select("id, file_name, file_url, file_size, file_type, is_primary")
              .eq("task_id", task.id);

            if (fetchError) {
              console.error("Failed to load attachments for duplication:", fetchError);
            } else if (sourceAttachments && sourceAttachments.length > 0) {
              const {
                data: { user },
              } = await supabaseClient.auth.getUser();
              const uploaderId = user?.id ?? null;
              const payload = sourceAttachments.map((attachment) => ({
                task_id: newTaskId,
                file_name: attachment.file_name,
                file_url: attachment.file_url ?? null,
                file_size: attachment.file_size ?? null,
                file_type: attachment.file_type ?? "image",
                is_primary: Boolean(attachment.is_primary),
                uploaded_by: uploaderId,
              }));
              const { error } = await supabaseClient.from("attachments").insert(payload);
              if (error) {
                console.error("Failed to duplicate attachments:", error);
              } else {
                refetchAttachments?.();
              }
            }
          }
          refetchTasks();
        },
      },
    );
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  const totalTasks = displayTasks.length;
  const overdueTasks = displayTasks.filter((t) => isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.stage !== "Done").length;
  const doneTasks = displayTasks.filter((t) => t.stage === "Done").length;
  const inProgressTasks = displayTasks.filter((t) => t.stage === "In Progress").length;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}>
        <div className="p-4 sm:p-6 space-y-5" style={{ WebkitUserSelect: "none", userSelect: "none" }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tasks</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track and manage tasks across all projects</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="default" className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>

          {/* KPI row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40">
              <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{totalTasks} total</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/40 dark:border-amber-800/40">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{inProgressTasks} in progress</span>
            </div>
            {overdueTasks > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50/80 dark:bg-red-950/30 border border-red-200/40 dark:border-red-800/40">
                <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                <span className="text-xs font-medium text-red-700 dark:text-red-300">{overdueTasks} overdue</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/40 dark:border-emerald-800/40">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{doneTasks} done</span>
            </div>
          </div>

          {/* Board */}
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory">
            {projectStages.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                tasks={displayTasks}
                projects={projects}
                teamMembers={teamMembers}
                onTaskClick={handleTaskClick}
                onProjectClick={handleProjectClick}
                taskCoverMap={taskCoverMap}
                orderedTaskIds={taskOrderByStage[stage]}
                onDuplicate={handleTaskDuplicate}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 scale-105 opacity-90">
              <TaskCard
                task={activeTask.task}
                project={activeTask.project}
                assignee={activeTask.assignee}
                cover={activeTask.cover}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailModal
        taskId={selectedTaskId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onEdit={handleTaskEdit}
        onDelete={handleTaskDelete}
      />

      <ProjectDetailModal
        projectId={selectedProjectId}
        open={Boolean(selectedProjectId)}
        onOpenChange={(open) => {
          if (!open) setSelectedProjectId(null);
        }}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            action="create"
            onSuccess={() => {
              console.log("[PROJECT BOARD] Task creation success callback triggered");
              console.log("[PROJECT BOARD] Closing dialog and calling refetchTasks");
              setIsCreateDialogOpen(false);
              refetchTasks();
              console.log("[PROJECT BOARD] refetchTasks called");
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
