"use client";
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { useList, HttpError } from "@refinedev/core";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  LayoutGrid,
  List,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Send,
  Clock,
  TrendingUp,
  Lightbulb,
  Image as ImageIcon,
  CheckCircle2,
  Activity,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  Heart,
  Share2,
  MessageSquare,
  ChevronDown,
  FolderOpen,
  Newspaper,
  Hash,
  Loader2,
  AlertCircle,
  Archive,
  RefreshCw,
  ExternalLink,
  Zap,
  Globe,
  GripVertical,
  Inbox,
  Bot,
  Link2,
  Wifi,
  WifiOff,
  Reply,
  Play,
  Pause,
  Shield,
  Power,
  Mail,
  Star,
  Bell,
  UserPlus,
  Settings2,
  AtSign,
  Tag,
  CornerUpLeft,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Badge } from "@crm/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@crm/components/ui/tabs";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@crm/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@crm/components/ui/dialog";
import { Textarea } from "@crm/components/ui/textarea";
import { Separator } from "@crm/components/ui/separator";
import { Progress } from "@crm/components/ui/progress";
import { Switch } from "@crm/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@crm/components/ui/tooltip";
import { ScrollArea } from "@crm/components/ui/scroll-area";

import { supabaseClient } from "@crm/lib/supabase";
import { cn } from "@crm/lib/utils";

import type {
  ContentPost,
  ContentIdea,
  ContentMedia,
  ContentChannel,
  ContentLabel,
  ContentTask,
  ContentActivityLog,
  SocialInboxMessage,
  SocialAutomation,
  ContentCrossPost,
  PostStatus,
  IdeaStatus,
  Platform,
  ChannelAuthStatus,
  InboxMessageType,
  InboxStatus,
  AutomationTrigger,
  AutomationAction,
} from "@crm/types/content";
import {
  STATUS_CONFIG,
  PLATFORM_CONFIG,
  CONTENT_TYPE_CONFIG,
  APPROVAL_CONFIG,
  IDEA_STATUS_CONFIG,
  AUTH_STATUS_CONFIG,
  INBOX_TYPE_CONFIG,
  AUTOMATION_TRIGGER_CONFIG,
  AUTOMATION_ACTION_CONFIG,
} from "@crm/types/content";

dayjs.extend(relativeTime);

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function ContentStudioPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("posts");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [ideaDialogOpen, setIdeaDialogOpen] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaDesc, setNewIdeaDesc] = useState("");

  // ── Data fetching ──
  const { result: postsResult, query: postsQuery } = useList<ContentPost, HttpError>({
    resource: "contentPosts",
    pagination: { pageSize: 200 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const { result: ideasResult, query: ideasQuery } = useList<ContentIdea, HttpError>({
    resource: "contentIdeas",
    pagination: { pageSize: 200 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const { result: mediaResult, query: mediaQuery } = useList<ContentMedia, HttpError>({
    resource: "contentMedia",
    pagination: { pageSize: 200 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const { result: channelsResult } = useList<ContentChannel, HttpError>({
    resource: "contentChannels",
    pagination: { pageSize: 50 },
  });

  const { result: labelsResult } = useList<ContentLabel, HttpError>({
    resource: "contentLabels",
    pagination: { pageSize: 50 },
  });

  const { result: tasksResult } = useList<ContentTask, HttpError>({
    resource: "contentTasks",
    pagination: { pageSize: 200 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const { result: activityResult } = useList<ContentActivityLog, HttpError>({
    resource: "contentActivityLog",
    pagination: { pageSize: 100 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const { result: inboxResult, query: inboxQuery } = useList<SocialInboxMessage, HttpError>({
    resource: "contentSocialInbox",
    pagination: { pageSize: 200 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const { result: automationsResult, query: automationsQuery } = useList<SocialAutomation, HttpError>({
    resource: "contentSocialAutomations",
    pagination: { pageSize: 100 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const { result: crossPostsResult } = useList<ContentCrossPost, HttpError>({
    resource: "contentCrossPosts",
    pagination: { pageSize: 200 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const posts = postsResult?.data ?? [];
  const ideas = ideasResult?.data ?? [];
  const media = mediaResult?.data ?? [];
  const channels = channelsResult?.data ?? [];
  const labels = labelsResult?.data ?? [];
  const tasks = tasksResult?.data ?? [];
  const activity = activityResult?.data ?? [];
  const inboxMessages = inboxResult?.data ?? [];
  const automations = automationsResult?.data ?? [];
  const crossPosts = crossPostsResult?.data ?? [];
  const isLoading = postsQuery.isLoading;

  // ── Filter posts ──
  const filteredPosts = useMemo(() => {
    let items = posts;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") items = items.filter((p) => p.status === statusFilter);
    if (channelFilter !== "all") items = items.filter((p) => p.channelId === channelFilter);
    return items;
  }, [posts, search, statusFilter, channelFilter]);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const drafts = posts.filter((p) => p.status === "draft").length;
    const scheduled = posts.filter((p) => p.status === "scheduled").length;
    const published = posts.filter((p) => p.status === "published").length;
    const totalEngagement = posts.reduce((s, p) => s + p.likes + p.shares + p.commentsCount, 0);
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const pendingApprovals = posts.filter((p) => p.approval === "pending").length;
    return { drafts, scheduled, published, totalEngagement, totalViews, pendingApprovals };
  }, [posts]);

  // ── Channel map ──
  const channelMap = useMemo(() => {
    const m: Record<string, ContentChannel> = {};
    channels.forEach((c) => { m[c.id] = c; });
    return m;
  }, [channels]);

  // ── Label map ──
  const labelMap = useMemo(() => {
    const m: Record<string, ContentLabel> = {};
    labels.forEach((l) => { m[l.id] = l; });
    return m;
  }, [labels]);

  // ── AI Draft Generation ──
  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, type: "social_post" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.id) {
          navigate(`/content/edit/${data.id}`);
        } else {
          postsQuery.refetch();
          setAiDialogOpen(false);
        }
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
      setAiPrompt("");
    }
  }, [aiPrompt, navigate, postsQuery]);

  // ── Quick idea save ──
  const handleSaveIdea = useCallback(async () => {
    if (!newIdeaTitle.trim()) return;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      await supabaseClient.from("content_ideas").insert({
        user_id: user.id,
        title: newIdeaTitle.trim(),
        description: newIdeaDesc.trim() || null,
      });
      ideasQuery.refetch();
      setIdeaDialogOpen(false);
      setNewIdeaTitle("");
      setNewIdeaDesc("");
    } catch {
      // silently fail
    }
  }, [newIdeaTitle, newIdeaDesc, ideasQuery]);

  // ── Quick status update ──
  const updatePostStatus = useCallback(
    async (postId: string, newStatus: PostStatus) => {
      try {
        const patch: Record<string, unknown> = { status: newStatus };
        if (newStatus === "published") patch.published_at = new Date().toISOString();
        await supabaseClient.from("content_posts").update(patch).eq("id", postId);
        postsQuery.refetch();
      } catch {}
    },
    [postsQuery]
  );

  // ── Duplicate post ──
  const duplicatePost = useCallback(
    async (post: ContentPost) => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        await supabaseClient.from("content_posts").insert({
          user_id: user.id,
          title: `${post.title} (Copy)`,
          body: post.body,
          excerpt: post.excerpt,
          content_type: post.contentType,
          status: "draft",
          channel_id: post.channelId,
          label_id: post.labelId,
          tags: post.tags,
          cover_image: post.coverImage,
          seo_title: post.seoTitle,
          seo_description: post.seoDescription,
          seo_keywords: post.seoKeywords,
          duplicated_from: post.id,
        });
        postsQuery.refetch();
      } catch {}
    },
    [postsQuery]
  );

  // ── Delete post ──
  const deletePost = useCallback(
    async (postId: string) => {
      try {
        await supabaseClient.from("content_posts").delete().eq("id", postId);
        postsQuery.refetch();
      } catch {}
    },
    [postsQuery]
  );

  // ── Convert idea to post ──
  const convertIdeaToPost = useCallback(
    async (idea: ContentIdea) => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        const { data } = await supabaseClient
          .from("content_posts")
          .insert({
            user_id: user.id,
            title: idea.title,
            body: idea.description || "",
            status: "draft",
            channel_id: idea.channelId || null,
            label_id: idea.labelId || null,
            tags: idea.tags || [],
          })
          .select("id")
          .single();
        if (data) {
          await supabaseClient
            .from("content_ideas")
            .update({ status: "used", converted_post_id: data.id })
            .eq("id", idea.id);
          navigate(`/content/edit/${data.id}`);
        }
      } catch {}
    },
    [navigate]
  );

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col h-full">
      {/* ── TOP HEADER ── */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-indigo-600" />
              Content Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create, schedule, and manage your content across all channels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiDialogOpen(true)}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4 text-violet-500" />
              AI Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIdeaDialogOpen(true)}
              className="gap-1.5"
            >
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Quick Idea
            </Button>
            <Button size="sm" onClick={() => navigate("/content/create")} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard
            label="Drafts"
            value={stats.drafts}
            icon={<FileText className="h-4 w-4 text-slate-500" />}
          />
          <StatCard
            label="Scheduled"
            value={stats.scheduled}
            icon={<Clock className="h-4 w-4 text-blue-500" />}
          />
          <StatCard
            label="Published"
            value={stats.published}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          />
          <StatCard
            label="Total Views"
            value={stats.totalViews}
            icon={<Eye className="h-4 w-4 text-indigo-500" />}
          />
          <StatCard
            label="Engagement"
            value={stats.totalEngagement}
            icon={<TrendingUp className="h-4 w-4 text-rose-500" />}
          />
          <StatCard
            label="Pending Approvals"
            value={stats.pendingApprovals}
            icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
          />
        </div>
      </div>

      {/* ── TABS ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-6 pt-2">
          <TabsList className="bg-transparent h-10 p-0 gap-4">
            <TabsTrigger value="posts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-1 pb-2.5 text-sm gap-1.5">
              <FileText className="h-4 w-4" /> Posts
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{posts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-1 pb-2.5 text-sm gap-1.5">
              <Calendar className="h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="ideas" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-1 pb-2.5 text-sm gap-1.5">
              <Lightbulb className="h-4 w-4" /> Ideas
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{ideas.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-1 pb-2.5 text-sm gap-1.5">
              <ImageIcon className="h-4 w-4" /> Media
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{media.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-1 pb-2.5 text-sm gap-1.5">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-1 pb-2.5 text-sm gap-1.5">
              <Activity className="h-4 w-4" /> Activity
            </TabsTrigger>
            <TabsTrigger value="inbox" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-1 pb-2.5 text-sm gap-1.5">
              <Inbox className="h-4 w-4" /> Inbox
              {inboxMessages.filter((m) => m.status === "new").length > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1 min-w-[18px]">
                  {inboxMessages.filter((m) => m.status === "new").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="automations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-1 pb-2.5 text-sm gap-1.5">
              <Bot className="h-4 w-4" /> Automations
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{automations.filter((a) => a.isActive).length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-1 pb-2.5 text-sm gap-1.5">
              <Link2 className="h-4 w-4" /> Accounts
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{channels.filter((c) => c.authStatus === "connected").length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─────── POSTS TAB ─────── */}
        <TabsContent value="posts" className="flex-1 overflow-auto mt-0">
          {/* Toolbar */}
          <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">In Review</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {channels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1 border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-12 w-12 text-muted-foreground/50" />}
                title="No posts yet"
                description="Create your first piece of content to get started"
                action={
                  <Button size="sm" onClick={() => navigate("/content/create")} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Create Post
                  </Button>
                }
              />
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    channel={post.channelId ? channelMap[post.channelId] : undefined}
                    label={post.labelId ? labelMap[post.labelId] : undefined}
                    onEdit={() => navigate(`/content/edit/${post.id}`)}
                    onDuplicate={() => duplicatePost(post)}
                    onDelete={() => deletePost(post.id)}
                    onStatusChange={(s) => updatePostStatus(post.id, s)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPosts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    channel={post.channelId ? channelMap[post.channelId] : undefined}
                    label={post.labelId ? labelMap[post.labelId] : undefined}
                    onEdit={() => navigate(`/content/edit/${post.id}`)}
                    onDuplicate={() => duplicatePost(post)}
                    onDelete={() => deletePost(post.id)}
                    onStatusChange={(s) => updatePostStatus(post.id, s)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─────── CALENDAR TAB ─────── */}
        <TabsContent value="calendar" className="flex-1 overflow-auto mt-0 p-6">
          <CalendarView posts={posts} channelMap={channelMap} onEdit={(id) => navigate(`/content/edit/${id}`)} />
        </TabsContent>

        {/* ─────── IDEAS TAB ─────── */}
        <TabsContent value="ideas" className="flex-1 overflow-auto mt-0 p-6">
          <IdeasBoard
            ideas={ideas}
            onConvert={convertIdeaToPost}
            onNew={() => setIdeaDialogOpen(true)}
            onRefresh={() => ideasQuery.refetch()}
          />
        </TabsContent>

        {/* ─────── MEDIA TAB ─────── */}
        <TabsContent value="media" className="flex-1 overflow-auto mt-0 p-6">
          <MediaLibrary media={media} onRefresh={() => mediaQuery.refetch()} />
        </TabsContent>

        {/* ─────── ANALYTICS TAB ─────── */}
        <TabsContent value="analytics" className="flex-1 overflow-auto mt-0 p-6">
          <AnalyticsDashboard posts={posts} channels={channels} />
        </TabsContent>

        {/* ─────── ACTIVITY TAB ─────── */}
        <TabsContent value="activity" className="flex-1 overflow-auto mt-0 p-6">
          <ActivityFeed activity={activity} />
        </TabsContent>

        {/* ─────── INBOX TAB ─────── */}
        <TabsContent value="inbox" className="flex-1 overflow-auto mt-0 p-6">
          <SocialInboxPanel
            messages={inboxMessages}
            channels={channels}
            channelMap={channelMap}
            onRefresh={() => inboxQuery.refetch()}
          />
        </TabsContent>

        {/* ─────── AUTOMATIONS TAB ─────── */}
        <TabsContent value="automations" className="flex-1 overflow-auto mt-0 p-6">
          <AutomationsPanel
            automations={automations}
            channels={channels}
            channelMap={channelMap}
            onRefresh={() => automationsQuery.refetch()}
          />
        </TabsContent>

        {/* ─────── ACCOUNTS TAB ─────── */}
        <TabsContent value="accounts" className="flex-1 overflow-auto mt-0 p-6">
          <AccountsPanel
            channels={channels}
            onRefresh={() => {
              // Refetch channels to get updated auth status
              postsQuery.refetch();
            }}
          />
        </TabsContent>
      </Tabs>

      {/* ── AI DRAFT DIALOG ── */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Generate AI Draft
            </DialogTitle>
            <DialogDescription>
              Describe the content you want and AI will create a draft for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              placeholder="E.g. Write a professional LinkedIn post about our new product launch, highlighting key features and benefits…"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={5}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAiGenerate}
                disabled={!aiPrompt.trim() || aiLoading}
                className="gap-1.5"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── QUICK IDEA DIALOG ── */}
      <Dialog open={ideaDialogOpen} onOpenChange={setIdeaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Quick Idea
            </DialogTitle>
            <DialogDescription>
              Capture an idea before you forget it. You can turn it into a post later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Idea title…"
              value={newIdeaTitle}
              onChange={(e) => setNewIdeaTitle(e.target.value)}
            />
            <Textarea
              placeholder="A few notes about this idea (optional)…"
              value={newIdeaDesc}
              onChange={(e) => setNewIdeaDesc(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIdeaDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveIdea} disabled={!newIdeaTitle.trim()} className="gap-1.5">
                <Plus className="h-4 w-4" /> Save Idea
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

// ── Stat Card ──
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-3 gap-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold mt-1">{value.toLocaleString()}</p>
    </Card>
  );
}

// ── Empty State ──
function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  );
}

// ── Post Card (Grid View) ──
function PostCard({
  post,
  channel,
  label,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: {
  post: ContentPost;
  channel?: ContentChannel;
  label?: ContentLabel;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onStatusChange: (s: PostStatus) => void;
}) {
  const statusCfg = STATUS_CONFIG[post.status];
  const typeCfg = CONTENT_TYPE_CONFIG[post.contentType];

  return (
    <Card className="group cursor-pointer hover:shadow-md transition-all overflow-hidden" onClick={onEdit}>
      {/* Cover image */}
      {post.coverImage ? (
        <div className="h-36 bg-muted overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      ) : (
        <div className="h-20 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 flex items-center justify-center">
          <FileText className="h-8 w-8 text-indigo-300 dark:text-indigo-700" />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Top row: status + type */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1", statusCfg.color)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dotColor)} />
            {statusCfg.label}
          </span>
          <span className="text-[11px] text-muted-foreground">{typeCfg.label}</span>
          {channel && (
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: channel.color + "18", color: channel.color }}
            >
              {channel.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">
          {post.title || "Untitled"}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                #{tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{post.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {post.views > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="h-3 w-3" /> {post.views}
              </span>
            )}
            {post.likes > 0 && (
              <span className="flex items-center gap-0.5">
                <Heart className="h-3 w-3" /> {post.likes}
              </span>
            )}
            {post.shares > 0 && (
              <span className="flex items-center gap-0.5">
                <Share2 className="h-3 w-3" /> {post.shares}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">{dayjs(post.createdAt).fromNow()}</span>
        </div>

        {/* Label */}
        {label && (
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            <span className="text-[10px] text-muted-foreground">{label.name}</span>
          </div>
        )}

        {/* Scheduled info */}
        {post.status === "scheduled" && post.scheduledAt && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Clock className="h-3 w-3" />
            {dayjs(post.scheduledAt).format("MMM D, h:mm A")}
          </div>
        )}

        {/* Approval badge */}
        {post.approval !== "none" && (
          <Badge variant="outline" className={cn("text-[10px]", APPROVAL_CONFIG[post.approval].color)}>
            {APPROVAL_CONFIG[post.approval].label}
          </Badge>
        )}
      </CardContent>

      {/* Action menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {post.status === "draft" && (
              <DropdownMenuItem onClick={() => onStatusChange("review")}>
                <Send className="h-4 w-4 mr-2" /> Submit for Review
              </DropdownMenuItem>
            )}
            {post.status === "published" && (
              <DropdownMenuItem onClick={() => onStatusChange("archived")}>
                <Archive className="h-4 w-4 mr-2" /> Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

// ── Post Row (List View) ──
function PostRow({
  post,
  channel,
  label,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: {
  post: ContentPost;
  channel?: ContentChannel;
  label?: ContentLabel;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onStatusChange: (s: PostStatus) => void;
}) {
  const statusCfg = STATUS_CONFIG[post.status];

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onEdit}
    >
      {/* Cover thumb */}
      {post.coverImage ? (
        <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
          <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-md bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0">
          <FileText className="h-5 w-5 text-indigo-400" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{post.title || "Untitled"}</span>
          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1", statusCfg.color)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dotColor)} />
            {statusCfg.label}
          </span>
          {label && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
              {label.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          {channel && <span>{channel.name}</span>}
          <span>{CONTENT_TYPE_CONFIG[post.contentType].label}</span>
          <span>{dayjs(post.createdAt).fromNow()}</span>
          {post.scheduledAt && post.status === "scheduled" && (
            <span className="text-blue-600 flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {dayjs(post.scheduledAt).format("MMM D, h:mm A")}
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {post.views}</span>
        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {post.likes}</span>
        <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> {post.shares}</span>
      </div>

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}><Copy className="h-4 w-4 mr-2" /> Duplicate</DropdownMenuItem>
            {post.status === "draft" && (
              <DropdownMenuItem onClick={() => onStatusChange("review")}><Send className="h-4 w-4 mr-2" /> Submit for Review</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CALENDAR VIEW
   ═══════════════════════════════════════════════════════════ */
function CalendarView({
  posts,
  channelMap,
  onEdit,
}: {
  posts: ContentPost[];
  channelMap: Record<string, ContentChannel>;
  onEdit: (id: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const scheduledPosts = useMemo(
    () => posts.filter((p) => p.scheduledAt || p.publishedAt),
    [posts]
  );

  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfWeek = currentMonth.startOf("month").day();

  const dayGrid = useMemo(() => {
    const grid: { date: dayjs.Dayjs; posts: ContentPost[] }[] = [];
    // Padding
    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.push({ date: currentMonth.startOf("month").subtract(firstDayOfWeek - i, "day"), posts: [] });
    }
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = currentMonth.date(d);
      const dayPosts = scheduledPosts.filter((p) => {
        const postDate = dayjs(p.scheduledAt || p.publishedAt);
        return postDate.isSame(date, "day");
      });
      grid.push({ date, posts: dayPosts });
    }
    // Pad to fill last row
    while (grid.length % 7 !== 0) {
      const lastDate = grid[grid.length - 1].date;
      grid.push({ date: lastDate.add(1, "day"), posts: [] });
    }
    return grid;
  }, [currentMonth, scheduledPosts, daysInMonth, firstDayOfWeek]);

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => m.subtract(1, "month"))}>
          ← Prev
        </Button>
        <h3 className="text-lg font-semibold">{currentMonth.format("MMMM YYYY")}</h3>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => m.add(1, "month"))}>
          Next →
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {dayGrid.map(({ date, posts: dayPosts }, idx) => {
          const isCurrentMonth = date.month() === currentMonth.month();
          const isToday = date.isSame(dayjs(), "day");
          return (
            <div
              key={idx}
              className={cn(
                "bg-background min-h-[90px] p-1.5",
                !isCurrentMonth && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday && "bg-indigo-600 text-white"
                )}
              >
                {date.date()}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((p) => {
                  const ch = p.channelId ? channelMap[p.channelId] : undefined;
                  return (
                    <div
                      key={p.id}
                      className="text-[10px] leading-tight px-1 py-0.5 rounded cursor-pointer hover:bg-muted/80 truncate"
                      style={{ borderLeft: `2px solid ${ch?.color || "#6366f1"}` }}
                      onClick={() => onEdit(p.id)}
                    >
                      {p.title || "Untitled"}
                    </div>
                  );
                })}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{dayPosts.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IDEAS BOARD (Kanban-style)
   ═══════════════════════════════════════════════════════════ */
function IdeasBoard({
  ideas,
  onConvert,
  onNew,
  onRefresh,
}: {
  ideas: ContentIdea[];
  onConvert: (idea: ContentIdea) => void;
  onNew: () => void;
  onRefresh: () => void;
}) {
  const columns: { status: IdeaStatus; label: string }[] = [
    { status: "new", label: "New" },
    { status: "exploring", label: "Exploring" },
    { status: "ready", label: "Ready to Use" },
    { status: "used", label: "Used" },
  ];

  const updateIdeaStatus = async (ideaId: string, newStatus: IdeaStatus) => {
    await supabaseClient.from("content_ideas").update({ status: newStatus }).eq("id", ideaId);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" /> Ideas Board
        </h3>
        <Button size="sm" onClick={onNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Idea
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(({ status, label }) => {
          const colIdeas = ideas.filter((i) => i.status === status);
          const cfg = IDEA_STATUS_CONFIG[status];
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className={cn("text-sm font-medium px-2 py-0.5 rounded", cfg.color)}>
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">{colIdeas.length}</span>
              </div>
              <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
                {colIdeas.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No ideas</p>
                ) : (
                  colIdeas.map((idea) => (
                    <Card key={idea.id} className="p-3 space-y-2 cursor-pointer hover:shadow-sm transition-shadow">
                      <h4 className="text-sm font-medium leading-snug">{idea.title}</h4>
                      {idea.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
                      )}
                      {idea.tags && idea.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {idea.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] bg-muted px-1 py-0.5 rounded">#{t}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                        {status !== "used" && (
                          <>
                            {status !== "ready" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] px-2"
                                onClick={() => {
                                  const nextStatus: Record<string, IdeaStatus> = {
                                    new: "exploring",
                                    exploring: "ready",
                                  };
                                  updateIdeaStatus(idea.id, nextStatus[status] || "ready");
                                }}
                              >
                                Move →
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-2 text-indigo-600"
                              onClick={() => onConvert(idea)}
                            >
                              <Zap className="h-3 w-3 mr-0.5" /> Convert
                            </Button>
                          </>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {dayjs(idea.createdAt).fromNow()}
                        </span>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MEDIA LIBRARY
   ═══════════════════════════════════════════════════════════ */
function MediaLibrary({
  media,
  onRefresh,
}: {
  media: ContentMedia[];
  onRefresh: () => void;
}) {
  const [folder, setFolder] = useState("all");

  const folders = useMemo(() => {
    const set = new Set(media.map((m) => m.folder));
    return Array.from(set).sort();
  }, [media]);

  const filtered = folder === "all" ? media : media.filter((m) => m.folder === folder);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-pink-500" /> Media Library
        </h3>
        <div className="flex items-center gap-2">
          <Select value={folder} onValueChange={setFolder}>
            <SelectTrigger className="w-[150px] h-8">
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-12 w-12 text-muted-foreground/50" />}
          title="No media files"
          description="Upload images and videos from the post editor"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((item) => {
            const isImage = item.fileType.startsWith("image");
            return (
              <div key={item.id} className="group relative rounded-lg overflow-hidden border bg-muted">
                {isImage ? (
                  <img src={item.url} alt={item.altText || item.fileName} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center">
                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div className="text-white text-[11px] leading-tight truncate w-full">
                    {item.fileName}
                    {item.fileSize > 0 && (
                      <span className="block text-white/70">{(item.fileSize / 1024).toFixed(0)} KB</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANALYTICS DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function AnalyticsDashboard({
  posts,
  channels,
}: {
  posts: ContentPost[];
  channels: ContentChannel[];
}) {
  const published = posts.filter((p) => p.status === "published");

  const totalViews = published.reduce((s, p) => s + p.views, 0);
  const totalLikes = published.reduce((s, p) => s + p.likes, 0);
  const totalShares = published.reduce((s, p) => s + p.shares, 0);
  const totalComments = published.reduce((s, p) => s + p.commentsCount, 0);
  const avgEngagementRate = published.length > 0
    ? published.reduce((s, p) => s + p.engagementRate, 0) / published.length
    : 0;

  // ── Top posts ──
  const topPosts = [...published]
    .sort((a, b) => (b.views + b.likes + b.shares) - (a.views + a.likes + a.shares))
    .slice(0, 5);

  // ── Per-channel breakdown ──
  const channelBreakdown = channels.map((ch) => {
    const chPosts = published.filter((p) => p.channelId === ch.id);
    return {
      channel: ch,
      count: chPosts.length,
      views: chPosts.reduce((s, p) => s + p.views, 0),
      engagement: chPosts.reduce((s, p) => s + p.likes + p.shares + p.commentsCount, 0),
    };
  }).sort((a, b) => b.engagement - a.engagement);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-indigo-500" /> Analytics Overview
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Views</p>
          <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Likes</p>
          <p className="text-2xl font-bold">{totalLikes.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Shares</p>
          <p className="text-2xl font-bold">{totalShares.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Comments</p>
          <p className="text-2xl font-bold">{totalComments.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Avg Engagement</p>
          <p className="text-2xl font-bold">{avgEngagementRate.toFixed(1)}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top posts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Top Performing Posts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No published posts yet</p>
            ) : (
              topPosts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title || "Untitled"}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span><Eye className="h-3 w-3 inline mr-0.5" />{p.views}</span>
                      <span><Heart className="h-3 w-3 inline mr-0.5" />{p.likes}</span>
                      <span><Share2 className="h-3 w-3 inline mr-0.5" />{p.shares}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Channel breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-blue-500" /> Channel Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {channelBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No channels configured</p>
            ) : (
              channelBreakdown.map(({ channel, count, views, engagement }) => (
                <div key={channel.id} className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: channel.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{channel.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{count} posts</span>
                      <span>{views.toLocaleString()} views</span>
                      <span>{engagement.toLocaleString()} engagements</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content status distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Content Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.entries(STATUS_CONFIG) as [PostStatus, typeof STATUS_CONFIG[PostStatus]][]).map(([status, cfg]) => {
              const count = posts.filter((p) => p.status === status).length;
              if (count === 0) return null;
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={cn("w-2.5 h-2.5 rounded-full", cfg.dotColor)} />
                  <span className="text-sm">{cfg.label}</span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
          {posts.length > 0 && (
            <div className="flex h-3 rounded-full overflow-hidden mt-3 bg-muted">
              {(Object.entries(STATUS_CONFIG) as [PostStatus, typeof STATUS_CONFIG[PostStatus]][]).map(([status, cfg]) => {
                const count = posts.filter((p) => p.status === status).length;
                const pct = (count / posts.length) * 100;
                if (count === 0) return null;
                return (
                  <div
                    key={status}
                    className={cn("h-full", cfg.dotColor)}
                    style={{ width: `${pct}%` }}
                    title={`${cfg.label}: ${count}`}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY FEED
   ═══════════════════════════════════════════════════════════ */
function ActivityFeed({ activity }: { activity: ContentActivityLog[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-orange-500" /> Activity Feed
      </h3>

      {activity.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-12 w-12 text-muted-foreground/50" />}
          title="No activity yet"
          description="Actions on your content will appear here"
        />
      ) : (
        <div className="space-y-1">
          {activity.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{log.actorName || "System"}</span>{" "}
                  <span className="text-muted-foreground">{log.action}</span>
                </p>
                {log.details && Object.keys(log.details).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {JSON.stringify(log.details).slice(0, 120)}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {dayjs(log.createdAt).fromNow()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SOCIAL INBOX
   ═══════════════════════════════════════════════════════════ */
function SocialInboxPanel({
  messages,
  channels,
  channelMap,
  onRefresh,
}: {
  messages: SocialInboxMessage[];
  channels: ContentChannel[];
  channelMap: Record<string, ContentChannel>;
  onRefresh: () => void;
}) {
  const [inboxFilter, setInboxFilter] = useState<"all" | InboxStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | InboxMessageType>("all");
  const [channelFilterInbox, setChannelFilterInbox] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<SocialInboxMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const filtered = useMemo(() => {
    let items = messages;
    if (inboxFilter !== "all") items = items.filter((m) => m.status === inboxFilter);
    if (typeFilter !== "all") items = items.filter((m) => m.messageType === typeFilter);
    if (channelFilterInbox !== "all") items = items.filter((m) => m.channelId === channelFilterInbox);
    return items;
  }, [messages, inboxFilter, typeFilter, channelFilterInbox]);

  const unreadCount = messages.filter((m) => m.status === "new").length;
  const flaggedCount = messages.filter((m) => m.isFlagged).length;

  const updateMessageStatus = async (messageId: string, newStatus: InboxStatus) => {
    await supabaseClient.from("content_social_inbox").update({ status: newStatus }).eq("id", messageId);
    onRefresh();
  };

  const toggleFlag = async (messageId: string, flagged: boolean) => {
    await supabaseClient.from("content_social_inbox").update({ is_flagged: !flagged }).eq("id", messageId);
    onRefresh();
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setReplying(true);
    try {
      await fetch("/api/content/social/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: selectedMessage.id,
          channelId: selectedMessage.channelId,
          body: replyText.trim(),
          platform: selectedMessage.platform,
          externalId: selectedMessage.externalId,
        }),
      });
      await updateMessageStatus(selectedMessage.id, "replied");
      setReplyText("");
      setSelectedMessage(null);
    } catch {
      // silently fail
    } finally {
      setReplying(false);
    }
  };

  const getMessageIcon = (type: InboxMessageType) => {
    const icons: Record<InboxMessageType, React.ReactNode> = {
      comment: <MessageSquare className="h-4 w-4 text-blue-500" />,
      dm: <Mail className="h-4 w-4 text-violet-500" />,
      mention: <AtSign className="h-4 w-4 text-indigo-500" />,
      reply: <CornerUpLeft className="h-4 w-4 text-sky-500" />,
      review: <Star className="h-4 w-4 text-amber-500" />,
      reaction: <Heart className="h-4 w-4 text-pink-500" />,
      follow: <UserPlus className="h-4 w-4 text-emerald-500" />,
      share: <Share2 className="h-4 w-4 text-cyan-500" />,
      tag: <Tag className="h-4 w-4 text-orange-500" />,
      other: <Bell className="h-4 w-4 text-gray-500" />,
    };
    return icons[type] ?? <Bell className="h-4 w-4 text-gray-500" />;
  };

  const getSentimentBadge = (sentiment: string | null | undefined) => {
    if (!sentiment) return null;
    const map: Record<string, { color: string; label: string }> = {
      positive: { color: "bg-emerald-100 text-emerald-700", label: "Positive" },
      negative: { color: "bg-red-100 text-red-700", label: "Negative" },
      neutral: { color: "bg-gray-100 text-gray-600", label: "Neutral" },
      question: { color: "bg-blue-100 text-blue-700", label: "Question" },
      urgent: { color: "bg-orange-100 text-orange-700", label: "Urgent" },
    };
    const cfg = map[sentiment];
    if (!cfg) return null;
    return <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Inbox className="h-5 w-5 text-indigo-500" /> Social Inbox
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">{unreadCount} new</Badge>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {flaggedCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {flaggedCount} flagged
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={inboxFilter} onValueChange={(v) => setInboxFilter(v as typeof inboxFilter)}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-[150px] h-8">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(Object.entries(INBOX_TYPE_CONFIG) as [InboxMessageType, typeof INBOX_TYPE_CONFIG[InboxMessageType]][]).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilterInbox} onValueChange={setChannelFilterInbox}>
          <SelectTrigger className="w-[150px] h-8">
            <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {channels.filter((c) => c.authStatus === "connected").map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} message{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-12 w-12 text-muted-foreground/50" />}
          title="Inbox empty"
          description="Connect your social accounts to start receiving messages"
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((msg) => {
            const ch = msg.channelId ? channelMap[msg.channelId] : undefined;
            const isNew = msg.status === "new";
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors group",
                  isNew ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" : "hover:bg-muted/50",
                  selectedMessage?.id === msg.id && "ring-2 ring-indigo-500"
                )}
                onClick={() => {
                  setSelectedMessage(msg);
                  if (isNew) updateMessageStatus(msg.id, "read");
                }}
              >
                {/* Type icon */}
                <div className="mt-0.5 w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {getMessageIcon(msg.messageType)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm", isNew ? "font-semibold" : "font-medium")}>
                      {msg.authorName || "Unknown"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      @{msg.authorUsername || "unknown"}
                    </span>
                    {ch && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: ch.color + "18", color: ch.color }}
                      >
                        {ch.name}
                      </span>
                    )}
                    {getSentimentBadge(msg.sentiment)}
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {INBOX_TYPE_CONFIG[msg.messageType]?.label || msg.messageType}
                    </Badge>
                  </div>
                  <p className={cn("text-sm mt-0.5 line-clamp-2", isNew ? "text-foreground" : "text-muted-foreground")}>
                    {msg.body}
                  </p>
                  {msg.aiSuggestedReply && (
                    <div className="mt-1.5 flex items-start gap-1.5 bg-violet-50 dark:bg-violet-950/20 rounded-md px-2 py-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-violet-700 dark:text-violet-300 line-clamp-1">{msg.aiSuggestedReply}</p>
                    </div>
                  )}
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[11px] text-muted-foreground">{dayjs(msg.createdAt).fromNow()}</span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-6 w-6", msg.isFlagged && "text-amber-500")}
                      onClick={() => toggleFlag(msg.id, msg.isFlagged)}
                    >
                      <Star className={cn("h-3.5 w-3.5", msg.isFlagged && "fill-amber-500")} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateMessageStatus(msg.id, "read")}>
                          <Eye className="h-4 w-4 mr-2" /> Mark Read
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateMessageStatus(msg.id, "archived")}>
                          <Archive className="h-4 w-4 mr-2" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateMessageStatus(msg.id, "spam")} className="text-red-600">
                          <AlertCircle className="h-4 w-4 mr-2" /> Mark as Spam
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply panel */}
      {selectedMessage && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Reply className="h-4 w-4 text-indigo-500" />
                Reply to {selectedMessage.authorName || "message"}
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Original message */}
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">
                {selectedMessage.authorName} · {INBOX_TYPE_CONFIG[selectedMessage.messageType]?.label} · {dayjs(selectedMessage.createdAt).format("MMM D, h:mm A")}
              </p>
              <p className="text-sm">{selectedMessage.body}</p>
            </div>

            {/* AI suggested reply */}
            {selectedMessage.aiSuggestedReply && (
              <div className="flex items-start gap-2 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-md border border-violet-200 dark:border-violet-800">
                <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">AI Suggested Reply</p>
                  <p className="text-sm text-violet-800 dark:text-violet-200">{selectedMessage.aiSuggestedReply}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-violet-600"
                  onClick={() => setReplyText(selectedMessage.aiSuggestedReply || "")}
                >
                  Use This
                </Button>
              </div>
            )}

            {/* Reply input */}
            <Textarea
              placeholder="Type your reply…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setSelectedMessage(null); setReplyText(""); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleReply} disabled={!replyText.trim() || replying} className="gap-1.5">
                {replying ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="h-4 w-4" /> Send Reply</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTOMATIONS PANEL
   ═══════════════════════════════════════════════════════════ */
function AutomationsPanel({
  automations,
  channels,
  channelMap,
  onRefresh,
}: {
  automations: SocialAutomation[];
  channels: ContentChannel[];
  channelMap: Record<string, ContentChannel>;
  onRefresh: () => void;
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState<AutomationTrigger>("new_comment");
  const [newAction, setNewAction] = useState<AutomationAction>("auto_reply");
  const [newChannelId, setNewChannelId] = useState("");
  const [newAiEnabled, setNewAiEnabled] = useState(false);
  const [creating, setCreating] = useState(false);

  const activeCount = automations.filter((a) => a.isActive).length;
  const totalRuns = automations.reduce((s, a) => s + a.runsCount, 0);

  const toggleAutomation = async (id: string, isActive: boolean) => {
    await supabaseClient.from("content_social_automations").update({ is_active: !isActive }).eq("id", id);
    onRefresh();
  };

  const deleteAutomation = async (id: string) => {
    await supabaseClient.from("content_social_automations").delete().eq("id", id);
    onRefresh();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      await supabaseClient.from("content_social_automations").insert({
        user_id: user.id,
        name: newName.trim(),
        trigger: newTrigger,
        action: newAction,
        channel_id: newChannelId || null,
        ai_enabled: newAiEnabled,
        is_active: true,
        trigger_config: {},
        action_config: {},
      });
      onRefresh();
      setShowCreateDialog(false);
      setNewName("");
      setNewTrigger("new_comment");
      setNewAction("auto_reply");
      setNewChannelId("");
      setNewAiEnabled(false);
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const getTriggerIcon = (trigger: AutomationTrigger) => {
    const icons: Record<AutomationTrigger, React.ReactNode> = {
      new_follower: <UserPlus className="h-4 w-4 text-emerald-500" />,
      new_comment: <MessageSquare className="h-4 w-4 text-blue-500" />,
      new_dm: <Mail className="h-4 w-4 text-violet-500" />,
      keyword_mention: <Search className="h-4 w-4 text-indigo-500" />,
      new_review: <Star className="h-4 w-4 text-amber-500" />,
      post_published: <Send className="h-4 w-4 text-emerald-500" />,
      schedule: <Clock className="h-4 w-4 text-blue-500" />,
      manual: <Settings2 className="h-4 w-4 text-gray-500" />,
    };
    return icons[trigger] ?? <Zap className="h-4 w-4 text-amber-500" />;
  };

  const getActionIcon = (action: AutomationAction) => {
    const icons: Record<AutomationAction, React.ReactNode> = {
      auto_reply: <CornerUpLeft className="h-4 w-4 text-blue-500" />,
      send_dm: <Mail className="h-4 w-4 text-violet-500" />,
      add_label: <Tag className="h-4 w-4 text-indigo-500" />,
      notify_team: <Bell className="h-4 w-4 text-amber-500" />,
      create_task: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      forward_email: <ExternalLink className="h-4 w-4 text-sky-500" />,
      ai_reply: <Sparkles className="h-4 w-4 text-violet-500" />,
      cross_post: <Share2 className="h-4 w-4 text-cyan-500" />,
      archive: <Archive className="h-4 w-4 text-gray-500" />,
    };
    return icons[action] ?? <Zap className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-500" /> Automations
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {activeCount} active
            </span>
            <span>{totalRuns.toLocaleString()} total runs</span>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Automation
          </Button>
        </div>
      </div>

      {/* Automations list */}
      {automations.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-12 w-12 text-muted-foreground/50" />}
          title="No automations yet"
          description="Create automated workflows to handle social media interactions"
          action={
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create First Automation
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {automations.map((auto) => {
            const ch = auto.channelId ? channelMap[auto.channelId] : undefined;
            const triggerCfg = AUTOMATION_TRIGGER_CONFIG[auto.trigger];
            const actionCfg = AUTOMATION_ACTION_CONFIG[auto.action];

            return (
              <Card key={auto.id} className={cn("p-4 transition-all", !auto.isActive && "opacity-60")}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      auto.isActive ? "bg-violet-100 dark:bg-violet-950/30" : "bg-muted"
                    )}>
                      <Bot className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{auto.name}</h4>
                      {ch && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: ch.color + "18", color: ch.color }}
                        >
                          {ch.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auto.isActive}
                      onCheckedChange={() => toggleAutomation(auto.id, auto.isActive)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleAutomation(auto.id, auto.isActive)}>
                          {auto.isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                          {auto.isActive ? "Pause" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteAutomation(auto.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Trigger → Action flow */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {/* Trigger */}
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-7 h-7 rounded bg-background flex items-center justify-center border">
                      {getTriggerIcon(auto.trigger)}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{triggerCfg?.label || auto.trigger}</p>
                      <p className="text-[10px] text-muted-foreground">{triggerCfg?.description || "Trigger"}</p>
                    </div>
                  </div>

                  <ArrowUpRight className="h-4 w-4 text-muted-foreground rotate-90 flex-shrink-0" />

                  {/* Action */}
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-7 h-7 rounded bg-background flex items-center justify-center border">
                      {getActionIcon(auto.action)}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{actionCfg?.label || auto.action}</p>
                      <p className="text-[10px] text-muted-foreground">{actionCfg?.description || "Action"}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {auto.aiEnabled && (
                      <span className="flex items-center gap-1 text-violet-600">
                        <Sparkles className="h-3 w-3" /> AI Powered
                        {auto.aiTone && <span className="text-muted-foreground">· {auto.aiTone}</span>}
                      </span>
                    )}
                    <span>{auto.runsCount.toLocaleString()} runs</span>
                  </div>
                  {auto.lastRunAt && (
                    <span>Last: {dayjs(auto.lastRunAt).fromNow()}</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Automation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-500" />
              New Automation
            </DialogTitle>
            <DialogDescription>
              Create an automated workflow to handle social media interactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                placeholder="E.g. Auto-reply to new comments"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">When (Trigger)</label>
                <Select value={newTrigger} onValueChange={(v) => setNewTrigger(v as AutomationTrigger)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(AUTOMATION_TRIGGER_CONFIG) as [AutomationTrigger, typeof AUTOMATION_TRIGGER_CONFIG[AutomationTrigger]][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Then (Action)</label>
                <Select value={newAction} onValueChange={(v) => setNewAction(v as AutomationAction)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(AUTOMATION_ACTION_CONFIG) as [AutomationAction, typeof AUTOMATION_ACTION_CONFIG[AutomationAction]][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Channel (optional)</label>
              <Select value={newChannelId} onValueChange={setNewChannelId}>
                <SelectTrigger>
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Channels</SelectItem>
                  {channels.filter((c) => c.authStatus === "connected").map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <div>
                  <p className="text-sm font-medium">AI-Powered</p>
                  <p className="text-xs text-muted-foreground">Let AI generate intelligent responses</p>
                </div>
              </div>
              <Switch checked={newAiEnabled} onCheckedChange={setNewAiEnabled} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || creating} className="gap-1.5">
                {creating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                ) : (
                  <><Zap className="h-4 w-4" /> Create Automation</>
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
   ACCOUNTS PANEL (Connected Social Accounts)
   ═══════════════════════════════════════════════════════════ */
function AccountsPanel({
  channels,
  onRefresh,
}: {
  channels: ContentChannel[];
  onRefresh: () => void;
}) {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [connecting, setConnecting] = useState(false);

  const connectedChannels = channels.filter((c) => c.authStatus === "connected");
  const disconnectedChannels = channels.filter((c) => c.authStatus !== "connected");

  const platformAccounts = useMemo(() => {
    const map: Record<string, ContentChannel[]> = {};
    channels.forEach((ch) => {
      if (!map[ch.platform]) map[ch.platform] = [];
      map[ch.platform].push(ch);
    });
    return map;
  }, [channels]);

  const availablePlatforms: { platform: Platform; label: string; color: string; description: string }[] = [
    { platform: "instagram", label: "Instagram", color: "#E1306C", description: "Share photos, reels and stories" },
    { platform: "facebook", label: "Facebook", color: "#1877F2", description: "Pages, groups and marketplace" },
    { platform: "twitter", label: "X (Twitter)", color: "#1DA1F2", description: "Posts, threads and spaces" },
    { platform: "linkedin", label: "LinkedIn", color: "#0A66C2", description: "Professional network and articles" },
    { platform: "tiktok", label: "TikTok", color: "#000000", description: "Short-form video content" },
    { platform: "youtube", label: "YouTube", color: "#FF0000", description: "Video hosting and streaming" },
    { platform: "pinterest", label: "Pinterest", color: "#E60023", description: "Visual bookmarking and discovery" },
    { platform: "blog", label: "Blog / Website", color: "#6366f1", description: "Your own blog or website" },
    { platform: "newsletter", label: "Newsletter", color: "#059669", description: "Email newsletter publishing" },
  ];

  const handleConnect = async () => {
    if (!selectedPlatform || !newChannelName.trim()) return;
    setConnecting(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      // In production, this would redirect to OAuth flow
      // For now, create the channel record with "connecting" status
      await supabaseClient.from("content_channels").insert({
        user_id: user.id,
        name: newChannelName.trim(),
        platform: selectedPlatform,
        auth_status: "connecting",
        color: availablePlatforms.find((p) => p.platform === selectedPlatform)?.color || "#6366f1",
      });

      onRefresh();
      setConnectDialogOpen(false);
      setSelectedPlatform(null);
      setNewChannelName("");

      // Simulate OAuth callback completing after a short delay
      setTimeout(async () => {
        // In production, this would be handled by the OAuth callback route
        // Here we simulate a successful connection
        const { data: latestChannel } = await supabaseClient
          .from("content_channels")
          .select("id")
          .eq("user_id", user.id)
          .eq("platform", selectedPlatform)
          .eq("auth_status", "connecting")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestChannel) {
          await supabaseClient
            .from("content_channels")
            .update({
              auth_status: "connected",
              platform_username: newChannelName.toLowerCase().replace(/\s+/g, "_"),
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", latestChannel.id);
          onRefresh();
        }
      }, 2000);
    } catch {
      // silently fail
    } finally {
      setConnecting(false);
    }
  };

  const disconnectChannel = async (channelId: string) => {
    await supabaseClient.from("content_channels").update({
      auth_status: "disconnected",
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
    }).eq("id", channelId);
    onRefresh();
  };

  const reconnectChannel = async (channelId: string) => {
    await supabaseClient.from("content_channels").update({
      auth_status: "connecting",
    }).eq("id", channelId);
    onRefresh();

    // Simulate reconnection
    setTimeout(async () => {
      await supabaseClient.from("content_channels").update({
        auth_status: "connected",
        last_synced_at: new Date().toISOString(),
      }).eq("id", channelId);
      onRefresh();
    }, 2000);
  };

  const getAuthStatusIcon = (status: ChannelAuthStatus) => {
    const icons: Record<ChannelAuthStatus, React.ReactNode> = {
      disconnected: <WifiOff className="h-4 w-4 text-gray-400" />,
      connecting: <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />,
      connected: <Wifi className="h-4 w-4 text-emerald-500" />,
      expired: <AlertCircle className="h-4 w-4 text-orange-500" />,
      error: <AlertCircle className="h-4 w-4 text-red-500" />,
    };
    return icons[status] ?? <WifiOff className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Link2 className="h-5 w-5 text-blue-500" /> Connected Accounts
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              {connectedChannels.length} connected
            </span>
            {disconnectedChannels.length > 0 && (
              <span className="flex items-center gap-1.5">
                <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                {disconnectedChannels.length} disconnected
              </span>
            )}
          </div>
          <Button size="sm" onClick={() => setConnectDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Connect Account
          </Button>
        </div>
      </div>

      {/* Connected channels */}
      {channels.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-12 w-12 text-muted-foreground/50" />}
          title="No accounts connected"
          description="Connect your social media accounts to start publishing and managing content"
          action={
            <Button size="sm" onClick={() => setConnectDialogOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Connect First Account
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {channels.map((ch) => {
            const authCfg = AUTH_STATUS_CONFIG[ch.authStatus || "disconnected"];
            const platformCfg = PLATFORM_CONFIG[ch.platform];

            return (
              <Card key={ch.id} className={cn(
                "p-4 transition-all",
                ch.authStatus === "connected" ? "border-emerald-200 dark:border-emerald-800" : "",
                ch.authStatus === "error" || ch.authStatus === "expired" ? "border-red-200 dark:border-red-800" : ""
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: ch.color || "#6366f1" }}
                    >
                      {platformCfg?.label?.charAt(0) || ch.platform.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{ch.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{platformCfg?.label || ch.platform}</span>
                        {ch.platformUsername && (
                          <span className="text-xs text-muted-foreground">· @{ch.platformUsername}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {getAuthStatusIcon(ch.authStatus || "disconnected")}
                </div>

                {/* Auth status */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1", authCfg.color)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", authCfg.dotColor)} />
                    {authCfg.label}
                  </span>
                  {ch.lastSyncedAt && (
                    <span className="text-[11px] text-muted-foreground">
                      Synced {dayjs(ch.lastSyncedAt).fromNow()}
                    </span>
                  )}
                </div>

                {/* Auth scopes */}
                {ch.authScopes && ch.authScopes.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mb-3">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    {ch.authScopes.slice(0, 3).map((scope: string) => (
                      <span key={scope} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        {scope}
                      </span>
                    ))}
                    {ch.authScopes.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{ch.authScopes.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Token expiry warning */}
                {ch.tokenExpiresAt && ch.authStatus === "connected" && (
                  <div className="mb-3">
                    {dayjs(ch.tokenExpiresAt).isBefore(dayjs().add(7, "day")) ? (
                      <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/20 rounded-md px-2 py-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Token expires {dayjs(ch.tokenExpiresAt).fromNow()}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  {ch.authStatus === "connected" ? (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => disconnectChannel(ch.id)}>
                        <Power className="h-3.5 w-3.5" /> Disconnect
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => reconnectChannel(ch.id)}>
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                      </Button>
                    </>
                  ) : ch.authStatus === "connecting" ? (
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" disabled>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…
                    </Button>
                  ) : (
                    <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => reconnectChannel(ch.id)}>
                      <Power className="h-3.5 w-3.5" /> Reconnect
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Connect Account Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-500" />
              Connect Account
            </DialogTitle>
            <DialogDescription>
              Choose a platform and connect your account to start publishing content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Platform selection */}
            {!selectedPlatform ? (
              <div className="grid grid-cols-1 gap-2">
                {availablePlatforms.map(({ platform, label, color, description }) => {
                  const existing = platformAccounts[platform] || [];
                  return (
                    <div
                      key={platform}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedPlatform(platform)}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {label.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                      {existing.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {existing.length} connected
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => setSelectedPlatform(null)}>
                  ← Back to platforms
                </Button>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: availablePlatforms.find((p) => p.platform === selectedPlatform)?.color || "#6366f1" }}
                  >
                    {availablePlatforms.find((p) => p.platform === selectedPlatform)?.label.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {availablePlatforms.find((p) => p.platform === selectedPlatform)?.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {availablePlatforms.find((p) => p.platform === selectedPlatform)?.description}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Account Name</label>
                  <Input
                    placeholder="E.g. My Instagram Business"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    A friendly name to identify this account in your workspace.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 rounded-md p-3 border border-blue-200 dark:border-blue-800">
                  <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    You&apos;ll be redirected to {availablePlatforms.find((p) => p.platform === selectedPlatform)?.label} to authorize access. We only request permissions needed to publish and read content.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setSelectedPlatform(null); setNewChannelName(""); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleConnect} disabled={!newChannelName.trim() || connecting} className="gap-1.5">
                    {connecting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
                    ) : (
                      <><Power className="h-4 w-4" /> Connect Account</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
