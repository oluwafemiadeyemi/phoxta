import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Dashboard and Reporting System
 * Provides custom report builders, dashboard widgets, and metrics
 */

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  type: 'chart' | 'metric' | 'table' | 'gauge' | 'timeline' | 'map';
  title: string;
  query_id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Dashboard {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  layout_config: Record<string, unknown>;
  refresh_interval: number;
  created_at: string;
  updated_at: string;
  widgets?: DashboardWidget[];
}

export interface CustomReport {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  entity_type: 'contacts' | 'companies' | 'deals' | 'tasks';
  report_type: 'summary' | 'detailed' | 'comparison' | 'forecast';
  filters: Record<string, unknown>;
  columns: string[];
  grouping?: string;
  sorting?: { column: string; direction: 'asc' | 'desc' }[];
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  entity_type: string;
  report_type: string;
  default_filters: Record<string, unknown>;
  default_columns: string[];
}

export interface DashboardMetric {
  label: string;
  value: number | string;
  change_percent?: number;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'currency' | 'percent';
}

/**
 * Dashboard Manager
 * Handle dashboard CRUD and widget management
 */
export class DashboardManager {
  static async createDashboard(
    userId: string,
    name: string,
    description?: string
  ): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      description,
      is_default: false,
      layout_config: { cols: 12, rowHeight: 60 },
      refresh_interval: 300, // 5 minutes
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from("dashboards")
      .insert([dashboard]);

    if (error) throw error;
    return dashboard;
  }

  static async getDashboards(userId: string): Promise<Dashboard[]> {
    const { data, error } = await supabaseClient
      .from("dashboards")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getDashboard(dashboardId: string): Promise<Dashboard | null> {
    const { data, error } = await supabaseClient
      .from("dashboards")
      .select("*, dashboard_widgets(*)")
      .eq("id", dashboardId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  }

  static async updateDashboard(
    dashboardId: string,
    updates: Partial<Dashboard>
  ): Promise<Dashboard> {
    const { data, error } = await supabaseClient
      .from("dashboards")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dashboardId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteDashboard(dashboardId: string): Promise<void> {
    const { error } = await supabaseClient
      .from("dashboards")
      .delete()
      .eq("id", dashboardId);

    if (error) throw error;
  }

  static async setDefaultDashboard(
    userId: string,
    dashboardId: string
  ): Promise<void> {
    // Clear current default
    await supabaseClient
      .from("dashboards")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);

    // Set new default
    const { error } = await supabaseClient
      .from("dashboards")
      .update({ is_default: true })
      .eq("id", dashboardId);

    if (error) throw error;
  }

  static async addWidget(
    dashboardId: string,
    widget: Omit<DashboardWidget, "created_at" | "updated_at">
  ): Promise<DashboardWidget> {
    const newWidget: DashboardWidget = {
      ...widget,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from("dashboard_widgets")
      .insert([newWidget]);

    if (error) throw error;
    return newWidget;
  }

  static async updateWidget(
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<DashboardWidget> {
    const { data, error } = await supabaseClient
      .from("dashboard_widgets")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", widgetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteWidget(widgetId: string): Promise<void> {
    const { error } = await supabaseClient
      .from("dashboard_widgets")
      .delete()
      .eq("id", widgetId);

    if (error) throw error;
  }
}

/**
 * Report Manager
 * Handle custom report CRUD and execution
 */
export class ReportManager {
  static async createReport(
    userId: string,
    report: Omit<CustomReport, "id" | "created_at" | "updated_at">
  ): Promise<CustomReport> {
    const newReport: CustomReport = {
      ...report,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from("custom_reports")
      .insert([newReport]);

    if (error) throw error;
    return newReport;
  }

  static async getReports(userId: string): Promise<CustomReport[]> {
    const { data, error } = await supabaseClient
      .from("custom_reports")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getReport(reportId: string): Promise<CustomReport | null> {
    const { data, error } = await supabaseClient
      .from("custom_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  }

  static async updateReport(
    reportId: string,
    updates: Partial<CustomReport>
  ): Promise<CustomReport> {
    const { data, error } = await supabaseClient
      .from("custom_reports")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabaseClient
      .from("custom_reports")
      .delete()
      .eq("id", reportId);

    if (error) throw error;
  }

  static async executeReport(
    reportId: string
  ): Promise<Record<string, unknown>[]> {
    const report = await this.getReport(reportId);
    if (!report) throw new Error("Report not found");

    // Execute RPC function to run report
    const { data, error } = await supabaseClient.rpc(
      "execute_custom_report",
      {
        p_report_id: reportId,
      }
    );

    if (error) throw error;
    return data || [];
  }

  static async exportReportToCSV(
    reportId: string
  ): Promise<Blob> {
    const data = await this.executeReport(reportId);
    if (data.length === 0) {
      return new Blob([], { type: "text/csv" });
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.map((h) => `"${h}"`).join(",");
    const csvRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return '""';
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csv = [csvHeaders, ...csvRows].join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8;" });
  }
}

/**
 * Metrics Calculator
 * Calculate key metrics for dashboards
 */
export class MetricsCalculator {
  static async getDealsMetrics(userId: string): Promise<DashboardMetric[]> {
    const { data, error } = await supabaseClient.rpc(
      "calculate_deals_metrics",
      { p_user_id: userId }
    );

    if (error) throw error;
    return data || [];
  }

  static async getContactsMetrics(userId: string): Promise<DashboardMetric[]> {
    const { data, error } = await supabaseClient.rpc(
      "calculate_contacts_metrics",
      { p_user_id: userId }
    );

    if (error) throw error;
    return data || [];
  }

  static async getTasksMetrics(userId: string): Promise<DashboardMetric[]> {
    const { data, error } = await supabaseClient.rpc(
      "calculate_tasks_metrics",
      { p_user_id: userId }
    );

    if (error) throw error;
    return data || [];
  }

  static async getTeamMetrics(userId: string): Promise<DashboardMetric[]> {
    const { data, error } = await supabaseClient.rpc(
      "calculate_team_metrics",
      { p_user_id: userId }
    );

    if (error) throw error;
    return data || [];
  }

  static calculateTrend(
    current: number,
    previous: number
  ): { change_percent: number; trend: "up" | "down" | "neutral" } {
    if (previous === 0) {
      return { change_percent: 0, trend: "neutral" };
    }

    const change_percent = ((current - previous) / previous) * 100;
    const trend = change_percent > 0 ? "up" : change_percent < 0 ? "down" : "neutral";

    return { change_percent, trend };
  }
}

/**
 * Report Templates
 * Pre-built report templates for common scenarios
 */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "deals_pipeline",
    name: "Sales Pipeline Summary",
    description: "Overview of all deals by stage with values",
    entity_type: "deals",
    report_type: "summary",
    default_filters: {},
    default_columns: ["title", "contact_id", "status", "value", "updated_at"],
  },
  {
    id: "deals_forecast",
    name: "Revenue Forecast",
    description: "Forecast revenue by month based on pipeline",
    entity_type: "deals",
    report_type: "forecast",
    default_filters: {},
    default_columns: ["title", "status", "value", "expected_close_date"],
  },
  {
    id: "contacts_activity",
    name: "Contact Activity Report",
    description: "Recent activities and interactions by contact",
    entity_type: "contacts",
    report_type: "detailed",
    default_filters: {},
    default_columns: ["name", "email", "phone", "company_id", "created_at"],
  },
  {
    id: "deals_won",
    name: "Won Deals Report",
    description: "Analysis of closed won deals",
    entity_type: "deals",
    report_type: "comparison",
    default_filters: { status: "won" },
    default_columns: ["title", "value", "closed_date", "contact_id"],
  },
  {
    id: "tasks_overdue",
    name: "Overdue Tasks",
    description: "All overdue tasks with assignees",
    entity_type: "tasks",
    report_type: "summary",
    default_filters: { status: "pending" },
    default_columns: ["title", "assigned_to", "due_date", "priority"],
  },
];
