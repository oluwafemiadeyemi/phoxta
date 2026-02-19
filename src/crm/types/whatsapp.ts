export type MessagingChannel = "web_chat" | "whatsapp" | "email";

export interface MessagingConfig {
  id: string;
  userId: string;
  storeId?: string;
  channelsEnabled: MessagingChannel[];
  // WhatsApp credentials (optional)
  waPhoneNumberId: string;
  waBusinessAccountId: string;
  waAccessToken: string;
  waVerifyToken: string;
  waWebhookSecret: string;
  // Display
  displayPhone: string;
  businessName: string;
  // Web chat widget
  chatWidgetEnabled: boolean;
  chatWidgetTitle: string;
  chatWidgetSubtitle: string;
  chatWidgetColor: string;
  chatWidgetPosition: string;
  chatWidgetGreeting: string;
  // AI
  aiEnabled: boolean;
  aiGreeting: string;
  aiPersona: string;
  aiAutoReplyDelayMs: number;
  aiHandleOrders: boolean;
  aiHandleProducts: boolean;
  aiHandleSupport: boolean;
  aiEscalationKeywords: string[];
  // Notifications
  notifyNewMessage: boolean;
  notifyNewConversation: boolean;
  // Status
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessagingConversation {
  id: string;
  userId: string;
  configId: string;
  customerId?: string;
  channel: MessagingChannel;
  contactId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  profilePicUrl: string;
  status: "open" | "assigned" | "resolved" | "spam";
  assignedTo: string;
  priority: "low" | "normal" | "high" | "urgent";
  tags: string[];
  aiHandled: boolean;
  aiEscalated: boolean;
  aiContext: Record<string, unknown>;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessagingMessage {
  id: string;
  userId: string;
  conversationId: string;
  externalMessageId: string;
  channel: MessagingChannel;
  direction: "inbound" | "outbound";
  messageType: string;
  body: string;
  mediaUrl: string;
  mediaMimeType: string;
  mediaCaption: string;
  templateName: string;
  templateParams: unknown[];
  interactiveData: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  locationName: string;
  status: string;
  errorMessage: string;
  aiGenerated: boolean;
  aiConfidence: number;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface MessagingTemplate {
  id: string;
  userId: string;
  configId: string;
  name: string;
  category: string;
  language: string;
  headerType: string;
  headerText: string;
  headerMediaUrl: string;
  bodyText: string;
  footerText: string;
  buttons: unknown[];
  metaTemplateId: string;
  approvalStatus: string;
  rejectionReason: string;
  timesSent: number;
  lastSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagingQuickReply {
  id: string;
  userId: string;
  shortcut: string;
  title: string;
  body: string;
  category: string;
  createdAt: string;
}

export interface MessagingAutomation {
  id: string;
  userId: string;
  configId: string;
  name: string;
  description: string;
  triggerType: string;
  triggerValue: string;
  actionType: string;
  actionConfig: Record<string, unknown>;
  conditions: Record<string, unknown>;
  channels: MessagingChannel[];
  isActive: boolean;
  timesTriggered: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}
