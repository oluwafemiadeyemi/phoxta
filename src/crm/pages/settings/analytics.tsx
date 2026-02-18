import { useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { useNotification } from "@refinedev/core";
import { TrendingUp, PieChart, BarChart3, Download, RefreshCw } from "lucide-react";
import {
  AnalyticsEngine,
  TrendAnalyzer,
  ReportGenerator,
  CohortAnalyzer,
  Metric,
  AnalyticsReport,
} from "@crm/lib/analytics";
import { useCurrency } from "@crm/hooks/use-currency";

export default function AnalyticsPage() {
  const { symbol } = useCurrency();
  const { data: identity } = useGetIdentity() as { data?: { id: string } };
  const { open: notificationOpen } = useNotification();
  const userId = identity?.id;

  const [salesMetrics, setSalesMetrics] = useState<Metric[]>([]);
  const [pipelineMetrics, setPipelineMetrics] = useState<Metric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [latestReport, setLatestReport] = useState<AnalyticsReport | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadMetrics();
  }, [userId]);

  const loadMetrics = async () => {
    try {
      if (!userId) return;
      setLoadingMetrics(true);

      const [sales, pipeline] = await Promise.all([
        AnalyticsEngine.generateSalesMetrics(userId),
        AnalyticsEngine.generatePipelineMetrics(userId),
      ]);

      setSalesMetrics(sales);
      setPipelineMetrics(pipeline);
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to load metrics",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleGenerateReport = async (reportType: "sales" | "pipeline") => {
    try {
      if (!userId) return;
      setGeneratingReport(true);

      const report =
        reportType === "sales"
          ? await ReportGenerator.generateSalesReport(userId, "monthly")
          : await ReportGenerator.generatePipelineReport(userId, "monthly");

      setLatestReport(report);
      notificationOpen?.({
        type: "success",
        message: `${reportType} report generated successfully`,
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to generate report",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleExportReport = async () => {
    try {
      if (!latestReport) return;
      setGeneratingReport(true);

      const blob = await ReportGenerator.exportReport(latestReport, "pdf");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `analytics-report-${new Date().toISOString().split("T")[0]}.txt`;
      link.click();
      URL.revokeObjectURL(url);

      notificationOpen?.({
        type: "success",
        message: "Report exported successfully",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to export report",
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const renderMetric = (metric: Metric) => (
    <div key={metric.id} className="p-4 border rounded-lg">
      <p className="text-sm text-muted-foreground mb-1">{metric.name}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">
            {metric.format === "currency" && symbol}
            {metric.value}
            {metric.format === "percent" && "%"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{metric.unit}</p>
        </div>
        {metric.trend !== undefined && (
          <p
            className={`text-sm font-semibold ${
              metric.trend > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {metric.trend > 0 ? "↑" : "↓"} {Math.abs(metric.trend)}%
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sales Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Sales Metrics
              </CardTitle>
              <CardDescription>Monitor your sales performance</CardDescription>
            </div>
            <Button
              onClick={() => handleGenerateReport("sales")}
              disabled={loadingMetrics || generatingReport}
              size="sm"
            >
              {generatingReport ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMetrics ? (
            <p className="text-sm text-muted-foreground">Loading metrics...</p>
          ) : salesMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales data available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {salesMetrics.map((metric) => renderMetric(metric))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Pipeline Metrics
              </CardTitle>
              <CardDescription>Track your sales pipeline health</CardDescription>
            </div>
            <Button
              onClick={() => handleGenerateReport("pipeline")}
              disabled={loadingMetrics || generatingReport}
              size="sm"
            >
              {generatingReport ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMetrics ? (
            <p className="text-sm text-muted-foreground">Loading metrics...</p>
          ) : pipelineMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pipeline data available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pipelineMetrics.map((metric) => renderMetric(metric))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest Report */}
      {latestReport && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Latest {latestReport.report_type} Report</CardTitle>
                <CardDescription>
                  Generated on {new Date(latestReport.generated_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <Button
                onClick={handleExportReport}
                disabled={generatingReport}
                size="sm"
                variant="default"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestReport.insights.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
                <ul className="space-y-1">
                  {latestReport.insights.map((insight, idx) => (
                    <li key={idx} className="text-sm flex gap-2">
                      <span>•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {latestReport.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {latestReport.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm flex gap-2">
                      <span>→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
