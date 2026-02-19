import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Minus } from "lucide-react";

interface ChatMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  message_type?: string;
  media_url?: string;
  media_caption?: string;
  interactive_data?: { product_id?: string };
  ai_generated?: boolean;
  created_at: string;
}

interface ChatWidgetProps {
  storeId: string;
  color?: string;
  /** If the customer is logged in, skip the name form */
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

function getSessionId(): string {
  const KEY = "phoxta_chat_session";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function StorefrontChatWidget({ storeId, color, customer }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("Chat with us");
  const [subtitle, setSubtitle] = useState("We usually reply within minutes");
  const [greeting, setGreeting] = useState("");
  const [widgetColor, setWidgetColor] = useState(color || "#6366f1");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [nameCollected, setNameCollected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const burstTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sessionId = useRef<string>("");
  const lastMsgCount = useRef(0);

  // If customer is logged in, pre-fill name/email and skip name form
  useEffect(() => {
    if (customer) {
      const fullName = `${customer.first_name} ${customer.last_name}`.trim();
      setCustomerName(fullName);
      setCustomerEmail(customer.email || "");
      setNameCollected(true);
    }
  }, [customer]);

  // Init session
  useEffect(() => {
    sessionId.current = getSessionId();
    // Only use localStorage name if not logged in
    if (!customer) {
      const savedName = localStorage.getItem("phoxta_chat_name");
      const savedEmail = localStorage.getItem("phoxta_chat_email");
      if (savedName) {
        setCustomerName(savedName);
        setNameCollected(true);
      }
      if (savedEmail) setCustomerEmail(savedEmail);
    }
  }, [customer]);

  // Fetch config + messages
  const fetchMessages = useCallback(async () => {
    if (!sessionId.current) return;
    try {
      const res = await fetch(
        `/api/messaging/chat?storeId=${encodeURIComponent(storeId)}&sessionId=${encodeURIComponent(sessionId.current)}`,
      );
      if (!res.ok) {
        if (res.status === 404) setAvailable(false);
        return;
      }
      const data = await res.json();
      setAvailable(true);
      if (data.config) {
        if (data.config.title) setTitle(data.config.title);
        if (data.config.subtitle) setSubtitle(data.config.subtitle);
        if (data.config.color) setWidgetColor(data.config.color);
        if (data.config.greeting) setGreeting(data.config.greeting);
      }
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.messages) {
        // Merge server messages with optimistic ones to avoid flicker
        setMessages((prev) => {
          const serverMsgs: ChatMessage[] = data.messages;
          // Keep any temp (optimistic) messages that aren't on server yet
          const tempMsgs = prev.filter(
            (m) => m.id.startsWith("temp-") && !serverMsgs.some((s) => s.body === m.body),
          );
          return [...serverMsgs, ...tempMsgs];
        });
      }
    } catch {
      // silent
    }
  }, [storeId]);

  // Pre-load config + history on mount (before widget is opened)
  useEffect(() => {
    if (sessionId.current) {
      fetchMessages();
    }
  }, [fetchMessages]);

  // Also fetch when widget is opened
  useEffect(() => {
    if (open && !minimized) {
      setLoading(true);
      fetchMessages().finally(() => setLoading(false));
    }
  }, [open, minimized, fetchMessages]);

  // Live polling — 2s for real-time feel
  useEffect(() => {
    if (open && !minimized && available) {
      pollRef.current = setInterval(fetchMessages, 2000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, minimized, available, fetchMessages]);

  // Track whether user has scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80; // px from bottom
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Scroll to bottom only if user is near bottom (don't snap back when reading history)
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (open && !minimized && nameCollected) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, minimized, nameCollected]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    // Force scroll to bottom on send (user expects to see their own message)
    isNearBottomRef.current = true;

    // Optimistic add
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      direction: "inbound",
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/messaging/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          sessionId: sessionId.current,
          customerName: customerName || undefined,
          customerEmail: customerEmail || undefined,
          customerId: customer?.id || undefined,
          message: text,
        }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);

      // Burst-fetch to catch AI reply quickly: 0.5s, 1.5s, 3s, 5s
      burstTimers.current.forEach(clearTimeout);
      burstTimers.current = [500, 1500, 3000, 5000].map((ms) =>
        setTimeout(fetchMessages, ms),
      );
    } catch {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally {
      setSending(false);
    }
  };

  // Cleanup burst timers
  useEffect(() => {
    return () => burstTimers.current.forEach(clearTimeout);
  }, []);

  const handleNameSubmit = () => {
    if (!customerName.trim()) return;
    localStorage.setItem("phoxta_chat_name", customerName.trim());
    if (customerEmail.trim()) {
      localStorage.setItem("phoxta_chat_email", customerEmail.trim());
    }
    setNameCollected(true);
  };

  // Don't render anything until we know availability (bubble always shows while loading)
  // Only hide if we explicitly got a 404 AND it wasn't auto-created
  if (available === false) return null;

  const accentColor = widgetColor;
  const textOnAccent = isLightColor(accentColor) ? "#1a1a1a" : "#ffffff";

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: accentColor, color: textOnAccent }}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
          {/* Unread dot */}
          {messages.some(
            (m) => m.direction === "outbound" && new Date(m.created_at) > new Date(Date.now() - 60000),
          ) && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
          )}
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-50 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all"
          style={{
            width: minimized ? 280 : 360,
            height: minimized ? 56 : 520,
            maxHeight: "85vh",
            maxWidth: "calc(100vw - 40px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none shrink-0"
            style={{ background: accentColor, color: textOnAccent }}
            onClick={() => setMinimized(!minimized)}
          >
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{title}</p>
              {!minimized && (
                <p className="text-xs opacity-80 truncate">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMinimized(!minimized);
                }}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  setMinimized(false);
                }}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!minimized && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {!nameCollected ? (
                /* Name collection form */
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
                  {greeting && (
                    <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">{greeting}</p>
                  )}
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Before we start, what&apos;s your name?
                  </p>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-offset-1"
                    style={{ "--tw-ring-color": accentColor } as any}
                    autoFocus
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-offset-1"
                    style={{ "--tw-ring-color": accentColor } as any}
                  />
                  <button
                    onClick={handleNameSubmit}
                    disabled={!customerName.trim()}
                    className="w-full py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: accentColor, color: textOnAccent }}
                  >
                    Start chatting
                  </button>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                  >
                    {loading && messages.length === 0 && (
                      <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {!loading && messages.length === 0 && greeting && (
                      <div className="flex justify-start">
                        <div
                          className="max-w-[80%] text-sm px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                        >
                          {greeting}
                        </div>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "inbound" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] text-sm rounded-2xl leading-relaxed overflow-hidden ${
                            msg.direction === "inbound"
                              ? "rounded-br-md text-white"
                              : "rounded-bl-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                          }`}
                          style={
                            msg.direction === "inbound"
                              ? { background: accentColor, color: textOnAccent }
                              : undefined
                          }
                        >
                          {/* Product image card */}
                          {msg.message_type === "image" && msg.media_url && (
                            <div
                              className={`w-full ${msg.interactive_data?.product_id ? "cursor-pointer group" : ""}`}
                              onClick={() => {
                                if (msg.interactive_data?.product_id) {
                                  window.dispatchEvent(
                                    new CustomEvent("phoxta:openProduct", {
                                      detail: { productId: msg.interactive_data.product_id },
                                    }),
                                  );
                                }
                              }}
                            >
                              <img
                                src={msg.media_url}
                                alt={msg.media_caption || "Product"}
                                className="w-full max-h-48 object-cover transition-opacity group-hover:opacity-80"
                                loading="lazy"
                              />
                              {msg.media_caption && (
                                <div className="px-3.5 py-2 text-[13px] leading-snug whitespace-pre-wrap">
                                  {msg.media_caption}
                                  {msg.interactive_data?.product_id && (
                                    <span className="block mt-1 text-xs font-medium opacity-70 underline underline-offset-2">
                                      Tap to view product →
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Text message */}
                          {(msg.message_type !== "image" || !msg.media_url) && (
                            <div className="px-3.5 py-2.5 whitespace-pre-wrap">
                              {msg.body}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {sending && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-3 py-2.5 flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type a message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="flex-1 text-sm py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full outline-none focus:ring-2 focus:ring-offset-1 text-zinc-900 dark:text-zinc-100"
                      style={{ "--tw-ring-color": accentColor } as any}
                      disabled={sending}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                      style={{ background: accentColor, color: textOnAccent }}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Simple brightness check */
function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
