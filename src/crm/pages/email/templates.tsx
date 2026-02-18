import { useState } from "react";
import { useTable, useCreate, useUpdate, useDelete, HttpError } from "@refinedev/core";
import dayjs from "dayjs";
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Mail,
  ShoppingCart,
  Headphones,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Save,
} from "lucide-react";
import { Card } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import { HtmlEmailEditor } from "@crm/components/email/html-email-editor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@crm/components/ui/alert-dialog";
import type { EmailTemplate } from "@crm/types";

const categoryConfig: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  general: { label: "General", color: "bg-slate-100 text-slate-700", icon: Mail },
  order: { label: "Order", color: "bg-amber-100 text-amber-700", icon: ShoppingCart },
  support: { label: "Support", color: "bg-purple-100 text-purple-700", icon: Headphones },
  marketing: { label: "Marketing", color: "bg-pink-100 text-pink-700", icon: Megaphone },
};

const CATEGORIES: { value: EmailTemplate["category"]; label: string }[] = [
  { value: "general", label: "General" },
  { value: "order", label: "Order" },
  { value: "support", label: "Support" },
  { value: "marketing", label: "Marketing" },
];

export default function EmailTemplatesPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
    category: "general" as EmailTemplate["category"],
  });

  const {
    tableQuery: { data, isLoading },
    currentPage: current,
    setCurrentPage: setCurrent,
    pageCount,
    setFilters,
  } = useTable<EmailTemplate, HttpError>({
    resource: "emailTemplates",
    pagination: { currentPage: 1, pageSize: 15 },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  });

  const { mutate: createTemplate } = useCreate();
  const { mutate: updateTemplate } = useUpdate();
  const { mutate: deleteTemplate } = useDelete();

  const templates = data?.data ?? [];

  const applyFilters = (search: string, cat: string) => {
    const newFilters: any[] = [];
    if (search) newFilters.push({ field: "name", operator: "contains", value: search });
    if (cat !== "all") newFilters.push({ field: "category", operator: "eq", value: cat });
    setFilters(newFilters, "replace");
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", subject: "", body: "", category: "general" });
    setEditorOpen(true);
  };

  const openEdit = (tpl: EmailTemplate) => {
    setEditId(tpl.id);
    setForm({
      name: tpl.name,
      subject: tpl.subject,
      body: tpl.body,
      category: tpl.category,
    });
    setEditorOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (!form.name.trim()) return;
    setIsSaving(true);

    const values = {
      name: form.name,
      subject: form.subject,
      body: form.body,
      category: form.category,
      isActive: true,
    };

    if (editId) {
      updateTemplate(
        { resource: "emailTemplates", id: editId, values },
        {
          onSuccess: () => { setIsSaving(false); setEditorOpen(false); },
          onError: () => setIsSaving(false),
        },
      );
    } else {
      createTemplate(
        { resource: "emailTemplates", values },
        {
          onSuccess: () => { setIsSaving(false); setEditorOpen(false); },
          onError: () => setIsSaving(false),
        },
      );
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTemplate(
        { resource: "emailTemplates", id: deleteId },
        { onSuccess: () => setDeleteId(null) },
      );
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  /* ============================================================
     Full-page template editor
     ============================================================ */
  if (editorOpen) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Compact header — back, fields, and actions in one row */}
        <div className="flex items-center gap-3 border-b px-3 py-2 bg-background shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditorOpen(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Input
            placeholder="Template name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="h-8 text-sm w-[180px] shrink-0"
          />
          <Input
            placeholder="Subject line — use {{variable}} for dynamic values"
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            className="h-8 text-sm flex-1 min-w-0"
          />
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger className="h-8 text-sm w-[130px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8" onClick={handleSave} disabled={isSaving || !form.name.trim()}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {isSaving ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </div>
        </div>

        {/* Editor — takes remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <HtmlEmailEditor
            value={form.body}
            onChange={(html) => update("body", html)}
            className="h-full rounded-none border-0 [&>div:nth-child(3)]:min-h-0 [&>div:nth-child(3)]:flex-1 [&>div:nth-child(3)]:max-h-none [&_div[contenteditable]]:min-h-0 [&_div[contenteditable]]:max-h-none [&_div[contenteditable]]:flex-1 [&_textarea]:min-h-0 [&_textarea]:max-h-none [&_textarea]:flex-1 [&_.preview-container]:min-h-0 [&_.preview-container]:max-h-none [&_.preview-container]:flex-1"
          />
        </div>
      </div>
    );
  }

  /* ============================================================
     Template list view
     ============================================================ */
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
            <p className="text-sm text-muted-foreground">
              Reusable templates for orders, support, and marketing
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); applyFilters(e.target.value, categoryFilter); }}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); applyFilters(searchText, v); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Templates Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create reusable email templates for orders, support, and more
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => {
                  const cat = categoryConfig[tpl.category] || categoryConfig.general;
                  return (
                    <TableRow key={tpl.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{tpl.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[250px] block">
                          {tpl.subject || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cat.color}>
                          {cat.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {dayjs(tpl.createdAt).format("DD MMM YYYY")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tpl)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(tpl.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {current} of {pageCount}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={current <= 1} onClick={() => setCurrent(current - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={current >= pageCount} onClick={() => setCurrent(current + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this email template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
