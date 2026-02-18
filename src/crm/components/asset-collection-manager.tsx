import { useState } from "react";
import { useList, useUpdate } from "@refinedev/core";
import { Asset, AssetCollection } from "@crm/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@crm/components/ui/dialog";
import { Button } from "@crm/components/ui/button";
import { Checkbox } from "@crm/components/ui/checkbox";
import { Label } from "@crm/components/ui/label";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { FolderOpen } from "lucide-react";

interface AssetCollectionManagerProps {
  assetId: string;
  currentCollectionIds: string[];
}

export const AssetCollectionManager = ({ assetId, currentCollectionIds }: AssetCollectionManagerProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(currentCollectionIds);

  const { query } = useList<AssetCollection>({
    resource: "assetCollections",
  });

  const { mutate: updateAsset } = useUpdate<Asset>();

  const collections = query.data?.data || [];

  const handleToggleCollection = (collectionId: string) => {
    setSelectedCollections((prev) =>
      prev.includes(collectionId) ? prev.filter((id) => id !== collectionId) : [...prev, collectionId],
    );
  };

  const handleSave = () => {
    updateAsset({
      resource: "assets",
      id: assetId,
      values: {
        collectionIds: selectedCollections,
      },
      successNotification: {
        message: "Collections updated successfully",
        type: "success",
      },
    });
    setOpen(false);
  };

  // Build hierarchy map for nested display
  const collectionsByParent = collections.reduce(
    (acc: Record<string, AssetCollection[]>, collection) => {
      const parentId = collection.parentId || "root";
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(collection);
      return acc;
    },
    {} as Record<string, AssetCollection[]>,
  );

  const renderCollections = (parentId: string = "root", level: number = 0) => {
    const children = collectionsByParent[parentId] || [];
    if (children.length === 0) return null;

    return (
      <div className={level > 0 ? "ml-6" : ""}>
        {children.map((collection: AssetCollection) => (
          <div key={collection.id} className="space-y-2">
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id={collection.id}
                checked={selectedCollections.includes(collection.id)}
                onCheckedChange={() => handleToggleCollection(collection.id)}
              />
              <Label
                htmlFor={collection.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {collection.name}
              </Label>
            </div>
            {renderCollections(collection.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderOpen className="h-4 w-4 mr-2" />
          Manage Collections
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Collections</DialogTitle>
          <DialogDescription>Select collections to organize this asset</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96 pr-4">
          <div className="space-y-1">{renderCollections()}</div>
        </ScrollArea>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
