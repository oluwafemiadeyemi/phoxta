import { useState, useMemo } from "react";
import { useList, useMany, useGo } from "@refinedev/core";
import { ListView, ListViewHeader } from "@crm/components/refine-ui/views/list-view";
import { DeleteButton } from "@crm/components/refine-ui/buttons/delete";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Card, CardContent } from "@crm/components/ui/card";
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
  Search,
  Plus,
  LayoutGrid,
  List,
  Users,
  UserCheck,
  Briefcase,
  TrendingUp,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import type { Contact, Company, Tag } from "@crm/types";
import { useCurrency } from "@crm/hooks/use-currency";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  Lead: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500", label: "Lead" },
  Qualified: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500", label: "Qualified" },
  Proposal: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500", label: "Proposal" },
  Negotiation: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", label: "Negotiation" },
  Won: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Won" },
  Lost: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "Lost" },
};

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
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ContactsListPage() {
  const go = useGo();
  const { format } = useCurrency();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Fetch contacts
  const {
    result: { data: allContacts = [] },
    query: { isLoading },
  } = useList<Contact>({
    resource: "contacts",
    pagination: { mode: "off" },
  });

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let result = allContacts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [allContacts, search, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const paginatedContacts = filteredContacts.slice((page - 1) * pageSize, page * pageSize);

  // Extract related IDs
  const companyIds = useMemo(
    () => [...new Set(allContacts.map((c) => c.companyId).filter(Boolean))],
    [allContacts],
  );
  const tagIds = useMemo(
    () => [...new Set(allContacts.flatMap((c) => c.tagIds).filter(Boolean))],
    [allContacts],
  );

  // Fetch companies
  const { result: companiesData } = useMany<Company>({
    resource: "companies",
    ids: companyIds,
    queryOptions: { enabled: companyIds.length > 0 },
  });
  const companiesMap = useMemo(() => {
    const map = new Map<string, Company>();
    companiesData?.data?.forEach((c) => map.set(c.id, c));
    return map;
  }, [companiesData]);

  // Fetch tags
  const { result: tagsData } = useMany<Tag>({
    resource: "tags",
    ids: tagIds,
    queryOptions: { enabled: tagIds.length > 0 },
  });
  const tagsMap = useMemo(() => {
    const map = new Map<string, Tag>();
    tagsData?.data?.forEach((t) => map.set(t.id, t));
    return map;
  }, [tagsData]);

  // KPI stats
  const stats = useMemo(() => {
    const leads = allContacts.filter((c) => c.status === "Lead").length;
    const qualified = allContacts.filter((c) => c.status === "Qualified" || c.status === "Proposal" || c.status === "Negotiation").length;
    const won = allContacts.filter((c) => c.status === "Won").length;
    const totalValue = allContacts.reduce((s, c) => s + (c.dealValue || 0), 0);
    return { total: allContacts.length, leads, qualified, won, totalValue };
  }, [allContacts]);

  return (
    <ListView>
      <ListViewHeader title="Contacts">
        <Button
          onClick={() => go?.({ to: { resource: "contacts", action: "create" } })}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-200/50 transition-all duration-300">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </ListViewHeader>

      <div className="space-y-6 p-4 sm:p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-500">Total Contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-slate-50 to-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.leads}</p>
                  <p className="text-xs text-slate-500">Leads</p>
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
                  <p className="text-2xl font-bold text-slate-900">{stats.won}</p>
                  <p className="text-xs text-slate-500">Won</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-violet-50 to-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{format(stats.totalValue)}</p>
                  <p className="text-xs text-slate-500">Pipeline Value</p>
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
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Lead">Lead</SelectItem>
              <SelectItem value="Qualified">Qualified</SelectItem>
              <SelectItem value="Proposal">Proposal</SelectItem>
              <SelectItem value="Negotiation">Negotiation</SelectItem>
              <SelectItem value="Won">Won</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="h-16 w-16 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium">No contacts found</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || statusFilter !== "all" ? "Try adjusting your filters" : "Add your first contact to get started"}
            </p>
            {!search && statusFilter === "all" && (
              <Button
                onClick={() => go?.({ to: { resource: "contacts", action: "create" } })}
                className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ──── Card Grid View ──── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedContacts.map((contact) => {
              const company = companiesMap.get(contact.companyId);
              const contactTags = contact.tagIds
                ?.map((id) => tagsMap.get(id))
                .filter(Boolean) as Tag[];
              const statusColor = STATUS_COLORS[contact.status] || STATUS_COLORS.Lead;

              return (
                <div
                  key={contact.id}
                  onClick={() => go?.({ to: { resource: "contacts", action: "show", id: contact.id } })}
                  className="group relative bg-white border border-slate-200/80 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/40 hover:-translate-y-0.5">
                  {/* Status indicator bar */}
                  <div className={`absolute top-0 left-4 right-4 h-0.5 rounded-full ${statusColor.dot} opacity-60`} />

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getAvatarGradient(contact.name)} flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0`}>
                      {getInitials(contact.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                        {contact.name}
                      </h3>
                      {company && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-500 truncate">{company.name}</span>
                        </div>
                      )}
                    </div>
                    <Badge className={`${statusColor.bg} ${statusColor.text} border-0 text-[10px] font-medium flex-shrink-0`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot} mr-1`} />
                      {statusColor.label}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {contactTags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {contactTags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                          style={{
                            backgroundColor: tag.color + "15",
                            color: tag.color,
                            borderColor: tag.color + "30",
                          }}>
                          {tag.name}
                        </Badge>
                      ))}
                      {contactTags.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          +{contactTags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm font-semibold text-slate-900">
                      {format(contact.dealValue || 0)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          go?.({ to: { resource: "contacts", action: "edit", id: contact.id } });
                        }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DeleteButton resource="contacts" recordItemId={contact.id} size="sm" variant="ghost" className="h-7 w-7 p-0" />
                      </div>
                    </div>
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
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Company</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Stage</TableHead>
                  <TableHead className="font-semibold">Tags</TableHead>
                  <TableHead className="font-semibold text-right">Deal Value</TableHead>
                  <TableHead className="font-semibold w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedContacts.map((contact) => {
                  const company = companiesMap.get(contact.companyId);
                  const contactTags = contact.tagIds
                    ?.map((id) => tagsMap.get(id))
                    .filter(Boolean) as Tag[];
                  const statusColor = STATUS_COLORS[contact.status] || STATUS_COLORS.Lead;

                  return (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                      onClick={() => go?.({ to: { resource: "contacts", action: "show", id: contact.id } })}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${getAvatarGradient(contact.name)} flex items-center justify-center text-white text-xs font-semibold shadow-sm`}>
                            {getInitials(contact.name)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{contact.name}</p>
                            <p className="text-xs text-slate-500">{contact.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {company ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm">{company.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{contact.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColor.bg} ${statusColor.text} border-0 text-xs`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot} mr-1`} />
                          {statusColor.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contactTags?.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                              style={{
                                backgroundColor: tag.color + "15",
                                color: tag.color,
                              }}>
                              {tag.name}
                            </Badge>
                          ))}
                          {contactTags?.length > 2 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{contactTags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">{format(contact.dealValue || 0)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => go?.({ to: { resource: "contacts", action: "edit", id: contact.id } })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <DeleteButton resource="contacts" recordItemId={contact.id} size="sm" variant="ghost" className="h-7 w-7 p-0" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredContacts.length)} of {filteredContacts.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    className="w-8"
                    onClick={() => setPage(pageNum)}>
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </ListView>
  );
}

export default ContactsListPage;
