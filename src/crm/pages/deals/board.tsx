import { useList, useMany, useUpdate } from "@refinedev/core";
import { useNavigation } from "@refinedev/core";
import { useCurrency } from "@crm/hooks/use-currency";
import { Badge } from "@crm/components/ui/badge";
import { Card } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { logEngagementEvent } from "@crm/lib/engagement";
import {
  DndContext,
  closestCorners,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Coins, User, Briefcase, Eye, FileText, Plus, Search, TrendingUp, Target, DollarSign, BarChart3, GripVertical } from "lucide-react";
import type { Deal, Contact, Company, Tag, PipelineStage, Quote } from "@crm/types";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@crm/components/ui/dialog";
import { DealForm } from "@crm/pages/deals/form";
import { Input } from "@crm/components/ui/input";

const pipelineStages: PipelineStage["name"][] = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

const stageConfig: Record<PipelineStage["name"], { accent: string; bg: string; border: string; dot: string; headerBg: string; headerText: string; dropRing: string }> = {
  Lead: { accent: "from-slate-500 to-slate-600", bg: "bg-slate-50/50", border: "border-slate-200/60", dot: "bg-slate-500", headerBg: "bg-slate-500", headerText: "text-white", dropRing: "ring-slate-400" },
  Qualified: { accent: "from-blue-500 to-blue-600", bg: "bg-blue-50/30", border: "border-blue-200/60", dot: "bg-blue-500", headerBg: "bg-blue-500", headerText: "text-white", dropRing: "ring-blue-400" },
  Proposal: { accent: "from-violet-500 to-purple-600", bg: "bg-violet-50/30", border: "border-violet-200/60", dot: "bg-violet-500", headerBg: "bg-violet-500", headerText: "text-white", dropRing: "ring-violet-400" },
  Negotiation: { accent: "from-amber-500 to-orange-500", bg: "bg-amber-50/30", border: "border-amber-200/60", dot: "bg-amber-500", headerBg: "bg-amber-500", headerText: "text-white", dropRing: "ring-amber-400" },
  Won: { accent: "from-emerald-500 to-green-600", bg: "bg-emerald-50/30", border: "border-emerald-200/60", dot: "bg-emerald-500", headerBg: "bg-emerald-500", headerText: "text-white", dropRing: "ring-emerald-400" },
  Lost: { accent: "from-red-500 to-rose-600", bg: "bg-red-50/30", border: "border-red-200/60", dot: "bg-red-500", headerBg: "bg-red-500", headerText: "text-white", dropRing: "ring-red-400" },
};

const quoteStatusColors = {
  Draft: "bg-gray-100 text-gray-700 border-gray-300",
  Sent: "bg-blue-100 text-blue-700 border-blue-300",
  Accepted: "bg-green-100 text-green-700 border-green-300",
  Rejected: "bg-red-100 text-red-700 border-red-300",
  Expired: "bg-orange-100 text-orange-700 border-orange-300",
};

function DealCard({
  deal,
  contact,
  company,
  tags,
  quote,
  isDragging = false,
  onViewDetails,
}: {
  deal: Deal;
  contact?: Contact;
  company?: Company;
  tags?: Tag[];
  quote?: Quote;
  isDragging?: boolean;
  onViewDetails?: () => void;
}) {
  const { format } = useCurrency();
  const config = stageConfig[deal.status as PipelineStage["name"]] ?? stageConfig.Lead;

  const dealAge = deal.createdAt
    ? Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card
      className={`group relative mb-3 bg-background border border-border/60 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-border hover:shadow-md ${isDragging ? "opacity-40 scale-95" : ""}`}>
      {/* Top accent line */}
      <div className={`absolute top-0 left-3 right-3 h-0.5 rounded-b-full bg-gradient-to-r ${config.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />

      <div className="p-3.5 space-y-2.5">
        {/* Title + drag handle */}
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{deal.title}</h4>
            {dealAge > 0 && (
              <span className="text-[10px] text-muted-foreground mt-0.5 block">{dealAge}d in pipeline</span>
            )}
          </div>
        </div>

        {/* Value chip */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
            <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{format(deal.value)}</span>
          </div>
        </div>

        {/* Contact & Company */}
        {(contact || company) && (
          <div className="space-y-1.5">
            {contact && (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">{contact.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{contact.name}</p>
                </div>
              </div>
            )}
            {company && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Briefcase className="h-3 w-3 shrink-0" />
                <span className="truncate">{company.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Quote info */}
        {quote && (
          <div className="p-2 rounded-lg bg-muted/50 border border-border/40 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="font-medium">{quote.quoteNumber}</span>
              </div>
              <Badge variant="outline" className={`text-[10px] h-5 ${quoteStatusColors[quote.status]}`}>
                {quote.status}
              </Badge>
            </div>
            <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">{format(quote.grandTotal)}</div>
          </div>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: tag.color + "15",
                  color: tag.color,
                }}>
                {tag.name}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground px-1">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* View button - shows on hover */}
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}>
            <Eye className="h-3 w-3 mr-1" />
            View Details
          </Button>
        )}
      </div>
    </Card>
  );
}

function DraggableDealCard({
  deal,
  contact,
  company,
  tags,
  quote,
  onViewDetails,
}: {
  deal: Deal;
  contact?: Contact;
  company?: Company;
  tags?: Tag[];
  quote?: Quote;
  onViewDetails?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: deal.id,
    data: {
      type: "deal",
      stage: deal.status,
      deal,
      contact,
      company,
      tags,
      quote,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <div
        className={`transition-all duration-200 ${
          isDragging ? "ring-2 ring-primary/40 shadow-2xl rounded-xl scale-[1.02]" : ""
        }`}
      >
        <DealCard
          deal={deal}
          contact={contact}
          company={company}
          tags={tags}
          quote={quote}
          isDragging={isDragging}
          onViewDetails={onViewDetails}
        />
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  deals,
  contacts,
  companies,
  tags,
  quotes,
  onViewDetails,
  orderedDealIds,
}: {
  stage: PipelineStage["name"];
  deals: Deal[];
  contacts?: Contact[];
  companies?: Company[];
  tags?: Tag[];
  quotes: Quote[];
  onViewDetails: (dealId: string) => void;
  orderedDealIds?: string[];
}) {
  const { formatCompact } = useCurrency();
  const config = stageConfig[stage];
  const stageDeals = deals.filter((deal) => deal.status === stage);
  const totalValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);

  const stageDealIds = useMemo(() => {
    const idsInStage = new Set(stageDeals.map((d) => d.id));
    const ordered = (orderedDealIds ?? []).filter((id) => idsInStage.has(id));
    const missing = stageDeals
      .filter((d) => !ordered.includes(d.id))
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
      .map((d) => d.id);
    return [...ordered, ...missing];
  }, [orderedDealIds, stageDeals]);

  const orderedStageDeals = useMemo(() => {
    const byId = new Map(stageDeals.map((d) => [d.id, d] as const));
    return stageDealIds.map((id) => byId.get(id)).filter(Boolean) as Deal[];
  }, [stageDealIds, stageDeals]);

  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: "column",
      stage,
    },
  });

  return (
    <div ref={setNodeRef} className="flex flex-col min-w-[280px] sm:min-w-[300px] max-w-[300px]">
      {/* Column header */}
      <div className="px-3 py-3 rounded-t-xl bg-background border border-b-0 border-border/60">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
            <h2 className="font-semibold text-sm text-foreground">{stage}</h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {stageDeals.length}
          </span>
        </div>
        <div className="text-xs font-medium text-muted-foreground pl-[18px]">
          {formatCompact(totalValue)}
        </div>
      </div>

      {/* Column body */}
      <div
        className={`flex-1 px-2 py-2 rounded-b-xl border border-t-0 border-border/60 ${config.bg} min-h-[500px] transition-all duration-200 ${
          isOver ? `ring-2 ${config.dropRing} ring-offset-1 bg-opacity-80` : ""
        }`}>
        <SortableContext items={stageDealIds} strategy={verticalListSortingStrategy}>
          {orderedStageDeals.map((deal) => {
          const contact = contacts?.find((c) => c.id === deal.contactId);
          const company = companies?.find((c) => c.id === deal.companyId);
          const dealTags = tags?.filter((t) => deal.tagIds.includes(t.id));
          const dealQuote = quotes.find((q) => q.dealId === deal.id);

          return (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              contact={contact}
              company={company}
              tags={dealTags}
              quote={dealQuote}
              onViewDetails={() => onViewDetails(deal.id)}
            />
          );
          })}
        </SortableContext>

        {stageDeals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground">No deals yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DealsBoardPage() {
  type StageName = PipelineStage["name"];
  const STORAGE_KEY = "dealsBoard.dealOrderByStage.v1";

  const [activeDeal, setActiveDeal] = useState<{
    deal: Deal;
    contact?: Contact;
    company?: Company;
    tags?: Tag[];
    quote?: Quote;
  } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { mutate: updateDeal } = useUpdate<Deal>();
  const { show } = useNavigation();

  const [dealOrderByStage, setDealOrderByStage] = useState<Record<StageName, string[]>>(() => {
    const empty: Record<StageName, string[]> = {
      Lead: [],
      Qualified: [],
      Proposal: [],
      Negotiation: [],
      Won: [],
      Lost: [],
    };

    if (typeof window === "undefined") return empty;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return empty;
      const parsed = JSON.parse(raw) as Partial<Record<StageName, string[]>>;
      const sanitized = Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : []]),
      );
      return { ...empty, ...(sanitized as Partial<Record<StageName, string[]>>) } as Record<StageName, string[]>;
    } catch {
      return empty;
    }
  });

  const {
    result: { data: deals = [] },
    query: { isLoading: dealsLoading, refetch: refetchDeals },
  } = useList<Deal>({
    resource: "deals",
    pagination: {
      mode: "off",
    },
  });

  const [localDeals, setLocalDeals] = useState<Deal[] | null>(null);

  useEffect(() => {
    setLocalDeals(deals);
  }, [deals]);

  const displayDeals = localDeals ?? deals;

  const contactIds = [...new Set(deals.map((deal: Deal) => deal.contactId))].filter(Boolean) as string[];
  const companyIds = [...new Set(deals.map((deal: Deal) => deal.companyId))].filter(Boolean) as string[];
  const tagIds = [...new Set(deals.flatMap((deal: Deal) => deal.tagIds))].filter(Boolean) as string[];

  const {
    result: { data: contacts = [] },
    query: { isLoading: contactsLoading },
  } = useMany<Contact>({
    resource: "contacts",
    ids: contactIds,
    queryOptions: {
      enabled: contactIds.length > 0,
    },
  });

  const {
    result: { data: companies = [] },
    query: { isLoading: companiesLoading },
  } = useMany<Company>({
    resource: "companies",
    ids: companyIds,
    queryOptions: {
      enabled: companyIds.length > 0,
    },
  });

  const {
    result: { data: tags = [] },
    query: { isLoading: tagsLoading },
  } = useMany<Tag>({
    resource: "tags",
    ids: tagIds,
    queryOptions: {
      enabled: tagIds.length > 0,
    },
  });


  const {
    result: { data: quotes = [] },
  } = useList<Quote>({
    resource: "quotes",
    pagination: {
      mode: "off",
    },
  });

  const isLoading = dealsLoading || contactsLoading || companiesLoading || tagsLoading;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
  );

  const dealsById = useMemo(() => new Map(displayDeals.map((d) => [d.id, d] as const)), [displayDeals]);

  useEffect(() => {
    if (!displayDeals.length) return;
    setDealOrderByStage((prev) => {
      const next: Record<StageName, string[]> = { ...prev } as Record<StageName, string[]>;
      for (const stage of pipelineStages) {
        const idsInStage = displayDeals.filter((d) => d.status === stage).map((d) => d.id);
        const setInStage = new Set(idsInStage);
        const kept = (next[stage] ?? []).filter((id) => setInStage.has(id));
        const missing = idsInStage.filter((id) => !kept.includes(id));
        next[stage] = [...kept, ...missing];
      }
      return next;
    });
  }, [displayDeals]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dealOrderByStage));
    } catch {
      // ignore
    }
  }, [dealOrderByStage]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dealId = String(active.id);
    const deal = dealsById.get(dealId);
    if (!deal) return;
    const contact = contacts?.find((c) => c.id === deal.contactId);
    const company = companies?.find((c) => c.id === deal.companyId);
    const dealTags = tags?.filter((t) => deal.tagIds.includes(t.id));
    const quote = quotes.find((q) => q.dealId === deal.id);
    setActiveDeal({ deal, contact, company, tags: dealTags, quote });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeData = active.data.current as { type?: string; stage?: StageName } | undefined;
    const overData = over.data.current as { type?: string; stage?: StageName } | undefined;

    const fromStage = (activeData?.stage ?? dealsById.get(activeId)?.status) as StageName | undefined;
    const toStage = (overData?.type === "column"
      ? ((overData.stage ?? overId) as StageName)
      : (overData?.stage ?? dealsById.get(overId)?.status)) as StageName | undefined;

    if (!fromStage || !toStage) return;

    setDealOrderByStage((prev) => {
      const next: Record<StageName, string[]> = { ...prev } as Record<StageName, string[]>;
      next[fromStage] = [...(next[fromStage] ?? [])];
      next[toStage] = [...(next[toStage] ?? [])];

      if (!next[fromStage].includes(activeId)) {
        next[fromStage].push(activeId);
      }

      if (fromStage === toStage) {
        if (activeId === overId) return prev;
        const oldIndex = next[fromStage].indexOf(activeId);
        const newIndex = next[toStage].indexOf(overId);
        if (oldIndex >= 0 && newIndex >= 0) {
          next[fromStage] = arrayMove(next[fromStage], oldIndex, newIndex);
        }
        return next;
      }

      next[fromStage] = next[fromStage].filter((id) => id !== activeId);
      const overIndex = next[toStage].indexOf(overId);
      const insertIndex = overData?.type === "column" || overIndex < 0 ? next[toStage].length : overIndex;
      next[toStage] = [...next[toStage].slice(0, insertIndex), activeId, ...next[toStage].slice(insertIndex)];
      return next;
    });

    if (fromStage !== toStage) {
      const movedDeal = dealsById.get(activeId);
      logEngagementEvent("deal_stage_changed", {
        id: activeId,
        title: movedDeal?.title,
        fromStage,
        toStage,
      });

      setLocalDeals((prev) => {
        const current = prev ?? deals;
        return current.map((d) => (d.id === activeId ? { ...d, status: toStage as Deal["status"] } : d));
      });

      updateDeal(
        {
          resource: "deals",
          id: activeId,
          values: {
            status: toStage,
          },
          mutationMode: "optimistic",
        },
        {
          onSuccess: () => {
            console.log(`Deal moved to ${toStage}`);
            refetchDeals();
          },
          onError: () => {
            refetchDeals();
          },
        },
      );
    }
  };

  const handleDragCancel = () => {
    setActiveDeal(null);
  };

  const handleViewDetails = (dealId: string) => {
    show("deals", dealId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  const totalDeals = displayDeals.length;
  const totalValue = displayDeals.reduce((sum, d) => sum + d.value, 0);
  const wonDeals = displayDeals.filter((d) => d.status === "Won");
  const winRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;
  const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}>
        <div className="p-4 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sales Pipeline</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track and manage your deals through every stage</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="default" className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border/60 bg-background">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">Total Deals</span>
              </div>
              <div className="text-xl font-bold">{totalDeals}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-border/60 bg-background">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground">Pipeline Value</span>
              </div>
              <div className="text-xl font-bold">{useCurrency().formatCompact(totalValue)}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-border/60 bg-background">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-medium text-muted-foreground">Win Rate</span>
              </div>
              <div className="text-xl font-bold">{winRate}%</div>
            </div>
            <div className="p-3.5 rounded-xl border border-border/60 bg-background">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">Avg Deal</span>
              </div>
              <div className="text-xl font-bold">{useCurrency().formatCompact(avgDealSize)}</div>
            </div>
          </div>

          {/* Board */}
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory">
            {pipelineStages.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                deals={displayDeals}
                contacts={contacts}
                companies={companies}
                tags={tags}
                quotes={quotes}
                onViewDetails={handleViewDetails}
                orderedDealIds={dealOrderByStage[stage]}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeDeal ? (
            <div className="rotate-2 scale-105 opacity-90">
              <DealCard
                deal={activeDeal.deal}
                contact={activeDeal.contact}
                company={activeDeal.company}
                tags={activeDeal.tags}
                quote={activeDeal.quote}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
          </DialogHeader>
          <DealForm
            action="create"
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              refetchDeals();
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
