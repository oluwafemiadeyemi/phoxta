import { useMemo } from "react";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMany, type GetManyResponse } from "@refinedev/core";
import { useNavigation } from "@refinedev/core";
import { DataTable } from "@crm/components/refine-ui/data-table/data-table";
import { ListView, ListViewHeader } from "@crm/components/refine-ui/views/list-view";
import { Badge } from "@crm/components/ui/badge";
import { DeleteButton } from "@crm/components/refine-ui/buttons/delete";
import type { Activity, Contact } from "@crm/types";
import { format } from "date-fns";
import { Edit } from "lucide-react";
import { Button } from "@crm/components/ui/button";

function ActivitiesListPage() {
  const { edit } = useNavigation();

  const columns = useMemo<ColumnDef<Activity>[]>(
    () => [
      {
        id: "type",
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => {
          const type = getValue() as string;
          const typeColors: Record<string, string> = {
            Call: "bg-blue-100 text-blue-800",
            Email: "bg-purple-100 text-purple-800",
            Meeting: "bg-green-100 text-green-800",
            Task: "bg-orange-100 text-orange-800",
            Demo: "bg-indigo-100 text-indigo-800",
          };

          return <Badge className={typeColors[type] || "bg-gray-100 text-gray-800"}>{type}</Badge>;
        },
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: ({ getValue }) => {
          return <div className="font-medium">{getValue() as string}</div>;
        },
      },
      {
        id: "contact",
        accessorKey: "contactId",
        header: "Contact",
        cell: ({ getValue, table }) => {
          const meta = table.options.meta as {
            contactsData: GetManyResponse<Contact> | undefined;
            contactsIsLoading: boolean;
          };

          const contactId = getValue() as string | null;

          if (!contactId) return "-";
          if (meta?.contactsIsLoading) return "Loading...";

          const contact = meta?.contactsData?.data?.find((item) => item.id === contactId);
          return contact?.name ?? "-";
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue() as string;
          const statusColors: Record<string, string> = {
            Scheduled: "bg-blue-100 text-blue-800",
            Completed: "bg-green-100 text-green-800",
            Cancelled: "bg-red-100 text-red-800",
          };

          return <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
        },
      },
      {
        id: "date",
        accessorKey: "date",
        header: "Date",
        cell: ({ getValue }) => {
          const date = getValue() as string;
          return <div className="text-sm">{format(new Date(date), "MMM d, yyyy")}</div>;
        },
      },
      {
        id: "duration",
        accessorKey: "duration",
        header: "Duration",
        cell: ({ getValue }) => {
          const duration = getValue() as number;
          return <div className="text-sm">{duration} mins</div>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => edit("activities", row.original.id)}
                className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
              <DeleteButton resource="activities" recordItemId={row.original.id} size="sm" variant="ghost" />
            </div>
          );
        },
      },
    ],
    [edit]
  );

  const table = useTable<Activity>({
    columns,
  });

  const {
    reactTable: { setOptions },
    refineCore: {
      tableQuery: { data: tableData },
    },
  } = table;

  // Extract contact IDs from activities
  const contactIds = useMemo(
    () => tableData?.data?.map((activity) => activity.contactId).filter((id): id is string => Boolean(id)) ?? [],
    [tableData?.data],
  );

  // Fetch contacts
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

  setOptions((prev) => ({
    ...prev,
    meta: {
      ...prev.meta,
      contactsData,
      contactsIsLoading,
    },
  }));

  return (
    <>
      <ListViewHeader title="Activities" />
      <div className="mt-6">
        <DataTable table={table} />
      </div>
    </>
  );
}

export default ActivitiesListPage;
