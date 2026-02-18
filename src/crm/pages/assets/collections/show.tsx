import { useShow, useList } from "@refinedev/core";
import { ShowView, ShowViewHeader } from "@crm/components/refine-ui/views/show-view";
import { AssetCollection, Asset } from "@crm/types";
import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Separator } from "@crm/components/ui/separator";
import { Badge } from "@crm/components/ui/badge";
import { CollectionBreadcrumb } from "@crm/components/collection-breadcrumb";
import { FolderOpen, FileImage } from "lucide-react";
import { Link } from "react-router";

export const AssetCollectionShow = () => {
  const { query } = useShow<AssetCollection>({
    resource: "assetCollections",
  });

  const { query: assetsQuery } = useList<Asset>({
    resource: "assets",
  });

  const { query: collectionsQuery } = useList<AssetCollection>({
    resource: "assetCollections",
  });

  const collection = query.data?.data;
  const assets = assetsQuery.data?.data || [];
  const allCollections = collectionsQuery.data?.data || [];

  if (!collection) return null;

  // Find child collections
  const childCollections = allCollections.filter((c) => c.parentId === collection.id);

  // Find assets in this collection
  const collectionAssets = assets.filter((asset) => asset.collectionIds.includes(collection.id));

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case "Logo":
        return "🎨";
      case "Image":
        return "🖼️";
      case "Document":
        return "📄";
      case "Video":
        return "🎥";
      case "Font":
        return "🔤";
      case "Color Palette":
        return "🎨";
      default:
        return "📁";
    }
  };

  return (
    <ShowView>
      <ShowViewHeader title={collection.name} />

      <CollectionBreadcrumb collectionId={collection.id} />

      <div className="space-y-6 mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collection Overview</p>
                <h2 className="text-2xl font-semibold text-[#1D3A7D]">{collection.name}</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {collection.description || "No description provided"}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Sub-collections</p>
                  <p className="text-2xl font-semibold">{childCollections.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Assets in Collection</p>
                  <p className="text-2xl font-semibold">{collectionAssets.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Child Collections */}
        {childCollections.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Sub-Collections ({childCollections.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {childCollections.map((child) => {
                const childAssetCount = assets.filter((a) => a.collectionIds.includes(child.id)).length;
                return (
                  <Link key={child.id} to={`/assets/collections/show/${child.id}`} className="block">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FolderOpen className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{child.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {childAssetCount} {childAssetCount === 1 ? "asset" : "assets"}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {childCollections.length > 0 && collectionAssets.length > 0 && <Separator />}

        {/* Assets in this Collection */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Assets ({collectionAssets.length})
          </h3>
          {collectionAssets.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No assets in this collection yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {collectionAssets.map((asset) => (
                <Link key={asset.id} to={`/assets/show/${asset.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted flex items-center justify-center text-6xl">
                        {getAssetTypeIcon(asset.type)}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-sm mb-1 truncate">{asset.name}</h4>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {asset.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{asset.fileSize}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ShowView>
  );
};
