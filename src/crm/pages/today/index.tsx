import { useList, useUpdate } from "@refinedev/core";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  FileText,
  ClipboardCopy,
  Sparkles,
  Trophy,
} from "lucide-react";

import type { Deal, Quote, Task } from "@crm/types";
import { Card } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Progress } from "@crm/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@crm/components/ui/tabs";
import { QuickAddDialog } from "@crm/components/quick-add-dialog";
import { computePipelineHealth } from "@crm/lib/engagement";
import { useEngagement } from "@crm/hooks/use-engagement";
import { getPersonalizationSettings, setPersonalizationSettings, type OptimizeFor } from "@crm/lib/personalization";

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(dateStr: string, day: Date) {
  const d = new Date(dateStr);
  return toDateKey(d) === toDateKey(day);
}

export default function TodayPage() {
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const [optimizeFor, setOptimizeFor] = useState<OptimizeFor>(() => getPersonalizationSettings().optimizeFor);

  const { streak } = useEngagement();

  const { mutate: updateTask } = useUpdate();
  const { mutate: updateQuote } = useUpdate();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { result: tasksResult } = useList<Task>({
    resource: "tasks",
    pagination: { mode: "off" },
  });
  const tasks = tasksResult.data || [];

  const { result: quotesResult } = useList<Quote>({
    resource: "quotes",
    pagination: { mode: "off" },
  });
  const quotes = quotesResult.data || [];

  const { result: dealsResult } = useList<Deal>({
    resource: "deals",
    pagination: { mode: "off" },
  });
  const deals = dealsResult.data || [];


  const health = computePipelineHealth({ tasks, quotes, deals });

  const overdueTasks = useMemo(() => {
    return tasks
      .filter((t) => t.stage !== "Done" && Boolean(t.dueDate))
      .filter((t) => {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, today]);

  const dueTodayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.stage !== "Done" && Boolean(t.dueDate))
      .filter((t) => isSameDay(t.dueDate, today))
      .sort((a, b) => {
        const pa = a.priority ?? "Medium";
        const pb = b.priority ?? "Medium";
        const order: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        return (order[pa] ?? 9) - (order[pb] ?? 9);
      });
  }, [tasks, today]);

  const quotesExpiringSoon = useMemo(() => {
    const inTwoDays = new Date(today);
    inTwoDays.setDate(inTwoDays.getDate() + 2);

    return quotes
      .filter((q) => Boolean(q.expiryDate))
      .filter((q) => !["Accepted", "Rejected", "Expired"].includes(q.status))
      .filter((q) => {
        const expiry = new Date(q.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        return expiry <= inTwoDays;
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [quotes, today]);

  const staleDeals = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 14);

    return deals
      .filter((d) => !["Won", "Lost"].includes(d.status))
      .filter((d) => Boolean(d.createdAt))
      .filter((d) => new Date(d.createdAt) < cutoff)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [deals, today]);

  const top3Plan = useMemo(() => {
    const list = [...overdueTasks, ...dueTodayTasks].slice(0, 3);
    if (list.length === 0) return "No urgent tasks right now. Consider creating 1-2 small wins.";

    const lines = list.map((t, idx) => `${idx + 1}. ${t.title}`);
    return `Today\n${lines.join("\n")}`;
  }, [overdueTasks, dueTodayTasks]);

  useEffect(() => {
    setPersonalizationSettings({ optimizeFor });
  }, [optimizeFor]);

  const rescheduleTaskToTomorrow = (taskId: string) => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    updateTask({
      resource: "tasks",
      id: taskId,
      values: { dueDate: tomorrow.toISOString() },
      mutationMode: "optimistic",
    });
  };

  const completeTask = (taskId: string) => {
    updateTask({
      resource: "tasks",
      id: taskId,
      values: { stage: "Done" },
      mutationMode: "optimistic",
    });
  };

  const extendQuoteExpiry = (quote: Quote, days: number) => {
    const base = new Date(quote.expiryDate);
    base.setDate(base.getDate() + days);
    const next = base.toISOString().split("T")[0];
    updateQuote({
      resource: "quotes",
      id: quote.id,
      values: { expiryDate: next },
      mutationMode: "optimistic",
    });
  };

  const rewards = useMemo(() => {
    const items: Array<{ title: string; detail: string }> = [];
    if (streak >= 7) items.push({ title: "Clean week", detail: "7-day streak of meaningful actions" });
    if (overdueTasks.length === 0) items.push({ title: "Zero overdue", detail: "No overdue tasks" });
    if (quotesExpiringSoon.length === 0) items.push({ title: "Expiry safe", detail: "No quotes expiring in 48h" });
    if (health.score >= 90) items.push({ title: "Healthy pipeline", detail: "Pipeline health 90+" });
    return items;
  }, [streak, overdueTasks.length, quotesExpiringSoon.length, health.score]);

  const nextBestActions = useMemo(() => {
    const actions: Array<
      | { key: string; title: string; detail: string; primary: { label: string; onClick: () => void }; secondary?: { label: string; onClick: () => void } }
      | null
    > = [];

    if (overdueTasks.length > 0) {
      const t = overdueTasks[0];
      actions.push({
        key: `overdue-${t.id}`,
        title: "Clear an overdue task",
        detail: t.title,
        primary: { label: "Open", onClick: () => navigate(`/tasks/edit/${t.id}`) },
        secondary: { label: "Mark done", onClick: () => completeTask(t.id) },
      });
    }

    if (quotesExpiringSoon.length > 0) {
      const q = quotesExpiringSoon[0];
      actions.push({
        key: `quote-${q.id}`,
        title: "Prevent a quote expiry",
        detail: `${q.quoteNumber} expires ${q.expiryDate}`,
        primary: { label: "Open quote", onClick: () => navigate(`/quotes/show/${q.id}`) },
        secondary: { label: "Extend +7d", onClick: () => extendQuoteExpiry(q, 7) },
      });
    }

    if (staleDeals.length > 0) {
      const d = staleDeals[0];
      actions.push({
        key: `stale-${d.id}`,
        title: "Touch a stale deal",
        detail: `${d.title} (created ${new Date(d.createdAt).toLocaleDateString()})`,
        primary: { label: "Open", onClick: () => navigate(`/deals/show/${d.id}`) },
      });
    }

    return actions.filter(Boolean) as Array<{
      key: string;
      title: string;
      detail: string;
      primary: { label: string; onClick: () => void };
      secondary?: { label: string; onClick: () => void };
    }>;
  }, [overdueTasks, quotesExpiringSoon, staleDeals, navigate]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_60%_at_40%_20%,#000_30%,transparent_70%)] bg-[linear-gradient(to_right,hsl(var(--primary)/0.15),transparent),linear-gradient(to_bottom,hsl(var(--primary)/0.08),transparent)]" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">Today</Badge>
                  <span>{todayLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={() => setQuickAddOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Quick add
                </Button>
                <Button variant="outline" onClick={() => navigate("/calendar")}>
                  Open calendar
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-4 relative overflow-hidden border-white/25 bg-gradient-to-br from-background/70 to-background/30 shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-white/20 backdrop-blur-xl supports-[backdrop-filter]:bg-background/25 dark:border-white/10 dark:ring-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-600" />
                      <div className="font-semibold">Streak</div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">Keep doing meaningful actions.</div>
                  </div>
                  <Badge variant={streak > 0 ? "default" : "secondary"}>
                    {streak} day{streak === 1 ? "" : "s"}
                  </Badge>
                </div>
              </Card>

              <Card className="p-4 relative overflow-hidden border-white/25 bg-gradient-to-br from-background/70 to-background/30 shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-white/20 backdrop-blur-xl supports-[backdrop-filter]:bg-background/25 dark:border-white/10 dark:ring-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                      <div className="font-semibold">Pipeline health</div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Fix {Math.min(3, health.overdueTasks + health.quotesExpiringSoon + health.staleOpenDeals)} items to improve your score.
                    </div>
                  </div>
                  <Badge variant={health.score >= 80 ? "default" : health.score >= 60 ? "secondary" : "destructive"}>
                    {health.score}/100
                  </Badge>
                </div>
                <div className="mt-3">
                  <Progress value={health.score} className="h-2" />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded-md border border-white/25 bg-background/35 p-2 backdrop-blur-md dark:border-white/10 dark:bg-background/15">
                    <div className="text-muted-foreground">Overdue</div>
                    <div className="mt-1 font-semibold">{health.overdueTasks}</div>
                  </div>
                  <div className="rounded-md border border-white/25 bg-background/35 p-2 backdrop-blur-md dark:border-white/10 dark:bg-background/15">
                    <div className="text-muted-foreground">Due</div>
                    <div className="mt-1 font-semibold">{health.tasksDueToday}</div>
                  </div>
                  <div className="rounded-md border border-white/25 bg-background/35 p-2 backdrop-blur-md dark:border-white/10 dark:bg-background/15">
                    <div className="text-muted-foreground">Quotes</div>
                    <div className="mt-1 font-semibold">{health.quotesExpiringSoon}</div>
                  </div>
                  <div className="rounded-md border border-white/25 bg-background/35 p-2 backdrop-blur-md dark:border-white/10 dark:bg-background/15">
                    <div className="text-muted-foreground">Stale</div>
                    <div className="mt-1 font-semibold">{health.staleOpenDeals}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 relative overflow-hidden border-white/25 bg-gradient-to-br from-background/70 to-background/30 shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-white/20 backdrop-blur-xl supports-[backdrop-filter]:bg-background/25 dark:border-white/10 dark:ring-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <div className="font-semibold">Today nudges</div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">A few small closes make a big day.</div>
                  </div>
                  <Badge variant="outline">Live</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={overdueTasks.length > 0 ? "destructive" : "secondary"}>
                    {overdueTasks.length} overdue
                  </Badge>
                  <Badge variant={quotesExpiringSoon.length > 0 ? "default" : "secondary"}>
                    {quotesExpiringSoon.length} expiring
                  </Badge>
                  <Badge variant={staleDeals.length > 0 ? "secondary" : "outline"}>
                    {staleDeals.length} stale deals
                  </Badge>
                </div>

                <div className="mt-4 flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => navigate("/projects/board")}>
                    Projects
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/deals/board")}>
                    Pipeline
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/quotes")}>
                    Quotes
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <Tabs defaultValue="plan" className="w-full">
          <TabsList className="w-full justify-between md:justify-start md:gap-2">
            <TabsTrigger value="plan">Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="plan">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="p-5 lg:col-span-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-lg font-semibold">Next best actions</div>
                    <div className="text-sm text-muted-foreground">Helpful nudges with one-tap actions</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Optimize for</span>
                    <select
                      className="h-9 rounded-md border bg-background px-3 text-sm"
                      value={optimizeFor}
                      onChange={(e) => setOptimizeFor(e.target.value as OptimizeFor)}
                    >
                      <option value="sales">Sales</option>
                      <option value="projects">Projects</option>
                      <option value="ops">Ops</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {nextBestActions.length === 0 ? (
                    <div className="rounded-xl border bg-muted/30 p-8 text-center text-muted-foreground">
                      <Sparkles className="h-6 w-6 mx-auto mb-2" />
                      All clear — nothing needs attention right now.
                    </div>
                  ) : (
                    nextBestActions.map((a) => (
                      <div key={a.key} className="group rounded-xl border p-4 transition-colors hover:bg-muted/30">
                        <div className="font-medium">{a.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{a.detail}</div>
                        <div className="mt-3 flex gap-2 flex-wrap">
                          <Button size="sm" onClick={a.primary.onClick}>
                            {a.primary.label}
                          </Button>
                          {a.secondary && (
                            <Button size="sm" variant="outline" onClick={a.secondary.onClick}>
                              {a.secondary.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">Start-of-day plan</div>
                    <div className="text-sm text-muted-foreground">Top 3 actions to keep momentum</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(top3Plan)}>
                    <ClipboardCopy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {overdueTasks.length > 0 && (
                    <div className="rounded-xl border p-4">
                      <div className="flex items-center gap-2 font-medium">
                        <CheckSquare className="h-4 w-4" />
                        Overdue
                      </div>
                      <div className="mt-3 space-y-2">
                        {overdueTasks.slice(0, 3).map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-2">
                            <button
                              className="text-left text-sm hover:underline flex-1 truncate"
                              onClick={() => navigate(`/tasks/edit/${t.id}`)}
                            >
                              {t.title}
                            </button>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={() => rescheduleTaskToTomorrow(t.id)}>
                                Tomorrow
                              </Button>
                              <Button size="sm" onClick={() => completeTask(t.id)}>
                                Done
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dueTodayTasks.length > 0 && (
                    <div className="rounded-xl border p-4">
                      <div className="flex items-center gap-2 font-medium">
                        <CalendarDays className="h-4 w-4" />
                        Due today
                      </div>
                      <div className="mt-3 space-y-2">
                        {dueTodayTasks.slice(0, 3).map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-2">
                            <button
                              className="text-left text-sm hover:underline flex-1 truncate"
                              onClick={() => navigate(`/tasks/edit/${t.id}`)}
                            >
                              {t.title} <span className="text-muted-foreground">({t.priority})</span>
                            </button>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={() => rescheduleTaskToTomorrow(t.id)}>
                                Tomorrow
                              </Button>
                              <Button size="sm" onClick={() => completeTask(t.id)}>
                                Done
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {quotesExpiringSoon.length > 0 && (
                    <div className="rounded-xl border p-4">
                      <div className="flex items-center gap-2 font-medium">
                        <FileText className="h-4 w-4" />
                        Quotes expiring (48h)
                      </div>
                      <div className="mt-3 space-y-2">
                        {quotesExpiringSoon.slice(0, 3).map((q) => (
                          <div key={q.id} className="flex items-center justify-between gap-2">
                            <button
                              className="text-left text-sm hover:underline flex-1 truncate"
                              onClick={() => navigate(`/quotes/show/${q.id}`)}
                            >
                              {q.quoteNumber} <span className="text-muted-foreground">(expires {q.expiryDate})</span>
                            </button>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={() => extendQuoteExpiry(q, 7)}>
                                +7d
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {overdueTasks.length === 0 && dueTodayTasks.length === 0 && quotesExpiringSoon.length === 0 && (
                    <div className="rounded-xl border bg-muted/30 p-8 text-center text-muted-foreground">
                      <Sparkles className="h-6 w-6 mx-auto mb-2" />
                      Clear day — create a quick win to keep momentum.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-600" />
                    <div className="font-semibold">Rewards</div>
                  </div>
                  <Badge variant="outline">{rewards.length}</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {rewards.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Earn rewards by clearing risks and keeping your streak.</div>
                  ) : (
                    rewards.map((r) => (
                      <div key={r.title} className="rounded-xl border p-3">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{r.detail}</div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>


        </Tabs>

        <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      </div>
    </div>
  );
}
