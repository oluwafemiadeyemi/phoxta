"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Loader2,
  Database,
  ArrowRight,
  ChevronDown,
  Trash2,
  Zap,
  Activity,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@crm/lib/utils";
import { supabaseClient } from "@crm/lib/supabase";

/* ═══════════════════════════════════════════════════════════
   Phoxta Assistant — AI Agent Chat Panel
   Floating orb button (identical to FocusOrb) + glass
   morphism popup chat panel. Fully scrollable.
   ═══════════════════════════════════════════════════════════ */

// ── Types ───────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolEvent[];
  timestamp: Date;
}

interface ToolEvent {
  tool: string;
  args: Record<string, any>;
  result?: any;
  status: "running" | "done" | "error";
}

interface SSEChunk {
  type: "text" | "tool_start" | "tool_result" | "side_effect" | "done" | "error";
  content?: string;
  tool?: string;
  args?: Record<string, any>;
  tool_call_id?: string;
  result?: any;
  navigate?: string;
  message?: string;
}

// ── Helpers ─────────────────────────────────────────────────
const friendlyToolName: Record<string, string> = {
  list_records: "Listing records",
  get_record: "Fetching record",
  create_record: "Creating record",
  update_record: "Updating record",
  delete_record: "Deleting record",
  search_records: "Searching records",
  get_dashboard_stats: "Getting dashboard stats",
  navigate_to: "Navigating",
  send_chat_message: "Sending message",
  get_messages: "Reading messages",
  send_email: "Sending email",
  reply_email: "Replying to email",
  list_inbox_emails: "Checking inbox",
  get_email: "Reading email",
};

let msgCounter = 0;
function nextId() {
  return `msg-${Date.now()}-${++msgCounter}`;
}

type Position = { left: number; top: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const BTN_SIZE = 56;
const BTN_MARGIN = 8;
const ORB_POS_KEY = "phoxta.assistant.orb.v1";
const STORAGE_KEY = "phoxta.assistant.history.v1";
const AUTOPILOT_KEY = "phoxta.assistant.autopilot.v1";
const AUTOPILOT_LOGS_KEY = "phoxta.assistant.autopilot.logs.v1";
const AUTOPILOT_INTERVAL_MS = 30_000; // 30 seconds

interface AutopilotAction {
  type: string;
  description: string;
  details?: Record<string, any>;
  timestamp: string;
}

interface AutopilotLog {
  actions: AutopilotAction[];
  summary: string;
  scannedAt: string;
  pendingCounts?: Record<string, number>;
}

function loadAutopilot(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(AUTOPILOT_KEY) === "true"; } catch { return false; }
}
function saveAutopilot(v: boolean) {
  try { window.localStorage.setItem(AUTOPILOT_KEY, String(v)); } catch { /* */ }
}
function loadAutopilotLogs(): AutopilotLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUTOPILOT_LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch { return []; }
}
function saveAutopilotLogs(logs: AutopilotLog[]) {
  try { window.localStorage.setItem(AUTOPILOT_LOGS_KEY, JSON.stringify(logs.slice(-20))); } catch { /* */ }
}

function getDefaultOrbPos(): Position {
  if (typeof window === "undefined") return { left: 16, top: 80 };
  return {
    left: Math.max(BTN_MARGIN, window.innerWidth - BTN_SIZE - 24),
    top: Math.max(BTN_MARGIN, window.innerHeight - BTN_SIZE - 200),
  };
}

function loadOrbPos(): Position {
  if (typeof window === "undefined") return getDefaultOrbPos();
  try {
    const raw = window.localStorage.getItem(ORB_POS_KEY);
    if (!raw) return getDefaultOrbPos();
    const p = JSON.parse(raw);
    if (typeof p?.left !== "number" || typeof p?.top !== "number") return getDefaultOrbPos();
    return { left: p.left, top: p.top };
  } catch {
    return getDefaultOrbPos();
  }
}

function saveOrbPos(p: Position) {
  try { window.localStorage.setItem(ORB_POS_KEY, JSON.stringify(p)); } catch { /* */ }
}

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = messages.slice(-50);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

// ── Simple markdown-like renderer ───────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-2 mb-1">
          {processInline(line.slice(4))}
        </h4>,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="font-semibold text-base mt-3 mb-1">
          {processInline(line.slice(3))}
        </h3>,
      );
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      elements.push(
        <div key={i} className="flex gap-1.5 ml-1 text-[13px] leading-relaxed">
          <span className="text-muted-foreground mt-0.5">•</span>
          <span>{processInline(line.replace(/^[-*]\s/, ""))}</span>
        </div>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-1.5 ml-1 text-[13px] leading-relaxed">
          <span className="text-muted-foreground font-medium min-w-[1rem]">{num}.</span>
          <span>{processInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>,
      );
      continue;
    }

    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    elements.push(
      <p key={i} className="text-[13px] leading-relaxed">
        {processInline(line)}
      </p>,
    );
  }

  return <>{elements}</>;
}

function processInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) {
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={match.index} className="px-1 py-0.5 rounded bg-muted text-[12px] font-mono">{match[3]}</code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ── Component ───────────────────────────────────────────────

export function PhoxtaAssistant() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Autopilot state ─────────────────────────────────────
  const [autopilot, setAutopilot] = useState(() => loadAutopilot());
  const [autopilotRunning, setAutopilotRunning] = useState(false);
  const [autopilotLogs, setAutopilotLogs] = useState<AutopilotLog[]>(() => loadAutopilotLogs());
  const [activeTab, setActiveTab] = useState<"chat" | "activity">("chat");
  const autopilotRef = useRef(autopilot);
  useEffect(() => { autopilotRef.current = autopilot; }, [autopilot]);

  // Persist autopilot state
  useEffect(() => { saveAutopilot(autopilot); }, [autopilot]);
  useEffect(() => { saveAutopilotLogs(autopilotLogs); }, [autopilotLogs]);

  // ── Autopilot polling ───────────────────────────────────
  const runAutopilotTick = useCallback(async () => {
    if (!autopilotRef.current) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    setAutopilotRunning(true);
    try {
      const res = await fetch("/api/assistant/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const log: AutopilotLog = {
        actions: data.actions || [],
        summary: data.summary || "Scan complete.",
        scannedAt: data.scannedAt || new Date().toISOString(),
        pendingCounts: data.pendingCounts,
      };
      setAutopilotLogs((prev) => [...prev.slice(-19), log]);
      // Add summary to chat so user sees what happened
      if (data.actions?.length > 0) {
        const autoMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: `**Autopilot** ${log.summary}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, autoMsg]);
      }
    } catch (err) {
      console.error("Autopilot tick error:", err);
    } finally {
      setAutopilotRunning(false);
    }
  }, []);

  useEffect(() => {
    if (!autopilot) return;
    // Run immediately on enable
    runAutopilotTick();
    const interval = setInterval(runAutopilotTick, AUTOPILOT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autopilot, runAutopilotTick]);

  const toggleAutopilot = useCallback(() => {
    setAutopilot((p) => !p);
  }, []);

  // ── Orb position (draggable, identical to FocusOrb) ─────
  const [pos, setPos] = useState<Position>(() => loadOrbPos());
  const posRef = useRef<Position>(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  const dragRef = useRef<{
    dragging: boolean;
    pointerId: number | null;
    startX: number; startY: number;
    startLeft: number; startTop: number;
    moved: boolean;
  }>({ dragging: false, pointerId: null, startX: 0, startY: 0, startLeft: 0, startTop: 0, moved: false });

  const clampToViewport = useCallback((next: Position): Position => {
    if (typeof window === "undefined") return next;
    return {
      left: clamp(next.left, BTN_MARGIN, window.innerWidth - BTN_SIZE - BTN_MARGIN),
      top: clamp(next.top, BTN_MARGIN, window.innerHeight - BTN_SIZE - BTN_MARGIN),
    };
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => clampToViewport(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampToViewport]);

  const startDrag = useCallback((e: React.PointerEvent) => {
    dragRef.current = {
      dragging: true,
      pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      startLeft: posRef.current.left, startTop: posRef.current.top,
      moved: false,
    };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current.dragging || dragRef.current.pointerId !== ev.pointerId) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (!dragRef.current.moved && Math.hypot(dx, dy) <= 5) return;
      dragRef.current.moved = true;
      const next = clampToViewport({
        left: dragRef.current.startLeft + dx,
        top: dragRef.current.startTop + dy,
      });
      setPos(next);
    };

    const onUp = (ev: PointerEvent) => {
      if (dragRef.current.pointerId !== ev.pointerId) return;
      dragRef.current.dragging = false;
      dragRef.current.pointerId = null;
      saveOrbPos(posRef.current);
      window.setTimeout(() => { dragRef.current.moved = false; }, 0);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [clampToViewport]);

  const orbClick = useCallback(() => {
    if (dragRef.current.moved) { dragRef.current.moved = false; return; }
    setOpen((o) => !o);
  }, []);

  // ── Popup placement (position near the orb, like FocusOrb) ──
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupSize, setPopupSize] = useState({ width: 380, height: 520 });
  const [popupPlacement, setPopupPlacement] = useState<"top" | "bottom">("top");

  useLayoutEffect(() => {
    if (typeof window === "undefined" || !open) return;
    const raf = window.requestAnimationFrame(() => {
      const el = popupRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setPopupSize({ width: rect.width, height: rect.height });

      const marginEdge = 12;
      const spaceAbove = pos.top - 12 - rect.height;
      const spaceBelow = window.innerHeight - (pos.top + BTN_SIZE + 12 + rect.height);
      setPopupPlacement(
        spaceAbove < marginEdge && spaceBelow >= marginEdge ? "bottom"
          : spaceBelow < marginEdge && spaceAbove >= marginEdge ? "top"
          : spaceAbove >= spaceBelow ? "top" : "bottom",
      );
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, pos.left, pos.top]);

  const popupPosition = useMemo(() => {
    if (typeof window === "undefined") return { left: pos.left, top: pos.top };
    const marginEdge = 12;
    const anchorX = pos.left + BTN_SIZE / 2;
    const clampedLeft = clamp(anchorX - popupSize.width / 2, marginEdge, window.innerWidth - popupSize.width - marginEdge);
    const top = popupPlacement === "top"
      ? Math.max(marginEdge, pos.top - 12 - popupSize.height)
      : Math.min(window.innerHeight - popupSize.height - marginEdge, pos.top + BTN_SIZE + 12);
    return { left: Math.round(clampedLeft), top: Math.round(top) };
  }, [pos.left, pos.top, popupPlacement, popupSize.height, popupSize.width]);

  // ── Chat logic ────────────────────────────────────────────
  useEffect(() => { saveHistory(messages); }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages, activeTools, streaming]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const buildApiMessages = useCallback(
    (history: ChatMessage[]) => history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    [],
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const userMsg: ChatMessage = { id: nextId(), role: "user", content: text, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setStreaming(true);
    setActiveTools([]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: buildApiMessages(updatedMessages), userId: user.id }),
        signal: abort.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      const toolEvents: ToolEvent[] = [];
      const assistantMsg: ChatMessage = { id: nextId(), role: "assistant", content: "", toolCalls: [], timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          let chunk: SSEChunk;
          try { chunk = JSON.parse(jsonStr); } catch { continue; }

          switch (chunk.type) {
            case "text":
              assistantText += chunk.content || "";
              setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: assistantText, toolCalls: [...toolEvents] } : m));
              break;
            case "tool_start":
              toolEvents.push({ tool: chunk.tool || "unknown", args: chunk.args || {}, status: "running" });
              setActiveTools([...toolEvents]);
              break;
            case "tool_result": {
              const last = toolEvents.find((t) => t.status === "running");
              if (last) { last.status = "done"; last.result = chunk.result; }
              setActiveTools([...toolEvents]);
              break;
            }
            case "side_effect":
              if (chunk.navigate) navigate(chunk.navigate);
              break;
            case "error":
              assistantText += `\n\n⚠️ ${chunk.message || "An error occurred."}`;
              setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: assistantText, toolCalls: [...toolEvents] } : m));
              break;
            case "done":
              break;
          }
        }
      }

      setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: assistantText, toolCalls: [...toolEvents] } : m));
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: `⚠️ Something went wrong: ${err?.message || "Unknown error"}. Please try again.`, timestamp: new Date() }]);
    } finally {
      setStreaming(false);
      setActiveTools([]);
      abortRef.current = null;
    }
  }, [input, streaming, messages, buildApiMessages, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const clearHistory = useCallback(() => { setMessages([]); saveHistory([]); }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setActiveTools([]);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "A") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // ── Render ────────────────────────────────────────────────
  const ringClass = autopilot
    ? "bg-[conic-gradient(from_90deg,#22c55e,#86efac,#10b981,#22c55e)]"
    : "bg-[conic-gradient(from_90deg,#a855f7,#3b82f6,#06b6d4,#a855f7)]";

  return (
    <>
      {/* ── Backdrop (identical to FocusOrb z-[68]) ─────────── */}
      <div
        aria-hidden={!open}
        className={
          "fixed inset-0 z-[71] bg-white/60 backdrop-blur-[2px] transition-opacity duration-200 dark:bg-black/40 " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
        onClick={() => setOpen(false)}
      />

      {/* ── Floating Orb Button (exactly like FocusOrb) ─────── */}
      <button
        type="button"
        aria-label="Open Phoxta Assistant"
        onClick={orbClick}
        onPointerDown={startDrag}
        style={{ left: pos.left, top: pos.top, width: BTN_SIZE, height: BTN_SIZE }}
        className="fixed z-[73] rounded-full touch-none select-none transition-[left,top] duration-500 ease-out motion-reduce:transition-none"
      >
        {/* Blur aura */}
        <span className={`absolute -inset-1 rounded-full blur-md opacity-70 ${ringClass} animate-pulse`} />
        {/* Spinning conic gradient ring */}
        <span className={`absolute -inset-1 rounded-full ${ringClass} animate-spin [animation-duration:5.5s]`} />
        {/* Inner bg */}
        <span className={"absolute inset-0 rounded-full border bg-background/85 backdrop-blur " + (autopilot ? "border-green-400/60" : "border-border")} />
        {/* Label */}
        <span className={"relative z-10 flex h-full w-full items-center justify-center text-[11px] font-semibold " + (autopilot ? "text-green-700 dark:text-green-400" : "text-foreground")}>
          {autopilot ? (
            <>
              <Zap className="h-3.5 w-3.5 mr-0.5" />
              <span>AI</span>
            </>
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </span>
      </button>

      {/* ── Chat Panel (glass morphism popup, like FocusOrb) ── */}
      <div
        aria-hidden={!open}
        className={
          "fixed z-[72] transition-opacity duration-200 " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
        style={{ left: popupPosition.left, top: popupPosition.top }}
      >
        <div ref={popupRef} className="relative w-[340px] sm:w-[380px] md:w-[420px] max-w-[calc(100vw-24px)]">
          {/* ── Aura glow (identical to FocusOrb) ────────────── */}
          <div aria-hidden="true" className="pointer-events-none absolute -inset-5 sm:-inset-6 rounded-[28px] opacity-45 blur-xl sm:blur-2xl">
            <div className="focus-popup-aura absolute inset-0 rounded-[28px] bg-[linear-gradient(120deg,rgba(168,85,247,0.22),rgba(59,130,246,0.20),rgba(6,182,212,0.20),rgba(168,85,247,0.22))]" />
            <div className="focus-popup-aura-slow absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.18),transparent_60%)]" />
          </div>

          {/* ── Glass shell ──────────────────────────────────── */}
          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-background/35 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl supports-[backdrop-filter]:bg-background/25 dark:border-white/10 dark:ring-white/10 max-h-[min(560px,calc(100vh-120px))]">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-background/20 px-3 py-2 shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Phoxta Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Autopilot toggle */}
                <button
                  type="button"
                  data-no-drag
                  aria-label={autopilot ? "Disable autopilot" : "Enable autopilot"}
                  title={autopilot ? "Autopilot ON — click to disable" : "Enable Autopilot"}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold shadow-sm backdrop-blur transition-all",
                    autopilot
                      ? "border-green-400/40 bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30"
                      : "border-white/20 bg-background/40 text-foreground/60 hover:bg-background/55 hover:text-foreground/90",
                  )}
                  onClick={toggleAutopilot}
                >
                  <Zap className={cn("h-3 w-3", autopilot && "animate-pulse")} />
                  {autopilot ? "AUTO" : "Auto"}
                  {autopilotRunning && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                </button>
                {messages.length > 0 && (
                  <button
                    type="button"
                    data-no-drag
                    aria-label="Clear history"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-background/40 text-foreground/60 shadow-sm backdrop-blur hover:bg-background/55 hover:text-foreground/90"
                    onClick={clearHistory}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  data-no-drag
                  aria-label="Close assistant"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-background/40 text-foreground/80 shadow-sm backdrop-blur hover:bg-background/55"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-white/10 bg-background/10 shrink-0">
              <button
                type="button" data-no-drag
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors",
                  activeTab === "chat" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <MessageSquare className="h-3 w-3" />
                Chat
              </button>
              <button
                type="button" data-no-drag
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors relative",
                  activeTab === "activity" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <Activity className="h-3 w-3" />
                Activity
                {autopilotLogs.length > 0 && autopilotLogs[autopilotLogs.length - 1].actions.length > 0 && (
                  <span className="absolute top-1 right-[calc(50%-28px)] h-1.5 w-1.5 rounded-full bg-green-500" />
                )}
              </button>
            </div>

            {/* Messages area — scrollable */}
            <div
              ref={scrollRef}
              className={cn("flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3 min-h-0", activeTab !== "chat" && "hidden")}
              style={{ maxHeight: "calc(100% - 140px)" }}
            >
              {messages.length === 0 && !streaming && (
                <div className="flex flex-col items-center justify-center py-6 text-center px-4 gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-0.5">How can I help?</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Manage contacts, deals, orders,<br />products, messages & more.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 w-full max-w-[260px] mt-1">
                    {[
                      "Show me dashboard stats",
                      "List my recent orders",
                      "Find all open deals",
                      "Search for a contact",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        data-no-drag
                        onClick={() => { setInput(suggestion); setTimeout(() => inputRef.current?.focus(), 50); }}
                        className="text-left px-2.5 py-1.5 text-[11px] rounded-lg border border-white/15 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowRight className="inline h-3 w-3 mr-1 opacity-50" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    Ctrl+Shift+A to toggle
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {/* Active tool indicators */}
              {streaming && activeTools.length > 0 && (
                <div className="space-y-1">
                  {activeTools.map((tool, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 text-[11px]">
                      {tool.status === "running" ? (
                        <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
                      ) : (
                        <Database className="h-3 w-3 text-green-500 shrink-0" />
                      )}
                      <span className="text-muted-foreground">
                        {friendlyToolName[tool.tool] || tool.tool}
                        {tool.args?.table && <span className="font-mono ml-1 text-foreground/70">{tool.args.table}</span>}
                      </span>
                      {tool.status === "done" && tool.result?.count !== undefined && (
                        <span className="ml-auto text-muted-foreground">{tool.result.count} found</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Streaming dots */}
              {streaming && activeTools.every((t) => t.status !== "running") && (
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:200ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:400ms]" />
                  </div>
                </div>
              )}
            </div>

            {/* Activity log tab */}
            {activeTab === "activity" && (
              <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3 min-h-0" style={{ maxHeight: "calc(100% - 140px)" }}>
                {autopilotLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-xs text-muted-foreground">No autopilot activity yet.</p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {autopilot ? "Autopilot is scanning every 30s..." : "Enable autopilot to start."}
                    </p>
                  </div>
                ) : (
                  [...autopilotLogs].reverse().map((log, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/5 dark:bg-white/3 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-medium flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5 text-green-500" />
                          Autopilot scan
                        </span>
                        <span>{new Date(log.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {/* Pending counts */}
                      {log.pendingCounts && Object.values(log.pendingCounts).some((v) => v > 0) && (
                        <div className="flex flex-wrap gap-1">
                          {log.pendingCounts.unreadMessages ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">{log.pendingCounts.unreadMessages} unread</span> : null}
                          {log.pendingCounts.pendingOrders ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400">{log.pendingCounts.pendingOrders} orders</span> : null}
                          {log.pendingCounts.overdueTasks ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">{log.pendingCounts.overdueTasks} overdue</span> : null}
                          {log.pendingCounts.lowStock ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">{log.pendingCounts.lowStock} low stock</span> : null}
                          {log.pendingCounts.unreadEmails ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">{log.pendingCounts.unreadEmails} emails</span> : null}
                        </div>
                      )}
                      {/* Actions taken */}
                      {log.actions.length > 0 && (
                        <div className="space-y-0.5">
                          {log.actions.map((a, j) => (
                            <div key={j} className="flex items-center gap-1.5 text-[10px]">
                              <CheckCircle2 className="h-2.5 w-2.5 text-green-500 shrink-0" />
                              <span className="text-muted-foreground">{a.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Summary */}
                      <div className="text-[11px] text-foreground/80 leading-relaxed">
                        {renderMarkdown(log.summary)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Input area */}
            <div className={cn("shrink-0 border-t border-white/10 bg-background/20 px-3 py-2", activeTab !== "chat" && "hidden")}>
              {streaming && (
                <button
                  type="button"
                  data-no-drag
                  onClick={stopGeneration}
                  className="flex items-center gap-1 mb-1.5 px-2.5 py-1 text-[11px] rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors mx-auto"
                >
                  <X className="h-3 w-3" />
                  Stop
                </button>
              )}
              <div className="flex items-end gap-1.5">
                <textarea
                  ref={inputRef}
                  data-no-drag
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  disabled={streaming}
                  className={cn(
                    "flex-1 resize-none rounded-lg border border-white/15 bg-white/5",
                    "px-2.5 py-2 text-[13px] placeholder:text-muted-foreground/50",
                    "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "max-h-[80px] scrollbar-thin",
                  )}
                  style={{ height: "auto", minHeight: "36px" }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 80) + "px";
                  }}
                />
                <button
                  type="button"
                  data-no-drag
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200",
                    input.trim() && !streaming
                      ? "bg-primary text-primary-foreground shadow-sm hover:scale-105"
                      : "bg-white/10 text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Message bubble sub-component ────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex items-start pt-0.5 shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Bot className="h-3 w-3 text-primary" />
          </div>
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-white/8 text-foreground rounded-bl-sm dark:bg-white/5",
        )}
      >
        {/* Tool calls accordion */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <button
            type="button"
            onClick={() => setToolsExpanded((e) => !e)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground mb-1 transition-colors"
          >
            <Database className="h-2.5 w-2.5" />
            {message.toolCalls.length} tool call{message.toolCalls.length > 1 ? "s" : ""}
            <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", toolsExpanded && "rotate-180")} />
          </button>
        )}

        {toolsExpanded && message.toolCalls && (
          <div className="mb-1.5 space-y-0.5 border-l-2 border-primary/20 pl-2">
            {message.toolCalls.map((tc, i) => (
              <div key={i} className="text-[10px] text-muted-foreground">
                <span className="font-medium">{friendlyToolName[tc.tool] || tc.tool}</span>
                {tc.args?.table && <span className="font-mono ml-1">{tc.args.table}</span>}
                {tc.result?.count !== undefined && <span className="ml-1">→ {tc.result.count} results</span>}
                {tc.result?.success && <span className="ml-1 text-green-500">→ ✓</span>}
                {tc.result?.error && <span className="ml-1 text-destructive">→ {tc.result.error}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        <div className={cn(isUser ? "text-[13px]" : "")}>
          {isUser ? message.content : renderMarkdown(message.content)}
        </div>
      </div>

      {isUser && (
        <div className="flex items-start pt-0.5 shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <User className="h-3 w-3 text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}

PhoxtaAssistant.displayName = "PhoxtaAssistant";
