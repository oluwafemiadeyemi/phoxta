import { useList, useGo } from "@refinedev/core";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import { Deal, Contact, Company, Task, Quote, Staff } from "@crm/types";
import { IOrder, ICustomer } from "@crm/types/finefoods";
import { useCurrency } from "@crm/hooks/use-currency";
import {
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  PoundSterling,
  Briefcase,
  UserPlus,
  Clock,
  Trophy,
  FileText,
  ShoppingCart,
  FolderKanban,
  Target,
  Zap,
  Building2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Timer,
  Package,
  Send,
  Star,
} from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { ChartContainer } from "@crm/components/ui/chart";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import {
  DealRevenueChart,
  NewContactsChart,
  ActivityTimeline,
  RecentDealsTable,
  TopDeals,
  TrendIcon,
} from "@crm/components/dashboard";
import type { TimeSeriesData } from "@crm/components/dashboard";

dayjs.extend(relativeTime);

type DateFilter = "lastWeek" | "lastMonth";

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildTimeSeries(
  items: { createdAt: string; value?: number }[],
  start: Date,
  end: Date,
  mode: "count" | "sum" = "count",
): TimeSeriesData[] {
  const map = new Map<string, number>();
  const cur = new Date(start);
  while (cur <= end) {
    map.set(toDateKey(cur), 0);
    cur.setDate(cur.getDate() + 1);
  }
  for (const item of items) {
    if (!item.createdAt) continue;
    const key = toDateKey(new Date(item.createdAt));
    if (map.has(key)) {
      map.set(key, (map.get(key) || 0) + (mode === "sum" ? (item.value || 0) : 1));
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

function computeTrend(
  current: number,
  items: { createdAt: string; value?: number }[],
  prevStart: Date,
  prevEnd: Date,
  mode: "count" | "sum",
): number {
  let prevTotal = 0;
  for (const item of items) {
    if (!item.createdAt) continue;
    const d = new Date(item.createdAt);
    if (d >= prevStart && d <= prevEnd) {
      prevTotal += mode === "sum" ? (item.value || 0) : 1;
    }
  }
  if (prevTotal === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prevTotal) / prevTotal) * 100);
}

/* ── Greeting helper ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ── KPI card config ── */
interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  gradient: string;
  iconBg: string;
  onClick?: () => void;
}

function KpiCard({ label, value, subtitle, icon, trend, trendLabel, gradient, iconBg, onClick }: KpiCardProps) {
  return (
    <div
      className={`group relative ${gradient} rounded-xl p-4 sm:p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}
      onClick={onClick}
    >
      {/* Decorative circle */}
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 h-16 w-16 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 ${iconBg} rounded-xl shadow-sm`}>
            {icon}
          </div>
          {trend !== undefined && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-100/80 text-emerald-700" : "bg-red-100/80 text-red-700"}`}>
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-white/70 mb-1 truncate">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">{value}</p>
        <p className="text-xs text-white/60 mt-1.5 truncate">{subtitle}</p>
      </div>
    </div>
  );
}

/* ── Pipeline funnel stage ── */
const funnelStageColors = [
  { bg: "bg-blue-500", bar: "#3b82f6", light: "bg-blue-50 text-blue-700" },
  { bg: "bg-indigo-500", bar: "#6366f1", light: "bg-indigo-50 text-indigo-700" },
  { bg: "bg-amber-500", bar: "#f59e0b", light: "bg-amber-50 text-amber-700" },
  { bg: "bg-orange-500", bar: "#f97316", light: "bg-orange-50 text-orange-700" },
  { bg: "bg-emerald-500", bar: "#10b981", light: "bg-emerald-50 text-emerald-700" },
  { bg: "bg-red-400", bar: "#f87171", light: "bg-red-50 text-red-700" },
];

/* ── Quote status mini badge ── */
const quoteStatusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  Draft: { icon: <FileText className="h-3.5 w-3.5" />, color: "text-slate-500 bg-slate-100" },
  Sent: { icon: <Send className="h-3.5 w-3.5" />, color: "text-blue-600 bg-blue-50" },
  Accepted: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-600 bg-emerald-50" },
  Rejected: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-red-500 bg-red-50" },
  Expired: { icon: <Timer className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-50" },
};

/* ── Order status config ── */
const orderStatusConfig: Record<string, { dot: string }> = {
  Pending: { dot: "bg-amber-400" },
  Ready: { dot: "bg-blue-400" },
  "On The Way": { dot: "bg-indigo-400" },
  Delivered: { dot: "bg-emerald-400" },
  Cancelled: { dot: "bg-red-400" },
};

const DashboardPage = () => {
  const go = useGo();
  const { symbol, format, formatCompact } = useCurrency();
  const [dateFilter, setDateFilter] = useState<DateFilter>("lastWeek");

  const dateRange = useMemo(() => {
    const now = dayjs();
    if (dateFilter === "lastWeek") {
      return {
        start: now.subtract(6, "day").startOf("day").toDate(),
        end: now.endOf("day").toDate(),
        prevStart: now.subtract(13, "day").startOf("day").toDate(),
        prevEnd: now.subtract(7, "day").endOf("day").toDate(),
      };
    }
    return {
      start: now.subtract(1, "month").startOf("day").toDate(),
      end: now.endOf("day").toDate(),
      prevStart: now.subtract(2, "month").startOf("day").toDate(),
      prevEnd: now.subtract(1, "month").subtract(1, "day").endOf("day").toDate(),
    };
  }, [dateFilter]);

  /* ── Data fetching ── */
  const { result: dealsResult } = useList<Deal>({ resource: "deals", pagination: { pageSize: 200 } });
  const { result: contactsResult } = useList<Contact>({ resource: "contacts", pagination: { pageSize: 200 } });
  const { result: companiesResult } = useList<Company>({ resource: "companies", pagination: { pageSize: 100 } });
  const { result: tasksResult } = useList<Task>({ resource: "tasks", pagination: { pageSize: 200 } });
  const { result: quotesResult } = useList<Quote>({ resource: "quotes", pagination: { pageSize: 100 } });
  const { result: ordersResult } = useList<IOrder>({ resource: "orders", pagination: { pageSize: 200 } });
  const { result: customersResult } = useList<ICustomer>({ resource: "customers", pagination: { pageSize: 200 } });
  const { result: staffResult } = useList<Staff>({ resource: "staff", pagination: { pageSize: 50 } });

  const deals = dealsResult?.data || [];
  const contacts = contactsResult?.data || [];
  const companies = companiesResult?.data || [];
  const tasks = tasksResult?.data || [];
  const quotes = quotesResult?.data || [];
  const orders = ordersResult?.data || [];
  const customers = customersResult?.data || [];
  const staff = staffResult?.data || [];

  /* ── KPI calculations ── */
  const totalDealsValue = deals.reduce((s, d) => s + (d.value || 0), 0);
  const wonDeals = deals.filter((d) => d.status === "Won");
  const wonDealsValue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
  const activeDeals = deals.filter((d) => !["Won", "Lost"].includes(d.status));
  const conversionRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

  const completedTasks = tasks.filter((t) => t.stage === "Done").length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const activeTasks = tasks.filter((t) => !["Done"].includes(t.stage));

  const totalOrderRevenue = orders.reduce((s, o) => s + (o.amount || 0), 0);
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;

  const activeQuotes = quotes.filter((q) => q.status === "Sent" || q.status === "Draft");
  const activeQuotesValue = activeQuotes.reduce((s, q) => s + (q.grandTotal || 0), 0);
  const acceptedQuotes = quotes.filter((q) => q.status === "Accepted");

  const activeStaff = staff.filter((s) => s.status === "Active").length;

  /* ── Pipeline stage data ── */
  const pipelineStages = useMemo(() => {
    const stages = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
    const maxCount = Math.max(1, ...stages.map((s) => deals.filter((d) => d.status === s).length));
    return stages.map((name, i) => {
      const count = deals.filter((d) => d.status === name).length;
      const value = deals.filter((d) => d.status === name).reduce((s, d) => s + (d.value || 0), 0);
      return { name, count, value, pct: Math.round((count / maxCount) * 100), color: funnelStageColors[i] };
    });
  }, [deals]);

  /* ── Time series ── */
  const dealRevenueData = useMemo(
    () => buildTimeSeries(deals.map((d) => ({ createdAt: d.createdAt, value: d.value })), dateRange.start, dateRange.end, "sum"),
    [deals, dateRange],
  );
  const dealRevenueTotal = useMemo(() => dealRevenueData.reduce((s, d) => s + d.value, 0), [dealRevenueData]);
  const dealRevenueTrend = useMemo(
    () => computeTrend(dealRevenueTotal, deals.map((d) => ({ createdAt: d.createdAt, value: d.value })), dateRange.prevStart, dateRange.prevEnd, "sum"),
    [dealRevenueTotal, deals, dateRange],
  );

  const salesRevenueData = useMemo(
    () => buildTimeSeries(orders.map((o) => ({ createdAt: o.createdAt, value: o.amount })), dateRange.start, dateRange.end, "sum"),
    [orders, dateRange],
  );
  const salesRevenueTotal = useMemo(() => salesRevenueData.reduce((s, d) => s + d.value, 0), [salesRevenueData]);
  const salesRevenueTrend = useMemo(
    () => computeTrend(salesRevenueTotal, orders.map((o) => ({ createdAt: o.createdAt, value: o.amount })), dateRange.prevStart, dateRange.prevEnd, "sum"),
    [salesRevenueTotal, orders, dateRange],
  );

  const newContactsData = useMemo(
    () => buildTimeSeries(contacts.map((c) => ({ createdAt: c.createdAt || "" })), dateRange.start, dateRange.end, "count"),
    [contacts, dateRange],
  );
  const newContactsTotal = useMemo(() => newContactsData.reduce((s, d) => s + d.value, 0), [newContactsData]);
  const newContactsTrend = useMemo(
    () => computeTrend(newContactsTotal, contacts.map((c) => ({ createdAt: c.createdAt || "" })), dateRange.prevStart, dateRange.prevEnd, "count"),
    [newContactsTotal, contacts, dateRange],
  );

  /* ── Quote pie data ── */
  const quotePieData = useMemo(() => {
    const statuses = ["Draft", "Sent", "Accepted", "Rejected", "Expired"] as const;
    return statuses
      .map((s) => ({ name: s, value: quotes.filter((q) => q.status === s).length }))
      .filter((d) => d.value > 0);
  }, [quotes]);
  const quotePieColors = { Draft: "#94a3b8", Sent: "#3b82f6", Accepted: "#10b981", Rejected: "#ef4444", Expired: "#f59e0b" };

  /* ── Order status data ── */
  const orderStatusData = useMemo(() => {
    const statuses = ["Pending", "Ready", "On The Way", "Delivered", "Cancelled"];
    return statuses
      .map((s) => ({ name: s, value: orders.filter((o) => o.status === s).length }))
      .filter((d) => d.value > 0);
  }, [orders]);

  /* ── Upcoming tasks (due soon, not done) ── */
  const upcomingTasks = useMemo(() => {
    return activeTasks
      .filter((t) => t.dueDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [activeTasks]);

  const priorityColors: Record<string, string> = {
    Urgent: "bg-red-500",
    High: "bg-orange-500",
    Medium: "bg-amber-400",
    Low: "bg-slate-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 px-3 sm:px-6 py-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ═══════════════════  HEADER  ═══════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600 mb-1">{dayjs().format("dddd, MMMM D, YYYY")}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {getGreeting()} <span className="text-slate-400 font-normal text-lg sm:text-xl">/ Dashboard</span>
            </h1>
          </div>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastWeek">Last 7 days</SelectItem>
              <SelectItem value="lastMonth">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ═══════════════════  KPI CARDS  ═══════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <KpiCard
            label="Pipeline Value"
            value={formatCompact(totalDealsValue)}
            subtitle={`${activeDeals.length} active deals`}
            icon={<TrendingUp className="h-5 w-5 text-white" />}
            trend={dealRevenueTrend}
            gradient="bg-gradient-to-br from-blue-600 to-blue-700"
            iconBg="bg-blue-500/80"
            onClick={() => go?.({ to: "/deals/board" })}
          />
          <KpiCard
            label="Won Revenue"
            value={formatCompact(wonDealsValue)}
            subtitle={`${conversionRate}% conversion`}
            icon={<Trophy className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-emerald-600 to-emerald-700"
            iconBg="bg-emerald-500/80"
            onClick={() => go?.({ to: "/deals/board" })}
          />
          <KpiCard
            label="Contacts"
            value={contacts.length}
            subtitle={`${companies.length} companies`}
            icon={<Users className="h-5 w-5 text-white" />}
            trend={newContactsTrend}
            gradient="bg-gradient-to-br from-violet-600 to-violet-700"
            iconBg="bg-violet-500/80"
            onClick={() => go?.({ to: "/contacts" })}
          />
          <KpiCard
            label="Active Quotes"
            value={activeQuotes.length}
            subtitle={formatCompact(activeQuotesValue) + " value"}
            icon={<FileText className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-amber-500 to-amber-600"
            iconBg="bg-amber-400/80"
            onClick={() => go?.({ to: "/quotes" })}
          />
          <KpiCard
            label="Orders"
            value={orders.length}
            subtitle={formatCompact(totalOrderRevenue) + " revenue"}
            icon={<ShoppingCart className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-rose-500 to-rose-600"
            iconBg="bg-rose-400/80"
            onClick={() => go?.({ to: "/orders" })}
          />
          <KpiCard
            label="Tasks"
            value={activeTasks.length}
            subtitle={`${taskCompletionRate}% complete`}
            icon={<FolderKanban className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-cyan-600 to-cyan-700"
            iconBg="bg-cyan-500/80"
            onClick={() => go?.({ to: "/projects/board" })}
          />
        </div>

        {/* ═══════════════════  CHARTS ROW  ═══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Sales Revenue Area Chart (3 cols) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Sales Revenue</h4>
                  <p className="text-xs text-slate-500">{dateFilter === "lastWeek" ? "Past 7 days" : "Past 30 days"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{formatCompact(salesRevenueTotal)}</p>
                <TrendIcon
                  trend={salesRevenueTrend}
                  text={<span className={salesRevenueTrend >= 0 ? "text-emerald-600" : "text-red-500"}>{salesRevenueTrend >= 0 ? "+" : ""}{salesRevenueTrend}%</span>}
                />
              </div>
            </div>
            <div className="h-[260px] px-2 pb-4">
              <DealRevenueChart data={salesRevenueData} />
            </div>
          </div>

          {/* Deal Pipeline Funnel (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Pipeline</h4>
                  <p className="text-xs text-slate-500">{deals.length} total deals</p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 space-y-2.5">
              {pipelineStages.map((stage) => (
                <div key={stage.name} className="group flex items-center gap-3">
                  <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-md min-w-[76px] ${stage.color.light}`}>
                    {stage.name}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full ${stage.color.bg} transition-all duration-500`}
                      style={{ width: `${Math.max(stage.pct, 2)}%` }}
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-slate-600">
                      {stage.count}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 min-w-[60px] text-right hidden sm:block">
                    {formatCompact(stage.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════  NEW CONTACTS + QUOTES + ORDERS ROW  ═══════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* New Contacts Chart */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-sm">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">New Contacts</h4>
                  <p className="text-xs text-slate-500">{newContactsTotal} this period</p>
                </div>
              </div>
              <TrendIcon
                trend={newContactsTrend}
                text={<span className={newContactsTrend >= 0 ? "text-emerald-600" : "text-red-500"}>{newContactsTrend >= 0 ? "+" : ""}{newContactsTrend}%</span>}
              />
            </div>
            <div className="h-[200px] px-2 pb-4">
              <NewContactsChart data={newContactsData} />
            </div>
          </div>

          {/* Quote Status Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Quotes</h4>
                  <p className="text-xs text-slate-500">{quotes.length} total</p>
                </div>
              </div>
              <button
                onClick={() => go?.({ to: "/quotes" })}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
              >
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-4 px-5 pb-5">
              <div className="w-28 h-28 shrink-0">
                {quotePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={quotePieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={3} strokeWidth={0}>
                        {quotePieData.map((entry) => (
                          <Cell key={entry.name} fill={quotePieColors[entry.name as keyof typeof quotePieColors] || "#94a3b8"} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">No data</div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                {(["Draft", "Sent", "Accepted", "Rejected", "Expired"] as const).map((status) => {
                  const count = quotes.filter((q) => q.status === status).length;
                  if (!count) return null;
                  const cfg = quoteStatusConfig[status];
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center justify-center h-6 w-6 rounded-md ${cfg.color}`}>{cfg.icon}</span>
                        <span className="text-xs font-medium text-slate-700">{status}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{count}</span>
                    </div>
                  );
                })}
                {quotes.length === 0 && <p className="text-xs text-slate-400">No quotes yet</p>}
              </div>
            </div>
          </div>

          {/* Order Overview */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300 md:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Orders</h4>
                  <p className="text-xs text-slate-500">{format(totalOrderRevenue)} total</p>
                </div>
              </div>
              <button
                onClick={() => go?.({ to: "/orders" })}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
              >
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="px-5 pb-5">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-amber-700">{pendingOrders}</p>
                  <p className="text-[10px] font-medium text-amber-600">Pending</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-blue-700">{orders.filter((o) => o.status === "On The Way").length}</p>
                  <p className="text-[10px] font-medium text-blue-600">In Transit</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-700">{deliveredOrders}</p>
                  <p className="text-[10px] font-medium text-emerald-600">Delivered</p>
                </div>
              </div>
              {/* Status bars */}
              <div className="space-y-2">
                {orderStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${orderStatusConfig[item.name]?.dot || "bg-slate-400"}`} />
                    <span className="text-xs text-slate-600 w-20 truncate">{item.name}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${orderStatusConfig[item.name]?.dot || "bg-slate-400"}`}
                        style={{ width: `${orders.length > 0 ? Math.round((item.value / orders.length) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-6 text-right">{item.value}</span>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No orders yet</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════  RECENT DEALS + ACTIVITY + TASKS ROW  ═══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Recent Deals Table */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Recent Deals</h4>
              </div>
              <button
                onClick={() => go?.({ to: "/deals/board" })}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
              >
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="h-[400px] overflow-hidden">
              <RecentDealsTable />
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Activity</h4>
              </div>
            </div>
            <div className="h-[400px] overflow-hidden">
              <ActivityTimeline />
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-sm">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Due Tasks</h4>
              </div>
              <button
                onClick={() => go?.({ to: "/projects/board" })}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
              >
                Board <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingTasks.map((task) => {
                const isOverdue = dayjs(task.dueDate).isBefore(dayjs(), "day");
                return (
                  <div key={task.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${priorityColors[task.priority] || "bg-slate-400"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isOverdue ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                            {isOverdue ? "Overdue" : dayjs(task.dueDate).fromNow()}
                          </span>
                          <span className="text-[10px] text-slate-400">{task.stage}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {upcomingTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-300" />
                  <p className="text-xs">All caught up!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════  BOTTOM ROW: TOP DEALS + TEAM OVERVIEW  ═══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top Deals by Value */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                  <Star className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Top Deals</h4>
              </div>
            </div>
            <TopDeals />
          </div>

          {/* Team & Key Metrics */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-sm">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Quick Stats</h4>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {/* Staff */}
                <div
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => go?.({ to: "/staff" })}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{activeStaff}</p>
                    <p className="text-[10px] text-slate-500">Active Staff</p>
                  </div>
                </div>
                {/* Customers */}
                <div
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => go?.({ to: "/customers" })}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 text-white">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{customers.length}</p>
                    <p className="text-[10px] text-slate-500">Customers</p>
                  </div>
                </div>
                {/* Accepted Quotes */}
                <div
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => go?.({ to: "/quotes" })}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{acceptedQuotes.length}</p>
                    <p className="text-[10px] text-slate-500">Accepted Quotes</p>
                  </div>
                </div>
                {/* Companies */}
                <div
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => go?.({ to: "/companies" })}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{companies.length}</p>
                    <p className="text-[10px] text-slate-500">Companies</p>
                  </div>
                </div>
              </div>
              {/* Conversion funnel summary */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Deal Conversion</span>
                  <span className="text-sm font-bold text-blue-700">{conversionRate}%</span>
                </div>
                <div className="h-2 bg-white/80 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${conversionRate}%` }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-slate-500">{deals.length} total deals</span>
                  <span className="text-[10px] text-emerald-600 font-medium">{wonDeals.length} won</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
