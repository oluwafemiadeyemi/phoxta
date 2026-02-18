import { useShow, useOne, useList, useGo } from "@refinedev/core";
import { ShowView, ShowViewHeader } from "@crm/components/refine-ui/views/show-view";
import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import { Separator } from "@crm/components/ui/separator";
import {
  Mail,
  Phone,
  Building2,
  Coins,
  Briefcase,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  Tag,
  Pencil,
} from "lucide-react";
import type { Contact, Company, Tag as TagType, Deal } from "@crm/types";
import { useCurrency } from "@crm/hooks/use-currency";
import dayjs from "dayjs";

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

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Lead: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" },
  Qualified: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  Proposal: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  Negotiation: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  Won: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  Lost: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ContactShowPage() {
  const go = useGo();
  const { format } = useCurrency();
  const {
    query: { data, isLoading },
  } = useShow<Contact>();

  const contact = data?.data;

  const { result: company } = useOne<Company>({
    resource: "companies",
    id: contact?.companyId || "",
    queryOptions: { enabled: !!contact?.companyId },
  });

  const {
    result: { data: tags = [] },
  } = useList<TagType>({
    resource: "tags",
    filters: [{ field: "id", operator: "in", value: contact?.tagIds || [] }],
    queryOptions: { enabled: !!contact && contact.tagIds.length > 0 },
  });

  const {
    result: { data: deals = [] },
  } = useList<Deal>({
    resource: "deals",
    filters: [{ field: "contactId", operator: "eq", value: contact?.id || "" }],
    queryOptions: { enabled: !!contact?.id },
  });

  if (isLoading || !contact) {
    return (
      <ShowView>
        <ShowViewHeader title="Loading..." />
        <div className="animate-pulse space-y-6 p-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-slate-200" />
            <div className="space-y-3 flex-1">
              <div className="h-6 w-48 bg-slate-200 rounded" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </ShowView>
    );
  }

  const totalDealValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const wonDeals = deals.filter((d) => d.status === "Won");
  const activeDeals = deals.filter((d) => !["Won", "Lost"].includes(d.status));
  const statusColor = STATUS_COLORS[contact.status] || STATUS_COLORS.Lead;

  return (
    <ShowView>
      <ShowViewHeader title={contact.name} />
      <div className="space-y-6 p-4 sm:p-6">
        {/* Profile Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8">
          {/* Decorative gradient orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className={`h-20 w-20 rounded-full bg-gradient-to-br ${getAvatarGradient(contact.name)} flex items-center justify-center text-white text-2xl font-bold shadow-xl ring-4 ring-white/10`}>
              {getInitials(contact.name)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white truncate">{contact.name}</h1>
                <Badge className={`${statusColor.bg} ${statusColor.text} border-0`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot} mr-1`} />
                  {contact.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{contact.email}</span>
                </div>
                {contact.phone && (
                  <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {company && (
                  <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{company.name}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      className="text-xs border-0"
                      style={{
                        backgroundColor: tag.color + "25",
                        color: tag.color,
                      }}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Edit button */}
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              onClick={() => go?.({ to: { resource: "contacts", action: "edit", id: contact.id } })}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{format(totalDealValue)}</p>
                  <p className="text-xs text-slate-500">Total Value</p>
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
                  <p className="text-xl font-bold text-slate-900">{deals.length}</p>
                  <p className="text-xs text-slate-500">Total Deals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{wonDeals.length}</p>
                  <p className="text-xs text-slate-500">Won</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-amber-50 to-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{activeDeals.length}</p>
                  <p className="text-xs text-slate-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deals Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deals List */}
          <Card className="lg:col-span-2 border-slate-200/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Deals</CardTitle>
                <Badge variant="secondary" className="text-xs">{deals.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {deals.length > 0 ? (
                <div className="space-y-3">
                  {deals.map((deal) => {
                    const dealStatusColor = STATUS_COLORS[deal.status] || STATUS_COLORS.Lead;
                    return (
                      <div
                        key={deal.id}
                        className="group flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all"
                        onClick={() => go?.({ to: { resource: "deals", action: "show", id: deal.id } })}>
                        <div className={`h-2 w-2 rounded-full ${dealStatusColor.dot} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                            {deal.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {dayjs(deal.createdAt).format("MMM D, YYYY")}
                          </p>
                        </div>
                        <Badge className={`${dealStatusColor.bg} ${dealStatusColor.text} border-0 text-xs flex-shrink-0`}>
                          {deal.status}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-900 flex-shrink-0">{format(deal.value)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No deals yet</p>
                  <p className="text-xs text-slate-400 mt-1">Deals linked to this contact will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Details Sidebar */}
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:underline truncate">
                    {contact.email}
                  </a>
                </div>
              </div>

              {contact.phone && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      <a href={`tel:${contact.phone}`} className="text-sm text-slate-700 hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                </>
              )}

              {company && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Company</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-violet-500" />
                      <span className="text-sm font-medium text-slate-700">{company.name}</span>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">Pipeline Stage</p>
                <Badge className={`${statusColor.bg} ${statusColor.text} border-0`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot} mr-1`} />
                  {contact.status}
                </Badge>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">Deal Value</p>
                <p className="text-lg font-bold text-slate-900">{format(contact.dealValue || 0)}</p>
              </div>

              {contact.createdAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Added</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {dayjs(contact.createdAt).format("MMM D, YYYY")}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Tags</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: tag.color + "15",
                            color: tag.color,
                            borderColor: tag.color + "30",
                          }}>
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ShowView>
  );
}
