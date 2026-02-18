import { useEffect, useMemo, useState } from "react";
import { useGetIdentity, useNotification } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Switch } from "@crm/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Badge } from "@crm/components/ui/badge";
import { supabaseClient } from "@crm/lib/supabase";
import { Layers, PlusCircle, Trash2 } from "lucide-react";

const fieldTypeOptions = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Boolean" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi-select" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
];

const entityOptions = [
  { value: "contacts", label: "Contacts" },
  { value: "companies", label: "Companies" },
  { value: "deals", label: "Deals" },
  { value: "tasks", label: "Tasks" },
];

interface CustomFieldRecord {
  id: string;
  entity_type: string;
  name: string;
  label: string;
  type: string;
  options: string[] | null;
  default_value: string | null;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
}

export const CustomFieldsSettings = () => {
  const { open } = useNotification();
  const { data: user } = useGetIdentity();
  const [fields, setFields] = useState<CustomFieldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entityType, setEntityType] = useState("contacts");
  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [description, setDescription] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [optionsInput, setOptionsInput] = useState("");
  const [required, setRequired] = useState(false);

  const options = useMemo(() =>
    optionsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  [optionsInput]);

  const loadFields = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabaseClient
      .from("custom_fields")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    setFields((data as CustomFieldRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFields();
  }, [user?.id]);

  const resetForm = () => {
    setLabel("");
    setName("");
    setType("text");
    setDescription("");
    setDefaultValue("");
    setOptionsInput("");
    setRequired(false);
  };

  const handleCreate = async () => {
    if (!user?.id) return;
    if (!label.trim() || !name.trim()) {
      open?.({
        type: "error",
        message: "Missing required fields",
        description: "Provide both a label and an internal name.",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabaseClient.from("custom_fields").insert({
      entity_type: entityType,
      name: name.trim(),
      label: label.trim(),
      type,
      options: options.length > 0 ? options : [],
      default_value: defaultValue.trim() || null,
      description: description.trim() || null,
      is_required: required,
      created_by: user.id,
    });

    if (error) {
      open?.({
        type: "error",
        message: "Unable to create custom field",
        description: error.message,
      });
      setSaving(false);
      return;
    }

    open?.({
      type: "success",
      message: "Custom field created",
      description: "Your custom field is ready to use.",
    });

    resetForm();
    await loadFields();
    setSaving(false);
  };

  const handleToggleActive = async (fieldId: string, isActive: boolean) => {
    const { error } = await supabaseClient
      .from("custom_fields")
      .update({ is_active: !isActive })
      .eq("id", fieldId);

    if (error) {
      open?.({
        type: "error",
        message: "Unable to update field",
        description: error.message,
      });
      return;
    }

    setFields((prev) => prev.map((field) => (field.id === fieldId ? { ...field, is_active: !isActive } : field)));
  };

  const handleDelete = async (fieldId: string) => {
    const { error } = await supabaseClient.from("custom_fields").delete().eq("id", fieldId);
    if (error) {
      open?.({
        type: "error",
        message: "Unable to delete field",
        description: error.message,
      });
      return;
    }

    setFields((prev) => prev.filter((field) => field.id !== fieldId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Custom Fields</h2>
        <p className="text-muted-foreground mt-2">Create custom fields for contacts, companies, deals, and tasks.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Create Custom Field
          </CardTitle>
          <CardDescription>Define new fields and how they should behave.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Entity</label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Field Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {fieldTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Label</label>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Lead Source" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Internal Name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. lead_source" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default Value</label>
            <Input
              value={defaultValue}
              onChange={(event) => setDefaultValue(event.target.value)}
              placeholder="Optional default value"
            />
          </div>

          {(type === "select" || type === "multi_select") && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Options (comma separated)</label>
              <Input
                value={optionsInput}
                onChange={(event) => setOptionsInput(event.target.value)}
                placeholder="e.g. Inbound, Referral, Partner"
              />
            </div>
          )}

          <div className="flex items-center gap-2 md:col-span-2">
            <Switch checked={required} onCheckedChange={setRequired} />
            <span className="text-sm text-muted-foreground">Required field</span>
          </div>

          <div className="md:col-span-2">
            <Button onClick={handleCreate} disabled={saving}>
              <PlusCircle className="w-4 h-4 mr-2" />
              {saving ? "Creating..." : "Create Field"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Fields</CardTitle>
          <CardDescription>Manage and activate custom fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading fields...</div>
          ) : fields.length === 0 ? (
            <div className="text-sm text-muted-foreground">No custom fields yet.</div>
          ) : (
            fields.map((field) => (
              <div key={field.id} className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 last:border-b-0">
                <div>
                  <p className="font-medium">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{field.name} • {field.entity_type}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{field.type}</Badge>
                    {field.is_required && <Badge variant="outline">Required</Badge>}
                    {field.options && field.options.length > 0 && (
                      <Badge variant="outline">{field.options.join(", ")}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={field.is_active} onCheckedChange={() => handleToggleActive(field.id, field.is_active)} />
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(field.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
