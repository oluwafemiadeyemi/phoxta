import { useList } from "@refinedev/core";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckSquare, Calendar, FileText, Tag } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Card } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@crm/components/ui/sheet";
import type { Deal, Quote, Task } from "@crm/types";
import { useNavigate } from "react-router";

type CalendarItem =
  | { kind: "task_due"; id: string; date: string; title: string; task: Task }
  | { kind: "quote_due"; id: string; date: string; title: string; quote: Quote }
  | { kind: "deal_created"; id: string; date: string; title: string; deal: Deal };

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const navigate = useNavigate();

  const { result: tasksResult } = useList<Task>({
    resource: "tasks",
    pagination: { mode: "off" },
  });

  const { result: quotesResult } = useList<Quote>({
    resource: "quotes",
    pagination: { mode: "off" },
  });

  const { result: dealsResult } = useList<Deal>({
    resource: "deals",
    pagination: { mode: "off" },
  });

  const tasks = tasksResult.data || [];
  const quotes = quotesResult.data || [];
  const deals = dealsResult.data || [];

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
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">Track tasks, quotes, and deal milestones</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center gap-1 border rounded-md">
            <Button variant="ghost" size="icon" onClick={previousMonth} className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 min-w-[140px] text-center font-semibold">
              {monthNames[month]} {year}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-7 gap-px bg-border">
          {daysOfWeek.map((day) => (
            <div key={day} className="bg-muted p-3 text-center font-semibold text-sm">
              {day}
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="bg-background p-3 min-h-[120px]" />;
            const dayItems = getItemsForDate(day);
            return (
              <div
                key={`day-${day}`}
                className={`bg-background p-3 min-h-[120px] border border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                  isToday(day) ? "ring-2 ring-primary/40" : ""
                }`}
                onClick={() => setSelectedDay(day)}>
                <div className={`text-sm font-medium ${isToday(day) ? "text-primary" : ""}`}>{day}</div>
                <div className="space-y-1 mt-1">
                  {dayItems.slice(0, 3).map((item) => {
                    if (item.kind === "task_due") {
                      return (
                        <div
                          key={`task-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/edit/${item.id}`);
                          }}
                          className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity bg-amber-50 text-amber-700 border-l-2 border-amber-500"
                          title={`Task due: ${item.title}`}>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Due</span>
                            <span className="truncate">{item.title}</span>
                          </div>
                        </div>
                      );
                    }

                    if (item.kind === "quote_due") {
                      return (
                        <div
                          key={`quote-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/quotes/show/${item.id}`);
                          }}
                          className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500"
                          title={`Quote due: ${item.title}`}>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Quote</span>
                            <span className="truncate">{item.title}</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`deal-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/deals/show/${item.id}`);
                        }}
                        className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity bg-slate-50 text-slate-700 border-l-2 border-slate-500"
                        title={`Added to pipeline: ${item.title}`}>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Deal</span>
                          <span className="truncate">{item.title}</span>
                        </div>
                      </div>
                    );
                  })}
                  {dayItems.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">+{dayItems.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Sheet open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl">
              {selectedDay !== null &&
                new Date(year, month, selectedDay).toLocaleDateString([], {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            </SheetTitle>
            <SheetDescription>
              {selectedDayItems.length === 0
                ? "No items scheduled for this day"
                : `${selectedDayItems.length} ${selectedDayItems.length === 1 ? "item" : "items"} on this day`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {selectedDayItems.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No items scheduled for this day</p>
              </Card>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Due & pipeline items</h3>
                {selectedDayItems.map((item) => {
                  if (item.kind === "task_due") {
                    return (
                      <Card
                        key={`sheet-task-${item.id}`}
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/tasks/edit/${item.id}`)}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                              <CheckSquare className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{item.title}</div>
                              <div className="text-sm text-muted-foreground truncate">Task due</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Due
                          </Badge>
                        </div>
                      </Card>
                    );
                  }

                  if (item.kind === "quote_due") {
                    return (
                      <Card
                        key={`sheet-quote-${item.id}`}
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/quotes/show/${item.id}`)}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{item.title}</div>
                              <div className="text-sm text-muted-foreground truncate">Quote expiry</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                            Due
                          </Badge>
                        </div>
                      </Card>
                    );
                  }

                  return (
                    <Card
                      key={`sheet-deal-${item.id}`}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/deals/show/${item.id}`)}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-50 text-slate-700">
                            <Tag className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{item.title}</div>
                            <div className="text-sm text-muted-foreground truncate">Added to pipeline</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                          Pipeline
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CalendarPage;
