import { useMemo } from "react";
import { useTable, useNavigation } from "@refinedev/core";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Activity } from "@crm/types";
import {
  Phone,
  Calendar,
  Mail,
  CheckSquare,
  Monitor,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

dayjs.extend(relativeTime);

const activityIcons: Record<string, React.ReactNode> = {
  Call: <Phone className="h-4 w-4" />,
  Meeting: <Calendar className="h-4 w-4" />,
  Email: <Mail className="h-4 w-4" />,
  Task: <CheckSquare className="h-4 w-4" />,
  Demo: <Monitor className="h-4 w-4" />,
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Scheduled: "outline",
  Completed: "default",
  Cancelled: "destructive",
};

export const ActivityTimeline: React.FC = () => {
  const {
    tableQuery: tableQueryResult,
    current: currentPage,
    setCurrent: setCurrentPage,
    pageCount,
  } = useTable<Activity>({
    resource: "activities",
    syncWithLocation: false,
    pagination: {
      pageSize: 7,
    },
    sorters: {
      initial: [
        {
          field: "createdAt",
          order: "desc",
        },
      ],
    },
  }) as any;

  const current = currentPage ?? 1;
  const setCurrent = setCurrentPage ?? (() => {});
  const { data } = tableQueryResult;

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="divide-y divide-slate-100">
        {data?.data?.map((activity: Activity) => {
          return (
            <div
              key={activity.id}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  {activityIcons[activity.type] || <CheckSquare className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-slate-500">{activity.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={statusColors[activity.status] || "secondary"} className="text-xs">
                  {activity.status}
                </Badge>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {dayjs(activity.createdAt).fromNow()}
                </span>
              </div>
            </div>
          );
        })}
        {(!data?.data || data.data.length === 0) && (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            No recent activities
          </div>
        )}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={current <= 1}
            onClick={() => setCurrent(current - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-500">
            {current} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={current >= pageCount}
            onClick={() => setCurrent(current + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
