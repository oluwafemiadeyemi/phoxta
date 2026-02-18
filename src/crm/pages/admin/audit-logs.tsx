import { useState } from "react";
import { useList } from "@refinedev/core";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import { Badge } from "@crm/components/ui/badge";
import { Download, Filter, Loader2 } from "lucide-react";
import { supabaseClient } from "@crm/lib/supabase";

const ACTION_TYPES = [
  { value: "create", label: "Create", color: "bg-green-100 text-green-800" },
  { value: "update", label: "Update", color: "bg-blue-100 text-blue-800" },
  { value: "delete", label: "Delete", color: "bg-red-100 text-red-800" },
  { value: "view", label: "View", color: "bg-gray-100 text-gray-800" },
  { value: "export", label: "Export", color: "bg-purple-100 text-purple-800" },
  { value: "login", label: "Login", color: "bg-yellow-100 text-yellow-800" },
];

export default function AdminAuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [dateRange, setDateRange] = useState("7");
  const [loading, setLoading] = useState(false);

  const { result, query: { isLoading, refetch } } = useList({
    resource: "audit_logs",
    filters: [
      ...(searchTerm
        ? [
            {
              field: "user_id",
              operator: "contains" as const,
              value: searchTerm,
            },
          ]
        : []),
      ...(actionFilter
        ? [
            {
              field: "action",
              operator: "eq" as const,
              value: actionFilter,
            },
          ]
        : []),
      ...(resourceFilter
        ? [
            {
              field: "resource_type",
              operator: "eq" as const,
              value: resourceFilter,
            },
          ]
        : []),
    ],
    pagination: {
      pageSize: 50,
    },
  });

  const handleExportLogs = async () => {
    try {
      setLoading(true);

      // Get all logs
      const { data: logs, error } = await supabaseClient
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = ["User ID", "Action", "Resource Type", "Resource ID", "Details", "IP Address", "Created At"];
      const rows = logs?.map((log) => [
        log.user_id,
        log.action,
        log.resource_type,
        log.resource_id,
        JSON.stringify(log.details || {}),
        log.ip_address || "—",
        new Date(log.created_at).toLocaleString(),
      ]) || [];

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      // Download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to export logs");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: "created_at",
      header: "Date & Time",
      cell: (value: string) =>
        new Date(value).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
    },
    {
      accessorKey: "user_id",
      header: "User",
      cell: (value: string) => (
        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
          {value.substring(0, 8)}...
        </code>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: (value: string) => {
        const action = ACTION_TYPES.find((a) => a.value === value);
        if (!action) return value;
        return <Badge className={action.color}>{action.label}</Badge>;
      },
    },
    {
      accessorKey: "resource_type",
      header: "Resource",
      cell: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      accessorKey: "resource_id",
      header: "Resource ID",
      cell: (value: string) => (
        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
          {value.substring(0, 8)}...
        </code>
      ),
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: (value: any) => {
        if (!value) return "—";
        return (
          <span className="text-sm text-gray-600">
            {JSON.stringify(value).substring(0, 50)}...
          </span>
        );
      },
    },
    {
      accessorKey: "ip_address",
      header: "IP Address",
      cell: (value: string) => value || "—",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-2">
            Track all user actions and system events
          </p>
        </div>
        <Button
          onClick={handleExportLogs}
          variant="outline"
          disabled={loading}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search User
          </label>
          <Input
            placeholder="User ID or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action
          </label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Actions</SelectItem>
              {ACTION_TYPES.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resource Type
          </label>
          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Resources</SelectItem>
              <SelectItem value="contacts">Contacts</SelectItem>
              <SelectItem value="companies">Companies</SelectItem>
              <SelectItem value="deals">Deals</SelectItem>
              <SelectItem value="tasks">Tasks</SelectItem>
              <SelectItem value="users">Users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Range
          </label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 Hours</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="rounded-md border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col: any) => (
                  <th key={col.accessorKey || col.id} className="px-4 py-3 text-left font-medium">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(result?.data || []).map((row: any, i: number) => (
                <tr key={row.id || i} className="border-b">
                  {columns.map((col: any) => (
                    <td key={col.accessorKey || col.id} className="px-4 py-3">
                      {col.cell ? col.cell(col.accessorKey ? row[col.accessorKey] : row) : row[col.accessorKey]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Logs</p>
          <p className="text-2xl font-bold text-gray-900">
            {result?.data?.length || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Active Users</p>
          <p className="text-2xl font-bold text-gray-900">
            {new Set(result?.data?.map((d: any) => d.user_id)).size}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Most Active Resource</p>
          <p className="text-2xl font-bold text-gray-900">
            {
              Object.entries(
                (result?.data || []).reduce(
                  (acc: any, log: any) => {
                    acc[log.resource_type] = (acc[log.resource_type] || 0) + 1;
                    return acc;
                  },
                  {}
                )
              ).sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || "—"
            }
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Last Update</p>
          <p className="text-sm font-bold text-gray-900">
            {result?.data?.[0]
              ? new Date((result.data[0] as any).created_at).toLocaleDateString()
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
