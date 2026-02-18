import { useEffect, useState } from "react";
import { Card } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Download } from "lucide-react";
import { supabaseClient } from "@crm/lib/supabase";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminReports() {
  const [dateRange, setDateRange] = useState("30");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Load various metrics
      const [deals, contacts, users, tasks] = await Promise.all([
        supabaseClient
          .from("deals")
          .select("amount, status, created_at")
          .gte("created_at", startDate.toISOString()),
        supabaseClient
          .from("contacts")
          .select("id, created_at")
          .gte("created_at", startDate.toISOString()),
        supabaseClient
          .from("team_members")
          .select("id, status, created_at"),
        supabaseClient
          .from("tasks")
          .select("status, priority, created_at")
          .gte("created_at", startDate.toISOString()),
      ]);

      // Process data for charts
      const dealsByStatus = processDealsByStatus(deals.data || []);
      const tasksByPriority = processTasksByPriority(tasks.data || []);
      const revenueByMonth = processRevenueData(deals.data || []);

      setReportData({
        summary: {
          totalDeals: deals.data?.length || 0,
          totalRevenue: deals.data?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0,
          totalContacts: contacts.data?.length || 0,
          activeUsers: users.data?.filter((u: any) => u.status === "active").length || 0,
          totalTasks: tasks.data?.length || 0,
          completedTasks: tasks.data?.filter((t: any) => t.status === "completed").length || 0,
        },
        charts: {
          dealsByStatus,
          tasksByPriority,
          revenueByMonth,
        },
      });
    } catch (error) {
      console.error("Failed to load report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processDealsByStatus = (data: any[]) => {
    const status: Record<string, number> = {};

    data.forEach((deal) => {
      status[deal.status] = (status[deal.status] || 0) + 1;
    });

    return Object.entries(status).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  };

  const processTasksByPriority = (data: any[]) => {
    const priority: Record<string, number> = {};

    data.forEach((task) => {
      priority[task.priority] = (priority[task.priority] || 0) + 1;
    });

    return Object.entries(priority).map(([priority, count]) => ({
      name: priority,
      tasks: count,
    }));
  };

  const processRevenueData = (data: any[]) => {
    const monthly: Record<string, number> = {};

    data.forEach((deal) => {
      const month = new Date(deal.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      monthly[month] = (monthly[month] || 0) + (deal.amount || 0);
    });

    return Object.entries(monthly).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue),
    }));
  };

  const handleExportReport = () => {
    if (!reportData) return;

    const reportContent = `
CRM Analytics Report
Generated: ${new Date().toLocaleString()}
Date Range: Last ${dateRange} days

SUMMARY
--------
Total Deals: ${reportData.summary.totalDeals}
Total Revenue: $${reportData.summary.totalRevenue.toLocaleString()}
Total Contacts: ${reportData.summary.totalContacts}
Active Users: ${reportData.summary.activeUsers}
Total Tasks: ${reportData.summary.totalTasks}
Completed Tasks: ${reportData.summary.completedTasks}
Task Completion Rate: ${Math.round(
      (reportData.summary.completedTasks / reportData.summary.totalTasks) * 100
    )}%
PERFORMANCE METRICS
-------------------
Deals by Status:
${reportData.charts.dealsByStatus.map((d: any) => `  ${d.name}: ${d.value}`).join("\n")}

Tasks by Priority:
${reportData.charts.tasksByPriority.map((t: any) => `  ${t.name}: ${t.tasks}`).join("\n")}
    `;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-report-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full"></div>
          </div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-2">
            CRM performance metrics and business intelligence
          </p>
        </div>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExportReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${reportData.summary.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            from {reportData.summary.totalDeals} deals
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-gray-600">Active Deals</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {reportData.summary.totalDeals}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Average value: ${Math.round(
              reportData.summary.totalRevenue / (reportData.summary.totalDeals || 1)
            ).toLocaleString()}
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-gray-600">Total Contacts</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {reportData.summary.totalContacts}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {reportData.summary.activeUsers} active team members
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-gray-600">Task Completion</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {Math.round(
              (reportData.summary.completedTasks /
                (reportData.summary.totalTasks || 1)) *
                100
            )}
            %
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {reportData.summary.completedTasks} of{" "}
            {reportData.summary.totalTasks} tasks
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deals by Status */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deals by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.charts.dealsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.charts.dealsByStatus.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Tasks by Priority */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Priority</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.charts.tasksByPriority}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tasks" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue by Month */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.charts.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: any) => `$${(value ?? 0).toLocaleString()}`} />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Avg Deal Value</p>
            <p className="font-bold text-lg text-gray-900">
              ${Math.round(
                reportData.summary.totalRevenue /
                  (reportData.summary.totalDeals || 1)
              ).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Contact to Deal Ratio</p>
            <p className="font-bold text-lg text-gray-900">
              {(
                reportData.summary.totalDeals / (reportData.summary.totalContacts || 1)
              ).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Contacts per User</p>
            <p className="font-bold text-lg text-gray-900">
              {Math.round(
                reportData.summary.totalContacts /
                  (reportData.summary.activeUsers || 1)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
