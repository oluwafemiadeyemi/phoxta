import { useGetIdentity, useOne, useList, useUpdate, useCreate, useDelete } from "@refinedev/core";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@crm/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/components/ui/avatar";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import { Checkbox } from "@crm/components/ui/checkbox";
import { Separator } from "@crm/components/ui/separator";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { Textarea } from "@crm/components/ui/textarea";
import type { Task, TeamMember, Project, Comment, Attachment, AttachmentComment } from "@crm/types";
import {
  Calendar,
  Flag,
  Folder,
  MessageSquare,
  Paperclip,
  Edit,
  Trash2,
  FileText,
  FileImage,
  FileCode,
  File,
  Instagram,
} from "lucide-react";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@crm/lib/supabase";

interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

const priorityColors: Record<Task["priority"], string> = {
  Low: "bg-gray-500",
  Medium: "bg-blue-500",
  High: "bg-orange-500",
  Urgent: "bg-red-500",
};

const priorityBadgeColors: Record<Task["priority"], string> = {
  Low: "bg-gray-100 text-gray-700 border-gray-300",
  Medium: "bg-blue-100 text-blue-700 border-blue-300",
  High: "bg-orange-100 text-orange-700 border-orange-300",
  Urgent: "bg-red-100 text-red-700 border-red-300",
};

const getFileIcon = (fileType: string) => {
  if (fileType?.startsWith("image/")) {
    return <FileImage className="w-4 h-4 text-blue-500" />;
  }
  switch (fileType) {
    case "image":
      return <FileImage className="w-4 h-4 text-blue-500" />;
    case "code":
      return <FileCode className="w-4 h-4 text-green-500" />;
    case "pdf":
      return <FileText className="w-4 h-4 text-red-500" />;
    case "figma":
      return <FileText className="w-4 h-4 text-purple-500" />;
    case "json":
      return <FileCode className="w-4 h-4 text-yellow-600" />;
    default:
      return <File className="w-4 h-4 text-gray-500" />;
  }
};

const formatFileSize = (size?: string | number) => {
  const value = typeof size === "string" ? Number(size) : size ?? 0;
  if (!Number.isFinite(value) || value <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const formatted = value / Math.pow(1024, index);
  return `${formatted.toFixed(formatted >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
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
    return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${youTubeId}`, thumbUrl: `https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg` };
  }
  const tikTokId = extractTikTokId(url);
  if (tikTokId) {
    return { type: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${tikTokId}` };
  }
  const instaMatch = extractInstagramCode(url);
  if (instaMatch) {
    return {
      type: "instagram",
      embedUrl: `https://www.instagram.com/${instaMatch.kind}/${instaMatch.code}/embed/`,
      thumbUrl: `https://www.instagram.com/${instaMatch.kind}/${instaMatch.code}/media/?size=l`,
    };
  }
  return { type: "link" };
};

const inferAttachmentType = (url: string) => {
  const embed = getEmbedInfo(url);
  if (embed.type !== "link") return "video";
  if (/\.(mp4|mov|webm|ogg)$/i.test(url)) return "video";
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(url)) return "image";
  return "link";
};

export function TaskDetailModal({ taskId, open, onOpenChange, onEdit, onDelete }: TaskDetailModalProps) {
  const { mutate: updateTask } = useUpdate();
  const { mutate: createAttachmentComment } = useCreate();
  const { mutate: updateAttachmentComment } = useUpdate();
  const { mutate: deleteAttachmentComment } = useDelete();
  const { data: identity } = useGetIdentity() as { data?: { id?: string } };
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [commentAttachment, setCommentAttachment] = useState<Attachment | null>(null);
  const [attachmentCommentInput, setAttachmentCommentInput] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [currentTeamMemberId, setCurrentTeamMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!identity?.id) return;
    supabaseClient
      .from("team_members")
      .select("id")
      .eq("user_id", identity.id)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load team member:", error);
          return;
        }
        setCurrentTeamMemberId(data?.id ?? null);
      });
  }, [identity?.id]);

  // Fetch task details
  const {
    query: { data: task, isLoading: taskLoading },
  } = useOne<Task>({
    resource: "tasks",
    id: taskId || "",
    queryOptions: {
      enabled: !!taskId,
    },
  });

  // Fetch assignee
  const {
    query: { data: assignee },
  } = useOne<TeamMember>({
    resource: "teamMembers",
    id: task?.data?.assigneeId || "",
    queryOptions: {
      enabled: !!task?.data?.assigneeId,
    },
  });

  // Fetch project
  const {
    query: { data: project },
  } = useOne<Project>({
    resource: "projects",
    id: task?.data?.projectId || "",
    queryOptions: {
      enabled: !!task?.data?.projectId,
    },
  });

  // Fetch comments
  const {
    query: { data: commentsData },
  } = useList<Comment>({
    resource: "comments",
    filters: [
      {
        field: "taskId",
        operator: "eq",
        value: taskId,
      },
    ],
    queryOptions: {
      enabled: !!taskId,
    },
  });

  // Fetch comment authors
  const commentAuthorIds = [...new Set((commentsData?.data || []).map((c: Comment) => c.authorId))];
  const {
    query: { data: commentAuthorsData },
  } = useList<TeamMember>({
    resource: "teamMembers",
    filters: [
      {
        field: "id",
        operator: "in",
        value: commentAuthorIds,
      },
    ],
    queryOptions: {
      enabled: commentAuthorIds.length > 0,
    },
  });

  // Fetch attachments
  const {
    query: { data: attachmentsData, refetch: refetchAttachments },
  } = useList<Attachment>({
    resource: "attachments",
    filters: [
      {
        field: "taskId",
        operator: "eq",
        value: taskId,
      },
    ],
    queryOptions: {
      enabled: !!taskId,
    },
  });

  // Fetch attachment uploaders
  const uploaderIds = [...new Set((attachmentsData?.data || []).map((a: Attachment) => a.uploadedBy))];
  const {
    query: { data: uploadersData },
  } = useList<TeamMember>({
    resource: "teamMembers",
    filters: [
      {
        field: "userId",
        operator: "in",
        value: uploaderIds,
      },
    ],
    queryOptions: {
      enabled: uploaderIds.length > 0,
    },
  });

  const {
    query: { data: attachmentCommentsData, refetch: refetchAttachmentComments },
  } = useList<AttachmentComment>({
    resource: "attachmentComments",
    filters: [
      {
        field: "attachmentId",
        operator: "eq",
        value: commentAttachment?.id || "",
      },
    ],
    queryOptions: {
      enabled: Boolean(commentAttachment?.id),
    },
  });

  const attachmentComments = attachmentCommentsData?.data || [];
  const attachmentCommentAuthorIds = [...new Set(attachmentComments.map((comment) => comment.authorId).filter(Boolean))];
  const {
    query: { data: attachmentCommentAuthorsData },
  } = useList<TeamMember>({
    resource: "teamMembers",
    filters: [
      {
        field: "id",
        operator: "in",
        value: attachmentCommentAuthorIds,
      },
    ],
    queryOptions: {
      enabled: attachmentCommentAuthorIds.length > 0,
    },
  });

  const handleChecklistToggle = (checklistItemId: string, completed: boolean) => {
    if (!task?.data) return;

    const updatedChecklist = task.data.checklist.map((item: { id: string; text: string; completed: boolean }) =>
      item.id === checklistItemId ? { ...item, completed: !completed } : item,
    );

    updateTask({
      resource: "tasks",
      id: task.data.id,
      values: {
        checklist: updatedChecklist,
      },
      mutationMode: "optimistic",
    });
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const coverKey = taskId ? `task-cover:${taskId}` : null;

  const setPrimaryAttachment = async (attachmentId: string) => {
    if (!taskId) return;
    try {
      await supabaseClient.from("attachments").update({ is_primary: false }).eq("task_id", taskId);
      await supabaseClient.from("attachments").update({ is_primary: true }).eq("id", attachmentId);
      if (coverKey) {
        window.localStorage.setItem(coverKey, attachmentId);
      }
      refetchAttachments?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("task-cover-updated", { detail: { taskId, attachmentId } }));
      }
    } catch (error) {
      if (coverKey) {
        window.localStorage.setItem(coverKey, attachmentId);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("task-cover-updated", { detail: { taskId, attachmentId } }));
      }
      console.error("Failed to set primary attachment:", error);
    }
  };

  const clearPrimaryAttachment = async () => {
    if (!taskId) return;
    try {
      await supabaseClient.from("attachments").update({ is_primary: false }).eq("task_id", taskId);
      if (coverKey) {
        window.localStorage.removeItem(coverKey);
      }
      refetchAttachments?.();
      if (taskId) {
        window.dispatchEvent(new CustomEvent("task-cover-updated", { detail: { taskId, attachmentId: null } }));
      }
    } catch (error) {
      console.error("Failed to clear primary attachment:", error);
    }
  };

  const handleAddAttachmentComment = () => {
    if (!commentAttachment?.id || !attachmentCommentInput.trim()) return;
    createAttachmentComment(
      {
        resource: "attachmentComments",
        values: {
          attachmentId: commentAttachment.id,
          authorId: currentTeamMemberId,
          content: attachmentCommentInput.trim(),
        },
      },
      {
        onSuccess: () => {
          setAttachmentCommentInput("");
          refetchAttachmentComments?.();
        },
      },
    );
  };

  const handleStartEditComment = (comment: AttachmentComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const handleSaveEditedComment = () => {
    if (!editingCommentId || !editingCommentText.trim()) return;
    updateAttachmentComment(
      {
        resource: "attachmentComments",
        id: editingCommentId,
        values: {
          content: editingCommentText.trim(),
        },
      },
      {
        onSuccess: () => {
          setEditingCommentId(null);
          setEditingCommentText("");
          refetchAttachmentComments?.();
        },
      },
    );
  };

  const handleDeleteComment = (commentId: string) => {
    deleteAttachmentComment(
      {
        resource: "attachmentComments",
        id: commentId,
      },
      {
        onSuccess: () => {
          refetchAttachmentComments?.();
        },
      },
    );
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!taskId) return;
    try {
      if (attachment.fileUrl?.includes("/storage/v1/object/public/task_attachments/")) {
        const path = attachment.fileUrl.split("/storage/v1/object/public/task_attachments/")[1];
        if (path) {
          await supabaseClient.storage.from("task_attachments").remove([path]);
        }
      }
      await supabaseClient.from("attachments").delete().eq("id", attachment.id);

      if (coverKey) {
        const storedCoverId = window.localStorage.getItem(coverKey);
        if (storedCoverId === attachment.id) {
          window.localStorage.removeItem(coverKey);
          window.dispatchEvent(new CustomEvent("task-cover-updated", { detail: { taskId, attachmentId: null } }));
        }
      }

      refetchAttachments?.();
      if (taskId) {
        window.dispatchEvent(new CustomEvent("task-attachments-updated", { detail: { taskId } }));
      }
    } catch (error) {
      console.error("Failed to delete attachment:", error);
    }
  };

  const handleAttachmentUpload = async (files: FileList | File[]) => {
    if (!taskId) return;
    setIsUploading(true);
    try {
      const list = Array.from(files);
      const uploads = list.map(async (file) => {
        const extension = file.name.split(".").pop() || "png";
        const path = `${taskId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabaseClient.storage.from("task_attachments").upload(path, file, {
          upsert: true,
          contentType: file.type || "image/png",
        });

        let fileUrl: string | null = null;
        if (!uploadError) {
          const { data } = supabaseClient.storage.from("task_attachments").getPublicUrl(path);
          fileUrl = data.publicUrl;
        } else {
          fileUrl = await readAsDataUrl(file);
        }

        return supabaseClient.from("attachments").insert({
          task_id: taskId,
          file_name: file.name,
          file_url: fileUrl,
          file_type: file.type || "image",
          file_size: file.size,
          uploaded_by: identity?.id || null,
        });
      });

      await Promise.all(uploads);

      refetchAttachments?.();
    } catch (error) {
      console.error("Failed to upload attachment:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!taskId || !linkInput.trim()) return;
    const url = linkInput.trim();
    const type = inferAttachmentType(url);
    const name = (() => {
      try {
        const parsed = new URL(url);
        return parsed.hostname.replace("www.", "");
      } catch {
        return "Link";
      }
    })();

    setIsUploading(true);
    try {
      const { error } = await supabaseClient.from("attachments").insert({
        task_id: taskId,
        file_name: name,
        file_url: url,
        file_type: type,
        file_size: 0,
        uploaded_by: identity?.id || null,
      });
      if (error) throw error;
      setLinkInput("");
      refetchAttachments?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("task-attachments-updated", { detail: { taskId } }));
      }
    } catch (error) {
      console.error("Failed to add link:", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!taskId || taskLoading || !task?.data) {
    return null;
  }

  const taskData = task.data;
  const assigneeData = assignee?.data;
  const projectData = project?.data;
  const comments = commentsData?.data || [];
  const commentAuthors = commentAuthorsData?.data || [];
  const attachments = attachmentsData?.data || [];
  const uploaders = uploadersData?.data || [];

  const completedChecklist = taskData.checklist.filter((item: { completed: boolean }) => item.completed).length;
  const totalChecklist = taskData.checklist.length;
  const checklistProgress = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
            <DialogHeader className="space-y-4 pr-12">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-8 rounded-full ${priorityColors[taskData.priority as Task["priority"]]}`} />
                    <DialogTitle className="text-2xl font-bold">{taskData.title}</DialogTitle>
                  </div>
                  {projectData && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Folder className="w-4 h-4" />
                      <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: projectData.color }} />
                        {projectData.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onEdit(taskData.id);
                        onOpenChange(false);
                      }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onDelete(taskData.id);
                        onOpenChange(false);
                      }}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
              <DialogDescription className="text-base">{taskData.description}</DialogDescription>
            </DialogHeader>

            <Separator className="my-6" />

            {/* Task Metadata */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Assignee */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span>Assignee</span>
                </div>
                {assigneeData ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 border-2 border-background shadow-sm">
                      <AvatarImage src={assigneeData.avatar ?? undefined} alt={assigneeData.name} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {assigneeData.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{assigneeData.name}</p>
                      <p className="text-xs text-muted-foreground">{assigneeData.role}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Due Date</span>
                </div>
                <p className="text-sm font-medium">{format(new Date(taskData.dueDate), "MMM dd, yyyy")}</p>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Flag className="w-4 h-4" />
                  <span>Priority</span>
                </div>
                <Badge variant="outline" className={priorityBadgeColors[taskData.priority as Task["priority"]]}>
                  {taskData.priority}
                </Badge>
              </div>

              {/* Stage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span>Stage</span>
                </div>
                <Badge variant="outline">{taskData.stage}</Badge>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Checklist */}
            {totalChecklist > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Checklist</h3>
                  <span className="text-sm text-muted-foreground">
                    {completedChecklist} of {totalChecklist} ({checklistProgress}%)
                  </span>
                </div>
                <div className="space-y-3">
                  {taskData.checklist.map((item: { id: string; text: string; completed: boolean }) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={item.id}
                        checked={item.completed}
                        onCheckedChange={() => handleChecklistToggle(item.id, item.completed)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={item.id}
                        className={`flex-1 text-sm cursor-pointer ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                        {item.text}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalChecklist > 0 && <Separator className="my-6" />}

            {/* Comments */}
            {comments.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Comments</h3>
                  <span className="text-sm text-muted-foreground">({comments.length})</span>
                </div>
                <div className="space-y-4">
                  {comments.map((comment: Comment) => {
                    const author = commentAuthors.find((a: TeamMember) => a.id === comment.authorId);
                    return (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8 border-2 border-background shadow-sm flex-shrink-0">
                          <AvatarImage src={author?.avatar ?? undefined} alt={author?.name} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {author?.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{author?.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {comments.length > 0 && attachments.length > 0 && <Separator className="my-6" />}

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Attachments</h3>
                  <span className="text-sm text-muted-foreground">({attachments.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                    ref={fileInputRef}
                    type="file"
                      accept="image/*,video/*"
                      multiple
                    className="hidden"
                    onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleAttachmentUpload(files);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                      {isUploading ? "Uploading..." : "Upload media"}
                  </Button>
                </div>
              </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={linkInput}
                    onChange={(event) => setLinkInput(event.target.value)}
                    placeholder="Paste image or video link (YouTube, TikTok, Instagram)"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  />
                  <Button type="button" size="sm" variant="outline" disabled={isUploading} onClick={handleAddLink}>
                    Add link
                  </Button>
                </div>
              {attachments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Add an image to highlight this task on the board.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {attachments.map((attachment: Attachment) => {
                    const uploader = uploaders.find((u: TeamMember) => u.userId === attachment.uploadedBy);
                    const storedCoverId = coverKey ? window.localStorage.getItem(coverKey) : null;
                    const isCover = Boolean(attachment.isPrimary || storedCoverId === attachment.id);
                    const embed = attachment.fileUrl ? getEmbedInfo(attachment.fileUrl) : { type: "link" };
                    return (
                      <div className="overflow-hidden rounded-lg border bg-background/60 text-left backdrop-blur-md shadow-sm">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(attachment)}
                          className="relative w-full"
                        >
                          {attachment.fileUrl && attachment.fileType?.startsWith("video/") ? (
                            <video
                              src={attachment.fileUrl}
                              className="h-28 w-full object-cover pointer-events-none"
                              controls={false}
                            />
                          ) : attachment.fileUrl && embed.type === "instagram" ? (
                            <div className="flex h-28 w-full items-center justify-center gap-2 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 text-white">
                              <Instagram className="h-5 w-5" />
                              <span className="text-xs font-medium">Instagram link</span>
                            </div>
                          ) : attachment.fileUrl && embed.type !== "link" ? (
                            <iframe
                              src={embed.embedUrl}
                              className="h-28 w-full pointer-events-none"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={attachment.fileName}
                            />
                          ) : attachment.fileUrl ? (
                            <img src={attachment.fileUrl} alt={attachment.fileName} className="h-28 w-full object-cover" />
                          ) : (
                            <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">
                              {attachment.fileName}
                            </div>
                          )}
                          {isCover && (
                            <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-white">
                              Cover
                            </span>
                          )}
                        </button>
                        <div className="p-2">
                          <div className="text-xs font-medium truncate">{attachment.fileName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatFileSize(attachment.fileSize)} • {uploader?.name || ""}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-xs font-medium">
                              <Checkbox
                                checked={isCover}
                                onCheckedChange={(value) => {
                                  if (value) {
                                    setPrimaryAttachment(attachment.id);
                                  } else {
                                    clearPrimaryAttachment();
                                  }
                                }}
                                onClick={(event) => event.stopPropagation()}
                              />
                              Cover
                            </label>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCommentAttachment(attachment);
                                  setAttachmentCommentInput("");
                                  setEditingCommentId(null);
                                  setEditingCommentText("");
                                }}
                                aria-label="Comments"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteAttachment(attachment);
                                }}
                                aria-label="Delete attachment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewAttachment)} onOpenChange={(value) => !value && setPreviewAttachment(null)}>
        <DialogContent className="max-w-3xl bg-background/70 backdrop-blur-md border border-white/10 shadow-xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.fileName || "Preview"}</DialogTitle>
            <DialogDescription>Media preview</DialogDescription>
          </DialogHeader>
          {previewAttachment?.fileUrl ? (
            (() => {
              const url = previewAttachment.fileUrl;
              const embed = getEmbedInfo(url);
              const isDirectVideo = /\.(mp4|mov|webm|ogg)$/i.test(url);
              if (embed.type === "instagram") {
                return (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-muted/20 p-6">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Instagram className="h-5 w-5 text-pink-500" />
                      Instagram preview is restricted.
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={url} target="_blank" rel="noreferrer">
                        Open on Instagram
                      </a>
                    </Button>
                  </div>
                );
              }
              if (embed.type === "tiktok") {
                return (
                  <div className="w-full">
                    <iframe
                      src={embed.embedUrl}
                      className="h-[70vh] w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={previewAttachment.fileName}
                    />
                  </div>
                );
              }
              if (embed.type === "youtube" || embed.type === "tiktok" || embed.type === "instagram") {
                return (
                  <div className="aspect-video w-full">
                    <iframe
                      src={embed.embedUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={previewAttachment.fileName}
                    />
                  </div>
                );
              }
              if (previewAttachment.fileType?.startsWith("video/") || isDirectVideo) {
                return <video src={url} className="w-full max-h-[70vh]" controls />;
              }
              return <img src={url} alt={previewAttachment.fileName} className="max-h-[70vh] w-full object-contain" />;
            })()
          ) : (
            <div className="text-sm text-muted-foreground">No preview available.</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(commentAttachment)} onOpenChange={(value) => !value && setCommentAttachment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{commentAttachment?.fileName || "Attachment"} comments</DialogTitle>
            <DialogDescription>Add comments to this media or link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {attachmentComments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No comments yet.</div>
            ) : (
              <div className="space-y-3">
                {attachmentComments.map((comment) => {
                  const author = attachmentCommentAuthorsData?.data?.find((a) => a.id === comment.authorId);
                  const isEditing = editingCommentId === comment.id;
                  const canEdit = Boolean(comment.authorId && comment.authorId === currentTeamMemberId);
                  return (
                    <div key={comment.id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={author?.avatar ?? undefined} alt={author?.name} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {author?.name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-medium">{author?.name || "User"}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {comment.createdAt ? format(new Date(comment.createdAt), "MMM dd, yyyy 'at' h:mm a") : ""}
                            </div>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStartEditComment(comment)}
                              aria-label="Edit comment"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteComment(comment.id)}
                              aria-label="Delete comment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingCommentText}
                              onChange={(event) => setEditingCommentText(event.target.value)}
                              className="min-h-[80px]"
                            />
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={handleSaveEditedComment}>
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{comment.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <Textarea
                value={attachmentCommentInput}
                onChange={(event) => setAttachmentCommentInput(event.target.value)}
                placeholder="Add a comment..."
                className="min-h-[90px]"
              />
              <Button type="button" onClick={handleAddAttachmentComment}>
                Add comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
