import { useTable as useTableCore } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ListView, ListViewHeader } from "@crm/components/refine-ui/views/list-view";
import { EditButton } from "@crm/components/refine-ui/buttons/edit";
import { DataTable } from "@crm/components/refine-ui/data-table/data-table";
import { Badge } from "@crm/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@crm/components/ui/dialog";
import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import type { User, Task } from "@crm/types";
import type { ColumnDef } from "@tanstack/react-table";

export default function UsersList() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const table = useTable<User>({
    columns: [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const user = row.original;
          const initials = user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();

          return (
            <div
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedUser(user)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedUser(user);
              }}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{user.name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.original.role;
          const roleColors: Record<string, string> = {
            Admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
            "Sales Manager": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            "Sales Rep": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            Viewer: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
          };

          return (
            <Badge variant="outline" className={roleColors[role]}>
              {role}
            </Badge>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const isActive = status === "Active";

          return (
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}>
              {status}
            </Badge>
          );
        },
      },
      {
        id: "taskCount",
        header: "Assigned Tasks",
        cell: ({ row }) => {
          const userId = row.original.id;
          return <TaskCountCell userId={userId} />;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <EditButton recordItemId={row.original.id} size="sm" variant="ghost">
                <Pencil className="h-4 w-4" />
              </EditButton>
            </div>
          );
        },
      },
    ] as ColumnDef<User>[],
    refineCoreProps: {
      resource: "users",
      pagination: {
        mode: "off",
      },
    },
  });

  return (
    <>
      <ListView>
        <ListViewHeader />
        <DataTable table={table} />
      </ListView>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Team member</DialogTitle>
            <DialogDescription>View profile details and permissions</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedUser.avatar ?? undefined} alt={selectedUser.name} />
                  <AvatarFallback>
                    {selectedUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-xl font-semibold truncate">{selectedUser.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{selectedUser.email}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">{selectedUser.role}</Badge>
                    <Badge
                      variant={selectedUser.status === "Active" ? "default" : "secondary"}
                      className={
                        selectedUser.status === "Active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : ""
                      }>
                      {selectedUser.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="font-medium">
                    {new Date(selectedUser.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Permissions</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(selectedUser.permissions)
                      .filter(([, value]) => Boolean(value))
                      .map(([key]) => (
                        <Badge key={key} variant="secondary">
                          {formatPermissionLabel(key)}
                        </Badge>
                      ))}
                    {Object.values(selectedUser.permissions).every((v) => !v) && (
                      <span className="text-sm text-muted-foreground">No elevated permissions</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Tip: use the edit button in the table to update role/status.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatPermissionLabel(key: string) {
  const labels: Record<string, string> = {
    manageUsers: "Manage users",
    manageDeals: "Manage deals",
    manageContacts: "Manage contacts",
    manageCompanies: "Manage companies",
    manageSettings: "Manage settings",
    viewReports: "View reports",
    exportData: "Export data",
  };

  return labels[key] ?? key;
}

// Separate component to fetch and display task count
const TaskCountCell = ({ userId }: { userId: string }) => {
  const { tableQuery } = useTableCore<Task>({
    resource: "tasks",
    pagination: {
      mode: "off",
    },
  });

  const tasks = tableQuery.data?.data || [];
  const taskCount = tasks.filter((task: Task) => task.assigneeId === userId && task.stage !== "Done").length;

  return (
    <span className="text-muted-foreground">
      {taskCount} {taskCount === 1 ? "task" : "tasks"}
    </span>
  );
};
