import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Analytics & Advanced Reporting System
 * Track KPIs, metrics, and generate actionable insights
 */

export interface Metric {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  trend?: number; // percentage change
  comparison?: string; // e.g., "vs last month"
  format: "number" | "currency" | "percent" | "duration";
  color?: "up" | "down" | "neutral";
  timestamp: string;
}

export interface KPI {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  metric_key: string;
  target_value: number;
  current_value: number;
  unit: string;
  threshold_warning?: number;
  threshold_critical?: number;
  calculation_formula?: string;
  refresh_frequency: "hourly" | "daily" | "weekly" | "monthly";
  last_calculated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsReport {
  id: string;
  user_id: string;
  report_type: string; // sales, pipeline, team_performance, customer_health
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date: string;
  metrics: Metric[];
  insights: string[];
  recommendations: string[];
  generated_at: string;
}

export interface TrendAnalysis {
  metric: string;
  period: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend_direction: "up" | "down" | "neutral";
  velocity: number; // rate of change
  forecast_next_period?: number;
}

export interface CohortAnalysis {
  cohort_name: string;
  created_date: string;
  size: number;
  retention_rate: number;
  churn_rate: number;
  lifetime_value?: number;
  avg_deal_value?: number;
}

/**
 * KPI Manager
 * Define and track Key Performance Indicators
 */
export class KPIManager {
  static async createKPI(
    userId: string,
    name: string,
    metricKey: string,
    targetValue: number,
    unit: string,
    frequency: "hourly" | "daily" | "weekly" | "monthly" = "daily"
  ): Promise<KPI> {
    const kpi: KPI = {
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      metric_key: metricKey,
      target_value: targetValue,
      current_value: 0,
      unit,
      refresh_frequency: frequency,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from("kpis")
      .insert([kpi]);

    if (error) throw error;
    return kpi;
  }

  static async getKPIs(userId: string): Promise<KPI[]> {
    const { data, error } = await supabaseClient
      .from("kpis")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateKPIValue(kpiId: string, currentValue: number): Promise<KPI> {
    const { data, error } = await supabaseClient
      .from("kpis")
      .update({
        current_value: currentValue,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", kpiId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteKPI(kpiId: string): Promise<void> {
    const { error } = await supabaseClient
      .from("kpis")
      .delete()
      .eq("id", kpiId);

    if (error) throw error;
  }
}

/**
 * Analytics Engine
 * Calculate metrics and generate insights
 */
export class AnalyticsEngine {
  static async generateSalesMetrics(userId: string): Promise<Metric[]> {
    const { data, error } = await supabaseClient.rpc(
      "calculate_sales_metrics",
      { p_user_id: userId }
    );

    if (error) throw error;

    const metrics: Metric[] = [];
    if (data) {
      metrics.push({
        id: crypto.randomUUID(),
        name: "Total Pipeline Value",
        value: data.total_pipeline || 0,
        unit: "£",
        format: "currency",
        timestamp: new Date().toISOString(),
      });
      metrics.push({
        id: crypto.randomUUID(),
        name: "Conversion Rate",
        value: (data.conversion_rate || 0).toFixed(2),
        unit: "%",
        format: "percent",
        timestamp: new Date().toISOString(),
      });
      metrics.push({
        id: crypto.randomUUID(),
        name: "Average Deal Value",
        value: data.avg_deal_value || 0,
        unit: "£",
        format: "currency",
        timestamp: new Date().toISOString(),
      });
      metrics.push({
        id: crypto.randomUUID(),
        name: "Deals Won This Month",
        value: data.deals_won_month || 0,
        unit: "deals",
        format: "number",
        timestamp: new Date().toISOString(),
      });
    }

    return metrics;
  }

  static async generatePipelineMetrics(userId: string): Promise<Metric[]> {
    const { data, error } = await supabaseClient.rpc(
      "calculate_pipeline_metrics",
      { p_user_id: userId }
    );

    if (error) throw error;

    const metrics: Metric[] = [];
    if (data) {
      metrics.push({
        id: crypto.randomUUID(),
        name: "Pipeline Stages",
        value: data.stage_count || 0,
        unit: "stages",
        format: "number",
        timestamp: new Date().toISOString(),
      });
      metrics.push({
        id: crypto.randomUUID(),
        name: "Average Sales Cycle",
        value: (data.avg_cycle_days || 0).toFixed(1),
        unit: "days",
        format: "number",
        timestamp: new Date().toISOString(),
      });
      metrics.push({
        id: crypto.randomUUID(),
        name: "Stalled Deals",
        value: data.stalled_count || 0,
        unit: "deals",
        format: "number",
        timestamp: new Date().toISOString(),
      });
    }

    return metrics;
  }

  static async generateTeamMetrics(userId: string): Promise<Metric[]> {
    const { data, error } = await supabaseClient.rpc(
      "calculate_team_metrics",
      { p_user_id: userId }
    );

    if (error) throw error;

    const metrics: Metric[] = [];
    if (data) {
      metrics.push({
        id: crypto.randomUUID(),
        name: "Team Members",
        value: data.team_size || 0,
        unit: "members",
        format: "number",
        timestamp: new Date().toISOString(),
      });
      metrics.push({
        id: crypto.randomUUID(),
        name: "Team Activity",
        value: data.activity_count || 0,
        unit: "activities",
        format: "number",
        timestamp: new Date().toISOString(),
      });
      metrics.push({
        id: crypto.randomUUID(),
        name: "Avg Tasks Per User",
        value: (data.avg_tasks || 0).toFixed(1),
        unit: "tasks",
        format: "number",
        timestamp: new Date().toISOString(),
      });
    }

    return metrics;
  }
}

/**
 * Trend Analyzer
 * Analyze trends and forecast future values
 */
export class TrendAnalyzer {
  static async analyzeTrend(
    userId: string,
    metricKey: string,
    days: number = 30
  ): Promise<TrendAnalysis> {
    const { data, error } = await supabaseClient.rpc(
      "analyze_metric_trend",
      {
        p_user_id: userId,
        p_metric_key: metricKey,
        p_days: days,
      }
    );

    if (error) throw error;

    return {
      metric: metricKey,
      period: `Last ${days} days`,
      current_value: data?.current_value || 0,
      previous_value: data?.previous_value || 0,
      change_percentage: data?.change_percent || 0,
      trend_direction:
        (data?.change_percent || 0) > 0
          ? "up"
          : (data?.change_percent || 0) < 0
            ? "down"
            : "neutral",
      velocity: data?.velocity || 0,
      forecast_next_period: data?.forecast || 0,
    };
  }

  static calculateForecast(
    currentValue: number,
    velocity: number,
    periods: number = 1
  ): number {
    return currentValue + velocity * periods;
  }

  static calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}

/**
 * Cohort Analyzer
 * Analyze user cohorts and retention
 */
export class CohortAnalyzer {
  static async generateCohortAnalysis(userId: string): Promise<CohortAnalysis[]> {
    const { data, error } = await supabaseClient.rpc(
      "generate_cohort_analysis",
      { p_user_id: userId }
    );

    if (error) throw error;
    return data || [];
  }

  static async getRetentionCurve(userId: string): Promise<Record<string, number>> {
    const { data, error } = await supabaseClient.rpc(
      "get_retention_curve",
      { p_user_id: userId }
    );

    if (error) throw error;
    return data || {};
  }

  static calculateChurnRate(
    startCount: number,
    endCount: number,
    period: number = 30
  ): number {
    if (startCount === 0) return 0;
    return ((startCount - endCount) / startCount) * 100;
  }

  static calculateLifetimeValue(
    avgDealValue: number,
    dealFrequency: number,
    avgCustomerLifespan: number
  ): number {
    return avgDealValue * dealFrequency * avgCustomerLifespan;
  }
}

/**
 * Report Generator
 * Generate comprehensive analytics reports
 */
export class ReportGenerator {
  static async generateSalesReport(
    userId: string,
    period: "daily" | "weekly" | "monthly" = "monthly"
  ): Promise<AnalyticsReport> {
    const endDate = new Date();
    const startDate = this.getPeriodStart(endDate, period);

    const metrics = await AnalyticsEngine.generateSalesMetrics(userId);
    const insights = await this.generateSalesInsights(userId, metrics);

    return {
      id: crypto.randomUUID(),
      user_id: userId,
      report_type: "sales",
      period,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      metrics,
      insights,
      recommendations: this.generateRecommendations(insights),
      generated_at: new Date().toISOString(),
    };
  }

  static async generatePipelineReport(
    userId: string,
    period: "daily" | "weekly" | "monthly" = "monthly"
  ): Promise<AnalyticsReport> {
    const endDate = new Date();
    const startDate = this.getPeriodStart(endDate, period);

    const metrics = await AnalyticsEngine.generatePipelineMetrics(userId);
    const insights = await this.generatePipelineInsights(userId, metrics);

    return {
      id: crypto.randomUUID(),
      user_id: userId,
      report_type: "pipeline",
      period,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      metrics,
      insights,
      recommendations: this.generateRecommendations(insights),
      generated_at: new Date().toISOString(),
    };
  }

  private static async generateSalesInsights(
    userId: string,
    metrics: Metric[]
  ): Promise<string[]> {
    const insights: string[] = [];

    const totalPipeline = metrics.find((m) => m.name === "Total Pipeline Value");
    const conversionRate = metrics.find((m) => m.name === "Conversion Rate");
    const dealsWon = metrics.find((m) => m.name === "Deals Won This Month");

    if (totalPipeline && parseFloat(totalPipeline.value as string) > 0) {
      insights.push(`Your pipeline is valued at $${totalPipeline.value.toLocaleString()}`);
    }

    if (conversionRate && parseFloat(conversionRate.value as string) > 20) {
      insights.push(
        `Strong conversion rate of ${conversionRate.value}% - keep up the momentum!`
      );
    }

    if (dealsWon && parseInt(dealsWon.value as string) > 0) {
      insights.push(`You've closed ${dealsWon.value} deals this month`);
    }

    return insights;
  }

  private static async generatePipelineInsights(
    userId: string,
    metrics: Metric[]
  ): Promise<string[]> {
    const insights: string[] = [];

    const avgCycle = metrics.find((m) => m.name === "Average Sales Cycle");
    const stalledDeals = metrics.find((m) => m.name === "Stalled Deals");

    if (avgCycle && parseFloat(avgCycle.value as string) > 45) {
      insights.push(`Sales cycle is ${avgCycle.value} days - consider streamlining processes`);
    }

    if (stalledDeals && parseInt(stalledDeals.value as string) > 0) {
      insights.push(
        `You have ${stalledDeals.value} stalled deals - review and take action`
      );
    }

    return insights;
  }

  private static generateRecommendations(insights: string[]): string[] {
    const recommendations: string[] = [];

    insights.forEach((insight) => {
      if (insight.includes("Strong conversion")) {
        recommendations.push("Maintain current sales practices and pitch strategy");
      }
      if (insight.includes("stalled")) {
        recommendations.push("Reach out to stalled deals with updated proposal or timeline");
      }
      if (insight.includes("Sales cycle")) {
        recommendations.push("Analyze bottlenecks in your sales process");
      }
    });

    return recommendations;
  }

  private static getPeriodStart(endDate: Date, period: string): Date {
    const start = new Date(endDate);
    switch (period) {
      case "daily":
        start.setDate(start.getDate() - 1);
        break;
      case "weekly":
        start.setDate(start.getDate() - 7);
        break;
      case "monthly":
        start.setMonth(start.getMonth() - 1);
        break;
    }
    return start;
  }

  static async exportReport(report: AnalyticsReport, format: "pdf" | "excel" = "pdf"): Promise<Blob> {
    let content = "";

    if (format === "excel" || format === "pdf") {
      content = `Analytics Report\n`;
      content += `Report Type: ${report.report_type}\n`;
      content += `Period: ${report.start_date} to ${report.end_date}\n\n`;
      content += `Metrics:\n`;
      report.metrics.forEach((m) => {
        content += `- ${m.name}: ${m.value} ${m.unit}\n`;
      });
      content += `\nInsights:\n`;
      report.insights.forEach((i) => {
        content += `- ${i}\n`;
      });
      content += `\nRecommendations:\n`;
      report.recommendations.forEach((r) => {
        content += `- ${r}\n`;
      });
    }

    return new Blob([content], { type: "text/plain" });
  }
}
