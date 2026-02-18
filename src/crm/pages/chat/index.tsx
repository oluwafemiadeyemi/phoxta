import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@crm/lib/supabase";
import { Button } from "@crm/components/ui/button";
import { Card } from "@crm/components/ui/card";
import { Input } from "@crm/components/ui/input";
import { Textarea } from "@crm/components/ui/textarea";
import { Badge } from "@crm/components/ui/badge";
import { Checkbox } from "@crm/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@crm/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@crm/components/ui/tabs";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { Separator } from "@crm/components/ui/separator";
import { cn } from "@crm/lib/utils";
import { ArrowLeft, Hash, Search, SendHorizonal, Mic, Paperclip } from "lucide-react";

type TeamMemberRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type ThreadRow = {
  id: string;
  name: string | null;
  is_dm: boolean;
  dm_key: string | null;
  created_by: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
};

type AttachmentRow = {
  id: string;
  message_id: string;
  thread_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
};

type MessageWithExtras = MessageRow & {
  attachments: AttachmentRow[];
  senderName?: string;
};

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDay(ts: string) {
  try {
    return new Date(ts).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function isImage(mime?: string | null) {
  return Boolean(mime && mime.startsWith("image/"));
}

function isVideo(mime?: string | null) {
  return Boolean(mime && mime.startsWith("video/"));
}

function isAudio(mime?: string | null) {
  return Boolean(mime && mime.startsWith("audio/"));
}

function bytesToSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"]; 
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function firstNameFrom(member?: { name?: string | null; email?: string | null } | null) {
  const raw = (member?.name || member?.email || "").trim();
  if (!raw) return "Member";
  if (raw.includes("@")) return raw.split("@")[0] || "Member";
  return raw.split(/\s+/)[0] || "Member";
}

function buildDmKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

export default function ChatPage({ variant = "page" }: { variant?: "page" | "drawer" }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string } | null>(null);

  const isDrawer = variant === "drawer";

  const [drawerMode, setDrawerMode] = useState<"list" | "thread">("list");
  const [threadSearch, setThreadSearch] = useState("");
  const [threadTab, setThreadTab] = useState<"channels" | "dms">("channels");
  const [startDmOpen, setStartDmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<TeamMemberRow | null>(null);
  const [lastByThreadId, setLastByThreadId] = useState<Record<string, MessageRow | undefined>>({});
  const [unreadCountByThreadId, setUnreadCountByThreadId] = useState<Record<string, number>>({});
  const [chatSchemaMissing, setChatSchemaMissing] = useState(false);

  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const teamByUserId = useMemo(() => {
    const m = new Map<string, TeamMemberRow>();
    for (const t of team) {
      // In this codebase, team_members.id is sometimes the auth user id (invited users),
      // and team_members.user_id can mean either auth user id OR tenant/owner id (seeded rows).
      // For display purposes, index by both to maximize matches.
      if (t.user_id) m.set(t.user_id, t);
      if (t.id) m.set(t.id, t);
    }
    return m;
  }, [team]);

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelMemberIds, setNewChannelMemberIds] = useState<string[]>([]);

  const [messages, setMessages] = useState<MessageWithExtras[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const openProfile = (member: TeamMemberRow) => {
    setProfileMember(member);
    setProfileOpen(true);
  };

  // Voice note
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (!messagesViewportRef.current) return;
    try {
      messagesViewportRef.current.scrollTo({ top: messagesViewportRef.current.scrollHeight, behavior });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isDrawer) {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (shouldAutoScrollRef.current) {
      scrollToBottom("smooth");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, selectedThreadId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user?.id) {
        setMe(null);
        setLoading(false);
        return;
      }

      setMe({ id: user.id });

      // Team list (optional table in your app)
      try {
        const { data, error } = await supabaseClient
          .from("team_members")
          .select("id,user_id,name,email,avatar_url,role,is_active")
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (error) {
          // Don’t toast here (chat should still work without team), but log for debugging
          // e.g. RLS denied, missing table, etc.
          console.warn("[Chat] Failed to load team_members:", error);
        }
        setTeam((data as TeamMemberRow[]) ?? []);
      } catch {
        setTeam([]);
      }

      await loadThreads();
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadThreads = async () => {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) return;

    const { data, error } = await supabaseClient
      .from("chat_threads")
      .select("id,name,is_dm,dm_key,created_by,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      const msg = String((error as any)?.message ?? "");
      const missing = msg.includes("Could not find the table") && msg.includes("chat_threads");
      setChatSchemaMissing(missing);
      if (!missing) toast.error(`Failed to load chats: ${msg || "Unknown error"}`);
      return;
    }

    setChatSchemaMissing(false);

    const rows = (data as ThreadRow[]) ?? [];
    setThreads(rows);

    // Hydrate last-message preview + unread counts for thread list
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const { data: recentMsgs } = await supabaseClient
        .from("chat_messages")
        .select("id,thread_id,sender_id,body,created_at")
        .in("thread_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);

      const next: Record<string, MessageRow | undefined> = {};
      const unreadNext: Record<string, number> = {};
      for (const m of ((recentMsgs as MessageRow[]) ?? [])) {
        if (!next[m.thread_id]) next[m.thread_id] = m;

        // unread count based on local lastRead
        if (m.sender_id !== user.id) {
          try {
            const v = localStorage.getItem(`chat:lastRead:${m.thread_id}`);
            const lastRead = v ? Number(v) : 0;
            const ts = new Date(m.created_at).getTime();
            if (ts > lastRead) unreadNext[m.thread_id] = (unreadNext[m.thread_id] ?? 0) + 1;
          } catch {
            // ignore
          }
        }
      }
      setLastByThreadId(next);
      setUnreadCountByThreadId(unreadNext);
    } else {
      setLastByThreadId({});
      setUnreadCountByThreadId({});
    }

    if (!selectedThreadId && rows[0]?.id) {
      setSelectedThreadId(rows[0].id);
    }
  };

  const selectedThread = useMemo(() => threads.find((t) => t.id === selectedThreadId) ?? null, [threads, selectedThreadId]);

  const channels = useMemo(() => threads.filter((t) => !t.is_dm), [threads]);
  const dms = useMemo(() => threads.filter((t) => t.is_dm), [threads]);

  const selectedThreadLabel = useMemo(() => {
    if (!selectedThread) return "Chat";
    if (!selectedThread.is_dm) return selectedThread.name || "Channel";

    // DM name from dm_key if possible
    const parts = (selectedThread.dm_key || "").split(":");
    const other = parts.find((p) => p && p !== me?.id);
    const member = other ? teamByUserId.get(other) : null;
    return member?.name || member?.email || "Direct message";
  }, [me?.id, selectedThread, teamByUserId]);

  const getThreadDisplay = (t: ThreadRow) => {
    if (!t.is_dm) {
      return {
        title: t.name ? `#${t.name}` : "#channel",
        subtitle: "Channel",
        avatarUrl: null as string | null,
        fallback: (t.name?.slice(0, 1) || "#").toUpperCase(),
        isChannel: true,
      };
    }

    const parts = (t.dm_key || "").split(":");
    const otherId = parts.find((p) => p && p !== me?.id) || null;
    const member = otherId ? teamByUserId.get(otherId) : null;
    const title = member?.name || member?.email || "Direct message";
    return {
      title,
      subtitle: member?.email || "DM",
      avatarUrl: member?.avatar_url || null,
      fallback: (title?.slice(0, 1) || "M").toUpperCase(),
      isChannel: false,
    };
  };

  const getLastReadKey = (threadId: string) => `chat:lastRead:${threadId}`;
  const markRead = (threadId: string) => {
    try {
      localStorage.setItem(getLastReadKey(threadId), String(Date.now()));
    } catch {
      // ignore
    }

    setUnreadCountByThreadId((prev) => {
      if (!prev[threadId]) return prev;
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
  };
  const isUnread = (threadId: string) => {
    const last = lastByThreadId[threadId];
    if (!last) return false;
    if (last.sender_id === me?.id) return false;
    try {
      const v = localStorage.getItem(getLastReadKey(threadId));
      const lastRead = v ? Number(v) : 0;
      const lastTs = new Date(last.created_at).getTime();
      return lastTs > lastRead;
    } catch {
      return false;
    }
  };

  const loadMessages = async (threadId: string) => {
    setMessages([]);

    const { data: msgData, error: msgError } = await supabaseClient
      .from("chat_messages")
      .select("id,thread_id,sender_id,body,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (msgError) {
      const msg = String((msgError as any)?.message ?? "");
      const missing = msg.includes("Could not find the table") && msg.includes("chat_messages");
      setChatSchemaMissing(missing);
      if (!missing) toast.error(`Failed to load messages: ${msg || "Unknown error"}`);
      return;
    }

    const { data: attData } = await supabaseClient
      .from("chat_message_attachments")
      .select("id,message_id,thread_id,storage_bucket,storage_path,file_name,mime_type,file_size,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    const byMessage = new Map<string, AttachmentRow[]>();
    for (const a of ((attData as AttachmentRow[]) ?? [])) {
      const list = byMessage.get(a.message_id) ?? [];
      list.push(a);
      byMessage.set(a.message_id, list);
    }

    const hydrated = ((msgData as MessageRow[]) ?? []).map((m) => ({
      ...m,
      attachments: byMessage.get(m.id) ?? [],
      senderName: teamByUserId.get(m.sender_id)?.name || undefined,
    }));

    setMessages(hydrated);
  };

  // Realtime subscription per thread
  useEffect(() => {
    if (!selectedThreadId) return;

    loadMessages(selectedThreadId);
    markRead(selectedThreadId);

    const channel = supabaseClient
      .channel(`chat-thread-${selectedThreadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${selectedThreadId}` },
        async (payload) => {
          const row = payload.new as MessageRow;

          setLastByThreadId((prev) => ({ ...prev, [row.thread_id]: row }));

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                ...row,
                attachments: [],
                senderName: teamByUserId.get(row.sender_id)?.name || undefined,
              },
            ];
          });

          // If I'm currently viewing this thread, mark read
          if (row.thread_id === selectedThreadId) {
            markRead(selectedThreadId);
            // Ensure we stay pinned to bottom for active thread
            shouldAutoScrollRef.current = true;
          }

          // If not viewing the thread and it's from someone else, bump unread
          if (row.thread_id !== selectedThreadId && row.sender_id !== me?.id) {
            setUnreadCountByThreadId((prev) => ({ ...prev, [row.thread_id]: (prev[row.thread_id] ?? 0) + 1 }));
          }

          // Fetch any attachments for this message
          const { data: attRows } = await supabaseClient
            .from("chat_message_attachments")
            .select("id,message_id,thread_id,storage_bucket,storage_path,file_name,mime_type,file_size,created_at")
            .eq("message_id", row.id);

          const atts = (attRows as AttachmentRow[]) ?? [];
          if (atts.length > 0) {
            setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, attachments: atts } : m)));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_message_attachments", filter: `thread_id=eq.${selectedThreadId}` },
        (payload) => {
          const att = payload.new as AttachmentRow;
          setMessages((prev) =>
            prev.map((m) => (m.id === att.message_id ? { ...m, attachments: [...(m.attachments ?? []), att] } : m)),
          );
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [selectedThreadId, teamByUserId]);

  const ensureThreadMembership = async (threadId: string, userIds: string[]) => {
    // Insert membership rows (idempotent thanks to PK)
    const rows = userIds.map((uid) => ({ thread_id: threadId, user_id: uid }));
    const { error } = await supabaseClient
      .from("chat_thread_members")
      .upsert(rows, { onConflict: "thread_id,user_id", ignoreDuplicates: true });
    if (error) throw error;
  };

  const createOrOpenDM = async (otherUserId: string) => {
    const myId = me?.id;
    if (!myId) return;

    const dmKey = buildDmKey(myId, otherUserId);

    // Find existing
    const { data: existing, error: findError } = await supabaseClient
      .from("chat_threads")
      .select("id,name,is_dm,dm_key,created_by,created_at")
      .eq("dm_key", dmKey)
      .maybeSingle();

    if (findError && findError.code !== "PGRST116") {
      // PGRST116: no rows
      toast.error(findError.message);
    }

    if (existing?.id) {
      setSelectedThreadId(existing.id);
      return;
    }

    // Create thread
    const { data: created, error: createError } = await supabaseClient
      .from("chat_threads")
      .insert({ is_dm: true, dm_key: dmKey, name: null, created_by: myId })
      .select("id,name,is_dm,dm_key,created_by,created_at")
      .single();

    if (createError) {
      toast.error(`Failed to create DM: ${createError.message}`);
      return;
    }

    try {
      await ensureThreadMembership(created.id, [myId, otherUserId]);
    } catch (e: any) {
      toast.error(`Failed to add members: ${e?.message ?? "Unknown error"}`);
    }

    await loadThreads();
    setSelectedThreadId(created.id);
    if (isDrawer) setDrawerMode("thread");
  };

  const createChannel = async () => {
    if (!me?.id) return;
    const name = newChannelName.trim();
    if (!name) {
      toast.error("Channel name is required");
      return;
    }

    const memberIds = Array.from(new Set([me.id, ...newChannelMemberIds]));

    try {
      const { data: created, error: createError } = await supabaseClient
        .from("chat_threads")
        .insert({ is_dm: false, name, created_by: me.id })
        .select("id,name,is_dm,dm_key,created_by,created_at")
        .single();

      if (createError) throw createError;

      await ensureThreadMembership(created.id, memberIds);

      setCreateChannelOpen(false);
      setNewChannelName("");
      setNewChannelMemberIds([]);
      await loadThreads();
      setSelectedThreadId(created.id);
      if (isDrawer) setDrawerMode("thread");
      toast.success("Channel created");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create channel");
    }
  };

  const uploadFiles = async (files: File[], threadId: string) => {
    setUploading(true);
    try {
      const uploaded: { storage_path: string; file_name: string; mime_type: string; file_size: number }[] = [];

      for (const file of files) {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
        const safeExt = (ext || "bin").slice(0, 10);
        const path = `thread/${threadId}/${crypto.randomUUID()}.${safeExt}`;

        const { error: upErr } = await supabaseClient.storage.from("chat_uploads").upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

        if (upErr) throw upErr;

        uploaded.push({
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
          file_size: file.size,
        });
      }

      return uploaded;
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (opts?: { files?: File[]; voiceBlob?: Blob }) => {
    if (!selectedThreadId) return;
    if (!me?.id) return;

    if (chatSchemaMissing) {
      toast.error("Chat isn't set up in Supabase yet. Apply the chat migration and reload.");
      return;
    }

    const hasText = messageText.trim().length > 0;
    const hasFiles = Boolean(opts?.files && opts.files.length > 0);
    const hasVoice = Boolean(opts?.voiceBlob);

    if (!hasText && !hasFiles && !hasVoice) return;

    setSending(true);
    try {
      // Ensure current user is a member (helps with first-open DMs)
      await ensureThreadMembership(selectedThreadId, [me.id]);

      const { data: msg, error: msgErr } = await supabaseClient
        .from("chat_messages")
        .insert({ thread_id: selectedThreadId, sender_id: me.id, body: hasText ? messageText.trim() : null })
        .select("id,thread_id,sender_id,body,created_at")
        .single();

      if (msgErr) throw msgErr;

      // Optimistic local insert: realtime delivery can be delayed/disabled in some environments.
      // This guarantees the message shows in the timeline immediately after sending.
      setLastByThreadId((prev) => ({ ...prev, [msg.thread_id]: msg }));
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [
          ...prev,
          {
            ...msg,
            attachments: [],
            senderName: teamByUserId.get(msg.sender_id)?.name || undefined,
          },
        ];
      });
      shouldAutoScrollRef.current = true;
      markRead(selectedThreadId);

      const attachmentsToInsert: Partial<AttachmentRow>[] = [];

      if (hasFiles) {
        const uploaded = await uploadFiles(opts!.files!, selectedThreadId);
        for (const u of uploaded) {
          attachmentsToInsert.push({
            message_id: msg.id,
            thread_id: selectedThreadId,
            storage_bucket: "chat_uploads",
            storage_path: u.storage_path,
            file_name: u.file_name,
            mime_type: u.mime_type,
            file_size: u.file_size,
          });
        }
      }

      if (hasVoice) {
        const blob = opts!.voiceBlob!;
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
        const uploaded = await uploadFiles([file], selectedThreadId);
        for (const u of uploaded) {
          attachmentsToInsert.push({
            message_id: msg.id,
            thread_id: selectedThreadId,
            storage_bucket: "chat_uploads",
            storage_path: u.storage_path,
            file_name: u.file_name,
            mime_type: u.mime_type,
            file_size: u.file_size,
          });
        }
      }

      if (attachmentsToInsert.length > 0) {
        const { error: attErr } = await supabaseClient.from("chat_message_attachments").insert(attachmentsToInsert);
        if (attErr) throw attErr;

        // Ensure attachments appear even if realtime isn't firing
        const { data: attRows } = await supabaseClient
          .from("chat_message_attachments")
          .select("id,message_id,thread_id,storage_bucket,storage_path,file_name,mime_type,file_size,created_at")
          .eq("message_id", msg.id);
        const atts = (attRows as AttachmentRow[]) ?? [];
        if (atts.length > 0) {
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, attachments: atts } : m)));
        }
      }

      setMessageText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      const missing = msg.includes("Could not find the table") && msg.includes("chat_");
      if (missing) {
        setChatSchemaMissing(true);
        toast.error("Chat tables are missing in Supabase. Apply the chat migration and reload.");
      } else {
        toast.error(msg || "Failed to send");
      }
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (!selectedThreadId) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Voice notes not supported on this device/browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setRecording(false);
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }

        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recordedChunksRef.current = [];

        if (blob.size < 1000) return;
        await sendMessage({ voiceBlob: blob });
      };

      recorder.start();
      setRecording(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start recording");
    }
  };

  const stopRecording = () => {
    try {
      recorderRef.current?.stop();
    } catch {
      setRecording(false);
    }
  };

  const resolveUrl = async (a: AttachmentRow) => {
    const { data, error } = await supabaseClient.storage.from(a.storage_bucket).createSignedUrl(a.storage_path, 60 * 10);
    if (error) return null;
    return data.signedUrl;
  };

  const displayItems = useMemo(() => {
    if (!isDrawer) {
      return [] as Array<
        | { type: "day"; key: string; label: string }
        | { type: "message"; key: string; message: MessageWithExtras; showMeta: boolean }
      >;
    }

    const items: Array<
      | { type: "day"; key: string; label: string }
      | { type: "message"; key: string; message: MessageWithExtras; showMeta: boolean }
    > = [];

    let lastDay: string | null = null;
    let prev: MessageWithExtras | null = null;

    for (const m of messages) {
      const day = formatDay(m.created_at);
      if (day && day !== lastDay) {
        items.push({ type: "day", key: `day-${day}-${m.id}`, label: day });
        lastDay = day;
        prev = null;
      }

      const sameSender = prev?.sender_id === m.sender_id;
      const dt = prev ? Math.abs(new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) : Infinity;
      const grouped = sameSender && dt <= 5 * 60 * 1000;
      items.push({ type: "message", key: m.id, message: m, showMeta: !grouped });
      prev = m;
    }

    return items;
  }, [isDrawer, messages]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading chat…</div>;
  }

  if (!me?.id) {
    return <div className={cn(isDrawer ? "p-3" : "p-6", "text-sm text-muted-foreground")}>Please sign in to use chat.</div>;
  }

  const filteredChannels = channels
    .filter((t) => {
      const d = getThreadDisplay(t);
      const q = threadSearch.trim().toLowerCase();
      if (!q) return true;
      return d.title.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const at = new Date(lastByThreadId[a.id]?.created_at || a.created_at).getTime();
      const bt = new Date(lastByThreadId[b.id]?.created_at || b.created_at).getTime();
      return bt - at;
    });

  const filteredDms = dms
    .filter((t) => {
      const d = getThreadDisplay(t);
      const q = threadSearch.trim().toLowerCase();
      if (!q) return true;
      return d.title.toLowerCase().includes(q) || d.subtitle.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const at = new Date(lastByThreadId[a.id]?.created_at || a.created_at).getTime();
      const bt = new Date(lastByThreadId[b.id]?.created_at || b.created_at).getTime();
      return bt - at;
    });

  if (isDrawer) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b px-3 py-2 flex items-center gap-2">
          {drawerMode === "thread" ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDrawerMode("list")}
              className="-ml-2"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{drawerMode === "thread" ? selectedThreadLabel : "Messages"}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {drawerMode === "thread" ? "Secure team chat" : "Channels and direct messages"}
            </div>
          </div>

          {drawerMode === "list" ? (
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setCreateChannelOpen(true)}>
                <Hash className="h-4 w-4" />
              </Button>
              <Button type="button" size="sm" className="bg-gradient-to-l from-primary via-primary/80 to-primary/60" onClick={() => setStartDmOpen(true)}>
                New
              </Button>
            </div>
          ) : null}
        </div>

        {drawerMode === "list" ? (
          <div className="p-3">
            {chatSchemaMissing ? (
              <div className="mb-3 rounded-xl border bg-muted/40 p-3">
                <div className="text-sm font-medium">Chat needs a one-time Supabase setup</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Run the SQL migration in <span className="font-mono">supabase/migrations/20260130_add_chat.sql</span> in your Supabase project.
                </div>
              </div>
            ) : null}

            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">People</div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setStartDmOpen(true)}
                >
                  View all
                </button>
              </div>

              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {team
                    .filter((t) => {
                      // In this app, team_members.user_id is often the tenant/owner id (same for all rows).
                      // For chat DMs, prefer user_id when it’s a different auth user; otherwise fall back to id.
                      const candidateId =
                        t.user_id && t.user_id !== me.id
                          ? t.user_id
                          : t.id && t.id !== me.id
                            ? t.id
                            : null;

                      return Boolean(candidateId);
                    })
                  .slice(0, 16)
                  .map((t) => {
                    const label = firstNameFrom(t);
                      const dmUserId =
                        t.user_id && t.user_id !== me.id
                          ? t.user_id
                          : t.id && t.id !== me.id
                            ? t.id
                            : null;
                    return (
                      <div
                        key={t.id}
                        className="flex w-[64px] shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 hover:bg-accent"
                      >
                        <button
                          type="button"
                          onClick={() => openProfile(t)}
                          className="rounded-full"
                          aria-label={`View ${label} profile`}
                        >
                          <Avatar className="size-10">
                            {t.avatar_url ? <AvatarImage src={t.avatar_url} alt={label} /> : null}
                            <AvatarFallback className="text-xs">{label.slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </button>

                        <button
                          type="button"
                          className="w-full truncate text-[11px] font-medium text-center"
                          onClick={async () => {
                            if (!dmUserId) {
                              toast.message("This teammate can’t be messaged yet", {
                                description: "They may not have an account linked to their team profile.",
                              });
                              setStartDmOpen(true);
                              return;
                            }

                            await createOrOpenDM(dmUserId);
                            setDrawerMode("thread");
                          }}
                          aria-label={`Message ${label}`}
                        >
                          {label}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder="Search"
                className="pl-9"
              />
            </div>

            <div className="mt-3">
              <Tabs value={threadTab} onValueChange={(v) => setThreadTab(v as any)}>
                <TabsList className="w-full">
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                  <TabsTrigger value="dms">DMs</TabsTrigger>
                </TabsList>

                <TabsContent value="channels" className="mt-3">
                  <ScrollArea className="h-[52vh]">
                    <div className="grid gap-1 pr-3">
                      {filteredChannels.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">No channels yet.</div>
                      ) : (
                        filteredChannels.map((t) => {
                          const d = getThreadDisplay(t);
                          const last = lastByThreadId[t.id];
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedThreadId(t.id);
                                setDrawerMode("thread");
                                markRead(t.id);
                              }}
                              className={cn(
                                "flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                                t.id === selectedThreadId ? "bg-accent" : "hover:bg-accent/60",
                              )}
                            >
                              <Avatar className="size-9">
                                <AvatarFallback className="text-xs">{d.fallback}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium truncate">{d.title}</div>
                                  <div className="text-[10px] text-muted-foreground shrink-0">
                                    {last ? formatTime(last.created_at) : ""}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs text-muted-foreground truncate">
                                    {last?.body ? last.body : last ? "Sent an attachment" : ""}
                                  </div>
                                  {unreadCountByThreadId[t.id] ? (
                                    <Badge className="h-5 px-1.5 text-[11px]" variant="secondary">
                                      {Math.min(99, unreadCountByThreadId[t.id])}
                                      {unreadCountByThreadId[t.id] > 99 ? "+" : ""}
                                    </Badge>
                                  ) : isUnread(t.id) ? (
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="dms" className="mt-3">
                  <ScrollArea className="h-[52vh]">
                    <div className="grid gap-1 pr-3">
                      {filteredDms.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">No DMs yet.</div>
                      ) : (
                        filteredDms.map((t) => {
                          const d = getThreadDisplay(t);
                          const last = lastByThreadId[t.id];
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedThreadId(t.id);
                                setDrawerMode("thread");
                                markRead(t.id);
                              }}
                              className={cn(
                                "flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                                t.id === selectedThreadId ? "bg-accent" : "hover:bg-accent/60",
                              )}
                            >
                              <Avatar className="size-9">
                                {d.avatarUrl ? <AvatarImage src={d.avatarUrl} alt={d.title} /> : null}
                                <AvatarFallback className="text-xs">{d.fallback}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium truncate">{d.title}</div>
                                  <div className="text-[10px] text-muted-foreground shrink-0">
                                    {last ? formatTime(last.created_at) : ""}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs text-muted-foreground truncate">
                                    {last?.body ? last.body : last ? "Sent an attachment" : ""}
                                  </div>
                                  {unreadCountByThreadId[t.id] ? (
                                    <Badge className="h-5 px-1.5 text-[11px]" variant="secondary">
                                      {Math.min(99, unreadCountByThreadId[t.id])}
                                      {unreadCountByThreadId[t.id] > 99 ? "+" : ""}
                                    </Badge>
                                  ) : isUnread(t.id) ? (
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              <div
                ref={messagesViewportRef}
                onScroll={() => {
                  const el = messagesViewportRef.current;
                  if (!el) return;
                  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
                  shouldAutoScrollRef.current = distance < 140;
                  if (shouldAutoScrollRef.current && selectedThreadId) markRead(selectedThreadId);
                }}
                className="h-full overflow-auto px-3 py-3 space-y-3 bg-gradient-to-b from-background to-background/70"
              >
                {displayItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No messages yet. Say hi.</div>
                ) : (
                  displayItems.map((it) => {
                    if (it.type === "day") {
                      return (
                        <div key={it.key} className="flex items-center gap-3 py-2">
                          <div className="h-px flex-1 bg-border" />
                          <div className="text-[11px] text-muted-foreground rounded-full border px-2 py-0.5 bg-background/60">
                            {it.label}
                          </div>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      );
                    }

                    const m = it.message;
                    return (
                      <MessageBubble
                        key={it.key}
                        meId={me.id}
                        message={m}
                        resolveUrl={resolveUrl}
                        senderLabel={m.senderName || teamByUserId.get(m.sender_id)?.email || (m.sender_id === me.id ? "You" : "Member")}
                        showMeta={it.showMeta}
                      />
                    );
                  })
                )}
                <div ref={listEndRef} />
              </div>
            </div>

            <Separator />

            <div className="p-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length || !selectedThreadId) return;
                  await sendMessage({ files });
                }}
              />

              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || uploading}
                  aria-label="Attach"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                {!recording ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={startRecording}
                    disabled={sending || uploading}
                    aria-label="Voice note"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
                    Stop
                  </Button>
                )}

                <div className="flex-1">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Message…"
                    className="min-h-[44px] max-h-32"
                  />
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-muted-foreground">
                      {recording ? "Recording… tap Stop to send." : uploading ? "Uploading…" : ""}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      className="bg-gradient-to-l from-primary via-primary/80 to-primary/60 text-primary-foreground"
                      onClick={() => sendMessage()}
                      disabled={sending || uploading}
                      aria-label="Send"
                    >
                      <SendHorizonal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog open={startDmOpen} onOpenChange={setStartDmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New message</DialogTitle>
              <DialogDescription>Start a direct message with a teammate.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <ScrollArea className="max-h-72">
                <div className="grid gap-1 pr-3">
                  {team
                    .filter((t) => {
                      const candidateId =
                        t.user_id && t.user_id !== me.id
                          ? t.user_id
                          : t.id && t.id !== me.id
                            ? t.id
                            : null;
                      return Boolean(candidateId);
                    })
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="flex items-center gap-3 rounded-lg border px-2 py-2 text-left hover:bg-accent"
                        onClick={async () => {
                          setStartDmOpen(false);
                          const dmUserId =
                            t.user_id && t.user_id !== me.id
                              ? t.user_id
                              : t.id && t.id !== me.id
                                ? t.id
                                : null;
                          if (!dmUserId) return;
                          await createOrOpenDM(dmUserId);
                        }}
                      >
                        <Avatar className="size-9">
                          {t.avatar_url ? <AvatarImage src={t.avatar_url} alt={t.name || "Member"} /> : null}
                          <AvatarFallback className="text-xs">{(t.name || t.email || "M").slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{t.name || "Member"}</div>
                          <div className="text-xs text-muted-foreground truncate">{t.email || ""}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">DM</Badge>
                      </button>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={profileOpen}
          onOpenChange={(open) => {
            setProfileOpen(open);
            if (!open) setProfileMember(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Team member</DialogTitle>
              <DialogDescription>View profile details or start a message.</DialogDescription>
            </DialogHeader>

            {profileMember ? (
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    {profileMember.avatar_url ? <AvatarImage src={profileMember.avatar_url} alt={profileMember.name || "Member"} /> : null}
                    <AvatarFallback>
                      {firstNameFrom(profileMember).slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="font-semibold truncate">{profileMember.name || firstNameFrom(profileMember)}</div>
                    <div className="text-xs text-muted-foreground truncate">{profileMember.email || ""}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{profileMember.role || "member"}</Badge>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>
                      Close
                    </Button>
                    <Button
                      type="button"
                      className="bg-gradient-to-l from-primary via-primary/80 to-primary/60 text-primary-foreground"
                      onClick={async () => {
                        const dmUserId =
                          profileMember.user_id && profileMember.user_id !== me.id
                            ? profileMember.user_id
                            : profileMember.id && profileMember.id !== me.id
                              ? profileMember.id
                              : null;

                        if (!dmUserId) {
                          toast.message("This teammate can’t be messaged yet", {
                            description: "They may not have an account linked to their team profile.",
                          });
                          setStartDmOpen(true);
                          return;
                        }

                        await createOrOpenDM(dmUserId);
                        setProfileOpen(false);
                        setDrawerMode("thread");
                      }}
                    >
                      Message
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create channel</DialogTitle>
              <DialogDescription>Pick a name and invite members.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Channel name</div>
                <Input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="e.g. general" />
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">Members</div>
                <div className="max-h-52 overflow-auto rounded-md border p-2">
                  <div className="grid gap-2">
                    {team
                      .filter((t) => Boolean(t.user_id) && t.user_id !== me?.id)
                      .map((t) => {
                        const uid = t.user_id!;
                        const checked = newChannelMemberIds.includes(uid);
                        return (
                          <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = Boolean(v);
                                setNewChannelMemberIds((prev) =>
                                  next ? Array.from(new Set([...prev, uid])) : prev.filter((x) => x !== uid),
                                );
                              }}
                            />
                            <span className="truncate">{t.name || t.email || "Member"}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">You are always included.</div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateChannelOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-gradient-to-l from-primary via-primary/80 to-primary/60 text-primary-foreground"
                  onClick={createChannel}
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={cn(isDrawer ? "h-full p-2" : "min-h-[calc(100vh-64px)] p-3 sm:p-6")}> 
      <div className={cn(isDrawer ? "h-full" : "mx-auto max-w-6xl")}> 
        {!isDrawer ? (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold">Chat</div>
              <div className="text-sm text-muted-foreground">Messages, files, videos and voice notes</div>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "grid gap-3",
            isDrawer ? "h-full grid-cols-[210px_1fr]" : "grid-cols-1 md:grid-cols-[280px_1fr]",
          )}
        >
          <Card className={cn("p-3", isDrawer ? "h-full overflow-auto" : "")}> 
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm font-medium">Channels</div>
              <Button type="button" size="sm" variant="outline" onClick={() => setCreateChannelOpen(true)}>
                New
              </Button>
            </div>

            <div className="grid gap-1 mb-4">
              {channels.length === 0 ? (
                <div className="text-xs text-muted-foreground">No channels yet. Create one.</div>
              ) : (
                channels.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={cn(
                      "flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
                      t.id === selectedThreadId ? "bg-accent" : "hover:bg-accent/60",
                    )}
                    onClick={() => setSelectedThreadId(t.id)}
                  >
                    <span className="truncate">#{t.name || "channel"}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                  </button>
                ))
              )}
            </div>

            <div className="text-sm font-medium mb-2">Direct messages</div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Start a DM</div>
              <div className="grid gap-1">
                {team
                  .filter((t) => {
                    const candidateId =
                      t.user_id && t.user_id !== me.id
                        ? t.user_id
                        : t.id && t.id !== me.id
                          ? t.id
                          : null;
                    return Boolean(candidateId);
                  })
                  .slice(0, 12)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="flex items-center justify-between rounded-md border px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => {
                        const dmUserId =
                          t.user_id && t.user_id !== me.id
                            ? t.user_id
                            : t.id && t.id !== me.id
                              ? t.id
                              : null;
                        if (!dmUserId) return;
                        void createOrOpenDM(dmUserId);
                      }}
                    >
                      <span className="truncate">{t.name || t.email || "Member"}</span>
                      <Badge variant="outline" className="text-[10px]">
                        DM
                      </Badge>
                    </button>
                  ))}
              </div>

              <div className="mt-3 text-xs text-muted-foreground">Your DMs</div>
              <div className="grid gap-1">
                {dms.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No chats yet. Start a DM above.</div>
                ) : (
                  dms.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={cn(
                        "flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
                        t.id === selectedThreadId ? "bg-accent" : "hover:bg-accent/60",
                      )}
                      onClick={() => setSelectedThreadId(t.id)}
                    >
                      <span className="truncate">
                        {t.is_dm ? "DM" : t.name || "Channel"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className={cn("p-0 overflow-hidden", isDrawer ? "h-full flex flex-col" : "")}>
            <div className="border-b px-3 py-2 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{selectedThreadLabel}</div>
                <div className="text-xs text-muted-foreground">Realtimed via Supabase</div>
              </div>
              {uploading ? <Badge variant="secondary">Uploading…</Badge> : null}
            </div>

            <div
              className={cn(
                "overflow-auto px-3 py-3 space-y-3 bg-gradient-to-b from-background to-background/70",
                isDrawer ? "flex-1 min-h-0" : "h-[56vh] sm:h-[62vh]",
              )}
            >
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">No messages yet. Say hi.</div>
              ) : (
                messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    meId={me.id}
                    message={m}
                    resolveUrl={resolveUrl}
                    senderLabel={m.senderName || teamByUserId.get(m.sender_id)?.email || (m.sender_id === me.id ? "You" : "Member")}
                  />
                ))
              )}
              <div ref={listEndRef} />
            </div>

            <div className="border-t p-3">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (!files.length || !selectedThreadId) return;
                    await sendMessage({ files });
                  }}
                />

                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={sending || uploading}>
                  Attach
                </Button>

                {!recording ? (
                  <Button type="button" size="sm" variant="outline" onClick={startRecording} disabled={sending || uploading}>
                    Voice note
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
                    Stop
                  </Button>
                )}
              </div>

              <div className="grid gap-2">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write a message…"
                  className="min-h-[84px]"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {recording ? "Recording… tap Stop to send." : "Shift+Enter for newline."}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-gradient-to-l from-primary via-primary/80 to-primary/60 text-primary-foreground"
                    onClick={() => sendMessage()}
                    disabled={sending || uploading}
                  >
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  meId,
  message,
  senderLabel,
  resolveUrl,
  showMeta = true,
}: {
  meId: string;
  message: MessageWithExtras;
  senderLabel: string;
  resolveUrl: (a: AttachmentRow) => Promise<string | null>;
  showMeta?: boolean;
}) {
  const mine = message.sender_id === meId;
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const next: Record<string, string> = {};
      for (const a of message.attachments) {
        const url = await resolveUrl(a);
        if (url) next[a.id] = url;
      }
      if (!cancelled) setUrls(next);
    };

    if (message.attachments.length > 0) run();

    return () => {
      cancelled = true;
    };
  }, [message.attachments, resolveUrl]);

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] sm:max-w-[70%] rounded-2xl border px-3 py-2 shadow-sm",
          mine
            ? "bg-primary text-primary-foreground border-primary/30"
            : "bg-background/80 backdrop-blur border-border",
        )}
      >
        {showMeta ? (
          <div className={cn("flex items-center justify-between gap-2", mine ? "text-primary-foreground/90" : "text-muted-foreground")}>
            <span className="text-[11px] font-medium truncate">{mine ? "You" : senderLabel}</span>
            <span className="text-[11px]">{formatTime(message.created_at)}</span>
          </div>
        ) : (
          <div className={cn("flex justify-end", mine ? "text-primary-foreground/90" : "text-muted-foreground")}>
            <span className="text-[11px]">{formatTime(message.created_at)}</span>
          </div>
        )}

        {message.body ? <div className="mt-1 whitespace-pre-wrap text-sm">{message.body}</div> : null}

        {message.attachments.length > 0 ? (
          <div className="mt-2 grid gap-2">
            {message.attachments.map((a) => {
              const url = urls[a.id];
              const label = a.file_name || "Attachment";

              if (!url) {
                return (
                  <div key={a.id} className="text-xs opacity-80">
                    Loading {label}…
                  </div>
                );
              }

              if (isImage(a.mime_type)) {
                return (
                  <a key={a.id} href={url} target="_blank" rel="noreferrer" className="block">
                    <img src={url} alt={label} className="max-h-64 w-auto rounded-lg border" />
                  </a>
                );
              }

              if (isVideo(a.mime_type)) {
                return (
                  <video key={a.id} src={url} controls className="max-h-72 w-full rounded-lg border" />
                );
              }

              if (isAudio(a.mime_type)) {
                return (
                  <audio key={a.id} src={url} controls className="w-full" />
                );
              }

              return (
                <a
                  key={a.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-2 text-xs hover:bg-accent"
                >
                  <span className="truncate">{label}</span>
                  <span className="opacity-70">{bytesToSize(a.file_size)}</span>
                </a>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
