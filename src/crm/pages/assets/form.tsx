import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useSelect } from "@refinedev/core";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, Upload, X } from "lucide-react";
import { useState } from "react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@crm/components/ui/form";
import { Input } from "@crm/components/ui/input";
import { Textarea } from "@crm/components/ui/textarea";
import { Button } from "@crm/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@crm/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@crm/components/ui/command";
import { LoadingOverlay } from "@crm/components/refine-ui/layout/loading-overlay";
import { cn } from "@crm/lib/utils";
import type { Asset, AssetTag, AssetCollection } from "@crm/types";
import { Card, CardContent } from "@crm/components/ui/card";

const assetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  type: z.enum(["Logo", "Image", "Document", "Video", "Font", "Color Palette"]),
  fileUrl: z.string().min(1, "File is required"),
  thumbnailUrl: z.string(),
  fileSize: z.string(),
  fileFormat: z.string(),
  dimensions: z.string().optional(),
  collectionIds: z.array(z.string()),
  tagIds: z.array(z.string()),
  isFavorite: z.boolean(),
  uploadedBy: z.string(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  action: "create" | "edit";
  id?: string;
}

export function AssetForm({ action, id }: AssetFormProps) {
  const [filePreview, setFilePreview] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const {
    refineCore: { onFinish, formLoading, query },
    ...form
  } = useForm<Asset, HttpError, AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "Image",
      fileUrl: "",
      thumbnailUrl: "",
      fileSize: "",
      fileFormat: "",
      dimensions: "",
      collectionIds: [],
      tagIds: [],
      isFavorite: false,
      uploadedBy: "Current User",
    },
    refineCoreProps: {
      resource: "assets",
      action,
      id,
      redirect: "list",
    },
  });

  // Fetch asset tags for multi-select
  const { options: tagOptions } = useSelect<AssetTag>({
    resource: "assetTags",
    optionValue: "id",
    optionLabel: "name",
    pagination: {
      mode: "off",
    },
  });

  // Fetch collections for multi-select
  const { options: collectionOptions } = useSelect<AssetCollection>({
    resource: "assetCollections",
    optionValue: "id",
    optionLabel: "name",
    pagination: {
      mode: "off",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Get file details
      const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      const fileExtension = file.name.split(".").pop()?.toUpperCase() || "";

      setFileName(file.name);
      form.setValue("fileSize", `${fileSizeInMB} MB`);
      form.setValue("fileFormat", fileExtension);

      // Generate preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setFilePreview(result);
          form.setValue("fileUrl", result);
          form.setValue("thumbnailUrl", result);

          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            form.setValue("dimensions", `${img.width}x${img.height}`);
          };
          img.src = result;
        };
        reader.readAsDataURL(file);
      } else {
        // For non-image files, use a placeholder
        const placeholderUrl = `https://via.placeholder.com/400x300/e2e8f0/475569?text=${fileExtension}`;
        setFilePreview(placeholderUrl);
        form.setValue("fileUrl", URL.createObjectURL(file));
        form.setValue("thumbnailUrl", placeholderUrl);
      }

      // Auto-fill name if empty
      if (!form.getValues("name")) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        form.setValue("name", nameWithoutExtension);
      }
    }
  };

  const clearFile = () => {
    setFilePreview("");
    setFileName("");
    form.setValue("fileUrl", "");
    form.setValue("thumbnailUrl", "");
    form.setValue("fileSize", "");
    form.setValue("fileFormat", "");
    form.setValue("dimensions", "");
  };

  function onSubmit(values: AssetFormValues) {
    onFinish(values);
  }

  const isLoading = formLoading || (action === "edit" && query?.isLoading);

  return (
    <LoadingOverlay loading={isLoading}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
          {/* File Upload Section */}
          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Upload File <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormDescription>Upload your brand asset (images, documents, videos, fonts, etc.)</FormDescription>
                    <FormControl>
                      <div className="space-y-4">
                        {!filePreview ? (
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                            <input
                              type="file"
                              id="file-upload"
                              className="hidden"
                              onChange={handleFileChange}
                              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.ttf,.otf,.woff,.woff2"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-muted rounded-full">
                                  <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Images, Videos, Documents, Fonts (Max 50MB)
                                  </p>
                                </div>
                              </div>
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="relative border rounded-lg overflow-hidden bg-muted">
                              <img src={filePreview} alt="Preview" className="w-full h-64 object-contain bg-white" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={clearFile}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {fileName && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Upload className="h-4 w-4" />
                                <span className="font-medium">{fileName}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Asset Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Asset Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Company Logo Primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Asset Type <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Logo">Logo</SelectItem>
                      <SelectItem value="Image">Image</SelectItem>
                      <SelectItem value="Document">Document</SelectItem>
                      <SelectItem value="Video">Video</SelectItem>
                      <SelectItem value="Font">Font</SelectItem>
                      <SelectItem value="Color Palette">Color Palette</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Description - Full width */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe this asset, its usage, or any important notes..."
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>Provide context about when and how to use this asset</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Collections */}
            <FormField
              control={form.control}
              name="collectionIds"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Collections</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("justify-between", !field.value?.length && "text-muted-foreground")}
                          type="button">
                          {field.value?.length
                            ? `${field.value.length} collection${field.value.length > 1 ? "s" : ""} selected`
                            : "Select collections..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search collections..." />
                        <CommandList>
                          <CommandEmpty>No collections found.</CommandEmpty>
                          <CommandGroup>
                            {collectionOptions?.map((option: { value: string | number; label: string }) => {
                              const isSelected = field.value?.includes(option.value as string);
                              return (
                                <CommandItem
                                  value={option.label}
                                  key={option.value}
                                  onSelect={() => {
                                    const currentCollections = field.value || [];
                                    const collectionId = option.value as string;
                                    if (isSelected) {
                                      form.setValue(
                                        "collectionIds",
                                        currentCollections.filter((id) => id !== collectionId),
                                      );
                                    } else {
                                      form.setValue("collectionIds", [...currentCollections, collectionId]);
                                    }
                                  }}>
                                  <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                  {option.label}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Organize assets into folders/collections</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tagIds"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tags</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("justify-between", !field.value?.length && "text-muted-foreground")}
                          type="button">
                          {field.value?.length
                            ? `${field.value.length} tag${field.value.length > 1 ? "s" : ""} selected`
                            : "Select tags..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search tags..." />
                        <CommandList>
                          <CommandEmpty>No tags found.</CommandEmpty>
                          <CommandGroup>
                            {tagOptions?.map((option: { value: string | number; label: string }) => {
                              const isSelected = field.value?.includes(option.value as string);
                              return (
                                <CommandItem
                                  value={option.label}
                                  key={option.value}
                                  onSelect={() => {
                                    const currentTags = field.value || [];
                                    const tagId = option.value as string;
                                    if (isSelected) {
                                      form.setValue(
                                        "tagIds",
                                        currentTags.filter((id) => id !== tagId),
                                      );
                                    } else {
                                      form.setValue("tagIds", [...currentTags, tagId]);
                                    }
                                  }}>
                                  <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                  {option.label}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Add tags for easier searching and filtering</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={formLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? "Uploading..." : action === "create" ? "Upload Asset" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </LoadingOverlay>
  );
}
