import { useState, useMemo } from "react";
import { useTable, useCreate, useUpdate, useDelete, HttpError } from "@refinedev/core";
import {
  Tag,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  ImageIcon,
  LayoutGrid,
  List,
  FolderOpen,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Card, CardContent } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Switch } from "@crm/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@crm/components/ui/dialog";
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

import type { ICategory } from "@crm/types/finefoods";

const CATEGORY_GRADIENTS = [
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-indigo-500 to-blue-500",
];

function getCategoryGradient(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return CATEGORY_GRADIENTS[Math.abs(hash) % CATEGORY_GRADIENTS.length];
}

export default function CategoriesList() {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const {
    tableQuery: tableQueryResult,
    current,
    setCurrent,
    pageCount,
    pageSize,
    setPageSize,
    setFilters,
  } = useTable<ICategory, HttpError>({
    resource: "categories",
    pagination: { pageSize: 12 },
    sorters: { initial: [{ field: "title", order: "asc" }] },
  }) as any;

  const data = tableQueryResult?.data;
  const isLoading = tableQueryResult?.isLoading;
  const categories = (data?.data ?? []) as ICategory[];
  const total = (data?.total ?? 0) as number;

  const { mutate: createCategory } = useCreate();
  const { mutate: updateCategory } = useUpdate();
  const { mutate: deleteCategory } = useDelete();

  // Stats
  const stats = useMemo(() => {
    const active = categories.filter((c) => c.isActive).length;
    return { total, active, inactive: categories.length - active };
  }, [categories, total]);

  // Add category dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCover, setNewCover] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit category dialog state
  const [editTarget, setEditTarget] = useState<ICategory | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCover, setEditCover] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ICategory | null>(null);

  const handleSearch = (value: string) => {
    if (value) {
      setFilters([{ field: "title", operator: "contains", value }], "replace");
    } else {
      setFilters([], "replace");
    }
  };

  const handleAddCategory = () => {
    if (!newTitle.trim()) return;
    setIsSaving(true);
    createCategory(
      {
        resource: "categories",
        values: {
          title: newTitle.trim(),
          cover: newCover.trim() || null,
          isActive: newIsActive,
        },
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setNewTitle("");
          setNewCover("");
          setNewIsActive(true);
          setIsSaving(false);
        },
        onError: () => setIsSaving(false),
      },
    );
  };

  const openEditDialog = (category: ICategory) => {
    setEditTarget(category);
    setEditTitle(category.title);
    setEditCover(category.cover || "");
    setEditIsActive(category.isActive);
  };

  const handleEditCategory = () => {
    if (!editTarget || !editTitle.trim()) return;
    setIsSaving(true);
    updateCategory(
      {
        resource: "categories",
        id: editTarget.id,
        values: {
          title: editTitle.trim(),
          cover: editCover.trim() || null,
          isActive: editIsActive,
        },
      },
      {
        onSuccess: () => {
          setEditTarget(null);
          setIsSaving(false);
        },
        onError: () => setIsSaving(false),
      },
    );
  };

  const handleDeleteCategory = () => {
    if (!deleteTarget) return;
    deleteCategory(
      { resource: "categories", id: deleteTarget.id },
      { onSuccess: () => setDeleteTarget(null) },
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-slate-900">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Tag className="h-4.5 w-4.5 text-white" />
            </div>
            Categories
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[46px]">Manage product categories</p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-200/50 transition-all duration-300">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-slate-50 to-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.inactive}</p>
                <p className="text-xs text-slate-500">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center border rounded-lg overflow-hidden ml-auto">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("table")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : ""}>
          {viewMode === "grid" ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border p-5 space-y-3">
                <div className="h-24 bg-slate-100 rounded-lg" />
                <div className="h-4 w-24 bg-slate-200 rounded" />
              </div>
            ))
          ) : (
            <Card className="border-slate-200/80">
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse bg-slate-100 rounded" />
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Tag className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg font-medium">No categories found</p>
          <p className="text-slate-400 text-sm mt-1">Create your first category to organize products</p>
          <Button
            onClick={() => setAddOpen(true)}
            className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* ──── Card Grid View ──── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group bg-white border border-slate-200/80 rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/40 hover:-translate-y-0.5">
              {/* Cover */}
              <div className="relative h-28 overflow-hidden">
                {category.cover ? (
                  <img src={category.cover} alt={category.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(category.title)} flex items-center justify-center`}>
                    <Tag className="h-10 w-10 text-white/60" />
                  </div>
                )}
                {/* Status badge overlay */}
                <div className="absolute top-2 right-2">
                  <Badge className={`border-0 text-[10px] backdrop-blur-sm ${category.isActive ? "bg-emerald-500/90 text-white" : "bg-slate-500/90 text-white"}`}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                  {category.title}
                </h3>
                <div className="flex items-center gap-1 mt-3">
                  <Button size="sm" variant="ghost" className="h-7 flex-1 text-xs" onClick={() => openEditDialog(category)}>
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteTarget(category)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ──── Table View ──── */
        <Card className="border-slate-200/80 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id} className="hover:bg-blue-50/40 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {category.cover ? (
                        <img src={category.cover} alt={category.title} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getCategoryGradient(category.title)} flex items-center justify-center`}>
                          <Tag className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <span className="font-medium text-slate-900">{category.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-xs ${category.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full mr-1 ${category.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(category)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(category)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {(pageCount ?? 0) > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={current <= 1} onClick={() => setCurrent(current - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-1">{current} / {pageCount}</span>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={current >= pageCount} onClick={() => setCurrent(current + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Electronics, Clothing..." autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Cover Image URL
              </Label>
              <Input value={newCover} onChange={(e) => setNewCover(e.target.value)} placeholder="https://example.com/image.jpg (optional)" />
              {newCover && (
                <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border bg-muted">
                  <img src={newCover} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={newIsActive} onCheckedChange={setNewIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory} disabled={!newTitle.trim() || isSaving}>
              {isSaving ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="e.g. Electronics, Clothing..." autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Cover Image URL
              </Label>
              <Input value={editCover} onChange={(e) => setEditCover(e.target.value)} placeholder="https://example.com/image.jpg (optional)" />
              {editCover && (
                <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border bg-muted">
                  <img src={editCover} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEditCategory} disabled={!editTitle.trim() || isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone. Products in this category will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
