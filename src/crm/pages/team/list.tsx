import { useList } from "@refinedev/core";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/components/ui/avatar";
import { Card, CardContent } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { Mail, Briefcase, CheckSquare } from "lucide-react";
import { ListView, ListViewHeader } from "@crm/components/refine-ui/views/list-view";
import { LoadingOverlay } from "@crm/components/refine-ui/layout/loading-overlay";
import type { TeamMember, Task } from "@crm/types";

export default function TeamList() {
  const { query: teamMembersQuery } = useList<TeamMember>({
    resource: "teamMembers",
    pagination: {
      mode: "off",
    },
  });

  const { query: tasksQuery } = useList<Task>({
    resource: "tasks",
    pagination: {
      mode: "off",
    },
  });

  const teamMembers = teamMembersQuery.data?.data ?? [];
  const tasks = tasksQuery.data?.data ?? [];

  // Calculate assigned task count for each team member
  const getAssignedTaskCount = (memberId: string) => {
    return tasks.filter((task: Task) => task.assigneeId === memberId).length;
  };

  const isLoading = teamMembersQuery.isLoading || tasksQuery.isLoading;

  return (
    <ListView>
      <LoadingOverlay loading={isLoading}>
        <ListViewHeader title="Team Members" canCreate={false} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {teamMembers.map((member: TeamMember) => {
            const assignedCount = getAssignedTaskCount(member.id);
            const initials = member.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase();

            return (
              <Card key={member.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Avatar */}
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={member.avatar ?? undefined} alt={member.name} />
                      <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                    </Avatar>

                    {/* Name */}
                    <div>
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
                        <Briefcase className="h-3 w-3" />
                        <span>{member.role}</span>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{member.email}</span>
                    </div>

                    {/* Assigned Tasks Count */}
                    <div className="flex items-center gap-2 pt-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {assignedCount} {assignedCount === 1 ? "task" : "tasks"} assigned
                      </span>
                    </div>

                    {/* Status Badge */}
                    <Badge variant={assignedCount > 0 ? "default" : "secondary"} className="mt-2">
                      {assignedCount > 0 ? "Active" : "Available"}
                    </Badge>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isLoading && teamMembers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No team members found.</p>
          </div>
        )}
      </LoadingOverlay>
    </ListView>
  );
}
