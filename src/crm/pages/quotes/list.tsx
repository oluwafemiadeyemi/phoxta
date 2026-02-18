import { useState, useMemo } from "react";
import { useList, useMany, useGo } from "@refinedev/core";
import { useNavigate } from "react-router";
import { useCurrency } from "@crm/hooks/use-currency";
import { ListView, ListViewHeader } from "@crm/components/refine-ui/views/list-view";
import { DeleteButton } from "@crm/components/refine-ui/buttons/delete";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import { Card, CardContent } from "@crm/components/ui/card";
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
import {
  FileText,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  User,
} from "lucide-react";
import type { Quote, Contact, Company } from "@crm/types";
import dayjs from "dayjs";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; icon: React.ElementType }> = {
  Draft: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500", icon: Clock },
  Sent: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", icon: Send },
  Accepted: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", icon: CheckCircle2 },
  Rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", icon: XCircle },
  Expired: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", icon: AlertTriangle },
};

function computeGrandTotal(quote: Quote): number {
  const rawValue = quote.grandTotal;
  if (Number.isFinite(rawValue)) return rawValue as number;
  const lineSubtotal = Array.isArray(quote.lineItems)
    ? quote.lineItems.reduce((sum, item) => sum + (Number(item.total ?? 0) || 0), 0)
    : 0;
  const sub = Number(quote.subtotal ?? lineSubtotal) || lineSubtotal;
  const tax = (sub * (Number(quote.taxRate ?? 0) || 0)) / 100;
  const disc = Number(quote.discount ?? 0) || 0;
  return Math.max(0, sub + tax - disc);
}

function QuotesListPage() {
  const go = useGo();
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Fetch all quotes
  const {
    result: { data: allQuotes = [] },
    query: { isLoading },
  } = useList<Quote>({
    resource: "quotes",
    pagination: { mode: "off" },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  // Filter
  const filteredQuotes = useMemo(() => {
    let result = allQuotes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((qu) => qu.quoteNumber?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      result = result.filter((qu) => qu.status === statusFilter);
    }
    return result;
  }, [allQuotes, search, statusFilter]);

  const totalPages = Math.ceil(filteredQuotes.length / pageSize);
  const paginatedQuotes = filteredQuotes.slice((page - 1) * pageSize, page * pageSize);

  // Related IDs
  const contactIds = useMemo(() => [...new Set(allQuotes.map((q) => q.contactId).filter(Boolean))], [allQuotes]);
  const companyIds = useMemo(() => [...new Set(allQuotes.map((q) => q.companyId).filter(Boolean))], [allQuotes]);

  const { result: contactsData } = useMany<Contact>({
    resource: "contacts",
    ids: contactIds,
    queryOptions: { enabled: contactIds.length > 0 },
  });
  const contactsMap = useMemo(() => {
    const m = new Map<string, Contact>();
    contactsData?.data?.forEach((c) => m.set(c.id, c));
    return m;
  }, [contactsData]);

  const { result: companiesData } = useMany<Company>({
    resource: "companies",
    ids: companyIds,
    queryOptions: { enabled: companyIds.length > 0 },
  });
  const companiesMap = useMemo(() => {
    const m = new Map<string, Company>();
    companiesData?.data?.forEach((c) => m.set(c.id, c));
    return m;
  }, [companiesData]);

  // Stats
  const stats = useMemo(() => {
    const totalValue = allQuotes.reduce((s, q) => s + computeGrandTotal(q), 0);
    return {
      total: allQuotes.length,
      draft: allQuotes.filter((q) => q.status === "Draft").length,
      sent: allQuotes.filter((q) => q.status === "Sent").length,
      accepted: allQuotes.filter((q) => q.status === "Accepted").length,
      totalValue,
    };
  }, [allQuotes]);

  return (
    <ListView>
      <ListViewHeader title="Quotes">
        <Button
          onClick={() => go?.({ to: { resource: "quotes", action: "create" } })}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-200/50 transition-all duration-300">
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </ListViewHeader>

      <div className="space-y-6 p-4 sm:p-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-500">Total Quotes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-slate-50 to-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.draft}</p>
                  <p className="text-xs text-slate-500">Drafts</p>
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
                  <p className="text-2xl font-bold text-slate-900">{stats.accepted}</p>
                  <p className="text-xs text-slate-500">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-violet-50 to-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{format(stats.totalValue)}</p>
                  <p className="text-xs text-slate-500">Total Value</p>
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
              placeholder="Search by quote number..."
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
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <Card className="border-slate-200/80">
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-slate-100 rounded" />
              ))}
            </div>
          </Card>
        ) : paginatedQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText className="h-16 w-16 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium">No quotes found</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first quote to get started"}
            </p>
            {!search && statusFilter === "all" && (
              <Button
                onClick={() => go?.({ to: { resource: "quotes", action: "create" } })}
                className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Quote
              </Button>
            )}
          </div>
        ) : (
          <Card className="border-slate-200/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold">Quote #</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Company</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedQuotes.map((quote) => {
                  const contact = contactsMap.get(quote.contactId);
                  const company = companiesMap.get(quote.companyId);
                  const statusConf = STATUS_CONFIG[quote.status] || STATUS_CONFIG.Draft;
                  const total = computeGrandTotal(quote);

                  return (
                    <TableRow
                      key={quote.id}
                      className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                      onClick={() => navigate(`/quotes/show/${quote.id}`)}>
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-blue-700">
                          {quote.quoteNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        {contact ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm">{contact.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
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
                      <TableCell>
                        <Badge className={`${statusConf.bg} ${statusConf.text} border-0 text-xs`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot} mr-1`} />
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-sm text-slate-900">{format(total)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {dayjs(quote.quoteDate).format("MMM D, YYYY")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DeleteButton resource="quotes" recordItemId={quote.id} size="sm" variant="ghost" className="h-7 w-7 p-0" />
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
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredQuotes.length)} of {filteredQuotes.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </ListView>
  );
}

export default QuotesListPage;
