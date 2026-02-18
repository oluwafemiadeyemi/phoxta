import { useMemo, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMany, type GetManyResponse } from "@refinedev/core";
import { DataTable } from "@crm/components/refine-ui/data-table/data-table";
import { DataTableSorter } from "@crm/components/refine-ui/data-table/data-table-sorter";
import { DataTableFilterCombobox } from "@crm/components/refine-ui/data-table/data-table-filter";
import { ListView, ListViewHeader } from "@crm/components/refine-ui/views/list-view";
import { Badge } from "@crm/components/ui/badge";
import { EditButton } from "@crm/components/refine-ui/buttons/edit";
import { DeleteButton } from "@crm/components/refine-ui/buttons/delete";
import {
  Edit,
  Trash2,
  Phone,
  Mail,
  Video,
  CheckSquare,
  Users,
  Clock,
  Calendar as CalendarIcon,
  Check,
  X,
} from "lucide-react";
import type { Activity, Contact, Deal } from "@crm/types";

const ACTIVITY_COLORS = {
  Call: "bg-blue-100 text-blue-700 border-blue-300",
  Meeting: "bg-green-100 text-green-700 border-green-300",
  Email: "bg-purple-100 text-purple-700 border-purple-300",
  Task: "bg-orange-100 text-orange-700 border-orange-300",
  Demo: "bg-red-100 text-red-700 border-red-300",
};

const ACTIVITY_ICONS = {
  Call: Phone,
  Meeting: Users,
  Email: Mail,
  Task: CheckSquare,
  Demo: Video,
};

const STATUS_VARIANTS = {
  Scheduled: "secondary",
  Completed: "default",
  Cancelled: "destructive",
} as const;

const ActivitiesAgenda = () => {
  const columns = useMemo<ColumnDef<Activity>[]>(
    () => [
      {
        id: "date",
        accessorKey: "date",
        size: 180,
        header: ({ column }) => (
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            <span>Date & Time</span>
            <DataTableSorter column={column} />
          </div>
        ),
        cell: ({ row }) => {
          const activity = row.original;
          const activityDate = new Date(activity.date);
          const now = new Date();
          const isPast = activityDate < now && activity.status !== "Completed";
          const isCompleted = activity.status === "Completed";

          return (
            <div className={isPast && !isCompleted ? "opacity-50" : ""}>
              <div className="font-medium">
                {activityDate.toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {activityDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const dateA = new Date(rowA.original.date).getTime();
          const dateB = new Date(rowB.original.date).getTime();
          return dateA - dateB;
        },
      },
      {
        id: "type",
        accessorKey: "type",
        size: 120,
        header: ({ column }) => (
          <div className="flex items-center gap-1">
            <span>Type</span>
            <DataTableFilterCombobox
              column={column}
              defaultOperator="in"
              multiple={true}
              options={[
                { label: "Call", value: "Call" },
                { label: "Meeting", value: "Meeting" },
                { label: "Email", value: "Email" },
                { label: "Task", value: "Task" },
                { label: "Demo", value: "Demo" },
              ]}
            />
          </div>
        ),
        cell: ({ row }) => {
          const activity = row.original;
          const activityDate = new Date(activity.date);
          const now = new Date();
          const isPast = activityDate < now && activity.status !== "Completed";
          const isCompleted = activity.status === "Completed";
          const Icon = ACTIVITY_ICONS[activity.type];

          return (
            <div className={isPast && !isCompleted ? "opacity-50" : ""}>
              <Badge variant="outline" className={ACTIVITY_COLORS[activity.type]}>
                <Icon className="h-3 w-3 mr-1" />
                {activity.type}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "title",
        accessorKey: "title",
        size: 250,
        header: "Activity",
        cell: ({ row }) => {
          const activity = row.original;
          const activityDate = new Date(activity.date);
          const now = new Date();
          const isPast = activityDate < now && activity.status !== "Completed";
          const isCompleted = activity.status === "Completed";

          return (
            <div className={isPast && !isCompleted ? "opacity-50" : ""}>
              <div className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {activity.title}
              </div>
              {activity.notes && (
                <div className="text-sm text-muted-foreground truncate max-w-[240px]">{activity.notes}</div>
              )}
            </div>
          );
        },
      },
      {
        id: "contact",
        accessorKey: "contactId",
        size: 200,
        header: "Contact",
        cell: ({ row, table }) => {
          const activity = row.original;
          const activityDate = new Date(activity.date);
          const now = new Date();
          const isPast = activityDate < now && activity.status !== "Completed";
          const isCompleted = activity.status === "Completed";

          const meta = table.options.meta as {
            contactsData: GetManyResponse<Contact> | undefined;
            contactsIsLoading: boolean;
          };

          const contact = meta?.contactsData?.data?.find((c) => c.id === activity.contactId);

          if (!contact) {
            return <span className="text-muted-foreground text-sm">—</span>;
          }

          return (
            <div className={isPast && !isCompleted ? "opacity-50" : ""}>
              <div className="font-medium">{contact.name}</div>
              <div className="text-sm text-muted-foreground">{contact.email}</div>
            </div>
          );
        },
      },
      {
        id: "deal",
        accessorKey: "dealId",
        size: 200,
        header: "Deal",
        cell: ({ row, table }) => {
          const activity = row.original;
          const activityDate = new Date(activity.date);
          const now = new Date();
          const isPast = activityDate < now && activity.status !== "Completed";
          const isCompleted = activity.status === "Completed";

          const meta = table.options.meta as {
            dealsData: GetManyResponse<Deal> | undefined;
            dealsIsLoading: boolean;
          };

          const deal = meta?.dealsData?.data?.find((d) => d.id === activity.dealId);

          if (!deal) {
            return <span className="text-muted-foreground text-sm">—</span>;
          }

          return (
            <div className={isPast && !isCompleted ? "opacity-50" : ""}>
              <div className="font-medium">{deal.title}</div>
              <div className="text-sm text-muted-foreground">${deal.value.toLocaleString()}</div>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        size: 120,
        header: ({ column }) => (
          <div className="flex items-center gap-1">
            <span>Status</span>
            <DataTableFilterCombobox
              column={column}
              defaultOperator="in"
              multiple={true}
              options={[
                { label: "Scheduled", value: "Scheduled" },
                { label: "Completed", value: "Completed" },
                { label: "Cancelled", value: "Cancelled" },
              ]}
            />
          </div>
        ),
        cell: ({ row }) => {
          const activity = row.original;
          const activityDate = new Date(activity.date);
          const now = new Date();
          const isPast = activityDate < now && activity.status !== "Completed";
          const isCompleted = activity.status === "Completed";

          const getStatusIcon = () => {
            if (activity.status === "Completed") return <Check className="h-3 w-3 mr-1" />;
            if (activity.status === "Cancelled") return <X className="h-3 w-3 mr-1" />;
            return null;
          };

          return (
            <div className={isPast && !isCompleted ? "opacity-50" : ""}>
              <Badge variant={STATUS_VARIANTS[activity.status]}>
                {getStatusIcon()}
                {activity.status}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "duration",
        accessorKey: "duration",
        size: 100,
        header: "Duration",
        cell: ({ row }) => {
          const activity = row.original;
          const activityDate = new Date(activity.date);
          const now = new Date();
          const isPast = activityDate < now && activity.status !== "Completed";
          const isCompleted = activity.status === "Completed";

          return <div className={`text-sm ${isPast && !isCompleted ? "opacity-50" : ""}`}>{activity.duration} min</div>;
        },
      },
      {
        id: "actions",
        size: 100,
        enableSorting: false,
        enableColumnFilter: false,
        header: "Actions",
        cell: ({ row }) => {
          const activity = row.original;
          const activityDate = new Date(activity.date);
          const now = new Date();
          const isPast = activityDate < now && activity.status !== "Completed";
          const isCompleted = activity.status === "Completed";

          return (
            <div className={`flex gap-1 ${isPast && !isCompleted ? "opacity-50" : ""}`}>
              <EditButton recordItemId={activity.id} size="icon-sm" variant="secondary">
                <Edit className="h-4 w-4" />
              </EditButton>
              <DeleteButton recordItemId={activity.id} size="icon-sm" variant="destructive">
                <Trash2 className="h-4 w-4" />
              </DeleteButton>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useTable<Activity>({
    columns,
    refineCoreProps: {
      resource: "activities",
      sorters: {
        initial: [
          {
            field: "date",
            order: "asc",
          },
        ],
      },
    },
  });

  const {
    reactTable: { setOptions },
    refineCore: {
      tableQuery: { data: tableData },
    },
  } = table;

  // Extract contact IDs from activities
  const contactIds = useMemo(() => {
    const ids = tableData?.data?.map((activity) => activity.contactId).filter((id): id is string => id !== null);
    return [...new Set(ids)];
  }, [tableData?.data]);

  // Extract deal IDs from activities
  const dealIds = useMemo(() => {
    const ids = tableData?.data?.map((activity) => activity.dealId).filter((id): id is string => id !== null);
    return [...new Set(ids)];
  }, [tableData?.data]);

  // Fetch related contacts
  const {
    result: contactsData,
    query: { isLoading: contactsIsLoading },
  } = useMany<Contact>({
    resource: "contacts",
    ids: contactIds,
    queryOptions: {
      enabled: contactIds.length > 0,
    },
  });

  // Fetch related deals
  const {
    result: dealsData,
    query: { isLoading: dealsIsLoading },
  } = useMany<Deal>({
    resource: "deals",
    ids: dealIds,
    queryOptions: {
      enabled: dealIds.length > 0,
    },
  });

  // Set table meta options
  useEffect(() => {
    setOptions((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        contactsData,
        contactsIsLoading,
        dealsData,
        dealsIsLoading,
      },
    }));
  }, [setOptions, contactsData, contactsIsLoading, dealsData, dealsIsLoading]);

  return (
    <ListView>
      <ListViewHeader title="Activities Agenda" />
      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground opacity-50" />
            <span className="text-sm text-muted-foreground">Past activities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm">Upcoming activities</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground line-through">Completed activities</span>
          </div>
        </div>
      </div>
      <DataTable table={table} />
    </ListView>
  );
};

export default ActivitiesAgenda;
