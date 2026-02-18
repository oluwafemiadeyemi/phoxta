import { useList, useOne } from "@refinedev/core";
import { Card } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { Phone, Calendar, Mail, CheckSquare, Presentation, Check, X } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Activity, Contact, Deal } from "@crm/types";
import { QuickActivityCreate } from "@crm/components/quick-activity-create";

dayjs.extend(relativeTime);

const activityTypeIcons = {
  Call: Phone,
  Meeting: Calendar,
  Email: Mail,
  Task: CheckSquare,
  Demo: Presentation,
};

const activityTypeColors = {
  Call: "bg-blue-100 text-blue-700 border-blue-200",
  Meeting: "bg-green-100 text-green-700 border-green-200",
  Email: "bg-purple-100 text-purple-700 border-purple-200",
  Task: "bg-orange-100 text-orange-700 border-orange-200",
  Demo: "bg-red-100 text-red-700 border-red-200",
};

const statusColors = {
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-green-50 text-green-700 border-green-200",
  Cancelled: "bg-gray-50 text-gray-700 border-gray-200",
};

const getStatusIcon = (status: "Scheduled" | "Completed" | "Cancelled") => {
  switch (status) {
    case "Completed":
      return <Check className="h-3 w-3 mr-1" />;
    case "Cancelled":
      return <X className="h-3 w-3 mr-1" />;
    default:
      return null;
  }
};

interface ActivityTimelineProps {
  contactId?: string;
  dealId?: string;
  limit?: number;
}

export function ActivityTimeline({ contactId, dealId, limit }: ActivityTimelineProps) {
  // Build filters based on props
  const filters: any[] = [];
  if (contactId) {
    filters.push({
      field: "contactId",
      operator: "eq",
      value: contactId,
    });
  }
  if (dealId) {
    filters.push({
      field: "dealId",
      operator: "eq",
      value: dealId,
    });
  }

  const {
    result: { data: activities = [] },
    query: { isLoading },
  } = useList<Activity>({
    resource: "activities",
    filters,
    pagination: {
      mode: "off",
    },
    sorters: [
      {
        field: "date",
        order: "desc",
      },
    ],
  });

  // Apply limit if specified
  const displayActivities = limit ? activities.slice(0, limit) : activities;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <QuickActivityCreate contactId={contactId} dealId={dealId} />
        </div>
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No activities found</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first activity to get started</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <QuickActivityCreate contactId={contactId} dealId={dealId} />
      </div>
      <div className="space-y-3">
        {displayActivities.map((activity) => {
          const Icon = activityTypeIcons[activity.type];
          const activityDate = dayjs(activity.date);
          const isPast = activityDate.isBefore(dayjs());

          return (
            <Card key={activity.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg border ${activityTypeColors[activity.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm line-clamp-2">{activity.title}</h4>
                    <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[activity.status]}`}>
                      {getStatusIcon(activity.status)}
                      {activity.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {activity.type}
                    </Badge>
                    <span>•</span>
                    <span>{activityDate.format("MMM DD, YYYY [at] h:mm A")}</span>
                    {isPast && (
                      <>
                        <span>•</span>
                        <span className="text-muted-foreground/70">{activityDate.fromNow()}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{activity.duration} min</span>
                  </div>

                  {activity.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{activity.notes}</p>
                  )}

                  <ActivityLinks activity={activity} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ActivityLinks({ activity }: { activity: Activity }) {
  const { result: contact } = useOne<Contact>({
    resource: "contacts",
    id: activity.contactId || "",
    queryOptions: {
      enabled: !!activity.contactId,
    },
  });

  const { result: deal } = useOne<Deal>({
    resource: "deals",
    id: activity.dealId || "",
    queryOptions: {
      enabled: !!activity.dealId,
    },
  });

  if (!contact && !deal) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {contact && (
        <Badge variant="outline" className="text-xs">
          Contact: {contact.name}
        </Badge>
      )}
      {deal && (
        <Badge variant="outline" className="text-xs">
          Deal: {deal.title}
        </Badge>
      )}
    </div>
  );
}
