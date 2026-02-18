import { useList } from "@refinedev/core";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckSquare, Calendar, FileText, Tag } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@crm/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@crm/components/ui/sheet";
import type { Deal, Quote, Task } from "@crm/types";
import { useNavigate } from "react-router";
import { cn } from "@crm/lib/utils";

type CalendarItem =
  | { kind: "task_due"; id: string; date: string; title: string; task: Task }
  | { kind: "quote_due"; id: string; date: string; title: string; quote: Quote }
  | { kind: "deal_created"; id: string; date: string; title: string; deal: Deal };

export const CalendarHeaderButton = () => {
  const [open, setOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const navigate = useNavigate();

  const { result: tasksResult } = useList<Task>({
    resource: "tasks",
    pagination: { mode: "off" },
    queryOptions: { enabled: open },
  });

  const { result: quotesResult } = useList<Quote>({
    resource: "quotes",
    pagination: { mode: "off" },
    queryOptions: { enabled: open },
  });

  const { result: dealsResult } = useList<Deal>({
    resource: "deals",
    pagination: { mode: "off" },
    queryOptions: { enabled: open },
  });

  const tasks = tasksResult?.data || [];
  const quotes = quotesResult?.data || [];
  const deals = dealsResult?.data || [];

  const toDateKey = (date: string) => new Date(date).toISOString().split("T")[0];

  const calendarItems: CalendarItem[] = useMemo(() => {
    const taskItems: CalendarItem[] = tasks
      .filter((task) => Boolean(task.dueDate))
      .map((task) => ({
        kind: "task_due",
        id: task.id,
        date: task.dueDate,
        title: task.title,
        task,
      }));

    const quoteItems: CalendarItem[] = quotes
      .filter((quote) => Boolean(quote.expiryDate))
      .map((quote) => ({
        kind: "quote_due",
        id: quote.id,
        date: quote.expiryDate,
        title: quote.quoteNumber,
        quote,
      }));

    const dealItems: CalendarItem[] = deals
      .filter((deal) => Boolean(deal.createdAt))
      .map((deal) => ({
        kind: "deal_created",
        id: deal.id,
        date: deal.createdAt,
        title: deal.title,
        deal,
      }));

    return [...taskItems, ...quoteItems, ...dealItems];
  }, [deals, quotes, tasks]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const previousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getItemsForDate = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    return calendarItems
      .filter((item) => toDateKey(item.date) === dateStr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const selectedDayItems = useMemo(() => {
    if (selectedDay === null) return [] as CalendarItem[];
    return getItemsForDate(selectedDay);
  }, [selectedDay, calendarItems, year, month]);

  const calendarDays: Array<number | null> = [];
  for (let i = 0; i < startingDayOfWeek; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);

  // Count today's items for badge
  const todayItems = useMemo(() => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    return calendarItems.filter((item) => toDateKey(item.date) === dateStr);
  }, [calendarItems]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        )}
        title="Calendar"
      >
        <Calendar className="h-[18px] w-[18px]" />
        {todayItems.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background">
            {todayItems.length > 9 ? "9+" : todayItems.length}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 rounded-xl">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-xl font-bold tracking-tight">Calendar</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Track tasks, quotes, and deal milestones</DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4 mt-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs font-medium">
                  Today
                </Button>
                <div className="flex items-center border border-border/60 rounded-lg overflow-hidden">
                  <Button variant="ghost" size="icon" onClick={previousMonth} className="h-8 w-8 rounded-none border-r border-border/40">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="px-4 min-w-[140px] text-center font-semibold text-sm">
                    {monthNames[month]} {year}
                  </div>
                  <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-none border-l border-border/40">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Tasks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Quotes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" /> Deals
                </span>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="grid grid-cols-7">
                {daysOfWeek.map((day) => (
                  <div key={day} className="bg-muted/40 p-2.5 text-center font-medium text-xs text-muted-foreground border-b border-border/40">
                    {day}
                  </div>
                ))}

                {calendarDays.map((day, idx) => {
                  if (!day)
                    return <div key={`empty-${idx}`} className="bg-background p-2 min-h-[100px] border-b border-r border-border/30" />;
                  const dayItems = getItemsForDate(day);
                  const hasItems = dayItems.length > 0;
                  return (
                    <div
                      key={`day-${day}`}
                      className={cn(
                        "bg-background p-2 min-h-[100px] border-b border-r border-border/30 cursor-pointer transition-colors hover:bg-muted/30",
                        isToday(day) && "bg-primary/[0.03]"
                      )}
                      onClick={() => setSelectedDay(day)}
                    >
                      <div className={cn(
                        "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                        isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
                      )}>
                        {day}
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {dayItems.slice(0, 3).map((item) => {
                          const colorMap = {
                            task_due: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-l-2 border-amber-500",
                            quote_due: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500",
                            deal_created: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-l-2 border-slate-500",
                          };
                          const navMap = {
                            task_due: `/tasks/edit/${item.id}`,
                            quote_due: `/quotes/show/${item.id}`,
                            deal_created: `/deals/show/${item.id}`,
                          };
                          return (
                            <div
                              key={`${item.kind}-${item.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpen(false);
                                navigate(navMap[item.kind]);
                              }}
                              className={cn("text-[10px] px-1 py-0.5 rounded-sm truncate cursor-pointer hover:opacity-80 transition-opacity", colorMap[item.kind])}
                              title={item.title}
                            >
                              <span className="truncate">{item.title}</span>
                            </div>
                          );
                        })}
                        {dayItems.length > 3 && (
                          <div className="text-[10px] text-muted-foreground text-center font-medium">
                            +{dayItems.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day detail sheet */}
      <Sheet open={selectedDay !== null} onOpenChange={(isOpen) => !isOpen && setSelectedDay(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
          <SheetHeader className="p-5 pb-0">
            <SheetTitle className="text-lg font-bold">
              {selectedDay !== null &&
                new Date(year, month, selectedDay).toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {selectedDayItems.length === 0
                ? "No items scheduled"
                : `${selectedDayItems.length} ${selectedDayItems.length === 1 ? "item" : "items"}`}
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-5 pt-4 space-y-2">
            {selectedDayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Calendar className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No items scheduled</p>
              </div>
            ) : (
              selectedDayItems.map((item) => {
                const configMap = {
                  task_due: { iconBg: "bg-amber-100 dark:bg-amber-900/40", iconText: "text-amber-600 dark:text-amber-400", Icon: CheckSquare, label: "Task due", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300", route: `/tasks/edit/${item.id}` },
                  quote_due: { iconBg: "bg-indigo-100 dark:bg-indigo-900/40", iconText: "text-indigo-600 dark:text-indigo-400", Icon: FileText, label: "Quote expiry", badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300", route: `/quotes/show/${item.id}` },
                  deal_created: { iconBg: "bg-slate-100 dark:bg-slate-800/40", iconText: "text-slate-600 dark:text-slate-400", Icon: Tag, label: "Pipeline", badge: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300", route: `/deals/show/${item.id}` },
                };
                const cfg = configMap[item.kind];

                return (
                  <div
                    key={`sheet-${item.kind}-${item.id}`}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background hover:border-border hover:shadow-sm cursor-pointer transition-all"
                    onClick={() => {
                      setSelectedDay(null);
                      setOpen(false);
                      navigate(cfg.route);
                    }}
                  >
                    <div className={cn("p-2 rounded-lg shrink-0", cfg.iconBg)}>
                      <cfg.Icon className={cn("h-4 w-4", cfg.iconText)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{cfg.label}</div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] h-5 shrink-0", cfg.badge)}>
                      {item.kind === "deal_created" ? "Deal" : "Due"}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
