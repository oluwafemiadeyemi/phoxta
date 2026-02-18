import { useState, useMemo, useEffect } from "react";
import { useList, useCreate, useUpdate, useDelete, type HttpError } from "@refinedev/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GripVertical, Plus, Edit, Trash2, Check, X } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@crm/components/ui/form";
import { cn } from "@crm/lib/utils";
import type { PipelineStage } from "@crm/types";

const formSchema = z.object({
  name: z.string().min(2, "Stage name must be at least 2 characters"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
});

type FormValues = z.infer<typeof formSchema>;

interface SortableItemProps {
  stage: PipelineStage;
  onEdit: (stage: PipelineStage) => void;
  onDelete: (stage: PipelineStage) => void;
}

function SortableItem({ stage, onEdit, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-3 p-3 border rounded-lg bg-card", isDragging && "opacity-50")}>
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}>
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="w-6 h-6 rounded border" style={{ backgroundColor: stage.color }} />

      <div className="flex-1">
        <div className="font-medium">{stage.name}</div>
        <div className="text-xs text-muted-foreground">Order: {stage.sortOrder}</div>
      </div>

      <div className="flex gap-1">
        <Button size="icon-sm" variant="ghost" onClick={() => onEdit(stage)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => onDelete(stage)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PipelineStagesSettings() {
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [deleteStage, setDeleteStage] = useState<PipelineStage | null>(null);
  const [localStages, setLocalStages] = useState<PipelineStage[]>([]);

  const {
    result: { data },
    query: { isLoading },
  } = useList<PipelineStage>({
    resource: "pipelineStages",
  });

  const { mutate: createStage } = useCreate();
  const { mutate: updateStage } = useUpdate();
  const { mutate: deleteStageApi } = useDelete();

  // Initialize localStages when data loads
  useEffect(() => {
    if (data && localStages.length === 0) {
      const normalized = data.map((stage, index) => ({
        ...stage,
        sortOrder: stage.sortOrder ?? index + 1,
      }));
      setLocalStages(normalized);
    }
  }, [data]);

  const stages = useMemo(() => {
    if (localStages.length > 0) {
      return localStages;
    }
    if (data) {
      return data.map((stage, index) => ({
        ...stage,
        sortOrder: stage.sortOrder ?? index + 1,
      }));
    }
    return [];
  }, [data, localStages]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      color: "#3B82F6",
    },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      color: "#3B82F6",
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalStages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update order for all affected items
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          order: index + 1,
        }));

        return updatedItems;
      });
    }
  };

  const onSubmit = (values: FormValues) => {
    createStage(
      {
        resource: "pipelineStages",
        values: {
          ...values,
        },
      },
      {
        onSuccess: () => {
          form.reset();
        },
      },
    );
  };

  const handleEdit = (stage: PipelineStage) => {
    setEditingStage(stage);
    editForm.setValue("name", stage.name);
    editForm.setValue("color", stage.color);
  };

  const onEditSubmit = (values: FormValues) => {
    if (!editingStage) return;

    updateStage(
      {
        resource: "pipelineStages",
        id: editingStage.id,
        values,
      },
      {
        onSuccess: () => {
          setEditingStage(null);
          editForm.reset();
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteStage) return;

    deleteStageApi(
      {
        resource: "pipelineStages",
        id: deleteStage.id,
      },
      {
        onSuccess: () => {
          setDeleteStage(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stages</CardTitle>
            <CardDescription>Manage your sales pipeline stages. Drag to reorder stages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {stages.map((stage) => (
                    <SortableItem key={stage.id} stage={stage} onEdit={handleEdit} onDelete={setDeleteStage} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Stage</CardTitle>
            <CardDescription>Create a new pipeline stage for your sales process.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Discovery" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="color" className="w-20 h-10 cursor-pointer" {...field} />
                        </FormControl>
                        <Input value={field.value} onChange={field.onChange} placeholder="#3B82F6" className="flex-1" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stage
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Edit Stage Dialog */}
      <AlertDialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Stage</AlertDialogTitle>
            <AlertDialogDescription>Update the stage name and color.</AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit as any)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Stage name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" className="w-20 h-10 cursor-pointer" {...field} />
                      </FormControl>
                      <Input value={field.value} onChange={field.onChange} placeholder="#3B82F6" className="flex-1" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                <Button type="submit">
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStage} onOpenChange={(open) => !open && setDeleteStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the stage "{deleteStage?.name}"? This action cannot be undone. Any deals
              in this stage may need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
