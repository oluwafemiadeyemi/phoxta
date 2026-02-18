import { useState, useMemo } from "react";
import { useTable, HttpError } from "@refinedev/core";
import dayjs from "dayjs";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  List,
  UserCheck,
  UserX,
  Mail,
  Phone,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm/components/ui/table";
import { Card, CardContent } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";

import type { ICustomer } from "@crm/types/finefoods";
import { CustomerShowDrawer } from "@crm/components/customers/show-drawer";

const AVATAR_GRADIENTS = [
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-indigo-500 to-blue-500",
  "from-fuchsia-500 to-pink-500",
  "from-cyan-500 to-sky-500",
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export default function CustomersList() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    tableQuery,
    current,
    setCurrent,
    pageCount,
    pageSize,
    setPageSize,
    setFilters,
  } = useTable<ICustomer, HttpError>({
    resource: "customers",
    pagination: { pageSize: 12 },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  }) as any;

  const customers = (tableQuery?.data?.data ?? []) as ICustomer[];
  const isLoading = tableQuery?.isLoading;
  const total = tableQuery?.data?.total ?? 0;

  const handleSearch = (value: string) => {
    setSearchText(value);
    const filters: any[] = [];
    if (value) filters.push({ field: "fullName", operator: "contains", value });
    if (statusFilter !== "all") filters.push({ field: "isActive", operator: "eq", value: statusFilter === "true" });
    setFilters(filters, "replace");
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    const filters: any[] = [];
    if (searchText) filters.push({ field: "fullName", operator: "contains", value: searchText });
    if (value !== "all") filters.push({ field: "isActive", operator: "eq", value: value === "true" });
    setFilters(filters, "replace");
  };

  // Stats
  const stats = useMemo(() => {
    const active = customers.filter((c) => c.isActive).length;
    return { total, active, inactive: customers.length - active };
  }, [customers, total]);

  const getInitials = (c: ICustomer) => {
    return ((c.firstName?.[0] || "") + (c.lastName?.[0] || "")).toUpperCase() || "?";
  };
  const getName = (c: ICustomer) => c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-slate-900">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center">
              <Users className="h-4.5 w-4.5 text-white" />
            </div>
            Customers
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[46px]">{total} total customers</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-slate-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <UserX className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.inactive}</p>
                <p className="text-xs text-slate-500">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center border rounded-lg overflow-hidden ml-auto">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setViewMode("table")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200/80">
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-slate-100 rounded" />
              ))}
            </div>
          </Card>
        )
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg font-medium">No customers found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === "grid" ? (
        /* ──── Card Grid View ──── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => {
            const name = getName(customer);
            return (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomerId(customer.id)}
                className="group bg-white border border-slate-200/80 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/40 hover:-translate-y-0.5">
                <div className="flex items-start gap-3 mb-3">
                  {customer.avatarUrl ? (
                    <img src={customer.avatarUrl} alt={name} className="h-12 w-12 rounded-full object-cover shadow-sm ring-2 ring-white" />
                  ) : (
                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getAvatarGradient(name)} flex items-center justify-center text-white font-semibold text-sm shadow-md`}>
                      {getInitials(customer)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                      {name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Joined {dayjs(customer.createdAt).format("MMM D, YYYY")}
                    </p>
                  </div>
                  <Badge className={`border-0 text-xs flex-shrink-0 ${customer.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full mr-1 ${customer.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {customer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  {customer.gsm && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>{customer.gsm}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ──── Table View ──── */
        <Card className="border-slate-200/80 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Joined</TableHead>
                <TableHead className="font-semibold w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const name = getName(customer);
                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-violet-50/40 transition-colors"
                    onClick={() => setSelectedCustomerId(customer.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {customer.avatarUrl ? (
                          <img src={customer.avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200" />
                        ) : (
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${getAvatarGradient(name)} flex items-center justify-center text-white text-xs font-semibold shadow-sm`}>
                            {getInitials(customer)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">{customer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{customer.gsm || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 text-xs ${customer.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full mr-1 ${customer.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {dayjs(customer.createdAt).format("MMM D, YYYY")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomerId(customer.id);
                        }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {(pageCount ?? 0) > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
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
            <span className="text-sm text-muted-foreground px-1">{current} / {pageCount}</span>
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
      )}

      {/* Customer Detail Drawer */}
      <CustomerShowDrawer
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </div>
  );
}
