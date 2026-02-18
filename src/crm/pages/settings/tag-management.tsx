import { useState } from "react";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2, Check, Tag as TagIcon } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
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
import { Badge } from "@crm/components/ui/badge";
import type { Tag, Contact, Deal } from "@crm/types";

const formSchema = z.object({
  name: z.string().min(2, "Tag name must be at least 2 characters"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
});

type FormValues = z.infer<typeof formSchema>;

export function TagManagement() {
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null);

  const {
    result: { data: tags },
    query: { isLoading: tagsLoading },
  } = useList<Tag>({
    resource: "tags",
  });

  const {
    result: { data: contacts },
  } = useList<Contact>({
    resource: "contacts",
    pagination: { mode: "off" },
  });

  const {
    result: { data: deals },
  } = useList<Deal>({
    resource: "deals",
    pagination: { mode: "off" },
  });

  const { mutate: createTag } = useCreate();
  const { mutate: updateTag } = useUpdate();
  const { mutate: deleteTagApi } = useDelete();

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

  // Calculate usage count for each tag
  const getTagUsageCount = (tagId: string) => {
    const contactCount = contacts?.filter((contact) => contact.tagIds.includes(tagId)).length || 0;
    const dealCount = deals?.filter((deal) => deal.tagIds.includes(tagId)).length || 0;
    return contactCount + dealCount;
  };

  const onSubmit = (values: FormValues) => {
    createTag(
      {
        resource: "tags",
        values,
      },
      {
        onSuccess: () => {
          form.reset();
        },
      },
    );
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    editForm.setValue("name", tag.name);
    editForm.setValue("color", tag.color);
  };

  const onEditSubmit = (values: FormValues) => {
    if (!editingTag) return;

    updateTag(
      {
        resource: "tags",
        id: editingTag.id,
        values,
      },
      {
        onSuccess: () => {
          setEditingTag(null);
          editForm.reset();
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTag) return;

    deleteTagApi(
      {
        resource: "tags",
        id: deleteTag.id,
      },
      {
        onSuccess: () => {
          setDeleteTag(null);
        },
      },
    );
  };

  if (tagsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tag Management</CardTitle>
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
            <CardTitle>Tag Management</CardTitle>
            <CardDescription>
              Manage tags for categorizing contacts and deals. Each tag shows how many contacts and deals use it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tags && tags.length > 0 ? (
                tags.map((tag) => {
                  const usageCount = getTagUsageCount(tag.id);
                  return (
                    <div key={tag.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                      <div className="w-6 h-6 rounded border" style={{ backgroundColor: tag.color }} />

                      <div className="flex-1">
                        <div className="font-medium">{tag.name}</div>
                        <div className="text-xs text-muted-foreground">Used by {usageCount} records</div>
                      </div>

                      <Badge variant="secondary" className="font-mono">
                        {usageCount}
                      </Badge>

                      <div className="flex gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => handleEdit(tag)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => setDeleteTag(tag)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TagIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tags yet. Create your first tag below.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Tag</CardTitle>
            <CardDescription>Create a new tag to categorize your contacts and deals.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tag Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. VIP Client" {...field} />
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
                  Add Tag
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Edit Tag Dialog */}
      <AlertDialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Tag</AlertDialogTitle>
            <AlertDialogDescription>Update the tag name and color.</AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit as any)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Tag name" {...field} />
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
      <AlertDialog open={!!deleteTag} onOpenChange={(open) => !open && setDeleteTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{deleteTag?.name}"? This action cannot be undone.
              {deleteTag && getTagUsageCount(deleteTag.id) > 0 && (
                <span className="block mt-2 font-semibold text-destructive">
                  Warning: This tag is currently used by {getTagUsageCount(deleteTag.id)} record(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
