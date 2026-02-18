import { useMemo, useState } from "react";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useList, useGo } from "@refinedev/core";
import { DataTable } from "@crm/components/refine-ui/data-table/data-table";
import { ListView, ListViewHeader } from "@crm/components/refine-ui/views/list-view";
import { Badge } from "@crm/components/ui/badge";
import { DeleteButton } from "@crm/components/refine-ui/buttons/delete";
import type { Company, Contact } from "@crm/types";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Globe, Users, Building2, Plus, Search, ArrowUpRight, LayoutGrid, List, MapPin, Briefcase } from "lucide-react";

function CompaniesListPage() {
  const go = useGo();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch all contacts to count contacts per company
  const { result: contactsData } = useList<Contact>({
    resource: "contacts",
    pagination: {
      mode: "off",
    },
  });

  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Company Name",
        cell: ({ getValue }) => {
          return <div className="font-medium">{getValue() as string}</div>;
        },
      },
      {
        id: "industry",
        accessorKey: "industry",
        header: "Industry",
        cell: ({ getValue }) => {
          const industry = getValue() as string;
          return (
            <Badge variant="outline" className="font-normal">
              {industry}
            </Badge>
          );
        },
      },
      {
        id: "contactCount",
        header: "Contacts",
        cell: ({ row }) => {
          const companyId = row.original.id;
          const contactCount =
            contactsData?.data?.filter((contact: Contact) => contact.companyId === companyId).length ?? 0;
          return <div className="text-muted-foreground">{contactCount}</div>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return <DeleteButton resource="companies" recordItemId={row.original.id} size="sm" variant="ghost" />;
        },
      },
    ],
    [contactsData],
  );

  const table = useTable<Company>({
    columns,
  });

  const {
    refineCore: {
      tableQuery: { data: tableData, isLoading },
    },
  } = table;

  const companies = tableData?.data || [];

  // Filter companies by search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  // Industry icon & color mapping
  const getIndustryConfig = (industry: string) => {
    const map: Record<string, { gradient: string; iconBg: string; iconText: string; badge: string }> = {
      "SaaS": { gradient: "from-blue-500/10 via-transparent to-cyan-500/5", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconText: "text-blue-600 dark:text-blue-400", badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800" },
      "E-commerce": { gradient: "from-emerald-500/10 via-transparent to-green-500/5", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconText: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" },
      "Healthcare": { gradient: "from-rose-500/10 via-transparent to-pink-500/5", iconBg: "bg-rose-100 dark:bg-rose-900/40", iconText: "text-rose-600 dark:text-rose-400", badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800" },
      "Finance": { gradient: "from-violet-500/10 via-transparent to-purple-500/5", iconBg: "bg-violet-100 dark:bg-violet-900/40", iconText: "text-violet-600 dark:text-violet-400", badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800" },
      "Education": { gradient: "from-amber-500/10 via-transparent to-orange-500/5", iconBg: "bg-amber-100 dark:bg-amber-900/40", iconText: "text-amber-600 dark:text-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800" },
      "Manufacturing": { gradient: "from-slate-500/10 via-transparent to-gray-500/5", iconBg: "bg-slate-100 dark:bg-slate-800/40", iconText: "text-slate-600 dark:text-slate-400", badge: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/50 dark:text-slate-300 dark:border-slate-700" },
    };
    return map[industry] || { gradient: "from-slate-500/10 via-transparent to-gray-500/5", iconBg: "bg-slate-100 dark:bg-slate-800/40", iconText: "text-slate-600 dark:text-slate-400", badge: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/50 dark:text-slate-300 dark:border-slate-700" };
  };

  return (
    <ListView>
      <ListViewHeader title="Companies">
        <Button
          onClick={() => go?.({ to: { resource: "companies", action: "create" } })}
          className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          New Company
        </Button>
      </ListViewHeader>

      <div className="w-full">
        {/* Search & View Toggle Bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border/40">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/30">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">{filteredCompanies.length} companies</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading companies...</p>
            </div>
          </div>
        ) : filteredCompanies.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6" : "flex flex-col gap-2 p-4 sm:p-6"}>
            {filteredCompanies.map((company) => {
              const contactCount =
                contactsData?.data?.filter((contact: Contact) => contact.companyId === company.id).length ?? 0;
              const config = getIndustryConfig(company.industry);

              if (viewMode === "list") {
                return (
                  <div
                    key={company.id}
                    onClick={() => go?.({ to: { resource: "companies", action: "edit", id: company.id } })}
                    className="group flex items-center gap-4 p-3 rounded-xl border border-border/60 bg-background hover:border-border hover:shadow-sm cursor-pointer transition-all">
                    <div className={`h-10 w-10 rounded-lg ${config.iconBg} flex items-center justify-center shrink-0`}>
                      <Building2 className={`h-5 w-5 ${config.iconText}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{company.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] h-5 ${config.badge}`}>{company.industry}</Badge>
                        <span className="text-xs text-muted-foreground">{contactCount} contacts</span>
                        {company.website && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:block">{company.website.replace(/https?:\/\//i, "")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); go?.({ to: { resource: "companies", action: "edit", id: company.id } }); }}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DeleteButton resource="companies" recordItemId={company.id} size="sm" variant="ghost" />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={company.id}
                  onClick={() => go?.({ to: { resource: "companies", action: "edit", id: company.id } })}
                  className={`group relative bg-background border border-border/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-border hover:shadow-md`}>
                  {/* Subtle gradient bg */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} pointer-events-none`} />

                  <div className="relative p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-3">
                        <h3 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {company.name}
                        </h3>
                        <Badge variant="outline" className={`mt-1.5 text-[11px] ${config.badge}`}>
                          {company.industry}
                        </Badge>
                      </div>
                      <div className={`h-11 w-11 rounded-xl ${config.iconBg} flex items-center justify-center shrink-0`}>
                        <Building2 className={`h-5 w-5 ${config.iconText}`} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{contactCount}</span>
                        <span className="text-xs text-muted-foreground">contacts</span>
                      </div>
                      {company.website && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{company.website.replace(/https?:\/\//i, "")}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-border/40">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          go?.({ to: { resource: "companies", action: "edit", id: company.id } });
                        }}
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs">
                        Edit
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DeleteButton resource="companies" recordItemId={company.id} size="sm" variant="ghost" className="h-8" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 p-6">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-foreground text-lg font-semibold">
              {searchQuery ? "No companies found" : "No companies yet"}
            </p>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
              {searchQuery ? `No results for "${searchQuery}". Try a different search.` : "Create your first company to start managing your accounts."}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => go?.({ to: { resource: "companies", action: "create" } })}
                className="mt-5 gap-2">
                <Plus className="h-4 w-4" />
                Create Company
              </Button>
            )}
          </div>
        )}
      </div>
    </ListView>
  );
}

export default CompaniesListPage;
