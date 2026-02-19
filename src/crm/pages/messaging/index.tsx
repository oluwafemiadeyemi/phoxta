import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  MessageCircle,
  Search,
  Send,
  Settings,
  Bot,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Zap,
  Plus,
  Archive,
  Star,
  Tag,
  ArrowLeft,
  Loader2,
  Sparkles,
  FileText,
  X,
  MessageSquare,
  Globe,
  Copy,
  RefreshCw,
  UserPlus,
  AlertTriangle,
  BotMessageSquare,
  HandMetal,
  Hash,
  Wand2,
  ShoppingCart,
  Package,
  Headphones,
  Shield,
  Palette,
  MessageSquareDashed,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Badge } from "@crm/components/ui/badge";
import { Switch } from "@crm/components/ui/switch";
import { Textarea } from "@crm/components/ui/textarea";
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
import type {
  MessagingConfig,
  MessagingConversation,
  MessagingMessage,
  MessagingQuickReply,
  MessagingAutomation,
  MessagingChannel,
} from "@crm/types/whatsapp";

dayjs.extend(relativeTime);

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

function statusIcon(status: string) {
  switch (status) {
    case "sent":
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case "failed":
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return <Clock className="h-3 w-3 text-muted-foreground/50" />;
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-700 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "low":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-green-100 text-green-700 border-green-200";
  }
}

function channelLabel(ch: string) {
  switch (ch) {
    case "whatsapp":
      return "WhatsApp";
    case "web_chat":
      return "Web Chat";
    case "email":
      return "Email";
    default:
      return ch;
  }
}

function channelColor(ch: string) {
  switch (ch) {
    case "whatsapp":
      return "bg-green-100 text-green-700";
    case "web_chat":
      return "bg-blue-100 text-blue-700";
    case "email":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  switch (channel) {
    case "whatsapp":
      return <Phone className={className} />;
    case "web_chat":
      return <Globe className={className} />;
    case "email":
      return <MessageSquare className={className} />;
    default:
      return <MessageCircle className={className} />;
  }
}

type TabKey = "chats" | "automations" | "settings";

/* ═══════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════ */

export default function MessagingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("chats");
  const [config, setConfig] = useState<MessagingConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [conversations, setConversations] = useState<MessagingConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<MessagingConversation | null>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<MessagingQuickReply[]>([]);
  const [automations, setAutomations] = useState<MessagingAutomation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Data loading ── */

  useEffect(() => {
    loadConfig();
    loadQuickReplies();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (config) {
      loadConversations();
      pollingRef.current = setInterval(() => {
        loadConversations();
        if (selectedConversation) loadMessages(selectedConversation.id);
      }, 2000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [config?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConfig = async () => {
    setConfigLoading(true);
    // Fetch all configs for this user — prefer the one linked to a store
    const { data: configs } = await supabaseClient
      .from("messaging_config")
      .select("*")
      .order("created_at", { ascending: true });
    if (configs && configs.length > 0) {
      // Prefer config with store_id, otherwise take the first
      const withStore = configs.find((c: any) => c.store_id);
      setConfig(mapConfig(withStore || configs[0]));
    } else {
      setShowSetup(true);
    }
    setConfigLoading(false);
  };

  const loadConversations = async () => {
    if (!config) return;
    const { data } = await supabaseClient
      .from("messaging_conversations")
      .select("*")
      .eq("config_id", config.id)
      .order("last_message_at", { ascending: false });
    if (data) setConversations(data.map(mapConversation));
  };

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    const { data } = await supabaseClient
      .from("messaging_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data.map(mapMessage));
    setMessagesLoading(false);
  };

  const loadQuickReplies = async () => {
    const { data } = await supabaseClient
      .from("messaging_quick_replies")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setQuickReplies(data.map(mapQuickReply));
  };

  const loadAutomations = async () => {
    if (!config) return;
    const { data } = await supabaseClient
      .from("messaging_automations")
      .select("*")
      .eq("config_id", config.id)
      .order("created_at", { ascending: false });
    if (data) setAutomations(data.map(mapAutomation));
  };

  useEffect(() => {
    if (activeTab === "automations" && config) loadAutomations();
  }, [activeTab, config?.id]);

  /* ── Actions ── */

  const selectConversation = (conv: MessagingConversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
    loadMessages(conv.id);
    if (conv.unreadCount > 0) {
      supabaseClient
        .from("messaging_conversations")
        .update({ unread_count: 0 })
        .eq("id", conv.id)
        .then(() => {
          setConversations((prev) =>
            prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)),
          );
        });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !config || sending) return;
    setSending(true);
    try {
      const endpoint =
        selectedConversation.channel === "whatsapp"
          ? "/api/whatsapp/send"
          : "/api/messaging/send";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId: config.id,
          conversationId: selectedConversation.id,
          to: selectedConversation.contactId,
          type: "text",
          body: newMessage.trim(),
          channel: selectedConversation.channel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage("");
        loadMessages(selectedConversation.id);
        loadConversations();
      }
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (qr: MessagingQuickReply) => {
    setNewMessage(qr.body);
  };

  const updateConversationStatus = async (convId: string, status: string) => {
    await supabaseClient
      .from("messaging_conversations")
      .update({ status })
      .eq("id", convId);
    loadConversations();
    if (selectedConversation?.id === convId) {
      setSelectedConversation((prev) => prev ? { ...prev, status: status as any } : prev);
    }
  };

  const toggleAiForConversation = async (convId: string, aiHandled: boolean) => {
    await supabaseClient
      .from("messaging_conversations")
      .update({ ai_handled: aiHandled, ai_escalated: !aiHandled })
      .eq("id", convId);
    loadConversations();
    if (selectedConversation?.id === convId) {
      setSelectedConversation((prev) =>
        prev ? { ...prev, aiHandled, aiEscalated: !aiHandled } : prev,
      );
    }
  };

  /* ── Filtering ── */

  const filteredConversations = conversations.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.includes(q) ||
        c.customerEmail.toLowerCase().includes(q) ||
        c.lastMessagePreview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Messaging</h1>
            <p className="text-xs text-muted-foreground">
              {config?.businessName || "Set up your messaging channels"}
              {config?.isActive && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Active
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop tabs */}
          <div className="hidden sm:flex items-center bg-muted rounded-lg p-1 gap-1">
            {([
              { key: "chats" as const, icon: MessageSquare, label: "Chats" },
              { key: "automations" as const, icon: Zap, label: "Automations" },
              { key: "settings" as const, icon: Settings, label: "Settings" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.key === "chats" && totalUnread > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                    {totalUnread}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Mobile tabs */}
          <div className="flex sm:hidden items-center gap-1">
            {([
              { key: "chats" as const, icon: MessageSquare },
              { key: "automations" as const, icon: Zap },
              { key: "settings" as const, icon: Settings },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`p-2 rounded-lg transition-colors relative ${
                  activeTab === tab.key
                    ? "bg-blue-100 text-blue-700"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.key === "chats" && totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded-full min-w-[16px] text-center">
                    {totalUnread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chats" && (
          <ChatView
            config={config}
            conversations={filteredConversations}
            selectedConversation={selectedConversation}
            messages={messages}
            messagesLoading={messagesLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            channelFilter={channelFilter}
            onChannelFilterChange={setChannelFilter}
            onSelectConversation={selectConversation}
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
            onSendMessage={handleSendMessage}
            sending={sending}
            quickReplies={quickReplies}
            onQuickReply={handleQuickReply}
            onUpdateStatus={updateConversationStatus}
            onToggleAi={toggleAiForConversation}
            messagesEndRef={messagesEndRef}
            showMobileChat={showMobileChat}
            onBackToList={() => setShowMobileChat(false)}
            onSetup={() => setShowSetup(true)}
          />
        )}
        {activeTab === "automations" && (
          <AutomationsView config={config} automations={automations} onReload={loadAutomations} />
        )}
        {activeTab === "settings" && (
          <SettingsView config={config} onSaved={loadConfig} />
        )}
      </div>

      {showSetup && !config && (
        <SetupDialog
          open={showSetup}
          onClose={() => setShowSetup(false)}
          onSaved={() => { setShowSetup(false); loadConfig(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Chat View
   ═══════════════════════════════════════════════════════════ */

function ChatView({
  config,
  conversations,
  selectedConversation,
  messages,
  messagesLoading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  channelFilter,
  onChannelFilterChange,
  onSelectConversation,
  newMessage,
  onNewMessageChange,
  onSendMessage,
  sending,
  quickReplies,
  onQuickReply,
  onUpdateStatus,
  onToggleAi,
  messagesEndRef,
  showMobileChat,
  onBackToList,
  onSetup,
}: {
  config: MessagingConfig | null;
  conversations: MessagingConversation[];
  selectedConversation: MessagingConversation | null;
  messages: MessagingMessage[];
  messagesLoading: boolean;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  channelFilter: string;
  onChannelFilterChange: (v: string) => void;
  onSelectConversation: (c: MessagingConversation) => void;
  newMessage: string;
  onNewMessageChange: (v: string) => void;
  onSendMessage: () => void;
  sending: boolean;
  quickReplies: MessagingQuickReply[];
  onQuickReply: (qr: MessagingQuickReply) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onToggleAi: (id: string, aiHandled: boolean) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  showMobileChat: boolean;
  onBackToList: () => void;
  onSetup: () => void;
}) {
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showConvActions, setShowConvActions] = useState(false);

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold">Set Up Messaging</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Enable live chat on your storefront and optionally connect WhatsApp to manage all customer conversations in one place.
        </p>
        <Button onClick={onSetup} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Get Started
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* ── Left: Conversation list ── */}
      <div
        className={`w-full lg:w-[380px] xl:w-[420px] border-r flex flex-col shrink-0 bg-background ${
          showMobileChat ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Search & filters */}
        <div className="p-3 space-y-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9 bg-muted/50"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "open", "assigned", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => onStatusFilterChange(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? "bg-blue-100 text-blue-700"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <span className="text-muted-foreground/30">|</span>
            {(["all", "web_chat", "whatsapp"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => onChannelFilterChange(ch)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  channelFilter === ch
                    ? "bg-blue-100 text-blue-700"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {ch !== "all" && <ChannelIcon channel={ch} className="h-3 w-3" />}
                {ch === "all" ? "All" : channelLabel(ch)}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No matching conversations" : "No conversations yet"}
              </p>
              <p className="text-xs text-muted-foreground/70">
                Messages will appear here when customers reach out via your store&apos;s live chat or WhatsApp.
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full flex items-start gap-3 p-3 text-left border-b border-border/50 transition-colors hover:bg-muted/50 ${
                  selectedConversation?.id === conv.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                    {conv.customerName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  {/* Channel indicator */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-background ${
                    conv.channel === "whatsapp" ? "bg-green-500" : "bg-blue-500"
                  }`}>
                    <ChannelIcon channel={conv.channel} className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm truncate">
                      {conv.customerName || conv.customerPhone || conv.customerEmail || "Visitor"}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {conv.lastMessageAt ? dayjs(conv.lastMessageAt).fromNow() : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate pr-2">
                      {conv.lastMessagePreview || "No messages yet"}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.aiHandled && !conv.aiEscalated && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-purple-100 text-purple-700">
                          AI
                        </Badge>
                      )}
                      {conv.priority !== "normal" && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${priorityColor(conv.priority)}`}>
                          {conv.priority.toUpperCase()}
                        </span>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full min-w-[18px] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {conv.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {conv.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[9px] bg-muted rounded-md text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Message thread ── */}
      <div
        className={`flex-1 flex flex-col bg-[#f0f2f5] ${
          showMobileChat ? "flex" : "hidden lg:flex"
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 bg-background border-b shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBackToList}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                    {selectedConversation.customerName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-background ${
                    selectedConversation.channel === "whatsapp" ? "bg-green-500" : "bg-blue-500"
                  }`}>
                    <ChannelIcon channel={selectedConversation.channel} className="h-2 w-2 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {selectedConversation.customerName || selectedConversation.customerPhone || "Visitor"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${channelColor(selectedConversation.channel)}`}>
                      {channelLabel(selectedConversation.channel)}
                    </Badge>
                    {selectedConversation.customerPhone && (
                      <span>{selectedConversation.customerPhone}</span>
                    )}
                    {selectedConversation.aiHandled && !selectedConversation.aiEscalated && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 bg-purple-100 text-purple-700">
                        <Bot className="h-3 w-3" />
                        AI
                      </Badge>
                    )}
                    {selectedConversation.aiEscalated && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 bg-amber-100 text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        Escalated
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {config?.aiEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onToggleAi(selectedConversation.id, !selectedConversation.aiHandled)
                    }
                    className="gap-1.5 text-xs"
                  >
                    {selectedConversation.aiHandled ? (
                      <>
                        <HandMetal className="h-4 w-4" /> Take Over
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4" /> Enable AI
                      </>
                    )}
                  </Button>
                )}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConvActions(!showConvActions)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {showConvActions && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowConvActions(false)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-background rounded-xl shadow-xl border p-1 w-48">
                        <button
                          onClick={() => { onUpdateStatus(selectedConversation.id, "resolved"); setShowConvActions(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                        >
                          <Check className="h-4 w-4 text-green-600" /> Resolve
                        </button>
                        <button
                          onClick={() => { onUpdateStatus(selectedConversation.id, "open"); setShowConvActions(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" /> Reopen
                        </button>
                        <button
                          onClick={() => { onUpdateStatus(selectedConversation.id, "spam"); setShowConvActions(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                        >
                          <Archive className="h-4 w-4" /> Mark Spam
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1.5">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <MessageCircle className="h-10 w-10 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isOutbound = msg.direction === "outbound";
                    const showTime =
                      i === 0 ||
                      dayjs(msg.createdAt).diff(dayjs(messages[i - 1].createdAt), "minute") > 10;
                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <div className="text-center my-3">
                            <span className="text-[10px] bg-white/70 text-muted-foreground px-3 py-1 rounded-full shadow-sm">
                              {dayjs(msg.createdAt).format("MMM D, h:mm A")}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`relative max-w-[85%] sm:max-w-[70%] px-3 py-2 rounded-2xl shadow-sm ${
                              isOutbound
                                ? "bg-blue-600 text-white rounded-tr-md"
                                : "bg-white rounded-tl-md"
                            }`}
                          >
                            {msg.aiGenerated && (
                              <div className="flex items-center gap-1 mb-0.5">
                                <Sparkles className={`h-3 w-3 ${isOutbound ? "text-blue-200" : "text-purple-500"}`} />
                                <span className={`text-[10px] font-medium ${isOutbound ? "text-blue-200" : "text-purple-500"}`}>
                                  AI Reply
                                </span>
                              </div>
                            )}
                            {msg.messageType === "image" && msg.mediaUrl && (
                              <div className="mb-1 rounded-lg overflow-hidden">
                                <img src={msg.mediaUrl} alt={msg.mediaCaption || ""} className="max-w-full max-h-48 object-cover rounded" loading="lazy" />
                                {msg.mediaCaption && (
                                  <p className="text-xs mt-1 opacity-80 whitespace-pre-wrap">{msg.mediaCaption}</p>
                                )}
                              </div>
                            )}
                            {(msg.messageType !== "image" || !msg.mediaUrl) && msg.body && (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.body}
                              </p>
                            )}
                            <div className={`flex items-center gap-1 mt-0.5 ${isOutbound ? "justify-end" : "justify-start"}`}>
                              <span className={`text-[10px] ${isOutbound ? "text-blue-200" : "text-muted-foreground"}`}>
                                {dayjs(msg.createdAt).format("h:mm A")}
                              </span>
                              {isOutbound && statusIcon(msg.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="bg-background border-t px-3 sm:px-4 py-3 shrink-0">
              {showQuickReplies && quickReplies.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr.id}
                      onClick={() => { onQuickReply(qr); setShowQuickReplies(false); }}
                      className="px-3 py-1.5 text-xs rounded-full border bg-background hover:bg-muted transition-colors"
                      title={qr.body}
                    >
                      {qr.title}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                >
                  <Zap className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => onNewMessageChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSendMessage();
                      }
                    }}
                    className="min-h-[44px] max-h-32 resize-none"
                    rows={1}
                  />
                </div>
                <Button
                  onClick={onSendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="icon"
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 rounded-full h-10 w-10"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="w-20 h-20 rounded-3xl bg-blue-100/50 flex items-center justify-center">
              <MessageSquare className="h-10 w-10 text-blue-600/40" />
            </div>
            <h3 className="text-lg font-semibold text-muted-foreground">Select a conversation</h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              Choose a conversation from the left to start chatting. Messages from your store&apos;s live chat and WhatsApp appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Automations View
   ═══════════════════════════════════════════════════════════ */

function AutomationsView({
  config,
  automations,
  onReload,
}: {
  config: MessagingConfig | null;
  automations: MessagingAutomation[];
  onReload: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("keyword");
  const [newTriggerValue, setNewTriggerValue] = useState("");
  const [newAction, setNewAction] = useState("ai_reply");
  const [newActionMessage, setNewActionMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const triggerOptions = [
    { value: "keyword", label: "Keyword Match", icon: Hash, desc: "Triggered when customer sends a specific keyword" },
    { value: "new_conversation", label: "New Conversation", icon: UserPlus, desc: "Triggered when a new customer messages" },
    { value: "order_status", label: "Order Status Change", icon: ShoppingCart, desc: "Send update when order status changes" },
    { value: "abandoned_cart", label: "Abandoned Cart", icon: Package, desc: "Remind customers about abandoned carts" },
    { value: "post_purchase", label: "Post Purchase", icon: Star, desc: "Send follow-up after purchase" },
  ];

  const actionOptions = [
    { value: "ai_reply", label: "AI Auto Reply", icon: Sparkles },
    { value: "send_text", label: "Send Text Message", icon: MessageCircle },
    { value: "send_template", label: "Send Template", icon: FileText },
    { value: "assign_agent", label: "Assign to Agent", icon: Headphones },
    { value: "add_tag", label: "Add Tag", icon: Tag },
  ];

  const handleCreate = async () => {
    if (!config || !newName.trim()) return;
    setSaving(true);
    await supabaseClient.from("messaging_automations").insert({
      user_id: config.userId,
      config_id: config.id,
      name: newName.trim(),
      trigger_type: newTrigger,
      trigger_value: newTriggerValue.trim(),
      action_type: newAction,
      action_config: newActionMessage ? { message: newActionMessage } : {},
      is_active: true,
    });
    setNewName("");
    setNewTriggerValue("");
    setNewActionMessage("");
    setShowCreate(false);
    setSaving(false);
    onReload();
  };

  const toggleAutomation = async (id: string, isActive: boolean) => {
    await supabaseClient.from("messaging_automations").update({ is_active: isActive }).eq("id", id);
    onReload();
  };

  const deleteAutomation = async (id: string) => {
    await supabaseClient.from("messaging_automations").delete().eq("id", id);
    onReload();
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Set up Messaging first to create automations.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Automations</h2>
            <p className="text-sm text-muted-foreground">
              Set up automated responses and workflows for all your messaging channels.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            New Automation
          </Button>
        </div>

        {/* Recommended */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-500" />
              Recommended Automations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: "Welcome Message", trigger: "new_conversation", icon: MessageCircle, desc: "Greet new visitors automatically" },
                { name: "Order Confirmation", trigger: "order_status", icon: ShoppingCart, desc: "Notify when order is confirmed" },
                { name: "Shipping Update", trigger: "order_status", icon: Package, desc: "Send tracking info automatically" },
                { name: "Cart Recovery", trigger: "abandoned_cart", icon: AlertTriangle, desc: "Recover abandoned carts" },
                { name: "Review Request", trigger: "post_purchase", icon: Star, desc: "Ask for reviews after delivery" },
                { name: "FAQ Bot", trigger: "keyword", icon: Bot, desc: "Answer common questions with AI" },
              ].map((s) => {
                const exists = automations.some((a) => a.name.toLowerCase() === s.name.toLowerCase());
                return (
                  <button
                    key={s.name}
                    disabled={exists}
                    onClick={() => { setNewName(s.name); setNewTrigger(s.trigger); setNewAction("ai_reply"); setShowCreate(true); }}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      exists ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/50 hover:border-blue-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold">{s.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                    {exists && <Badge variant="secondary" className="mt-2 text-[10px]">Already created</Badge>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Active automations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Your Automations ({automations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {automations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No automations yet</p>
                <p className="text-xs mt-1">Click &quot;New Automation&quot; or use a recommendation above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {automations.map((auto) => {
                  const trigger = triggerOptions.find((t) => t.value === auto.triggerType);
                  const action = actionOptions.find((a) => a.value === auto.actionType);
                  return (
                    <div
                      key={auto.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                        auto.isActive ? "bg-background" : "bg-muted/30 opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          auto.isActive ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground"
                        }`}>
                          {trigger ? <trigger.icon className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">{auto.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{trigger?.label || auto.triggerType}</span>
                            <span>→</span>
                            <span>{action?.label || auto.actionType}</span>
                            {auto.triggerValue && (
                              <Badge variant="secondary" className="text-[10px]">&quot;{auto.triggerValue}&quot;</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Triggered {auto.timesTriggered} times
                            {auto.lastTriggeredAt ? ` · Last: ${dayjs(auto.lastTriggeredAt).fromNow()}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={auto.isActive} onCheckedChange={(v) => toggleAutomation(auto.id, v)} />
                        <Button variant="ghost" size="icon" onClick={() => deleteAutomation(auto.id)} className="text-muted-foreground hover:text-red-500">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                New Automation
              </DialogTitle>
              <DialogDescription>
                Create an automated workflow triggered by customer actions across all channels.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Automation Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Welcome Message" />
              </div>
              <div className="space-y-2">
                <Label>Trigger</Label>
                <Select value={newTrigger} onValueChange={setNewTrigger}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {triggerOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newTrigger === "keyword" && (
                  <Input value={newTriggerValue} onChange={(e) => setNewTriggerValue(e.target.value)} placeholder="Enter keyword to match" className="mt-2" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={newAction} onValueChange={setNewAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newAction === "send_text" && (
                  <Textarea value={newActionMessage} onChange={(e) => setNewActionMessage(e.target.value)} placeholder="Enter the reply message..." className="mt-2" />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || saving} className="bg-blue-600 hover:bg-blue-700 gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Settings View
   ═══════════════════════════════════════════════════════════ */

function SettingsView({
  config,
  onSaved,
}: {
  config: MessagingConfig | null;
  onSaved: () => void;
}) {
  // General
  const [businessName, setBusinessName] = useState(config?.businessName || "");
  const [displayPhone, setDisplayPhone] = useState(config?.displayPhone || "");

  // Web chat
  const [chatWidgetEnabled, setChatWidgetEnabled] = useState(config?.chatWidgetEnabled ?? true);
  const [chatWidgetTitle, setChatWidgetTitle] = useState(config?.chatWidgetTitle || "Chat with us");
  const [chatWidgetSubtitle, setChatWidgetSubtitle] = useState(config?.chatWidgetSubtitle || "We usually reply within minutes");
  const [chatWidgetColor, setChatWidgetColor] = useState(config?.chatWidgetColor || "#2563eb");
  const [chatWidgetGreeting, setChatWidgetGreeting] = useState(config?.chatWidgetGreeting || "");

  // WhatsApp
  const [waEnabled, setWaEnabled] = useState(config?.channelsEnabled?.includes("whatsapp") || false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState(config?.waPhoneNumberId || "");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState(config?.waBusinessAccountId || "");
  const [waAccessToken, setWaAccessToken] = useState(config?.waAccessToken || "");
  const [waVerifyToken, setWaVerifyToken] = useState(config?.waVerifyToken || "");
  const [showWaToken, setShowWaToken] = useState(false);

  // AI
  const [aiEnabled, setAiEnabled] = useState(config?.aiEnabled || false);
  const [aiGreeting, setAiGreeting] = useState(config?.aiGreeting || "");
  const [aiPersona, setAiPersona] = useState(config?.aiPersona || "");
  const [aiHandleOrders, setAiHandleOrders] = useState(config?.aiHandleOrders ?? true);
  const [aiHandleProducts, setAiHandleProducts] = useState(config?.aiHandleProducts ?? true);
  const [aiHandleSupport, setAiHandleSupport] = useState(config?.aiHandleSupport ?? true);
  const [escalationKeywords, setEscalationKeywords] = useState(
    (config?.aiEscalationKeywords || []).join(", "),
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!config) return;
    setBusinessName(config.businessName);
    setDisplayPhone(config.displayPhone);
    setChatWidgetEnabled(config.chatWidgetEnabled);
    setChatWidgetTitle(config.chatWidgetTitle);
    setChatWidgetSubtitle(config.chatWidgetSubtitle);
    setChatWidgetColor(config.chatWidgetColor);
    setChatWidgetGreeting(config.chatWidgetGreeting);
    setWaEnabled(config.channelsEnabled?.includes("whatsapp") || false);
    setWaPhoneNumberId(config.waPhoneNumberId);
    setWaBusinessAccountId(config.waBusinessAccountId);
    setWaAccessToken(config.waAccessToken);
    setWaVerifyToken(config.waVerifyToken);
    setAiEnabled(config.aiEnabled);
    setAiGreeting(config.aiGreeting);
    setAiPersona(config.aiPersona);
    setAiHandleOrders(config.aiHandleOrders);
    setAiHandleProducts(config.aiHandleProducts);
    setAiHandleSupport(config.aiHandleSupport);
    setEscalationKeywords((config.aiEscalationKeywords || []).join(", "));
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    const channels: string[] = ["web_chat"];
    if (waEnabled) channels.push("whatsapp");

    const values = {
      business_name: businessName.trim(),
      display_phone: displayPhone.trim(),
      channels_enabled: channels,
      // Web chat
      chat_widget_enabled: chatWidgetEnabled,
      chat_widget_title: chatWidgetTitle.trim(),
      chat_widget_subtitle: chatWidgetSubtitle.trim(),
      chat_widget_color: chatWidgetColor.trim(),
      chat_widget_greeting: chatWidgetGreeting.trim(),
      // WhatsApp
      wa_phone_number_id: waPhoneNumberId.trim(),
      wa_business_account_id: waBusinessAccountId.trim(),
      wa_access_token: waAccessToken.trim(),
      wa_verify_token: waVerifyToken.trim() || crypto.randomUUID(),
      // AI
      ai_enabled: aiEnabled,
      ai_greeting: aiGreeting.trim(),
      ai_persona: aiPersona.trim(),
      ai_handle_orders: aiHandleOrders,
      ai_handle_products: aiHandleProducts,
      ai_handle_support: aiHandleSupport,
      ai_escalation_keywords: escalationKeywords.split(",").map((k) => k.trim()).filter(Boolean),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (config) {
      await supabaseClient.from("messaging_config").update(values).eq("id", config.id);
    } else {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        // Look up the user's store so the config is linked
        const { data: store } = await supabaseClient
          .from("stores")
          .select("id")
          .limit(1)
          .single();
        await supabaseClient.from("messaging_config").insert({
          ...values,
          user_id: user.id,
          store_id: store?.id || undefined,
        });
      }
    }
    setSaving(false);
    onSaved();
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/whatsapp/webhook`
    : "";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold">Messaging Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure your messaging channels, chat widget, and AI automation.
          </p>
        </div>

        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your Store Name" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number (display)</Label>
                <Input value={displayPhone} onChange={(e) => setDisplayPhone(e.target.value)} placeholder="+44 7911 123456" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Web Chat Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              Store Live Chat Widget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <MessageSquareDashed className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Live Chat on Storefront</h4>
                  <p className="text-xs text-muted-foreground">
                    Customers can chat with you directly from your store page
                  </p>
                </div>
              </div>
              <Switch checked={chatWidgetEnabled} onCheckedChange={setChatWidgetEnabled} />
            </div>

            {chatWidgetEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Widget Title</Label>
                    <Input value={chatWidgetTitle} onChange={(e) => setChatWidgetTitle(e.target.value)} placeholder="Chat with us" />
                  </div>
                  <div className="space-y-2">
                    <Label>Widget Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={chatWidgetColor}
                        onChange={(e) => setChatWidgetColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input value={chatWidgetColor} onChange={(e) => setChatWidgetColor(e.target.value)} className="font-mono" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input value={chatWidgetSubtitle} onChange={(e) => setChatWidgetSubtitle(e.target.value)} placeholder="We usually reply within minutes" />
                </div>
                <div className="space-y-2">
                  <Label>Auto-Greeting Message</Label>
                  <Textarea value={chatWidgetGreeting} onChange={(e) => setChatWidgetGreeting(e.target.value)} placeholder="Hi there! 👋 How can we help you today?" rows={2} />
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preview</Label>
                  <div className="bg-white border rounded-2xl shadow-lg max-w-[320px] overflow-hidden">
                    <div className="p-4" style={{ backgroundColor: chatWidgetColor }}>
                      <h4 className="text-white font-semibold text-sm">{chatWidgetTitle || "Chat with us"}</h4>
                      <p className="text-white/80 text-xs mt-0.5">{chatWidgetSubtitle || "We usually reply within minutes"}</p>
                    </div>
                    <div className="p-4 space-y-2 bg-gray-50">
                      {chatWidgetGreeting && (
                        <div className="bg-white rounded-2xl rounded-tl-md px-3 py-2 text-xs shadow-sm max-w-[80%]">
                          {chatWidgetGreeting}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex-1 bg-white rounded-full px-3 py-2 text-xs text-muted-foreground border">
                          Type a message...
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: chatWidgetColor }}>
                          <Send className="h-3.5 w-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp (optional) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-500" />
              WhatsApp Channel (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">WhatsApp Business</h4>
                  <p className="text-xs text-muted-foreground">
                    Connect your WhatsApp Business API for messaging via WhatsApp
                  </p>
                </div>
              </div>
              <Switch checked={waEnabled} onCheckedChange={setWaEnabled} />
            </div>

            {waEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-green-200">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Setup Guide</p>
                  <ol className="list-decimal ml-4 space-y-1 text-xs">
                    <li>Go to <strong>Meta for Developers</strong> → Create a Business App</li>
                    <li>Add the <strong>WhatsApp</strong> product to your app</li>
                    <li>Copy your <strong>Phone Number ID</strong> and <strong>Business Account ID</strong></li>
                    <li>Generate a permanent <strong>Access Token</strong></li>
                    <li>Set the webhook URL below in your Meta app settings</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL (paste this in Meta Dashboard)</Label>
                  <div className="flex items-center gap-2">
                    <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted" />
                    <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(webhookUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input value={waPhoneNumberId} onChange={(e) => setWaPhoneNumberId(e.target.value)} placeholder="e.g. 123456789012345" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Account ID</Label>
                    <Input value={waBusinessAccountId} onChange={(e) => setWaBusinessAccountId(e.target.value)} placeholder="e.g. 123456789012345" className="font-mono" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Access Token</Label>
                  <div className="relative">
                    <Input value={waAccessToken} onChange={(e) => setWaAccessToken(e.target.value)} type={showWaToken ? "text" : "password"} placeholder="EAAx..." className="font-mono pr-10" />
                    <button type="button" onClick={() => setShowWaToken(!showWaToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Shield className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Verify Token</Label>
                  <Input value={waVerifyToken} onChange={(e) => setWaVerifyToken(e.target.value)} placeholder="Auto-generated if empty" className="font-mono" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <BotMessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">AI Auto-Replies</h4>
                  <p className="text-xs text-muted-foreground">
                    Let AI handle routine customer inquiries on all channels
                  </p>
                </div>
              </div>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>

            {aiEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-purple-200">
                <div className="space-y-2">
                  <Label>AI Persona</Label>
                  <Textarea value={aiPersona} onChange={(e) => setAiPersona(e.target.value)} placeholder="Describe how the AI should behave..." rows={3} />
                  <p className="text-xs text-muted-foreground">Sets the personality and knowledge of your AI assistant.</p>
                </div>
                <div className="space-y-2">
                  <Label>Welcome Greeting</Label>
                  <Input value={aiGreeting} onChange={(e) => setAiGreeting(e.target.value)} placeholder="Hi! How can I help you today?" />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm">AI Capabilities</Label>
                  <div className="space-y-2">
                    {[
                      { label: "Handle Order Queries", desc: "AI can look up and discuss customer orders", value: aiHandleOrders, onChange: setAiHandleOrders, icon: ShoppingCart },
                      { label: "Handle Product Queries", desc: "AI can recommend and discuss products", value: aiHandleProducts, onChange: setAiHandleProducts, icon: Package },
                      { label: "Handle Support", desc: "AI can address support and FAQ questions", value: aiHandleSupport, onChange: setAiHandleSupport, icon: Headphones },
                    ].map((cap) => (
                      <div key={cap.label} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <cap.icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{cap.label}</p>
                            <p className="text-xs text-muted-foreground">{cap.desc}</p>
                          </div>
                        </div>
                        <Switch checked={cap.value} onCheckedChange={cap.onChange} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Escalation Keywords</Label>
                  <Input value={escalationKeywords} onChange={(e) => setEscalationKeywords(e.target.value)} placeholder="speak to human, manager, complaint" />
                  <p className="text-xs text-muted-foreground">Comma-separated. When a customer uses these words, AI stops and notifies your team.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700 px-8">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Setup Dialog
   ═══════════════════════════════════════════════════════════ */

function SetupDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [businessName, setBusinessName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Look up the user's store so the config is linked
    const { data: store } = await supabaseClient
      .from("stores")
      .select("id")
      .limit(1)
      .single();

    // Check if a config already exists (may have been auto-created by the chat widget)
    const { data: existing } = await supabaseClient
      .from("messaging_config")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      // Update the existing auto-created config
      await supabaseClient.from("messaging_config").update({
        business_name: businessName.trim(),
        store_id: store?.id || undefined,
        channels_enabled: ["web_chat"],
        chat_widget_enabled: true,
        ai_enabled: true,
        is_active: true,
      }).eq("id", existing.id);
    } else {
      await supabaseClient.from("messaging_config").insert({
        user_id: user.id,
        store_id: store?.id || undefined,
        business_name: businessName.trim(),
        channels_enabled: ["web_chat"],
        chat_widget_enabled: true,
        ai_enabled: true,
        is_active: true,
      });
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <MessageSquare className="h-4 w-4" />
            </div>
            Set Up Messaging
          </DialogTitle>
          <DialogDescription>
            Enable live chat on your storefront so customers can message you directly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">What you&apos;ll get:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>✓ Live chat widget on your store page</li>
              <li>✓ AI-powered auto-replies for common questions</li>
              <li>✓ Unified inbox for all customer messages</li>
              <li>✓ Optional WhatsApp integration (add later in Settings)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your Store Name" />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!businessName.trim() || saving}
            className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enable Messaging
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════
   DB ↔ Frontend mappers
   ═══════════════════════════════════════════════════════════ */

function mapConfig(d: any): MessagingConfig {
  return {
    id: d.id,
    userId: d.user_id,
    storeId: d.store_id,
    channelsEnabled: d.channels_enabled || ["web_chat"],
    waPhoneNumberId: d.wa_phone_number_id || "",
    waBusinessAccountId: d.wa_business_account_id || "",
    waAccessToken: d.wa_access_token || "",
    waVerifyToken: d.wa_verify_token || "",
    waWebhookSecret: d.wa_webhook_secret || "",
    displayPhone: d.display_phone || "",
    businessName: d.business_name || "",
    chatWidgetEnabled: d.chat_widget_enabled ?? true,
    chatWidgetTitle: d.chat_widget_title || "Chat with us",
    chatWidgetSubtitle: d.chat_widget_subtitle || "We usually reply within minutes",
    chatWidgetColor: d.chat_widget_color || "#2563eb",
    chatWidgetPosition: d.chat_widget_position || "bottom-right",
    chatWidgetGreeting: d.chat_widget_greeting || "",
    aiEnabled: d.ai_enabled,
    aiGreeting: d.ai_greeting || "",
    aiPersona: d.ai_persona || "",
    aiAutoReplyDelayMs: d.ai_auto_reply_delay_ms || 2000,
    aiHandleOrders: d.ai_handle_orders,
    aiHandleProducts: d.ai_handle_products,
    aiHandleSupport: d.ai_handle_support,
    aiEscalationKeywords: d.ai_escalation_keywords || [],
    notifyNewMessage: d.notify_new_message,
    notifyNewConversation: d.notify_new_conversation,
    isActive: d.is_active,
    isVerified: d.is_verified,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function mapConversation(d: any): MessagingConversation {
  return {
    id: d.id,
    userId: d.user_id,
    configId: d.config_id,
    customerId: d.customer_id,
    channel: d.channel || "web_chat",
    contactId: d.contact_id || "",
    customerName: d.customer_name || "",
    customerPhone: d.customer_phone || "",
    customerEmail: d.customer_email || "",
    profilePicUrl: d.profile_pic_url || "",
    status: d.status,
    assignedTo: d.assigned_to || "",
    priority: d.priority || "normal",
    tags: d.tags || [],
    aiHandled: d.ai_handled,
    aiEscalated: d.ai_escalated,
    aiContext: d.ai_context || {},
    lastMessageAt: d.last_message_at,
    lastMessagePreview: d.last_message_preview || "",
    unreadCount: d.unread_count || 0,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function mapMessage(d: any): MessagingMessage {
  return {
    id: d.id,
    userId: d.user_id,
    conversationId: d.conversation_id,
    externalMessageId: d.external_message_id || "",
    channel: d.channel || "web_chat",
    direction: d.direction,
    messageType: d.message_type || "text",
    body: d.body || "",
    mediaUrl: d.media_url || "",
    mediaMimeType: d.media_mime_type || "",
    mediaCaption: d.media_caption || "",
    templateName: d.template_name || "",
    templateParams: d.template_params || [],
    interactiveData: d.interactive_data || {},
    latitude: d.latitude,
    longitude: d.longitude,
    locationName: d.location_name || "",
    status: d.status || "pending",
    errorMessage: d.error_message || "",
    aiGenerated: d.ai_generated || false,
    aiConfidence: d.ai_confidence || 0,
    sentAt: d.sent_at,
    deliveredAt: d.delivered_at,
    readAt: d.read_at,
    createdAt: d.created_at,
  };
}

function mapQuickReply(d: any): MessagingQuickReply {
  return {
    id: d.id,
    userId: d.user_id,
    shortcut: d.shortcut || "",
    title: d.title || "",
    body: d.body || "",
    category: d.category || "general",
    createdAt: d.created_at,
  };
}

function mapAutomation(d: any): MessagingAutomation {
  return {
    id: d.id,
    userId: d.user_id,
    configId: d.config_id,
    name: d.name || "",
    description: d.description || "",
    triggerType: d.trigger_type,
    triggerValue: d.trigger_value || "",
    actionType: d.action_type,
    actionConfig: d.action_config || {},
    conditions: d.conditions || {},
    channels: d.channels || [],
    isActive: d.is_active,
    timesTriggered: d.times_triggered || 0,
    lastTriggeredAt: d.last_triggered_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}
