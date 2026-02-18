import { useState, useMemo } from "react";
import { useTable, useNavigation, useExport, HttpError } from "@refinedev/core";
import { useCurrency } from "@crm/hooks/use-currency";
import dayjs from "dayjs";
import {
  ShoppingCart,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

import { Card, CardContent } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";

import type { IOrder } from "@crm/types/finefoods";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; icon: React.ElementType }> = {
  Pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", icon: Clock },
  Ready: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", icon: Package },
  "On The Way": { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", icon: Truck },
  Delivered: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", icon: CheckCircle2 },
  Cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", icon: XCircle },
};

function getCustomerGradient(name: string | undefined) {
  const gradients = [
    "from-blue-500 to-cyan-500",
    "from-violet-500 to-purple-500",
    "from-rose-500 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-indigo-500 to-blue-500",
  ];
  let hash = 0;
  const n = name || "";
  for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

export default function OrdersList() {
  const { format } = useCurrency();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  const { show } = useNavigation();

  const {
    tableQuery: tableQueryResult,
    current,
    setCurrent,
    pageCount,
    pageSize,
    setPageSize,
    setFilters,
  } = useTable<IOrder, HttpError>({
    resource: "orders",
    pagination: { pageSize: 10 },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  }) as any;

  const data = tableQueryResult?.data;
  const isLoading = tableQueryResult?.isLoading;
  const orders = (data?.data ?? []) as IOrder[];
  const total = (data?.total ?? 0) as number;

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    if (value === "all") {
      setFilters([], "replace");
    } else {
      setFilters([{ field: "status", operator: "eq", value }], "replace");
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    if (value) {
      setFilters(
        [{ field: "customerName", operator: "contains", value }],
        "replace",
      );
    } else {
      setFilters([], "replace");
    }
  };

  const { triggerExport, isLoading: exportLoading } = useExport<IOrder>({
    resource: "orders",
    mapData: (item) => ({
      id: item.id,
      orderNumber: item.orderNumber,
      status: item.status,
      amount: item.amount,
      customer: item.customerName,
      store: item.storeName,
      createdAt: item.createdAt,
    }),
  });

  // Summary stats
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + Number(o.amount || 0), 0);
    return {
      total,
      pending: orders.filter((o) => o.status === "Pending").length,
      delivered: orders.filter((o) => o.status === "Delivered").length,
      onTheWay: orders.filter((o) => o.status === "On The Way").length,
      totalRevenue,
    };
  }, [orders, total]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-slate-900">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <ShoppingCart className="h-4.5 w-4.5 text-white" />
            </div>
            Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[46px]">
            Manage and track all orders
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => triggerExport()}
          disabled={exportLoading}
          className="border-slate-200 hover:bg-slate-50">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-violet-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Truck className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.onTheWay}</p>
                <p className="text-xs text-slate-500">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.delivered}</p>
                <p className="text-xs text-slate-500">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Ready">Ready</SelectItem>
            <SelectItem value="On The Way">On The Way</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-200/80 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="font-semibold w-[100px]">Order #</TableHead>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Amount</TableHead>
              <TableHead className="font-semibold">Store</TableHead>
              <TableHead className="font-semibold">Courier</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 animate-pulse bg-slate-100 rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No orders found</p>
                  <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
                return (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                    onClick={() => show("orders", order.id)}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-slate-700">
                        #{order.orderNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${getCustomerGradient(order.customerName)} flex items-center justify-center text-white text-xs font-semibold shadow-sm`}>
                          {order.customerName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{order.customerName || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0 text-xs`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot} mr-1.5`} />
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-sm text-slate-900">
                        {format(Number(order.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{order.storeName || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{order.courierName || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">
                        {dayjs(order.createdAt).format("MMM D, YYYY")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          show("orders", order.id);
                        }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)} of {total} orders
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={current <= 1}
            onClick={() => setCurrent(current - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-1">
            {current} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={current >= pageCount}
            onClick={() => setCurrent(current + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
