import { useState, useCallback } from "react";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@crm/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@crm/components/ui/alert-dialog";
import { Badge } from "@crm/components/ui/badge";
import {
  MoreHorizontal,
  Plus,
  Mail,
  Trash2,
  Edit,
  Shield,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@crm/components/ui/dropdown-menu";
import { inviteUser } from "@crm/lib/user-invitations";
import { softDeleteRecord } from "@crm/lib/soft-delete";

const ROLES = [
  { value: "admin", label: "Admin", color: "bg-red-100 text-red-800" },
  { value: "manager", label: "Manager", color: "bg-blue-100 text-blue-800" },
  { value: "sales_rep", label: "Sales Rep", color: "bg-green-100 text-green-800" },
  { value: "viewer", label: "Viewer", color: "bg-gray-100 text-gray-800" },
];

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("sales_rep");
  const [loading, setLoading] = useState(false);

  const { result, query: { isLoading, refetch } } = useList({
    resource: "team_members",
    filters: searchTerm
      ? [{ field: "email", operator: "contains" as const, value: searchTerm }]
      : [],
  });

  const { mutate: updateUser } = useUpdate();
  const { mutate: deleteUser } = useDelete();

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      alert("Please enter an email address");
      return;
    }

    try {
      setLoading(true);
      const result = await inviteUser(inviteEmail, inviteRole as any);
      if (result.success) {
        setShowInviteDialog(false);
        setInviteEmail("");
        setInviteRole("sales_rep");
        refetch();
        alert("Invitation sent successfully!");
      } else {
        alert(result.error || "Failed to send invitation");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = (user: any, newRole: string) => {
    updateUser(
      {
        resource: "team_members",
        id: user.id,
        values: { role: newRole },
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      await softDeleteRecord("team_members", selectedUser.id, selectedUser.id);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      refetch();
      alert("User deleted successfully");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: "email",
      header: "Email",
      cell: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      accessorKey: "full_name",
      header: "Name",
      cell: (value: string) => value || "—",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: (value: string) => {
        const role = ROLES.find((r) => r.value === value);
        if (!role) return value;
        return (
          <Badge className={role.color}>
            {role.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (value: string) => (
        <Badge variant={value === "active" ? "default" : "secondary"}>
          {value === "active" ? "Active" : "Pending"}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Joined",
      cell: (value: string) =>
        new Date(value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedUser(row);
                // Open role change dialog
              }}
            >
              <Shield className="w-4 h-4 mr-2" />
              Change Role
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedUser(row);
                // Copy invite link
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Resend Invite
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => {
                setSelectedUser(row);
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600 mt-2">
            Manage team members, roles, and permissions
          </p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to a new team member
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@company.com"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleInviteUser}
                className="w-full"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div>
        <Input
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="rounded-md border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col: any) => (
                  <th key={col.accessorKey || col.id} className="px-4 py-3 text-left font-medium">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(result?.data || []).map((row: any, i: number) => (
                <tr key={row.id || i} className="border-b">
                  {columns.map((col: any) => (
                    <td key={col.accessorKey || col.id} className="px-4 py-3">
                      {col.cell ? col.cell(col.accessorKey ? row[col.accessorKey] : row) : row[col.accessorKey]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.email}? This action
              can be undone from the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
