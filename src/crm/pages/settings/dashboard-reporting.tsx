import { useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@crm/components/ui/dialog";
import { useNotification } from "@refinedev/core";
import { BarChart3, TrendingUp, RefreshCw, Download, Plus, X } from "lucide-react";
import { DashboardManager, Dashboard, ReportManager, CustomReport, REPORT_TEMPLATES } from "@crm/lib/dashboard-reporting";
import { supabaseClient } from "@crm/lib/supabase";

export default function DashboardReportingPage() {
  const { data: identity } = useGetIdentity() as { data?: { id: string } };
  const { open: notificationOpen } = useNotification();
  const userId = identity?.id;

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [showDashboardDialog, setShowDashboardDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [dashboardName, setDashboardName] = useState("");
  const [reportName, setReportName] = useState("");
  const [reportEntity, setReportEntity] = useState<"contacts" | "companies" | "deals" | "tasks">("contacts");
  const [reportType, setReportType] = useState<"summary" | "detailed" | "comparison" | "forecast">("summary");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadDashboards();
    loadReports();
  }, [userId]);

  const loadDashboards = async () => {
    try {
      if (!userId) return;
      const data = await DashboardManager.getDashboards(userId);
      setDashboards(data);
      // Set first dashboard or create default
      if (data.length === 0) {
        const defaultDashboard = await DashboardManager.createDashboard(
          userId,
          "My Dashboard"
        );
        setDashboards([defaultDashboard]);
        setSelectedDashboard(defaultDashboard);
      } else {
        const defaultDash = data.find((d) => d.is_default) || data[0];
        setSelectedDashboard(defaultDash);
      }
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to load dashboards",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const loadReports = async () => {
    try {
      if (!userId) return;
      const data = await ReportManager.getReports(userId);
      setReports(data);
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to load reports",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleCreateDashboard = async () => {
    try {
      if (!userId || !dashboardName) return;
      setLoading(true);
      const dashboard = await DashboardManager.createDashboard(
        userId,
        dashboardName
      );
      setDashboards([...dashboards, dashboard]);
      setSelectedDashboard(dashboard);
      setDashboardName("");
      setShowDashboardDialog(false);
      notificationOpen?.({
        type: "success",
        message: "Dashboard created successfully",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to create dashboard",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      if (!userId || !reportName) return;
      setLoading(true);
      const template = REPORT_TEMPLATES.find((t) => t.entity_type === reportEntity);
      const report = await ReportManager.createReport(userId, {
        user_id: userId,
        name: reportName,
        entity_type: reportEntity,
        report_type: reportType,
        filters: template?.default_filters || {},
        columns: template?.default_columns || [],
      });
      setReports([...reports, report]);
      setReportName("");
      setShowReportDialog(false);
      notificationOpen?.({
        type: "success",
        message: "Report created successfully",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to create report",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    try {
      await DashboardManager.deleteDashboard(dashboardId);
      const updated = dashboards.filter((d) => d.id !== dashboardId);
      setDashboards(updated);
      if (selectedDashboard?.id === dashboardId) {
        setSelectedDashboard(updated[0] || null);
      }
      notificationOpen?.({
        type: "success",
        message: "Dashboard deleted",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to delete dashboard",
      });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await ReportManager.deleteReport(reportId);
      setReports(reports.filter((r) => r.id !== reportId));
      notificationOpen?.({
        type: "success",
        message: "Report deleted",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to delete report",
      });
    }
  };

  const handleExportReport = async (reportId: string) => {
    try {
      setLoading(true);
      const blob = await ReportManager.exportReportToCSV(reportId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-${reportId}.csv`;
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboards Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Dashboards
              </CardTitle>
              <CardDescription>Create and manage custom dashboards</CardDescription>
            </div>
            <Button onClick={() => setShowDashboardDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {dashboards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dashboards yet</p>
            ) : (
              dashboards.map((dashboard) => (
                <div
                  key={dashboard.id}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedDashboard?.id === dashboard.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedDashboard(dashboard)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{dashboard.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dashboard.description || "No description"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboard.widgets?.length || 0} widgets
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDashboard(dashboard.id);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Custom Reports
              </CardTitle>
              <CardDescription>Build and manage custom reports</CardDescription>
            </div>
            <Button onClick={() => setShowReportDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{report.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {report.description || report.entity_type} • {report.report_type}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportReport(report.id)}
                        disabled={loading}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dashboard Dialog */}
      <Dialog open={showDashboardDialog} onOpenChange={setShowDashboardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Dashboard</DialogTitle>
            <DialogDescription>Add a custom dashboard for your analytics</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Dashboard name"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
            />
            <Button
              onClick={handleCreateDashboard}
              disabled={!dashboardName || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Dashboard"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Report</DialogTitle>
            <DialogDescription>Build a custom report from your data</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Report name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
            <Select value={reportEntity} onValueChange={(value: any) => setReportEntity(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contacts">Contacts</SelectItem>
                <SelectItem value="companies">Companies</SelectItem>
                <SelectItem value="deals">Deals</SelectItem>
                <SelectItem value="tasks">Tasks</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="comparison">Comparison</SelectItem>
                <SelectItem value="forecast">Forecast</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreateReport}
              disabled={!reportName || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Report"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
