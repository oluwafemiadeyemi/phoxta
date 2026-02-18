import { useShow, useOne, useList } from "@refinedev/core";
import { useCurrency } from "@crm/hooks/use-currency";
import { ShowView, ShowViewHeader } from "@crm/components/refine-ui/views/show-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { Separator } from "@crm/components/ui/separator";
import { Mail, Phone, Tag, Briefcase, Coins, Calendar, FileText, Plus } from "lucide-react";
import type { Contact, Company, Tag as TagType, Deal, Quote } from "@crm/types";
import { Button } from "@crm/components/ui/button";
import { useNavigate } from "react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@crm/components/ui/table";

const DEAL_STATUS_CONFIG = {
  Lead: { color: "#64748b", label: "Lead" },
  Qualified: { color: "#3b82f6", label: "Qualified" },
  Proposal: { color: "#8b5cf6", label: "Proposal" },
  Negotiation: { color: "#f59e0b", label: "Negotiation" },
  Won: { color: "#10b981", label: "Won" },
  Lost: { color: "#ef4444", label: "Lost" },
};

const quoteStatusColors = {
  Draft: "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300",
  Sent: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300",
  Accepted: "bg-green-100 text-green-800 hover:bg-green-100 border-green-300",
  Rejected: "bg-red-100 text-red-800 hover:bg-red-100 border-red-300",
  Expired: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300",
};

export default function DealShowPage() {
  const navigate = useNavigate();
  const { format } = useCurrency();

  const {
    query: { data, isLoading },
  } = useShow<Deal>();

  const deal = data?.data;

  const { result: contact } = useOne<Contact>({
    resource: "contacts",
    id: deal?.contactId || "",
    queryOptions: {
      enabled: !!deal?.contactId,
    },
  });

  const { result: company } = useOne<Company>({
    resource: "companies",
    id: contact?.companyId || "",
    queryOptions: {
      enabled: !!contact?.companyId,
    },
  });

  const {
    result: { data: tags = [] },
  } = useList<TagType>({
    resource: "tags",
    filters: [
      {
        field: "id",
        operator: "in",
        value: deal?.tagIds || [],
      },
    ],
    queryOptions: {
      enabled: !!deal && deal.tagIds.length > 0,
    },
  });


  // Fetch quotes associated with this deal
  const {
    result: { data: quotes = [] },
  } = useList<Quote>({
    resource: "quotes",
    filters: [
      {
        field: "dealId",
        operator: "eq",
        value: deal?.id || "",
      },
    ],
    queryOptions: {
      enabled: !!deal?.id,
    },
  });

  if (isLoading || !deal) {
    return (
      <ShowView>
        <ShowViewHeader title="Loading..." />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </ShowView>
    );
  }

  const statusConfig = DEAL_STATUS_CONFIG[deal.status as keyof typeof DEAL_STATUS_CONFIG];

  return (
    <ShowView>
      <ShowViewHeader title={`Deal #${deal.id.slice(0, 8)}`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Details - Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
              <CardDescription>Deal details and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                  <Coins className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Deal Value</p>
                  <p className="text-xl font-bold">
                    {format(deal.value)}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Status</p>
                <Badge
                  style={{
                    backgroundColor: statusConfig.color + "20",
                    color: statusConfig.color,
                    borderColor: statusConfig.color + "40",
                  }}>
                  {statusConfig.label}
                </Badge>
              </div>

              {contact && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                    </div>
                  </div>
                </>
              )}

              {contact?.phone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{contact.phone}</p>
                  </div>
                </div>
              )}

              {company && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="text-sm font-medium">{company.name}</p>
                    {company.industry && <p className="text-xs text-muted-foreground">{company.industry}</p>}
                  </div>
                </div>
              )}

              {tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Tags</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          style={{
                            backgroundColor: tag.color + "20",
                            color: tag.color,
                            borderColor: tag.color + "40",
                          }}>
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{new Date(deal.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Quotes</p>
                  <p className="text-lg font-bold">{quotes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity Timeline and Quotes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quotes Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quotes</CardTitle>
                  <CardDescription>Quotes associated with this deal</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(`/quotes/create?dealId=${deal.id}&contactId=${deal.contactId}&companyId=${deal.companyId}`)
                  }>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quote
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No quotes yet</p>
                  <p className="text-xs">Create a quote for this deal to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                          <TableCell>
                            {new Date(quote.quoteDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {format(quote.grandTotal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={quoteStatusColors[quote.status]}>
                              {quote.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/quotes/show/${quote.id}`)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </ShowView>
  );
}
