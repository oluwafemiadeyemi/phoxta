import { supabaseClient } from "./supabase";
import { logUserAction } from "./rbac";

/**
 * Advanced Sales Pipeline and Forecasting Engine
 * 
 * Provides:
 * - Sales stage management with probability weighting
 * - Revenue forecasting
 * - Sales cycle analytics
 * - Conversion funnel analysis
 * - Deal velocity metrics
 */

export interface SalesStage {
  id: string;
  name: string;
  probability: number; // 0-100 percentage
  order: number;
  color: string;
  description?: string;
}

export interface DealForecast {
  month: string;
  expectedRevenue: number;
  pipelineRevenue: number;
  probability: number;
}

export interface SalesMetrics {
  totalPipeline: number;
  weightedForecast: number;
  conversionRate: number;
  avgDealSize: number;
  avgSaleCycle: number;
  velocity: number; // deals per week
}

export interface FunnelStage {
  stage: string;
  count: number;
  revenue: number;
  percentage: number;
  conversionToNext: number;
}

/**
 * Sales Pipeline Manager
 */
export class SalesPipelineManager {
  private stages: Map<string, SalesStage> = new Map();

  async initializeDefaultStages() {
    const defaultStages: SalesStage[] = [
      { id: "1", name: "Prospect", probability: 10, order: 1, color: "#gray" },
      { id: "2", name: "Qualified", probability: 25, order: 2, color: "#blue" },
      { id: "3", name: "Proposal", probability: 50, order: 3, color: "#yellow" },
      { id: "4", name: "Negotiation", probability: 75, order: 4, color: "#orange" },
      { id: "5", name: "Closed Won", probability: 100, order: 5, color: "#green" },
    ];

    defaultStages.forEach((stage) => this.stages.set(stage.id, stage));
  }

  /**
   * Calculate weighted revenue forecast
   */
  async calculateWeightedForecast(deals: any[]): Promise<number> {
    let totalWeighted = 0;

    deals.forEach((deal) => {
      const stage = this.stages.get(deal.stage);
      if (stage) {
        const weight = stage.probability / 100;
        totalWeighted += deal.amount * weight;
      }
    });

    return totalWeighted;
  }

  /**
   * Generate sales forecast by month
   */
  async generateMonthlySalesForecast(deals: any[], months: number = 12): Promise<DealForecast[]> {
    const forecasts: DealForecast[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(now);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const monthKey = forecastDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      // Filter deals closing in this month
      const monthDeals = deals.filter((deal) => {
        if (!deal.expected_close_date) return false;
        const closeDate = new Date(deal.expected_close_date);
        return (
          closeDate.getMonth() === forecastDate.getMonth() &&
          closeDate.getFullYear() === forecastDate.getFullYear()
        );
      });

      const expectedRevenue = monthDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
      const weightedRevenue = await this.calculateWeightedForecast(monthDeals);
      const probability = monthDeals.length > 0 
        ? monthDeals.reduce((sum: number, d: any) => {
            const stage = this.stages.get(d.stage);
            return sum + (stage?.probability || 0);
          }, 0) / monthDeals.length
        : 0;

      forecasts.push({
        month: monthKey,
        expectedRevenue,
        pipelineRevenue: weightedRevenue,
        probability: Math.round(probability),
      });
    }

    return forecasts;
  }

  /**
   * Calculate conversion funnel
   */
  async calculateConversionFunnel(deals: any[]): Promise<FunnelStage[]> {
    const stageArray = Array.from(this.stages.values()).sort((a, b) => a.order - b.order);
    const funnel: FunnelStage[] = [];

    let totalCount = 0;
    let totalRevenue = 0;

    // First pass: count deals in each stage
    const stageCounts = new Map<string, { count: number; revenue: number }>();

    deals.forEach((deal) => {
      const stage = deal.stage;
      const current = stageCounts.get(stage) || { count: 0, revenue: 0 };
      current.count++;
      current.revenue += deal.amount || 0;
      stageCounts.set(stage, current);
    });

    // Build funnel
    let prevCount = 0;
    for (const stageObj of stageArray) {
      const stageData = stageCounts.get(stageObj.id) || { count: 0, revenue: 0 };
      const count = stageData.count;
      const revenue = stageData.revenue;
      
      totalCount += count;
      totalRevenue += revenue;

      const conversionToNext = prevCount > 0 ? (count / prevCount) * 100 : 100;

      funnel.push({
        stage: stageObj.name,
        count,
        revenue: Math.round(revenue),
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
        conversionToNext: Math.round(conversionToNext),
      });

      prevCount = count;
    }

    return funnel;
  }

  /**
   * Calculate sales metrics
   */
  async calculateSalesMetrics(deals: any[]): Promise<SalesMetrics> {
    const wonDeals = deals.filter((d: any) => d.status === "won");
    const totalPipeline = deals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    const weightedForecast = await this.calculateWeightedForecast(deals);

    // Calculate conversion rate
    const conversionRate = deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;

    // Calculate average deal size
    const avgDealSize = deals.length > 0 
      ? totalPipeline / deals.length 
      : 0;

    // Calculate average sales cycle
    let totalCycle = 0;
    let cycleCount = 0;
    wonDeals.forEach((deal: any) => {
      if (deal.created_at && deal.updated_at) {
        const start = new Date(deal.created_at).getTime();
        const end = new Date(deal.updated_at).getTime();
        totalCycle += (end - start) / (1000 * 60 * 60 * 24); // days
        cycleCount++;
      }
    });
    const avgSaleCycle = cycleCount > 0 ? totalCycle / cycleCount : 0;

    // Calculate velocity
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekDeals = deals.filter((d: any) => 
      new Date(d.created_at) > weekAgo
    ).length;
    const velocity = weekDeals / 1; // per week

    return {
      totalPipeline: Math.round(totalPipeline),
      weightedForecast: Math.round(weightedForecast),
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgDealSize: Math.round(avgDealSize),
      avgSaleCycle: Math.round(avgSaleCycle * 100) / 100,
      velocity: Math.round(velocity * 100) / 100,
    };
  }

  /**
   * Get stage probability
   */
  getStageProbability(stageId: string): number {
    return this.stages.get(stageId)?.probability || 0;
  }

  /**
   * Update stage
   */
  async updateStage(stageId: string, updates: Partial<SalesStage>) {
    const stage = this.stages.get(stageId);
    if (!stage) return null;

    const updated = { ...stage, ...updates };
    this.stages.set(stageId, updated);

    // Persist to database
    await supabaseClient
      .from("sales_stages")
      .update(updated)
      .eq("id", stageId);

    return updated;
  }
}

/**
 * Advanced Deal Analysis
 */
export async function analyzeDealRisk(deal: any): Promise<{
  risk: "low" | "medium" | "high";
  score: number;
  factors: string[];
}> {
  const factors: string[] = [];
  let riskScore = 0;

  // Check deal age
  const dealAge = Math.floor(
    (Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (dealAge > 90) {
    factors.push("Deal is stale (>90 days)");
    riskScore += 2;
  }

  // Check lack of activity
  const activityAge = deal.last_activity 
    ? Math.floor((Date.now() - new Date(deal.last_activity).getTime()) / (1000 * 60 * 60 * 24))
    : dealAge;
  
  if (activityAge > 14) {
    factors.push("No recent activity (>14 days)");
    riskScore += 2;
  }

  // Check probability mismatch
  if (deal.probability && deal.probability < 30 && dealAge > 60) {
    factors.push("Low probability for age");
    riskScore += 1;
  }

  // Check no decision maker assigned
  if (!deal.decision_maker) {
    factors.push("No decision maker assigned");
    riskScore += 1;
  }

  let risk: "low" | "medium" | "high" = "low";
  if (riskScore >= 4) risk = "high";
  else if (riskScore >= 2) risk = "medium";

  return {
    risk,
    score: Math.min(100, riskScore * 25),
    factors,
  };
}

/**
 * Revenue Intelligence
 */
export async function getRevenueIntelligence(deals: any[]) {
  return {
    totalPipeline: deals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
    openDeals: deals.filter((d: any) => d.status === "open").length,
    closedDeals: deals.filter((d: any) => d.status === "won").length,
    lostDeals: deals.filter((d: any) => d.status === "lost").length,
    avgDealValue: deals.length > 0 
      ? Math.round(deals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) / deals.length)
      : 0,
    largestDeal: Math.max(...deals.map((d: any) => d.amount || 0)),
    topStage: deals.reduce((acc: any, d: any) => {
      acc[d.stage] = (acc[d.stage] || 0) + 1;
      return acc;
    }, {}),
  };
}

// Create global instance
export const salesPipeline = new SalesPipelineManager();
