import { useOne, useList } from "@refinedev/core";
import { AssetCollection } from "@crm/types";
import { ChevronRight, Folder } from "lucide-react";
import { Link } from "react-router";

interface CollectionBreadcrumbProps {
  collectionId: string;
}

export const CollectionBreadcrumb = ({ collectionId }: CollectionBreadcrumbProps) => {
  const { query: collectionQuery } = useOne<AssetCollection>({
    resource: "assetCollections",
    id: collectionId,
  });

  const { query: allCollectionsQuery } = useList<AssetCollection>({
    resource: "assetCollections",
  });

  const collection = collectionQuery.data?.data;
  const allCollections = allCollectionsQuery.data?.data || [];

  if (!collection) return null;

  // Build the breadcrumb trail from current collection to root
  const buildBreadcrumbTrail = (col: AssetCollection): AssetCollection[] => {
    const trail: AssetCollection[] = [col];
    let currentCol = col;

    while (currentCol.parentId) {
      const parent = allCollections.find((c) => c.id === currentCol.parentId);
      if (!parent) break;
      trail.unshift(parent);
      currentCol = parent;
    }

    return trail;
  };

  const breadcrumbTrail = buildBreadcrumbTrail(collection);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link to="/assets/collections" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Folder className="h-4 w-4" />
        <span>All Collections</span>
      </Link>
      {breadcrumbTrail.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {index === breadcrumbTrail.length - 1 ? (
            <span className="font-medium text-foreground">{item.name}</span>
          ) : (
            <Link to={`/assets/collections/show/${item.id}`} className="hover:text-foreground transition-colors">
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
};
