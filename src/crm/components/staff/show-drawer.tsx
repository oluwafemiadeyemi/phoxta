import { useOne, HttpError } from "@refinedev/core";
import { useCurrency } from "@crm/hooks/use-currency";
import dayjs from "dayjs";
import {
  X,
  Mail,
  Phone,
  User,
  Briefcase,
  Building2,
  Calendar,
  MapPin,
  FileText,
  Edit,
  PoundSterling,
  Clock,
} from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Separator } from "@crm/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@crm/components/ui/avatar";
import type { Staff } from "@crm/types";

interface StaffShowDrawerProps {
  staffId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  "On Leave": "bg-amber-100 text-amber-700",
  Terminated: "bg-red-100 text-red-700",
};

const employmentColors: Record<string, string> = {
  "Full-time": "bg-blue-100 text-blue-700",
  "Part-time": "bg-purple-100 text-purple-700",
  Contract: "bg-orange-100 text-orange-700",
  Intern: "bg-cyan-100 text-cyan-700",
};

export function StaffShowDrawer({ staffId, onClose, onEdit }: StaffShowDrawerProps) {
  const { format } = useCurrency();

  const { result: member, query } = useOne<Staff, HttpError>({
    resource: "staff",
    id: staffId ?? "",
    queryOptions: { enabled: !!staffId },
  });

  const isLoading = query?.isLoading;

  if (!staffId) return null;

  const getInitials = (firstName: string, lastName: string) =>
    `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() || "?";

  return (
    <div
      className={`fixed inset-y-0 right-0 w-full sm:w-[440px] bg-background border-l shadow-2xl z-50 transform transition-transform duration-300 ${
        staffId ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Staff Details</h2>
          <div className="flex items-center gap-2">
            {member && (
              <Button variant="outline" size="sm" onClick={() => onEdit(staffId)}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-muted rounded" />
              ))}
            </div>
          ) : !member ? (
            <div className="text-center text-muted-foreground py-8">
              Staff member not found
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {getInitials(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {member.firstName} {member.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{member.jobTitle || "No title"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={statusColors[member.status] || ""}>
                      {member.status}
                    </Badge>
                    <Badge variant="outline" className={employmentColors[member.employmentType] || ""}>
                      {member.employmentType}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Contact</h4>
                {member.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${member.email}`} className="text-primary hover:underline">
                      {member.email}
                    </a>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${member.phone}`} className="hover:underline">
                      {member.phone}
                    </a>
                  </div>
                )}
                {member.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{member.address}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Employment Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Employment</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Building2 className="h-3.5 w-3.5" />
                      Department
                    </div>
                    <p className="font-medium text-sm">{member.department}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      Job Title
                    </div>
                    <p className="font-medium text-sm">{member.jobTitle || "—"}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Start Date
                    </div>
                    <p className="font-medium text-sm">
                      {member.startDate ? dayjs(member.startDate).format("MMM D, YYYY") : "—"}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      Tenure
                    </div>
                    <p className="font-medium text-sm">
                      {member.startDate
                        ? `${dayjs().diff(dayjs(member.startDate), "month")} months`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Compensation</h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <PoundSterling className="h-3.5 w-3.5" />
                    Annual Salary
                  </div>
                  <p className="text-2xl font-bold">
                    {member.salary ? format(member.salary) : "—"}
                  </p>
                  {member.salary > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(member.salary / 12)} / month
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {member.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {member.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Created At */}
              <Separator />
              <p className="text-xs text-muted-foreground">
                Added {dayjs(member.createdAt).format("MMM D, YYYY [at] h:mm A")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
