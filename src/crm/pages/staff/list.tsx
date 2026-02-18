import { useState, useMemo } from "react";
import { useTable, useDelete, HttpError } from "@refinedev/core";
import dayjs from "dayjs";
import { useCurrency } from "@crm/hooks/use-currency";
import {
  Users,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  Edit,
  Trash2,
  Eye,
  Briefcase,
  Building2,
  LayoutGrid,
  List,
  UserCheck,
  UserX,
  Phone,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@crm/components/ui/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@crm/components/ui/avatar";
import type { Staff } from "@crm/types";
import { StaffFormDialog } from "@crm/components/staff/form-dialog";
import { StaffShowDrawer } from "@crm/components/staff/show-drawer";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  Active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "On Leave": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  Terminated: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const EMPLOYMENT_CONFIG: Record<string, { bg: string; text: string }> = {
  "Full-time": { bg: "bg-blue-50", text: "text-blue-700" },
  "Part-time": { bg: "bg-violet-50", text: "text-violet-700" },
  Contract: { bg: "bg-amber-50", text: "text-amber-700" },
  Intern: { bg: "bg-cyan-50", text: "text-cyan-700" },
};

const AVATAR_GRADIENTS = [
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-indigo-500 to-blue-500",
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export default function StaffList() {
  const { format } = useCurrency();
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showId, setShowId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const {
    tableQuery,
    current,
    setCurrent,
    pageCount,
    pageSize,
    setPageSize,
    setFilters,
  } = useTable<Staff, HttpError>({
    resource: "staff",
    pagination: { pageSize: 12 },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  }) as any;

  const { mutate: deleteStaff } = useDelete();

  const staffList = (tableQuery?.data?.data ?? []) as Staff[];
  const isLoading = tableQuery?.isLoading;
  const total = tableQuery?.data?.total ?? 0;

  // Stats
  const stats = useMemo(() => {
    const active = staffList.filter((s) => s.status === "Active").length;
    const onLeave = staffList.filter((s) => s.status === "On Leave").length;
    return { total, active, onLeave };
  }, [staffList, total]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    const filters: any[] = [];
    if (value) filters.push({ field: "first_name", operator: "contains", value });
    if (statusFilter !== "all") filters.push({ field: "status", operator: "eq", value: statusFilter });
    if (departmentFilter !== "all") filters.push({ field: "department", operator: "eq", value: departmentFilter });
    setFilters(filters);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    const filters: any[] = [];
    if (searchText) filters.push({ field: "first_name", operator: "contains", value: searchText });
    if (value !== "all") filters.push({ field: "status", operator: "eq", value });
    if (departmentFilter !== "all") filters.push({ field: "department", operator: "eq", value: departmentFilter });
    setFilters(filters);
  };

  const handleDepartmentFilter = (value: string) => {
    setDepartmentFilter(value);
    const filters: any[] = [];
    if (searchText) filters.push({ field: "first_name", operator: "contains", value: searchText });
    if (statusFilter !== "all") filters.push({ field: "status", operator: "eq", value: statusFilter });
    if (value !== "all") filters.push({ field: "department", operator: "eq", value });
    setFilters(filters);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteStaff({ resource: "staff", id: deleteId });
      setDeleteId(null);
    }
  };

  const departments = [...new Set(staffList.map((s) => s.department).filter(Boolean))];
  const getInitials = (firstName: string, lastName: string) =>
    `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() || "?";
  const getFullName = (s: Staff) => `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Unknown";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-slate-900">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center">
              <Users className="h-4.5 w-4.5 text-white" />
            </div>
            Staff
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[46px]">{total} team members</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-200/50 transition-all duration-300">
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
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
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <UserX className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.onLeave}</p>
                <p className="text-xs text-slate-500">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name..." value={searchText} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="On Leave">On Leave</SelectItem>
            <SelectItem value="Terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={handleDepartmentFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depts</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center border rounded-lg overflow-hidden ml-auto">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("table")}>
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
                <div key={i} className="h-14 animate-pulse bg-slate-100 rounded" />
              ))}
            </div>
          </Card>
        )
      ) : staffList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg font-medium">No staff members found</p>
          <p className="text-slate-400 text-sm mt-1">Add your first team member to get started</p>
          <Button
            onClick={() => setCreateOpen(true)}
            className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* ──── Card Grid View ──── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((member) => {
            const name = getFullName(member);
            const statusConf = STATUS_CONFIG[member.status] || STATUS_CONFIG.Active;
            const empConf = EMPLOYMENT_CONFIG[member.employmentType] || EMPLOYMENT_CONFIG["Full-time"];

            return (
              <div
                key={member.id}
                onClick={() => setShowId(member.id)}
                className="group bg-white border border-slate-200/80 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/40 hover:-translate-y-0.5">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(name)} text-white text-sm font-semibold`}>
                      {getInitials(member.firstName, member.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                      {name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {member.jobTitle || "—"}
                    </p>
                  </div>
                  <Badge className={`${statusConf.bg} ${statusConf.text} border-0 text-[10px] flex-shrink-0`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot} mr-1`} />
                    {member.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 mb-3">
                  {member.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span>{member.department}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Badge className={`${empConf.bg} ${empConf.text} border-0 text-[10px]`}>{member.employmentType}</Badge>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditId(member.id)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(member.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ──── Table View ──── */
        <Card className="border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Job Title</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Start Date</TableHead>
                  <TableHead className="font-semibold text-right">Salary</TableHead>
                  <TableHead className="font-semibold w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((member) => {
                  const name = getFullName(member);
                  const statusConf = STATUS_CONFIG[member.status] || STATUS_CONFIG.Active;
                  const empConf = EMPLOYMENT_CONFIG[member.employmentType] || EMPLOYMENT_CONFIG["Full-time"];

                  return (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-indigo-50/40 transition-colors"
                      onClick={() => setShowId(member.id)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(name)} text-white text-xs font-semibold`}>
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm text-slate-900">{name}</p>
                            <p className="text-xs text-slate-500">{member.email || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{member.jobTitle || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {member.department}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${empConf.bg} ${empConf.text} border-0 text-xs`}>{member.employmentType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConf.bg} ${statusConf.text} border-0 text-xs`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot} mr-1`} />
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {member.startDate ? dayjs(member.startDate).format("MMM D, YYYY") : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">{member.salary ? format(member.salary) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowId(member.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditId(member.id)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(member.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={current <= 1} onClick={() => setCurrent(current - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-1">{current} / {pageCount}</span>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={current >= pageCount} onClick={() => setCurrent(current + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <StaffFormDialog
        open={createOpen || !!editId}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setCreateOpen(false);
            setEditId(null);
          }
        }}
        staffId={editId}
      />

      {/* Show Drawer */}
      <StaffShowDrawer
        staffId={showId}
        onClose={() => setShowId(null)}
        onEdit={(id: string) => {
          setShowId(null);
          setEditId(id);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this staff member. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
