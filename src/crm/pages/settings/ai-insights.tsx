import { useEffect, useMemo, useState } from "react";
import { useGetIdentity, useList, useNotification } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import type { Deal } from "@crm/types";
import { getAiPredictions, getAiRecommendations, saveDealInsights, scoreDeal } from "@crm/lib/ai-features";

export const AiInsightsSettings = () => {
  const { open } = useNotification();
  const { data: user } = useGetIdentity();
  const { query } = useList<Deal>({ resource: "deals", pagination: { mode: "off" } });
  const [isGenerating, setIsGenerating] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const deals = useMemo(() => query.data?.data || [], [query.data?.data]);

  const buildLocalInsights = (items: Deal[]) => {
    const insights = items.map((deal) =>
      scoreDeal({
        id: deal.id,
        value: deal.value,
        status: deal.status,
        createdAt: deal.createdAt,
        updatedAt: deal.createdAt,
      }),
    );

    const predictionsLocal = insights.map((insight, index) => ({
      id: `local_pred_${insight.dealId}_${index}`,
      prediction_type: "deal_close_probability",
      entity_id: insight.dealId,
      score: insight.score,
    }));

    const recommendationsLocal = insights
      .filter((insight) => insight.recommendation)
      .map((insight, index) => ({
        id: `local_rec_${insight.dealId}_${index}`,
        title: insight.recommendation!.title,
        description: insight.recommendation!.description,
        priority: insight.recommendation!.priority,
      }));

    return { predictionsLocal, recommendationsLocal };
  };

  const loadInsights = async () => {
    if (!user?.id) {
      const local = buildLocalInsights(deals);
      setPredictions(local.predictionsLocal);
      setRecommendations(local.recommendationsLocal);
      return;
    }

    try {
      const [preds, recs] = await Promise.all([
        getAiPredictions(user.id, 20),
        getAiRecommendations(user.id, 20),
      ]);
      setPredictions(preds);
      setRecommendations(recs);
    } catch (error) {
      const local = buildLocalInsights(deals);
      setPredictions(local.predictionsLocal);
      setRecommendations(local.recommendationsLocal);

      open?.({
        type: "progress",
        message: "AI insights running locally",
        description: "Could not load saved insights from the database.",
      });
    }
  };

  useEffect(() => {
    loadInsights();
  }, [user?.id, deals.length]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const insights = deals.map((deal) =>
        scoreDeal({
          id: deal.id,
          value: deal.value,
          status: deal.status,
          createdAt: deal.createdAt,
          updatedAt: deal.createdAt,
        })
      );

      if (user?.id) {
        await saveDealInsights(user.id, insights);
        await loadInsights();

        open?.({
          type: "success",
          message: "AI insights refreshed",
          description: `Generated insights for ${insights.length} deals.`,
        });
      } else {
        const local = buildLocalInsights(deals);
        setPredictions(local.predictionsLocal);
        setRecommendations(local.recommendationsLocal);
        open?.({
          type: "progress",
          message: "AI insights generated locally",
          description: `Generated insights for ${insights.length} deals.`,
        });
      }
    } catch (error) {
      open?.({
        type: "error",
        message: "Unable to generate insights",
        description: "Please try again in a moment.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Insights</h2>
        <p className="text-muted-foreground mt-2">Generate predictive scores and recommended actions for deals.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Deal Predictions
          </CardTitle>
          <CardDescription>Run the AI engine to update deal scores and follow-ups.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerate} disabled={isGenerating || deals.length === 0}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">Deals analyzed: {deals.length}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest Predictions</CardTitle>
            <CardDescription>Most recent AI scores for your deals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {predictions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No predictions generated yet.</p>
            ) : (
              predictions.map((prediction) => (
                <div key={prediction.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                  <div>
                    <p className="font-medium">{prediction.prediction_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">Deal ID: {prediction.entity_id}</p>
                  </div>
                  <Badge variant={prediction.score > 70 ? "default" : prediction.score > 40 ? "secondary" : "destructive"}>
                    {prediction.score}%
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Suggested actions based on AI insights.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendations available yet.</p>
            ) : (
              recommendations.map((rec) => (
                <div key={rec.id} className="space-y-2 border-b pb-3 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{rec.title}</p>
                    <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "secondary" : "outline"}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
