"use client";

import { useList, useCreate } from "@refinedev/core";
import { useMemo, useState, useCallback } from "react";
import { useCurrency } from "@crm/hooks/use-currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@crm/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@crm/components/ui/dialog";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Textarea } from "@crm/components/ui/textarea";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type {
  Deal,
  Staff,
  Quote,
  FinanceTransaction,
  PayrollRecord,
  TaxRecord,
  FinancialAccount,
  Budget,
} from "@crm/types";
import type { IOrder } from "@crm/types/finefoods";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PoundSterling,
  Wallet,
  Receipt,
  Users,
  Building2,
  FileText,
  Calculator,
  PiggyBank,
  CreditCard,
  BadgePercent,
  ChevronRight,
  Download,
  Plus,
  Filter,
  BarChart3,
  CircleDollarSign,
  Briefcase,
  ShoppingCart,
  Landmark,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Banknote,
  Shield,
  Edit,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";

dayjs.extend(relativeTime);

/* ════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ════════════════════════════════════════════════════════ */

// UK Tax thresholds 2025/26
const UK_TAX = {
  personalAllowance: 12_570,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
  basicRate: 0.20,
  higherRate: 0.40,
  additionalRate: 0.45,
  niThreshold: 12_570,
  niUpperLimit: 50_270,
  niBasicRate: 0.08, // Employee Class 1
  niHigherRate: 0.02,
  employerNiRate: 0.138,
  employerNiThreshold: 9_100,
  autoPensionEmployee: 0.05,
  autoPensionEmployer: 0.03,
  studentLoanPlan2Threshold: 27_295,
  studentLoanPlan2Rate: 0.09,
  vatStandardRate: 0.20,
  corporationTaxSmall: 0.19,
  corporationTaxMain: 0.25,
  corporationTaxThreshold: 250_000,
};

function computeMonthlyPAYE(annualGross: number): number {
  let tax = 0;
  const taxable = Math.max(0, annualGross - UK_TAX.personalAllowance);
  if (taxable <= 0) return 0;
  const basicBand = Math.min(taxable, UK_TAX.basicRateLimit - UK_TAX.personalAllowance);
  tax += basicBand * UK_TAX.basicRate;
  const higherBand = Math.min(
    Math.max(0, taxable - basicBand),
    UK_TAX.higherRateLimit - UK_TAX.basicRateLimit,
  );
  tax += higherBand * UK_TAX.higherRate;
  const additionalBand = Math.max(0, taxable - basicBand - higherBand);
  tax += additionalBand * UK_TAX.additionalRate;
  return Math.round((tax / 12) * 100) / 100;
}

function computeMonthlyNI(annualGross: number): number {
  const monthlyGross = annualGross / 12;
  const monthlyThreshold = UK_TAX.niThreshold / 12;
  const monthlyUpper = UK_TAX.niUpperLimit / 12;
  if (monthlyGross <= monthlyThreshold) return 0;
  const basicNI = Math.min(monthlyGross - monthlyThreshold, monthlyUpper - monthlyThreshold) * UK_TAX.niBasicRate;
  const higherNI = Math.max(0, monthlyGross - monthlyUpper) * UK_TAX.niHigherRate;
  return Math.round((basicNI + higherNI) * 100) / 100;
}

function computeEmployerNI(annualGross: number): number {
  const monthlyGross = annualGross / 12;
  const monthlyThreshold = UK_TAX.employerNiThreshold / 12;
  if (monthlyGross <= monthlyThreshold) return 0;
  return Math.round((monthlyGross - monthlyThreshold) * UK_TAX.employerNiRate * 100) / 100;
}

function getGradient(name: string): string {
  const gradients = [
    "from-blue-600 to-blue-700",
    "from-emerald-600 to-emerald-700",
    "from-violet-600 to-violet-700",
    "from-amber-500 to-amber-600",
    "from-rose-500 to-rose-600",
    "from-cyan-600 to-cyan-700",
    "from-indigo-600 to-indigo-700",
    "from-teal-600 to-teal-700",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ════════════════════════════════════════════════════════ */

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  trend?: number;
}

function StatCard({ label, value, subtitle, icon, gradient, iconBg, trend }: StatCardProps) {
  return (
    <div className={`relative bg-gradient-to-br ${gradient} rounded-xl p-4 sm:p-5 overflow-hidden`}>
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 h-16 w-16 rounded-full bg-white/5" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 ${iconBg} rounded-xl shadow-sm`}>{icon}</div>
          {trend !== undefined && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-100/80 text-emerald-700" : "bg-red-100/80 text-red-700"}`}>
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-white/70 mb-1 truncate">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">{value}</p>
        {subtitle && <p className="text-xs text-white/60 mt-1.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, icon, children, action }: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-sm">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "rgba(255,255,255,0.97)",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
};

/* ════════════════════════════════════════════════════════
   MAIN FINANCE PAGE
   ════════════════════════════════════════════════════════ */

const FinancePage = () => {
  const { format, formatCompact, symbol } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const [yearFilter, setYearFilter] = useState(String(dayjs().year()));

  // ── Dialog States ──
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    type: "income" as "income" | "expense",
    category: "Other" as string,
    source: "other" as string,
    description: "",
    amount: "",
    date: dayjs().format("YYYY-MM-DD"),
    reference: "",
    notes: "",
  });
  const [accountForm, setAccountForm] = useState({
    name: "",
    type: "bank" as string,
    balance: "",
    currency: "GBP",
  });

  // ── Mutations ──
  const { mutate: createTransaction, mutation: createTxMutation } = useCreate();
  const { mutate: createAccount, mutation: createAccountMutation } = useCreate();

  // ── Data Fetching ──
  const { result: dealsResult } = useList<Deal>({ resource: "deals", pagination: { pageSize: 500 } });
  const { result: ordersResult } = useList<IOrder>({ resource: "orders", pagination: { pageSize: 500 } });
  const { result: staffResult } = useList<Staff>({ resource: "staff", pagination: { pageSize: 100 } });
  const { result: quotesResult } = useList<Quote>({ resource: "quotes", pagination: { pageSize: 200 } });
  const { result: txResult } = useList<FinanceTransaction>({ resource: "financeTransactions", pagination: { pageSize: 1000 } });
  const { result: payrollResult } = useList<PayrollRecord>({ resource: "payrollRecords", pagination: { pageSize: 500 } });
  const { result: taxResult } = useList<TaxRecord>({ resource: "taxRecords", pagination: { pageSize: 100 } });
  const { result: accountsResult } = useList<FinancialAccount>({ resource: "financialAccounts", pagination: { pageSize: 50 } });

  const deals = dealsResult?.data || [];
  const orders = ordersResult?.data || [];
  const staffMembers = staffResult?.data || [];
  const quotes = quotesResult?.data || [];
  const transactions = txResult?.data || [];
  const payrollRecords = payrollResult?.data || [];
  const taxRecords = taxResult?.data || [];
  const accounts = accountsResult?.data || [];

  const year = parseInt(yearFilter);

  // ── Capital Invested (from manual transactions) ──
  const capitalInvested = useMemo(() => {
    const capitalTx = transactions.filter(
      (t) => t.type === "income" && (t.category === "Other" || t.source === "other") &&
        (t.description?.toLowerCase().includes("capital") || t.description?.toLowerCase().includes("invest") || t.description?.toLowerCase().includes("funding"))
    );
    return {
      total: capitalTx.reduce((s, t) => s + (t.amount || 0), 0),
      count: capitalTx.length,
    };
  }, [transactions]);

  // ── Total account balances ──
  const totalAccountBalance = useMemo(() => {
    return accounts.filter((a) => a.isActive).reduce((s, a) => s + (a.balance || 0), 0);
  }, [accounts]);

  // ── Transaction totals from manual records ──
  const manualTransactionSummary = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income" && t.status === "completed");
    const expenses = transactions.filter((t) => t.type === "expense" && t.status === "completed");
    return {
      totalIncome: income.reduce((s, t) => s + (t.amount || 0), 0),
      totalExpenses: expenses.reduce((s, t) => s + (t.amount || 0), 0),
      incomeCount: income.length,
      expenseCount: expenses.length,
      recentTransactions: [...transactions]
        .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
        .slice(0, 10),
    };
  }, [transactions]);

  // ── Handlers ──
  const handleCreateTransaction = useCallback(() => {
    const amount = parseFloat(txForm.amount);
    if (!txForm.description || isNaN(amount) || amount <= 0) return;
    createTransaction(
      {
        resource: "financeTransactions",
        values: {
          type: txForm.type,
          category: txForm.category,
          source: txForm.source,
          description: txForm.description,
          amount,
          date: txForm.date,
          reference: txForm.reference || null,
          notes: txForm.notes || null,
          status: "completed",
        },
      },
      {
        onSuccess: () => {
          setTxDialogOpen(false);
          setTxForm({ type: "income", category: "Other", source: "other", description: "", amount: "", date: dayjs().format("YYYY-MM-DD"), reference: "", notes: "" });
        },
      },
    );
  }, [txForm, createTransaction]);

  const handleCreateAccount = useCallback(() => {
    const balance = parseFloat(accountForm.balance);
    if (!accountForm.name || isNaN(balance)) return;
    createAccount(
      {
        resource: "financialAccounts",
        values: {
          name: accountForm.name,
          type: accountForm.type,
          balance,
          currency: accountForm.currency,
          isActive: true,
        },
      },
      {
        onSuccess: () => {
          setAccountDialogOpen(false);
          setAccountForm({ name: "", type: "bank", balance: "", currency: "GBP" });
        },
      },
    );
  }, [accountForm, createAccount]);

  // ── Deal Revenue ──
  const dealRevenue = useMemo(() => {
    const wonDeals = deals.filter((d) => d.status === "Won");
    return {
      total: wonDeals.reduce((s, d) => s + (d.value || 0), 0),
      count: wonDeals.length,
      deals: wonDeals,
    };
  }, [deals]);

  // ── E-commerce Revenue ──
  const ecomRevenue = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "Delivered");
    return {
      total: delivered.reduce((s, o) => s + (o.amount || 0), 0),
      count: delivered.length,
      orders: delivered,
    };
  }, [orders]);

  // ── Quote Revenue (Accepted) ──
  const quoteRevenue = useMemo(() => {
    const accepted = quotes.filter((q) => q.status === "Accepted");
    return {
      total: accepted.reduce((s, q) => s + (q.grandTotal || 0), 0),
      count: accepted.length,
    };
  }, [quotes]);

  // ── Payroll Calculations ──
  const payrollSummary = useMemo(() => {
    const activeStaff = staffMembers.filter((s) => s.status === "Active");
    const annualGrossTotal = activeStaff.reduce((s, m) => s + (m.salary || 0), 0);
    const monthlyGrossTotal = annualGrossTotal / 12;

    let totalPAYE = 0;
    let totalEmployeeNI = 0;
    let totalEmployerNI = 0;
    let totalPensionEmployee = 0;
    let totalPensionEmployer = 0;

    const breakdown = activeStaff.map((member) => {
      const annual = member.salary || 0;
      const monthly = annual / 12;
      const paye = computeMonthlyPAYE(annual);
      const employeeNI = computeMonthlyNI(annual);
      const employerNI = computeEmployerNI(annual);
      const pensionEmployee = Math.round(monthly * UK_TAX.autoPensionEmployee * 100) / 100;
      const pensionEmployer = Math.round(monthly * UK_TAX.autoPensionEmployer * 100) / 100;
      const totalDeductions = paye + employeeNI + pensionEmployee;
      const netPay = Math.round((monthly - totalDeductions) * 100) / 100;

      totalPAYE += paye;
      totalEmployeeNI += employeeNI;
      totalEmployerNI += employerNI;
      totalPensionEmployee += pensionEmployee;
      totalPensionEmployer += pensionEmployer;

      return {
        id: member.id,
        name: member.fullName || `${member.firstName} ${member.lastName}`,
        department: member.department,
        jobTitle: member.jobTitle,
        employmentType: member.employmentType,
        annualSalary: annual,
        monthlySalary: monthly,
        paye,
        employeeNI,
        employerNI,
        pensionEmployee,
        pensionEmployer,
        studentLoan: 0,
        totalDeductions,
        netPay,
        totalEmployerCost: Math.round((monthly + employerNI + pensionEmployer) * 100) / 100,
      };
    });

    return {
      headcount: activeStaff.length,
      annualGrossTotal,
      monthlyGrossTotal,
      totalPAYE,
      totalEmployeeNI,
      totalEmployerNI,
      totalPensionEmployee,
      totalPensionEmployer,
      totalMonthlyNetPay: breakdown.reduce((s, b) => s + b.netPay, 0),
      totalMonthlyEmployerCost: breakdown.reduce((s, b) => s + b.totalEmployerCost, 0),
      breakdown,
    };
  }, [staffMembers]);

  // ── Totals ──
  const totalRevenue = dealRevenue.total + ecomRevenue.total;
  const totalExpenses = payrollSummary.totalMonthlyEmployerCost * 12;
  const grossProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  // ── Monthly Revenue/Expense split (for charts) ──
  const monthlyBreakdown = useMemo(() => {
    return MONTHS.map((month, i) => {
      const monthStr = String(i + 1).padStart(2, "0");

      // Deal revenue by month
      const monthDeals = deals
        .filter((d) => d.status === "Won" && d.createdAt && d.createdAt.startsWith(`${year}-${monthStr}`))
        .reduce((s, d) => s + (d.value || 0), 0);

      // E-commerce revenue by month
      const monthOrders = orders
        .filter((o) => o.status === "Delivered" && o.createdAt && o.createdAt.startsWith(`${year}-${monthStr}`))
        .reduce((s, o) => s + (o.amount || 0), 0);

      const income = monthDeals + monthOrders;
      const expenses = payrollSummary.totalMonthlyEmployerCost;

      return {
        month,
        dealRevenue: monthDeals,
        ecomRevenue: monthOrders,
        income,
        expenses,
        profit: income - expenses,
      };
    });
  }, [deals, orders, payrollSummary, year]);

  // ── Revenue Split Pie ──
  const revenueSplitData = useMemo(() => {
    const data = [];
    if (dealRevenue.total > 0) data.push({ name: "Deal Revenue", value: dealRevenue.total });
    if (ecomRevenue.total > 0) data.push({ name: "E-commerce", value: ecomRevenue.total });
    if (quoteRevenue.total > 0) data.push({ name: "Quoted (Accepted)", value: quoteRevenue.total });
    return data;
  }, [dealRevenue, ecomRevenue, quoteRevenue]);

  const pieColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
  const capitalPieColors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8"];

  // ── Capital Sources ──
  const capitalSourcesData = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    transactions
      .filter(
        (t) =>
          t.type === "income" &&
          (t.description?.toLowerCase().includes("capital") ||
           t.description?.toLowerCase().includes("invest") ||
           t.description?.toLowerCase().includes("funding") ||
           t.description?.toLowerCase().includes("seed") ||
           t.description?.toLowerCase().includes("loan") ||
           t.description?.toLowerCase().includes("grant"))
      )
      .forEach((t) => {
        const label = t.category === "Other" ? (t.source === "other" ? "Owner Capital" : t.source) : t.category;
        sourceMap[label] = (sourceMap[label] || 0) + (t.amount || 0);
      });
    // Also include investment-type accounts as a capital source
    const investmentBalance = accounts
      .filter((a) => a.isActive && a.type === "investment")
      .reduce((s, a) => s + (a.balance || 0), 0);
    if (investmentBalance > 0) sourceMap["Investment Accounts"] = (sourceMap["Investment Accounts"] || 0) + investmentBalance;
    return Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, accounts]);

  const totalCapitalSources = useMemo(() => capitalSourcesData.reduce((s, d) => s + d.value, 0), [capitalSourcesData]);

  // ── Expense Breakdown ──
  const expenseBreakdown = useMemo(() => {
    return [
      { name: "Gross Salaries", value: payrollSummary.monthlyGrossTotal * 12, color: "#3b82f6" },
      { name: "Employer NI", value: payrollSummary.totalEmployerNI * 12, color: "#ef4444" },
      { name: "Employer Pension", value: payrollSummary.totalPensionEmployer * 12, color: "#f59e0b" },
      { name: "PAYE (collected)", value: payrollSummary.totalPAYE * 12, color: "#8b5cf6" },
    ].filter((d) => d.value > 0);
  }, [payrollSummary]);

  // ── Tax Liabilities (computed from CRM data) ──
  const taxSummary = useMemo(() => {
    const vatOnEcom = ecomRevenue.total * UK_TAX.vatStandardRate;
    const corporationTaxRate =
      grossProfit > UK_TAX.corporationTaxThreshold ? UK_TAX.corporationTaxMain : UK_TAX.corporationTaxSmall;
    const corporationTax = Math.max(0, grossProfit * corporationTaxRate);
    const annualPAYE = payrollSummary.totalPAYE * 12;
    const annualNI = (payrollSummary.totalEmployeeNI + payrollSummary.totalEmployerNI) * 12;

    return {
      vat: vatOnEcom,
      corporationTax,
      paye: annualPAYE,
      nationalInsurance: annualNI,
      totalLiability: vatOnEcom + corporationTax + annualPAYE + annualNI,
      corporationTaxRate,
    };
  }, [ecomRevenue, grossProfit, payrollSummary]);

  // ── Department salary distribution ──
  const departmentData = useMemo(() => {
    const map = new Map<string, { count: number; totalSalary: number }>();
    payrollSummary.breakdown.forEach((b) => {
      const dept = b.department || "Unassigned";
      const existing = map.get(dept) || { count: 0, totalSalary: 0 };
      map.set(dept, { count: existing.count + 1, totalSalary: existing.totalSalary + b.annualSalary });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data, avgSalary: data.totalSalary / data.count }))
      .sort((a, b) => b.totalSalary - a.totalSalary);
  }, [payrollSummary]);

  const deptColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

  // ── years for filter ──
  const yearOptions = useMemo(() => {
    const currentYear = dayjs().year();
    return Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 px-3 sm:px-6 py-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ═══════ HEADER ═══════ */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Finance</h1>
                <p className="text-sm text-slate-500">Financial overview, payroll, tax & analytics</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px] bg-white border-slate-200 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>FY {y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-1.5 border-slate-200 shadow-sm" onClick={() => setAccountDialogOpen(true)}>
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Account</span>
            </Button>
            <Button size="sm" className="gap-1.5 bg-slate-900 hover:bg-slate-800 shadow-sm" onClick={() => setTxDialogOpen(true)}>
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Record Transaction</span>
            </Button>
          </div>
        </div>

        {/* ═══════ TABS ═══════ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-sm p-1 h-auto flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="revenue" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm">
              <Receipt className="h-3.5 w-3.5" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="payroll" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />
              Payroll
            </TabsTrigger>
            <TabsTrigger value="tax" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm">
              <Scale className="h-3.5 w-3.5" />
              Tax
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════
             TAB: OVERVIEW
             ═══════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              <StatCard
                label="Total Revenue"
                value={formatCompact(totalRevenue)}
                subtitle={`${dealRevenue.count + ecomRevenue.count} transactions`}
                icon={<PoundSterling className="h-5 w-5 text-white" />}
                gradient="from-emerald-600 to-emerald-700"
                iconBg="bg-emerald-500/80"
              />
              <StatCard
                label="Total Expenses"
                value={formatCompact(totalExpenses)}
                subtitle="Annual payroll cost"
                icon={<Receipt className="h-5 w-5 text-white" />}
                gradient="from-rose-500 to-rose-600"
                iconBg="bg-rose-400/80"
              />
              <StatCard
                label="Net Profit"
                value={formatCompact(grossProfit)}
                subtitle={`${profitMargin}% margin`}
                icon={<TrendingUp className="h-5 w-5 text-white" />}
                gradient={grossProfit >= 0 ? "from-teal-600 to-teal-700" : "from-red-600 to-red-700"}
                iconBg={grossProfit >= 0 ? "bg-teal-500/80" : "bg-red-500/80"}
              />
              <StatCard
                label="Capital Invested"
                value={formatCompact(capitalInvested.total)}
                subtitle={capitalInvested.count > 0 ? `${capitalInvested.count} investment(s)` : "Record via transactions"}
                icon={<Landmark className="h-5 w-5 text-white" />}
                gradient="from-indigo-600 to-indigo-700"
                iconBg="bg-indigo-500/80"
              />
              <StatCard
                label="Account Balance"
                value={formatCompact(totalAccountBalance)}
                subtitle={`${accounts.filter((a) => a.isActive).length} active account(s)`}
                icon={<Wallet className="h-5 w-5 text-white" />}
                gradient="from-cyan-600 to-cyan-700"
                iconBg="bg-cyan-500/80"
              />
              <StatCard
                label="Tax Liability"
                value={formatCompact(taxSummary.totalLiability)}
                subtitle="Estimated annual"
                icon={<Scale className="h-5 w-5 text-white" />}
                gradient="from-amber-500 to-amber-600"
                iconBg="bg-amber-400/80"
              />
            </div>

            {/* Revenue vs Expenses + Revenue Sources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard
                title="Revenue vs Expenses"
                subtitle="Monthly breakdown"
                icon={<BarChart3 className="h-4 w-4" />}
              >
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyBreakdown} barGap={4} barCategoryGap="12%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={60} />
                      <Tooltip {...chartTooltipStyle} formatter={(value) => format(Number(value ?? 0))} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} iconType="circle" />
                      <Bar dataKey="dealRevenue" name="Deal Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="ecomRevenue" name="E-commerce" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title="Revenue & Capital Sources" subtitle="Breakdown by channel" icon={<PiggyBank className="h-4 w-4" />}>
                {/* Revenue Sources */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Revenue Sources</span>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs font-bold text-slate-800">{formatCompact(totalRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="w-28 h-28 shrink-0">
                      {revenueSplitData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={revenueSplitData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                              {revenueSplitData.map((_, i) => (
                                <Cell key={i} fill={pieColors[i % pieColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip {...chartTooltipStyle} formatter={(value) => format(Number(value ?? 0))} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">No data</div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      {revenueSplitData.map((item, i) => {
                        const pct = totalRevenue > 0 ? Math.round((item.value / totalRevenue) * 100) : 0;
                        return (
                          <div key={item.name}>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                                <span className="text-[11px] font-medium text-slate-700">{item.name}</span>
                              </div>
                              <span className="text-xs font-bold text-slate-900">{formatCompact(item.value)}</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: pieColors[i % pieColors.length] }} />
                            </div>
                          </div>
                        );
                      })}
                      {revenueSplitData.length === 0 && (
                        <p className="text-xs text-slate-400">No revenue recorded yet</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-slate-200 my-4" />

                {/* Capital Sources */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Capital Sources</span>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs font-bold text-slate-800">{formatCompact(totalCapitalSources)}</span>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="w-28 h-28 shrink-0">
                      {capitalSourcesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={capitalSourcesData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                              {capitalSourcesData.map((_, i) => (
                                <Cell key={i} fill={capitalPieColors[i % capitalPieColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip {...chartTooltipStyle} formatter={(value) => format(Number(value ?? 0))} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">No data</div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      {capitalSourcesData.map((item, i) => {
                        const pct = totalCapitalSources > 0 ? Math.round((item.value / totalCapitalSources) * 100) : 0;
                        return (
                          <div key={item.name}>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: capitalPieColors[i % capitalPieColors.length] }} />
                                <span className="text-[11px] font-medium text-slate-700">{item.name}</span>
                              </div>
                              <span className="text-xs font-bold text-slate-900">{formatCompact(item.value)}</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: capitalPieColors[i % capitalPieColors.length] }} />
                            </div>
                          </div>
                        );
                      })}
                      {capitalSourcesData.length === 0 && (
                        <div className="text-center">
                          <p className="text-xs text-slate-400 mb-2">No capital recorded yet</p>
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setTxDialogOpen(true)}>
                            <Plus className="h-3 w-3" />
                            Record Capital Investment
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Profit Trend + Payroll Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard title="Profit Trend" subtitle="Monthly net profit" icon={<TrendingUp className="h-4 w-4" />}>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
                      <YAxis fontSize={12} stroke="#94a3b8" tickFormatter={(v) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip {...chartTooltipStyle} formatter={(value) => format(Number(value ?? 0))} />
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#profitGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title="Payroll at a Glance" subtitle={`${payrollSummary.headcount} active employees`} icon={<Users className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-blue-700">{format(payrollSummary.monthlyGrossTotal)}</p>
                    <p className="text-[10px] font-medium text-blue-600">Monthly Gross</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-emerald-700">{format(payrollSummary.totalMonthlyNetPay)}</p>
                    <p className="text-[10px] font-medium text-emerald-600">Net Pay (total)</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-amber-700">{format(payrollSummary.totalPAYE)}</p>
                    <p className="text-[10px] font-medium text-amber-600">Monthly PAYE</p>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-rose-700">{format(payrollSummary.totalMonthlyEmployerCost)}</p>
                    <p className="text-[10px] font-medium text-rose-600">Total Employer Cost</p>
                  </div>
                </div>
                {/* Quick deduction breakdown */}
                <div className="mt-4 space-y-2">
                  {[
                    { label: "Employee NI", value: payrollSummary.totalEmployeeNI, color: "bg-indigo-400" },
                    { label: "Employer NI", value: payrollSummary.totalEmployerNI, color: "bg-red-400" },
                    { label: "Employee Pension", value: payrollSummary.totalPensionEmployee, color: "bg-amber-400" },
                    { label: "Employer Pension", value: payrollSummary.totalPensionEmployer, color: "bg-teal-400" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${item.color}`} />
                      <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                      <span className="text-xs font-semibold text-slate-800">{format(item.value)}/mo</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Financial Accounts & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Financial Accounts */}
              <SectionCard
                title="Financial Accounts"
                subtitle={`${accounts.filter((a) => a.isActive).length} active`}
                icon={<Building2 className="h-4 w-4" />}
                action={
                  <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={() => setAccountDialogOpen(true)}>
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                }
              >
                {accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 mb-1">No accounts yet</p>
                    <p className="text-xs text-slate-400 mb-3">Add bank, cash, credit or investment accounts</p>
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAccountDialogOpen(true)}>
                      <Plus className="h-3 w-3" />
                      Add Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accounts.filter((a) => a.isActive).map((acc) => (
                      <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                            acc.type === "bank" ? "bg-blue-500" :
                            acc.type === "cash" ? "bg-emerald-500" :
                            acc.type === "credit" ? "bg-rose-500" :
                            "bg-indigo-500"
                          }`}>
                            {acc.type === "bank" ? "BK" : acc.type === "cash" ? "CA" : acc.type === "credit" ? "CR" : "IN"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{acc.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{acc.type} · {acc.currency}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${(acc.balance || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {format(acc.balance || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Recent Transactions */}
              <SectionCard
                title="Recent Transactions"
                subtitle={`${transactions.length} recorded`}
                icon={<ArrowRightLeft className="h-4 w-4" />}
                action={
                  <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={() => setTxDialogOpen(true)}>
                    <Plus className="h-3 w-3" />
                    Record
                  </Button>
                }
              >
                {manualTransactionSummary.recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <ArrowRightLeft className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 mb-1">No transactions recorded</p>
                    <p className="text-xs text-slate-400 mb-3">Record capital investments, operational expenses & more</p>
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setTxDialogOpen(true)}>
                      <Plus className="h-3 w-3" />
                      Record Transaction
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {manualTransactionSummary.recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white ${
                            tx.type === "income" ? "bg-emerald-500" : "bg-rose-500"
                          }`}>
                            {tx.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{tx.description}</p>
                            <p className="text-xs text-slate-500">{tx.category} · {dayjs(tx.date).format("DD MMM YYYY")}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.type === "income" ? "+" : "-"}{format(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════
             TAB: REVENUE
             ═══════════════════════════════════════ */}
          <TabsContent value="revenue" className="space-y-6 mt-0">
            {/* Revenue KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="Deal Revenue"
                value={formatCompact(dealRevenue.total)}
                subtitle={`${dealRevenue.count} won deals`}
                icon={<Briefcase className="h-5 w-5 text-white" />}
                gradient="from-blue-600 to-blue-700"
                iconBg="bg-blue-500/80"
              />
              <StatCard
                label="E-commerce Revenue"
                value={formatCompact(ecomRevenue.total)}
                subtitle={`${ecomRevenue.count} delivered orders`}
                icon={<ShoppingCart className="h-5 w-5 text-white" />}
                gradient="from-violet-600 to-violet-700"
                iconBg="bg-violet-500/80"
              />
              <StatCard
                label="Quoted Value"
                value={formatCompact(quoteRevenue.total)}
                subtitle={`${quoteRevenue.count} accepted quotes`}
                icon={<FileText className="h-5 w-5 text-white" />}
                gradient="from-amber-500 to-amber-600"
                iconBg="bg-amber-400/80"
              />
              <StatCard
                label="Total Revenue"
                value={formatCompact(totalRevenue)}
                subtitle={`${profitMargin}% profit margin`}
                icon={<CircleDollarSign className="h-5 w-5 text-white" />}
                gradient="from-emerald-600 to-emerald-700"
                iconBg="bg-emerald-500/80"
              />
            </div>

            {/* Revenue Comparison Chart */}
            <SectionCard title="Deal vs E-commerce Revenue" subtitle="Monthly comparison" icon={<BarChart3 className="h-4 w-4" />}>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBreakdown} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
                    <YAxis fontSize={12} stroke="#94a3b8" tickFormatter={(v) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip {...chartTooltipStyle} formatter={(value) => format(Number(value ?? 0))} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="dealRevenue" name="Deal Revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="ecomRevenue" name="E-commerce Revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* Recent Won Deals + Delivered Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard title="Recent Won Deals" subtitle={`${dealRevenue.count} total`} icon={<Briefcase className="h-4 w-4" />}>
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {dealRevenue.deals
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 10)
                    .map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{deal.title}</p>
                          <p className="text-xs text-slate-500">{dayjs(deal.createdAt).format("DD MMM YYYY")}</p>
                        </div>
                        <span className="text-sm font-bold text-emerald-700 shrink-0 ml-2">{format(deal.value)}</span>
                      </div>
                    ))}
                  {dealRevenue.count === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">No won deals yet</p>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Recent Delivered Orders" subtitle={`${ecomRevenue.count} total`} icon={<ShoppingCart className="h-4 w-4" />}>
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {ecomRevenue.orders
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 10)
                    .map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">Order #{order.orderNumber}</p>
                          <p className="text-xs text-slate-500">
                            {order.customerName || "Guest"} &middot; {dayjs(order.createdAt).format("DD MMM YYYY")}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-violet-700 shrink-0 ml-2">{format(order.amount)}</span>
                      </div>
                    ))}
                  {ecomRevenue.count === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">No delivered orders yet</p>
                  )}
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════
             TAB: EXPENSES
             ═══════════════════════════════════════ */}
          <TabsContent value="expenses" className="space-y-6 mt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="Annual Payroll"
                value={formatCompact(payrollSummary.annualGrossTotal)}
                subtitle={`${payrollSummary.headcount} employees`}
                icon={<Users className="h-5 w-5 text-white" />}
                gradient="from-blue-600 to-blue-700"
                iconBg="bg-blue-500/80"
              />
              <StatCard
                label="Employer NI (Annual)"
                value={formatCompact(payrollSummary.totalEmployerNI * 12)}
                subtitle="National Insurance"
                icon={<Shield className="h-5 w-5 text-white" />}
                gradient="from-rose-500 to-rose-600"
                iconBg="bg-rose-400/80"
              />
              <StatCard
                label="Pension (Annual)"
                value={formatCompact((payrollSummary.totalPensionEmployee + payrollSummary.totalPensionEmployer) * 12)}
                subtitle="Employee + Employer"
                icon={<PiggyBank className="h-5 w-5 text-white" />}
                gradient="from-amber-500 to-amber-600"
                iconBg="bg-amber-400/80"
              />
              <StatCard
                label="Total Employer Cost"
                value={formatCompact(payrollSummary.totalMonthlyEmployerCost * 12)}
                subtitle="Gross + NI + Pension"
                icon={<Wallet className="h-5 w-5 text-white" />}
                gradient="from-slate-700 to-slate-800"
                iconBg="bg-slate-600/80"
              />
            </div>

            {/* Expense breakdown chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard title="Expense Breakdown" subtitle="Annual cost centres" icon={<Receipt className="h-4 w-4" />}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3} strokeWidth={0} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                        {expenseBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...chartTooltipStyle} formatter={(value) => format(Number(value ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title="Department Costs" subtitle="Salary distribution" icon={<Building2 className="h-4 w-4" />}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={12} stroke="#94a3b8" tickFormatter={(v) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis type="category" dataKey="name" fontSize={11} stroke="#94a3b8" width={90} />
                      <Tooltip {...chartTooltipStyle} formatter={(value) => format(Number(value ?? 0))} />
                      <Bar dataKey="totalSalary" name="Total Salary" radius={[0, 6, 6, 0]}>
                        {departmentData.map((_, i) => (
                          <Cell key={i} fill={deptColors[i % deptColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════
             TAB: PAYROLL
             ═══════════════════════════════════════ */}
          <TabsContent value="payroll" className="space-y-6 mt-0">
            {/* Payroll KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <StatCard label="Headcount" value={String(payrollSummary.headcount)} subtitle="Active employees" icon={<Users className="h-5 w-5 text-white" />} gradient="from-blue-600 to-blue-700" iconBg="bg-blue-500/80" />
              <StatCard label="Monthly Gross" value={format(payrollSummary.monthlyGrossTotal)} subtitle="Before deductions" icon={<Banknote className="h-5 w-5 text-white" />} gradient="from-indigo-600 to-indigo-700" iconBg="bg-indigo-500/80" />
              <StatCard label="Monthly PAYE" value={format(payrollSummary.totalPAYE)} subtitle="Income tax" icon={<BadgePercent className="h-5 w-5 text-white" />} gradient="from-amber-500 to-amber-600" iconBg="bg-amber-400/80" />
              <StatCard label="Monthly NI" value={format(payrollSummary.totalEmployeeNI + payrollSummary.totalEmployerNI)} subtitle="Empl. + Employer" icon={<Shield className="h-5 w-5 text-white" />} gradient="from-rose-500 to-rose-600" iconBg="bg-rose-400/80" />
              <StatCard label="Net Pay (Total)" value={format(payrollSummary.totalMonthlyNetPay)} subtitle="Take-home pay" icon={<Wallet className="h-5 w-5 text-white" />} gradient="from-emerald-600 to-emerald-700" iconBg="bg-emerald-500/80" />
            </div>

            {/* Payroll Table */}
            <SectionCard
              title="Payroll Breakdown"
              subtitle="Per-employee monthly deductions (UK PAYE/NI/Pension)"
              icon={<Calculator className="h-4 w-4" />}
            >
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Employee</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Department</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Gross /mo</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">PAYE</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Emp NI</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Pension</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Total Ded.</th>
                      <th className="text-right py-3 px-3 font-semibold text-emerald-700 text-xs uppercase tracking-wider">Net Pay</th>
                      <th className="text-right py-3 px-3 font-semibold text-rose-700 text-xs uppercase tracking-wider">Employer Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollSummary.breakdown.map((row, i) => (
                      <tr key={row.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${getGradient(row.name)} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                              {row.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{row.name}</p>
                              <p className="text-[10px] text-slate-500">{row.jobTitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600">{row.department}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-900">{format(row.monthlySalary)}</td>
                        <td className="py-3 px-3 text-right text-amber-700 font-medium">{format(row.paye)}</td>
                        <td className="py-3 px-3 text-right text-indigo-700 font-medium">{format(row.employeeNI)}</td>
                        <td className="py-3 px-3 text-right text-teal-700 font-medium">{format(row.pensionEmployee)}</td>
                        <td className="py-3 px-3 text-right text-red-600 font-medium">{format(row.totalDeductions)}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">{format(row.netPay)}</td>
                        <td className="py-3 px-3 text-right font-bold text-rose-700">{format(row.totalEmployerCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                      <td className="py-3 px-3 text-slate-900">Totals</td>
                      <td className="py-3 px-3"></td>
                      <td className="py-3 px-3 text-right text-slate-900">{format(payrollSummary.monthlyGrossTotal)}</td>
                      <td className="py-3 px-3 text-right text-amber-700">{format(payrollSummary.totalPAYE)}</td>
                      <td className="py-3 px-3 text-right text-indigo-700">{format(payrollSummary.totalEmployeeNI)}</td>
                      <td className="py-3 px-3 text-right text-teal-700">{format(payrollSummary.totalPensionEmployee)}</td>
                      <td className="py-3 px-3 text-right text-red-600">{format(payrollSummary.totalPAYE + payrollSummary.totalEmployeeNI + payrollSummary.totalPensionEmployee)}</td>
                      <td className="py-3 px-3 text-right text-emerald-700">{format(payrollSummary.totalMonthlyNetPay)}</td>
                      <td className="py-3 px-3 text-right text-rose-700">{format(payrollSummary.totalMonthlyEmployerCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionCard>

            {/* Payroll deductions visual */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard title="Deductions Breakdown" subtitle="Monthly summary" icon={<BadgePercent className="h-4 w-4" />}>
                <div className="space-y-4">
                  {[
                    { label: "PAYE (Income Tax)", value: payrollSummary.totalPAYE, total: payrollSummary.monthlyGrossTotal, color: "bg-amber-500" },
                    { label: "Employee NI", value: payrollSummary.totalEmployeeNI, total: payrollSummary.monthlyGrossTotal, color: "bg-indigo-500" },
                    { label: "Employee Pension (5%)", value: payrollSummary.totalPensionEmployee, total: payrollSummary.monthlyGrossTotal, color: "bg-teal-500" },
                    { label: "Employer NI (13.8%)", value: payrollSummary.totalEmployerNI, total: payrollSummary.monthlyGrossTotal, color: "bg-red-500" },
                    { label: "Employer Pension (3%)", value: payrollSummary.totalPensionEmployer, total: payrollSummary.monthlyGrossTotal, color: "bg-cyan-500" },
                  ].map((item) => {
                    const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700">{item.label}</span>
                          <span className="text-xs font-bold text-slate-900">{format(item.value)} <span className="text-slate-400">({pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard title="Salary Distribution" subtitle="By department" icon={<Building2 className="h-4 w-4" />}>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={departmentData} dataKey="totalSalary" cx="50%" cy="50%" innerRadius={45} outerRadius={90} paddingAngle={3} strokeWidth={0}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {departmentData.map((_, i) => (
                          <Cell key={i} fill={deptColors[i % deptColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...chartTooltipStyle} formatter={(value) => format(Number(value ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════
             TAB: TAX
             ═══════════════════════════════════════ */}
          <TabsContent value="tax" className="space-y-6 mt-0">
            {/* Tax KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="VAT Liability"
                value={format(taxSummary.vat)}
                subtitle={`${(UK_TAX.vatStandardRate * 100).toFixed(0)}% standard rate`}
                icon={<BadgePercent className="h-5 w-5 text-white" />}
                gradient="from-blue-600 to-blue-700"
                iconBg="bg-blue-500/80"
              />
              <StatCard
                label="Corporation Tax"
                value={format(taxSummary.corporationTax)}
                subtitle={`${(taxSummary.corporationTaxRate * 100).toFixed(0)}% rate`}
                icon={<Building2 className="h-5 w-5 text-white" />}
                gradient="from-violet-600 to-violet-700"
                iconBg="bg-violet-500/80"
              />
              <StatCard
                label="PAYE Collected"
                value={format(taxSummary.paye)}
                subtitle="Annual income tax"
                icon={<Calculator className="h-5 w-5 text-white" />}
                gradient="from-amber-500 to-amber-600"
                iconBg="bg-amber-400/80"
              />
              <StatCard
                label="NI Contributions"
                value={format(taxSummary.nationalInsurance)}
                subtitle="Employee + Employer"
                icon={<Shield className="h-5 w-5 text-white" />}
                gradient="from-rose-500 to-rose-600"
                iconBg="bg-rose-400/80"
              />
            </div>

            {/* Tax details cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* VAT Breakdown */}
              <SectionCard title="VAT Summary" subtitle="Value Added Tax" icon={<BadgePercent className="h-4 w-4" />}>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">Output VAT (on E-commerce Sales)</span>
                      <span className="text-lg font-bold text-blue-700">{format(taxSummary.vat)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>E-commerce Revenue: {format(ecomRevenue.total)}</span>
                      <span>Rate: {(UK_TAX.vatStandardRate * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-xs font-medium text-slate-700">Standard Rate (20%)</span>
                      </div>
                      <span className="text-xs text-slate-500">Most goods & services</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium text-slate-700">Reduced Rate (5%)</span>
                      </div>
                      <span className="text-xs text-slate-500">Energy, children seats</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        <span className="text-xs font-medium text-slate-700">Zero Rate (0%)</span>
                      </div>
                      <span className="text-xs text-slate-500">Food, books, children clothes</span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Corporation Tax */}
              <SectionCard title="Corporation Tax" subtitle="Annual estimate" icon={<Landmark className="h-4 w-4" />}>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">Taxable Profit</span>
                      <span className="text-lg font-bold text-violet-700">{format(Math.max(0, grossProfit))}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3 text-xs text-slate-500">
                      <span>Revenue: {format(totalRevenue)}</span>
                      <span>Expenses: {format(totalExpenses)}</span>
                    </div>
                    <div className="h-px bg-violet-200 my-3" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Tax Due</span>
                      <span className="text-xl font-bold text-violet-800">{format(taxSummary.corporationTax)}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Rate: {(taxSummary.corporationTaxRate * 100).toFixed(0)}% {grossProfit > UK_TAX.corporationTaxThreshold ? "(main rate)" : "(small profits rate)"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs font-medium text-slate-700">Small Profits Rate (&le; £250k)</span>
                      <span className="text-xs font-bold text-slate-900">19%</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs font-medium text-slate-700">Main Rate (&gt; £250k)</span>
                      <span className="text-xs font-bold text-slate-900">25%</span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* PAYE / NI Detail */}
            <SectionCard title="PAYE & National Insurance" subtitle="Tax bands & contributions" icon={<Scale className="h-4 w-4" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PAYE Bands */}
                <div>
                  <h5 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-amber-600" /> Income Tax Bands
                  </h5>
                  <div className="space-y-2">
                    {[
                      { band: "Personal Allowance", range: `Up to ${format(UK_TAX.personalAllowance)}`, rate: "0%" },
                      { band: "Basic Rate", range: `${format(UK_TAX.personalAllowance + 1)} – ${format(UK_TAX.basicRateLimit)}`, rate: "20%" },
                      { band: "Higher Rate", range: `${format(UK_TAX.basicRateLimit + 1)} – ${format(UK_TAX.higherRateLimit)}`, rate: "40%" },
                      { band: "Additional Rate", range: `Over ${format(UK_TAX.higherRateLimit)}`, rate: "45%" },
                    ].map((row) => (
                      <div key={row.band} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-slate-800">{row.band}</p>
                          <p className="text-[10px] text-slate-500">{row.range}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs font-bold">{row.rate}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                {/* NI Bands */}
                <div>
                  <h5 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-rose-600" /> National Insurance
                  </h5>
                  <div className="space-y-2">
                    {[
                      { band: "Employee NI (Class 1)", range: `${format(UK_TAX.niThreshold)} – ${format(UK_TAX.niUpperLimit)}`, rate: "8%" },
                      { band: "Employee NI (Upper)", range: `Over ${format(UK_TAX.niUpperLimit)}`, rate: "2%" },
                      { band: "Employer NI (Class 1)", range: `Over ${format(UK_TAX.employerNiThreshold)}`, rate: "13.8%" },
                    ].map((row) => (
                      <div key={row.band} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-slate-800">{row.band}</p>
                          <p className="text-[10px] text-slate-500">{row.range}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs font-bold">{row.rate}</Badge>
                      </div>
                    ))}
                  </div>
                  <h5 className="text-sm font-semibold text-slate-800 mb-3 mt-5 flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-teal-600" /> Auto-Enrolment Pension
                  </h5>
                  <div className="space-y-2">
                    {[
                      { band: "Employee Contribution", range: "Minimum", rate: "5%" },
                      { band: "Employer Contribution", range: "Minimum", rate: "3%" },
                    ].map((row) => (
                      <div key={row.band} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-slate-800">{row.band}</p>
                          <p className="text-[10px] text-slate-500">{row.range}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs font-bold">{row.rate}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ═══════════════════════════════════════
             TAB: REPORTS
             ═══════════════════════════════════════ */}
          <TabsContent value="reports" className="space-y-6 mt-0">
            {/* Download Annual Report Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
              <div>
                <h3 className="text-lg font-bold">Annual Financial Report</h3>
                <p className="text-sm text-slate-300 mt-0.5">Download a comprehensive report including P&L, Balance Sheet, Cash Flow & Payroll Summary for FY {yearFilter}</p>
              </div>
              <Button
                onClick={() => {
                  const netProfitAfterTax = grossProfit - taxSummary.corporationTax;
                  const retainedEarnings = netProfitAfterTax;
                  const totalCurrentAssets = totalRevenue * 0.35;
                  const tradeReceivables = dealRevenue.total * 0.15;
                  const cashAtBank = totalCurrentAssets - tradeReceivables;
                  const fixedAssets = totalExpenses * 0.5;
                  const totalAssets = fixedAssets + totalCurrentAssets;
                  const tradePayables = totalExpenses * 0.08;
                  const taxPayable = taxSummary.corporationTax + taxSummary.vat;
                  const totalCurrentLiabilities = tradePayables + taxPayable;
                  const totalLiabilities = totalCurrentLiabilities;
                  const equity = totalAssets - totalLiabilities;

                  const lines: string[] = [];
                  const hr = "─".repeat(70);
                  const dhr = "═".repeat(70);
                  const pad = (label: string, val: string, indent = 0) => {
                    const prefix = " ".repeat(indent);
                    const gap = 60 - label.length - indent;
                    return `${prefix}${label}${" ".repeat(Math.max(2, gap))}${val}`;
                  };

                  lines.push(dhr);
                  lines.push("                    ANNUAL FINANCIAL REPORT");
                  lines.push(`                    Financial Year ${yearFilter}`);
                  lines.push(`                    Generated: ${dayjs().format("DD MMMM YYYY HH:mm")}`);
                  lines.push(dhr);
                  lines.push("");

                  // P&L
                  lines.push("┌" + "─".repeat(68) + "┐");
                  lines.push("│  PROFIT & LOSS STATEMENT" + " ".repeat(43) + "│");
                  lines.push("└" + "─".repeat(68) + "┘");
                  lines.push("");
                  lines.push("  REVENUE");
                  lines.push(pad("Deal Revenue", format(dealRevenue.total), 4));
                  lines.push(pad("E-commerce Revenue", format(ecomRevenue.total), 4));
                  lines.push(hr);
                  lines.push(pad("TOTAL REVENUE", format(totalRevenue), 2));
                  lines.push("");
                  lines.push("  OPERATING EXPENSES");
                  lines.push(pad("Gross Salaries", format(payrollSummary.annualGrossTotal), 4));
                  lines.push(pad("Employer National Insurance", format(payrollSummary.totalEmployerNI * 12), 4));
                  lines.push(pad("Employer Pension Contributions", format(payrollSummary.totalPensionEmployer * 12), 4));
                  lines.push(hr);
                  lines.push(pad("TOTAL OPERATING EXPENSES", format(totalExpenses), 2));
                  lines.push("");
                  lines.push(pad("OPERATING PROFIT (EBIT)", format(grossProfit), 2));
                  lines.push("");
                  lines.push("  TAXATION");
                  lines.push(pad(`Corporation Tax (${(taxSummary.corporationTaxRate * 100).toFixed(0)}%)`, format(taxSummary.corporationTax), 4));
                  lines.push(pad("VAT Liability", format(taxSummary.vat), 4));
                  lines.push(hr);
                  lines.push(pad("NET PROFIT AFTER TAX", format(netProfitAfterTax), 2));
                  lines.push(pad("Profit Margin", `${profitMargin}%`, 2));
                  lines.push("");
                  lines.push("");

                  // Balance Sheet
                  lines.push("┌" + "─".repeat(68) + "┐");
                  lines.push("│  BALANCE SHEET (Statement of Financial Position)" + " ".repeat(19) + "│");
                  lines.push("└" + "─".repeat(68) + "┘");
                  lines.push("");
                  lines.push("  NON-CURRENT ASSETS");
                  lines.push(pad("Property, Plant & Equipment", format(fixedAssets * 0.6), 4));
                  lines.push(pad("Intangible Assets (Software/IP)", format(fixedAssets * 0.3), 4));
                  lines.push(pad("Other Non-Current Assets", format(fixedAssets * 0.1), 4));
                  lines.push(hr);
                  lines.push(pad("Total Non-Current Assets", format(fixedAssets), 2));
                  lines.push("");
                  lines.push("  CURRENT ASSETS");
                  lines.push(pad("Trade Receivables", format(tradeReceivables), 4));
                  lines.push(pad("Cash at Bank", format(cashAtBank), 4));
                  lines.push(hr);
                  lines.push(pad("Total Current Assets", format(totalCurrentAssets), 2));
                  lines.push("");
                  lines.push(pad("TOTAL ASSETS", format(totalAssets), 2));
                  lines.push("");
                  lines.push("  CURRENT LIABILITIES");
                  lines.push(pad("Trade Payables", format(tradePayables), 4));
                  lines.push(pad("Tax Payable (Corp Tax + VAT)", format(taxPayable), 4));
                  lines.push(hr);
                  lines.push(pad("Total Current Liabilities", format(totalCurrentLiabilities), 2));
                  lines.push("");
                  lines.push(pad("NET ASSETS", format(equity), 2));
                  lines.push("");
                  lines.push("  EQUITY");
                  lines.push(pad("Retained Earnings", format(retainedEarnings), 4));
                  lines.push(pad("Share Capital / Owner Equity", format(equity - retainedEarnings), 4));
                  lines.push(hr);
                  lines.push(pad("TOTAL EQUITY", format(equity), 2));
                  lines.push("");
                  lines.push("");

                  // Cash Flow
                  lines.push("┌" + "─".repeat(68) + "┐");
                  lines.push("│  CASH FLOW STATEMENT" + " ".repeat(47) + "│");
                  lines.push("└" + "─".repeat(68) + "┘");
                  lines.push("");
                  lines.push("  OPERATING ACTIVITIES");
                  lines.push(pad("Net Profit After Tax", format(netProfitAfterTax), 4));
                  lines.push(pad("Trade Receivables Movement", format(-tradeReceivables), 4));
                  lines.push(pad("Trade Payables Movement", format(tradePayables), 4));
                  lines.push(hr);
                  const operatingCashFlow = netProfitAfterTax - tradeReceivables + tradePayables;
                  lines.push(pad("Net Cash from Operating Activities", format(operatingCashFlow), 2));
                  lines.push("");
                  lines.push("  INVESTING ACTIVITIES");
                  lines.push(pad("Capital Expenditure", format(-fixedAssets * 0.2), 4));
                  lines.push(hr);
                  const investingCashFlow = -fixedAssets * 0.2;
                  lines.push(pad("Net Cash from Investing Activities", format(investingCashFlow), 2));
                  lines.push("");
                  lines.push("  FINANCING ACTIVITIES");
                  lines.push(pad("Dividends Paid", format(0), 4));
                  lines.push(hr);
                  lines.push(pad("Net Cash from Financing Activities", format(0), 2));
                  lines.push("");
                  lines.push(pad("NET CHANGE IN CASH", format(operatingCashFlow + investingCashFlow), 2));
                  lines.push("");
                  lines.push("");

                  // Payroll Summary
                  lines.push("┌" + "─".repeat(68) + "┐");
                  lines.push("│  PAYROLL SUMMARY" + " ".repeat(51) + "│");
                  lines.push("└" + "─".repeat(68) + "┘");
                  lines.push("");
                  lines.push(pad("Headcount", String(payrollSummary.headcount), 2));
                  lines.push(pad("Annual Gross Salaries", format(payrollSummary.annualGrossTotal), 2));
                  lines.push(pad("Monthly Gross Total", format(payrollSummary.monthlyGrossTotal), 2));
                  lines.push(pad("Monthly PAYE Collected", format(payrollSummary.totalPAYE), 2));
                  lines.push(pad("Monthly Employee NI", format(payrollSummary.totalEmployeeNI), 2));
                  lines.push(pad("Monthly Employer NI", format(payrollSummary.totalEmployerNI), 2));
                  lines.push(pad("Monthly Employee Pension (5%)", format(payrollSummary.totalPensionEmployee), 2));
                  lines.push(pad("Monthly Employer Pension (3%)", format(payrollSummary.totalPensionEmployer), 2));
                  lines.push(pad("Monthly Net Pay (Total)", format(payrollSummary.totalMonthlyNetPay), 2));
                  lines.push(pad("Monthly Total Employer Cost", format(payrollSummary.totalMonthlyEmployerCost), 2));
                  lines.push("");
                  lines.push(hr);
                  lines.push("");

                  // Monthly Breakdown
                  lines.push("┌" + "─".repeat(68) + "┐");
                  lines.push("│  MONTHLY REVENUE & EXPENSE BREAKDOWN" + " ".repeat(30) + "│");
                  lines.push("└" + "─".repeat(68) + "┘");
                  lines.push("");
                  lines.push(`  ${"Month".padEnd(8)}${"Deals".padStart(14)}${"E-com".padStart(14)}${"Expenses".padStart(14)}${"Profit".padStart(14)}`);
                  lines.push("  " + "─".repeat(64));
                  monthlyBreakdown.forEach((m) => {
                    lines.push(`  ${m.month.padEnd(8)}${format(m.dealRevenue).padStart(14)}${format(m.ecomRevenue).padStart(14)}${format(m.expenses).padStart(14)}${format(m.profit).padStart(14)}`);
                  });
                  lines.push("");
                  lines.push(dhr);
                  lines.push("  End of Annual Financial Report");
                  lines.push(dhr);

                  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Annual_Financial_Report_FY${yearFilter}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="bg-white text-slate-900 hover:bg-slate-100 font-semibold gap-2 shrink-0"
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            </div>

            {/* P&L Statement */}
            <SectionCard title="Profit & Loss Statement" subtitle={`Financial Year ${yearFilter}`} icon={<FileText className="h-4 w-4" />}>
              <div className="max-w-2xl mx-auto">
                {/* Revenue Section */}
                <div className="mb-6">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Revenue</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-slate-700">Deal Revenue</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{format(dealRevenue.total)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-violet-50/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-violet-600" />
                        <span className="text-sm text-slate-700">E-commerce Revenue</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{format(ecomRevenue.total)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <span className="text-sm font-bold text-emerald-800">Total Revenue</span>
                      <span className="text-lg font-bold text-emerald-800">{format(totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* Cost of Sales */}
                <div className="mb-6">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cost of Sales / Operating Expenses</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-600" />
                        <span className="text-sm text-slate-700">Gross Salaries</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{format(payrollSummary.annualGrossTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-slate-600" />
                        <span className="text-sm text-slate-700">Employer NI</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{format(payrollSummary.totalEmployerNI * 12)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-slate-600" />
                        <span className="text-sm text-slate-700">Employer Pension</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{format(payrollSummary.totalPensionEmployer * 12)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-rose-50 rounded-lg border border-rose-200">
                      <span className="text-sm font-bold text-rose-800">Total Operating Expenses</span>
                      <span className="text-lg font-bold text-rose-800">{format(totalExpenses)}</span>
                    </div>
                  </div>
                </div>

                {/* Operating Profit */}
                <div className="mb-6">
                  <div className={`flex justify-between items-center p-4 rounded-xl border-2 ${grossProfit >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
                    <div className="flex items-center gap-2">
                      {grossProfit >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-700" /> : <TrendingDown className="h-5 w-5 text-red-700" />}
                      <span className={`text-base font-bold ${grossProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>Operating Profit (EBIT)</span>
                    </div>
                    <span className={`text-xl font-bold ${grossProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>{format(grossProfit)}</span>
                  </div>
                </div>

                {/* Tax */}
                <div className="mb-6">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tax</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">Corporation Tax ({(taxSummary.corporationTaxRate * 100).toFixed(0)}%)</span>
                      <span className="text-sm font-semibold text-slate-900">{format(taxSummary.corporationTax)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">VAT Liability</span>
                      <span className="text-sm font-semibold text-slate-900">{format(taxSummary.vat)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Profit After Tax */}
                <div>
                  <div className={`flex justify-between items-center p-4 rounded-xl border-2 ${grossProfit - taxSummary.corporationTax >= 0 ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400" : "bg-gradient-to-r from-red-50 to-rose-50 border-red-400"}`}>
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-slate-700" />
                      <span className="text-base font-bold text-slate-800">Net Profit After Tax</span>
                    </div>
                    <span className={`text-xl font-bold ${grossProfit - taxSummary.corporationTax >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                      {format(grossProfit - taxSummary.corporationTax)}
                    </span>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ═══════ BALANCE SHEET ═══════ */}
            <SectionCard title="Balance Sheet" subtitle={`Statement of Financial Position — FY ${yearFilter}`} icon={<Scale className="h-4 w-4" />}>
              {(() => {
                const netProfitAfterTax = grossProfit - taxSummary.corporationTax;
                const retainedEarnings = netProfitAfterTax;
                // Estimated balance sheet from CRM data
                const totalCurrentAssets = totalRevenue * 0.35;
                const tradeReceivables = dealRevenue.total * 0.15;
                const cashAtBank = totalCurrentAssets - tradeReceivables;
                const fixedAssets = totalExpenses * 0.5;
                const ppAndE = fixedAssets * 0.6;
                const intangibles = fixedAssets * 0.3;
                const otherNonCurrent = fixedAssets * 0.1;
                const totalAssets = fixedAssets + totalCurrentAssets;
                const tradePayables = totalExpenses * 0.08;
                const taxPayable = taxSummary.corporationTax + taxSummary.vat;
                const totalCurrentLiabilities = tradePayables + taxPayable;
                const netAssets = totalAssets - totalCurrentLiabilities;
                const shareCapital = netAssets - retainedEarnings;

                return (
                  <div className="max-w-2xl mx-auto">
                    <p className="text-xs text-slate-400 mb-4 italic">* Estimated from CRM transaction data. Actual figures may differ from audited accounts.</p>

                    {/* Non-Current Assets */}
                    <div className="mb-6">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Non-Current Assets</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Property, Plant & Equipment</span>
                          <span className="text-sm font-semibold text-slate-900">{format(ppAndE)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Intangible Assets (Software / IP)</span>
                          <span className="text-sm font-semibold text-slate-900">{format(intangibles)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Other Non-Current Assets</span>
                          <span className="text-sm font-semibold text-slate-900">{format(otherNonCurrent)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-sm font-bold text-blue-800">Total Non-Current Assets</span>
                          <span className="text-lg font-bold text-blue-800">{format(fixedAssets)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Current Assets */}
                    <div className="mb-6">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Current Assets</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-slate-700">Trade Receivables</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{format(tradeReceivables)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm text-slate-700">Cash at Bank</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{format(cashAtBank)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <span className="text-sm font-bold text-emerald-800">Total Current Assets</span>
                          <span className="text-lg font-bold text-emerald-800">{format(totalCurrentAssets)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Assets */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center p-4 rounded-xl border-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300">
                        <span className="text-base font-bold text-blue-900">TOTAL ASSETS</span>
                        <span className="text-xl font-bold text-blue-900">{format(totalAssets)}</span>
                      </div>
                    </div>

                    {/* Current Liabilities */}
                    <div className="mb-6">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Current Liabilities</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Trade Payables</span>
                          <span className="text-sm font-semibold text-slate-900">{format(tradePayables)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Tax Payable (Corp Tax + VAT)</span>
                          <span className="text-sm font-semibold text-slate-900">{format(taxPayable)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-rose-50 rounded-lg border border-rose-200">
                          <span className="text-sm font-bold text-rose-800">Total Current Liabilities</span>
                          <span className="text-lg font-bold text-rose-800">{format(totalCurrentLiabilities)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Assets */}
                    <div className="mb-6">
                      <div className={`flex justify-between items-center p-4 rounded-xl border-2 ${netAssets >= 0 ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400" : "bg-gradient-to-r from-red-50 to-rose-50 border-red-400"}`}>
                        <span className={`text-base font-bold ${netAssets >= 0 ? "text-emerald-900" : "text-red-900"}`}>NET ASSETS</span>
                        <span className={`text-xl font-bold ${netAssets >= 0 ? "text-emerald-900" : "text-red-900"}`}>{format(netAssets)}</span>
                      </div>
                    </div>

                    {/* Equity */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Equity</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Retained Earnings</span>
                          <span className="text-sm font-semibold text-slate-900">{format(retainedEarnings)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Share Capital / Owner&apos;s Equity</span>
                          <span className="text-sm font-semibold text-slate-900">{format(shareCapital)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                          <span className="text-sm font-bold text-indigo-800">Total Equity</span>
                          <span className="text-lg font-bold text-indigo-800">{format(netAssets)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </SectionCard>

            {/* ═══════ CASH FLOW STATEMENT ═══════ */}
            <SectionCard title="Cash Flow Statement" subtitle={`Financial Year ${yearFilter}`} icon={<CreditCard className="h-4 w-4" />}>
              {(() => {
                const netProfitAfterTax = grossProfit - taxSummary.corporationTax;
                const tradeReceivables = dealRevenue.total * 0.15;
                const tradePayables = totalExpenses * 0.08;
                const depreciation = totalExpenses * 0.5 * 0.1; // 10% depreciation on estimated fixed assets
                const operatingCashFlow = netProfitAfterTax + depreciation - tradeReceivables + tradePayables;
                const capex = -(totalExpenses * 0.5 * 0.2);
                const investingCashFlow = capex;
                const netChangeInCash = operatingCashFlow + investingCashFlow;

                return (
                  <div className="max-w-2xl mx-auto">
                    <p className="text-xs text-slate-400 mb-4 italic">* Using the indirect method. Estimated from CRM data.</p>

                    {/* Operating Activities */}
                    <div className="mb-6">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cash Flows from Operating Activities</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Net Profit After Tax</span>
                          <span className="text-sm font-semibold text-slate-900">{format(netProfitAfterTax)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700 italic">Add back: Depreciation & Amortisation</span>
                          <span className="text-sm font-semibold text-slate-900">{format(depreciation)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700 italic">Working Capital: Trade Receivables</span>
                          <span className="text-sm font-semibold text-red-600">({format(tradeReceivables)})</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700 italic">Working Capital: Trade Payables</span>
                          <span className="text-sm font-semibold text-emerald-600">{format(tradePayables)}</span>
                        </div>
                        <div className={`flex justify-between items-center p-3 rounded-lg border ${operatingCashFlow >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                          <span className={`text-sm font-bold ${operatingCashFlow >= 0 ? "text-emerald-800" : "text-red-800"}`}>Net Cash from Operating Activities</span>
                          <span className={`text-lg font-bold ${operatingCashFlow >= 0 ? "text-emerald-800" : "text-red-800"}`}>{format(operatingCashFlow)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Investing Activities */}
                    <div className="mb-6">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cash Flows from Investing Activities</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Capital Expenditure (PP&E)</span>
                          <span className="text-sm font-semibold text-red-600">({format(Math.abs(capex))})</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <span className="text-sm font-bold text-amber-800">Net Cash from Investing Activities</span>
                          <span className="text-lg font-bold text-amber-800">{format(investingCashFlow)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financing Activities */}
                    <div className="mb-6">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cash Flows from Financing Activities</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Dividends Paid</span>
                          <span className="text-sm font-semibold text-slate-500">{format(0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">New Borrowings / Repayments</span>
                          <span className="text-sm font-semibold text-slate-500">{format(0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-violet-50 rounded-lg border border-violet-200">
                          <span className="text-sm font-bold text-violet-800">Net Cash from Financing Activities</span>
                          <span className="text-lg font-bold text-violet-800">{format(0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Change */}
                    <div>
                      <div className={`flex justify-between items-center p-4 rounded-xl border-2 ${netChangeInCash >= 0 ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400" : "bg-gradient-to-r from-red-50 to-rose-50 border-red-400"}`}>
                        <div className="flex items-center gap-2">
                          {netChangeInCash >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-700" /> : <TrendingDown className="h-5 w-5 text-red-700" />}
                          <span className="text-base font-bold text-slate-800">Net Change in Cash & Equivalents</span>
                        </div>
                        <span className={`text-xl font-bold ${netChangeInCash >= 0 ? "text-emerald-800" : "text-red-800"}`}>{format(netChangeInCash)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </SectionCard>

            {/* Financial Ratios / KPIs */}
            <SectionCard title="Financial KPIs" subtitle="Key performance indicators" icon={<Target className="h-4 w-4" />}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Profit Margin",
                    value: `${profitMargin}%`,
                    desc: "Net profit / revenue",
                    color: profitMargin >= 20 ? "text-emerald-700 bg-emerald-50" : profitMargin >= 0 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50",
                  },
                  {
                    label: "Revenue per Head",
                    value: payrollSummary.headcount > 0 ? formatCompact(totalRevenue / payrollSummary.headcount) : "N/A",
                    desc: "Total revenue / headcount",
                    color: "text-blue-700 bg-blue-50",
                  },
                  {
                    label: "Avg. Deal Size",
                    value: dealRevenue.count > 0 ? format(dealRevenue.total / dealRevenue.count) : "N/A",
                    desc: "Won deals value / count",
                    color: "text-indigo-700 bg-indigo-50",
                  },
                  {
                    label: "Avg. Order Value",
                    value: ecomRevenue.count > 0 ? format(ecomRevenue.total / ecomRevenue.count) : "N/A",
                    desc: "Delivered order avg",
                    color: "text-violet-700 bg-violet-50",
                  },
                  {
                    label: "Payroll Ratio",
                    value: totalRevenue > 0 ? `${Math.round((totalExpenses / totalRevenue) * 100)}%` : "N/A",
                    desc: "Payroll cost / revenue",
                    color: "text-rose-700 bg-rose-50",
                  },
                  {
                    label: "Current Ratio",
                    value: (() => {
                      const currentAssets = totalRevenue * 0.35;
                      const currentLiabilities = totalExpenses * 0.08 + taxSummary.corporationTax + taxSummary.vat;
                      return currentLiabilities > 0 ? `${(currentAssets / currentLiabilities).toFixed(2)}x` : "N/A";
                    })(),
                    desc: "Current assets / liabilities",
                    color: "text-teal-700 bg-teal-50",
                  },
                  {
                    label: "Effective Tax Rate",
                    value: grossProfit > 0 ? `${Math.round(((taxSummary.corporationTax + taxSummary.vat) / grossProfit) * 100)}%` : "N/A",
                    desc: "Total tax / profit",
                    color: "text-amber-700 bg-amber-50",
                  },
                  {
                    label: "Deals Pipeline",
                    value: formatCompact(deals.filter((d) => !["Won", "Lost"].includes(d.status)).reduce((s, d) => s + (d.value || 0), 0)),
                    desc: "Active deal value",
                    color: "text-blue-700 bg-blue-50",
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className={`p-4 rounded-xl ${kpi.color}`}>
                    <p className="text-2xl font-bold mb-1">{kpi.value}</p>
                    <p className="text-xs font-semibold">{kpi.label}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{kpi.desc}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Cumulative Revenue Chart */}
            <SectionCard title="Cumulative Revenue" subtitle="Year-to-date trend" icon={<TrendingUp className="h-4 w-4" />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyBreakdown.reduce((acc: any[], item, i) => {
                    const prev = acc[i - 1] || { cumRevenue: 0, cumProfit: 0 };
                    acc.push({
                      month: item.month,
                      cumRevenue: prev.cumRevenue + item.income,
                      cumProfit: prev.cumProfit + item.profit,
                    });
                    return acc;
                  }, [])}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
                    <YAxis fontSize={12} stroke="#94a3b8" tickFormatter={(v) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip {...chartTooltipStyle} formatter={(value) => format(Number(value ?? 0))} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <defs>
                      <linearGradient id="cumRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="cumProfitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="cumRevenue" name="Cumulative Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#cumRevGrad)" />
                    <Area type="monotone" dataKey="cumProfit" name="Cumulative Profit" stroke="#10b981" strokeWidth={2} fill="url(#cumProfitGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </TabsContent>

        </Tabs>

        {/* ═══════ Record Transaction Dialog ═══════ */}
        <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
          <DialogContent className="sm:max-w-lg" showCloseButton>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-slate-600" />
                Record Transaction
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Type</Label>
                  <Select value={txForm.type} onValueChange={(v) => setTxForm((f) => ({ ...f, type: v as "income" | "expense" }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Category</Label>
                  <Select value={txForm.category} onValueChange={(v) => setTxForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Deal Revenue", "E-commerce Revenue", "Salary", "Tax Payment", "Office Supplies", "Software & Tools", "Marketing", "Utilities", "Travel", "Insurance", "Legal", "Rent", "Equipment", "Consulting", "Refund", "Other"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Source</Label>
                  <Select value={txForm.source} onValueChange={(v) => setTxForm((f) => ({ ...f, source: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deals">Deals</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="payroll">Payroll</SelectItem>
                      <SelectItem value="tax">Tax</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Date</Label>
                  <Input type="date" className="h-9" value={txForm.date} onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description *</Label>
                <Input
                  className="h-9"
                  placeholder="e.g. Capital investment from founder"
                  value={txForm.description}
                  onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Amount ({symbol}) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-9"
                    placeholder="0.00"
                    value={txForm.amount}
                    onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Reference</Label>
                  <Input
                    className="h-9"
                    placeholder="Invoice # / Ref"
                    value={txForm.reference}
                    onChange={(e) => setTxForm((f) => ({ ...f, reference: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notes</Label>
                <Textarea
                  rows={2}
                  placeholder="Additional notes..."
                  value={txForm.notes}
                  onChange={(e) => setTxForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setTxDialogOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-slate-900 hover:bg-slate-800"
                onClick={handleCreateTransaction}
                disabled={createTxMutation.isPending || !txForm.description || !txForm.amount}
              >
                {createTxMutation.isPending ? "Saving..." : "Save Transaction"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════ Add Account Dialog ═══════ */}
        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <DialogContent className="sm:max-w-md" showCloseButton>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-600" />
                Add Financial Account
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Account Name *</Label>
                <Input
                  className="h-9"
                  placeholder="e.g. Business Current Account"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Account Type</Label>
                  <Select value={accountForm.type} onValueChange={(v) => setAccountForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank Account</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit">Credit Card</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Currency</Label>
                  <Select value={accountForm.currency} onValueChange={(v) => setAccountForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Opening Balance ({symbol})</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-9"
                  placeholder="0.00"
                  value={accountForm.balance}
                  onChange={(e) => setAccountForm((f) => ({ ...f, balance: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setAccountDialogOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-slate-900 hover:bg-slate-800"
                onClick={handleCreateAccount}
                disabled={createAccountMutation.isPending || !accountForm.name}
              >
                {createAccountMutation.isPending ? "Saving..." : "Add Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FinancePage;
