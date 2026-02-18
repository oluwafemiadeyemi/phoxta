import { useForm } from "@refinedev/react-hook-form";
import { useList } from "@refinedev/core";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Textarea } from "@crm/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import type { AssetCollection } from "@crm/types";

interface CollectionFormProps {
  action: "create" | "edit";
}

export function CollectionForm({ action }: CollectionFormProps) {
  const {
    refineCore: { onFinish, query },
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AssetCollection>({
    refineCoreProps: {
      resource: "assetCollections",
      action,
    },
  });

  const collection = query?.data?.data;
  const parentId = watch("parentId");

  // Fetch all collections for parent selection
  const {
    query: { data: collectionsData },
  } = useList<AssetCollection>({
    resource: "assetCollections",
    pagination: {
      mode: "off",
    },
  });

  const allCollections = collectionsData?.data ?? [];

  // Filter out the current collection and its children (to prevent circular references)
  const availableParentCollections = allCollections.filter((c) => {
    if (action === "edit" && collection) {
      // Can't be its own parent
      if (c.id === collection.id) return false;
      // Can't be a child of current collection
      if (c.parentId === collection.id) return false;
    }
    return true;
  });

  // Build a tree structure for better display
  const buildCollectionPath = (collectionId: string): string => {
    const coll = allCollections.find((c) => c.id === collectionId);
    if (!coll) return "";
    if (!coll.parentId) return coll.name;
    return `${buildCollectionPath(coll.parentId)} / ${coll.name}`;
  };

  return (
    <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
      {/* Collection Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Collection Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register("name", {
            required: "Collection name is required",
          })}
          placeholder="Enter collection name"
        />
        {errors.name && <p className="text-sm text-destructive">{String(errors.name.message)}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} placeholder="Enter collection description" rows={4} />
        {errors.description && <p className="text-sm text-destructive">{String(errors.description.message)}</p>}
      </div>

      {/* Parent Collection */}
      <div className="space-y-2">
        <Label htmlFor="parentId">Parent Collection</Label>
        <Select
          value={parentId ?? "none"}
          onValueChange={(value) => {
            setValue("parentId", value === "none" ? null : value, { shouldDirty: true });
          }}>
          <SelectTrigger>
            <SelectValue placeholder="Select parent collection (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">No parent (root collection)</span>
            </SelectItem>
            {availableParentCollections.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                {buildCollectionPath(collection.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Select a parent collection to create a nested structure, or leave empty for a root collection
        </p>
      </div>

      {/* Info about asset count */}
      {action === "edit" && collection && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            This collection currently contains <span className="font-semibold">{collection.assetCount}</span>{" "}
            {collection.assetCount === 1 ? "asset" : "assets"}
          </p>
        </div>
      )}
    </form>
  );
}
