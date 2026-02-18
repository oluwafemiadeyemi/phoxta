import { useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { useNotification } from "@refinedev/core";
import { Activity, BarChart3, FileText, AlertCircle } from "lucide-react";
import { AuditLogger, ComplianceReportGenerator, AuditLog } from "@crm/lib/audit-compliance";

export default function AuditCompliancePage() {
  const { data: identity } = useGetIdentity() as { data?: { id: string } };
  const { open: notificationOpen } = useNotification();
  const userId = identity?.id;

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState(90);

  useEffect(() => {
    if (!userId) return;
    loadAuditLogs();
  }, [userId, selectedDays]);

  const loadAuditLogs = async () => {
    try {
      if (!userId) return;
      setLoading(true);
      const logs = await AuditLogger.getAuditLogs(userId, selectedDays);
      setAuditLogs(logs);
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to load audit logs",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      if (!userId) return;
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - selectedDays * 24 * 60 * 60 * 1000);

      const report = await ComplianceReportGenerator.generateComplianceReport(
        userId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Export as JSON
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `compliance-report-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      notificationOpen?.({
        type: "success",
        message: "Compliance report generated and downloaded",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to generate report",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("create") || action.includes("insert"))
      return "bg-green-100 text-green-700";
    if (action.includes("update")) return "bg-blue-100 text-blue-700";
    if (action.includes("delete")) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusColor = (status: string) => {
    return status === "success"
      ? "text-green-600"
      : "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{auditLogs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Last {selectedDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {auditLogs.length === 0
                ? "0"
                : (
                    ((auditLogs.filter((l) => l.status === "success").length /
                      auditLogs.length) *
                      100) |
                    0
                  ).toFixed(1)}
              %
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {auditLogs.filter((l) => l.status === "success").length} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {new Set(auditLogs.map((l) => l.user_id)).size}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Users with activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>Track all user activities and changes</CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
              <Button onClick={handleGenerateReport} disabled={loading} size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit logs found</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 border rounded-lg text-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action.toUpperCase()}
                        </span>
                        <span className="text-muted-foreground">
                          {log.entity_type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono break-all">
                        ID: {log.entity_id.substring(0, 12)}...
                      </p>
                    </div>
                    <div className="text-right">
                      {log.status === "success" ? (
                        <div className="text-green-600 text-xs font-semibold">
                          ✓ Success
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-xs font-semibold">Failed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {log.error_message && (
                    <p className="text-xs text-red-600 mb-2">
                      Error: {log.error_message}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{log.ip_address || "Unknown IP"}</span>
                    <span>
                      {new Date(log.created_at).toLocaleDateString()} at{" "}
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Info */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5" />
            Compliance & Data Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            All user activities are logged for compliance and security purposes. Audit logs are
            retained for 365 days by default.
          </p>
          <p>
            Use the Generate Report button to export compliance reports for your organization's
            record-keeping requirements.
          </p>
          <p className="text-xs text-muted-foreground">
            For GDPR requests (data access, deletion), please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
