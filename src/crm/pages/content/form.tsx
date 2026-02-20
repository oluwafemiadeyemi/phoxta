"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm, HttpError } from "@refinedev/core";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Save,
  Send,
  Clock,
  Eye,
  Pencil,
  Settings,
  Search as SearchIcon,
  Globe,
  Share2,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  CheckSquare,
  Tags,
  Hash,
  CalendarDays,
  BookOpen,
  Type,
  X,
  Link2,
  ExternalLink,
  ChevronDown,
  Lightbulb,
  Wand2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Heart,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Badge } from "@crm/components/ui/badge";
import { Textarea } from "@crm/components/ui/textarea";
import { Switch } from "@crm/components/ui/switch";
import { Separator } from "@crm/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@crm/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@crm/components/ui/dialog";

import { supabaseClient } from "@crm/lib/supabase";
import { cn } from "@crm/lib/utils";

import type {
  ContentPost,
  ContentChannel,
  ContentLabel,
  ContentComment,
  ContentTask,
  ContentMedia,
  ContentCrossPost,
  PostStatus,
  ContentType,
  Platform,
  ApprovalStatus,
  TaskStatus,
  IdeaPriority,
  CrossPostStatus,
} from "@crm/types/content";
import {
  STATUS_CONFIG,
  PLATFORM_CONFIG,
  CONTENT_TYPE_CONFIG,
  APPROVAL_CONFIG,
  AUTH_STATUS_CONFIG,
} from "@crm/types/content";

/* ═══════════════════════════════════════════════════════════
   CONTENT FORM (shared by create + edit)
   ═══════════════════════════════════════════════════════════ */

interface ContentFormProps {
  mode: "create" | "edit";
  id?: string;
}

export default function ContentForm({ mode, id }: ContentFormProps) {
  const navigate = useNavigate();

  // ── Refine useForm ──
  const { formLoading, onFinish, query: queryResult } = useForm<ContentPost, HttpError>({
    resource: "contentPosts",
    action: mode,
    id,
    redirect: false,
    onMutationSuccess: () => {
      navigate("/content");
    },
  });

  const record = queryResult?.data?.data;

  // ── Local form state ──
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentType, setContentType] = useState<ContentType>("social_post");
  const [status, setStatus] = useState<PostStatus>("draft");
  const [channelId, setChannelId] = useState("");
  const [labelId, setLabelId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [autoPublish, setAutoPublish] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [seoKeywordInput, setSeoKeywordInput] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [approval, setApproval] = useState<ApprovalStatus>("none");
  const [approvalNote, setApprovalNote] = useState("");

  // ── Sidebar tab ──
  const [sidebarTab, setSidebarTab] = useState("settings");

  // ── AI assist ──
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiField, setAiField] = useState<"body" | "excerpt" | "seo_description">("body");

  // ── Comments ──
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [newComment, setNewComment] = useState("");

  // ── Tasks ──
  const [tasks, setTasks] = useState<ContentTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // ── Channels & Labels ──
  const [channels, setChannels] = useState<ContentChannel[]>([]);
  const [labels, setLabels] = useState<ContentLabel[]>([]);

  // ── Media ──
  const [postMedia, setPostMedia] = useState<ContentMedia[]>([]);

  // ── Cross-posting ──
  const [crossPosts, setCrossPosts] = useState<ContentCrossPost[]>([]);
  const [selectedCrossChannels, setSelectedCrossChannels] = useState<string[]>([]);
  const [crossPosting, setCrossPosting] = useState(false);

  // ── Populate from record ──
  useEffect(() => {
    if (record) {
      setTitle(record.title || "");
      setBody(record.body || "");
      setExcerpt(record.excerpt || "");
      setContentType(record.contentType || "social_post");
      setStatus(record.status || "draft");
      setChannelId(record.channelId || "");
      setLabelId(record.labelId || "");
      setTags(record.tags || []);
      setCoverImage(record.coverImage || "");
      setScheduledAt(record.scheduledAt ? dayjs(record.scheduledAt).format("YYYY-MM-DDTHH:mm") : "");
      setAutoPublish(record.autoPublish || false);
      setSeoTitle(record.seoTitle || "");
      setSeoDescription(record.seoDescription || "");
      setSeoKeywords(record.seoKeywords || []);
      setAuthorName(record.authorName || "");
      setApproval(record.approval || "none");
      setApprovalNote(record.approvalNote || "");
    }
  }, [record]);

  // ── Load channels, labels, comments, tasks, media ──
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      const [chRes, lbRes] = await Promise.all([
        supabaseClient.from("content_channels").select("*").eq("user_id", user.id).order("name"),
        supabaseClient.from("content_labels").select("*").eq("user_id", user.id).order("sort_order"),
      ]);
      setChannels((chRes.data as ContentChannel[]) || []);
      setLabels((lbRes.data as ContentLabel[]) || []);

      if (id) {
        const [cmRes, tkRes, mdRes, cpRes] = await Promise.all([
          supabaseClient.from("content_comments").select("*").eq("post_id", id).order("created_at", { ascending: false }),
          supabaseClient.from("content_tasks").select("*").eq("post_id", id).order("created_at", { ascending: false }),
          supabaseClient.from("content_media").select("*").eq("post_id", id).order("sort_order"),
          supabaseClient.from("content_cross_posts").select("*").eq("post_id", id).order("created_at", { ascending: false }),
        ]);
        setComments((cmRes.data as ContentComment[]) || []);
        setTasks((tkRes.data as ContentTask[]) || []);
        setPostMedia((mdRes.data as ContentMedia[]) || []);
        setCrossPosts((cpRes.data as ContentCrossPost[]) || []);
      }
    };
    load();
  }, [id]);

  // ── Word count ──
  const wordCount = useMemo(() => {
    return body.trim() ? body.trim().split(/\s+/).length : 0;
  }, [body]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // ── Char count for the selected platform ──
  const charCount = body.length;
  const selectedChannel = channels.find((c) => c.id === channelId);
  const platformCharLimit = selectedChannel
    ? PLATFORM_CONFIG[selectedChannel.platform]?.charLimit || 100000
    : 100000;
  const charOverLimit = charCount > platformCharLimit;

  // ── Tag management ──
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };
  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const addSeoKeyword = () => {
    const k = seoKeywordInput.trim().toLowerCase();
    if (k && !seoKeywords.includes(k)) {
      setSeoKeywords([...seoKeywords, k]);
    }
    setSeoKeywordInput("");
  };
  const removeSeoKeyword = (k: string) => setSeoKeywords(seoKeywords.filter((x) => x !== k));

  // ── Save ──
  const handleSave = useCallback(
    async (overrideStatus?: PostStatus) => {
      const values: Record<string, unknown> = {
        title,
        body,
        excerpt,
        contentType,
        status: overrideStatus || status,
        channelId: channelId || null,
        labelId: labelId || null,
        tags,
        coverImage: coverImage || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        autoPublish,
        seoTitle,
        seoDescription,
        seoKeywords,
        authorName,
        wordCount,
        readingTime,
        approval,
        approvalNote: approvalNote || null,
      };
      if (overrideStatus === "published") {
        values.publishedAt = new Date().toISOString();
      }
      await onFinish(values as any);
    },
    [
      title, body, excerpt, contentType, status, channelId, labelId, tags,
      coverImage, scheduledAt, autoPublish, seoTitle, seoDescription,
      seoKeywords, authorName, wordCount, readingTime, approval, approvalNote, onFinish,
    ]
  );

  // ── AI Assist ──
  const handleAiAssist = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          type: contentType,
          field: aiField,
          existingContent: body,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.text) {
          if (aiField === "body") setBody(data.text);
          else if (aiField === "excerpt") setExcerpt(data.text);
          else if (aiField === "seo_description") setSeoDescription(data.text);
        }
      }
    } catch {} finally {
      setAiLoading(false);
      setAiDialogOpen(false);
      setAiPrompt("");
    }
  }, [aiPrompt, contentType, aiField, body]);

  // ── Add comment ──
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !id) return;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      await supabaseClient.from("content_comments").insert({
        user_id: user.id,
        post_id: id,
        body: newComment.trim(),
        author_name: user.email?.split("@")[0] || "User",
      });
      const { data } = await supabaseClient
        .from("content_comments")
        .select("*")
        .eq("post_id", id)
        .order("created_at", { ascending: false });
      setComments((data as ContentComment[]) || []);
      setNewComment("");
    } catch {}
  }, [newComment, id]);

  // ── Add task ──
  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim() || !id) return;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      await supabaseClient.from("content_tasks").insert({
        user_id: user.id,
        post_id: id,
        title: newTaskTitle.trim(),
      });
      const { data } = await supabaseClient
        .from("content_tasks")
        .select("*")
        .eq("post_id", id)
        .order("created_at", { ascending: false });
      setTasks((data as ContentTask[]) || []);
      setNewTaskTitle("");
    } catch {}
  }, [newTaskTitle, id]);

  // ── Toggle task ──
  const toggleTaskStatus = useCallback(async (taskId: string, current: TaskStatus) => {
    const next = current === "completed" ? "pending" : "completed";
    await supabaseClient
      .from("content_tasks")
      .update({ status: next, completed_at: next === "completed" ? new Date().toISOString() : null })
      .eq("id", taskId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: next as TaskStatus, completedAt: next === "completed" ? new Date().toISOString() : undefined }
          : t
      )
    );
  }, []);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  const statusCfg = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col h-full">
      {/* ── TOP BAR ── */}
      <div className="border-b bg-background px-4 py-2.5 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/content")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title…"
            className="text-lg font-semibold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1", statusCfg.color)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dotColor)} />
            {statusCfg.label}
          </span>

          {/* Word count */}
          <span className="text-xs text-muted-foreground hidden md:block">
            {wordCount} words · {readingTime} min read
          </span>

          <Separator orientation="vertical" className="h-5" />

          {/* AI Assist */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 h-8"
            onClick={() => {
              setAiField("body");
              setAiDialogOpen(true);
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            <span className="hidden md:inline">AI Assist</span>
          </Button>

          {/* Save Draft */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 h-8"
            onClick={() => handleSave("draft")}
            disabled={formLoading}
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Save Draft</span>
          </Button>

          {/* Schedule */}
          {scheduledAt && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-8"
              onClick={() => handleSave("scheduled")}
              disabled={formLoading}
            >
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden md:inline">Schedule</span>
            </Button>
          )}

          {/* Publish */}
          <Button
            size="sm"
            className="gap-1 h-8"
            onClick={() => handleSave("published")}
            disabled={formLoading}
          >
            {formLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span className="hidden md:inline">Publish</span>
          </Button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── EDITOR PANEL (left) ── */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Content type selector */}
            <div className="flex items-center gap-3">
              <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                <SelectTrigger className="w-[180px] h-9">
                  <Type className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTENT_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedChannel && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedChannel.color }}
                  />
                  {selectedChannel.name}
                  {charOverLimit && (
                    <Badge variant="destructive" className="ml-2 text-[10px]">
                      Over {platformCharLimit.toLocaleString()} char limit
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Cover image */}
            {coverImage && (
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-full h-48 object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setCoverImage("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Excerpt */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Excerpt / Summary
              </Label>
              <Textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A short summary of this post…"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Body editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Pencil className="h-3 w-3" /> Content Body
                </Label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{charCount.toLocaleString()} chars</span>
                  {selectedChannel && (
                    <span className={charOverLimit ? "text-red-500 font-medium" : ""}>
                      / {platformCharLimit.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your content here…"
                rows={16}
                className="resize-y font-mono text-sm leading-relaxed"
              />
              {charOverLimit && (
                <p className="text-xs text-red-500 mt-1">
                  Content exceeds the {PLATFORM_CONFIG[selectedChannel!.platform].label} character limit
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Hash className="h-3 w-3" /> Tags
              </Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="h-8 text-sm"
                />
                <Button variant="outline" size="sm" className="h-8" onClick={addTag}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Media attached to this post */}
            {postMedia.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Attached Media
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {postMedia.map((m) => (
                    <div key={m.id} className="rounded-md overflow-hidden border aspect-square">
                      {m.fileType.startsWith("image") ? (
                        <img src={m.url} alt={m.altText || m.fileName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <FileText className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Platform Preview */}
            {selectedChannel && (
              <SocialPreview
                platform={selectedChannel.platform}
                title={title}
                body={body}
                coverImage={coverImage}
                channelName={selectedChannel.accountName || selectedChannel.name}
              />
            )}
          </div>
        </div>

        {/* ── SIDEBAR PANEL (right) ── */}
        <div className="w-[340px] border-l bg-muted/20 overflow-auto hidden lg:flex flex-col">
          <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex-1 flex flex-col">
            <div className="border-b px-2 pt-1">
              <TabsList className="bg-transparent h-9 p-0 gap-1 w-full justify-start">
                <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-2.5 gap-1">
                  <Settings className="h-3 w-3" /> Settings
                </TabsTrigger>
                <TabsTrigger value="seo" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-2.5 gap-1">
                  <SearchIcon className="h-3 w-3" /> SEO
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-2.5 gap-1">
                  <MessageSquare className="h-3 w-3" /> Chat
                  {comments.length > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded">{comments.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-2.5 gap-1">
                  <CheckSquare className="h-3 w-3" /> Tasks
                  {tasks.length > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded">{tasks.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="crosspost" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-2.5 gap-1">
                  <Share2 className="h-3 w-3" /> Cross
                  {crossPosts.length > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">{crossPosts.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── SETTINGS TAB ── */}
            <TabsContent value="settings" className="flex-1 overflow-auto mt-0 p-4 space-y-5">
              {/* Status */}
              <div>
                <Label className="text-xs mb-1.5">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", cfg.dotColor)} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Channel */}
              <div>
                <Label className="text-xs mb-1.5">Channel</Label>
                <Select value={channelId || "__none__"} onValueChange={(v) => setChannelId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Channel</SelectItem>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                          {ch.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Label */}
              <div>
                <Label className="text-xs mb-1.5">Label</Label>
                <Select value={labelId || "__none__"} onValueChange={(v) => setLabelId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Label</SelectItem>
                    {labels.map((lb) => (
                      <SelectItem key={lb.id} value={lb.id}>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lb.color }} />
                          {lb.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Author */}
              <div>
                <Label className="text-xs mb-1.5">Author Name</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Author name"
                  className="h-9"
                />
              </div>

              {/* Cover Image URL */}
              <div>
                <Label className="text-xs mb-1.5">Cover Image URL</Label>
                <Input
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://…"
                  className="h-9"
                />
              </div>

              <Separator />

              {/* Scheduling */}
              <div>
                <Label className="text-xs mb-1.5 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Schedule
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-9"
                />
                <div className="flex items-center gap-2 mt-2">
                  <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
                  <Label className="text-xs text-muted-foreground">Auto-publish at scheduled time</Label>
                </div>
              </div>

              <Separator />

              {/* Approval */}
              <div>
                <Label className="text-xs mb-1.5">Approval Status</Label>
                <Select value={approval} onValueChange={(v) => setApproval(v as ApprovalStatus)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(APPROVAL_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {approval !== "none" && (
                  <Textarea
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="Approval note…"
                    rows={2}
                    className="mt-2 text-sm"
                  />
                )}
              </div>
            </TabsContent>

            {/* ── SEO TAB ── */}
            <TabsContent value="seo" className="flex-1 overflow-auto mt-0 p-4 space-y-5">
              <div>
                <Label className="text-xs mb-1.5">SEO Title</Label>
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="SEO title (defaults to post title)"
                  className="h-9"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {(seoTitle || title).length}/60 characters
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Meta Description</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] gap-0.5 px-1"
                    onClick={() => {
                      setAiField("seo_description");
                      setAiDialogOpen(true);
                    }}
                  >
                    <Sparkles className="h-3 w-3 text-violet-500" /> AI
                  </Button>
                </div>
                <Textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Short description for search engines…"
                  rows={3}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {seoDescription.length}/160 characters
                </p>
              </div>

              <div>
                <Label className="text-xs mb-1.5">Keywords</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {seoKeywords.map((k) => (
                    <Badge key={k} variant="secondary" className="gap-1 text-[10px]">
                      {k}
                      <button onClick={() => removeSeoKeyword(k)} className="hover:text-red-500">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input
                    value={seoKeywordInput}
                    onChange={(e) => setSeoKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSeoKeyword())}
                    placeholder="Add keyword…"
                    className="h-8 text-xs"
                  />
                  <Button variant="outline" size="sm" className="h-8" onClick={addSeoKeyword}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* SEO Preview */}
              <div>
                <Label className="text-xs mb-2">Search Preview</Label>
                <div className="border rounded-lg p-3 bg-white dark:bg-zinc-900 space-y-1">
                  <p className="text-sm text-blue-600 hover:underline cursor-pointer font-medium line-clamp-1">
                    {seoTitle || title || "Page Title"}
                  </p>
                  <p className="text-[11px] text-emerald-700 line-clamp-1">
                    example.com › {(seoTitle || title || "page").toLowerCase().replace(/\s+/g, "-")}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {seoDescription || excerpt || "No description set. Add a meta description to improve click-through rates."}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ── COMMENTS TAB ── */}
            <TabsContent value="comments" className="flex-1 overflow-auto mt-0 flex flex-col">
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No comments yet</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                          {(c.authorName || "U")[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-medium">{c.authorName || "User"}</span>
                        <span className="text-[10px] text-muted-foreground">{dayjs(c.createdAt).fromNow()}</span>
                      </div>
                      <p className="text-sm ml-8">{c.body}</p>
                    </div>
                  ))
                )}
              </div>
              {mode === "edit" && (
                <div className="border-t p-3 flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    placeholder="Add a comment…"
                    className="h-8 text-xs"
                  />
                  <Button size="sm" className="h-8" onClick={handleAddComment} disabled={!newComment.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── TASKS TAB ── */}
            <TabsContent value="tasks" className="flex-1 overflow-auto mt-0 flex flex-col">
              <div className="flex-1 overflow-auto p-4 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No tasks yet</p>
                  </div>
                ) : (
                  tasks.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-md border text-sm",
                        t.status === "completed" && "opacity-50"
                      )}
                    >
                      <button
                        className="mt-0.5 flex-shrink-0"
                        onClick={() => toggleTaskStatus(t.id, t.status)}
                      >
                        {t.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs", t.status === "completed" && "line-through")}>{t.title}</p>
                        <span className="text-[10px] text-muted-foreground">{dayjs(t.createdAt).fromNow()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {mode === "edit" && (
                <div className="border-t p-3 flex gap-2">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                    placeholder="Add a task…"
                    className="h-8 text-xs"
                  />
                  <Button size="sm" className="h-8" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── CROSS-POST TAB ── */}
            <TabsContent value="crosspost" className="flex-1 overflow-auto mt-0 flex flex-col">
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Select channels to cross-post to */}
                {mode === "edit" && id && (
                  <>
                    <div>
                      <p className="text-xs font-medium mb-2">Publish to additional channels</p>
                      <p className="text-[11px] text-muted-foreground mb-3">
                        Select connected accounts to publish this post to multiple platforms simultaneously.
                      </p>
                      {channels.filter((c) => c.authStatus === "connected" && c.id !== channelId).length === 0 ? (
                        <div className="text-center py-6">
                          <Link2 className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No other connected accounts</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Connect more accounts in the Accounts tab</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {channels
                            .filter((c) => c.authStatus === "connected" && c.id !== channelId)
                            .map((ch) => {
                              const isSelected = selectedCrossChannels.includes(ch.id);
                              const existingCrossPost = crossPosts.find((cp) => cp.channelId === ch.id);
                              const platformCfg = PLATFORM_CONFIG[ch.platform];

                              return (
                                <div
                                  key={ch.id}
                                  className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                                    isSelected ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-700 dark:bg-indigo-950/20" : "hover:bg-muted/50",
                                    existingCrossPost && "opacity-60 cursor-default"
                                  )}
                                  onClick={() => {
                                    if (existingCrossPost) return;
                                    setSelectedCrossChannels((prev) =>
                                      isSelected ? prev.filter((x) => x !== ch.id) : [...prev, ch.id]
                                    );
                                  }}
                                >
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                    style={{ backgroundColor: ch.color || "#6366f1" }}
                                  >
                                    {platformCfg?.label?.charAt(0) || ch.platform.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{ch.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {platformCfg?.label || ch.platform}
                                      {ch.platformUsername && <> · @{ch.platformUsername}</>}
                                    </p>
                                  </div>
                                  {existingCrossPost ? (
                                    <Badge
                                      variant="outline"
                                      className={cn("text-[10px] h-5", {
                                        "text-emerald-600": existingCrossPost.status === "posted",
                                        "text-amber-600": existingCrossPost.status === "pending" || existingCrossPost.status === "posting",
                                        "text-red-600": existingCrossPost.status === "failed",
                                      })}
                                    >
                                      {existingCrossPost.status === "posted" ? "Published" :
                                       existingCrossPost.status === "posting" ? "Publishing…" :
                                       existingCrossPost.status === "failed" ? "Failed" :
                                       existingCrossPost.status === "pending" ? "Pending" : existingCrossPost.status}
                                    </Badge>
                                  ) : (
                                    <div className={cn(
                                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                      isSelected ? "bg-indigo-600 border-indigo-600" : "border-muted-foreground/30"
                                    )}>
                                      {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {selectedCrossChannels.length > 0 && (
                      <Button
                        size="sm"
                        className="w-full gap-1.5"
                        disabled={crossPosting}
                        onClick={async () => {
                          setCrossPosting(true);
                          try {
                            await fetch("/api/content/social/post", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                postId: id,
                                channelIds: selectedCrossChannels,
                              }),
                            });
                            // Reload cross posts
                            const { data } = await supabaseClient
                              .from("content_cross_posts")
                              .select("*")
                              .eq("post_id", id)
                              .order("created_at", { ascending: false });
                            setCrossPosts((data as ContentCrossPost[]) || []);
                            setSelectedCrossChannels([]);
                          } catch {}
                          setCrossPosting(false);
                        }}
                      >
                        {crossPosting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</>
                        ) : (
                          <><Send className="h-4 w-4" /> Publish to {selectedCrossChannels.length} channel{selectedCrossChannels.length > 1 ? "s" : ""}</>
                        )}
                      </Button>
                    )}

                    {/* Existing cross-posts */}
                    {crossPosts.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium mb-2">Cross-post history</p>
                        <div className="space-y-2">
                          {crossPosts.map((cp) => {
                            const ch = channels.find((c) => c.id === cp.channelId);
                            return (
                              <div key={cp.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs">
                                <div
                                  className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                  style={{ backgroundColor: ch?.color || "#6366f1" }}
                                >
                                  {ch?.platform.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{ch?.name || "Unknown"}</p>
                                  {cp.postedAt && (
                                    <p className="text-[10px] text-muted-foreground">
                                      {dayjs(cp.postedAt).format("MMM D, h:mm A")}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] h-5", {
                                    "text-emerald-600": cp.status === "posted",
                                    "text-amber-600": cp.status === "pending" || cp.status === "posting",
                                    "text-red-600": cp.status === "failed",
                                  })}
                                >
                                  {cp.status}
                                </Badge>
                                {cp.platformUrl && (
                                  <a href={cp.platformUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {mode === "create" && (
                  <div className="text-center py-8">
                    <Share2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Save this post first to enable cross-posting</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── AI ASSIST DIALOG ── */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              AI Content Assistant
            </DialogTitle>
            <DialogDescription>
              {aiField === "body"
                ? "Generate or rewrite your post content"
                : aiField === "excerpt"
                ? "Generate a short summary"
                : "Generate an SEO meta description"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={aiField === "body" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setAiField("body")}
                className="text-xs"
              >
                Body
              </Button>
              <Button
                variant={aiField === "excerpt" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setAiField("excerpt")}
                className="text-xs"
              >
                Excerpt
              </Button>
              <Button
                variant={aiField === "seo_description" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setAiField("seo_description")}
                className="text-xs"
              >
                SEO Desc
              </Button>
            </div>
            <Textarea
              placeholder="Describe what you want the AI to write…"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAiAssist}
                disabled={!aiPrompt.trim() || aiLoading}
                className="gap-1.5"
              >
                {aiLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> Generate</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SOCIAL PREVIEW COMPONENT (inline)
   ═══════════════════════════════════════════════════════════ */
function SocialPreview({
  platform,
  title,
  body,
  coverImage,
  channelName,
}: {
  platform: Platform;
  title: string;
  body: string;
  coverImage?: string;
  channelName: string;
}) {
  const cfg = PLATFORM_CONFIG[platform];

  // Trim body to platform char limit for preview
  const previewText = body.length > cfg.charLimit ? body.slice(0, cfg.charLimit) + "…" : body;
  const dateStr = dayjs().format("MMM D");

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">{cfg.label} Preview</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Profile row */}
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: cfg.color }}
          >
            {channelName[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-sm font-semibold">{channelName}</p>
            <p className="text-[11px] text-muted-foreground">{dateStr} · {platform === "linkedin" ? "Public" : ""}</p>
          </div>
        </div>

        {/* Text */}
        <p className="text-sm whitespace-pre-wrap line-clamp-6">{previewText || "Your content will appear here…"}</p>

        {/* Image */}
        {coverImage && (
          <div className="rounded-md overflow-hidden border">
            <img src={coverImage} alt="" className="w-full h-40 object-cover" />
            {title && (
              <div className="p-2 border-t">
                <p className="text-xs font-semibold line-clamp-1">{title}</p>
              </div>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-6 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 cursor-pointer hover:text-foreground"><Heart className="h-3.5 w-3.5" /> Like</span>
          <span className="flex items-center gap-1 cursor-pointer hover:text-foreground"><MessageSquare className="h-3.5 w-3.5" /> Comment</span>
          <span className="flex items-center gap-1 cursor-pointer hover:text-foreground"><Share2 className="h-3.5 w-3.5" /> Share</span>
        </div>
      </div>
    </div>
  );
}
