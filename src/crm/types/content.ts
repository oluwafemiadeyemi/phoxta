// ─── Content Studio — Type Definitions ───

export type Platform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "x"
  | "twitter"
  | "pinterest"
  | "youtube"
  | "blog"
  | "email"
  | "newsletter"
  | "other";

export type ContentType =
  | "social_post"
  | "article"
  | "email_campaign"
  | "newsletter"
  | "video_script"
  | "story"
  | "reel"
  | "carousel"
  | "thread"
  | "pin"
  | "other";

export type PostStatus =
  | "idea"
  | "draft"
  | "review"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "archived";

export type ApprovalStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export type IdeaStatus = "new" | "exploring" | "ready" | "used" | "archived";

export type IdeaPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type ChannelAuthStatus = "disconnected" | "connecting" | "connected" | "expired" | "error";

export type InboxMessageType = "comment" | "dm" | "mention" | "reply" | "review" | "reaction" | "follow" | "share" | "tag" | "other";

export type InboxDirection = "inbound" | "outbound";

export type InboxStatus = "new" | "read" | "replied" | "archived" | "spam";

export type Sentiment = "positive" | "neutral" | "negative" | "question" | "urgent";

export type AutomationTrigger =
  | "new_follower"
  | "new_comment"
  | "new_dm"
  | "keyword_mention"
  | "new_review"
  | "post_published"
  | "schedule"
  | "manual";

export type AutomationAction =
  | "auto_reply"
  | "send_dm"
  | "add_label"
  | "notify_team"
  | "create_task"
  | "forward_email"
  | "ai_reply"
  | "cross_post"
  | "archive";

export type AiTone = "professional" | "friendly" | "casual" | "formal" | "witty" | "empathetic";

export type CrossPostStatus = "pending" | "posting" | "posted" | "failed" | "cancelled";

// ── Entities ──

export interface ContentChannel {
  id: string;
  userId: string;
  name: string;
  platform: Platform;
  color: string;
  icon?: string;
  accountName?: string;
  accountId?: string;
  accountUrl?: string;
  avatarUrl?: string;
  isActive: boolean;
  // OAuth
  authStatus: ChannelAuthStatus;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  apiKey?: string;
  webhookUrl?: string;
  platformUserId?: string;
  platformUsername?: string;
  authScopes: string[];
  // Capabilities
  canPost: boolean;
  canReadInbox: boolean;
  canComment: boolean;
  canDm: boolean;
  canAnalytics: boolean;
  // Settings
  autoReplyEnabled: boolean;
  defaultHashtags: string[];
  postingTimezone: string;
  config: Record<string, unknown>;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentLabel {
  id: string;
  userId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface ContentPost {
  id: string;
  userId: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  contentType: ContentType;
  status: PostStatus;
  channelId?: string;
  labelId?: string;
  tags: string[];
  coverImage?: string;
  scheduledAt?: string;
  publishedAt?: string;
  autoPublish: boolean;
  approval: ApprovalStatus;
  approvalNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  views: number;
  clicks: number;
  likes: number;
  shares: number;
  commentsCount: number;
  engagementRate: number;
  aiGenerated: boolean;
  aiPrompt?: string;
  authorName: string;
  wordCount: number;
  readingTime: number;
  platformData: Record<string, unknown>;
  duplicatedFrom?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  channel?: ContentChannel;
  label?: ContentLabel;
}

export interface ContentMedia {
  id: string;
  userId: string;
  postId?: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  width?: number;
  height?: number;
  altText: string;
  caption: string;
  folder: string;
  sortOrder: number;
  createdAt: string;
}

export interface ContentIdea {
  id: string;
  userId: string;
  title: string;
  description?: string;
  notes?: string;
  color: string;
  tags: string[];
  priority: IdeaPriority;
  status: IdeaStatus;
  labelId?: string;
  channelId?: string;
  convertedPostId?: string;
  referenceUrl?: string;
  referenceImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentComment {
  id: string;
  userId: string;
  postId?: string;
  ideaId?: string;
  parentId?: string;
  body: string;
  authorName?: string;
  isInternal: boolean;
  attachments: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentActivityLog {
  id: string;
  userId: string;
  postId?: string;
  ideaId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  actorName?: string;
  details: Record<string, unknown>;
  createdAt: string;
}

// ── Social Inbox ──

export interface SocialInboxMessage {
  id: string;
  userId: string;
  platform: Platform;
  externalId?: string;
  channelId?: string;
  postId?: string;
  messageType: InboxMessageType;
  direction: InboxDirection;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  body: string;
  status: InboxStatus;
  isFlagged: boolean;
  sentiment?: Sentiment;
  aiSuggestedReply?: string;
  repliedAt?: string;
  parentExternalId?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  channel?: ContentChannel;
}

// ── Social Automations ──

export interface SocialAutomation {
  id: string;
  userId: string;
  name: string;
  trigger: AutomationTrigger;
  triggerConfig: Record<string, unknown>;
  action: AutomationAction;
  actionConfig: Record<string, unknown>;
  aiEnabled: boolean;
  aiTone?: AiTone;
  channelId?: string;
  isActive: boolean;
  runsCount: number;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  channel?: ContentChannel;
}

// ── Cross-Posts ──

export interface ContentCrossPost {
  id: string;
  postId: string;
  channelId: string;
  platformPostId?: string;
  platformUrl?: string;
  status: CrossPostStatus;
  postedAt?: string;
  errorMessage?: string;
  engagement?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined
  channel?: ContentChannel;
}

export interface ContentTask {
  id: string;
  userId: string;
  postId?: string;
  ideaId?: string;
  title: string;
  description?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  status: TaskStatus;
  priority: IdeaPriority;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Platform Config Helpers ──

export const PLATFORM_CONFIG: Record<
  Platform,
  { label: string; color: string; charLimit: number; icon: string }
> = {
  facebook: { label: "Facebook", color: "#1877F2", charLimit: 63206, icon: "facebook" },
  instagram: { label: "Instagram", color: "#E4405F", charLimit: 2200, icon: "instagram" },
  linkedin: { label: "LinkedIn", color: "#0A66C2", charLimit: 3000, icon: "linkedin" },
  tiktok: { label: "TikTok", color: "#010101", charLimit: 2200, icon: "music" },
  x: { label: "X (Twitter)", color: "#000000", charLimit: 280, icon: "twitter" },
  twitter: { label: "Twitter", color: "#1DA1F2", charLimit: 280, icon: "twitter" },
  pinterest: { label: "Pinterest", color: "#E60023", charLimit: 500, icon: "pin" },
  youtube: { label: "YouTube", color: "#FF0000", charLimit: 5000, icon: "youtube" },
  blog: { label: "Blog", color: "#6366f1", charLimit: 100000, icon: "book-open" },
  email: { label: "Email", color: "#8b5cf6", charLimit: 100000, icon: "mail" },
  newsletter: { label: "Newsletter", color: "#f59e0b", charLimit: 100000, icon: "newspaper" },
  other: { label: "Other", color: "#6b7280", charLimit: 100000, icon: "globe" },
};

export const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; color: string; dotColor: string }
> = {
  idea: { label: "Idea", color: "bg-purple-100 text-purple-700", dotColor: "bg-purple-500" },
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", dotColor: "bg-slate-500" },
  review: { label: "In Review", color: "bg-amber-100 text-amber-700", dotColor: "bg-amber-500" },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700", dotColor: "bg-blue-500" },
  publishing: { label: "Publishing", color: "bg-indigo-100 text-indigo-700", dotColor: "bg-indigo-500" },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700", dotColor: "bg-emerald-500" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700", dotColor: "bg-red-500" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500", dotColor: "bg-gray-400" },
};

export const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: string }> = {
  social_post: { label: "Social Post", icon: "share-2" },
  article: { label: "Article", icon: "file-text" },
  email_campaign: { label: "Email Campaign", icon: "mail" },
  newsletter: { label: "Newsletter", icon: "newspaper" },
  video_script: { label: "Video Script", icon: "video" },
  story: { label: "Story", icon: "image" },
  reel: { label: "Reel", icon: "film" },
  carousel: { label: "Carousel", icon: "layers" },
  thread: { label: "Thread", icon: "message-circle" },
  pin: { label: "Pin", icon: "pin" },
  other: { label: "Other", icon: "file" },
};

export const APPROVAL_CONFIG: Record<
  ApprovalStatus,
  { label: string; color: string }
> = {
  none: { label: "None", color: "bg-gray-100 text-gray-600" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  changes_requested: { label: "Changes Requested", color: "bg-orange-100 text-orange-700" },
};

export const IDEA_STATUS_CONFIG: Record<
  IdeaStatus,
  { label: string; color: string }
> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  exploring: { label: "Exploring", color: "bg-violet-100 text-violet-700" },
  ready: { label: "Ready", color: "bg-emerald-100 text-emerald-700" },
  used: { label: "Used", color: "bg-slate-100 text-slate-600" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500" },
};

export const AUTH_STATUS_CONFIG: Record<
  ChannelAuthStatus,
  { label: string; color: string; dotColor: string }
> = {
  disconnected: { label: "Disconnected", color: "bg-gray-100 text-gray-600", dotColor: "bg-gray-400" },
  connecting: { label: "Connecting…", color: "bg-yellow-100 text-yellow-700", dotColor: "bg-yellow-500" },
  connected: { label: "Connected", color: "bg-emerald-100 text-emerald-700", dotColor: "bg-emerald-500" },
  expired: { label: "Expired", color: "bg-orange-100 text-orange-700", dotColor: "bg-orange-500" },
  error: { label: "Error", color: "bg-red-100 text-red-700", dotColor: "bg-red-500" },
};

export const INBOX_TYPE_CONFIG: Record<
  InboxMessageType,
  { label: string; icon: string; color: string }
> = {
  comment: { label: "Comment", icon: "message-square", color: "text-blue-600" },
  dm: { label: "Direct Message", icon: "mail", color: "text-violet-600" },
  mention: { label: "Mention", icon: "at-sign", color: "text-indigo-600" },
  reply: { label: "Reply", icon: "corner-up-left", color: "text-sky-600" },
  review: { label: "Review", icon: "star", color: "text-amber-600" },
  reaction: { label: "Reaction", icon: "heart", color: "text-pink-600" },
  follow: { label: "New Follower", icon: "user-plus", color: "text-emerald-600" },
  share: { label: "Share", icon: "share-2", color: "text-cyan-600" },
  tag: { label: "Tagged", icon: "tag", color: "text-orange-600" },
  other: { label: "Other", icon: "bell", color: "text-gray-600" },
};

export const AUTOMATION_TRIGGER_CONFIG: Record<
  AutomationTrigger,
  { label: string; description: string; icon: string }
> = {
  new_follower: { label: "New Follower", description: "When someone follows your account", icon: "user-plus" },
  new_comment: { label: "New Comment", description: "When someone comments on your post", icon: "message-square" },
  new_dm: { label: "New DM", description: "When you receive a direct message", icon: "mail" },
  keyword_mention: { label: "Keyword Mention", description: "When specific keywords are detected", icon: "search" },
  new_review: { label: "New Review", description: "When a new review is posted", icon: "star" },
  post_published: { label: "Post Published", description: "When you publish a new post", icon: "send" },
  schedule: { label: "Scheduled", description: "Run on a recurring schedule", icon: "clock" },
  manual: { label: "Manual", description: "Triggered manually by you", icon: "hand" },
};

export const AUTOMATION_ACTION_CONFIG: Record<
  AutomationAction,
  { label: string; description: string; icon: string }
> = {
  auto_reply: { label: "Auto Reply", description: "Send an automatic reply", icon: "corner-up-left" },
  send_dm: { label: "Send DM", description: "Send a direct message", icon: "mail" },
  add_label: { label: "Add Label", description: "Apply a label to the content", icon: "tag" },
  notify_team: { label: "Notify Team", description: "Send a notification to your team", icon: "bell" },
  create_task: { label: "Create Task", description: "Create a follow-up task", icon: "check-square" },
  forward_email: { label: "Forward Email", description: "Forward to an email address", icon: "forward" },
  ai_reply: { label: "AI Reply", description: "Generate and send an AI-powered reply", icon: "sparkles" },
  cross_post: { label: "Cross-Post", description: "Publish to other connected channels", icon: "share-2" },
  archive: { label: "Archive", description: "Automatically archive the message", icon: "archive" },
};
