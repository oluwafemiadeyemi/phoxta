import { useEffect, useState } from "react";
import { useCreate, useUpdate, useOne, HttpError } from "@refinedev/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@crm/components/ui/dialog";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Textarea } from "@crm/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Staff } from "@crm/types";

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId?: string | null;
}

const DEPARTMENTS = [
  "General",
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Support",
  "HR",
  "Finance",
  "Operations",
  "Legal",
  "Product",
];

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern"] as const;
const STATUSES = ["Active", "On Leave", "Terminated"] as const;

export function StaffFormDialog({ open, onOpenChange, staffId }: StaffFormDialogProps) {
  const isEdit = !!staffId;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "General",
    jobTitle: "",
    employmentType: "Full-time" as Staff["employmentType"],
    status: "Active" as Staff["status"],
    startDate: new Date().toISOString().split("T")[0],
    salary: "",
    address: "",
    notes: "",
  });

  // Load existing data for edit
  const { result: existingStaff } = useOne<Staff>({
    resource: "staff",
    id: staffId ?? "",
    queryOptions: { enabled: isEdit && open },
  });

  useEffect(() => {
    if (isEdit && existingStaff) {
      setForm({
        firstName: existingStaff.firstName || "",
        lastName: existingStaff.lastName || "",
        email: existingStaff.email || "",
        phone: existingStaff.phone || "",
        department: existingStaff.department || "General",
        jobTitle: existingStaff.jobTitle || "",
        employmentType: existingStaff.employmentType || "Full-time",
        status: existingStaff.status || "Active",
        startDate: existingStaff.startDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        salary: existingStaff.salary?.toString() || "",
        address: existingStaff.address || "",
        notes: existingStaff.notes || "",
      });
    } else if (!isEdit && open) {
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        department: "General",
        jobTitle: "",
        employmentType: "Full-time",
        status: "Active",
        startDate: new Date().toISOString().split("T")[0],
        salary: "",
        address: "",
        notes: "",
      });
    }
  }, [isEdit, existingStaff, open]);

  const { mutate: createStaff } = useCreate();
  const { mutate: updateStaff } = useUpdate();

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = () => {
    setIsSaving(true);
    const values = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      department: form.department,
      jobTitle: form.jobTitle,
      employmentType: form.employmentType,
      status: form.status,
      startDate: form.startDate || null,
      salary: form.salary ? parseFloat(form.salary) : 0,
      address: form.address,
      notes: form.notes,
    };

    if (isEdit && staffId) {
      updateStaff(
        { resource: "staff", id: staffId, values },
        { onSuccess: () => { setIsSaving(false); onOpenChange(false); }, onError: () => setIsSaving(false) },
      );
    } else {
      createStaff(
        { resource: "staff", values },
        { onSuccess: () => { setIsSaving(false); onOpenChange(false); }, onError: () => setIsSaving(false) },
      );
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Contact row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+44 7700 900000"
              />
            </div>
          </div>

          {/* Job row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={form.jobTitle}
                onChange={(e) => update("jobTitle", e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={form.department} onValueChange={(v) => update("department", v)}>
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employment & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Select value={form.employmentType} onValueChange={(v) => update("employmentType", v)}>
                <SelectTrigger id="employmentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Annual Salary</Label>
              <Input
                id="salary"
                type="number"
                min="0"
                step="1000"
                value={form.salary}
                onChange={(e) => update("salary", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Main Street, London"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.firstName || !form.lastName || isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Update" : "Add Staff Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
