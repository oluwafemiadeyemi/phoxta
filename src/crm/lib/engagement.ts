export type EngagementEventType =
  | "focus_session_completed"
  | "task_moved_done"
  | "deal_stage_changed"
  | "quote_viewed"
  | "quick_add_used";

export type EngagementEvent = {
  id: string;
  type: EngagementEventType;
  timestamp: string; // ISO
  meta?: Record<string, unknown>;
};

const STORAGE_KEY = "starterhub.engagement.events.v1";
const UPDATED_EVENT = "starterhub.engagement.updated";

function safeParseEvents(raw: string | null): EngagementEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is EngagementEvent => Boolean(e && typeof e === "object"))
      .filter((e) => typeof e.id === "string" && typeof e.type === "string" && typeof e.timestamp === "string");
  } catch {
    return [];
  }
}

export function getEngagementEvents(): EngagementEvent[] {
  if (typeof window === "undefined") return [];
  const events = safeParseEvents(window.localStorage.getItem(STORAGE_KEY));
  // Keep most recent first
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function logEngagementEvent(type: EngagementEventType, meta?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const events = safeParseEvents(window.localStorage.getItem(STORAGE_KEY));
  const event: EngagementEvent = {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    meta,
  };

  const next = [event, ...events].slice(0, 300);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
}

export function updateEngagementEvent(
  id: string,
  updater: (event: EngagementEvent) => EngagementEvent,
) {
  if (typeof window === "undefined") return;

  const events = safeParseEvents(window.localStorage.getItem(STORAGE_KEY));
  const idx = events.findIndex((e) => e.id === id);
  if (idx < 0) return;

  const next = [...events];
  next[idx] = updater(next[idx]);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
}

function toLocalDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getActionStreak(types: EngagementEventType[] = [
  "focus_session_completed",
  "task_moved_done",
  "deal_stage_changed",
  "quick_add_used",
]) {
  const events = getEngagementEvents().filter((e) => types.includes(e.type));
  const daySet = new Set(events.map((e) => toLocalDateKey(new Date(e.timestamp))));

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (daySet.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export type PipelineHealth = {
  score: number; // 0..100
  overdueTasks: number;
  tasksDueToday: number;
  quotesExpiringSoon: number;
  staleOpenDeals: number;
};

export function computePipelineHealth(input: {
  tasks: Array<{ dueDate?: string; stage?: string }>;
  quotes: Array<{ expiryDate?: string; status?: string }>;
  deals: Array<{ createdAt?: string; status?: string }>;
}): PipelineHealth {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const inTwoDays = new Date(today);
  inTwoDays.setDate(inTwoDays.getDate() + 2);

  const overdueTasks = input.tasks.filter((t) => {
    if (!t?.dueDate) return false;
    if (t.stage === "Done") return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  const tasksDueToday = input.tasks.filter((t) => {
    if (!t?.dueDate) return false;
    if (t.stage === "Done") return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  }).length;

  const quotesExpiringSoon = input.quotes.filter((q) => {
    if (!q?.expiryDate) return false;
    const status = q.status ?? "";
    if (["Accepted", "Rejected", "Expired"].includes(status)) return false;
    const expiry = new Date(q.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry <= inTwoDays;
  }).length;

  const staleOpenDeals = input.deals.filter((d) => {
    const status = d.status ?? "";
    if (["Won", "Lost"].includes(status)) return false;
    if (!d.createdAt) return false;
    const created = new Date(d.createdAt);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 14);
    return created < cutoff;
  }).length;

  const penalty = overdueTasks * 8 + quotesExpiringSoon * 10 + staleOpenDeals * 5;
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    score,
    overdueTasks,
    tasksDueToday,
    quotesExpiringSoon,
    staleOpenDeals,
  };
}

export function formatEngagementEvent(e: EngagementEvent) {
  const when = new Date(e.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  switch (e.type) {
    case "focus_session_completed":
      return {
        title: "Focus session completed",
        detail: typeof e.meta?.minutes === "number" ? `${e.meta.minutes} min` : undefined,
        when,
      };
    case "task_moved_done":
      return {
        title: "Task completed",
        detail: typeof e.meta?.title === "string" ? e.meta.title : undefined,
        when,
      };
    case "deal_stage_changed":
      return {
        title: "Pipeline updated",
        detail: typeof e.meta?.title === "string" ? e.meta.title : undefined,
        when,
      };
    case "quote_viewed":
      return {
        title: "Quote viewed",
        detail: typeof e.meta?.quoteNumber === "string" ? e.meta.quoteNumber : undefined,
        when,
      };
    case "quick_add_used":
      return {
        title: "Quick add",
        detail: typeof e.meta?.kind === "string" ? String(e.meta.kind) : undefined,
        when,
      };
  }
}
