import { supabaseClient } from "./supabase";

export type AiPredictionType = "deal_close_probability" | "deal_risk" | "lead_score";
export type AiRecommendationPriority = "low" | "medium" | "high";

export interface AiPrediction {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  prediction_type: AiPredictionType;
  score: number;
  confidence: number;
  factors: Record<string, any>;
  created_at: string;
}

export interface AiRecommendation {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description: string;
  priority: AiRecommendationPriority;
  action_url?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DealInsight {
  dealId: string;
  title: string;
  score: number;
  confidence: number;
  factors: Record<string, any>;
  recommendation?: {
    title: string;
    description: string;
    priority: AiRecommendationPriority;
  };
}

const SCORE_WEIGHTS = {
  value: 0.4,
  stage: 0.3,
  recency: 0.2,
  activity: 0.1,
};

const STAGE_SCORE: Record<string, number> = {
  lead: 0.2,
  qualified: 0.4,
  proposal: 0.6,
  negotiation: 0.8,
  won: 1,
  lost: 0,
};

export function scoreDeal(deal: {
  id: string;
  value?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}): DealInsight {
  const valueScore = Math.min((deal.value || 0) / 100000, 1);
  const stageScore = STAGE_SCORE[(deal.status || "lead").toLowerCase()] ?? 0.2;
  const recencyDays = getAgeInDays(deal.updatedAt || deal.createdAt);
  const recencyScore = recencyDays <= 7 ? 1 : recencyDays <= 30 ? 0.6 : recencyDays <= 90 ? 0.3 : 0.1;
  const activityScore = recencyDays <= 14 ? 1 : 0.4;

  const score =
    valueScore * SCORE_WEIGHTS.value +
    stageScore * SCORE_WEIGHTS.stage +
    recencyScore * SCORE_WEIGHTS.recency +
    activityScore * SCORE_WEIGHTS.activity;

  const normalizedScore = Math.round(score * 100);
  const confidence = Math.round((0.6 + stageScore * 0.4) * 100);

  const factors = {
    valueScore,
    stageScore,
    recencyDays,
    recencyScore,
    activityScore,
  };

  const recommendation = buildRecommendation(deal.status, recencyDays, normalizedScore);

  return {
    dealId: deal.id,
    title: deal.status ? `Deal ${deal.status}` : "Deal",
    score: normalizedScore,
    confidence,
    factors,
    recommendation: recommendation || undefined,
  };
}

export async function saveDealInsights(userId: string, insights: DealInsight[]) {
  const predictions = insights.map((insight) => ({
    user_id: userId,
    entity_type: "deal",
    entity_id: insight.dealId,
    prediction_type: "deal_close_probability" as AiPredictionType,
    score: insight.score,
    confidence: insight.confidence,
    factors: insight.factors,
  }));

  const recommendations = insights
    .filter((insight) => insight.recommendation)
    .map((insight) => ({
      user_id: userId,
      entity_type: "deal",
      entity_id: insight.dealId,
      title: insight.recommendation!.title,
      description: insight.recommendation!.description,
      priority: insight.recommendation!.priority,
      action_url: "/deals/board",
      metadata: insight.factors,
    }));

  if (predictions.length > 0) {
    await supabaseClient.from("ai_predictions").insert(predictions);
  }

  if (recommendations.length > 0) {
    await supabaseClient.from("ai_recommendations").insert(recommendations);
  }
}

export async function getAiRecommendations(userId: string, limit = 10) {
  const { data } = await supabaseClient
    .from("ai_recommendations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []) as AiRecommendation[];
}

export async function getAiPredictions(userId: string, limit = 10) {
  const { data } = await supabaseClient
    .from("ai_predictions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []) as AiPrediction[];
}

function getAgeInDays(dateValue?: string) {
  if (!dateValue) return 999;
  const date = new Date(dateValue);
  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function buildRecommendation(status: string | undefined, recencyDays: number, score: number) {
  const normalizedStatus = (status || "").toLowerCase();

  if (normalizedStatus === "proposal" && recencyDays > 10) {
    return {
      title: "Follow up on proposal",
      description: "Proposal has been idle for more than 10 days. Schedule a follow-up call.",
      priority: "high" as AiRecommendationPriority,
    };
  }

  if (normalizedStatus === "negotiation" && recencyDays > 7) {
    return {
      title: "Re-engage negotiation",
      description: "Negotiation is stalling. Offer revised terms or set next meeting.",
      priority: "medium" as AiRecommendationPriority,
    };
  }

  if (score < 35) {
    return {
      title: "Re-qualify lead",
      description: "Deal score is low. Confirm fit or close out the opportunity.",
      priority: "low" as AiRecommendationPriority,
    };
  }

  return null;
}
