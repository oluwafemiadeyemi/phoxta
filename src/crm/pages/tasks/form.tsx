import { type HttpError, useGetIdentity, useList } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useSelect } from "@refinedev/core";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Plus } from "lucide-react";
import React from "react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@crm/components/ui/form";
import { Input } from "@crm/components/ui/input";
import { Textarea } from "@crm/components/ui/textarea";
import { Button } from "@crm/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@crm/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@crm/components/ui/command";
import { Calendar } from "@crm/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/components/ui/avatar";
import { LoadingOverlay } from "@crm/components/refine-ui/layout/loading-overlay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@crm/components/ui/dialog";
import { useCreate } from "@refinedev/core";
import { cn } from "@crm/lib/utils";
import type { Task, Project, TeamMember, Attachment } from "@crm/types";
import { supabaseClient } from "@crm/lib/supabase";

const extractYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  return match?.[1] || null;
};

const extractTikTokId = (url: string) => {
  const match = url.match(/tiktok\.com\/.*\/video\/(\d+)/i);
  return match?.[1] || null;
};

const extractInstagramCode = (url: string) => {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/i);
  return match?.[1] || null;
};

const inferAttachmentType = (url: string) => {
  if (extractYouTubeId(url) || extractTikTokId(url) || extractInstagramCode(url)) return "video";
  if (/\.(mp4|mov|webm|ogg)$/i.test(url)) return "video";
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(url)) return "image";
  return "link";
};

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  projectId: z.string().min(1, "Project is required"),
  assigneeId: z.string().nullable(),
  dueDate: z.string(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  stage: z.enum(["Unassigned", "Todo", "In Progress", "In Review", "Done"]),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  action: "create" | "edit";
  id?: string;
  initialValues?: Partial<TaskFormValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TaskForm({ action, id, initialValues, onSuccess, onCancel }: TaskFormProps) {
  // State for project creation dialog
  const [isProjectDialogOpen, setIsProjectDialogOpen] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [newProjectDescription, setNewProjectDescription] = React.useState("");
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [pendingLinks, setPendingLinks] = React.useState<string[]>([]);
  const [linkInput, setLinkInput] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { data: identity } = useGetIdentity() as { data?: { id?: string } };

  const {
    result: { data: existingAttachments = [] },
  } = useList<Attachment>({
    resource: "attachments",
    filters: [
      {
        field: "taskId",
        operator: "eq",
        value: id,
      },
    ],
    queryOptions: {
      enabled: action === "edit" && Boolean(id),
    },
  });

  const {
    refineCore: { onFinish, formLoading, query },
    ...form
  } = useForm<Task, HttpError, TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: "",
      assigneeId: null,
      dueDate: "",
      priority: "Medium",
      stage: "Unassigned",
      ...(initialValues ?? {}),
    },
    refineCoreProps: {
      resource: "tasks",
      action,
      id,
      redirect: false,
      onMutationSuccess: async (result) => {
        const taskId = result?.data?.id || id;
        if (taskId && pendingFiles.length > 0) {
          await uploadAttachments(taskId);
        }
        if (onSuccess) {
          onSuccess();
        }
      },
    },
  });

  // Fetch projects for dropdown
  const { options: projectOptions, query: projectsQuery } = useSelect<Project>({
    resource: "projects",
    optionValue: "id",
    optionLabel: "name",
  });

  // Hook for creating new project
  const { mutate: createProject, mutation: createProjectMutation } = useCreate<Project>();

  // Fetch team members for assignee dropdown
  const { options: teamMemberOptions, query: teamMembersQuery } = useSelect<TeamMember>({
    resource: "teamMembers",
    optionValue: "id",
    optionLabel: "name",
    pagination: {
      mode: "off",
    },
  });

  // Create a map of team members for avatar lookup
  const teamMembersMap = React.useMemo(() => {
    const data = teamMembersQuery?.data?.data;
    if (!data) return new Map<string, TeamMember>();
    return new Map(data.map((member: TeamMember) => [member.id, member]));
  }, [teamMembersQuery?.data?.data]);

  // Handle project creation
  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    createProject(
      {
        resource: "projects",
        values: {
          name: newProjectName,
          description: newProjectDescription,
          color: "#3b82f6", // Default blue color
        },
      },
      {
        onSuccess: (data) => {
          // Close dialog
          setIsProjectDialogOpen(false);
          // Clear form
          setNewProjectName("");
          setNewProjectDescription("");
          // Refetch projects to update the list
          projectsQuery?.refetch();
          // Auto-select the newly created project
          if (data?.data?.id) {
            form.setValue("projectId", data.data.id);
          }
        },
      },
    );
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    const next = Array.from(files).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    if (next.length === 0) return;
    setPendingFiles((prev) => [...prev, ...next]);
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const uploadAttachments = async (taskId: string) => {
    if (pendingFiles.length === 0 && pendingLinks.length === 0) return;
    setIsUploading(true);
    try {
      const fileUploads = pendingFiles.map(async (file) => {
        const extension = file.name.split(".").pop() || "png";
        const path = `${taskId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabaseClient.storage.from("task_attachments").upload(path, file, {
          upsert: true,
          contentType: file.type || "image/png",
        });

        if (!uploadError) {
          const { data } = supabaseClient.storage.from("task_attachments").getPublicUrl(path);
          return supabaseClient.from("attachments").insert({
            task_id: taskId,
            file_name: file.name,
            file_url: data.publicUrl,
            file_type: file.type || "image",
            file_size: file.size,
            uploaded_by: identity?.id || null,
          });
        }

        const dataUrl = await readAsDataUrl(file);
        return supabaseClient.from("attachments").insert({
          task_id: taskId,
          file_name: file.name,
          file_url: dataUrl,
          file_type: file.type || "image",
          file_size: file.size,
          uploaded_by: identity?.id || null,
        });
      });

      const linkUploads = pendingLinks.map((url) => {
        const type = inferAttachmentType(url);
        const name = (() => {
          try {
            const parsed = new URL(url);
            return parsed.hostname.replace("www.", "");
          } catch {
            return "Link";
          }
        })();
        return supabaseClient.from("attachments").insert({
          task_id: taskId,
          file_name: name,
          file_url: url,
          file_type: type,
          file_size: 0,
          uploaded_by: identity?.id || null,
        });
      });

      await Promise.all([...fileUploads, ...linkUploads]);
      setPendingFiles([]);
      setPendingLinks([]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("task-attachments-updated", { detail: { taskId } }));
      }
    } catch (error) {
      console.error("Failed to upload task images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  function onSubmit(values: TaskFormValues) {
    const normalizedDueDate = values.dueDate ? values.dueDate : undefined;
    // Add additional fields required by Task type
    const taskData = {
      ...values,
      dueDate: normalizedDueDate,
      checklist: [],
      commentCount: 0,
      attachmentCount: 0,
      createdAt: new Date().toISOString(),
    };
    onFinish(taskData as any);
  }

  const isLoading = formLoading || (action === "edit" && query?.isLoading);

  return (
    <LoadingOverlay loading={isLoading}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title - Full width */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Project */}
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>
                    Project <span className="text-red-500">*</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("justify-between", !field.value && "text-muted-foreground")}
                          type="button">
                          {field.value
                            ? projectOptions?.find(
                                (option: { value: string | number; label: string }) => option.value === field.value,
                              )?.label
                            : "Select project..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search project..." />
                        <CommandList>
                          <CommandEmpty>No project found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setIsProjectDialogOpen(true);
                              }}
                              className="text-primary cursor-pointer">
                              <Plus className="mr-2 h-4 w-4" />
                              Create New Project
                            </CommandItem>
                            {projectOptions?.map((option: { value: string | number; label: string }) => (
                              <CommandItem
                                value={option.label}
                                key={option.value}
                                onSelect={() => {
                                  form.setValue("projectId", option.value as string);
                                }}>
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    option.value === field.value ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {option.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignee */}
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Assignee</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("justify-between", !field.value && "text-muted-foreground")}
                          type="button"
                          disabled={teamMembersQuery?.isLoading}>
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={teamMembersMap.get(field.value)?.avatar ?? undefined} />
                                <AvatarFallback>
                                  {teamMemberOptions
                                    ?.find((option: { value: string | number }) => option.value === field.value)
                                    ?.label?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {
                                  teamMemberOptions?.find(
                                    (option: { value: string | number }) => option.value === field.value,
                                  )?.label
                                }
                              </span>
                            </div>
                          ) : (
                            "Select assignee..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search team member..." />
                        <CommandList>
                          <CommandEmpty>No team member found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="unassigned"
                              onSelect={() => {
                                form.setValue("assigneeId", null);
                              }}>
                              <Check
                                className={cn("mr-2 h-4 w-4", field.value === null ? "opacity-100" : "opacity-0")}
                              />
                              <span className="text-muted-foreground">Unassigned</span>
                            </CommandItem>
                            {teamMemberOptions?.map((option: { value: string | number; label: string }) => {
                              const member = teamMembersMap.get(option.value as string);
                              return (
                                <CommandItem
                                  value={option.label}
                                  key={option.value}
                                  onSelect={() => {
                                    form.setValue("assigneeId", option.value as string);
                                  }}>
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      option.value === field.value ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <Avatar className="h-5 w-5 mr-2">
                                    <AvatarImage src={member?.avatar ?? undefined} />
                                    <AvatarFallback>{option.label?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  {option.label}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          type="button">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? new Date(field.value).toLocaleDateString() : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                          form.setValue("dueDate", date ? date.toISOString() : "");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stage */}
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Unassigned">Unassigned</SelectItem>
                      <SelectItem value="Todo">Todo</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Description - Full width */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter task description..." className="min-h-[120px] resize-y" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Images */}
          <div className="space-y-2">
            <FormLabel>Images</FormLabel>
            <div
              className={cn(
                "rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors",
                "hover:border-primary/60 hover:text-foreground",
              )}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.files?.length) {
                  handleFilesSelected(event.dataTransfer.files);
                }
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-foreground">Drag & drop images here</div>
                  <div>or upload from your computer</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files?.length) {
                        handleFilesSelected(event.target.files);
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Select images
                  </Button>
                </div>
              </div>
              {existingAttachments.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {existingAttachments.map((attachment) => (
                    <div key={attachment.id} className="overflow-hidden rounded-md border bg-background">
                      {attachment.fileUrl ? (
                        <img
                          src={attachment.fileUrl}
                          alt={attachment.fileName}
                          className="h-24 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                          {attachment.fileName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {pendingFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="rounded-md border bg-background px-2 py-1 text-xs">
                      {file.name}
                    </div>
                  ))}
                  {pendingLinks.map((link, index) => (
                    <div key={`${link}-${index}`} className="rounded-md border bg-background px-2 py-1 text-xs">
                      {link}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={linkInput}
                onChange={(event) => setLinkInput(event.target.value)}
                placeholder="Paste image or video link"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!linkInput.trim()) return;
                  setPendingLinks((prev) => [...prev, linkInput.trim()]);
                  setLinkInput("");
                }}
              >
                Add link
              </Button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => (onCancel ? onCancel() : window.history.back())}
              disabled={formLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? "Saving..." : action === "create" ? "Create Task" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Project Creation Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="project-name" className="text-sm font-medium">
                Project Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="project-name"
                placeholder="Enter project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newProjectName.trim()) {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="project-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="project-description"
                placeholder="Enter project description (optional)"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                className="min-h-[80px] resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsProjectDialogOpen(false);
                setNewProjectName("");
                setNewProjectDescription("");
              }}
              disabled={createProjectMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || createProjectMutation.isPending}>
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LoadingOverlay>
  );
}
